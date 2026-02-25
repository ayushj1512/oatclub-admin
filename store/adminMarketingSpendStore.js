"use client";

import { create } from "zustand";

const API = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
).trim().replace(/\/+$/, "");

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.append(key, value);
  });

  return query.toString() ? `?${query.toString()}` : "";
};

export const useAdminMarketingSpendStore = create((set, get) => ({
  spends: [],
  summary: null,
  loading: false,
  error: null,

  /* ----------------------------------------
     FETCH SPENDS (with optional filters)
     ---------------------------------------- */
  fetchSpends: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      const qs = buildQueryString(filters);

      const res = await fetch(`${API}/api/marketing/spend${qs}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch spends");
      }

      set({
        spends: data?.data || [],
        loading: false,
      });

      return data;
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error fetching spends",
      });
    }
  },

  /* ----------------------------------------
     CREATE SPEND
     ---------------------------------------- */
  createSpend: async (payload) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/api/marketing/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create spend");
      }

      // prepend new spend
      set((state) => ({
        spends: [data?.data, ...state.spends],
        loading: false,
      }));

      return { success: true, data: data?.data };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error creating spend",
      });

      return { success: false };
    }
  },

  /* ----------------------------------------
     DELETE SPEND
     ---------------------------------------- */
  deleteSpend: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/api/marketing/spend/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete spend");
      }

      set((state) => ({
        spends: state.spends.filter((s) => s._id !== id),
        loading: false,
      }));

      return { success: true };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error deleting spend",
      });

      return { success: false };
    }
  },

  /* ----------------------------------------
     FETCH MONTHLY SUMMARY
     ---------------------------------------- */
  fetchSummary: async (month) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(
        `${API}/api/marketing/spend/summary?month=${month}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch summary");
      }

      set({
        summary: data,
        loading: false,
      });

      return data;
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error fetching summary",
      });
    }
  },

  /* ----------------------------------------
     RESET STORE (optional)
     ---------------------------------------- */
  reset: () => {
    set({
      spends: [],
      summary: null,
      loading: false,
      error: null,
    });
  },
}));