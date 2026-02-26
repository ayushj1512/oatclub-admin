import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const apiBase = BASE_URL ? BASE_URL.replace(/\/+$/, "") : "";
const API = `${apiBase}/api/orders`; // ✅ IMPORTANT FIX (api prefix)

/* ---------------- helpers ---------------- */

const safeStr = (v) => String(v ?? "").trim();

const toCSV = (v) => {
  // supports: "a,b" | ["a","b"] | undefined
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(safeStr).filter(Boolean).join(",");
  const s = safeStr(v);
  return s;
};

const buildQueryString = (params = {}) => {
  const qs = new URLSearchParams();

  // ✅ multi filters supported by backend:
  // fulfillmentStatus=processing,packed
  // priority=high,medium
  // orderType=shipment,parent
  // provider=shiprocket
  const fulfillmentStatus = toCSV(params.fulfillmentStatus);
  const priority = toCSV(params.priority);
  const orderType = toCSV(params.orderType);
  const provider = toCSV(params.provider);

  if (fulfillmentStatus) qs.set("fulfillmentStatus", fulfillmentStatus);
  if (priority) qs.set("priority", priority);
  if (orderType) qs.set("orderType", orderType);
  if (provider) qs.set("provider", provider);

  // search + date range
  const q = safeStr(params.q);
  const from = safeStr(params.from); // YYYY-MM-DD
  const to = safeStr(params.to);     // YYYY-MM-DD
  if (q) qs.set("q", q);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  // pagination + sort
  const page = Number(params.page || 1);
  const limit = Number(params.limit || 50);
  if (Number.isFinite(page) && page > 0) qs.set("page", String(page));
  if (Number.isFinite(limit) && limit > 0) qs.set("limit", String(limit));

  const sort = safeStr(params.sort); // e.g. "createdAt:desc"
  if (sort) qs.set("sort", sort);

  return qs.toString();
};

export const useAdminProductionStore = create((set, get) => ({
  /* ============================================================
    STATE
  ============================================================ */
  queue: [],

  // ✅ keep server summary flexible (you added more keys)
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

  // ✅ now can be string OR array in UI
  fulfillmentStatus: "processing",

  // ✅ NEW: filters
  filters: {
    fulfillmentStatus: "processing",
    priority: "",        // "high" | "medium" | "normal" | "" | ["high","medium"]
    orderType: "",       // "shipment" | "parent" | ""
    provider: "",        // "shiprocket" | "manual" | "xpressbees" | "ekart" | ""
    q: "",
    from: "",
    to: "",
    page: 1,
    limit: 50,
    sort: "createdAt:desc",
  },

  // ✅ pagination meta (from backend)
  total: 0,
  page: 1,
  limit: 50,

  loadingQueue: false,
  loadingSummary: false,

  updatingPacked: false,
  updatingShipped: false,

  error: null,

  /* ============================================================
    HELPERS
  ============================================================ */
  setFulfillmentStatus: (status) =>
    set((state) => ({
      fulfillmentStatus: status,
      filters: { ...state.filters, fulfillmentStatus: status, page: 1 },
    })),

  setFilters: (partial = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
        // reset page when filters change (unless explicitly set)
        page:
          partial.page != null
            ? partial.page
            : partial.fulfillmentStatus != null ||
              partial.priority != null ||
              partial.orderType != null ||
              partial.provider != null ||
              partial.q != null ||
              partial.from != null ||
              partial.to != null ||
              partial.sort != null ||
              partial.limit != null
            ? 1
            : state.filters.page,
      },
    })),

  clearError: () => set({ error: null }),

  /* ============================================================
    ✅ FETCH PRODUCTION QUEUE
    GET /api/orders/production/queue?fulfillmentStatus=processing,...
  ============================================================ */
  fetchProductionQueue: async (params = {}) => {
    try {
      set({ loadingQueue: true, error: null });

      const state = get();
      const merged = {
        ...state.filters,
        ...params,
      };

      // fallback: if someone calls with fulfillmentStatus only
      const status = merged.fulfillmentStatus || state.fulfillmentStatus || "processing";
      merged.fulfillmentStatus = status;

      const query = buildQueryString(merged);

      const res = await fetch(`${API}/production/queue?${query}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch production queue");

      set((s) => ({
        queue: data.orders || [],
        fulfillmentStatus: status,
        filters: { ...s.filters, ...merged, fulfillmentStatus: status },

        // ✅ pagination meta from backend
        total: Number(data.total || 0),
        page: Number(data.page || merged.page || 1),
        limit: Number(data.limit || merged.limit || 50),
      }));

      return data.orders || [];
    } catch (e) {
      console.error("❌ fetchProductionQueue error:", e);
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loadingQueue: false });
    }
  },

  /* ============================================================
    ✅ FETCH PRODUCTION SUMMARY
    GET /api/orders/production/summary
  ============================================================ */
  fetchProductionSummary: async () => {
    try {
      set({ loadingSummary: true, error: null });

      const res = await fetch(`${API}/production/summary`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch production summary");

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

  /* ============================================================
    ✅ MARK ORDER PACKED
    PATCH /api/orders/:id/status
  ============================================================ */
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to mark packed");

      const updated = data.order;

      // ✅ update queue instantly
      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o._id) === String(orderId) ? updated : o
        ),
      }));

      toast.success("Order marked packed ✅");

      // ✅ refresh summary silently
      get().fetchProductionSummary().catch(() => {});
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

  /* ============================================================
    ✅ MARK ORDER SHIPPED FROM PRODUCTION
    POST /api/orders/production/:id/shipped
  ============================================================ */
  markOrderShipped: async (orderId) => {
    try {
      if (!orderId) throw new Error("Order id missing");

      set({ updatingShipped: true, error: null });

      const res = await fetch(`${API}/production/${orderId}/shipped`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to mark shipped");

      const updated = data.order;

      // ✅ Update local queue instantly
      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o._id) === String(orderId) ? updated : o
        ),
      }));

      toast.success("Order marked shipped ✅");

      // ✅ refresh summary (silent)
      get().fetchProductionSummary().catch(() => {});
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

  /* ============================================================
    ✅ REFRESH ALL (Queue + Summary)
  ============================================================ */
  refreshAll: async () => {
    const state = get();
    await Promise.allSettled([
      state.fetchProductionSummary(),
      state.fetchProductionQueue(state.filters),
    ]);
  },
}));

export default useAdminProductionStore;