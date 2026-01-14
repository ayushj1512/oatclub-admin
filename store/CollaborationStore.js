import { create } from "zustand";
import axios from "axios";

/**
 * Admin Panel Store for Collaborations (CRU - No Delete)
 * Backend base comes from .env:
 * NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const API_BASE = `${BACKEND_URL}/api/collaborations`;

export const useCollaborationStore = create((set, get) => ({
  // -----------------------------
  // State
  // -----------------------------
  items: [],
  selected: null,

  loading: false,
  saving: false,
  error: null,

  // pagination/meta
  meta: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  },

  // filters/sort/search
  filters: {
    status: "ongoing",
    platform: "",
    productId: "",
    state: "",
    q: "",
    sort: "-createdAt",
  },

  // -----------------------------
  // Helpers
  // -----------------------------
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  setSelected: (doc) => set({ selected: doc }),

  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...patch },
      meta: { ...s.meta, page: 1 },
    })),

  setPage: (page) => set((s) => ({ meta: { ...s.meta, page } })),

  setLimit: (limit) =>
    set((s) => ({
      meta: { ...s.meta, limit, page: 1 },
    })),

  reset: () =>
    set({
      items: [],
      selected: null,
      loading: false,
      saving: false,
      error: null,
      meta: { total: 0, page: 1, limit: 20, pages: 0 },
      filters: {
        status: "ongoing",
        platform: "",
        productId: "",
        state: "",
        q: "",
        sort: "-createdAt",
      },
    }),

  // -----------------------------
  // Internal: build query params
  // -----------------------------
  _buildParams: () => {
    const { filters, meta } = get();

    const params = {
      page: meta.page,
      limit: meta.limit,
      sort: filters.sort || "-createdAt",
    };

    if (filters.status) params.status = filters.status;
    if (filters.platform) params.platform = filters.platform;
    if (filters.productId) params.productId = filters.productId;
    if (filters.state) params.state = filters.state;
    if (filters.q) params.q = filters.q;

    return params;
  },

  // -----------------------------
  // Actions (API)
  // -----------------------------
  fetchList: async () => {
    set({ loading: true, error: null });
    try {
      const params = get()._buildParams();
      const res = await axios.get(API_BASE, { params });

      set({
        items: res.data?.data || [],
        meta: res.data?.meta || get().meta,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch collaborations",
      });
    }
  },

  fetchById: async (id) => {
    if (!id) return;
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE}/${id}`);
      set({ selected: res.data?.data || null, loading: false });
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch collaboration",
      });
    }
  },

  createOne: async (payload) => {
    set({ saving: true, error: null });
    try {
      const res = await axios.post(API_BASE, payload);
      const created = res.data?.data;

      set((s) => ({
        items: created ? [created, ...s.items] : s.items,
        selected: created || s.selected,
        saving: false,
      }));

      return created;
    } catch (err) {
      set({
        saving: false,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to create collaboration",
      });
      return null;
    }
  },

  updateOne: async (id, patch) => {
    if (!id) return null;

    set({ saving: true, error: null });
    try {
      const res = await axios.patch(`${API_BASE}/${id}`, patch);
      const updated = res.data?.data;

      set((s) => ({
        items: s.items.map((x) => (x?._id === id ? updated : x)),
        selected: s.selected?._id === id ? updated : s.selected,
        saving: false,
      }));

      return updated;
    } catch (err) {
      set({
        saving: false,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update collaboration",
      });
      return null;
    }
  },
}));
