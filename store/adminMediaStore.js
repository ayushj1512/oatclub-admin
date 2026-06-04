"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL;

const str = (v) => (v == null ? "" : String(v));

const dedupeById = (prev = [], next = []) => {
  const map = new Map();

  [...prev, ...next].forEach((item) => {
    const id = str(item?._id);
    if (id) map.set(id, item);
  });

  return [...map.values()];
};

export const useAdminMediaStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pages: 1,

  q: "",
  type: "",

  loading: false,
  uploading: false,
  loadingMore: false,

  fetchMedia: async ({ page = 1, limit = 48, append = false } = {}) => {
    const key = append ? "loadingMore" : "loading";
    set({ [key]: true });

    try {
      const { q, type, items } = get();

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (q) params.set("q", q);
      if (type) params.set("type", type);

      const res = await fetch(`${API}/api/media?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load media");

      const nextItems = Array.isArray(data?.items) ? data.items : [];

      set({
        items: append ? dedupeById(items, nextItems) : nextItems,
        total: Number(data?.total || 0),
        page: Number(data?.page || page),
        pages: Number(data?.pages || 1),
      });
    } catch (err) {
      console.error("❌ fetchMedia:", err);
      toast.error(err.message || "Failed to load media");

      if (!append) {
        set({ items: [], total: 0, page: 1, pages: 1 });
      }
    } finally {
      set({ [key]: false });
    }
  },

  uploadMedia: async ({ files, folder = "oatclub/media" } = {}) => {
    if (!files?.length) return;

    set({ uploading: true });

    try {
      const form = new FormData();

      Array.from(files).forEach((file) => {
        form.append("files", file);
      });

      form.append("folder", folder);

      const res = await fetch(`${API}/api/media/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");

      toast.success("Media uploaded successfully");

      set({ page: 1 });
      await get().fetchMedia({ page: 1, append: false });
    } catch (err) {
      console.error("❌ uploadMedia:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      set({ uploading: false });
    }
  },

  deleteMedia: async (id) => {
    if (!id) return;
    if (!confirm("Delete this media?")) return;

    try {
      const res = await fetch(`${API}/api/media/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      toast.success("Media deleted");

      const { page } = get();
      await get().fetchMedia({
        page: Math.max(1, page),
        append: false,
      });
    } catch (err) {
      console.error("❌ deleteMedia:", err);
      toast.error(err.message || "Delete failed");
    }
  },

  syncMedia: async ({ max = 100 } = {}) => {
    try {
      const res = await fetch(`${API}/api/media/sync?max=${max}`, {
        method: "POST",
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Sync failed");

      toast.success("Media synced");

      set({ page: 1 });
      await get().fetchMedia({ page: 1, append: false });

      return data;
    } catch (err) {
      console.error("❌ syncMedia:", err);
      toast.error(err.message || "Sync failed");
      return null;
    }
  },

  setQuery: (q) => set({ q: str(q), page: 1 }),
  setType: (type) => set({ type: str(type), page: 1 }),

  resetFilters: () => {
    set({ q: "", type: "", page: 1 });
  },
}));