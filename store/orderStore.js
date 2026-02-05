"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

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

    params.set(k, s);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const useOrderStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  orders: [],
  order: null,
  loading: false,
  error: null,

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
  _normalizeOrders: (data) => (Array.isArray(data) ? data : data?.orders || []),
  _normalizeOrder: (data) => data?.order ?? data ?? null,

  _syncOrderInList: (updatedOrder) => {
    if (!updatedOrder?._id) return;
    set((s) => ({
      orders: (s.orders || []).map((o) =>
        String(o?._id) === String(updatedOrder._id) ? updatedOrder : o
      ),
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
    const orders = get()._normalizeOrders(data);
    set({ orders });
    return orders;
  },

  // GET /api/orders?filters (supports priority)
  fetchAllOrders: async (filters = {}) => {
    const qs = buildQueryString(filters);
    const data = await get()._get(`/api/orders${qs}`);
    const orders = get()._normalizeOrders(data);
    set({ orders });
    return orders;
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
    return order;
  },

  // PATCH /api/orders/:id/tracking
  updateTracking: async (orderId, payload) => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/tracking`, payload);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    return order;
  },

  // PATCH /api/orders/:id/address
  updateOrderAddress: async (orderId, payload) => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/address`, payload);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
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
    if (p.customerSupportRemark != null) p.customerSupportRemark = String(p.customerSupportRemark).trim();

    const data = await get()._patch(`/api/orders/${orderId}`, p);
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
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
    }

    return order;
  },

  /**
   * ✅ Manual Shiprocket booking (only if missing)
   * Router: POST /api/orders/:id/shiprocket/book
   * Backend already checks: not parent + confirmed + packed + prepaid paid
   */
  bookShiprocketIfMissing: async (orderId) => {
    if (!orderId) return null;

    const data = await get()._post(`/api/orders/${orderId}/shiprocket/book`, {});
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
    } else {
      await get().fetchOrderById(orderId);
    }

    return data;
  },

  /* =========================
     RESET
  ========================= */
  clearOrder: () => set({ order: null }),
  clearOrders: () => set({ orders: [] }),

  resetStore: () =>
    set({
      orders: [],
      order: null,
      loading: false,
      error: null,
    }),
}));
