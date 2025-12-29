"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export const useAdminBlogStore = create((set, get) => ({
  /* ==============================
     STATE
  ============================== */
  blogs: [],
  blog: null,

  loading: false,
  saving: false,
  deleting: false,

  page: 1,
  pages: 1,
  total: 0,

  filters: {
    q: "",
    category: "",
    published: "",
    sort: "newest",
  },

  /* ==============================
     FETCH ALL BLOGS
  ============================== */
  fetchBlogs: async ({ page = 1, limit = 20 } = {}) => {
    try {
      set({ loading: true });

      const { filters } = get();
      const params = new URLSearchParams({
        page,
        limit,
        sort: filters.sort,
      });

      if (filters.q) params.append("q", filters.q);
      if (filters.category) params.append("category", filters.category);
      if (filters.published !== "")
        params.append("published", filters.published);

      const res = await fetch(`${API}/api/blogs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch blogs");

      set({
        blogs: data.items || [],
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0,
      });
    } catch (err) {
      toast.error(err.message || "Failed to load blogs");
    } finally {
      set({ loading: false });
    }
  },

  /* ==============================
     FETCH SINGLE BLOG
  ============================== */
  fetchBlogById: async (id) => {
    try {
      set({ loading: true, error: null });

const res = await fetch(`${API}/api/blogs/${id}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch blog");

      set({ blog: data });
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
    } finally {
      set({ loading: false });
    }
  },

  /* ==============================
     CREATE BLOG
  ============================== */
  createBlog: async (payload) => {
    try {
      set({ saving: true });

      const res = await fetch(`${API}/api/blogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Create failed");

      toast.success("Blog created successfully");
      return data.blog;
    } catch (err) {
      toast.error(err.message || "Failed to create blog");
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  /* ==============================
     UPDATE BLOG
  ============================== */
  updateBlog: async (id, payload) => {
    try {
      set({ saving: true });

      const res = await fetch(`${API}/api/blogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      set({ blog: data.blog });
      toast.success("Blog updated successfully");

      return data.blog;
    } catch (err) {
      toast.error(err.message || "Failed to update blog");
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  

  /* ==============================
     DELETE BLOG
  ============================== */
  deleteBlog: async (id) => {
    try {
      set({ deleting: true });

      const res = await fetch(`${API}/api/blogs/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      set((state) => ({
        blogs: state.blogs.filter((b) => b._id !== id),
      }));

      toast.success("Blog deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete blog");
      throw err;
    } finally {
      set({ deleting: false });
    }
  },

  /* ==============================
     PUBLISH / UNPUBLISH
  ============================== */
  togglePublish: async (id, isPublished) => {
    try {
      const res = await fetch(`${API}/api/blogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Status update failed");

      set((state) => ({
        blogs: state.blogs.map((b) =>
          b._id === id ? { ...b, isPublished } : b
        ),
      }));

      toast.success(
        isPublished ? "Blog published" : "Blog unpublished"
      );
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  },

  /* ==============================
     FILTERS
  ============================== */
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () =>
    set({
      filters: {
        q: "",
        category: "",
        published: "",
        sort: "newest",
      },
    }),

  /* ==============================
     RESET
  ============================== */
  clearBlog: () => set({ blog: null }),
}));
