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

const emptyTotals = () => ({
  rows: 0,
  orders: 0,
  disc: 0,
  net: 0,
  taxable: 0,
  tax: 0,
});

const emptyMeta = () => ({
  page: 1,
  limit: 50,
  totalOrders: 0,
  totalRows: 0,
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

const normalizeTotals = (src = {}) => ({
  rows: toNum(src.rows),
  orders: toNum(src.orders),
  disc: toNum(src.disc),
  net: toNum(src.net),
  taxable: toNum(src.taxable),
  tax: toNum(src.tax),
});

const normalizeMeta = (src = {}, fallback = {}) => ({
  page: toNum(src.page, fallback.page || 1),
  limit: toNum(src.limit, fallback.limit || 50),
  totalOrders: toNum(src.totalOrders, 0),
  totalRows: toNum(src.totalRows, 0),
  totalPages: Math.max(1, toNum(src.totalPages, 1)),
  hasNextPage: Boolean(src.hasNextPage),
  hasPrevPage: Boolean(src.hasPrevPage),
  month: String(src.month || fallback.month || ""),
  search: String(src.search || fallback.search || ""),
  startDate: String(src.startDate || fallback.startDate || ""),
  endDate: String(src.endDate || fallback.endDate || ""),
});

const revenueCsvHeaders = [
  "Order Number",
  "Date",
  "Payment Method",
  "Status",
  "Revenue",
  "Discount",
];

const salesCsvHeaders = [
  "Order ID",
  "Month",
  "Customer",
  "State",
  "Pay",
  "Payment Method",
  "Courier",
  "Product Type",
  "HSN",
  "Size",
  "Qty",
  "Unit (incl)",
  "Disc",
  "Net (incl)",
  "Taxable",
  "Tax",
  "Rate",
  "Order Total",
  "Order Disc",
  "Coupon",
];

const escapeCsv = (value) => {
  const s = String(value ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const revenueOrdersToCsv = (orders = []) =>
  [
    revenueCsvHeaders.join(","),
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

const salesRowsToCsv = (rows = []) =>
  [
    salesCsvHeaders.join(","),
    ...rows.map((row) =>
      [
        row.orderId,
        row.deliveredMonth,
        row.customerName,
        row.customerState,
        row.paymentMode,
        row.paymentMethod,
        row.courierName,
        row.productType,
        row.hsnCode,
        row.productSize,
        row.qty,
        row.sellingPrice,
        row.allocatedDiscount,
        row.netLine,
        row.taxableValue,
        row.taxAmount,
        row.taxRate,
        row.orderTotalAmount,
        row.orderDiscount,
        row.couponCode,
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

  // revenue
  orders: [],
  allOrders: [],
  summary: emptySummary(),

  // sales
  rows: [],
  allRows: [],
  totals: emptyTotals(),

  // shared
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
      rows: [],
      allRows: [],
      summary: emptySummary(),
      totals: emptyTotals(),
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
      filters: {
        ...state.filters,
        limit: Math.max(1, Number(limit) || 50),
        page: 1,
      },
    })),

  resetFilters: () =>
    set({
      filters: initialFilters(),
      orders: [],
      allOrders: [],
      rows: [],
      allRows: [],
      summary: emptySummary(),
      totals: emptyTotals(),
      meta: emptyMeta(),
      error: "",
    }),

  fetchAllPages: async ({ type, filters }) => {
    const reportType = type || get().reportType || "revenue";
    const endpoint = REPORT_ENDPOINTS[reportType] || REPORT_ENDPOINTS.revenue;

    const baseFilters = {
      ...initialFilters(),
      ...filters,
      page: 1,
      limit: 250,
    };

    const firstData = await fetchJson(
      buildFetchUrl(endpoint, baseFilters),
      `${reportType} report`
    );

    const totalPages = Math.max(1, toNum(firstData?.meta?.totalPages, 1));

    if (reportType === "sales") {
      let allRows = Array.isArray(firstData?.rows) ? [...firstData.rows] : [];

      if (totalPages > 1) {
        const requests = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push(
            fetchJson(
              buildFetchUrl(endpoint, { ...baseFilters, page, limit: 250 }),
              `${reportType} report page ${page}`
            ).then((data) => (Array.isArray(data?.rows) ? data.rows : []))
          );
        }

        const pages = await Promise.all(requests);
        pages.forEach((pageRows) => {
          allRows.push(...pageRows);
        });
      }

      return {
        allRows,
        meta: normalizeMeta(firstData?.meta, baseFilters),
        totals: normalizeTotals(firstData?.totals),
      };
    }

    let allOrders = Array.isArray(firstData?.orders) ? [...firstData.orders] : [];

    if (totalPages > 1) {
      const requests = [];
      for (let page = 2; page <= totalPages; page++) {
        requests.push(
          fetchJson(
            buildFetchUrl(endpoint, { ...baseFilters, page, limit: 250 }),
            `${reportType} report page ${page}`
          ).then((data) => (Array.isArray(data?.orders) ? data.orders : []))
        );
      }

      const pages = await Promise.all(requests);
      pages.forEach((pageOrders) => {
        allOrders.push(...pageOrders);
      });
    }

    return {
      allOrders,
      meta: normalizeMeta(firstData?.meta, baseFilters),
      summary: normalizeSummary(firstData?.summary),
    };
  },

  fetchReport: async ({ type, override = {}, fetchOverall = true } = {}) => {
    const state = get();
    const reportType = type || state.reportType || "revenue";
    const endpoint = REPORT_ENDPOINTS[reportType] || REPORT_ENDPOINTS.revenue;
    const filters = { ...state.filters, ...override };

    set({ loading: true, error: "" });

    try {
      const data = await fetchJson(buildFetchUrl(endpoint, filters), `${reportType} report`);

      const normalizedMeta = normalizeMeta(data?.meta, filters);

      if (reportType === "sales") {
        set({
          reportType,
          rows: Array.isArray(data?.rows) ? data.rows : [],
          allRows: fetchOverall ? get().allRows : [],
          totals: normalizeTotals(data?.totals),
          orders: [],
          allOrders: [],
          summary: emptySummary(),
          meta: normalizedMeta,
          filters: {
            month: normalizedMeta.month,
            search: normalizedMeta.search,
            startDate: normalizedMeta.startDate,
            endDate: normalizedMeta.endDate,
            page: normalizedMeta.page,
            limit: normalizedMeta.limit,
          },
          loading: false,
          error: "",
        });

        if (fetchOverall) {
          set({ hydratingAll: true });
          try {
            const overall = await get().fetchAllPages({ type: reportType, filters });
            set({
              allRows: Array.isArray(overall?.allRows) ? overall.allRows : [],
              hydratingAll: false,
            });
          } catch {
            set({ hydratingAll: false });
          }
        }

        return data;
      }

      set({
        reportType,
        orders: Array.isArray(data?.orders) ? data.orders : [],
        allOrders: fetchOverall ? get().allOrders : [],
        summary: normalizeSummary(data?.summary),
        rows: [],
        allRows: [],
        totals: emptyTotals(),
        meta: normalizedMeta,
        filters: {
          month: normalizedMeta.month,
          search: normalizedMeta.search,
          startDate: normalizedMeta.startDate,
          endDate: normalizedMeta.endDate,
          page: normalizedMeta.page,
          limit: normalizedMeta.limit,
        },
        loading: false,
        error: "",
      });

      if (fetchOverall) {
        set({ hydratingAll: true });
        try {
          const overall = await get().fetchAllPages({ type: reportType, filters });
          set({
            allOrders: Array.isArray(overall?.allOrders) ? overall.allOrders : [],
            hydratingAll: false,
          });
        } catch {
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
      if (reportType === "sales") {
        let allRows = state.allRows;

        if (!Array.isArray(allRows) || !allRows.length) {
          const overall = await get().fetchAllPages({ type: reportType, filters });
          allRows = Array.isArray(overall?.allRows) ? overall.allRows : [];
          set({ allRows });
        }

        downloadBlob(
          salesRowsToCsv(allRows),
          `sales-report-${filters.month || "all"}.csv`
        );

        set({ downloading: false });
        return true;
      }

      let allOrders = state.allOrders;

      if (!Array.isArray(allOrders) || !allOrders.length) {
        const overall = await get().fetchAllPages({ type: reportType, filters });
        allOrders = Array.isArray(overall?.allOrders) ? overall.allOrders : [];
        set({ allOrders });
      }

      downloadBlob(
        revenueOrdersToCsv(allOrders),
        `revenue-report-${filters.month || "all"}.csv`
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
      rows: [],
      allRows: [],
      summary: emptySummary(),
      totals: emptyTotals(),
      meta: emptyMeta(),
      error: "",
    }),
}));