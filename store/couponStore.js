import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;
// Example: VITE_API_URL = "http://localhost:5000"

export const useCouponStore = create((set, get) => ({
  coupons: [],
  loading: false,
  error: null,
  success: null,

  // ✅ Fetch all coupons
  fetchCoupons: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`${API}/api/coupons?${query}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch coupons");

      set({ coupons: data.data || [], loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ✅ Create coupon
  createCoupon: async (payload) => {
    try {
      set({ loading: true, error: null, success: null });

      const res = await fetch(`${API}/api/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create coupon");

      set((state) => ({
        coupons: [data.data, ...state.coupons],
        loading: false,
        success: "Coupon created successfully",
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ✅ Update coupon
  updateCoupon: async (id, payload) => {
    try {
      set({ loading: true, error: null, success: null });

      const res = await fetch(`${API}/api/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update coupon");

      set((state) => ({
        coupons: state.coupons.map((c) => (c._id === id ? data.data : c)),
        loading: false,
        success: "Coupon updated successfully",
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ✅ Delete coupon
  deleteCoupon: async (id) => {
    try {
      set({ loading: true, error: null, success: null });

      const res = await fetch(`${API}/api/coupons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete coupon");

      set((state) => ({
        coupons: state.coupons.filter((c) => c._id !== id),
        loading: false,
        success: "Coupon deleted successfully",
      }));

      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ✅ Utility: clear messages
  clearMessages: () => set({ error: null, success: null }),

  // ✅ Get single coupon from store
  getCouponById: (id) => get().coupons.find((c) => c._id === id),
}));
