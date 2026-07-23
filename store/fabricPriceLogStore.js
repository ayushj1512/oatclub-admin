// src/store/fabricPriceLogStore.js
import { create } from "zustand";
import {
  getRequest,
  postRequest,
  patchRequest,
  deleteRequest,
  getErrorMessage,
} from "@/utils/api";

const defaultFilters = {
  search: "",
  fabricCode: "",
  fabricName: "",
  unit: "",
  createdBy: "",
  reason: "",
  fromDate: "",
  toDate: "",
  priceIncreased: "",
  priceDecreased: "",
  sortBy: "effectiveFrom",
  sortOrder: "desc",
};

const defaultPagination = {
  total: 0,
  page: 1,
  limit: 50,
  pages: 1,
};

const useFabricPriceLogStore = create((set, get) => ({
  priceLogs: [],
  currentPriceList: [],
  selectedPriceLog: null,
  latestPrice: null,
  priceHistory: [],
  bulkLatestPrices: [],

  analytics: null,
  trend: [],
  topChanges: [],
  summaryByFabric: [],

  loading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  error: null,

  filters: defaultFilters,
  pagination: defaultPagination,

  setFilters: (updates = {}) => {
    set((state) => ({
      filters: { ...state.filters, ...updates },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },

  setPagination: (updates = {}) => {
    set((state) => ({
      pagination: { ...state.pagination, ...updates },
    }));
  },

  fetchPriceLogs: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const query = {
        page: get().pagination.page,
        limit: get().pagination.limit,
        ...get().filters,
        ...params,
      };

      const res = await getRequest("fabric-price-logs", query);

      set({
        priceLogs: res.data || [],
        pagination: {
          total: res.pagination?.total || 0,
          page: res.pagination?.page || query.page || 1,
          limit: res.pagination?.limit || query.limit || 50,
          pages: res.pagination?.pages || 1,
        },
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric price logs");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  createPriceLog: async (payload) => {
    try {
      set({ createLoading: true, error: null });

      const res = await postRequest("fabric-price-logs", payload);

      if (res.success) {
        await get().fetchPriceLogs({ page: 1 });
        await get().fetchCurrentPriceList();
      }

      set({ createLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create fabric price log");
      set({ createLoading: false, error: message });
      return { success: false, message };
    }
  },

  fetchPriceLogById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(`fabric-price-logs/${id}`);

      set({
        selectedPriceLog: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric price log");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  updatePriceLog: async (id, payload) => {
    try {
      set({ updateLoading: true, error: null });

      const res = await patchRequest(`fabric-price-logs/${id}`, payload);

      if (res.success) {
        await get().fetchPriceLogs();
      }

      set({ updateLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update fabric price log");
      set({ updateLoading: false, error: message });
      return { success: false, message };
    }
  },

  deletePriceLog: async (id) => {
    try {
      set({ deleteLoading: true, error: null });

      const res = await deleteRequest(`fabric-price-logs/${id}`);

      if (res.success) {
        await get().fetchPriceLogs();
        await get().fetchCurrentPriceList();
      }

      set({ deleteLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete fabric price log");
      set({ deleteLoading: false, error: message });
      return { success: false, message };
    }
  },

  fetchLatestPriceByFabric: async (fabricId) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(`fabric-price-logs/latest/fabric/${fabricId}`);

      set({
        latestPrice: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch latest fabric price");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchLatestPriceByCode: async (fabricCode) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(`fabric-price-logs/latest/code/${fabricCode}`);

      set({
        latestPrice: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch latest fabric price");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchPriceHistory: async (fabricId, params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(`fabric-price-logs/history/${fabricId}`, {
        page: 1,
        limit: 50,
        ...params,
      });

      set({
        priceHistory: res.data || [],
        pagination: {
          total: res.pagination?.total || 0,
          page: res.pagination?.page || 1,
          limit: res.pagination?.limit || 50,
          pages: res.pagination?.pages || 1,
        },
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch price history");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchCurrentPriceList: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest("fabric-price-logs/current", {
        page: 1,
        limit: 100,
        ...params,
      });

      set({
        currentPriceList: res.data || [],
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch current fabric prices");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchBulkLatestPrices: async (payload) => {
    try {
      set({ loading: true, error: null });

      const res = await postRequest("fabric-price-logs/bulk-latest", payload);

      set({
        bulkLatestPrices: res.data || [],
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch bulk fabric prices");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchAnalytics: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest("fabric-price-logs/analytics/overview", params);

      set({
        analytics: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch price analytics");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchTrend: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest("fabric-price-logs/analytics/trend", params);

      set({
        trend: res.data || [],
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch price trend");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchTopChanges: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(
        "fabric-price-logs/analytics/top-changes",
        params
      );

      set({
        topChanges: res.data || [],
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch top price changes");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchSummaryByFabric: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(
        "fabric-price-logs/analytics/by-fabric",
        params
      );

      set({
        summaryByFabric: res.data || [],
        pagination: {
          total: res.pagination?.total || 0,
          page: res.pagination?.page || 1,
          limit: res.pagination?.limit || 50,
          pages: res.pagination?.pages || 1,
        },
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric price summary");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  clearSelectedPriceLog: () => {
    set({ selectedPriceLog: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useFabricPriceLogStore;

