"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL;

const str = (v) => (v == null ? "" : String(v));
const dedupeById = (prev = [], next = []) => {
  const map = new Map();
  for (const x of prev) {
    const id = str(x?._id);
    if (id) map.set(id, x);
  }
  for (const x of next) {
    const id = str(x?._id);
    if (id) map.set(id, x);
  }
  return Array.from(map.values());
};

export const useAdminMediaStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  uploading: false,
  loadingMore: false,
  q: "",
  type: "",

  fetchMedia: async ({ page = 1, limit = 48, append = false } = {}) => {
    const key = append ? "loadingMore" : "loading";
    set({ [key]: true });

    try {
      const { q, type, items: prevItems } = get();

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (q) params.set("q", q);
      if (type) params.set("type", type);

      const res = await fetch(`${API}/api/media?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];

      set({
        items: append ? dedupeById(prevItems, nextItems) : nextItems,
        total: Number(data?.total || 0),
        page: Number(data?.page || page),
        pages: Number(data?.pages || 1),
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load media");
      if (!append) set({ items: [] });
    } finally {
      set({ [key]: false });
    }
  },

  uploadMedia: async ({ files, folder } = {}) => {
    if (!files || files.length === 0) return;

    set({ uploading: true });

    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      if (folder) form.append("folder", folder);

      const res = await fetch(`${API}/api/media/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");

      toast.success("Media uploaded successfully");
      await get().fetchMedia({ page: 1, append: false });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      set({ uploading: false });
    }
  },

  deleteMedia: async (id) => {
    if (!id) return;
    if (!confirm("Delete this media?")) return;

    try {
      const res = await fetch(`${API}/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Media deleted");
      const { page, q, type } = get();
      await get().fetchMedia({ page: Math.max(1, page), append: false, q, type });
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  },

  setQuery: (q) => set({ q: str(q), page: 1 }),
  setType: (type) => set({ type: str(type), page: 1 }),
  resetFilters: () => set({ q: "", type: "", page: 1 }),
}));
