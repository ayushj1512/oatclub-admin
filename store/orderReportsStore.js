"use client";

import { create } from "zustand";

const API = (
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
    if (typeof value === "string" && !value.trim()) return;
    sp.set(key, String(value));
  });

  const str = sp.toString();
  return str ? `?${str}` : "";
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
  from: "",
  to: "",
  source: "",
  range: "",
});

const initialSummary = () => ({
  totalProducts: 0,
  totalQtySold: 0,
  totalRevenue: 0,
  totalOrders: 0,
});

const initialUnsoldSummary = () => ({
  totalUnsoldProducts: 0,
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

const initialRoasSummary = () => ({
  spendTotal: 0,
  revenueAll: 0,
  revenueValid: 0,
  ordersAll: 0,
  ordersValid: 0,
  roasAll: 0,
  roasValid: 0,
});

const initialOperationsSummary = () => ({
  totalOrders: 0,
  pendingProcessing: 0,
  dispatched: 0,
  delivered: 0,
  cancelled: 0,
  returnedRto: 0,
  refundsProcessed: 0,
});

export const useOrderReportsStore = create((set, get) => ({
  rows: [],
  unsoldRows: [],

  summary: initialSummary(),
  unsoldSummary: initialUnsoldSummary(),
  businessOverview: initialBusinessOverview(),
  roasSummary: initialRoasSummary(),
  operationsSummary: initialOperationsSummary(),

  roasRows: [],
  spendRows: [],
  sources: [],

  filters: initialFilters(),
  pagination: initialPagination(),
  unsoldPagination: initialPagination(),

  loading: false,
  unsoldLoading: false,
  overviewLoading: false,
  roasLoading: false,
  operationsLoading: false,

  error: "",
  unsoldError: "",
  overviewError: "",
  roasError: "",
  operationsError: "",

  initialized: false,
  unsoldInitialized: false,
  overviewInitialized: false,
  roasInitialized: false,
  operationsInitialized: false,

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
    set((state) => ({
      filters: {
        ...state.filters,
        ...patch,
        ...(Object.prototype.hasOwnProperty.call(patch, "page")
          ? {}
          : { page: 1 }),
      },
    }));
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

  resetFilters: () => set({ filters: initialFilters() }),

  fetchProductSalesReport: async (override = {}) => {
    const filters = { ...get().filters, ...override };
    set({ loading: true, error: "" });

    try {
      const res = await fetch(
        buildUrl(
          `/api/orders/accounts/sales-report/products${qs({
            month: filters.month,
            search: filters.search,
            sort: filters.sort,
            page: filters.page,
            limit: filters.limit,
          })}`
        ),
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch product sales report");
      }

      set((state) => ({
        rows: safeArr(data?.rows),
        summary: {
          totalProducts: toNum(data?.summary?.totalProducts),
          totalQtySold: toNum(data?.summary?.totalQtySold ?? data?.summary?.totalQty),
          totalRevenue: toNum(data?.summary?.totalRevenue),
          totalOrders: toNum(data?.summary?.totalOrders),
        },
        pagination: {
          page: toNum(data?.pagination?.page, filters.page),
          limit: toNum(data?.pagination?.limit, filters.limit),
          total: toNum(data?.pagination?.total),
          totalPages: toNum(data?.pagination?.totalPages),
          hasNext: Boolean(data?.pagination?.hasNext),
          hasPrev: Boolean(data?.pagination?.hasPrev),
        },
        filters: {
          ...state.filters,
          month: data?.filters?.month ?? filters.month ?? "",
          search: data?.filters?.search ?? filters.search ?? "",
          sort: data?.filters?.sort ?? filters.sort ?? "qty_desc",
          page: toNum(data?.filters?.page, filters.page),
          limit: toNum(data?.filters?.limit, filters.limit),
        },
        loading: false,
        error: "",
        initialized: true,
      }));

      return { success: true, data };
    } catch (error) {
      set({
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
        loading: false,
        error: error?.message || "Failed to fetch product sales report",
        initialized: true,
      });

      return {
        success: false,
        message: error?.message || "Failed to fetch product sales report",
      };
    }
  },

  fetchUnsoldProductsReport: async (override = {}) => {
    const filters = { ...get().filters, ...override };
    set({ unsoldLoading: true, unsoldError: "" });

    try {
      const res = await fetch(
        buildUrl(
          `/api/orders/accounts/sales-report/products/unsold${qs({
            search: filters.search,
            page: filters.page,
            limit: filters.limit,
          })}`
        ),
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch unsold products report");
      }

      set((state) => ({
        unsoldRows: safeArr(data?.rows),
        unsoldSummary: {
          totalUnsoldProducts: toNum(data?.summary?.totalUnsoldProducts),
        },
        unsoldPagination: {
          page: toNum(data?.pagination?.page, filters.page),
          limit: toNum(data?.pagination?.limit, filters.limit),
          total: toNum(data?.pagination?.total),
          totalPages: toNum(data?.pagination?.totalPages),
          hasNext: Boolean(data?.pagination?.hasNext),
          hasPrev: Boolean(data?.pagination?.hasPrev),
        },
        filters: {
          ...state.filters,
          search: data?.filters?.search ?? filters.search ?? "",
          page: toNum(data?.filters?.page, filters.page),
          limit: toNum(data?.filters?.limit, filters.limit),
        },
        unsoldLoading: false,
        unsoldError: "",
        unsoldInitialized: true,
      }));

      return { success: true, data };
    } catch (error) {
      set({
        unsoldRows: [],
        unsoldSummary: initialUnsoldSummary(),
        unsoldPagination: {
          page: toNum(filters.page, 1),
          limit: toNum(filters.limit, 20),
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        unsoldLoading: false,
        unsoldError: error?.message || "Failed to fetch unsold products report",
        unsoldInitialized: true,
      });

      return {
        success: false,
        message: error?.message || "Failed to fetch unsold products report",
      };
    }
  },

  fetchBusinessOverview: async (override = {}) => {
    const filters = { ...get().filters, ...override };
    set({ overviewLoading: true, overviewError: "" });

    try {
      const res = await fetch(
        buildUrl(`/api/orders/accounts/business-overview${qs({ month: filters.month })}`),
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch order business overview");
      }

      set((state) => ({
        businessOverview: {
          totalOrdersReceived: toNum(data?.summary?.totalOrdersReceived),
          totalRevenueGenerated: toNum(data?.summary?.totalRevenueGenerated),
          averageOrderValue: toNum(data?.summary?.averageOrderValue),
        },
        filters: {
          ...state.filters,
          month: data?.filters?.month ?? filters.month ?? "",
        },
        overviewLoading: false,
        overviewError: "",
        overviewInitialized: true,
      }));

      return { success: true, data };
    } catch (error) {
      set({
        businessOverview: initialBusinessOverview(),
        overviewLoading: false,
        overviewError: error?.message || "Failed to fetch order business overview",
        overviewInitialized: true,
      });

      return {
        success: false,
        message: error?.message || "Failed to fetch order business overview",
      };
    }
  },

  fetchROASReport: async (override = {}) => {
    const filters = { ...get().filters, ...override };
    set({ roasLoading: true, roasError: "" });

    try {
      const res = await fetch(
        buildUrl(
          `/api/orders/reports/roas${qs({
            from: filters.from,
            to: filters.to,
            source: filters.source,
          })}`
        ),
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch ROAS report");

      set((state) => ({
        roasSummary: {
          spendTotal: toNum(data?.summary?.spendTotal),
          revenueAll: toNum(data?.summary?.revenueAll),
          revenueValid: toNum(data?.summary?.revenueValid),
          ordersAll: toNum(data?.summary?.ordersAll),
          ordersValid: toNum(data?.summary?.ordersValid),
          roasAll: toNum(data?.summary?.roasAll),
          roasValid: toNum(data?.summary?.roasValid),
        },
        roasRows: safeArr(data?.dayWise),
        spendRows: safeArr(data?.spendDayWise),
        sources: safeArr(data?.sources),
        filters: {
          ...state.filters,
          from: data?.filters?.from ?? filters.from ?? "",
          to: data?.filters?.to ?? filters.to ?? "",
          source: data?.filters?.source ?? filters.source ?? "",
        },
        roasLoading: false,
        roasError: "",
        roasInitialized: true,
      }));

      return { success: true, data };
    } catch (error) {
      set({
        roasSummary: initialRoasSummary(),
        roasRows: [],
        spendRows: [],
        sources: [],
        roasLoading: false,
        roasError: error?.message || "Failed to fetch ROAS report",
        roasInitialized: true,
      });

      return { success: false, message: error?.message || "Failed to fetch ROAS report" };
    }
  },

  fetchOperationsStatusReport: async (override = {}) => {
    const filters = { ...get().filters, ...override };
    set({ operationsLoading: true, operationsError: "" });

    try {
      const res = await fetch(
        buildUrl(
          `/api/orders/reports/operations-status${qs({
            range: filters.range,
            from: filters.from,
            to: filters.to,
          })}`
        ),
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch operations status report");
      }

      set((state) => ({
        operationsSummary: {
          totalOrders: toNum(data?.summary?.totalOrders),
          pendingProcessing: toNum(data?.summary?.pendingProcessing),
          dispatched: toNum(data?.summary?.dispatched),
          delivered: toNum(data?.summary?.delivered),
          cancelled: toNum(data?.summary?.cancelled),
          returnedRto: toNum(data?.summary?.returnedRto),
          refundsProcessed: toNum(data?.summary?.refundsProcessed),
        },
        filters: {
          ...state.filters,
          range: data?.filters?.range ?? filters.range ?? "",
          from: data?.filters?.from ?? filters.from ?? "",
          to: data?.filters?.to ?? filters.to ?? "",
        },
        operationsLoading: false,
        operationsError: "",
        operationsInitialized: true,
      }));

      return { success: true, data };
    } catch (error) {
      set({
        operationsSummary: initialOperationsSummary(),
        operationsLoading: false,
        operationsError: error?.message || "Failed to fetch operations status report",
        operationsInitialized: true,
      });

      return {
        success: false,
        message: error?.message || "Failed to fetch operations status report",
      };
    }
  },

  fetchOverviewAndProducts: async (override = {}) => {
    const filters = { ...get().filters, ...override };
    set({ filters: { ...get().filters, ...filters } });

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

  refresh: async () => get().fetchProductSalesReport(),
  refreshUnsold: async () => get().fetchUnsoldProductsReport(),
  refreshAll: async () => get().fetchOverviewAndProducts(),
  refreshROAS: async () => get().fetchROASReport(),
  refreshOperations: async () => get().fetchOperationsStatusReport(),

  goToNextPage: async () => {
    const { pagination, filters } = get();
    if (!pagination.hasNext) return;

    const page = toNum(filters.page, 1) + 1;
    set({ filters: { ...filters, page } });
    return get().fetchProductSalesReport({ ...filters, page });
  },

  goToPrevPage: async () => {
    const { filters } = get();
    const page = Math.max(1, toNum(filters.page, 1) - 1);

    set({ filters: { ...filters, page } });
    return get().fetchProductSalesReport({ ...filters, page });
  },

  goToNextUnsoldPage: async () => {
    const { unsoldPagination, filters } = get();
    if (!unsoldPagination.hasNext) return;

    const page = toNum(filters.page, 1) + 1;
    set({ filters: { ...filters, page } });
    return get().fetchUnsoldProductsReport({ ...filters, page });
  },

  goToPrevUnsoldPage: async () => {
    const { filters } = get();
    const page = Math.max(1, toNum(filters.page, 1) - 1);

    set({ filters: { ...filters, page } });
    return get().fetchUnsoldProductsReport({ ...filters, page });
  },

  hydrateAndFetch: async (patch = {}) => {
    const next = { ...get().filters, ...patch };
    set({ filters: next });
    return get().fetchProductSalesReport(next);
  },

  hydrateAndFetchUnsold: async (patch = {}) => {
    const next = { ...get().filters, ...patch };
    set({ filters: next });
    return get().fetchUnsoldProductsReport(next);
  },

  hydrateAndFetchAll: async (patch = {}) => {
    const next = { ...get().filters, ...patch };
    set({ filters: next });
    return get().fetchOverviewAndProducts(next);
  },

  hydrateAndFetchROAS: async (patch = {}) => {
    const next = { ...get().filters, ...patch };
    set({ filters: next });
    return get().fetchROASReport(next);
  },

  hydrateAndFetchOperations: async (patch = {}) => {
    const next = { ...get().filters, ...patch };
    set({ filters: next });
    return get().fetchOperationsStatusReport(next);
  },

  clearReport: () => {
    set({
      rows: [],
      unsoldRows: [],
      summary: initialSummary(),
      unsoldSummary: initialUnsoldSummary(),
      businessOverview: initialBusinessOverview(),
      roasSummary: initialRoasSummary(),
      operationsSummary: initialOperationsSummary(),
      roasRows: [],
      spendRows: [],
      sources: [],
      pagination: initialPagination(),
      unsoldPagination: initialPagination(),
      error: "",
      unsoldError: "",
      overviewError: "",
      roasError: "",
      operationsError: "",
      initialized: false,
      unsoldInitialized: false,
      overviewInitialized: false,
      roasInitialized: false,
      operationsInitialized: false,
    });
  },
}));

export default useOrderReportsStore;