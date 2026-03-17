"use client";

import { create } from "zustand";

const API =
  (process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

const buildUrl = (path) => {
  if (!API) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") return;
    sp.set(key, String(value));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const initialFilters = () => ({
  month: "",
  search: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 50,
});

const emptySummary = () => ({
  totalOrders: 0,
  grossRevenue: 0,
  netRevenue: 0,
  totalDiscount: 0,
  codRevenue: 0,
  prepaidRevenue: 0,
  highestRevenueDay: null,
  lowestRevenueDay: null,
});

const emptyMeta = () => ({
  page: 1,
  limit: 50,
  totalOrders: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  month: "",
  search: "",
  startDate: "",
  endDate: "",
});

const normalizeSummary = (src = {}) => ({
  totalOrders: toNum(src.totalOrders),
  grossRevenue: toNum(src.grossRevenue),
  netRevenue: toNum(src.netRevenue),
  totalDiscount: toNum(src.totalDiscount),
  codRevenue: toNum(src.codRevenue),
  prepaidRevenue: toNum(src.prepaidRevenue),
  highestRevenueDay: src.highestRevenueDay || null,
  lowestRevenueDay: src.lowestRevenueDay || null,
});

const csvHeaders = [
  "Order Number",
  "Date",
  "Payment Method",
  "Status",
  "Revenue",
  "Discount",
];

const escapeCsv = (value) => {
  const s = String(value ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const ordersToCsv = (orders = []) =>
  [
    csvHeaders.join(","),
    ...orders.map((o) =>
      [
        o.orderNumber,
        o.deliveredAt,
        o.paymentMethod,
        o.fulfillmentStatus,
        o.revenue,
        o.discount,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ].join("\n");

const downloadBlob = (content, filename, type = "text/csv;charset=utf-8;") => {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const REPORT_ENDPOINTS = {
  sales: "/api/orders/accounts/sales-report",
  revenue: "/api/orders/accounts/revenue-report",
};

const buildFetchUrl = (endpoint, filters) =>
  buildUrl(
    `${endpoint}${qs({
      month: filters.month,
      search: filters.search,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      limit: filters.limit,
    })}`
  );

const fetchJson = async (url, label = "report") => {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Failed to fetch ${label}`);
  }

  return data;
};

export const useOrderAccountsStore = create((set, get) => ({
  reportType: "revenue",

  orders: [], // current page
  allOrders: [], // all pages
  summary: emptySummary(),
  meta: emptyMeta(),
  filters: initialFilters(),

  loading: false,
  downloading: false,
  hydratingAll: false,
  error: "",

  setReportType: (reportType = "revenue") =>
    set({
      reportType: reportType === "sales" ? "sales" : "revenue",
      orders: [],
      allOrders: [],
      summary: emptySummary(),
      meta: emptyMeta(),
      error: "",
    }),

  setFilters: (patch = {}) =>
    set((state) => ({
      filters: { ...state.filters, ...patch },
    })),

  setMonth: (month = "") =>
    set((state) => ({
      filters: { ...state.filters, month, page: 1 },
    })),

  setSearch: (search = "") =>
    set((state) => ({
      filters: { ...state.filters, search, page: 1 },
    })),

  setStartDate: (startDate = "") =>
    set((state) => ({
      filters: { ...state.filters, startDate, page: 1 },
    })),

  setEndDate: (endDate = "") =>
    set((state) => ({
      filters: { ...state.filters, endDate, page: 1 },
    })),

  setPage: (page = 1) =>
    set((state) => ({
      filters: { ...state.filters, page: Math.max(1, Number(page) || 1) },
    })),

  setLimit: (limit = 50) =>
    set((state) => ({
      filters: { ...state.filters, limit: Math.max(1, Number(limit) || 50), page: 1 },
    })),

  resetFilters: () =>
    set({
      filters: initialFilters(),
      orders: [],
      allOrders: [],
      summary: emptySummary(),
      meta: emptyMeta(),
      error: "",
    }),

  fetchAllPages: async ({ type, filters }) => {
    const reportType = type || get().reportType || "revenue";
    const endpoint = REPORT_ENDPOINTS[reportType] || REPORT_ENDPOINTS.revenue;

    const firstData = await fetchJson(
      buildFetchUrl(endpoint, { ...filters, page: 1, limit: 250 }),
      `${reportType} report`
    );

    const totalPages = Math.max(1, toNum(firstData?.meta?.totalPages, 1));
    let allOrders = Array.isArray(firstData?.orders) ? [...firstData.orders] : [];

    if (totalPages > 1) {
      const requests = [];
      for (let page = 2; page <= totalPages; page++) {
        requests.push(
          fetchJson(
            buildFetchUrl(endpoint, { ...filters, page, limit: 250 }),
            `${reportType} report page ${page}`
          ).then((data) => (Array.isArray(data?.orders) ? data.orders : []))
        );
      }

      const pages = await Promise.all(requests);
      pages.forEach((pageOrders) => allOrders.push(...pageOrders));
    }

    return {
      allOrders,
      meta: firstData?.meta || {},
      summary: firstData?.summary || {},
    };
  },

  fetchReport: async ({ type, override = {}, fetchOverall = true } = {}) => {
    const state = get();
    const reportType = type || state.reportType || "revenue";
    const endpoint = REPORT_ENDPOINTS[reportType] || REPORT_ENDPOINTS.revenue;
    const filters = { ...state.filters, ...override };

    set({ loading: true, error: "" });

    try {
      const data = await fetchJson(
        buildFetchUrl(endpoint, filters),
        `${reportType} report`
      );

      set({
        reportType,
        orders: Array.isArray(data?.orders) ? data.orders : [],
        summary: normalizeSummary(data?.summary),
        meta: {
          page: toNum(data?.meta?.page, filters.page),
          limit: toNum(data?.meta?.limit, filters.limit),
          totalOrders: toNum(data?.meta?.totalOrders, 0),
          totalPages: Math.max(1, toNum(data?.meta?.totalPages, 1)),
          hasNextPage: Boolean(data?.meta?.hasNextPage),
          hasPrevPage: Boolean(data?.meta?.hasPrevPage),
          month: String(data?.meta?.month || filters.month || ""),
          search: String(data?.meta?.search || filters.search || ""),
          startDate: String(data?.meta?.startDate || filters.startDate || ""),
          endDate: String(data?.meta?.endDate || filters.endDate || ""),
        },
        filters: {
          month: String(data?.meta?.month || filters.month || ""),
          search: String(data?.meta?.search || filters.search || ""),
          startDate: String(data?.meta?.startDate || filters.startDate || ""),
          endDate: String(data?.meta?.endDate || filters.endDate || ""),
          page: toNum(data?.meta?.page, filters.page),
          limit: toNum(data?.meta?.limit, filters.limit),
        },
        loading: false,
        error: "",
      });

      if (fetchOverall) {
        set({ hydratingAll: true });
        try {
          const overall = await get().fetchAllPages({ type: reportType, filters });
          set({
            allOrders: overall.allOrders,
            hydratingAll: false,
          });
        } catch (e) {
          set({ hydratingAll: false });
        }
      }

      return data;
    } catch (error) {
      set({
        loading: false,
        hydratingAll: false,
        error: error?.message || "Something went wrong",
      });
      throw error;
    }
  },

  fetchSalesReport: (override = {}, fetchOverall = true) =>
    get().fetchReport({ type: "sales", override, fetchOverall }),

  fetchRevenueReport: (override = {}, fetchOverall = true) =>
    get().fetchReport({ type: "revenue", override, fetchOverall }),

  downloadReportCsv: async ({ type, override = {} } = {}) => {
    const state = get();
    const reportType = type || state.reportType || "revenue";
    const filters = { ...state.filters, ...override };

    set({ downloading: true, error: "" });

    try {
      let allOrders = state.allOrders;

      if (!Array.isArray(allOrders) || !allOrders.length) {
        const overall = await get().fetchAllPages({ type: reportType, filters });
        allOrders = overall.allOrders;
        set({ allOrders });
      }

      downloadBlob(
        ordersToCsv(allOrders),
        `${reportType}-report-${filters.month || "all"}.csv`
      );

      set({ downloading: false });
      return true;
    } catch (error) {
      set({
        downloading: false,
        error: error?.message || "Failed to download CSV",
      });
      throw error;
    }
  },

  downloadSalesReportCsv: (override = {}) =>
    get().downloadReportCsv({ type: "sales", override }),

  downloadRevenueReportCsv: (override = {}) =>
    get().downloadReportCsv({ type: "revenue", override }),

  clearReport: () =>
    set({
      orders: [],
      allOrders: [],
      summary: emptySummary(),
      meta: emptyMeta(),
      error: "",
    }),
}));