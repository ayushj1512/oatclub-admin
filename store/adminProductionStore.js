import { create } from "zustand";
import axios from "axios";

/**
 * ✅ Admin Production Store
 * - Fetch production queue (confirmed + processing by default)
 * - Fetch production summary
 * - Mark order shipped (production completed)
 *
 * Routes expected:
 * GET    {BACKEND}/orders/production/queue?fulfillmentStatus=processing
 * GET    {BACKEND}/orders/production/summary
 * POST   {BACKEND}/orders/production/:id/shipped
 */

// ✅ Backend Base URL from env
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// ✅ Orders API base
const API_BASE = `${BACKEND_URL}/api/orders`;

export const useAdminProductionStore = create((set, get) => ({
  // -----------------------------
  // STATE
  // -----------------------------
  queue: [],
  summary: {
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },

  loadingQueue: false,
  loadingSummary: false,
  updatingShipped: false,

  error: null,

  // default filter
  fulfillmentStatus: "processing",

  // -----------------------------
  // ACTIONS
  // -----------------------------

  setFulfillmentStatus: (status) => set({ fulfillmentStatus: status }),

  clearError: () => set({ error: null }),

  /**
   * ✅ Fetch Production Queue
   * default: confirmed + processing orders
   */
  fetchProductionQueue: async (opts = {}) => {
    const status = opts.fulfillmentStatus || get().fulfillmentStatus;

    set({ loadingQueue: true, error: null });

    try {
      const res = await axios.get(`${API_BASE}/production/queue`, {
        params: { fulfillmentStatus: status },
        withCredentials: true, // ✅ keep if cookies/session auth
      });

      set({
        queue: res.data?.orders || [],
        fulfillmentStatus: status,
        loadingQueue: false,
      });

      return res.data;
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Queue fetch failed";

      set({
        loadingQueue: false,
        error: message,
      });

      throw err;
    }
  },

  /**
   * ✅ Fetch Production Summary
   * counts of statuses for confirmed orders
   */
  fetchProductionSummary: async () => {
    set({ loadingSummary: true, error: null });

    try {
      const res = await axios.get(`${API_BASE}/production/summary`, {
        withCredentials: true,
      });

      set({
        summary: res.data?.summary || get().summary,
        loadingSummary: false,
      });

      return res.data;
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Summary fetch failed";

      set({
        loadingSummary: false,
        error: message,
      });

      throw err;
    }
  },

  /**
   * ✅ Mark Order Shipped from Production
   * - Moves fulfillmentStatus to shipped
   * - Does NOT book shiprocket (as per your flow)
   */
  markOrderShipped: async (orderId) => {
    if (!orderId) throw new Error("orderId missing");

    set({ updatingShipped: true, error: null });

    try {
      const res = await axios.post(
        `${API_BASE}/production/${orderId}/shipped`,
        {},
        { withCredentials: true }
      );

      const updatedOrder = res.data?.order;

      // ✅ Update queue locally if exists
      set((state) => ({
        queue: (state.queue || []).map((o) =>
          String(o?._id) === String(orderId) ? updatedOrder : o
        ),
        updatingShipped: false,
      }));

      // ✅ Refresh summary silently (optional)
      try {
        await get().fetchProductionSummary();
      } catch (e) {
        // ignore summary refresh errors
      }

      return res.data;
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Mark shipped failed";

      set({
        updatingShipped: false,
        error: message,
      });

      throw err;
    }
  },

  /**
   * ✅ Refresh Queue + Summary Together
   */
  refreshAll: async () => {
    await Promise.allSettled([
      get().fetchProductionSummary(),
      get().fetchProductionQueue(),
    ]);
  },
}));

export default useAdminProductionStore;
