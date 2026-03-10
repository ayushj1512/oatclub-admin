import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const apiBase = BASE_URL ? BASE_URL.replace(/\/+$/, "") : "";
const API = `${apiBase}/api/orders`;

/* ---------------- helpers ---------------- */
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

const buildQueryString = (params = {}) => {
  const qs = new URLSearchParams();

  // ✅ multi filters supported by backend
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
  const to = safeStr(params.to); // YYYY-MM-DD
  if (q) qs.set("q", q);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  // ✅ all mode
  const all = params.all;
  if (all != null) qs.set("all", toBool(all) ? "true" : "false");

  // sort
  const sort = safeStr(params.sort); // e.g. "createdAt:desc"
  if (sort) qs.set("sort", sort);

  return qs.toString();
};

export const useAdminProductionStore = create((set, get) => ({
  /* ============================================================
    STATE
  ============================================================ */
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

  fulfillmentStatus: "processing",

  // ✅ filters
  filters: {
    fulfillmentStatus: "processing",
    priority: "",
    orderType: "",
    provider: "",
    q: "",
    from: "",
    to: "",
    sort: "createdAt:desc",
    all: true,
  },

  // meta
  total: 0,
  loadingQueue: false,
  loadingSummary: false,
  updatingPacked: false,
  updatingShipped: false,
  updatingBulkShipped: false,
  error: null,

  /* ============================================================
    HELPERS
  ============================================================ */
  setFulfillmentStatus: (status) =>
    set((state) => ({
      fulfillmentStatus: status,
      filters: { ...state.filters, fulfillmentStatus: status },
    })),

  setFilters: (partial = {}) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  clearError: () => set({ error: null }),

  /* ============================================================
    ✅ FETCH PRODUCTION QUEUE
    GET /api/orders/production/queue?....&all=true
  ============================================================ */
  fetchProductionQueue: async (params = {}) => {
    try {
      set({ loadingQueue: true, error: null });

      const state = get();
      const merged = { ...state.filters, ...params };

      const status =
        merged.fulfillmentStatus || state.fulfillmentStatus || "processing";
      merged.fulfillmentStatus = status;

      if (merged.all == null) merged.all = true;

      const query = buildQueryString(merged);

      const res = await fetch(`${API}/production/queue?${query}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch production queue");
      }

      set((s) => ({
        queue: data.orders || [],
        fulfillmentStatus: status,
        filters: { ...s.filters, ...merged, fulfillmentStatus: status },
        total: Number(data.total || (data.orders || []).length || 0),
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
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch production summary");
      }

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

      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o._id) === String(orderId) ? updated : o
        ),
      }));

      toast.success("Order marked packed ✅");
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

      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o._id) === String(orderId) ? updated : o
        ),
      }));

      toast.success("Order marked shipped ✅");
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
    ✅ BULK MARK ALL PACKED AS SHIPPED
    PATCH /api/orders/production/packed/mark-all-shipped
    Uses current filters by default
  ============================================================ */
  markAllPackedAsShipped: async (params = {}) => {
    try {
      set({ updatingBulkShipped: true, error: null });

      const state = get();

      // ✅ always bulk only for packed orders
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to mark all packed orders as shipped");
      }

      const modifiedCount = Number(data.modifiedCount || 0);

      // ✅ remove/update packed queue instantly on frontend
      set((state) => {
        const shippedIdSet = new Set((data.orderIds || []).map((id) => String(id)));

        const nextQueue =
          String(state.fulfillmentStatus || "").toLowerCase() === "packed"
            ? (state.queue || []).filter((o) => !shippedIdSet.has(String(o?._id)))
            : state.queue || [];

        return {
          queue: nextQueue,
          total:
            String(state.fulfillmentStatus || "").toLowerCase() === "packed"
              ? Math.max(0, Number(state.total || 0) - modifiedCount)
              : state.total,
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