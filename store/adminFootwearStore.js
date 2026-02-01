// src/store/adminFootwearStore.js
import { create } from "zustand";
import axios from "axios";

/**
 * ✅ Admin Footwear Store (ALL-IN-ONE)
 * Uses .env:
 *   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
 *
 * Covers:
 * - list/get/create/update/delete
 * - publish (draft/active), featured, stock update, bulk actions
 * - filters + pagination
 */
export const useAdminFootwearStore = create((set, get) => {
  /* ---------------- axios client (inside store) ---------------- */
  const http = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  // Optional: attach Bearer token if you use it
  // http.interceptors.request.use((config) => {
  //   const token =
  //     typeof window !== "undefined" ? localStorage.getItem("token") : null;
  //   if (token) config.headers.Authorization = `Bearer ${token}`;
  //   return config;
  // });

  const errMsg = (e, fallback) =>
    e?.response?.data?.message || e?.message || fallback;

  const normalizeFilters = (f) => {
    const out = {};
    Object.entries(f || {}).forEach(([k, v]) => {
      if (v === "" || v == null) return;
      out[k] = v;
    });
    return out;
  };

  return {
    /* ---------------- state ---------------- */
    items: [],
    total: 0,
    page: 1,
    limit: 30,
    pages: 1,

    current: null,
    loading: false,
    saving: false,
    error: null,

    filters: {
      search: "",
      sku: "",
      category: "",
      gender: "",
      type: "",
      isActive: "",
      isDraft: "",
      isFeatured: "",
      sort: "newest",
    },

    /* ---------------- UI helpers ---------------- */
    clearError: () => set({ error: null }),
    setFilters: (patch = {}) =>
      set((s) => ({ filters: { ...s.filters, ...patch }, page: 1 })),
    resetFilters: () =>
      set({
        filters: {
          search: "",
          sku: "",
          category: "",
          gender: "",
          type: "",
          isActive: "",
          isDraft: "",
          isFeatured: "",
          sort: "newest",
        },
        page: 1,
      }),
    setPage: (page) => set({ page: Math.max(1, Number(page) || 1) }),
    setLimit: (limit) =>
      set({
        limit: Math.min(100, Math.max(1, Number(limit) || 30)),
        page: 1,
      }),
    setCurrent: (item) => set({ current: item || null }),
    resetCurrent: () => set({ current: null }),

    /* ---------------- API: LIST ---------------- */
    fetchList: async () => {
      const { page, limit, filters } = get();
      set({ loading: true, error: null });

      try {
        const { data } = await http.get("/api/admin/footwear", {
          params: { page, limit, ...normalizeFilters(filters) },
        });

        set({
          items: data?.items || [],
          total: data?.total || 0,
          page: data?.page || page,
          limit: data?.limit || limit,
          pages: data?.pages || 1,
          loading: false,
        });

        return data;
      } catch (e) {
        set({ loading: false, error: errMsg(e, "Failed to load footwear") });
        return null;
      }
    },

    /* ---------------- API: GET ONE ---------------- */
    fetchOne: async (id) => {
      if (!id) return null;
      set({ loading: true, error: null });

      try {
        const { data } = await http.get(`/api/admin/footwear/${id}`);
        set({ current: data?.item || null, loading: false });
        return data?.item || null;
      } catch (e) {
        set({ loading: false, error: errMsg(e, "Failed to load footwear") });
        return null;
      }
    },

    /* ---------------- API: CREATE ---------------- */
    create: async (payload) => {
      set({ saving: true, error: null });

      try {
        const { data } = await http.post("/api/admin/footwear", payload);
        set({ saving: false, current: data?.item || null });
        get().fetchList(); // refresh
        return data?.item || null;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Create failed") });
        return null;
      }
    },

    /* ---------------- API: UPDATE ---------------- */
    update: async (id, patch = {}) => {
      if (!id) return null;
      set({ saving: true, error: null });

      try {
        const { data } = await http.patch(`/api/admin/footwear/${id}`, patch);

        set({ saving: false, current: data?.item || null });
        set((s) => ({
          items: s.items.map((x) =>
            String(x._id) === String(id) ? data.item : x
          ),
        }));

        return data?.item || null;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Update failed") });
        return null;
      }
    },

    /* ---------------- API: DELETE ---------------- */
    remove: async (id) => {
      if (!id) return false;
      set({ saving: true, error: null });

      try {
        await http.delete(`/api/admin/footwear/${id}`);

        set({ saving: false, current: null });
        set((s) => ({
          items: s.items.filter((x) => String(x._id) !== String(id)),
        }));

        return true;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Delete failed") });
        return false;
      }
    },

    /* ---------------- Admin: PUBLISH (draft/active) ---------------- */
    setPublishState: async (id, { isDraft, isActive, publishAt } = {}) => {
      if (!id) return null;
      set({ saving: true, error: null });

      try {
        const { data } = await http.patch(`/api/admin/footwear/${id}/publish`, {
          isDraft,
          isActive,
          publishAt,
        });

        set({ saving: false, current: data?.item || null });
        set((s) => ({
          items: s.items.map((x) =>
            String(x._id) === String(id) ? data.item : x
          ),
        }));

        return data?.item || null;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Publish update failed") });
        return null;
      }
    },

    /* ---------------- Admin: FEATURED ---------------- */
    setFeatured: async (id, isFeatured) => {
      if (!id) return null;
      set({ saving: true, error: null });

      try {
        const { data } = await http.patch(`/api/admin/footwear/${id}/featured`, {
          isFeatured: !!isFeatured,
        });

        set({ saving: false, current: data?.item || null });
        set((s) => ({
          items: s.items.map((x) =>
            String(x._id) === String(id) ? data.item : x
          ),
        }));

        return data?.item || null;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Featured update failed") });
        return null;
      }
    },

    /* ---------------- Admin: STOCK ---------------- */
    updateStock: async (id, payload = {}) => {
      if (!id) return null;
      set({ saving: true, error: null });

      try {
        const { data } = await http.patch(
          `/api/admin/footwear/${id}/stock`,
          payload
        );

        set({ saving: false, current: data?.item || null });
        set((s) => ({
          items: s.items.map((x) =>
            String(x._id) === String(id) ? data.item : x
          ),
        }));

        return data?.item || null;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Stock update failed") });
        return null;
      }
    },

    /* ---------------- Admin: BULK ---------------- */
    bulkAction: async (ids = [], action) => {
      if (!Array.isArray(ids) || !ids.length) return null;
      if (!action) return null;

      set({ saving: true, error: null });

      try {
        const { data } = await http.post("/api/admin/footwear/bulk", {
          ids,
          action,
        });

        set({ saving: false });
        await get().fetchList();
        return data;
      } catch (e) {
        set({ saving: false, error: errMsg(e, "Bulk action failed") });
        return null;
      }
    },

    /* ---------------- quick toggles (UI buttons) ---------------- */
    toggleActive: async (id, nextActive) =>
      get().setPublishState(id, { isActive: !!nextActive }),
    toggleDraft: async (id, nextDraft) =>
      get().setPublishState(id, { isDraft: !!nextDraft }),
    toggleFeatured: async (id, nextFeatured) =>
      get().setFeatured(id, !!nextFeatured),

    refreshCurrent: async () => {
      const cur = get().current;
      if (!cur?._id) return null;
      return get().fetchOne(cur._id);
    },
  };
});
