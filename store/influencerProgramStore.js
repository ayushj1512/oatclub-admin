import { create } from "zustand";
import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  withCredentials: true,
});

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const useInfluencerProgramStore = create((set, get) => ({
  influencers: [],
  influencer: null,
  loading: false,
  submitting: false,

  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,

  filters: {
    search: "",
    status: "",
    collaborationType: "",
    city: "",
    state: "",
    niche: "",
    sort: "newest",
  },

  setFilters: (updates = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...updates,
      },
      page: 1,
    })),

  setPage: (page) => set({ page }),

  setLimit: (limit) =>
    set({
      limit,
      page: 1,
    }),

  resetFilters: () =>
    set({
      page: 1,
      filters: {
        search: "",
        status: "",
        collaborationType: "",
        city: "",
        state: "",
        niche: "",
        sort: "newest",
      },
    }),

  /* =========================
     GET ALL
  ========================= */
  fetchInfluencers: async (extraParams = {}) => {
    try {
      set({ loading: true });

      const { page, limit, filters } = get();

      const params = {
        page,
        limit,
        ...filters,
        ...extraParams,
      };

      const { data } = await api.get("/api/influencer-program", { params });

      set({
        influencers: data?.influencers || [],
        total: data?.total || 0,
        totalPages: data?.totalPages || 1,
        page: data?.page || 1,
        limit: data?.limit || limit,
      });
    } catch (error) {
      console.error("fetchInfluencers error:", error);
      toast.error(getErrorMessage(error, "Failed to fetch influencers"));
    } finally {
      set({ loading: false });
    }
  },

  /* =========================
     GET BY ID
  ========================= */
  fetchInfluencerById: async (id) => {
    try {
      set({ loading: true, influencer: null });

      const { data } = await api.get(`/api/influencer-program/${id}`);

      set({
        influencer: data?.influencer || null,
      });

      return data?.influencer || null;
    } catch (error) {
      console.error("fetchInfluencerById error:", error);
      toast.error(getErrorMessage(error, "Failed to fetch influencer"));
      return null;
    } finally {
      set({ loading: false });
    }
  },

  /* =========================
     GET BY CODE
  ========================= */
  fetchInfluencerByCode: async (code) => {
    try {
      set({ loading: true, influencer: null });

      const { data } = await api.get(`/api/influencer-program/code/${code}`);

      set({
        influencer: data?.influencer || null,
      });

      return data?.influencer || null;
    } catch (error) {
      console.error("fetchInfluencerByCode error:", error);
      toast.error(getErrorMessage(error, "Failed to fetch influencer by code"));
      return null;
    } finally {
      set({ loading: false });
    }
  },

  /* =========================
     CREATE
  ========================= */
  createInfluencer: async (payload) => {
    try {
      set({ submitting: true });

      const { data } = await api.post("/api/influencer-program", payload);

      toast.success(data?.message || "Influencer created successfully");

      await get().fetchInfluencers();

      return {
        ok: true,
        influencer: data?.influencer || null,
      };
    } catch (error) {
      console.error("createInfluencer error:", error);
      toast.error(getErrorMessage(error, "Failed to create influencer"));
      return { ok: false };
    } finally {
      set({ submitting: false });
    }
  },

  /* =========================
     UPDATE
  ========================= */
  updateInfluencer: async (id, payload) => {
    try {
      set({ submitting: true });

      const { data } = await api.put(`/api/influencer-program/${id}`, payload);

      set((state) => ({
        influencer:
          state.influencer?._id === id
            ? data?.influencer || state.influencer
            : state.influencer,
      }));

      toast.success(data?.message || "Influencer updated successfully");

      await get().fetchInfluencers();

      return {
        ok: true,
        influencer: data?.influencer || null,
      };
    } catch (error) {
      console.error("updateInfluencer error:", error);
      toast.error(getErrorMessage(error, "Failed to update influencer"));
      return { ok: false };
    } finally {
      set({ submitting: false });
    }
  },

  /* =========================
     DELETE
  ========================= */
  deleteInfluencer: async (id) => {
    try {
      set({ submitting: true });

      const { data } = await api.delete(`/api/influencer-program/${id}`);

      toast.success(data?.message || "Influencer deleted successfully");

      set((state) => ({
        influencers: state.influencers.filter((item) => item._id !== id),
        influencer: state.influencer?._id === id ? null : state.influencer,
      }));

      await get().fetchInfluencers();

      return { ok: true };
    } catch (error) {
      console.error("deleteInfluencer error:", error);
      toast.error(getErrorMessage(error, "Failed to delete influencer"));
      return { ok: false };
    } finally {
      set({ submitting: false });
    }
  },

  /* =========================
     STATUS UPDATE
  ========================= */
  updateInfluencerStatus: async (id, status) => {
    try {
      set({ submitting: true });

      const { data } = await api.patch(
        `/api/influencer-program/${id}/status`,
        { status }
      );

      toast.success(data?.message || "Status updated successfully");

      set((state) => ({
        influencer:
          state.influencer?._id === id
            ? { ...state.influencer, status }
            : state.influencer,
      }));

      await get().fetchInfluencers();

      return {
        ok: true,
        influencer: data?.influencer || null,
      };
    } catch (error) {
      console.error("updateInfluencerStatus error:", error);
      toast.error(getErrorMessage(error, "Failed to update status"));
      return { ok: false };
    } finally {
      set({ submitting: false });
    }
  },

  /* =========================
     LOCAL HELPERS
  ========================= */
  clearInfluencer: () => set({ influencer: null }),

  clearInfluencers: () =>
    set({
      influencers: [],
      total: 0,
      totalPages: 1,
      page: 1,
    }),
}));