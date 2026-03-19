// store/orderReportsStore.js
"use client";

import { create } from "zustand";

const API =
  (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ""
  ).replace(/\/+$/, "");

const buildUrl = (path) => {
  if (!API) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const qs = (params = {}) => {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    sp.set(key, String(value));
  });

  const s = sp.toString();
  return s ? `?${s}` : "";
};

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const safeArr = (v) => (Array.isArray(v) ? v : []);

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const initialFilters = () => ({
  month: "",
  search: "",
  sort: "qty_desc",
  page: 1,
  limit: 20,
});

const initialSummary = () => ({
  totalProducts: 0,
  totalQty: 0,
  totalOrders: 0,
});

const initialBusinessOverview = () => ({
  totalOrdersReceived: 0,
  totalRevenueGenerated: 0,
  averageOrderValue: 0,
});

const initialPagination = () => ({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
});

export const useOrderReportsStore = create((set, get) => ({
  rows: [],
  summary: initialSummary(),
  businessOverview: initialBusinessOverview(),
  filters: initialFilters(),
  pagination: initialPagination(),

  loading: false,
  overviewLoading: false,
  error: "",
  overviewError: "",
  initialized: false,
  overviewInitialized: false,

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        ...(key !== "page" ? { page: 1 } : {}),
      },
    }));
  },

  setFilters: (patch = {}) => {
    set((state) => {
      const next = {
        ...state.filters,
        ...patch,
      };

      if (!Object.prototype.hasOwnProperty.call(patch, "page")) {
        next.page = 1;
      }

      return { filters: next };
    });
  },

  setPage: (page) => {
    set((state) => ({
      filters: {
        ...state.filters,
        page: Math.max(1, toNum(page, 1)),
      },
    }));
  },

  setLimit: (limit) => {
    set((state) => ({
      filters: {
        ...state.filters,
        limit: Math.max(1, toNum(limit, 20)),
        page: 1,
      },
    }));
  },

  resetFilters: () => {
    set({
      filters: initialFilters(),
    });
  },

  fetchProductSalesReport: async (override = {}) => {
    const state = get();
    const filters = {
      ...state.filters,
      ...override,
    };

    set({ loading: true, error: "" });

    try {
      const url = buildUrl(
        `/api/orders/accounts/sales-report/products${qs({
          month: filters.month,
          search: filters.search,
          sort: filters.sort,
          page: filters.page,
          limit: filters.limit,
        })}`
      );

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to fetch product sales report"
        );
      }

      set({
        rows: safeArr(data?.rows),
        summary: {
          totalProducts: toNum(data?.summary?.totalProducts, 0),
          totalQty: toNum(data?.summary?.totalQty, 0),
          totalOrders: toNum(data?.summary?.totalOrders, 0),
        },
        pagination: {
          page: toNum(data?.pagination?.page, filters.page || 1),
          limit: toNum(data?.pagination?.limit, filters.limit || 20),
          total: toNum(data?.pagination?.total, 0),
          totalPages: toNum(data?.pagination?.totalPages, 0),
          hasNext: Boolean(data?.pagination?.hasNext),
          hasPrev: Boolean(data?.pagination?.hasPrev),
        },
        filters: {
          month: data?.filters?.month ?? filters.month ?? "",
          search: data?.filters?.search ?? filters.search ?? "",
          sort: data?.filters?.sort ?? filters.sort ?? "qty_desc",
          page: toNum(data?.filters?.page, filters.page || 1),
          limit: toNum(data?.filters?.limit, filters.limit || 20),
        },
        loading: false,
        error: "",
        initialized: true,
      });

      return {
        success: true,
        data,
      };
    } catch (error) {
      set({
        loading: false,
        error: error?.message || "Failed to fetch product sales report",
        rows: [],
        summary: initialSummary(),
        pagination: {
          page: toNum(filters.page, 1),
          limit: toNum(filters.limit, 20),
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        initialized: true,
      });

      return {
        success: false,
        message: error?.message || "Failed to fetch product sales report",
      };
    }
  },

  fetchBusinessOverview: async (override = {}) => {
    const state = get();
    const filters = {
      ...state.filters,
      ...override,
    };

    set({ overviewLoading: true, overviewError: "" });

    try {
      const url = buildUrl(
        `/api/orders/accounts/business-overview${qs({
          month: filters.month,
        })}`
      );

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to fetch order business overview"
        );
      }

      set((state) => ({
        businessOverview: {
          totalOrdersReceived: toNum(
            data?.summary?.totalOrdersReceived,
            0
          ),
          totalRevenueGenerated: toNum(
            data?.summary?.totalRevenueGenerated,
            0
          ),
          averageOrderValue: toNum(data?.summary?.averageOrderValue, 0),
        },
        filters: {
          ...state.filters,
          month: data?.filters?.month ?? filters.month ?? "",
        },
        overviewLoading: false,
        overviewError: "",
        overviewInitialized: true,
      }));

      return {
        success: true,
        data,
      };
    } catch (error) {
      set({
        overviewLoading: false,
        overviewError:
          error?.message || "Failed to fetch order business overview",
        businessOverview: initialBusinessOverview(),
        overviewInitialized: true,
      });

      return {
        success: false,
        message:
          error?.message || "Failed to fetch order business overview",
      };
    }
  },

  fetchOverviewAndProducts: async (override = {}) => {
    const filters = {
      ...get().filters,
      ...override,
    };

    set({
      filters: {
        ...get().filters,
        ...filters,
      },
    });

    const [overviewRes, productRes] = await Promise.all([
      get().fetchBusinessOverview(filters),
      get().fetchProductSalesReport(filters),
    ]);

    return {
      success: Boolean(overviewRes?.success && productRes?.success),
      overviewRes,
      productRes,
    };
  },

  refresh: async () => {
    return get().fetchProductSalesReport();
  },

  refreshAll: async () => {
    return get().fetchOverviewAndProducts();
  },

  goToNextPage: async () => {
    const { pagination, filters } = get();
    if (!pagination.hasNext) return;

    const nextPage = toNum(filters.page, 1) + 1;

    set({
      filters: {
        ...filters,
        page: nextPage,
      },
    });

    return get().fetchProductSalesReport({
      ...filters,
      page: nextPage,
    });
  },

  goToPrevPage: async () => {
    const { filters } = get();
    const prevPage = Math.max(1, toNum(filters.page, 1) - 1);

    set({
      filters: {
        ...filters,
        page: prevPage,
      },
    });

    return get().fetchProductSalesReport({
      ...filters,
      page: prevPage,
    });
  },

  hydrateAndFetch: async (patch = {}) => {
    const current = get().filters;
    const next = {
      ...current,
      ...patch,
    };

    set({ filters: next });
    return get().fetchProductSalesReport(next);
  },

  hydrateAndFetchAll: async (patch = {}) => {
    const current = get().filters;
    const next = {
      ...current,
      ...patch,
    };

    set({ filters: next });
    return get().fetchOverviewAndProducts(next);
  },

  clearReport: () => {
    set({
      rows: [],
      summary: initialSummary(),
      businessOverview: initialBusinessOverview(),
      pagination: initialPagination(),
      error: "",
      overviewError: "",
      initialized: false,
      overviewInitialized: false,
    });
  },
}));

export default useOrderReportsStore;