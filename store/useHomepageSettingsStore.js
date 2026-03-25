"use client";

import { create } from "zustand";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_BASE = `${BASE_URL}/api/homepage-settings`;

/* ---------------------------
   Normalize Category Row
---------------------------- */
const normalizeCategoryRow = (row = []) =>
  [...row]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item, index) => {
      const navigationType = item?.navigationType || "category";

      return {
        ...item,
        navigationType,

        // ✅ clean fields based on type
        slug:
          navigationType === "category" || navigationType === "collection"
            ? item?.slug || ""
            : "",

        customRoute:
          navigationType === "custom" ? item?.customRoute || "" : "",

        sortOrder: index + 1,
      };
    });

export const useHomepageSettingsStore = create((set) => ({
  settings: null,

  heroBanners: [],
  categoryRow: [],

  loading: false,
  saving: false,
  error: null,
  success: null,

  /* ---------------------------
     Fetch
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
        throw new Error(err?.message || "Failed to fetch");
      }

      const data = await res.json();

      set({
        settings: data,
        heroBanners: data.heroBanners || [],
        categoryRow: normalizeCategoryRow(data.categoryRow || []),
        loading: false,
      });

      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      return null;
    }
  },

  /* ---------------------------
     Update All
  ---------------------------- */
  updateHomepageSettings: async (payload) => {
    try {
      set({ saving: true, error: null, success: null });

      const finalPayload = {
        ...payload,
        categoryRow: payload.categoryRow
          ? normalizeCategoryRow(payload.categoryRow)
          : payload.categoryRow,
      };

      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update");
      }

      const updated = await res.json();

      set({
        settings: updated,
        heroBanners: updated.heroBanners || [],
        categoryRow: normalizeCategoryRow(updated.categoryRow || []),
        saving: false,
        success: "Updated ✅",
      });

      return updated;
    } catch (err) {
      set({ saving: false, error: err.message });
      return null;
    }
  },

  /* ---------------------------
     Hero Only
  ---------------------------- */
  updateHeroBanners: async (heroBanners) => {
    try {
      set({ saving: true, error: null, success: null });

      const res = await fetch(`${API_BASE}/hero-banners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroBanners }),
      });

      if (!res.ok) throw new Error("Failed to update hero banners");

      const updated = await res.json();

      set({
        settings: updated,
        heroBanners: updated.heroBanners || heroBanners,
        saving: false,
        success: "Hero updated ✅",
      });

      return updated;
    } catch (err) {
      set({ saving: false, error: err.message });
      return null;
    }
  },

  /* ---------------------------
     Category Only
  ---------------------------- */
  updateCategoryRow: async (categoryRow) => {
    try {
      set({ saving: true, error: null, success: null });

      const normalized = normalizeCategoryRow(categoryRow);

      const res = await fetch(`${API_BASE}/category-row`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryRow: normalized }),
      });

      if (!res.ok) throw new Error("Failed to update category row");

      const updated = await res.json();

      set({
        settings: updated,
        categoryRow: normalizeCategoryRow(updated.categoryRow || normalized),
        saving: false,
        success: "Category updated ✅",
      });

      return updated;
    } catch (err) {
      set({ saving: false, error: err.message });
      return null;
    }
  },

  /* ---------------------------
     Local
  ---------------------------- */
  setHeroBannersLocal: (heroBanners) => set({ heroBanners }),

  setCategoryRowLocal: (categoryRow) =>
    set({ categoryRow: normalizeCategoryRow(categoryRow) }),

  clearMessages: () => set({ error: null, success: null }),
}));