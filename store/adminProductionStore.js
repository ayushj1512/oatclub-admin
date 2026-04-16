import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const apiBase = BASE_URL ? BASE_URL.replace(/\/+$/, "") : "";
const API = `${apiBase}/api/orders`;

/* =========================================================
   HELPERS
========================================================= */
const safeStr = (v) => String(v ?? "").trim();

const toCSV = (v) => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(safeStr).filter(Boolean).join(",");
  return safeStr(v);
};

const toBool = (v) => {
  const s = safeStr(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
};

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const buildQueryString = (params = {}) => {
  const qs = new URLSearchParams();

  const fulfillmentStatus = toCSV(params.fulfillmentStatus);
  const priority = toCSV(params.priority);
  const orderType = toCSV(params.orderType);
  const provider = toCSV(params.provider);
  const packability = safeStr(params.packability);

  if (fulfillmentStatus) qs.set("fulfillmentStatus", fulfillmentStatus);
  if (priority) qs.set("priority", priority);
  if (orderType) qs.set("orderType", orderType);
  if (provider) qs.set("provider", provider);
  if (packability) qs.set("packability", packability);

  const q = safeStr(params.q);
  const from = safeStr(params.from);
  const to = safeStr(params.to);
  const sort = safeStr(params.sort);

  if (q) qs.set("q", q);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (sort) qs.set("sort", sort);

  if (params.all != null) {
    qs.set("all", toBool(params.all) ? "true" : "false");
  }

  const page = toNum(params.page, 0);
  const limit = toNum(params.limit, 0);

  if (page > 0) qs.set("page", String(page));
  if (limit > 0 || String(params.limit) === "0") {
    qs.set("limit", String(params.limit));
  }

  return qs.toString();
};

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

const downloadBlobFile = (blob, fileName = "download.xlsx") => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const getFileNameFromResponse = (res, fallback = "download.xlsx") => {
  const contentDisposition = res.headers.get("content-disposition") || "";
  const match =
    contentDisposition.match(/filename\*=UTF-8''([^;]+)/i) ||
    contentDisposition.match(/filename="([^"]+)"/i) ||
    contentDisposition.match(/filename=([^;]+)/i);

  if (!match?.[1]) return fallback;

  try {
    return decodeURIComponent(String(match[1]).replace(/["']/g, "").trim());
  } catch {
    return String(match[1]).replace(/["']/g, "").trim() || fallback;
  }
};

/* =========================================================
   DEFAULTS
========================================================= */
const DEFAULT_FILTERS = {
  fulfillmentStatus: "processing",
  priority: "",
  orderType: "",
  provider: "",
  q: "",
  from: "",
  to: "",
  sort: "createdAt:desc",
  page: 1,
  limit: 100,
  packability: "all",
  all: false,
};

const DEFAULT_JOB_FILTERS = {
  q: "",
  from: "",
  to: "",
  sort: "qty_desc",
  page: 1,
  limit: 50,
  all: false,
};

const DEFAULT_JOB_SUMMARY = {
  totalSkus: 0,
  totalQtyToProduce: 0,
  totalOrdersCovered: 0,
  totalReservations: 0,
  totalOrderedQty: 0,
  totalReservedQty: 0,
  totalReservedGroups: 0,
  totalUnreservedGroups: 0,
};

const DEFAULT_JOB_PAGINATION = {
  total: 0,
  page: 1,
  limit: 50,
  pages: 1,
  hasMore: false,
};

const DEFAULT_QUEUE_PAGINATION = {
  total: 0,
  page: 1,
  limit: 100,
  pages: 1,
  hasMore: false,
};

export const useAdminProductionStore = create((set, get) => ({
  /* =========================================================
     STATE
  ========================================================= */
  queue: [],
  summary: {
    processing: 0,
    packed: 0,
    picked: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    rto: 0,
    return_requested: 0,
    exchange_requested: 0,
    pickup_initiated: 0,
    returned: 0,
    refunded: 0,
    exchanged: 0,
  },

  productionJobs: [],
  productionJobSummary: { ...DEFAULT_JOB_SUMMARY },
  productionJobPagination: { ...DEFAULT_JOB_PAGINATION },

  fulfillmentStatus: "processing",
  filters: { ...DEFAULT_FILTERS },
  queuePagination: { ...DEFAULT_QUEUE_PAGINATION },
  productionJobFilters: { ...DEFAULT_JOB_FILTERS },

  total: 0,

  loadingQueue: false,
  loadingSummary: false,
  loadingProductionJobs: false,
  exportingProductionJobs: false,

  updatingPacked: false,
  updatingShipped: false,
  updatingBulkShipped: false,

  error: null,

  /* =========================================================
     BASIC HELPERS
  ========================================================= */
  clearError: () => set({ error: null }),

  setFulfillmentStatus: (status) =>
    set((state) => ({
      fulfillmentStatus: status || "processing",
      filters: {
        ...state.filters,
        fulfillmentStatus: status || "processing",
        page: 1,
      },
    })),

  setFilters: (partial = {}) =>
    set((state) => {
      const next = { ...state.filters, ...partial };
      const changedKeys = Object.keys(partial || {});
      const shouldResetPage = changedKeys.some((key) => key !== "page");

      if (shouldResetPage && !("page" in partial)) next.page = 1;

      return { filters: next };
    }),

  setSearch: (q = "") =>
    set((state) => ({
      filters: {
        ...state.filters,
        q: safeStr(q),
        page: 1,
      },
    })),

  setDateRange: ({ from = "", to = "" } = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        from: safeStr(from),
        to: safeStr(to),
        page: 1,
      },
    })),

  setQueuePage: (page = 1) =>
    set((state) => ({
      filters: {
        ...state.filters,
        page: Math.max(1, toNum(page, 1)),
      },
    })),

  setQueueLimit: (limit = 25) =>
    set((state) => ({
      filters: {
        ...state.filters,
        limit: Math.max(1, toNum(limit, 25)),
        page: 1,
      },
    })),

  setPackability: (packability = "all") =>
    set((state) => ({
      filters: {
        ...state.filters,
        packability: safeStr(packability) || "all",
        page: 1,
      },
    })),

  resetFilters: () =>
    set({
      fulfillmentStatus: "processing",
      filters: { ...DEFAULT_FILTERS },
      queuePagination: { ...DEFAULT_QUEUE_PAGINATION },
      total: 0,
      queue: [],
    }),

  setProductionJobFilters: (partial = {}) =>
    set((state) => {
      const next = { ...state.productionJobFilters, ...partial };
      const changedKeys = Object.keys(partial || {});
      const shouldResetPage = changedKeys.some((key) => key !== "page");

      if (shouldResetPage && !("page" in partial)) next.page = 1;

      return { productionJobFilters: next };
    }),

  setProductionJobSearch: (q = "") =>
    set((state) => ({
      productionJobFilters: {
        ...state.productionJobFilters,
        q: safeStr(q),
        page: 1,
      },
    })),

  setProductionJobDateRange: ({ from = "", to = "" } = {}) =>
    set((state) => ({
      productionJobFilters: {
        ...state.productionJobFilters,
        from: safeStr(from),
        to: safeStr(to),
        page: 1,
      },
    })),

  resetProductionJobFilters: () =>
    set({
      productionJobFilters: { ...DEFAULT_JOB_FILTERS },
    }),

  /* =========================================================
     FETCH PRODUCTION QUEUE
  ========================================================= */
  fetchProductionQueue: async (params = {}) => {
    try {
      set({ loadingQueue: true, error: null });

      const state = get();
      const merged = { ...state.filters, ...params };
      const status =
        merged.fulfillmentStatus || state.fulfillmentStatus || "processing";

      merged.fulfillmentStatus = status;
      if (merged.all == null) merged.all = false;
      if (toNum(merged.page, 0) <= 0) merged.page = 1;
if (toNum(merged.limit, 0) <= 0) merged.limit = state.filters.limit || 100;
      merged.packability = safeStr(merged.packability) || "all";

      const query = buildQueryString(merged);
      const res = await fetch(`${API}/production/queue?${query}`, {
        credentials: "include",
      });

      const data = await parseJson(res);

      const orders = Array.isArray(data?.orders) ? data.orders : [];
      const total = toNum(data?.total, 0);
      const currentPage = toNum(data?.page, merged.page || 1);
      const currentLimit = toNum(data?.limit, merged.limit || 25);
      const currentPages = Math.max(
        1,
        toNum(data?.pages, Math.ceil(total / Math.max(1, currentLimit)) || 1)
      );

      set((s) => ({
        queue: orders,
        total,
        fulfillmentStatus: status,
        filters: {
          ...s.filters,
          ...merged,
          fulfillmentStatus: status,
          page: currentPage,
          limit: currentLimit,
          packability: safeStr(
            data?.filtersApplied?.packability || merged.packability || "all"
          ),
          all: Boolean(data?.all),
        },
        queuePagination: {
          total,
          page: currentPage,
          limit: currentLimit,
          pages: currentPages,
          hasMore: currentPage < currentPages,
        },
      }));

      return orders;
    } catch (e) {
      console.error("❌ fetchProductionQueue error:", e);
      set({
        error: e.message,
        queue: [],
        total: 0,
        queuePagination: { ...DEFAULT_QUEUE_PAGINATION },
      });
      toast.error(e.message);
      return [];
    } finally {
      set({ loadingQueue: false });
    }
  },

  /* =========================================================
     FETCH PRODUCTION SUMMARY
  ========================================================= */
  fetchProductionSummary: async () => {
    try {
      set({ loadingSummary: true, error: null });

      const res = await fetch(`${API}/production/summary`, {
        credentials: "include",
      });

      const data = await parseJson(res);

      set((state) => ({
        summary: { ...state.summary, ...(data.summary || {}) },
      }));

      return data.summary || null;
    } catch (e) {
      console.error("❌ fetchProductionSummary error:", e);
      set({ error: e.message });
      toast.error(e.message);
      return null;
    } finally {
      set({ loadingSummary: false });
    }
  },

  /* =========================================================
     FETCH PRODUCTION JOBS
  ========================================================= */
  fetchProductionJobs: async (params = {}) => {
    try {
      set({ loadingProductionJobs: true, error: null });

      const state = get();
      const merged = { ...state.productionJobFilters, ...params };

      if (merged.page == null || toNum(merged.page) <= 0) merged.page = 1;
      if (merged.limit == null || toNum(merged.limit) <= 0) merged.limit = 50;

      const query = buildQueryString({
        q: merged.q,
        from: merged.from,
        to: merged.to,
        sort: merged.sort,
        page: merged.page,
        limit: merged.limit,
        all: merged.all,
      });

      const res = await fetch(`${API}/production/jobs?${query}`, {
        credentials: "include",
      });

      const data = await parseJson(res);

      set({
        productionJobs: Array.isArray(data?.rows) ? data.rows : [],
        productionJobSummary: {
          totalSkus: toNum(data?.summary?.totalSkus),
          totalQtyToProduce: toNum(data?.summary?.totalQtyToProduce),
          totalOrdersCovered: toNum(data?.summary?.totalOrdersCovered),
          totalReservations: toNum(data?.summary?.totalReservations),
          totalOrderedQty: toNum(data?.summary?.totalOrderedQty),
          totalReservedQty: toNum(data?.summary?.totalReservedQty),
          totalReservedGroups: toNum(data?.summary?.totalReservedGroups),
          totalUnreservedGroups: toNum(data?.summary?.totalUnreservedGroups),
        },
        productionJobPagination: {
          total: toNum(data?.pagination?.total),
          page: toNum(data?.pagination?.page, 1),
          limit: toNum(data?.pagination?.limit, 50),
          pages: toNum(data?.pagination?.pages, 1),
          hasMore: Boolean(data?.pagination?.hasMore),
        },
        productionJobFilters: {
          ...state.productionJobFilters,
          ...merged,
          q: safeStr(merged.q),
          from: safeStr(merged.from),
          to: safeStr(merged.to),
          sort: safeStr(merged.sort) || "qty_desc",
          page: toNum(data?.pagination?.page, toNum(merged.page, 1)),
          limit: toNum(data?.pagination?.limit, toNum(merged.limit, 50)),
          all: Boolean(merged.all),
        },
      });

      return data;
    } catch (e) {
      console.error("❌ fetchProductionJobs error:", e);
      set({
        error: e.message,
        productionJobs: [],
        productionJobSummary: { ...DEFAULT_JOB_SUMMARY },
        productionJobPagination: { ...DEFAULT_JOB_PAGINATION },
      });
      toast.error(e.message);
      return {
        rows: [],
        summary: { ...DEFAULT_JOB_SUMMARY },
        pagination: { ...DEFAULT_JOB_PAGINATION },
      };
    } finally {
      set({ loadingProductionJobs: false });
    }
  },

  /* =========================================================
     EXPORT PRODUCTION JOBS EXCEL
  ========================================================= */
  downloadProductionJobsExcel: async (params = {}) => {
    try {
      set({ exportingProductionJobs: true, error: null });

      const state = get();
      const merged = { ...state.productionJobFilters, ...params };

      const query = buildQueryString({
        q: merged.q,
        from: merged.from,
        to: merged.to,
        sort: merged.sort,
      });

      const res = await fetch(
        `${API}/production/jobs/export${query ? `?${query}` : ""}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        let msg = "Failed to export production jobs excel";
        try {
          const data = await res.json();
          msg = data?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const fileName = getFileNameFromResponse(
        res,
        `production-job-list-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      downloadBlobFile(blob, fileName);
      toast.success("Production jobs excel downloaded ✅");
      return true;
    } catch (e) {
      console.error("❌ downloadProductionJobsExcel error:", e);
      set({ error: e.message });
      toast.error(e.message);
      return false;
    } finally {
      set({ exportingProductionJobs: false });
    }
  },

  /* =========================================================
     MARK ORDER PACKED
  ========================================================= */
  markOrderPacked: async (orderId) => {
    try {
      if (!orderId) throw new Error("Order id missing");

      set({ updatingPacked: true, error: null });

      const res = await fetch(`${API}/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fulfillmentStatus: "packed" }),
      });

      const data = await parseJson(res);
      const updated = data.order;

      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o._id) === String(orderId) ? updated : o
        ),
      }));

      toast.success("Order marked packed ✅");

      await Promise.allSettled([
        get().fetchProductionSummary(),
        get().fetchProductionQueue(get().filters),
        get().fetchProductionJobs(get().productionJobFilters),
      ]);

      return updated;
    } catch (e) {
      console.error("❌ markOrderPacked error:", e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ updatingPacked: false });
    }
  },

  /* =========================================================
     MARK ORDER SHIPPED
  ========================================================= */
  markOrderShipped: async (orderId) => {
    try {
      if (!orderId) throw new Error("Order id missing");

      set({ updatingShipped: true, error: null });

      const res = await fetch(`${API}/production/${orderId}/shipped`, {
        method: "POST",
        credentials: "include",
      });

      const data = await parseJson(res);
      const updated = data.order;

      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o._id) === String(orderId) ? updated : o
        ),
      }));

      toast.success("Order marked shipped ✅");

      await Promise.allSettled([
        get().fetchProductionSummary(),
        get().fetchProductionQueue(get().filters),
        get().fetchProductionJobs(get().productionJobFilters),
      ]);

      return updated;
    } catch (e) {
      console.error("❌ markOrderShipped error:", e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ updatingShipped: false });
    }
  },

  /* =========================================================
     BULK MARK PACKED AS SHIPPED
  ========================================================= */
  markAllPackedAsShipped: async (params = {}) => {
    try {
      set({ updatingBulkShipped: true, error: null });

      const state = get();
      const merged = {
        ...state.filters,
        ...params,
        fulfillmentStatus: "packed",
      };

      const query = buildQueryString({
        q: merged.q,
        from: merged.from,
        to: merged.to,
        provider: merged.provider,
        priority: merged.priority,
        orderType: merged.orderType,
        sort: merged.sort,
        all: true,
      });

      const res = await fetch(
        `${API}/production/packed/mark-all-shipped${query ? `?${query}` : ""}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await parseJson(res);
      const modifiedCount = Number(data.modifiedCount || 0);

      set((state) => {
        const shippedIdSet = new Set((data.orderIds || []).map((id) => String(id)));

        const nextQueue =
          String(state.fulfillmentStatus || "").toLowerCase() === "packed"
            ? (state.queue || []).filter((o) => !shippedIdSet.has(String(o?._id)))
            : state.queue || [];

        const nextTotal =
          String(state.fulfillmentStatus || "").toLowerCase() === "packed"
            ? Math.max(0, Number(state.total || 0) - modifiedCount)
            : state.total;

        return {
          queue: nextQueue,
          total: nextTotal,
          queuePagination: {
            ...state.queuePagination,
            total: Number(nextTotal || 0),
          },
        };
      });

      toast.success(
        modifiedCount > 0
          ? `${modifiedCount} packed order(s) marked shipped ✅`
          : "No packed orders found to mark shipped"
      );

      await Promise.allSettled([
        get().fetchProductionSummary(),
        get().fetchProductionQueue({
          ...get().filters,
          fulfillmentStatus: get().fulfillmentStatus || "processing",
        }),
        get().fetchProductionJobs(get().productionJobFilters),
      ]);

      return data;
    } catch (e) {
      console.error("❌ markAllPackedAsShipped error:", e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ updatingBulkShipped: false });
    }
  },

  /* =========================================================
     FETCH PROCESSING ORDER PRODUCTS
  ========================================================= */
  fetchProcessingOrderProducts: async (params = {}) => {
    try {
      set({ loadingProductionJobs: true, error: null });

      const state = get();
      const merged = { ...state.productionJobFilters, ...params };

      if (merged.page == null || toNum(merged.page) <= 0) merged.page = 1;
      if (merged.limit == null || toNum(merged.limit) <= 0) merged.limit = 50;

      const query = buildQueryString({
        q: merged.q,
        from: merged.from,
        to: merged.to,
        sort: merged.sort,
        page: merged.page,
        limit: merged.limit,
        all: merged.all,
      });

      const res = await fetch(`${API}/production/processing-products?${query}`, {
        credentials: "include",
      });

      const data = await parseJson(res);

      set({
        productionJobs: Array.isArray(data?.rows) ? data.rows : [],
        productionJobSummary: {
          totalSkus: toNum(data?.summary?.totalSkus),
          totalQtyToProduce: toNum(data?.summary?.totalQtyToProduce),
          totalOrdersCovered: toNum(data?.summary?.totalOrdersCovered),
          totalReservations: toNum(data?.summary?.totalReservations, 0),
          totalOrderedQty: toNum(data?.summary?.totalOrderedQty),
          totalReservedQty: toNum(data?.summary?.totalReservedQty),
          totalReservedGroups: toNum(data?.summary?.totalReservedGroups),
          totalUnreservedGroups: toNum(data?.summary?.totalUnreservedGroups),
        },
        productionJobPagination: {
          total: toNum(data?.pagination?.total),
          page: toNum(data?.pagination?.page, 1),
          limit: toNum(data?.pagination?.limit, 50),
          pages: toNum(data?.pagination?.pages, 1),
          hasMore: Boolean(data?.pagination?.hasMore),
        },
        productionJobFilters: {
          ...state.productionJobFilters,
          ...merged,
          q: safeStr(merged.q),
          from: safeStr(merged.from),
          to: safeStr(merged.to),
          sort: safeStr(merged.sort) || "qty_desc",
          page: toNum(data?.pagination?.page, toNum(merged.page, 1)),
          limit: toNum(data?.pagination?.limit, toNum(merged.limit, 50)),
          all: Boolean(merged.all),
        },
      });

      return data;
    } catch (e) {
      console.error("❌ fetchProcessingOrderProducts error:", e);
      set({
        error: e.message,
        productionJobs: [],
        productionJobSummary: { ...DEFAULT_JOB_SUMMARY },
        productionJobPagination: { ...DEFAULT_JOB_PAGINATION },
      });
      toast.error(e.message);
      return {
        rows: [],
        summary: { ...DEFAULT_JOB_SUMMARY },
        pagination: { ...DEFAULT_JOB_PAGINATION },
      };
    } finally {
      set({ loadingProductionJobs: false });
    }
  },

  /* =========================================================
     REFRESH HELPERS
  ========================================================= */
  refreshProductionJobs: async () => {
    return get().fetchProductionJobs(get().productionJobFilters);
  },

  refreshQueue: async (params = {}) => {
    return get().fetchProductionQueue({ ...get().filters, ...params });
  },

  refreshAll: async () => {
    const state = get();
    await Promise.allSettled([
      state.fetchProductionSummary(),
      state.fetchProductionQueue(state.filters),
      state.fetchProductionJobs(state.productionJobFilters),
    ]);
  },
}));

export default useAdminProductionStore;