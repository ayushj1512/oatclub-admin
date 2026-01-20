// store/bestseller.store.js
// ✅ Bestseller store (Zustand) - NO react-redux Provider needed
// Uses: NEXT_PUBLIC_BACKEND_URL from .env
// Features:
// - fetchAll()          -> get all bestseller docs
// - fetchIds()          -> get only productIds
// - add(productId)      -> add one
// - removeById(id)      -> delete by bestseller doc _id
// - removeByProductId() -> delete by productId
// State: items, ids, loading, saving, error

import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL; // http://localhost:5000
const API = `${BASE_URL}/api/bestseller`;

// ---- small helper: fetch json + errors ----
const request = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
};

export const useBestsellerStore = create((set, get) => ({
  // ---------- STATE ----------
  items: [], // full docs [{_id, productId, createdAt, updatedAt}]
  ids: [], // only product ids ["..."]
  loading: false,
  saving: false,
  error: null,

  // ---------- helpers ----------
  setLoading: (v) => set({ loading: v }),
  setSaving: (v) => set({ saving: v }),
  clearError: () => set({ error: null }),

  // ---------- READ ----------
  fetchAll: async () => {
    try {
      set({ loading: true, error: null });
      const data = await request(API);
      set({ items: Array.isArray(data) ? data : [] });
      return data;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  fetchIds: async () => {
    try {
      set({ loading: true, error: null });
      const data = await request(`${API}/ids`);
      const ids = Array.isArray(data) ? data.map(String) : [];
      set({ ids });
      return ids;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  // ---------- CREATE ----------
  add: async (productId) => {
    try {
      if (!productId) throw new Error("productId is required");
      set({ saving: true, error: null });

      const doc = await request(API, {
        method: "POST",
        body: JSON.stringify({ productId }),
      });

      // sync ids + items optimistically
      const pid = String(doc?.productId || productId);
      set((state) => ({
        items: doc?._id
          ? [doc, ...(state.items || []).filter((x) => String(x._id) !== String(doc._id))]
          : state.items,
        ids: state.ids.includes(pid) ? state.ids : [pid, ...state.ids],
      }));

      return doc;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  // ---------- DELETE ----------
  removeById: async (id) => {
    try {
      if (!id) throw new Error("id is required");
      set({ saving: true, error: null });

      const data = await request(`${API}/${id}`, { method: "DELETE" });
      const deleted = data?.deleted;

      if (deleted?._id) {
        const pid = deleted?.productId ? String(deleted.productId) : null;

        set((state) => ({
          items: (state.items || []).filter((x) => String(x._id) !== String(deleted._id)),
          ids: pid ? (state.ids || []).filter((x) => x !== pid) : state.ids,
        }));
      }

      return data;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  removeByProductId: async (productId) => {
    try {
      if (!productId) throw new Error("productId is required");
      set({ saving: true, error: null });

      const data = await request(`${API}/product/${productId}`, { method: "DELETE" });
      const deleted = data?.deleted;

      // keep local state in sync
      const pid = String(productId);
      set((state) => ({
        ids: (state.ids || []).filter((x) => x !== pid),
        items: deleted?._id
          ? (state.items || []).filter((x) => String(x._id) !== String(deleted._id))
          : state.items,
      }));

      return data;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  // ---------- Convenience ----------
  // refresh both ids + docs (useful for pages)
  refresh: async () => {
    await Promise.allSettled([get().fetchIds(), get().fetchAll()]);
  },
}));
