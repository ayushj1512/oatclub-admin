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
    if (value === undefined || value === null) return;
    if (String(value).trim?.() === "") return;
    sp.set(key, String(value));
  });

  const s = sp.toString();
  return s ? `?${s}` : "";
};

const initialFilters = () => ({
  month: "",
  search: "",
  page: 1,
  limit: 100,
});

const emptyTotals = () => ({
  rows: 0,
  orders: 0,
  disc: 0,
  net: 0,
  taxable: 0,
  tax: 0,
  sumOrderTotal: 0,
  sumOrderDiscount: 0,
});

const emptyMeta = () => ({
  page: 1,
  limit: 100,
  totalOrders: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  month: "",
  search: "",
  analytics: {
    rows: 0,
    orders: 0,
    disc: 0,
    net: 0,
    taxable: 0,
    tax: 0,
    sumOrderTotal: 0,
    sumOrderDiscount: 0,
  },
});

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const normalizeTotals = (src = {}) => ({
  rows: toNumber(src.rows, 0),
  orders: toNumber(src.orders, 0),
  disc: toNumber(src.disc, 0),
  net: toNumber(src.net, 0),
  taxable: toNumber(src.taxable, 0),
  tax: toNumber(src.tax, 0),
  sumOrderTotal: toNumber(src.sumOrderTotal, 0),
  sumOrderDiscount: toNumber(src.sumOrderDiscount, 0),
});

const escapeCsv = (value) => {
  const s = String(value ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvHeaders = [
  "OrderId",
  "Delivered month",
  "Customer name",
  "Customer state",
  "Payment mode",
  "Payment method",
  "Courier name",
  "Product type",
  "HSN code",
  "Product size",
  "Qty",
  "Selling price (unit, incl tax)",
  "Allocated discount",
  "Net line (incl tax) (after discount)",
  "Taxable value (excl tax)",
  "Tax amount (5%)",
  "Tax rate",
  "Order total amount (final payable)",
  "Order discount",
  "Coupon code",
];

const rowsToCsv = (rows = []) =>
  [
    csvHeaders.join(","),
    ...rows.map((r) =>
      [
        r.orderId,
        r.deliveredMonth,
        r.customerName,
        r.customerState,
        r.paymentMode,
        r.paymentMethod,
        r.courierName,
        r.productType,
        r.hsnCode,
        r.productSize,
        r.qty,
        r.sellingPrice,
        r.allocatedDiscount,
        r.netLine,
        r.taxableValue,
        r.taxAmount,
        r.taxRate,
        r.orderTotalAmount,
        r.orderDiscount,
        r.couponCode,
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

export const useOrderAccountsStore = create((set, get) => ({
  rows: [],
  totals: emptyTotals(),
  meta: emptyMeta(),
  filters: initialFilters(),

  loading: false,
  downloading: false,
  error: "",

  setFilters: (patch = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...patch,
      },
    })),

  setMonth: (month = "") =>
    set((state) => ({
      filters: {
        ...state.filters,
        month,
        page: 1,
      },
    })),

  setSearch: (search = "") =>
    set((state) => ({
      filters: {
        ...state.filters,
        search,
        page: 1,
      },
    })),

  setPage: (page = 1) =>
    set((state) => ({
      filters: {
        ...state.filters,
        page: Math.max(1, Number(page) || 1),
      },
    })),

  setLimit: (limit = 100) =>
    set((state) => ({
      filters: {
        ...state.filters,
        limit: Math.max(1, Number(limit) || 100),
        page: 1,
      },
    })),

  resetFilters: () =>
    set({
      filters: initialFilters(),
    }),

  fetchSalesReport: async (override = {}) => {
    const state = get();
    const filters = {
      ...state.filters,
      ...override,
    };

    set({ loading: true, error: "" });

    try {
      const url = buildUrl(
        `/api/orders/accounts/sales-report${qs({
          month: filters.month,
          search: filters.search,
          page: filters.page,
          limit: filters.limit,
        })}`
      );

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch sales report");
      }

      set({
        rows: Array.isArray(data?.rows) ? data.rows : [],
        totals: normalizeTotals(data?.totals),
        meta: {
          page: toNumber(data?.meta?.page, filters.page || 1),
          limit: toNumber(data?.meta?.limit, filters.limit || 100),
          totalOrders: toNumber(data?.meta?.totalOrders, 0),
          totalPages: Math.max(1, toNumber(data?.meta?.totalPages, 1)),
          hasNextPage: Boolean(data?.meta?.hasNextPage),
          hasPrevPage: Boolean(data?.meta?.hasPrevPage),
          month: String(data?.meta?.month || filters.month || ""),
          search: String(data?.meta?.search || filters.search || ""),
          analytics: normalizeTotals(
            data?.meta?.analytics ||
              data?.meta?.overallTotals ||
              data?.meta?.summary ||
              {}
          ),
        },
        filters: {
          month: String(data?.meta?.month || filters.month || ""),
          search: String(data?.meta?.search || filters.search || ""),
          page: toNumber(data?.meta?.page, filters.page || 1),
          limit: toNumber(data?.meta?.limit, filters.limit || 100),
        },
        loading: false,
        error: "",
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        error: error?.message || "Something went wrong",
      });
      throw error;
    }
  },

  /* -------------------------------------------------
     CSV should contain ALL rows for selected month/search
     not just current page
  -------------------------------------------------- */
  downloadSalesReportCsv: async (override = {}) => {
    const state = get();
    const filters = {
      ...state.filters,
      ...override,
    };

    set({ downloading: true, error: "" });

    try {
      const firstUrl = buildUrl(
        `/api/orders/accounts/sales-report${qs({
          month: filters.month,
          search: filters.search,
          page: 1,
          limit: 500,
        })}`
      );

      const firstRes = await fetch(firstUrl, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const firstData = await firstRes.json().catch(() => ({}));

      if (!firstRes.ok || !firstData?.success) {
        throw new Error(firstData?.message || "Failed to fetch report for CSV");
      }

      const totalPages = Math.max(1, toNumber(firstData?.meta?.totalPages, 1));
      let allRows = Array.isArray(firstData?.rows) ? [...firstData.rows] : [];

      if (totalPages > 1) {
        const requests = [];

        for (let page = 2; page <= totalPages; page++) {
          const url = buildUrl(
            `/api/orders/accounts/sales-report${qs({
              month: filters.month,
              search: filters.search,
              page,
              limit: 500,
            })}`
          );

          requests.push(
            fetch(url, {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
            }).then(async (res) => {
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data?.success) {
                throw new Error(data?.message || `Failed to fetch page ${page} for CSV`);
              }
              return Array.isArray(data?.rows) ? data.rows : [];
            })
          );
        }

        const pages = await Promise.all(requests);
        for (const pageRows of pages) allRows.push(...pageRows);
      }

      const csv = rowsToCsv(allRows);
      const fileName = `sales-report-${filters.month || "all"}-full.csv`;

      downloadBlob(csv, fileName);

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

  clearSalesReport: () =>
    set({
      rows: [],
      totals: emptyTotals(),
      meta: emptyMeta(),
      error: "",
    }),
}));