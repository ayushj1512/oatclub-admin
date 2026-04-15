"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import toast from "react-hot-toast";

const API = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tailors`;

const getErrorMessage = async (res, fallback) => {
  try {
    const data = await res.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
};

const toQueryString = (params = {}) => {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    if (String(value).trim() === "") return;
    if (value === "all") return;
    qs.set(key, value);
  });

  const query = qs.toString();
  return query ? `?${query}` : "";
};

const useTailorStore = create(
  devtools((set, get) => ({
    tailors: [],
    tailor: null,

    loading: false,
    listLoading: false,
    detailLoading: false,
    submitting: false,
    deleting: false,

    filters: {
      search: "",
      status: "all",
      type: "all",
      sort: "newest",
    },

    setFilters: (next = {}) =>
      set((state) => ({
        filters: { ...state.filters, ...next },
      })),

    resetFilters: () =>
      set({
        filters: {
          search: "",
          status: "all",
          type: "all",
          sort: "newest",
        },
      }),

    fetchTailors: async (customFilters = {}) => {
      try {
        set({ listLoading: true });

        const filters = { ...get().filters, ...customFilters };
        const res = await fetch(`${API}${toQueryString(filters)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(await getErrorMessage(res, "Failed to fetch tailors"));
        }

        const data = await res.json();

        set({
          tailors: Array.isArray(data?.tailors) ? data.tailors : [],
          filters,
          listLoading: false,
        });

        return {
          success: true,
          tailors: Array.isArray(data?.tailors) ? data.tailors : [],
        };
      } catch (error) {
        set({ listLoading: false, tailors: [] });
        toast.error(error.message || "Failed to fetch tailors");
        return { success: false, message: error.message };
      }
    },

    fetchTailorById: async (id) => {
      try {
        if (!id) throw new Error("Tailor id is required");

        set({ detailLoading: true, tailor: null });

        const res = await fetch(`${API}/${id}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(await getErrorMessage(res, "Failed to fetch tailor"));
        }

        const data = await res.json();

        set({
          tailor: data?.tailor || null,
          detailLoading: false,
        });

        return { success: true, tailor: data?.tailor || null };
      } catch (error) {
        set({ detailLoading: false, tailor: null });
        toast.error(error.message || "Failed to fetch tailor");
        return { success: false, message: error.message };
      }
    },

    createTailor: async (payload = {}) => {
      try {
        set({ submitting: true });

        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(await getErrorMessage(res, "Failed to create tailor"));
        }

        const data = await res.json();

        set((state) => ({
          submitting: false,
          tailors: data?.tailor ? [data.tailor, ...state.tailors] : state.tailors,
        }));

        toast.success(data?.message || "Tailor created successfully");
        return { success: true, tailor: data?.tailor || null };
      } catch (error) {
        set({ submitting: false });
        toast.error(error.message || "Failed to create tailor");
        return { success: false, message: error.message };
      }
    },

    updateTailor: async (id, payload = {}) => {
      try {
        if (!id) throw new Error("Tailor id is required");

        set({ submitting: true });

        const res = await fetch(`${API}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(await getErrorMessage(res, "Failed to update tailor"));
        }

        const data = await res.json();
        const updatedTailor = data?.tailor || null;

        set((state) => ({
          submitting: false,
          tailor:
            state.tailor?._id === updatedTailor?._id ? updatedTailor : state.tailor,
          tailors: state.tailors.map((item) =>
            item._id === updatedTailor?._id ? updatedTailor : item
          ),
        }));

        toast.success(data?.message || "Tailor updated successfully");
        return { success: true, tailor: updatedTailor };
      } catch (error) {
        set({ submitting: false });
        toast.error(error.message || "Failed to update tailor");
        return { success: false, message: error.message };
      }
    },

    deleteTailor: async (id) => {
      try {
        if (!id) throw new Error("Tailor id is required");

        set({ deleting: true });

        const res = await fetch(`${API}/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error(await getErrorMessage(res, "Failed to delete tailor"));
        }

        const data = await res.json();

        set((state) => ({
          deleting: false,
          tailor: state.tailor?._id === id ? null : state.tailor,
          tailors: state.tailors.filter((item) => item._id !== id),
        }));

        toast.success(data?.message || "Tailor deleted successfully");
        return { success: true };
      } catch (error) {
        set({ deleting: false });
        toast.error(error.message || "Failed to delete tailor");
        return { success: false, message: error.message };
      }
    },

    clearTailor: () => set({ tailor: null }),
  }))
);

export default useTailorStore;