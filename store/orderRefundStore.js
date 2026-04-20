"use client";

import { create } from "zustand";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const DEFAULT_LIMIT = 100;

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

const normalizeOrder = (order = {}) => ({
  ...order,
  id: order?._id || order?.id || "",
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
  refundContext: order?.refundContext || {},
  razorpay: order?.razorpay || {},
  shipment: order?.shipment || {},
  trackingDetails: order?.trackingDetails || {},
});

export const useOrderRefundStore = create((set, get) => ({
  orders: [],

  summary: {
    totalOrders: 0,
    totalRefundAmount: 0,
    actionRequiredCount: 0,
    refundPendingCount: 0,
  },

  pagination: {
    page: 1,
    limit: DEFAULT_LIMIT,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  },

  filters: {
    page: 1,
    limit: DEFAULT_LIMIT,
    search: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    onlyActionRequired: false,
  },

  loading: false,
  refreshing: false,
  error: "",

  setFilters: (nextFilters = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...nextFilters,
        page:
          nextFilters.page != null
            ? Math.max(1, Number(nextFilters.page) || 1)
            : state.filters.page,
        limit:
          nextFilters.limit != null
            ? Math.max(1, Number(nextFilters.limit) || DEFAULT_LIMIT)
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

  resetFilters: () =>
    set({
      filters: {
        page: 1,
        limit: DEFAULT_LIMIT,
        search: "",
        paymentStatus: "",
        startDate: "",
        endDate: "",
        sortBy: "createdAt",
        sortOrder: "desc",
        onlyActionRequired: false,
      },
    }),

  fetchRefundOrders: async (overrideFilters = {}, options = {}) => {
    const { silent = false } = options;
    const currentFilters = get().filters;

    const finalFilters = {
      ...currentFilters,
      ...overrideFilters,
      page: Math.max(
        1,
        Number(overrideFilters?.page ?? currentFilters.page ?? 1) || 1
      ),
      limit: Math.max(
        1,
        Number(overrideFilters?.limit ?? currentFilters.limit ?? DEFAULT_LIMIT) ||
          DEFAULT_LIMIT
      ),
    };

    if (!silent) {
      set({ loading: true, refreshing: false, error: "" });
    } else {
      set({ refreshing: true, error: "" });
    }

    try {
      const query = buildQuery({
        ...finalFilters,
        onlyActionRequired: finalFilters.onlyActionRequired ? "true" : "false",
      });

      const response = await fetch(
        `${API_BASE}/api/orders/refund-pending-candidates?${query}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Failed to fetch refund candidate orders"
        );
      }

      set({
        orders: Array.isArray(data?.orders)
          ? data.orders.map(normalizeOrder)
          : [],
        summary: {
          totalOrders: Number(data?.summary?.totalOrders || 0),
          totalRefundAmount: Number(data?.summary?.totalRefundAmount || 0),
          actionRequiredCount: Number(data?.summary?.actionRequiredCount || 0),
          refundPendingCount: Number(data?.summary?.refundPendingCount || 0),
        },
        pagination: {
          page: Number(data?.pagination?.page || finalFilters.page || 1),
          limit: Number(
            data?.pagination?.limit || finalFilters.limit || DEFAULT_LIMIT
          ),
          totalCount: Number(data?.pagination?.totalCount || 0),
          totalPages: Number(data?.pagination?.totalPages || 1),
          hasMore: Boolean(data?.pagination?.hasMore),
        },
        filters: {
          ...finalFilters,
          page: Number(data?.pagination?.page || finalFilters.page || 1),
          limit: Number(
            data?.pagination?.limit || finalFilters.limit || DEFAULT_LIMIT
          ),
        },
        loading: false,
        refreshing: false,
        error: "",
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        refreshing: false,
        error: error?.message || "Failed to fetch refund candidate orders",
      });
      return null;
    }
  },

  refreshRefundOrders: async () => {
    return get().fetchRefundOrders({}, { silent: true });
  },

  goToPage: async (page) => {
    const nextPage = Math.max(1, Number(page || 1));
    return get().fetchRefundOrders({ page: nextPage });
  },

  setSearch: (search = "") =>
    set((state) => ({
      filters: {
        ...state.filters,
        search,
        page: 1,
      },
    })),

  setPaymentStatus: (paymentStatus = "") =>
    set((state) => ({
      filters: {
        ...state.filters,
        paymentStatus,
        page: 1,
      },
    })),

  setDateRange: ({ startDate = "", endDate = "" } = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        startDate,
        endDate,
        page: 1,
      },
    })),

  setSorting: ({ sortBy = "createdAt", sortOrder = "desc" } = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        sortBy,
        sortOrder,
        page: 1,
      },
    })),

  toggleOnlyActionRequired: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        onlyActionRequired: !state.filters.onlyActionRequired,
        page: 1,
      },
    })),

  updateOrderInList: (updatedOrder) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        String(order?._id || order?.id) ===
        String(updatedOrder?._id || updatedOrder?.id)
          ? normalizeOrder({ ...order, ...updatedOrder })
          : order
      ),
    })),

  removeOrderFromList: (orderId) =>
    set((state) => ({
      orders: state.orders.filter(
        (order) => String(order?._id || order?.id) !== String(orderId)
      ),
    })),

  clearRefundOrders: () =>
    set({
      orders: [],
      summary: {
        totalOrders: 0,
        totalRefundAmount: 0,
        actionRequiredCount: 0,
        refundPendingCount: 0,
      },
      pagination: {
        page: 1,
        limit: DEFAULT_LIMIT,
        totalCount: 0,
        totalPages: 1,
        hasMore: false,
      },
      error: "",
    }),
}));