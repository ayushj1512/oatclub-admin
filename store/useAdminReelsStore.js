"use client";

import { create } from "zustand";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL + "/api/reels";

export const useAdminReelsStore = create((set, get) => ({
  /* ---------------------------
     STATE
  ---------------------------- */
  reels: [],
  reel: null,

  page: 1,
  limit: 20,
  total: 0,
  hasMore: false,

  loading: false,
  saving: false,
  deleting: false,
  error: null,
  success: null,

  /* ---------------------------
     HELPERS
  ---------------------------- */
  clearMessages: () => set({ error: null, success: null }),

  setReelsLocal: (reels) => set({ reels }),

  /* =========================================================
     FETCH LIST (filters supported)
     GET /api/reels?q=&placement=&activeNow=&isActive=&page=&limit=&sort=
  ========================================================= */
  fetchReels: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(API_URL, { params });

      set({
        reels: res.data?.reels || [],
        page: res.data?.page || 1,
        limit: res.data?.limit || 20,
        total: res.data?.total || 0,
        hasMore: res.data?.hasMore || false,
        loading: false,
      });

      return res.data;
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to fetch reels",
      });
      return null;
    }
  },

  /* =========================================================
     FETCH ONE
     GET /api/reels/:idOrSlug
  ========================================================= */
  fetchReel: async (idOrSlug) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(`${API_URL}/${idOrSlug}`);

      set({
        reel: res.data?.reel || null,
        loading: false,
      });

      return res.data?.reel;
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to fetch reel",
      });
      return null;
    }
  },

  /* =========================================================
     CREATE
     POST /api/reels
  ========================================================= */
  createReel: async (payload) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await axios.post(API_URL, payload);

      // Add to top locally (admin experience)
      const current = get().reels || [];
      set({
        reels: [res.data?.reel, ...current],
        saving: false,
        success: "Reel created ✅",
      });

      return res.data?.reel;
    } catch (err) {
      set({
        saving: false,
        error: err.response?.data?.message || "Failed to create reel",
      });
      return null;
    }
  },

  /* =========================================================
     UPDATE
     PATCH /api/reels/:id
  ========================================================= */
  updateReel: async (id, payload) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await axios.patch(`${API_URL}/${id}`, payload);

      const updated = res.data?.reel;

      const updatedList = (get().reels || []).map((r) =>
        r._id === id ? updated : r
      );

      set({
        reels: updatedList,
        reel: updated,
        saving: false,
        success: "Reel updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: err.response?.data?.message || "Failed to update reel",
      });
      return null;
    }
  },

  /* =========================================================
     TOGGLE ACTIVE
     PATCH /api/reels/:id/toggle
  ========================================================= */
  toggleReelActive: async (id, isActive) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await axios.patch(`${API_URL}/${id}/toggle`, {
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      });

      const updated = res.data?.reel;

      const updatedList = (get().reels || []).map((r) =>
        r._id === id ? updated : r
      );

      set({
        reels: updatedList,
        reel: updated,
        saving: false,
        success: "Status updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: err.response?.data?.message || "Failed to toggle reel",
      });
      return null;
    }
  },

  /* =========================================================
     DELETE
     DELETE /api/reels/:id
  ========================================================= */
  deleteReel: async (id) => {
    try {
      set({ deleting: true, error: null, success: null });

      await axios.delete(`${API_URL}/${id}`);

      const filtered = (get().reels || []).filter((r) => r._id !== id);

      set({
        reels: filtered,
        deleting: false,
        success: "Reel deleted ✅",
      });

      return true;
    } catch (err) {
      set({
        deleting: false,
        error: err.response?.data?.message || "Failed to delete reel",
      });
      return false;
    }
  },

  /* =========================================================
     TRACK ANALYTICS EVENT
     POST /api/reels/:id/events
     type: view | tap | like | wishlist | share
  ========================================================= */
  trackReelEvent: async (id, type, unique = false) => {
    try {
      const res = await axios.post(`${API_URL}/${id}/events`, {
        type,
        unique,
      });

      // optional: update local reel analytics if present
      const updated = res.data?.reel;

      if (updated?._id) {
        const updatedList = (get().reels || []).map((r) =>
          r._id === updated._id ? updated : r
        );

        set({
          reels: updatedList,
          reel: get().reel?._id === updated._id ? updated : get().reel,
        });
      }

      return updated;
    } catch (err) {
      console.error("trackReelEvent error:", err.response?.data || err.message);
      return null;
    }
  },

  /* =========================================================
     SAVE ORDER (Drag + Drop)
     Uses priority field -> update each reel
     (Better approach: create batch endpoint later)
  ========================================================= */
  saveOrder: async () => {
    try {
      set({ saving: true, error: null, success: null });

      const reels = get().reels || [];

      // priority = reverse index (higher priority first)
      const updates = reels.map((r, index) => {
        const priority = reels.length - index;
        return axios.patch(`${API_URL}/${r._id}`, { priority });
      });

      await Promise.all(updates);

      set({ saving: false, success: "Order saved ✅" });
      return true;
    } catch (err) {
      set({
        saving: false,
        error: err.response?.data?.message || "Failed to save order",
      });
      return false;
    }
  },
}));
