import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/orders`; // ✅ IMPORTANT FIX (api prefix)

export const useAdminProductionStore = create((set, get) => ({
  /* ============================================================
    STATE
  ============================================================ */
  queue: [],
  summary: {
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },

  fulfillmentStatus: "processing",

  loadingQueue: false,
  loadingSummary: false,
  updatingShipped: false,
  error: null,

  /* ============================================================
    HELPERS
  ============================================================ */
  setFulfillmentStatus: (status) => set({ fulfillmentStatus: status }),
  clearError: () => set({ error: null }),

  /* ============================================================
    ✅ FETCH PRODUCTION QUEUE
    GET /api/orders/production/queue?fulfillmentStatus=processing
  ============================================================ */
  fetchProductionQueue: async (params = {}) => {
    try {
      set({ loadingQueue: true, error: null });

      const status = params.fulfillmentStatus || get().fulfillmentStatus;
      const query = new URLSearchParams({ fulfillmentStatus: status }).toString();

      const res = await fetch(`${API}/production/queue?${query}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch production queue");

      set({
        queue: data.orders || [],
        fulfillmentStatus: status,
      });

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
      if (!res.ok) throw new Error(data.message || "Failed to fetch production summary");

      set({
        summary: data.summary || get().summary,
      });

      return data.summary;
    } catch (e) {
      console.error("❌ fetchProductionSummary error:", e);
      set({ error: e.message });
      toast.error(e.message);
      return null;
    } finally {
      set({ loadingSummary: false });
    }
  },


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
      try {
        await get().fetchProductionSummary();
      } catch (e) {}

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
    await Promise.allSettled([
      get().fetchProductionSummary(),
      get().fetchProductionQueue({ fulfillmentStatus: get().fulfillmentStatus }),
    ]);
  },
}));

export default useAdminProductionStore;
