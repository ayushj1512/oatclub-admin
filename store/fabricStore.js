import { create } from "zustand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/fabrics`
  : "/api/fabrics";

const defaultFilters = {
  q: "",
  status: "",
  movementStatus: "",
  category: "",
  unit: "",
  isActive: "",
  page: 1,
  limit: 20,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

const defaultPagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  count: 0,
};

const jsonHeaders = { "Content-Type": "application/json" };

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  return params.toString();
};

const updateItemInList = (list = [], updated) =>
  list.map((item) => (item._id === updated._id ? updated : item));

const request = async (url, options = {}) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const useFabricStore = create((set, get) => ({
  fabrics: [],
  selectedFabric: null,
  fabricOptions: [],
  fabricStats: null,

  loading: false,
  formLoading: false,
  error: null,

  filters: { ...defaultFilters },
  pagination: { ...defaultPagination },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () =>
    set({
      filters: { ...defaultFilters },
    }),

  fetchFabrics: async (extraFilters = {}) => {
    try {
      set({ loading: true, error: null });

      const filters = { ...get().filters, ...extraFilters };
      const query = buildQuery(filters);
      const data = await request(`${API_BASE}?${query}`);

      set({
        fabrics: data.data || [],
        filters,
        pagination: {
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || filters.limit || 20,
          totalPages: data.totalPages || 0,
          count: data.count || 0,
        },
      });

      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchFabricOptions: async () => {
    try {
      set({ loading: true, error: null });
      const data = await request(`${API_BASE}/options`);
      set({ fabricOptions: data.data || [] });
      return data.data || [];
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchFabricStats: async () => {
    try {
      set({ loading: true, error: null });
      const data = await request(`${API_BASE}/stats`);
      set({ fabricStats: data.data || null });
      return data.data || null;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchFabricById: async (id) => {
    try {
      set({ loading: true, error: null });
      const data = await request(`${API_BASE}/${id}`);
      set({ selectedFabric: data.data || null });
      return data.data || null;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchFabricByCode: async (code) => {
    try {
      set({ loading: true, error: null });
      const data = await request(`${API_BASE}/code/${code}`);
      set({ selectedFabric: data.data || null });
      return data.data || null;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  createFabric: async (payload) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(API_BASE, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });

      set((state) => ({
        fabrics: [data.data, ...state.fabrics],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
          count: state.pagination.count + 1,
        },
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  updateFabric: async (id, payload) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });

      set((state) => ({
        fabrics: updateItemInList(state.fabrics, data.data),
        selectedFabric:
          state.selectedFabric?._id === id ? data.data : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  updateFabricStatus: async (id, payload) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}/status`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });

      set((state) => ({
        fabrics: updateItemInList(state.fabrics, data.data),
        selectedFabric:
          state.selectedFabric?._id === id ? data.data : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  updateMovementStatus: async (id, movementStatus) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}/movement`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ movementStatus }),
      });

      set((state) => ({
        fabrics: updateItemInList(state.fabrics, data.data),
        selectedFabric:
          state.selectedFabric?._id === id ? data.data : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  addAssociatedProductCodes: async (id, productCodes = []) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}/add-product-codes`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ productCodes }),
      });

      set((state) => ({
        fabrics: updateItemInList(state.fabrics, data.data),
        selectedFabric:
          state.selectedFabric?._id === id ? data.data : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  removeAssociatedProductCodes: async (id, productCodes = []) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}/remove-product-codes`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ productCodes }),
      });

      set((state) => ({
        fabrics: updateItemInList(state.fabrics, data.data),
        selectedFabric:
          state.selectedFabric?._id === id ? data.data : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  activateFabric: async (id) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}/activate`, {
        method: "PATCH",
      });

      set((state) => ({
        fabrics: updateItemInList(state.fabrics, data.data),
        selectedFabric:
          state.selectedFabric?._id === id ? data.data : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  deleteFabric: async (id) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      set((state) => ({
        fabrics: state.fabrics.filter((item) => item._id !== id),
        selectedFabric:
          state.selectedFabric?._id === id ? null : state.selectedFabric,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
          count: Math.max(0, state.pagination.count - 1),
        },
      }));

      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  bulkUpdateFabrics: async (ids = [], updates = {}) => {
    try {
      set({ formLoading: true, error: null });

      const data = await request(`${API_BASE}/bulk-update`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ ids, updates }),
      });

      await get().fetchFabrics();
      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ formLoading: false });
    }
  },

  resetFabricStore: () =>
    set({
      fabrics: [],
      selectedFabric: null,
      fabricOptions: [],
      fabricStats: null,
      loading: false,
      formLoading: false,
      error: null,
      filters: { ...defaultFilters },
      pagination: { ...defaultPagination },
    }),
}));