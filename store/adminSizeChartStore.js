// src/store/adminSizeChartStore.js
"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export const useAdminSizeChartStore = create((set, get) => ({
  /* =====================================================
     STATE
  ===================================================== */
  sizeCharts: [],
  activeSizeChart: null,

  loading: false,
  saving: false,
  error: null,

  /* =====================================================
     HELPERS
  ===================================================== */
  setError: (err) =>
    set({
      error:
        typeof err === "string"
          ? err
          : err?.message || "Something went wrong",
    }),

  clearError: () => set({ error: null }),

  /* =====================================================
     FETCH ALL
     (returns charts with populated categories)
  ===================================================== */
  fetchSizeCharts: async () => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/api/size-charts`);
      if (!res.ok) throw new Error("Failed to fetch size charts");

      const data = await res.json();

      set({
        sizeCharts: Array.isArray(data) ? data : [],
      });
    } catch (err) {
      get().setError(err);
    } finally {
      set({ loading: false });
    }
  },

  /* =====================================================
     FETCH ONE
  ===================================================== */
  fetchSizeChartById: async (id) => {
    if (!id) return null;

    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/api/size-charts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch size chart");

      const data = await res.json();
      set({ activeSizeChart: data });

      return data;
    } catch (err) {
      get().setError(err);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  /* =====================================================
     CREATE
     payload supports:
     { title, unit, headers, rows, note, categories[] }
  ===================================================== */
  createSizeChart: async (payload) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/api/size-charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create size chart");
      }

      const data = await res.json();

      set((state) => ({
        sizeCharts: [data, ...state.sizeCharts],
      }));

      return data;
    } catch (err) {
      get().setError(err);
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  /* =====================================================
     UPDATE
     payload supports updating categories too
  ===================================================== */
  updateSizeChart: async (id, payload) => {
    if (!id) throw new Error("Size chart ID is required");

    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/api/size-charts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update size chart");
      }

      const data = await res.json();

      set((state) => ({
        sizeCharts: state.sizeCharts.map((c) =>
          c._id === id ? data : c
        ),
        activeSizeChart:
          state.activeSizeChart?._id === id
            ? data
            : state.activeSizeChart,
      }));

      return data;
    } catch (err) {
      get().setError(err);
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  /* =====================================================
     DELETE
  ===================================================== */
  deleteSizeChart: async (id) => {
    if (!id) throw new Error("Size chart ID is required");

    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/api/size-charts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete size chart");
      }

      set((state) => ({
        sizeCharts: state.sizeCharts.filter((c) => c._id !== id),
        activeSizeChart:
          state.activeSizeChart?._id === id
            ? null
            : state.activeSizeChart,
      }));
    } catch (err) {
      get().setError(err);
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  /* =====================================================
     RESET
  ===================================================== */
  clearActiveSizeChart: () => set({ activeSizeChart: null }),
}));
