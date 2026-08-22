"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

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
  const p = String(v ?? "")
    .trim()
    .toLowerCase();
  return ["normal", "medium", "high"].includes(p) ? p : "";
};

const normalizePaymentMethod = (v) => {
  const pm = String(v ?? "")
    .trim()
    .toLowerCase();

  return ["cod", "razorpay", "wallet", "exchange", "manual_prepaid"].includes(
    pm,
  )
    ? pm
    : "";
};

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([k, v]) => {
    if (v == null) return;

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

    if (k === "page" || k === "limit") {
      const n = parseInt(s, 10);
      if (Number.isFinite(n)) params.set(k, String(n));
      return;
    }
    if (k === "paymentMethod") {
      const pm = normalizePaymentMethod(s);
      if (pm) params.set("paymentMethod", pm);
      return;
    }

    params.set(k, s);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const normalizeOrdersPayload = (data) => {
  if (Array.isArray(data)) return { orders: data, meta: null };
  if (data?.orders && Array.isArray(data.orders)) {
    return { orders: data.orders, meta: data.meta || null };
  }
  if (data?.data && Array.isArray(data.data)) {
    return { orders: data.data, meta: data.meta || null };
  }
  return { orders: [], meta: data?.meta || null };
};

export const getOrderAttributionLabel = (order = {}) => {
  const attr = order?.attribution || {};

  return {
    source: attr.source || "direct",
    medium: attr.medium || "direct",
    campaign: attr.campaign || "",
    campaignSlug: attr.campaignSlug || "",
    shortCode: attr.shortCode || "",
    marketingLinkId: attr.marketingLinkId || "",
  };
};

export const useOrderStore = create((set, get) => ({
  orders: [],
  order: null,
  loading: false,
  error: null,
  placing: false,

  /* ---------------- INVOICES ---------------- */

  invoices: [],
  invoicesByOrderNumber: {},
  invoiceLoading: false,
  invoiceError: null,
  invoiceMissingOrderNumbers: [],
  productOrderCount: null,
  productOrderSearchResult: null,
  productOrderSearchLoading: false,
  productOrderSearchError: null,
  ordersMeta: null,
  customerSupportOrderDetails: {},
  duplicateAlerts: [],
  duplicateLoading: false,
  confirmationDetails: null,
  confirmationDetailsLoading: false,
  orderDashboard: null,
  orderDashboardLoading: false,
  paymentRecoveryLoading: false,
  paymentRecoveryError: null,
  paymentRecoveryResult: null,
  shippingOrders: [],
  shippingOrdersMeta: null,

  _start: () => set({ loading: true, error: null }),
  _success: () => set({ loading: false }),
  _fail: (err) =>
    set({
      loading: false,
      error: err?.message || "Something went wrong",
    }),

  _normalizeOrder: (data) => data?.order ?? data ?? null,

  _syncOrderInList: (updatedOrder) => {
    if (!updatedOrder?._id) return;

    set((s) => ({
      orders: (s.orders || []).map((o) =>
        String(o?._id) === String(updatedOrder._id)
          ? { ...o, ...updatedOrder }
          : o,
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
      orders: (s.orders || []).filter(
        (o) => String(o?._id) !== String(orderId),
      ),
    }));
  },

  _json: async (res) => {
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(
        data?.message ||
        `Request failed with status ${res.status}`,
      );

      error.status = res.status;
      error.code = data?.code || "REQUEST_FAILED";
      error.data = data;

      throw error;
    }

    return data;
  },

  _normalizeInvoicesPayload: (data) => {
    const invoices = Array.isArray(data?.invoices)
      ? data.invoices
      : Array.isArray(data)
        ? data
        : [];

    const missingOrderNumbers = Array.isArray(data?.missingOrderNumbers)
      ? data.missingOrderNumbers
      : [];

    const invoicesByOrderNumber = Object.fromEntries(
      invoices
        .map((invoice) => [String(invoice?.orderNumber || "").trim(), invoice])
        .filter(([orderNumber]) => Boolean(orderNumber)),
    );

    return {
      invoices,
      invoicesByOrderNumber,
      missingOrderNumbers,
    };
  },

  _get: async (path, { silent = false } = {}) => {
    if (!silent) get()._start();

    try {
      const res = await fetch(`${API}${path}`, { cache: "no-store" });
      const data = await get()._json(res);
      if (!silent) get()._success();
      return data;
    } catch (e) {
      if (!silent) get()._fail(e);
      throw e;
    }
  },

  _post: async (path, payload, { silent = false } = {}) => {
    if (!silent) {
      get()._start();
    }

    if (!API) {
      const error = new Error(
        "Backend URL is not configured.",
      );

      error.code = "API_URL_MISSING";

      if (!silent) {
        get()._fail(error);
      }

      throw error;
    }

    try {
      let res;

      try {
        res = await fetch(`${API}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify(
            stripUndefinedDeep(payload || {}),
          ),
        });
      } catch (networkError) {
        console.error("POST network error:", {
          url: `${API}${path}`,
          error: networkError,
        });

        const error = new Error(
          "Unable to connect to the server. Please try again.",
        );

        error.code = "NETWORK_ERROR";
        throw error;
      }

      const data = await get()._json(res);

      if (!silent) {
        get()._success();
      }

      return data;
    } catch (error) {
      if (!silent) {
        get()._fail(error);
      }

      throw error;
    }
  },

  _patch: async (path, payload) => {
    get()._start();

    try {
      const res = await fetch(`${API}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stripUndefinedDeep(payload || {})),
      });

      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  _delete: async (path, payload = {}) => {
    get()._start();

    try {
      const res = await fetch(`${API}${path}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stripUndefinedDeep(payload || {})),
      });

      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  canSendPaymentRecoveryEmail: (
    order = null,
  ) => {
    const currentOrder =
      order || get().order || {};

    const paymentMethod = String(
      currentOrder?.paymentMethod || "",
    )
      .trim()
      .toLowerCase();

    const paymentStatus = String(
      currentOrder?.paymentStatus || "",
    )
      .trim()
      .toLowerCase();

    const fulfillmentStatus = String(
      currentOrder?.fulfillmentStatus || "",
    )
      .trim()
      .toLowerCase();

    const isCancelled =
      currentOrder?.cancellation
        ?.isCancelled === true ||
      fulfillmentStatus === "cancelled";

    const hasPaymentId = Boolean(
      currentOrder?.razorpay
        ?.paymentId,
    );

    return (
      !isCancelled &&
      !hasPaymentId &&
      [
        "razorpay",
        "manual_prepaid",
      ].includes(paymentMethod) &&
      [
        "pending",
        "failed",
      ].includes(paymentStatus)
    );
  },

  createOrder: async (payload) => {
    set({
      placing: true,
      error: null,
    });

    try {
      const p = { ...(payload || {}) };

      if (p.priority != null) {
        p.priority =
          normalizePriority(p.priority) || "normal";
      }

      if (p.paymentMethod != null) {
        p.paymentMethod =
          normalizePaymentMethod(p.paymentMethod) || "cod";
      }

      const walletAmount = Number(
        p.walletAmount ??
        p.walletCredit?.amount ??
        p.paymentBreakdown?.walletAmount ??
        0,
      );

      if (
        walletAmount > 0 ||
        p.useWallet === true ||
        p.paymentMethod === "wallet"
      ) {
        p.useWallet = true;
        p.walletAmount = Math.max(0, walletAmount);

        p.walletCredit = {
          ...(p.walletCredit || {}),
          used: true,
          amount: Math.max(0, walletAmount),
        };

        p.paymentBreakdown = {
          ...(p.paymentBreakdown || {}),
          walletAmount: Math.max(0, walletAmount),
        };
      }

      const data = await get()._post(
        "/api/orders",
        p,
        { silent: true },
      );

      const order = get()._normalizeOrder(data);

      if (!order?._id && !order?.orderNumber) {
        throw new Error(
          "Order could not be created. Please try again.",
        );
      }

      set((state) => ({
        order,
        orders: [
          order,
          ...(state.orders || []).filter(
            (existingOrder) =>
              String(existingOrder?._id) !==
              String(order?._id),
          ),
        ],
        placing: false,
        loading: false,
        error: null,
      }));

      return order;
    } catch (error) {
      set({
        placing: false,
        loading: false,
        error:
          error?.message ||
          "Unable to place your order.",
      });

      throw error;
    }
  },

  fetchOrderById: async (orderId) => {
    if (!orderId) return null;

    const data = await get()._get(`/api/orders/${orderId}`);
    const order = get()._normalizeOrder(data);

    set({ order });
    return order;
  },

  fetchOrderByNumber: async (orderNumber) => {
    if (!orderNumber) return null;

    const data = await get()._get(`/api/orders/by-number/${orderNumber}`);
    const order = get()._normalizeOrder(data);

    set({ order });
    return order;
  },

  fetchOrdersByCustomer: async (customerId) => {
    if (!customerId) return [];

    const data = await get()._get(`/api/orders/customer/${customerId}`);
    const { orders } = normalizeOrdersPayload(data);

    set({ orders, ordersMeta: null });
    return orders;
  },

  fetchOrdersDashboard: async () => {
    set({
      orderDashboardLoading: true,
      error: null,
    });

    try {
      const data = await get()._get(`/api/orders/dashboard`, { silent: true });

      const dashboard = data?.data || data || null;

      set({
        orderDashboard: dashboard,
        orderDashboardLoading: false,
        error: null,
      });

      return dashboard;
    } catch (error) {
      set({
        orderDashboard: null,
        orderDashboardLoading: false,
        error: error?.message || "Failed to fetch orders dashboard",
      });

      throw error;
    }
  },

  fetchAllOrders: async (filters = {}) => {
    const f = { ...(filters || {}) };

    // ✅ Attribution filter aliases for admin UI
    if (f.source && !f.attributionSource) {
      f.attributionSource = f.source;
      delete f.source;
    }

    if (f.medium && !f.attributionMedium) {
      f.attributionMedium = f.medium;
      delete f.medium;
    }

    if (f.campaign && !f.attributionCampaign) {
      f.attributionCampaign = f.campaign;
      delete f.campaign;
    }

    if (f.page == null) f.page = 1;
    if (f.limit == null) f.limit = 200;

    const qs = buildQueryString(f);
    const data = await get()._get(`/api/orders${qs}`);
    const { orders, meta } = normalizeOrdersPayload(data);

    set({ orders, ordersMeta: meta || null });
    return orders;
  },

  /* ============================================================
     INVOICES
  ============================================================ */

  /**
   * Fetch multiple normalized invoices from backend.
   *
   * POST /api/orders/invoices
   *
   * @param {Array<string>} orderNumbers
   * @param {{ silent?: boolean }} options
   */
  fetchInvoicesByOrderNumbers: async (
    orderNumbers = [],
    { silent = false } = {},
  ) => {
    const normalizedOrderNumbers = [
      ...new Set(
        (Array.isArray(orderNumbers) ? orderNumbers : [])
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      ),
    ];

    if (!normalizedOrderNumbers.length) {
      set({
        invoices: [],
        invoicesByOrderNumber: {},
        invoiceMissingOrderNumbers: [],
        invoiceError: "Select at least one order",
      });

      return {
        invoices: [],
        invoicesByOrderNumber: {},
        missingOrderNumbers: [],
      };
    }

    if (!silent) {
      set({
        invoiceLoading: true,
        invoiceError: null,
        invoiceMissingOrderNumbers: [],
      });
    }

    try {
      const response = await fetch(`${API}/api/orders/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          orderNumbers: normalizedOrderNumbers,
        }),
      });

      const data = await get()._json(response);
      const normalized = get()._normalizeInvoicesPayload(data);

      set({
        invoices: normalized.invoices,
        invoicesByOrderNumber: normalized.invoicesByOrderNumber,
        invoiceMissingOrderNumbers: normalized.missingOrderNumbers,
        invoiceLoading: false,
        invoiceError: null,
      });

      return {
        ...data,
        ...normalized,
      };
    } catch (error) {
      console.error("fetchInvoicesByOrderNumbers error:", error);

      set({
        invoiceLoading: false,
        invoiceError: error?.message || "Failed to fetch invoices",
      });

      throw error;
    }
  },

  /**
   * Fetch one invoice using MongoDB order ID.
   */
  fetchInvoiceByOrderId: async (orderId, { silent = false } = {}) => {
    const id = String(orderId ?? "").trim();

    if (!id) {
      throw new Error("Order ID is required");
    }

    if (!silent) {
      set({
        invoiceLoading: true,
        invoiceError: null,
      });
    }

    try {
      const response = await fetch(
        `${API}/api/orders/${encodeURIComponent(id)}/invoice`,
        {
          cache: "no-store",
        },
      );

      const data = await get()._json(response);
      const invoice = data?.invoice || null;

      if (invoice?.orderNumber) {
        const orderNumber = String(invoice.orderNumber).trim();

        set((state) => ({
          invoices: [
            invoice,
            ...(state.invoices || []).filter(
              (item) => String(item?.orderNumber || "").trim() !== orderNumber,
            ),
          ],

          invoicesByOrderNumber: {
            ...(state.invoicesByOrderNumber || {}),
            [orderNumber]: invoice,
          },

          invoiceLoading: false,
          invoiceError: null,
        }));
      } else {
        set({
          invoiceLoading: false,
          invoiceError: null,
        });
      }

      return invoice;
    } catch (error) {
      set({
        invoiceLoading: false,
        invoiceError: error?.message || "Failed to fetch invoice",
      });

      throw error;
    }
  },

  /**
   * Fetch one invoice using readable order number.
   */
  fetchInvoiceByOrderNumber: async (orderNumber, { silent = false } = {}) => {
    const number = String(orderNumber ?? "").trim();

    if (!number) {
      throw new Error("Order number is required");
    }

    if (!silent) {
      set({
        invoiceLoading: true,
        invoiceError: null,
      });
    }

    try {
      const response = await fetch(
        `${API}/api/orders/by-number/${encodeURIComponent(number)}/invoice`,
        {
          cache: "no-store",
        },
      );

      const data = await get()._json(response);
      const invoice = data?.invoice || null;

      if (invoice?.orderNumber) {
        const normalizedNumber = String(invoice.orderNumber).trim();

        set((state) => ({
          invoices: [
            invoice,
            ...(state.invoices || []).filter(
              (item) =>
                String(item?.orderNumber || "").trim() !== normalizedNumber,
            ),
          ],

          invoicesByOrderNumber: {
            ...(state.invoicesByOrderNumber || {}),
            [normalizedNumber]: invoice,
          },

          invoiceLoading: false,
          invoiceError: null,
        }));
      } else {
        set({
          invoiceLoading: false,
          invoiceError: null,
        });
      }

      return invoice;
    } catch (error) {
      set({
        invoiceLoading: false,
        invoiceError: error?.message || "Failed to fetch invoice",
      });

      throw error;
    }
  },

  clearInvoices: () =>
    set({
      invoices: [],
      invoicesByOrderNumber: {},
      invoiceMissingOrderNumbers: [],
      invoiceLoading: false,
      invoiceError: null,
    }),

  // ✅ CONFIRMED ORDERS
  fetchConfirmedOrders: async (filters = {}) => {
    return get().fetchAllOrders({
      ...(filters || {}),
      confirmFilter: "confirmed",
    });
  },

  // ✅ NOT CONFIRMED ORDERS
  fetchNotConfirmedOrders: async (filters = {}) => {
    return get().fetchAllOrders({
      ...(filters || {}),
      confirmFilter: "not_confirmed",
    });
  },

  // ✅ INFLUENCER ORDERS
  fetchInfluencerOrders: async (filters = {}) => {
    return get().fetchAllOrders({
      ...(filters || {}),
      isInfluencerOrder: true,
    });
  },

  // ✅ EXCHANGE ORDERS
  fetchExchangeOrders: async (filters = {}) => {
    return get().fetchAllOrders({
      ...(filters || {}),
      isExchangeOrder: true,
    });
  },

  // ✅ NORMAL / NON-INFLUENCER ORDERS
  fetchNonInfluencerOrders: async (filters = {}) => {
    return get().fetchAllOrders({
      ...(filters || {}),
      isInfluencerOrder: false,
    });
  },

  fetchNextOrdersPage: async (filters = {}) => {
    const currMeta = get().ordersMeta;
    const nextPage = Math.max(
      1,
      Number(currMeta?.page || filters?.page || 1) + 1,
    );
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

  fetchAllOrdersAllPages: async (filters = {}) => {
    get()._start();

    try {
      const baseFilters = { ...(filters || {}) };
      const limit = Number(baseFilters.limit || 200);

      let page = 1;
      let allOrders = [];
      let finalMeta = null;
      let hasMore = true;

      while (hasMore) {
        const qs = buildQueryString({
          ...baseFilters,
          page,
          limit,
        });

        const data = await get()._get(`/api/orders${qs}`, { silent: true });
        const { orders: batch, meta } = normalizeOrdersPayload(data);

        const safeBatch = Array.isArray(batch) ? batch : [];
        allOrders.push(...safeBatch);
        finalMeta = meta || finalMeta;

        if (meta?.hasMore != null) {
          hasMore = Boolean(meta.hasMore);
        } else if (meta?.totalCount != null) {
          hasMore = allOrders.length < Number(meta.totalCount || 0);
        } else {
          hasMore = safeBatch.length === limit;
        }

        page += 1;

        if (safeBatch.length === 0) {
          hasMore = false;
        }
      }

      set({
        orders: allOrders,
        ordersMeta: finalMeta
          ? { ...finalMeta, page: page - 1, fetchedCount: allOrders.length }
          : { page: page - 1, limit, fetchedCount: allOrders.length },
        loading: false,
        error: null,
      });

      return allOrders;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  fetchCustomerSupportOrders: async (filters = {}) => {
    const f = { ...(filters || {}) };

    if (f.page == null) f.page = 1;
    if (f.limit == null) f.limit = 50;

    const qs = buildQueryString(f);
    const data = await get()._get(`/api/orders/customer-support${qs}`);
    const { orders, meta } = normalizeOrdersPayload(data);

    set({ orders, ordersMeta: meta || null });
    return orders;
  },

  fetchNextCustomerSupportOrdersPage: async (filters = {}) => {
    const currMeta = get().ordersMeta;
    const nextPage = Math.max(
      1,
      Number(currMeta?.page || filters?.page || 1) + 1,
    );
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

  fetchCustomerSupportOrderDetail: async (orderId, { force = false } = {}) => {
    if (!orderId) return null;

    const key = String(orderId);
    const cached = get().customerSupportOrderDetails?.[key];
    if (cached && !force) return cached;

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

  /* ============================================================
   ORDER ITEM EDITING
============================================================ */

  addProductToOrder: async (
    orderId,
    { productId, variantId = null, quantity = 1 } = {},
  ) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!productId) {
      throw new Error("Product ID is required");
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("Quantity must be at least 1");
    }

    const data = await get()._post(`/api/orders/${orderId}/items`, {
      productId,
      variantId: variantId || undefined,
      quantity: qty,
    });

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  changeOrderItemSize: async (orderId, lineId, variantId) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!lineId) {
      throw new Error("Line ID is required");
    }

    if (!variantId) {
      throw new Error("Variant ID is required");
    }

    const data = await get()._patch(
      `/api/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(
        lineId,
      )}/size`,
      {
        variantId,
      },
    );

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  removeProductFromOrder: async (orderId, lineId, quantity = null) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!lineId) {
      throw new Error("Line ID is required");
    }

    const payload = {};

    if (quantity !== null && quantity !== undefined) {
      const qty = Number(quantity);

      if (!Number.isInteger(qty) || qty < 1) {
        throw new Error("Quantity must be at least 1");
      }

      payload.quantity = qty;
    }

    const data = await get()._delete(
      `/api/orders/${orderId}/items/${lineId}`,
      payload,
    );

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  updateOrderStatus: async (orderId, payload) => {
    if (!orderId) return null;

    const p = { ...(payload || {}) };
    if (p.priority != null) {
      p.priority = normalizePriority(p.priority) || "normal";
    }

    const data = await get()._patch(`/api/orders/${orderId}/status`, p);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    get()._syncCustomerSupportDetail(order);

    return order;
  },

  updateOrderPaymentStatus: async (orderId, paymentStatus) => {
    if (!orderId) return null;

    const status = String(paymentStatus || "")
      .trim()
      .toLowerCase();

    const allowedStatuses = [
      "pending",
      "paid",
      "failed",
      "refunded",
      "partially_refunded",

      "refund_pending",
      "not_applicable",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid payment status");
    }

    const data = await get()._patch(`/api/orders/${orderId}/payment-status`, {
      paymentStatus: status,
    });

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  /* ============================================================
   PAYMENT RECOVERY EMAIL
============================================================ */

  sendOrderPaymentRecoveryEmail: async (
    orderId,
    {
      paymentLink,
      expiresAt,
    } = {},
  ) => {
    const id = String(orderId || "").trim();

    if (!id) {
      throw new Error("Order ID is required");
    }

    set({
      paymentRecoveryLoading: true,
      paymentRecoveryError: null,
      paymentRecoveryResult: null,
    });

    try {
      const data = await get()._post(
        `/api/orders/${encodeURIComponent(
          id,
        )}/send-payment-recovery-email`,
        {
          paymentLink:
            paymentLink ||
            undefined,

          expiresAt:
            expiresAt ||
            undefined,
        },
        {
          silent: true,
        },
      );

      set({
        paymentRecoveryLoading: false,
        paymentRecoveryError: null,
        paymentRecoveryResult: data,
      });

      return data;
    } catch (error) {
      set({
        paymentRecoveryLoading: false,
        paymentRecoveryError:
          error?.message ||
          "Failed to send payment recovery email",
        paymentRecoveryResult: null,
      });

      throw error;
    }
  },

  sendBulkOrderPaymentRecoveryEmails: async (
    orderIds = [],
  ) => {
    const normalizedOrderIds = [
      ...new Set(
        (
          Array.isArray(orderIds)
            ? orderIds
            : []
        )
          .map((id) =>
            String(id || "").trim(),
          )
          .filter(Boolean),
      ),
    ];

    if (!normalizedOrderIds.length) {
      throw new Error(
        "Select at least one order",
      );
    }

    if (normalizedOrderIds.length > 100) {
      throw new Error(
        "Maximum 100 orders can be processed at once",
      );
    }

    set({
      paymentRecoveryLoading: true,
      paymentRecoveryError: null,
      paymentRecoveryResult: null,
    });

    try {
      const data = await get()._post(
        "/api/orders/send-payment-recovery-emails",
        {
          orderIds:
            normalizedOrderIds,
        },
        {
          silent: true,
        },
      );

      set({
        paymentRecoveryLoading: false,
        paymentRecoveryError: null,
        paymentRecoveryResult: data,
      });

      return data;
    } catch (error) {
      set({
        paymentRecoveryLoading: false,
        paymentRecoveryError:
          error?.message ||
          "Failed to send payment recovery emails",
        paymentRecoveryResult: null,
      });

      throw error;
    }
  },

  clearPaymentRecoveryResult: () =>
    set({
      paymentRecoveryLoading: false,
      paymentRecoveryError: null,
      paymentRecoveryResult: null,
    }),

  markCodOrderAsPaid: async (orderId) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const data = await get()._patch(`/api/orders/${orderId}/mark-cod-paid`, {});

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  updateTracking: async (orderId, payload) => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/tracking`, payload);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    get()._syncCustomerSupportDetail(order);

    return order;
  },

  markOrderAsInfluencer: async (orderId, isInfluencerOrder = true) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (typeof isInfluencerOrder !== "boolean") {
      throw new Error("isInfluencerOrder must be a boolean");
    }

    const data = await get()._patch(`/api/orders/${orderId}/influencer-order`, {
      isInfluencerOrder,
    });

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  markOrderAsTesting: async (orderId, isTestingOrder = true) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (typeof isTestingOrder !== "boolean") {
      throw new Error("isTestingOrder must be a boolean");
    }

    const data = await get()._patch(
      `/api/orders/${orderId}/toggle-testing`,
      {
        isTestingOrder,
      },
    );

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  updateOrderAddress: async (orderId, payload) => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/address`, payload);
    const order = get()._normalizeOrder(data);

    set({ order });
    get()._syncOrderInList(order);
    get()._syncCustomerSupportDetail(order);

    return order;
  },

  updateOrder: async (orderId, payload) => {
    if (!orderId) return null;

    const p = { ...(payload || {}) };

    if (p.priority != null) {
      p.priority = normalizePriority(p.priority) || "normal";
    }

    if (p.customerSupportRemark != null) {
      p.customerSupportRemark = String(p.customerSupportRemark).trim();
    }

    const data = await get()._patch(`/api/orders/${orderId}`, p);
    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  cancelOrder: async (orderId, reason = "") => {
    if (!orderId) return null;

    const data = await get()._patch(`/api/orders/${orderId}/status`, {
      fulfillmentStatus: "cancelled",
      cancelledBy: "admin",
      reason: String(reason || "").trim(),
      adminRemarks: "cancelled_by_admin",
    });

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  confirmOrder: async (orderId) => {
    if (!orderId) return null;

    const data = await get()._post(`/api/orders/${orderId}/confirm`, {
      confirmedBy: "admin",
    });

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return order;
  },

  splitOrderIntoShipments: async (orderId, shipments = []) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!Array.isArray(shipments) || shipments.length < 2) {
      throw new Error("At least 2 shipments are required");
    }

    const data = await get()._post(`/api/orders/${orderId}/split`, {
      shipments,
    });

    const parent = data?.parent || null;
    const children = Array.isArray(data?.children) ? data.children : [];

    set((state) => ({
      order: parent || state.order,

      orders: [
        ...children,
        ...(state.orders || []).map((existingOrder) =>
          parent &&
            String(existingOrder?._id) === String(parent?._id)
            ? { ...existingOrder, ...parent }
            : existingOrder,
        ),
      ],
    }));

    if (parent?._id) {
      get()._syncCustomerSupportDetail(parent);
    }

    return {
      parent,
      children,
      data,
    };
  },

  fetchOrderConfirmationDetails: async (orderId) => {
    if (!orderId) return null;

    set({ confirmationDetailsLoading: true, error: null });

    try {
      const data = await get()._get(
        `/api/orders/${orderId}/confirmation-details`,
        { silent: true },
      );

      const details = data?.data || data || null;

      set({
        confirmationDetails: details,
        confirmationDetailsLoading: false,
      });

      return details;
    } catch (error) {
      set({
        confirmationDetailsLoading: false,
        error: error?.message || "Failed to fetch confirmation details",
      });
      throw error;
    }
  },

  duplicateExchangeOrder: async (orderId, payload = {}) => {
    if (!orderId) return null;

    const data = await get()._post(
      `/api/orders/${orderId}/duplicate-exchange`,
      payload,
    );

    const newOrder = get()._normalizeOrder(data);

    if (newOrder?._id) {
      set((s) => ({
        order: newOrder,
        orders: [
          newOrder,
          ...(s.orders || []).filter(
            (o) => String(o?._id) !== String(newOrder._id),
          ),
        ],
      }));
    }

    return newOrder;
  },

  /* ============================================================
   READY TO SHIP
============================================================ */

  fetchPackedOrdersForShipping: async (filters = {}) => {
    const qs = buildQueryString(filters);

    const data = await get()._get(
      `/api/orders/shipping/packed${qs}`,
    );

    set({
      shippingOrders: data?.orders || [],
      shippingOrdersMeta: data?.meta || null,
    });

    return data;
  },

  assignCourierToOrder: async (orderId, provider) => {
    if (!orderId) throw new Error("Order ID is required");

    const data = await get()._patch(
      `/api/orders/${orderId}/courier`,
      {
        provider,
      },
    );

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);

      set((state) => ({
        shippingOrders: (state.shippingOrders || []).map((o) =>
          String(o._id) === String(order._id)
            ? {
              ...o,
              shipment: order.shipment,
            }
            : o,
        ),
      }));
    }

    return data;
  },

  fetchShiprocketRatesForOrder: async (
    orderId,
    { silent = true } = {},
  ) => {
    const id = String(orderId || "").trim();

    if (!id) {
      throw new Error("Order ID is required");
    }

    return get()._get(
      `/api/orders/${encodeURIComponent(id)}/shiprocket/rates`,
      { silent },
    );
  },

  fetchDelhiveryRateForOrder: async (
    orderId,
    { silent = true } = {},
  ) => {
    const id = String(orderId || "").trim();

    if (!id) {
      throw new Error("Order ID is required");
    }

    return get()._get(
      `/api/orders/${encodeURIComponent(id)}/delhivery/rate`,
      { silent },
    );
  },

  bookShiprocketIfMissing: async (orderId) => {
    if (!orderId) return null;

    const data = await get()._post(
      `/api/orders/${orderId}/shiprocket/book`,
      {},
    );
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
      `/api/orders/product-order-count?q=${encodeURIComponent(search)}`,
    );

    const result = {
      query: data?.query || search,
      totalOrders: Number(data?.totalOrders || 0),
    };

    set({ productOrderCount: result });
    return result;
  },

  searchProductOrders: async (q) => {
    const search = String(q ?? "").trim();

    if (!search) {
      set({
        productOrderSearchResult: null,
        productOrderSearchLoading: false,
        productOrderSearchError: "Product name or code is required",
      });

      return null;
    }

    set({
      productOrderSearchLoading: true,
      productOrderSearchError: null,
    });

    try {
      const data = await get()._get(
        `/api/orders/product-order-search?q=${encodeURIComponent(search)}`,
        { silent: true },
      );

      const result = {
        success: Boolean(data?.success),
        query: data?.query || search,

        totalOrders: Number(data?.totalOrders || 0),

        orderNumbers: Array.isArray(data?.orderNumbers)
          ? data.orderNumbers
          : [],

        orders: Array.isArray(data?.orders)
          ? data.orders
          : [],

        summary: Array.isArray(data?.summary)
          ? data.summary
          : [],

        groupedOrders:
          data?.groupedOrders &&
            typeof data.groupedOrders === "object"
            ? data.groupedOrders
            : {},
      };

      set({
        productOrderSearchResult: result,
        productOrderSearchLoading: false,
        productOrderSearchError: null,
      });

      return result;
    } catch (error) {
      console.error("searchProductOrders error:", error);

      set({
        productOrderSearchResult: null,
        productOrderSearchLoading: false,
        productOrderSearchError:
          error?.message || "Failed to search product orders",
      });

      throw error;
    }
  },

  // ✅ NEW FUNCTION ONLY
  searchOrdersByLocation: async (params = {}) => {
    get()._start();

    try {
      const query = new URLSearchParams();

      if (params.state) query.set("state", String(params.state).trim());
      if (params.pincode) query.set("pincode", String(params.pincode).trim());
      if (params.page != null) query.set("page", String(params.page));
      if (params.limit != null) query.set("limit", String(params.limit));

      if (params.fulfillmentStatus) {
        query.set("fulfillmentStatus", String(params.fulfillmentStatus).trim());
      }

      if (params.paymentMethod) {
        query.set("paymentMethod", String(params.paymentMethod).trim());
      }

      if (
        params.isConfirmed !== undefined &&
        params.isConfirmed !== null &&
        params.isConfirmed !== ""
      ) {
        query.set("isConfirmed", String(params.isConfirmed));
      }

      if (params.search) {
        query.set("search", String(params.search).trim());
      }

      const data = await get()._get(
        `/api/orders/location/search?${query.toString()}`,
        { silent: true },
      );

      set({
        orders: Array.isArray(data?.orders) ? data.orders : [],
        ordersMeta: data?.pagination
          ? {
            page: Number(data.pagination.page || 1),
            limit: Number(data.pagination.limit || 100),
            totalCount: Number(data.pagination.total || 0),
            totalPages: Number(data.pagination.totalPages || 1),
            hasMore: Boolean(data.pagination.hasNextPage),
            hasPrevPage: Boolean(data.pagination.hasPrevPage),
          }
          : {
            page: 1,
            limit: Number(params.limit || 100),
            totalCount: 0,
            totalPages: 1,
            hasMore: false,
            hasPrevPage: false,
          },
        loading: false,
        error: null,
      });

      return data;
    } catch (error) {
      console.error("searchOrdersByLocation error:", error);
      get()._fail(error);
      throw error;
    }
  },

  getWalletSummary: (order = null) => {
    const o = order || get().order || {};

    return {
      used: Boolean(o?.walletCredit?.used || o?.analytics?.creditsUsed),
      amount: Number(
        o?.walletCredit?.amount || o?.paymentBreakdown?.walletAmount || 0,
      ),
      transactionId: o?.walletCredit?.transactionId || "",
      debitedAt: o?.walletCredit?.debitedAt || null,
      balanceAfterDebit: Number(o?.walletCredit?.balanceAfterDebit || 0),
      remainingPayable: Number(o?.finalPayable || 0),
      paymentMethod: o?.paymentMethod || "",
      paymentStatus: o?.paymentStatus || "",
    };
  },

  /* ============================================================
   APPLY COUPON AFTER ORDER PLACED
============================================================ */

  applyCouponAfterOrderPlaced: async (orderId, couponCode) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const code = String(couponCode || "")
      .trim()
      .toUpperCase();

    if (!code) {
      throw new Error("Coupon code is required");
    }

    const data = await get()._post(
      `/api/orders/${orderId}/apply-coupon-after-order`,
      {
        code,
      },
    );

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return data;
  },

  /* ============================================================
   ADJUST FINAL PAYABLE
============================================================ */

  adjustOrderFinalPayable: async (orderId, payload = {}) => {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const data = await get()._patch(
      `/api/orders/${orderId}/adjust-final-payable`,
      payload,
    );

    const order = get()._normalizeOrder(data);

    if (order?._id) {
      set({ order });
      get()._syncOrderInList(order);
      get()._syncCustomerSupportDetail(order);
    }

    return data;
  },

  /* ---------------- DUPLICATE ORDER ALERTS ---------------- */

  // fetch only (no marking)
  fetchDuplicateOrderAlerts: async () => {
    const data = await get()._get(`/api/orders/duplicate-alerts`);
    return data;
  },

  // detect + mark in adminRemarks
  markDuplicateOrderAlerts: async () => {
    const data = await get()._post(`/api/orders/duplicate-alerts/mark`, {});
    return data;
  },

  clearOrder: () => set({ order: null }),
  clearProductOrderCount: () => set({ productOrderCount: null }),
  clearProductOrderSearch: () =>
    set({
      productOrderSearchResult: null,
      productOrderSearchLoading: false,
      productOrderSearchError: null,
    }),

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
      productOrderCount: null,
      ordersMeta: null,
      customerSupportOrderDetails: {},
      confirmationDetails: null,
      confirmationDetailsLoading: false,
      // ✅ dashboard
      orderDashboard: null,
      orderDashboardLoading: false,
      invoices: [],
      invoicesByOrderNumber: {},
      invoiceLoading: false,
      invoiceError: null,
      invoiceMissingOrderNumbers: [],
      shippingOrders: [],
      shippingOrdersMeta: null,
    }),
}));
