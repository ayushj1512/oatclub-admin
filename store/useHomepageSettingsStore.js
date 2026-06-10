"use client";

import { create } from "zustand";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_BASE = `${BASE_URL}/api/homepage-settings`;

/* ---------------------------
   Helpers
---------------------------- */
const safeText = (value = "") => String(value || "").trim();

const sortByOrder = (items = []) =>
  [...items].sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0));

/* ---------------------------
   Normalize Hero Banners
---------------------------- */
const normalizeHeroBanners = (banners = []) =>
  sortByOrder(banners).map((item, index) => ({
    desktopImage: safeText(item?.desktopImage),
    mobileImage: safeText(item?.mobileImage),
    link: safeText(item?.link),
    title: safeText(item?.title),
    isActive: item?.isActive !== false,
    sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : index,
  }));

/* ---------------------------
   Normalize Category Row
---------------------------- */
const normalizeCategoryRow = (row = []) =>
  sortByOrder(row).map((item, index) => {
    const navigationType = item?.navigationType || "category";

    return {
      name: safeText(item?.name),
      navigationType,

      slug:
        navigationType === "category" || navigationType === "collection"
          ? safeText(item?.slug)
          : "",

      customRoute:
        navigationType === "custom" ? safeText(item?.customRoute) : "",

      tag: safeText(item?.tag),
      image: safeText(item?.image),
      video: safeText(item?.video),
      isActive: item?.isActive !== false,
      sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : index,
    };
  });

/* ---------------------------
   Normalize Category Banners
   single image only
---------------------------- */
const normalizeCategoryBanners = (banners = []) =>
  sortByOrder(banners).map((item, index) => {
    const categorySlug = safeText(item?.categorySlug);

    return {
      categoryName: safeText(item?.categoryName),
      categorySlug,
      title: safeText(item?.title) || safeText(item?.categoryName),
      subtitle: safeText(item?.subtitle),
      image: safeText(item?.image),
      link: safeText(item?.link) || (categorySlug ? `/category/${categorySlug}` : ""),
      isActive: item?.isActive !== false,
      sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : index,
    };
  });

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
};

export const useHomepageSettingsStore = create((set, get) => ({
  settings: null,

  heroBanners: [],
  categoryRow: [],
  categoryBanners: [],

  loading: false,
  saving: false,
  error: null,
  success: null,

  /* ---------------------------
     Messages
  ---------------------------- */
  clearMessages: () => set({ error: null, success: null }),

  /* ---------------------------
     Fetch Full Settings
  ---------------------------- */
  fetchHomepageSettings: async () => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(API_BASE, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await parseResponse(res);

      set({
        settings: data,
        heroBanners: normalizeHeroBanners(data?.heroBanners || []),
        categoryRow: normalizeCategoryRow(data?.categoryRow || []),
        categoryBanners: normalizeCategoryBanners(data?.categoryBanners || []),
        loading: false,
      });

      return data;
    } catch (err) {
      set({
        loading: false,
        error: err?.message || "Failed to fetch homepage settings",
      });
      return null;
    }
  },

  /* ---------------------------
     Fetch Category Banners Only
  ---------------------------- */
  fetchCategoryBanners: async () => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API_BASE}/category-banners`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await parseResponse(res);
      const banners = normalizeCategoryBanners(data?.categoryBanners || []);

      set({
        categoryBanners: banners,
        loading: false,
      });

      return banners;
    } catch (err) {
      set({
        loading: false,
        error: err?.message || "Failed to fetch category banners",
      });
      return [];
    }
  },

  /* ---------------------------
     Update Full Settings
  ---------------------------- */
  updateHomepageSettings: async (payload = {}) => {
    try {
      set({ saving: true, error: null, success: null });

      const finalPayload = {
        ...payload,
      };

      if (Array.isArray(payload.heroBanners)) {
        finalPayload.heroBanners = normalizeHeroBanners(payload.heroBanners);
      }

      if (Array.isArray(payload.categoryRow)) {
        finalPayload.categoryRow = normalizeCategoryRow(payload.categoryRow);
      }

      if (Array.isArray(payload.categoryBanners)) {
        finalPayload.categoryBanners = normalizeCategoryBanners(
          payload.categoryBanners
        );
      }

      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      const updated = await parseResponse(res);

      set({
        settings: updated,
        heroBanners: normalizeHeroBanners(updated?.heroBanners || []),
        categoryRow: normalizeCategoryRow(updated?.categoryRow || []),
        categoryBanners: normalizeCategoryBanners(updated?.categoryBanners || []),
        saving: false,
        success: "Homepage updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: err?.message || "Failed to update homepage settings",
      });
      return null;
    }
  },

  /* ---------------------------
     Update Hero Banners Only
  ---------------------------- */
  updateHeroBanners: async (heroBanners = []) => {
    try {
      set({ saving: true, error: null, success: null });

      const normalized = normalizeHeroBanners(heroBanners);

      const res = await fetch(`${API_BASE}/hero-banners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroBanners: normalized }),
      });

      const updated = await parseResponse(res);

      set({
        settings: updated,
        heroBanners: normalizeHeroBanners(updated?.heroBanners || normalized),
        saving: false,
        success: "Hero banners updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: err?.message || "Failed to update hero banners",
      });
      return null;
    }
  },

  /* ---------------------------
     Update Category Row Only
  ---------------------------- */
  updateCategoryRow: async (categoryRow = []) => {
    try {
      set({ saving: true, error: null, success: null });

      const normalized = normalizeCategoryRow(categoryRow);

      const res = await fetch(`${API_BASE}/category-row`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryRow: normalized }),
      });

      const updated = await parseResponse(res);

      set({
        settings: updated,
        categoryRow: normalizeCategoryRow(updated?.categoryRow || normalized),
        saving: false,
        success: "Category row updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: err?.message || "Failed to update category row",
      });
      return null;
    }
  },

  /* ---------------------------
     Update Category Banners Only
  ---------------------------- */
  updateCategoryBanners: async (categoryBanners = []) => {
    try {
      set({ saving: true, error: null, success: null });

      const normalized = normalizeCategoryBanners(categoryBanners);

      const res = await fetch(`${API_BASE}/category-banners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryBanners: normalized }),
      });

      const updated = await parseResponse(res);

      set({
        settings: updated,
        categoryBanners: normalizeCategoryBanners(
          updated?.categoryBanners || normalized
        ),
        saving: false,
        success: "Category banners updated ✅",
      });

      return updated;
    } catch (err) {
      set({
        saving: false,
        error: err?.message || "Failed to update category banners",
      });
      return null;
    }
  },

  /* ---------------------------
     Local Setters
  ---------------------------- */
  setHeroBannersLocal: (heroBanners = []) =>
    set({ heroBanners: normalizeHeroBanners(heroBanners) }),

  setCategoryRowLocal: (categoryRow = []) =>
    set({ categoryRow: normalizeCategoryRow(categoryRow) }),

  setCategoryBannersLocal: (categoryBanners = []) =>
    set({ categoryBanners: normalizeCategoryBanners(categoryBanners) }),
}));