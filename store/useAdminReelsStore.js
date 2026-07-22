"use client";

import { create } from "zustand";
import axios from "axios";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/reels`;

const getErrorMessage = (err, fallback) =>
  err.response?.data?.message || err.message || fallback;

const normalizePriorities = (reels = []) =>
  reels.map((reel, index) => ({
    ...reel,
    priority: reels.length - index,
  }));

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

  clearMessages: () =>
    set({
      error: null,
      success: null,
    }),

  setReelsLocal: (reels = []) =>
    set({
      reels: normalizePriorities(reels),
    }),

  moveReelLocal: (fromIndex, toIndex) => {
    const reels = [...(get().reels || [])];

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= reels.length ||
      toIndex >= reels.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const [movedReel] = reels.splice(fromIndex, 1);
    reels.splice(toIndex, 0, movedReel);

    set({
      reels: normalizePriorities(reels),
      error: null,
      success: null,
    });
  },

  /* =========================================================
     FETCH LIST
     GET /api/reels
  ========================================================= */

  fetchReels: async (params = {}) => {
    try {
      set({
        loading: true,
        error: null,
      });

      const res = await axios.get(API_URL, {
        params,
      });

      set({
        reels: res.data?.reels || [],
        page: res.data?.page || 1,
        limit: res.data?.limit || 20,
        total: res.data?.total || 0,
        hasMore: Boolean(res.data?.hasMore),
        loading: false,
      });

      return res.data;
    } catch (err) {
      set({
        loading: false,
        error: getErrorMessage(err, "Failed to fetch reels"),
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
      set({
        loading: true,
        error: null,
      });

      const res = await axios.get(
        `${API_URL}/${encodeURIComponent(idOrSlug)}`
      );

      const reel = res.data?.reel || null;

      set({
        reel,
        loading: false,
      });

      return reel;
    } catch (err) {
      set({
        loading: false,
        error: getErrorMessage(err, "Failed to fetch reel"),
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
      set({
        saving: true,
        error: null,
        success: null,
      });

      const res = await axios.post(API_URL, payload);
      const created = res.data?.reel;

      if (!created) {
        throw new Error("Invalid reel response");
      }

      const current = get().reels || [];

      set({
        reels: [created, ...current],
        reel: created,
        total: get().total + 1,
        saving: false,
        success: "Reel created ✅",
      });

      return created;
    } catch (err) {
      set({
        saving: false,
        error: getErrorMessage(err, "Failed to create reel"),
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
      set({
        saving: true,
        error: null,
        success: null,
      });

      const res = await axios.patch(
        `${API_URL}/${encodeURIComponent(id)}`,
        payload
      );

      const updated = res.data?.reel;

      if (!updated) {
        throw new Error("Invalid reel response");
      }

      set({
        reels: (get().reels || []).map((reel) =>
          reel._id === id ? updated : reel
        ),
        reel: updated,
        saving: false,
        success: "Reel updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: getErrorMessage(err, "Failed to update reel"),
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
      set({
        saving: true,
        error: null,
        success: null,
      });

      const res = await axios.patch(
        `${API_URL}/${encodeURIComponent(id)}/toggle`,
        typeof isActive === "boolean" ? { isActive } : {}
      );

      const updated = res.data?.reel;

      if (!updated) {
        throw new Error("Invalid reel response");
      }

      set({
        reels: (get().reels || []).map((reel) =>
          reel._id === id ? updated : reel
        ),
        reel:
          get().reel?._id === id
            ? updated
            : get().reel,
        saving: false,
        success: "Status updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: getErrorMessage(err, "Failed to toggle reel"),
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
      set({
        deleting: true,
        error: null,
        success: null,
      });

      await axios.delete(
        `${API_URL}/${encodeURIComponent(id)}`
      );

      set({
        reels: (get().reels || []).filter(
          (reel) => reel._id !== id
        ),
        reel:
          get().reel?._id === id
            ? null
            : get().reel,
        total: Math.max(0, get().total - 1),
        deleting: false,
        success: "Reel deleted ✅",
      });

      return true;
    } catch (err) {
      set({
        deleting: false,
        error: getErrorMessage(err, "Failed to delete reel"),
      });

      return false;
    }
  },

  /* =========================================================
     TRACK ANALYTICS EVENT
     POST /api/reels/:id/events
  ========================================================= */

  trackReelEvent: async (
    id,
    type,
    unique = false
  ) => {
    try {
      const res = await axios.post(
        `${API_URL}/${encodeURIComponent(id)}/events`,
        {
          type,
          unique,
        }
      );

      const updated = res.data?.reel;

      if (updated?._id) {
        set({
          reels: (get().reels || []).map((reel) =>
            reel._id === updated._id
              ? updated
              : reel
          ),
          reel:
            get().reel?._id === updated._id
              ? updated
              : get().reel,
        });
      }

      return updated || null;
    } catch (err) {
      console.error(
        "trackReelEvent error:",
        err.response?.data || err.message
      );

      return null;
    }
  },

  /* =========================================================
     REORDER REELS
     PATCH /api/reels/reorder
  ========================================================= */

  reorderReels: async (orderedReels) => {
    const previousReels = get().reels || [];
    const normalized = normalizePriorities(
      orderedReels || previousReels
    );

    try {
      set({
        reels: normalized,
        saving: true,
        error: null,
        success: null,
      });

      const res = await axios.patch(
        `${API_URL}/reorder`,
        {
          reels: normalized.map((reel) => ({
            _id: reel._id,
            priority: reel.priority,
          })),
        }
      );

      const savedReels =
        res.data?.reels?.length
          ? res.data.reels
          : normalized;

      set({
        reels: savedReels,
        saving: false,
        success: "Order saved ✅",
      });

      return savedReels;
    } catch (err) {
      set({
        reels: previousReels,
        saving: false,
        error: getErrorMessage(
          err,
          "Failed to save reel order"
        ),
      });

      return null;
    }
  },

  /* =========================================================
     SAVE CURRENT LOCAL ORDER
  ========================================================= */

  saveOrder: async () => {
    return get().reorderReels(get().reels || []);
  },
}));