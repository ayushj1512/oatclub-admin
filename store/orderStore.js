"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/**
 * Remove all undefined values deeply.
 * Prevents backend issues like: Cast to Object failed for "shipment.xpressbees = undefined"
 */
const stripUndefinedDeep = (obj) => {
  if (Array.isArray(obj)) return obj.map(stripUndefinedDeep);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return obj;
};

const normalizePriority = (v) => {
  const p = String(v ?? "").trim().toLowerCase();
  return ["normal", "medium", "high"].includes(p) ? p : "";
};

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v == null) return;

    // support arrays (ex: status=[..])
    if (Array.isArray(v)) {
      v.forEach((x) => {
        if (x == null || String(x).trim() === "") return;
        params.append(k, String(x).trim());
      });
      return;
    }

    const s = String(v).trim();
    if (!s) return;

    if (k === "priority") {
      const pr = normalizePriority(s);
      if (pr) params.set("priority", pr);
      return;
    }

    // pagination sanitize (only if passed in filters)
    if (k === "page" || k === "limit") {
      const n = parseInt(s, 10);
      if (Number.isFinite(n)) params.set(k, String(n));
      return;
    }

    params.set(k, s);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const normalizeOrdersPayload = (data) => {
  // backend can return:
  // 1) [ ... ] (legacy)
  // 2) { orders:[...], meta:{...} } (new pagination)
  // 3) { orders:[...] } (some routes)
  // 4) { data:[...] } (rare)
  if (Array.isArray(data)) return { orders: data, meta: null };
  if (data && Array.isArray(data.orders))
    return { orders: data.orders, meta: data.meta || null };
  if (data && Array.isArray(data.data))
    return { orders: data.data, meta: data.meta || null };
  return { orders: [], meta: data?.meta || null };
};

export const useOrderStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  orders: [],
  order: null,
  loading: false,
  error: null,
productOrderCount: null,
  // ✅ pagination meta for orders list
  ordersMeta: null, // { page, limit, totalCount, totalSum, hasMore }

  // ✅ customer support detail cache
  customerSupportOrderDetails: {}, // { [orderId]: fullOrder }

  /* =========================
     UI HELPERS
  ========================= */
  _start: () => set({ loading: true, error: null }),
  _success: () => set({ loading: false }),
  _fail: (err) =>
    set({
      loading: false,
      error: err?.message || "Something went wrong",
    }),

  /* =========================
     NORMALIZERS
  ========================= */
  _normalizeOrder: (data) => data?.order ?? data ?? null,

  _syncOrderInList: (updatedOrder) => {
    if (!updatedOrder?._id) return;
    set((s) => ({
      orders: (s.orders || []).map((o) =>
        String(o?._id) === String(updatedOrder._id) ? { ...o, ...updatedOrder } : o
      ),
    }));
  },

  _syncCustomerSupportDetail: (updatedOrder) => {
    if (!updatedOrder?._id) return;
    set((s) => ({
      customerSupportOrderDetails: {
        ...(s.customerSupportOrderDetails || {}),
        [String(updatedOrder._id)]: {
          ...(s.customerSupportOrderDetails?.[String(updatedOrder._id)] || {}),
          ...updatedOrder,
        },
      },
    }));
  },

  _removeOrderFromList: (orderId) => {
    if (!orderId) return;
    set((s) => ({
      orders: (s.orders || []).filter((o) => String(o?._id) !== String(orderId)),
    }));
  },

  /* =========================
     FETCH HELPERS
  ========================= */
  _json: async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Request failed");
    return data;
  },

  _get: async (path) => {
    get()._start();
    try {
      const res = await fetch(`${API}${path}`, { cache: "no-store" });
      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  _post: async (path, payload) => {
    get()._start();
    try {
      const body = JSON.stringify(stripUndefinedDeep(payload || {}));
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  _patch: async (path, payload) => {
    get()._start();
    try {
      const body = JSON.stringify(stripUndefinedDeep(payload || {}));
      const res = await fetch(`${API}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  /* =========================
     ACTIONS
  ========================= */

  // POST /api/orders
  createOrder: async (payload) => {
    const p = { ...(payload || {}) };
    if (p.priority != null) p.priority = normalizePriority(p.priority) || "normal";

    const data = await get()._post(`/api/orders`, p);
    const order = get()._normalizeOrder(data);

    set((s) => ({
      order,
      orders: order ? [order, ...(s.orders || [])] : s.orders,
    }));

    return order;
  },

  // GET /api/orders/:id
  fetchOrderById: async (orderId) => {
    if (!orderId) return null;
    const data = await get()._get(`/api/orders/${orderId}`);
    const order = get()._normalizeOrder(data);
    set({ order });
    return order;
  },

  // GET /api/orders/by-number/:orderNumber
  fetchOrderByNumber: async (orderNumber) => {
    if (!orderNumber) return null;
    const data = await get()._get(`/api/orders/by-number/${orderNumber}`);
    const order = get()._normalizeOrder(data);
    set({ order });
    return order;
  },

  // GET /api/orders/customer/:customerId
  fetchOrdersByCustomer: async (customerId) => {
    if (!customerId) return [];
    const data = await get()._get(`/api/orders/customer/${customerId}`);
    const { orders } = normalizeOrdersPayload(data);
    set({ orders, ordersMeta: null });
    return orders;
  },

  /**
   * ✅ GET /api/orders?filters
   * generic admin list
   */
  fetchAllOrders: async (filters = {}) => {
    const f = { ...(filters || {}) };

    if (f.page == null) f.page = 1;
    if (f.limit == null) f.limit = 200;

    const qs = buildQueryString(f);
    const data = await get()._get(`/api/orders${qs}`);

    const { orders, meta } = normalizeOrdersPayload(data);

    set({ orders, ordersMeta: meta || null });
    return orders;
  },

  /**
   * ✅ generic next page for /api/orders
   */
  fetchNextOrdersPage: async (filters = {}) => {
    const currMeta = get().ordersMeta;
    const nextPage = Math.max(1, Number(currMeta?.page || filters?.page || 1) + 1);
    const limit = Number(filters?.limit || currMeta?.limit || 200);

    const qs = buildQueryString({ ...(filters || {}), page: nextPage, limit });
    const data = await get()._get(`/api/orders${qs}`);

    const { orders: nextOrders, meta } = normalizeOrdersPayload(data);

    set((s) => ({
      orders: [...(s.orders || []), ...(nextOrders || [])],
      ordersMeta: meta || s.ordersMeta || null,
    }));

    return nextOrders || [];
  },

  /**
   * ✅ NEW: customer support lightweight list
   * GET /api/orders/customer-support?filters
   */
  fetchCustomerSupportOrders: async (filters = {}) => {
    const f = { ...(filters || {}) };

    if (f.page == null) f.page = 1;
    if (f.limit == null) f.limit = 50;

    const qs = buildQueryString(f);
    const data = await get()._get(`/api/orders/customer-support${qs}`);

    const { orders, meta } = normalizeOrdersPayload(data);

    set({
      orders,
      ordersMeta: meta || null,
    });

    return orders;
  },

  /**
   * ✅ NEW: next page for customer support list
   * GET /api/orders/customer-support?page=2...
   */
  fetchNextCustomerSupportOrdersPage: async (filters = {}) => {
    const currMeta = get().ordersMeta;
    const nextPage = Math.max(1, Number(currMeta?.page || filters?.page || 1) + 1);
    const limit = Number(filters?.limit || currMeta?.limit || 50);

    const qs = buildQueryString({ ...(filters || {}), page: nextPage, limit });
    const data = await get()._get(`/api/orders/customer-support${qs}`);

    const { orders: nextOrders, meta } = normalizeOrdersPayload(data);

    set((s) => ({
      orders: [...(s.orders || []), ...(nextOrders || [])],
      ordersMeta: meta || s.ordersMeta || null,
    }));

    return nextOrders || [];
  },

  /**
   * ✅ NEW: customer support full detail by id
   * GET /api/orders/customer-support/:id
   */
  fetchCustomerSupportOrderDetail: async (orderId, { force = false } = {}) => {
    if (!orderId) return null;

    const key = String(orderId);
    const cached = get().customerSupportOrderDetails?.[key];

    if (cached && !force) {
      return cached;
    }

    const data = await get()._get(`/api/orders/customer-support/${orderId}`);
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set((s) => ({
        order,
        customerSupportOrderDetails: {
          ...(s.customerSupportOrderDetails || {}),
          [String(order._id)]: order,
        },
      }));
    }

    return order;
  },

  // PATCH /api/orders/:id/status
  updateOrderStatus: async (orderId, payload) => {
    if (!orderId) return null;

    const p = { ...(payload || {}) };
    if (p.priority != null) p.priority = normalizePriority(p.priority) || "normal";

    const data = await get()._patch(`/api/orders/${orderId}/status`, p);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    get()._syncCustomerSupportDetail(order);

    return order;
  },

  // PATCH /api/orders/:id/tracking
  updateTracking: async (orderId, payload) => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/tracking`, payload);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    get()._syncCustomerSupportDetail(order);
    return order;
  },

  // PATCH /api/orders/:id/address
  updateOrderAddress: async (orderId, payload) => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/address`, payload);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    get()._syncCustomerSupportDetail(order);
    return order;
  },

  /**
   * ✅ Update order (Admin)
   * Router: PATCH /api/orders/:id
   */
  updateOrder: async (orderId, payload) => {
    if (!orderId) return null;

    const p = { ...(payload || {}) };
    if (p.priority != null) p.priority = normalizePriority(p.priority) || "normal";
    if (p.customerSupportRemark != null)
      p.customerSupportRemark = String(p.customerSupportRemark).trim();

    const data = await get()._patch(`/api/orders/${orderId}`, p);
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  /**
   * ✅ Cancel order (Admin)
   * Router: POST /api/orders/:id/cancel
   */
  cancelOrder: async (orderId, reason = "cancelled_by_admin") => {
    if (!orderId) return null;

    const payload = {
      reason: reason || "cancelled_by_admin",
      cancelledBy: "admin",
      adminRemarks: "cancelled_by_admin",
    };

    const data = await get()._post(`/api/orders/${orderId}/cancel`, payload);
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  /**
   * ✅ Confirm order (Admin / COD)
   * Router: POST /api/orders/:id/confirm
   */
  confirmOrder: async (orderId) => {
    if (!orderId) return null;

    const data = await get()._post(`/api/orders/${orderId}/confirm`, {});
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  // Exchange Order
  duplicateExchangeOrder: async (orderId, payload = {}) => {
    if (!orderId) return null;

    const data = await get()._post(`/api/orders/${orderId}/duplicate-exchange`, payload);
    const newOrder = get()._normalizeOrder(data);

    if (newOrder?._id) {
      set({ order: newOrder });

      set((s) => ({
        orders: [newOrder, ...(s.orders || [])],
      }));
    }

    return newOrder;
  },

  /**
   * ✅ Manual Shiprocket booking (only if missing)
   * Router: POST /api/orders/:id/shiprocket/book
   */
  bookShiprocketIfMissing: async (orderId) => {
    if (!orderId) return null;

    const data = await get()._post(`/api/orders/${orderId}/shiprocket/book`, {});
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    } else {
      await get().fetchOrderById(orderId);
    }

    return data;
  },

  // GET /api/orders/lookup?email=...&phone=...
  fetchOrdersByIdentity: async ({ email, phone } = {}) => {
    const e = String(email ?? "").trim();
    const p = String(phone ?? "").trim();

    const qs = new URLSearchParams();
    if (e) qs.set("email", e);
    if (p) qs.set("phone", p);

    const data = await get()._get(`/api/orders/lookup?${qs.toString()}`);

    const { orders } = normalizeOrdersPayload(data);
    set({ orders, ordersMeta: null });
    return orders;
  },

  fetchProductOrderCount: async (q) => {
  const search = String(q ?? "").trim();

  if (!search) {
    set({ productOrderCount: null });
    return null;
  }

  const data = await get()._get(
    `/api/orders/product-order-count?q=${encodeURIComponent(search)}`
  );

  const result = {
    query: data?.query || search,
    totalOrders: Number(data?.totalOrders || 0),
  };

  set({ productOrderCount: result });
  return result;
},

  /* =========================
     RESET
  ========================= */
  clearOrder: () => set({ order: null }),
clearProductOrderCount: () => set({ productOrderCount: null }),
  clearOrders: () =>
    set({
      orders: [],
      ordersMeta: null,
    }),

  clearCustomerSupportOrderDetails: () =>
    set({
      customerSupportOrderDetails: {},
    }),

  resetStore: () =>
    set({
      orders: [],
      order: null,
      loading: false,
      error: null,
      ordersMeta: null,
      customerSupportOrderDetails: {},
    }),
}));