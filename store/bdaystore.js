"use client";

import { create } from "zustand";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const useBdayStore = create((set, get) => ({
  wishes: [],
  loading: false,
  error: "",

  fetchWishes: async () => {
    set({ loading: true, error: "" });

    try {
      const response = await fetch(`${API_URL}/api/bday`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to fetch birthday wishes"
        );
      }

      const wishes = Array.isArray(data?.wishes)
        ? data.wishes
        : [];

      set({ wishes, loading: false });
      return wishes;
    } catch (error) {
      set({
        loading: false,
        error:
          error?.message || "Unable to fetch birthday wishes",
      });

      throw error;
    }
  },

  createWish: async ({ name, message }) => {
    set({ loading: true, error: "" });

    try {
      const response = await fetch(`${API_URL}/api/bday`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to submit birthday wish"
        );
      }

      set({
        wishes: data?.wish
          ? [data.wish, ...get().wishes]
          : get().wishes,
        loading: false,
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        error:
          error?.message || "Unable to submit birthday wish",
      });

      throw error;
    }
  },

  clearError: () => set({ error: "" }),
}));

export default useBdayStore;
