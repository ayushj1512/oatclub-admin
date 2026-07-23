// src/store/fabricStore.js
import { create } from "zustand";

const API_BASE_URL = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "")}/api`;

const getErrorMessage = (error, fallback = "Something went wrong") => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}/${endpoint}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "API request failed");
  }

  return data;
};

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      query.append(key, value);
    }
  });

  return query.toString();
};

const getRequest = async (endpoint, params = {}) => {
  const query = buildQuery(params);
  return apiRequest(query ? `${endpoint}?${query}` : endpoint);
};

const postRequest = async (endpoint, body = {}) => {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

const putRequest = async (endpoint, body = {}) => {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

const patchRequest = async (endpoint, body = {}) => {
  return apiRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
};

const deleteRequest = async (endpoint) => {
  return apiRequest(endpoint, {
    method: "DELETE",
  });
};

const defaultFilters = {
  q: "",
  status: "",
  movementStatus: "",
  category: "",
  unit: "",
  isActive: "",
  isLowStock: "",
  page: 1,
  limit: 20,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

const defaultPagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
  count: 0,
};

const useFabricStore = create((set, get) => ({
  fabrics: [],
  lowStockFabrics: [],
  fabricOptions: [],
  fabricStats: null,
  selectedFabric: null,

  loading: false,
  formLoading: false,
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

  clearError: () => {
    set({ error: null });
  },

  fetchFabrics: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const query = {
        ...get().filters,
        ...params,
      };

      const res = await getRequest("fabrics", query);

      set({
        fabrics: res.data || [],
        pagination: {
          total: res.total || 0,
          page: res.page || query.page || 1,
          limit: res.limit || query.limit || 20,
          totalPages: res.totalPages || 1,
          count: res.count || 0,
        },
        filters: {
          ...get().filters,
          ...params,
        },
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabrics");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchLowStockFabrics: async () => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest("fabrics/low-stock");

      set({
        lowStockFabrics: res.data || [],
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to fetch low-stock fabrics"
      );

      set({
        loading: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  fetchFabricStats: async () => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest("fabrics/stats");

      set({
        fabricStats: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric stats");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchFabricOptions: async () => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest("fabrics/options");

      set({
        fabricOptions: res.data || [],
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric options");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchFabricById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(`fabrics/${id}`);

      set({
        selectedFabric: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  fetchFabricByCode: async (code) => {
    try {
      set({ loading: true, error: null });

      const res = await getRequest(`fabrics/code/${code}`);

      set({
        selectedFabric: res.data || null,
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch fabric by code");
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

    searchFabrics: async (params = {}) => {
    try {
      set({
        loading: true,
        error: null,
      });

      const res = await getRequest(
        "fabrics/search",
        params
      );

      set({
        searchResults: res.data || [],
        pagination: {
          total: res.total || 0,
          page: res.page || 1,
          limit: res.limit || 20,
          totalPages: res.totalPages || 1,
          count: res.count || 0,
        },
        loading: false,
      });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to search fabrics"
      );

      set({
        loading: false,
        error: message,
        searchResults: [],
      });

      return {
        success: false,
        message,
      };
    }
  },

  createFabric: async (payload) => {
    try {
      set({ formLoading: true, error: null });

      const res = await postRequest("fabrics", payload);

      if (res.success) {
        await get().fetchFabrics({ page: 1 });
        await get().fetchFabricStats();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create fabric");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  updateFabric: async (id, payload) => {
    try {
      set({ formLoading: true, error: null });

      const res = await putRequest(`fabrics/${id}`, payload);

      if (res.success) {
        set((state) => ({
          fabrics: state.fabrics.map((item) =>
            item._id === id ? res.data : item
          ),
          selectedFabric:
            state.selectedFabric?._id === id ? res.data : state.selectedFabric,
        }));
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update fabric");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  updateFabricLowStockThreshold: async (
    id,
    lowStockThreshold
  ) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(
        `fabrics/${id}/low-stock-threshold`,
        {
          lowStockThreshold,
        }
      );

      if (res.success) {
        set((state) => ({
          fabrics: state.fabrics.map((fabric) =>
            fabric._id === id ? res.data : fabric
          ),
          selectedFabric:
            state.selectedFabric?._id === id
              ? res.data
              : state.selectedFabric,
        }));

        await get().fetchLowStockFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to update low-stock threshold"
      );

      set({
        formLoading: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  updateFabricStatus: async (id, payload) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(`fabrics/${id}/status`, payload);

      if (res.success) {
        await get().fetchFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update fabric status");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  assignProductCodesToFabric: async (id, productCodes = []) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(
        `fabrics/${id}/assign-products`,
        {
          productCodes,
        }
      );

      if (res.success) {
        set((state) => ({
          fabrics: state.fabrics.map((fabric) =>
            fabric._id === id ? res.data : fabric
          ),
          selectedFabric:
            state.selectedFabric?._id === id
              ? res.data
              : state.selectedFabric,
        }));

        await get().fetchFabricStats();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to assign product codes"
      );

      set({
        formLoading: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  updateMovementStatus: async (id, movementStatus) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(`fabrics/${id}/movement`, {
        movementStatus,
      });

      if (res.success) {
        await get().fetchFabrics();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update movement status");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  addAssociatedProductCodes: async (id, productCodes = []) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(`fabrics/${id}/add-product-codes`, {
        productCodes,
      });

      if (res.success) {
        await get().fetchFabrics();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to add product codes");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  removeAssociatedProductCodes: async (id, productCodes = []) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(`fabrics/${id}/remove-product-codes`, {
        productCodes,
      });

      if (res.success) {
        await get().fetchFabrics();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to remove product codes");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  activateFabric: async (id) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(`fabrics/${id}/activate`);

      if (res.success) {
        await get().fetchFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to activate fabric");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  deleteFabric: async (id) => {
    try {
      set({ formLoading: true, error: null });

      const res = await deleteRequest(`fabrics/${id}`);

      if (res.success) {
        await get().fetchFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete fabric");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  bulkUpdateFabrics: async (ids = [], updates = {}) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest("fabrics/bulk-update", {
        ids,
        updates,
      });

      if (res.success) {
        await get().fetchFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });
      return res;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to bulk update fabrics");
      set({ formLoading: false, error: message });
      return { success: false, message };
    }
  },

  refreshFabricLowStock: async (id) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(
        `fabrics/${id}/refresh-low-stock`
      );

      if (res.success) {
        set((state) => ({
          fabrics: state.fabrics.map((fabric) =>
            fabric._id === id ? res.data : fabric
          ),
          selectedFabric:
            state.selectedFabric?._id === id
              ? res.data
              : state.selectedFabric,
        }));

        await get().fetchLowStockFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to refresh low-stock status"
      );

      set({
        formLoading: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  refreshAllFabricsLowStock: async () => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(
        "fabrics/low-stock/refresh-all"
      );

      if (res.success) {
        await get().fetchFabrics();
        await get().fetchLowStockFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to refresh all low-stock fabrics"
      );

      set({
        formLoading: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  updateAllFabricLowStockThresholds: async (
    lowStockThreshold
  ) => {
    try {
      set({ formLoading: true, error: null });

      const res = await patchRequest(
        "fabrics/low-stock/threshold-all",
        {
          lowStockThreshold,
        }
      );

      if (res.success) {
        await get().fetchFabrics();
        await get().fetchLowStockFabrics();
        await get().fetchFabricStats();
      }

      set({ formLoading: false });

      return res;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to update all fabric thresholds"
      );

      set({
        formLoading: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  clearSelectedFabric: () => {
    set({ selectedFabric: null });
  },
  setSelectedFabric: (fabric) => {
    set({
      selectedFabric: fabric || null,
    });
  },

  resetfabricStore: () => {
    set({
      fabrics: [],
      lowStockFabrics: [],

      fabricOptions: [],
      fabricStats: null,
selectedFabric: null,
searchResults: [],      loading: false,
      formLoading: false,
      error: null,
      filters: defaultFilters,
      pagination: defaultPagination,
    });
  },
}));

export default useFabricStore;

