// src/store/fabricLogStore.js
import { create } from "zustand";
import {
  getRequest,
  postRequest,
  getErrorMessage,
} from "@/utils/api";

const useFabricLogStore = create((set, get) => ({
  fabricLogs: [],
  selectedFabricLog: null,

  fabricLogsLoading: false,
  fabricLogLoading: false,
  createFabricLogLoading: false,

  fabricLogsError: null,

  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    count: 0,
  },

  filters: {
    q: "",
    action: "",
    type: "",
    startDate: "",
    endDate: "",
    sortBy: "logDate",
    sortOrder: "desc",
  },

  setFabricLogFilters: (updates = {}) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...updates,
      },
    }));
  },

  resetFabricLogFilters: () => {
    set({
      filters: {
        q: "",
        action: "",
        type: "",
        startDate: "",
        endDate: "",
        sortBy: "logDate",
        sortOrder: "desc",
      },
    });
  },

  fetchFabricLogs: async (params = {}) => {
    try {
      set({ fabricLogsLoading: true, fabricLogsError: null });

      const query = {
        page: get().pagination.page,
        limit: get().pagination.limit,
        ...get().filters,
        ...params,
      };

      const res = await getRequest("fabric-logs", query);

      set({
        fabricLogs: res.data || [],
        pagination: {
          total: res.total || 0,
          page: res.page || query.page || 1,
          limit: res.limit || query.limit || 20,
          totalPages: res.totalPages || 1,
          count: res.count || 0,
        },
        fabricLogsLoading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric logs");

      set({
        fabricLogsLoading: false,
        fabricLogsError: message,
      });

      return { success: false, message };
    }
  },

  fetchFabricLogsByCode: async (code, params = {}) => {
    try {
      set({ fabricLogsLoading: true, fabricLogsError: null });

      const res = await getRequest(`fabric-logs/code/${code}`, {
        page: 1,
        limit: 20,
        ...params,
      });

      set({
        fabricLogs: res.data || [],
        pagination: {
          total: res.total || 0,
          page: res.page || 1,
          limit: res.limit || 20,
          totalPages: res.totalPages || 1,
          count: res.count || 0,
        },
        fabricLogsLoading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to fetch fabric logs by code"
      );

      set({
        fabricLogsLoading: false,
        fabricLogsError: message,
      });

      return { success: false, message };
    }
  },

  fetchFabricLogById: async (id) => {
    try {
      set({ fabricLogLoading: true, fabricLogsError: null });

      const res = await getRequest(`fabric-logs/${id}`);

      set({
        selectedFabricLog: res.data || null,
        fabricLogLoading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric log");

      set({
        fabricLogLoading: false,
        fabricLogsError: message,
      });

      return { success: false, message };
    }
  },

  createFabricStockLog: async (payload) => {
    try {
      set({ createFabricLogLoading: true, fabricLogsError: null });

      const res = await postRequest("fabric-logs", payload);

      if (res.success) {
        await get().fetchFabricLogs({ page: 1 });
      }

      set({ createFabricLogLoading: false });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to create fabric stock log"
      );

      set({
        createFabricLogLoading: false,
        fabricLogsError: message,
      });

      return { success: false, message };
    }
  },

  clearSelectedFabricLog: () => {
    set({ selectedFabricLog: null });
  },

  clearFabricLogError: () => {
    set({ fabricLogsError: null });
  },
}));

export default useFabricLogStore;

