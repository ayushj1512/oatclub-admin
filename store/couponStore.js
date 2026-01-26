import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;

// --- helpers (match backend normalization) ---
const normEmail = (v) => (v ? String(v).trim().toLowerCase() : null);
const normPhone = (v) => {
  if (!v) return null;
  const digits = String(v).replace(/\D/g, "");
  return digits.length ? digits : null;
};

export const useCouponStore = create((set, get) => ({
  coupons: [],
  loading: false,
  error: null,
  success: null,

  // ✅ Fetch all coupons (Admin)
  // Supports filters: type, isActive, influencerId, visibility
  fetchCoupons: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      // remove empty/undefined filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
      );

      const query = new URLSearchParams(cleanFilters).toString();
      const res = await fetch(`${API}/api/coupons${query ? `?${query}` : ""}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch coupons");

      set({ coupons: data.data || [], loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ✅ Create coupon (Admin)
  // Now supports: visibility ("public" | "private"), targetEmail, targetPhone
  createCoupon: async (payload) => {
    try {
      set({ loading: true, error: null, success: null });

      const cleanPayload = {
        ...payload,
        // normalize optional targeting fields
        targetEmail: payload?.targetEmail ? normEmail(payload.targetEmail) : null,
        targetPhone: payload?.targetPhone ? normPhone(payload.targetPhone) : null,
        // default visibility if not provided
        visibility: payload?.visibility || "public",
      };

      const res = await fetch(`${API}/api/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cleanPayload),
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

  // ✅ Update coupon (Admin)
  // Supports updating: visibility, targetEmail, targetPhone
  updateCoupon: async (id, payload) => {
    try {
      set({ loading: true, error: null, success: null });

      const cleanPayload = { ...payload };

      if ("targetEmail" in cleanPayload) {
        cleanPayload.targetEmail = cleanPayload.targetEmail ? normEmail(cleanPayload.targetEmail) : null;
      }
      if ("targetPhone" in cleanPayload) {
        cleanPayload.targetPhone = cleanPayload.targetPhone ? normPhone(cleanPayload.targetPhone) : null;
      }

      const res = await fetch(`${API}/api/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cleanPayload),
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

  // ✅ Delete coupon (Admin)
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
