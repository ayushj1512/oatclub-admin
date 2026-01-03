"use client";

import { create } from "zustand";
import axios from "axios";

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
      await axios.delete(`${API_URL}/${id}`);
      
      const filteredList = get().categories.filter((cat) => cat._id !== id);
      set({
        categories: filteredList,
        categoryTree: buildCategoryTree(filteredList),
        successMessage: "Category deleted!",
        loading: false,
      });
    } catch (err) {
      const msg = err.response?.data?.message || "Delete failed";
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