"use client";

import { create } from "zustand";

// ✅ base URL from .env
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_BASE = `${BASE_URL}/api/homepage-settings`;

export const useHomepageSettingsStore = create((set, get) => ({
  settings: null,

  heroBanners: [],
  categoryRow: [],

  loading: false,
  saving: false,
  error: null,
  success: null,

  /* ---------------------------
     Fetch Homepage Settings
  ---------------------------- */
  fetchHomepageSettings: async () => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(API_BASE, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to fetch homepage settings");
      }

      const data = await res.json();

      set({
        settings: data,
        heroBanners: data.heroBanners || [],
        categoryRow: data.categoryRow || [],
        loading: false,
      });

      return data;
    } catch (err) {
      set({ loading: false, error: err.message || "Something went wrong" });
      return null;
    }
  },

  /* ---------------------------
     Update Entire Settings
  ---------------------------- */
  updateHomepageSettings: async (payload) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update homepage settings");
      }

      const updated = await res.json();

      set({
        settings: updated,
        heroBanners: updated.heroBanners || [],
        categoryRow: updated.categoryRow || [],
        saving: false,
        success: "Homepage settings updated ✅",
      });

      return updated;
    } catch (err) {
      set({ saving: false, error: err.message || "Something went wrong" });
      return null;
    }
  },

  /* ---------------------------
     Update Only Hero Banners
  ---------------------------- */
  updateHeroBanners: async (heroBanners) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await fetch(`${API_BASE}/hero-banners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroBanners }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update hero banners");
      }

      const updated = await res.json();

      set({
        settings: updated,
        heroBanners: updated.heroBanners || heroBanners,
        saving: false,
        success: "Hero banners updated ✅",
      });

      return updated;
    } catch (err) {
      set({ saving: false, error: err.message || "Something went wrong" });
      return null;
    }
  },

  /* ---------------------------
     Update Only Category Row
  ---------------------------- */
  updateCategoryRow: async (categoryRow) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await fetch(`${API_BASE}/category-row`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryRow }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update category row");
      }

      const updated = await res.json();

      set({
        settings: updated,
        categoryRow: updated.categoryRow || categoryRow,
        saving: false,
        success: "Category row updated ✅",
      });

      return updated;
    } catch (err) {
      set({ saving: false, error: err.message || "Something went wrong" });
      return null;
    }
  },

  /* ---------------------------
     Local-only setters (UI)
  ---------------------------- */
  setHeroBannersLocal: (heroBanners) => set({ heroBanners }),
  setCategoryRowLocal: (categoryRow) => set({ categoryRow }),

  /* ---------------------------
     Clear success/error
  ---------------------------- */
  clearMessages: () => set({ error: null, success: null }),
}));
