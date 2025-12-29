"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL;

export const useAdminMediaStore = create((set, get) => ({
  /* ================= STATE ================= */
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  uploading: false,
  q: "",
  type: "",

  /* ================= FETCH ================= */
  fetchMedia: async ({ page = 1 } = {}) => {
    set({ loading: true });

    try {
      const { q, type } = get();

      const params = new URLSearchParams({
        page: String(page),
        limit: "48",
        q,
        type,
      });

      const res = await fetch(`${API}/api/media?${params}`);
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();

      set({
        items: Array.isArray(data.items) ? data.items : [],
        total: data.total || 0,
        page: data.page || 1,
        pages: data.pages || 1,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load media");
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  /* ================= UPLOAD ================= */
  uploadMedia: async ({ files, folder }) => {
    if (!files || files.length === 0) return;

    set({ uploading: true });

    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      if (folder) form.append("folder", folder);

      const res = await fetch(`${API}/api/media/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Upload failed");

      toast.success("Media uploaded successfully");
      await get().fetchMedia({ page: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      set({ uploading: false });
    }
  },

  /* ================= DELETE ================= */
  deleteMedia: async (id) => {
    if (!id) return;

    const ok = confirm("Delete this media?");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/media/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Media deleted");
      get().fetchMedia({ page: get().page });
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  },

  /* ================= FILTERS ================= */
  setQuery: (q) => set({ q }),
  setType: (type) => set({ type }),
}));
