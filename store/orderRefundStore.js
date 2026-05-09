"use client";

import { create } from "zustand";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const REFUND_BASE = "/api/order-refunds";
const ORDER_BASE = "/api/orders";
const DEFAULT_LIMIT = 100;

const api = (path) => `${API_BASE}${path}`;
const getId = (v) => v?._id || v?.id || "";

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === "" || value == null) return;
    q.set(key, typeof value === "boolean" ? String(value) : String(value));
  });

  return q.toString();
};

const request = async (path, options = {}) => {
  const res = await fetch(api(path), {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

const normalizeOrder = (order = {}) => ({
  ...order,
  id: getId(order),
  customerName:
    order?.customerName ||
    order?.customerId?.name ||
    order?.shippingAddressSnapshot?.fullName ||
    "",
  customerEmail:
    order?.customerEmail ||
    order?.customerId?.email ||
    order?.shippingAddressSnapshot?.email ||
    "",
  customerPhone:
    order?.customerPhone ||
    order?.customerId?.phone ||
    order?.shippingAddressSnapshot?.phone ||
    "",
  items: Array.isArray(order?.items) ? order.items : [],
  refundSummary: order?.refundSummary || {},
  razorpay: order?.razorpay || {},
  shipment: order?.shipment || {},
  trackingDetails: order?.trackingDetails || {},
});

const normalizeRefund = (refund = {}) => ({
  ...refund,
  id: getId(refund),
  amount: Number(refund?.amount || 0),
  status: refund?.status || "",
  refundNumber: refund?.refundNumber || "",
  refundMode: refund?.refundMode || "",
  refundMethod: refund?.refundMethod || "",
  refundType: refund?.refundType || "full",
  paymentMethod: refund?.paymentMethod || "",
  items: Array.isArray(refund?.items) ? refund.items : [],
  razorpay: refund?.razorpay || {},
  manualRefund: refund?.manualRefund || {},
  customerRefundDetails: refund?.customerRefundDetails || {},
  proofs: Array.isArray(refund?.proofs) ? refund.proofs : [],
});

const defaultSummary = {
  totalOrders: 0,
  totalRefundAmount: 0,
  actionRequiredCount: 0,
  refundPendingCount: 0,
  razorpayCount: 0,
  codCount: 0,
  manualRequiredCount: 0,
};

const defaultPagination = {
  page: 1,
  limit: DEFAULT_LIMIT,
  totalCount: 0,
  totalPages: 1,
  hasMore: false,
};

const defaultFilters = {
  page: 1,
  limit: DEFAULT_LIMIT,
  search: "",
  status: "",
  paymentMethod: "",
  refundMode: "",
  refundStatus: "",
  startDate: "",
  endDate: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  excludeActiveRefunds: false,
};

const makePagination = (data, fallback = 0, filters = {}) => ({
  page: Number(data?.pagination?.page || filters.page || 1),
  limit: Number(data?.pagination?.limit || filters.limit || DEFAULT_LIMIT),
  totalCount: Number(data?.pagination?.totalCount || data?.count || fallback),
  totalPages: Number(data?.pagination?.totalPages || 1),
  hasMore: Boolean(data?.pagination?.hasMore),
});

const getRefundAmountFromOrder = (order = {}) =>
  Number(
    order?.refundSummary?.pendingAmount ||
      order?.refundSummary?.eligibleAmount ||
      order?.finalPayable ||
      0
  );

export const useOrderRefundStore = create((set, get) => {
  const loadOrders = async (path, fallbackError, override = {}, options = {}) => {
    const { silent = false } = options;

    const filters = {
      ...get().filters,
      ...override,
      limit: override.limit || get().filters.limit || DEFAULT_LIMIT,
    };

    set({ loading: !silent, refreshing: silent, error: "" });

    try {
      const query = buildQuery(filters);
      const data = await request(`${path}${query ? `?${query}` : ""}`);

      const orders = Array.isArray(data?.orders)
        ? data.orders.map(normalizeOrder)
        : [];

      set({
        orders,
        summary: data?.summary || get().summary,
        pagination: makePagination(data, orders.length, filters),
        filters,
        loading: false,
        refreshing: false,
      });

      return data;
    } catch (err) {
      set({
        loading: false,
        refreshing: false,
        error: err?.message || fallbackError,
      });
      return null;
    }
  };

  const loadRefunds = async (
    path,
    fallbackError,
    override = {},
    options = {}
  ) => {
    const { silent = false } = options;

    const filters = {
      ...get().filters,
      ...override,
      limit: override.limit || get().filters.limit || DEFAULT_LIMIT,
    };

    set({ loading: !silent, refreshing: silent, error: "" });

    try {
      const query = buildQuery(filters);
      const data = await request(`${path}${query ? `?${query}` : ""}`);

      const refunds = Array.isArray(data?.refunds)
        ? data.refunds.map(normalizeRefund)
        : [];

      set({
        refunds,
        pagination: makePagination(data, refunds.length, filters),
        filters,
        loading: false,
        refreshing: false,
      });

      return data;
    } catch (err) {
      set({
        loading: false,
        refreshing: false,
        error: err?.message || fallbackError,
      });
      return null;
    }
  };

  const upsertRefundAndOrder = (refundData, orderData) => {
    const refund = refundData ? normalizeRefund(refundData) : null;
    const order = orderData ? normalizeOrder(orderData) : null;
    const orderId = String(
      getId(order) || refund?.orderId?._id || refund?.orderId || ""
    );

    set((state) => ({
      selectedRefund: refund || state.selectedRefund,

      refunds: refund
        ? [
            refund,
            ...state.refunds.filter(
              (r) => String(getId(r)) !== String(getId(refund))
            ),
          ]
        : state.refunds,

      refundsByOrderId:
        refund && orderId
          ? {
              ...state.refundsByOrderId,
              [orderId]: [
                refund,
                ...(state.refundsByOrderId[orderId] || []).filter(
                  (r) => String(getId(r)) !== String(getId(refund))
                ),
              ],
            }
          : state.refundsByOrderId,

      orders: order
        ? state.orders.map((item) =>
            String(getId(item)) === String(getId(order)) ? order : item
          )
        : state.orders,
    }));
  };

  const refundAction = async (
    path,
    fallbackError,
    method = "PATCH",
    body = {}
  ) => {
    set({ actionLoading: true, error: "" });

    try {
      const data = await request(path, {
        method,
        body: method === "GET" ? undefined : JSON.stringify(body),
      });

      upsertRefundAndOrder(data?.refund, data?.order);
      set({ actionLoading: false });
      return data;
    } catch (err) {
      set({ actionLoading: false, error: err?.message || fallbackError });
      return null;
    }
  };

  return {
    orders: [],
    refunds: [],
    refundsByOrderId: {},
    selectedRefund: null,
    selectedOrderRefunds: [],

    summary: defaultSummary,
    dashboard: null,
    pagination: defaultPagination,
    filters: defaultFilters,

    loading: false,
    refreshing: false,
    actionLoading: false,
    error: "",

    setFilters: (next = {}) =>
      set((state) => ({
        filters: {
          ...state.filters,
          ...next,
          page: next.page != null ? Math.max(1, Number(next.page) || 1) : 1,
          limit:
            next.limit != null
              ? Math.max(1, Number(next.limit) || DEFAULT_LIMIT)
              : state.filters.limit,
        },
      })),

    setFilterValue: (key, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [key]: value,
          page: key === "page" ? Math.max(1, Number(value || 1)) : 1,
        },
      })),

    resetFilters: () => set({ filters: defaultFilters }),

    fetchRefunds: (override = {}, options = {}) =>
      loadRefunds(REFUND_BASE, "Failed to fetch refunds", override, options),

    fetchRefundOrders: (override = {}, options = {}) =>
      loadOrders(
        `${REFUND_BASE}/pending-orders`,
        "Failed to fetch refund pending orders",
        override,
        options
      ),

    fetchRefundCandidates: (override = {}, options = {}) =>
      loadOrders(
        `${ORDER_BASE}/refund-pending-candidates`,
        "Failed to fetch refund candidates",
        override,
        options
      ),

    fetchEligibleOrders: (override = {}, options = {}) =>
      loadOrders(
        `${ORDER_BASE}/eligible-unrefunded`,
        "Failed to fetch eligible refund orders",
        override,
        options
      ),

    refreshRefundOrders: () => get().fetchRefundOrders({}, { silent: true }),

    fetchDashboard: async () => {
      set({ loading: true, error: "" });

      try {
        const data = await request(`${REFUND_BASE}/dashboard`);

        set({
          dashboard: data?.dashboard || data?.data || data || null,
          summary: data?.summary || data?.dashboard?.summary || get().summary,
          loading: false,
        });

        return data;
      } catch (err) {
        set({
          loading: false,
          error: err?.message || "Failed to fetch refund dashboard",
        });
        return null;
      }
    },

    fetchRefundById: async (refundId) => {
      if (!refundId) return null;

      set({ actionLoading: true, error: "" });

      try {
        const data = await request(`${REFUND_BASE}/${refundId}`);
        set({
          selectedRefund: normalizeRefund(data?.refund),
          actionLoading: false,
        });
        return data;
      } catch (err) {
        set({
          actionLoading: false,
          error: err?.message || "Failed to fetch refund",
        });
        return null;
      }
    },

    fetchRefundsByOrder: async (orderId) => {
      if (!orderId) return null;

      set({ actionLoading: true, error: "" });

      try {
        const data = await request(`${REFUND_BASE}/order/${orderId}`);
        const refunds = Array.isArray(data?.refunds)
          ? data.refunds.map(normalizeRefund)
          : [];

        set((state) => ({
          selectedOrderRefunds: refunds,
          refundsByOrderId: {
            ...state.refundsByOrderId,
            [orderId]: refunds,
          },
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        set({
          actionLoading: false,
          error: err?.message || "Failed to fetch order refunds",
        });
        return null;
      }
    },

    createRazorpayRefundFromOrder: (orderId, payload = {}) =>
      orderId
        ? refundAction(
            `${REFUND_BASE}/razorpay/order/${orderId}/create`,
            "Failed to create Razorpay refund",
            "POST",
            payload
          )
        : null,

    createManualRefundFromOrder: (orderId, payload = {}) =>
      orderId
        ? refundAction(
            `${REFUND_BASE}/manual/order/${orderId}/create`,
            "Failed to create manual refund",
            "POST",
            payload
          )
        : null,

    processRazorpayRefund: (refundId, payload = {}) =>
      refundId
        ? refundAction(
            `${REFUND_BASE}/razorpay/${refundId}/process`,
            "Failed to process Razorpay refund",
            "POST",
            payload
          )
        : null,

    fetchRazorpayRefundStatus: (refundId) =>
      refundId
        ? refundAction(
            `${REFUND_BASE}/razorpay/${refundId}/status`,
            "Failed to fetch Razorpay refund status",
            "GET"
          )
        : null,

    createAndProcessRazorpayRefund: async (orderId, payload = {}) => {
      const created = await get().createRazorpayRefundFromOrder(orderId, {
        amount: payload?.amount,
        refundType: payload?.refundType || "full",
        selectedItems: Array.isArray(payload?.selectedItems)
          ? payload.selectedItems
          : [],
        reason: payload?.reason || "Eligible refund",
      });

      const refundId = created?.refund?._id || created?.refund?.id;
      if (!refundId) return created;

      return get().processRazorpayRefund(refundId, {
        speed: payload?.speed || "normal",
        notes: {
          refundType: payload?.refundType || "full",
          source: payload?.source || "admin_refund_store",
          ...(payload?.notes || {}),
        },
      });
    },

    createFullRazorpayRefund: (order) =>
      get().createAndProcessRazorpayRefund(getId(order), {
        refundType: "full",
        amount: getRefundAmountFromOrder(order),
        reason: order?.refundSummary?.reason || "Full refund",
      }),

    createPartialRazorpayRefund: (
      order,
      amount,
      reason = "Partial refund"
    ) =>
      get().createAndProcessRazorpayRefund(getId(order), {
        refundType: "partial",
        amount: Number(amount || 0),
        reason,
      }),

    createProductRazorpayRefund: (
      order,
      selectedItems = [],
      reason = "Product based refund"
    ) =>
      get().createAndProcessRazorpayRefund(getId(order), {
        refundType: "partial",
        selectedItems,
        reason,
      }),

    createFullManualRefund: (order, payload = {}) =>
      get().createManualRefundFromOrder(getId(order), {
        refundType: "full",
        amount: getRefundAmountFromOrder(order),
        reason: order?.refundSummary?.reason || "Full manual refund",
        refundMethod: payload?.refundMethod || "upi",
        customerRefundDetails: payload?.customerRefundDetails || {},
        adminNote: payload?.adminNote || "",
      }),

    createPartialManualRefund: (order, payload = {}) =>
      get().createManualRefundFromOrder(getId(order), {
        refundType: "partial",
        amount: Number(payload?.amount || 0),
        selectedItems: Array.isArray(payload?.selectedItems)
          ? payload.selectedItems
          : [],
        reason: payload?.reason || "Partial manual refund",
        refundMethod: payload?.refundMethod || "upi",
        customerRefundDetails: payload?.customerRefundDetails || {},
        adminNote: payload?.adminNote || "",
      }),

    markManualRefundProcessed: (refundId, payload = {}) =>
      refundId
        ? refundAction(
            `${REFUND_BASE}/${refundId}/manual-processed`,
            "Failed to complete manual refund",
            "PATCH",
            payload
          )
        : null,

    markManualRefundFailed: (refundId, payload = {}) =>
      refundId
        ? refundAction(
            `${REFUND_BASE}/${refundId}/manual-failed`,
            "Failed to mark manual refund failed",
            "PATCH",
            payload
          )
        : null,

    addRefundProof: (refundId, payload = {}) =>
      refundId
        ? refundAction(
            `${REFUND_BASE}/${refundId}/proofs`,
            "Failed to add refund proof",
            "POST",
            payload
          )
        : null,

    goToPage: (page) =>
      get().fetchRefunds({ page: Math.max(1, Number(page || 1)) }),

    goToRefundOrdersPage: (page) =>
      get().fetchRefundOrders({ page: Math.max(1, Number(page || 1)) }),

    goToRefundCandidatesPage: (page) =>
      get().fetchRefundCandidates({ page: Math.max(1, Number(page || 1)) }),

    goToEligibleOrdersPage: (page) =>
      get().fetchEligibleOrders({ page: Math.max(1, Number(page || 1)) }),

    upsertRefundAndOrder,

    updateOrderInList: (updatedOrder) =>
      set((state) => ({
        orders: state.orders.map((order) =>
          String(getId(order)) === String(getId(updatedOrder))
            ? normalizeOrder({ ...order, ...updatedOrder })
            : order
        ),
      })),

    removeOrderFromList: (orderId) =>
      set((state) => ({
        orders: state.orders.filter(
          (order) => String(getId(order)) !== String(orderId)
        ),
      })),

    clearError: () => set({ error: "" }),

    clearSelectedRefund: () =>
      set({
        selectedRefund: null,
        selectedOrderRefunds: [],
      }),

    clearRefundOrders: () =>
      set({
        orders: [],
        refunds: [],
        refundsByOrderId: {},
        selectedRefund: null,
        selectedOrderRefunds: [],
        summary: defaultSummary,
        dashboard: null,
        pagination: defaultPagination,
        error: "",
      }),
  };
});