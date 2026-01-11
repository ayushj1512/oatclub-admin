"use client";

import { create } from "zustand";
import axios from "axios";
import { useAdminProductStore } from "./adminProductStore";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = `${BASE_URL}/api/categories`;

/**
 * Helper to build a tree structure from a flat array
 * Useful for rendering nested categories in the Admin Panel
 */
const buildCategoryTree = (list) => {
  if (!Array.isArray(list)) return [];
  const map = {};
  const roots = [];

  list.forEach((item) => {
    map[item._id] = { ...item, children: [] };
  });

  list.forEach((item) => {
    const parentId = item.parent?._id || item.parent; // Handles populated or ID only
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[item._id]);
    } else {
      roots.push(map[item._id]);
    }
  });

  return roots;
};

export const useCategoryStore = create((set, get) => ({
  categories: [],          // Flat list
  categoryTree: [],      // Nested structure
  loading: false,
  error: null,
  successMessage: null,

  /* -----------------------------------------------------------
     1. FETCH ALL CATEGORIES
  ----------------------------------------------------------- */
  fetchCategories: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      // Params supports ?search=...&active=true...
      const res = await axios.get(API_URL, { params });
      const data = res.data;

      set({
        categories: data,
        categoryTree: buildCategoryTree(data),
        loading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch categories",
        loading: false,
      });
    }
  },

  /* -----------------------------------------------------------
     2. CREATE CATEGORY
  ----------------------------------------------------------- */
  createCategory: async (formData) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const res = await axios.post(API_URL, formData);
      
      // Update local state without full refresh
      const newList = [...get().categories, res.data.category];
      set({
        categories: newList,
        categoryTree: buildCategoryTree(newList),
        successMessage: "Category created successfully!",
        loading: false,
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Error creating category";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  /* -----------------------------------------------------------
     3. UPDATE CATEGORY
  ----------------------------------------------------------- */
  updateCategory: async (id, formData) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const res = await axios.put(`${API_URL}/${id}`, formData);
      
      const updatedList = get().categories.map((cat) =>
        cat._id === id ? res.data.category : cat
      );

      set({
        categories: updatedList,
        categoryTree: buildCategoryTree(updatedList),
        successMessage: "Category updated successfully!",
        loading: false,
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Error updating category";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  /* -----------------------------------------------------------
     4. DELETE CATEGORY
  ----------------------------------------------------------- */
  deleteCategory: async (id) => {
  set({ loading: true, error: null, successMessage: null });

  try {
    // 0) Try to read slug/name before deleting (best effort)
    const cat = get().categories.find((c) => c._id === id);
    const catSlug = String(cat?.slug || "").trim();
    const catName = String(cat?.name || "").trim();

    // 1) Fetch products by category (prefer slug, fallback to id)
    // If cat isn't in store, still attempt by id.
    const adminStore = useAdminProductStore.getState();
    const products = await adminStore.fetchProductsByCategory(catSlug || id, {
      page: 1,
      limit: 5000,
    });

    // 2) matcher for categories stored as string OR object
    const matchesThisCategory = (c) => {
      if (!c) return false;

      if (typeof c === "string") {
        const s = c.trim();
        return s === id || (catSlug && s === catSlug) || (catName && s === catName);
      }

      const s1 = String(c._id || "").trim();
      const s2 = String(c.slug || "").trim();
      const s3 = String(c.name || "").trim();

      return s1 === id || (catSlug && s2 === catSlug) || (catName && s3 === catName);
    };

    // 3) Remove category from each product
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const PRODUCTS_API = `${BASE_URL}/api/products`;

    await Promise.all(
      (products || []).map(async (p) => {
        const current = Array.isArray(p.categories) ? p.categories : [];
        const next = current.filter((c) => !matchesThisCategory(c));

        const res = await fetch(`${PRODUCTS_API}/${p._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ categories: next }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || `Failed to update product ${p._id}`);
        }
      })
    );

    // 4) Delete category
    await axios.delete(`${API_URL}/${id}`);

    // 5) Update local state
    const filteredList = get().categories.filter((c) => c._id !== id);
    set({
      categories: filteredList,
      categoryTree: buildCategoryTree(filteredList),
      successMessage: "Category deleted & removed from products ✅",
      loading: false,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Delete failed";
    set({ error: msg, loading: false });
    throw new Error(msg);
  }
},



    /* -----------------------------------------------------------
     4B. DELETE CATEGORY + REMOVE FROM ALL PRODUCTS (CASCADE)
  ----------------------------------------------------------- */
  deleteCategoryCascade: async (id) => {
    set({ loading: true, error: null, successMessage: null });

    try {
      // 1) Get category from local state (to read slug/name before deleting)
      const cat = get().categories.find((c) => c._id === id);
      if (!cat) throw new Error("Category not found in store");

      const catSlug = String(cat.slug || "").trim();
      const catName = String(cat.name || "").trim();

      // 2) Fetch products that have this category (prefer slug, fallback to id)
      const adminStore = useAdminProductStore.getState();

      const products = await adminStore.fetchProductsByCategory(catSlug || id, {
        page: 1,
        limit: 5000, // adjust as needed
      });

      // 3) Remove category from each product
      // We'll PATCH directly (so we can allow empty categories if needed)
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const PRODUCTS_API = `${BASE_URL}/api/products`;

      const matchesThisCategory = (c) => {
        if (!c) return false;

        // categories can be stored as string OR object
        if (typeof c === "string") {
          const s = c.trim();
          return s === id || s === catSlug || s === catName;
        }

        // object form
        const s1 = String(c._id || "").trim();
        const s2 = String(c.slug || "").trim();
        const s3 = String(c.name || "").trim();

        return s1 === id || (catSlug && s2 === catSlug) || (catName && s3 === catName);
      };

      await Promise.all(
        (products || []).map(async (p) => {
          const current = Array.isArray(p.categories) ? p.categories : [];

          const next = current.filter((c) => !matchesThisCategory(c));

          // PATCH product with cleaned categories
          const res = await fetch(`${PRODUCTS_API}/${p._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ categories: next }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.message || `Failed to update product ${p._id}`);
          }

          return data.product;
        })
      );

      // 4) Now delete the category
      await axios.delete(`${API_URL}/${id}`);

      // 5) Update local category state
      const filteredList = get().categories.filter((c) => c._id !== id);
      set({
        categories: filteredList,
        categoryTree: buildCategoryTree(filteredList),
        successMessage: "Category deleted & removed from products ✅",
        loading: false,
      });

      // Optional: refresh admin products grid if you want
      // await adminStore.fetchProducts({ page: adminStore.page, limit: adminStore.limit });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Cascade delete failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },


  /* -----------------------------------------------------------
     5. UTILS
  ----------------------------------------------------------- */
  clearStatus: () => set({ error: null, successMessage: null }),

  // Helper to find a category by ID from local state
  getCategoryById: (id) => {
    return get().categories.find((c) => c._id === id);
  }
}));