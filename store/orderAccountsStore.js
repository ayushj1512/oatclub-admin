"use client";

import { create } from "zustand";

/* ---------------------------------------
   API helpers
---------------------------------------- */
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
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }
    sp.set(key, String(value));
  });

  const str = sp.toString();
  return str ? `?${str}` : "";
};

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/* ---------------------------------------
   Initial filters
---------------------------------------- */
const initialFilters = () => ({
  month: "",
  search: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 50,
});

/* ---------------------------------------
   Empty states
---------------------------------------- */
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
  totalDiscount: 0,
  netInclusive: 0,
  taxable: 0,
  shippingCharges: 0,
  taxAmount: 0,
});

const emptyGSTSummary = () => ({
  taxableValue: 0,
  taxAmount: 0,
  taxRate: "5%",
  totalOrders: 0,
  totalStates: 0,
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

/* ---------------------------------------
   Normalizers
---------------------------------------- */
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
  totalDiscount: toNum(src.totalDiscount ?? src.disc),
  netInclusive: toNum(src.netInclusive ?? src.net),
  taxable: toNum(src.taxable),
  shippingCharges: toNum(src.shippingCharges),
  taxAmount: toNum(src.taxAmount ?? src.tax),
});

const normalizeGSTSummary = (src = {}) => ({
  taxableValue: toNum(src.taxableValue),
  taxAmount: toNum(src.taxAmount),
  taxRate: String(src.taxRate || "5%"),
  totalOrders: toNum(src.totalOrders),
  totalStates: toNum(src.totalStates),
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

/* ---------------------------------------
   CSV helpers
---------------------------------------- */
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
  "Order Date",
  "Delivered Date",
  "Customer Name",
  "State",
  "Payment Type",
  "Courier",
  "Product Type",
  "HSN Code",
  "Size",
  "Qty",
  "Unit (Inclusive Tax)",
  "T. Discount",
  "Net (Inclusive)",
  "Taxable",
  "Shipping Charges",
  "Tax Amount",
  "Tax Rate",
];

const gstCsvHeaders = [
  "State Name",
  "State Code",
  "Taxable Value",
  "Tax Amount",
  "Tax Rate",
  "Total Orders",
];

const escapeCsv = (value) => {
  const str = String(value ?? "");
  return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const revenueOrdersToCsv = (orders = []) =>
  [
    revenueCsvHeaders.join(","),
    ...orders.map((order) =>
      [
        order.orderNumber,
        order.deliveredAt,
        order.paymentMethod,
        order.fulfillmentStatus,
        order.revenue,
        order.discount,
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
        row.orderDate,
        row.deliveredDate,
        row.customerName,
        row.state,
        row.paymentType,
        row.courier,
        row.productType,
        row.hsnCode,
        row.size,
        row.qty,
        row.unitInclusiveTax,
        row.totalDiscount,
        row.netInclusive,
        row.taxable,
        row.shippingCharges,
        row.taxAmount,
        row.taxRate,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ].join("\n");

const gstRowsToCsv = (rows = []) =>
  [
    gstCsvHeaders.join(","),
    ...rows.map((row) =>
      [
        row.stateName,
        row.stateCode,
        row.taxableValue,
        row.taxAmount,
        row.taxRate,
        row.totalOrders,
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

/* ---------------------------------------
   Endpoints
---------------------------------------- */
const REPORT_ENDPOINTS = {
  sales: "/api/orders/accounts/sales-ledger",
  revenue: "/api/orders/accounts/revenue-report",
  gst: "/api/orders/accounts/gst-report",
};

const VALID_REPORT_TYPES = ["revenue", "sales", "gst"];

const getSafeReportType = (type = "revenue") =>
  VALID_REPORT_TYPES.includes(type) ? type : "revenue";

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

/* ---------------------------------------
   Store
---------------------------------------- */
export const useOrderAccountsStore = create((set, get) => ({
  reportType: "revenue",

  // revenue report
  orders: [],
  allOrders: [],
  summary: emptySummary(),

  // sales ledger / gst rows
  rows: [],
  allRows: [],
  totals: emptyTotals(),

  // gst summary
  gstSummary: emptyGSTSummary(),

  // shared
  meta: emptyMeta(),
  filters: initialFilters(),

  loading: false,
  downloading: false,
  hydratingAll: false,
  error: "",

  /* -----------------------------------
     Filters
  ------------------------------------ */
  setReportType: (reportType = "revenue") =>
    set({
      reportType: getSafeReportType(reportType),
      orders: [],
      allOrders: [],
      rows: [],
      allRows: [],
      summary: emptySummary(),
      totals: emptyTotals(),
      gstSummary: emptyGSTSummary(),
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
      filters: {
        ...state.filters,
        page: Math.max(1, Number(page) || 1),
      },
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
      gstSummary: emptyGSTSummary(),
      meta: emptyMeta(),
      error: "",
    }),

  /* -----------------------------------
     Fetch all pages for full CSV
  ------------------------------------ */
  fetchAllPages: async ({ type, filters }) => {
    const reportType = getSafeReportType(type || get().reportType);
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

    // sales + gst both use rows
    if (reportType === "sales" || reportType === "gst") {
      let allRows = Array.isArray(firstData?.rows) ? [...firstData.rows] : [];

      if (totalPages > 1) {
        const requests = [];

        for (let page = 2; page <= totalPages; page += 1) {
          requests.push(
            fetchJson(
              buildFetchUrl(endpoint, { ...baseFilters, page, limit: 250 }),
              `${reportType} report page ${page}`
            ).then((data) => (Array.isArray(data?.rows) ? data.rows : []))
          );
        }

        const pages = await Promise.all(requests);
        pages.forEach((pageRows) => allRows.push(...pageRows));
      }

      return {
        allRows,
        meta: normalizeMeta(firstData?.meta, baseFilters),
        totals:
          reportType === "sales"
            ? normalizeTotals(firstData?.totals)
            : emptyTotals(),
        gstSummary:
          reportType === "gst"
            ? normalizeGSTSummary(firstData?.summary)
            : emptyGSTSummary(),
      };
    }

    let allOrders = Array.isArray(firstData?.orders) ? [...firstData.orders] : [];

    if (totalPages > 1) {
      const requests = [];

      for (let page = 2; page <= totalPages; page += 1) {
        requests.push(
          fetchJson(
            buildFetchUrl(endpoint, { ...baseFilters, page, limit: 250 }),
            `${reportType} report page ${page}`
          ).then((data) => (Array.isArray(data?.orders) ? data.orders : []))
        );
      }

      const pages = await Promise.all(requests);
      pages.forEach((pageOrders) => allOrders.push(...pageOrders));
    }

    return {
      allOrders,
      meta: normalizeMeta(firstData?.meta, baseFilters),
      summary: normalizeSummary(firstData?.summary),
    };
  },

  /* -----------------------------------
     Main fetch
  ------------------------------------ */
  fetchReport: async ({ type, override = {}, fetchOverall = true } = {}) => {
    const state = get();
    const reportType = getSafeReportType(type || state.reportType);
    const endpoint = REPORT_ENDPOINTS[reportType] || REPORT_ENDPOINTS.revenue;
    const filters = { ...state.filters, ...override };

    set({ loading: true, error: "" });

    try {
      const data = await fetchJson(
        buildFetchUrl(endpoint, filters),
        `${reportType} report`
      );

      const normalizedMeta = normalizeMeta(data?.meta, filters);

      // GST
      if (reportType === "gst") {
        set({
          reportType,
          rows: Array.isArray(data?.rows) ? data.rows : [],
          allRows: fetchOverall ? get().allRows : [],
          gstSummary: normalizeGSTSummary(data?.summary),
          orders: [],
          allOrders: [],
          summary: emptySummary(),
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
            const overall = await get().fetchAllPages({
              type: reportType,
              filters,
            });

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

      // Sales
      if (reportType === "sales") {
        set({
          reportType,
          rows: Array.isArray(data?.rows) ? data.rows : [],
          allRows: fetchOverall ? get().allRows : [],
          totals: normalizeTotals(data?.totals),
          orders: [],
          allOrders: [],
          summary: emptySummary(),
          gstSummary: emptyGSTSummary(),
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
            const overall = await get().fetchAllPages({
              type: reportType,
              filters,
            });

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

      // Revenue
      set({
        reportType,
        orders: Array.isArray(data?.orders) ? data.orders : [],
        allOrders: fetchOverall ? get().allOrders : [],
        summary: normalizeSummary(data?.summary),
        rows: [],
        allRows: [],
        totals: emptyTotals(),
        gstSummary: emptyGSTSummary(),
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
          const overall = await get().fetchAllPages({
            type: reportType,
            filters,
          });

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

  /* -----------------------------------
     Wrappers
  ------------------------------------ */
  fetchSalesReport: (override = {}, fetchOverall = true) =>
    get().fetchReport({ type: "sales", override, fetchOverall }),

  fetchRevenueReport: (override = {}, fetchOverall = true) =>
    get().fetchReport({ type: "revenue", override, fetchOverall }),

  fetchGSTReport: (override = {}, fetchOverall = true) =>
    get().fetchReport({ type: "gst", override, fetchOverall }),

  /* -----------------------------------
     Downloads
  ------------------------------------ */
  downloadReportCsv: async ({ type, override = {} } = {}) => {
    const state = get();
    const reportType = getSafeReportType(type || state.reportType);
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
          `sales-ledger-${filters.month || "all"}.csv`
        );

        set({ downloading: false });
        return true;
      }

      if (reportType === "gst") {
        let allRows = state.allRows;

        if (!Array.isArray(allRows) || !allRows.length) {
          const overall = await get().fetchAllPages({ type: reportType, filters });
          allRows = Array.isArray(overall?.allRows) ? overall.allRows : [];
          set({ allRows });
        }

        downloadBlob(
          gstRowsToCsv(allRows),
          `gst-report-${filters.month || "all"}.csv`
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

  downloadGSTReportCsv: (override = {}) =>
    get().downloadReportCsv({ type: "gst", override }),

  /* -----------------------------------
     Clear
  ------------------------------------ */
  clearReport: () =>
    set({
      orders: [],
      allOrders: [],
      rows: [],
      allRows: [],
      summary: emptySummary(),
      totals: emptyTotals(),
      gstSummary: emptyGSTSummary(),
      meta: emptyMeta(),
      error: "",
    }),
}));

export default useOrderAccountsStore;