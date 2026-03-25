// store/remittanceStore.js
import { create } from "zustand";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback ||
  "Something went wrong";

const cleanParams = (params = {}) => {
  const out = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  });
  return out;
};

export const useRemittanceStore = create((set, get) => ({
  // data
  rows: [],
  summary: {
    totalEntries: 0,
    totalRemittedAmount: 0,
    latestRemittanceDate: null,
    pendingCount: 0,
  },
  pendingRows: [],

  // pagination
  pagination: {
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  pendingPagination: {
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },

  // filters
  filters: {
    search: "",
    orderType: "",
    from: "",
    to: "",
    remittanceFrom: "",
    remittanceTo: "",
    minAmount: "",
    maxAmount: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  },

  pendingFilters: {
    search: "",
    sortBy: "deliveredDate",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  },

  // loading
  loading: false,
  summaryLoading: false,
  pendingLoading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  importLoading: false,
  exportLoading: false,

  // error
  error: "",
  summaryError: "",
  pendingError: "",
  actionError: "",

  // -----------------------------
  // setters
  // -----------------------------
  setFilters: (patch = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...patch,
      },
    })),

  resetFilters: () =>
    set({
      filters: {
        search: "",
        orderType: "",
        from: "",
        to: "",
        remittanceFrom: "",
        remittanceTo: "",
        minAmount: "",
        maxAmount: "",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      },
    }),

  setPendingFilters: (patch = {}) =>
    set((state) => ({
      pendingFilters: {
        ...state.pendingFilters,
        ...patch,
      },
    })),

  resetPendingFilters: () =>
    set({
      pendingFilters: {
        search: "",
        sortBy: "deliveredDate",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      },
    }),

  // -----------------------------
  // fetch list
  // -----------------------------
  fetchRemittances: async (customParams = {}) => {
    try {
      set({ loading: true, error: "" });

      const params = cleanParams({
        ...get().filters,
        ...customParams,
      });

      const { data } = await axios.get(`${API}/api/remittance`, { params });

      set((state) => ({
        rows: Array.isArray(data?.data) ? data.data : [],
        pagination: data?.pagination || state.pagination,
        filters: {
          ...state.filters,
          ...customParams,
          page: data?.pagination?.page || params.page || 1,
          limit: data?.pagination?.limit || params.limit || 20,
        },
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch remittances");
      set({ loading: false, error: message, rows: [] });
      throw error;
    }
  },

  // -----------------------------
  // fetch one
  // -----------------------------
  fetchRemittanceById: async (id) => {
    try {
      const { data } = await axios.get(`${API}/api/remittance/${id}`);
      return data?.data || null;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch remittance");
      set({ actionError: message });
      throw error;
    }
  },

  // -----------------------------
  // summary
  // -----------------------------
  fetchSummary: async () => {
    try {
      set({ summaryLoading: true, summaryError: "" });

      const { data } = await axios.get(`${API}/api/remittance/summary`);

      set({
        summaryLoading: false,
        summary: data?.data || {
          totalEntries: 0,
          totalRemittedAmount: 0,
          latestRemittanceDate: null,
          pendingCount: 0,
        },
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch summary");
      set({ summaryLoading: false, summaryError: message });
      throw error;
    }
  },

  // -----------------------------
  // pending
  // -----------------------------
  fetchPendingRemittances: async (customParams = {}) => {
    try {
      set({ pendingLoading: true, pendingError: "" });

      const params = cleanParams({
        ...get().pendingFilters,
        ...customParams,
      });

      const { data } = await axios.get(`${API}/api/remittance/pending`, {
        params,
      });

      set((state) => ({
        pendingRows: Array.isArray(data?.data) ? data.data : [],
        pendingPagination: data?.pagination || state.pendingPagination,
        pendingFilters: {
          ...state.pendingFilters,
          ...customParams,
          page: data?.pagination?.page || params.page || 1,
          limit: data?.pagination?.limit || params.limit || 20,
        },
        pendingLoading: false,
      }));

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to fetch pending remittances"
      );
      set({ pendingLoading: false, pendingError: message, pendingRows: [] });
      throw error;
    }
  },

  // -----------------------------
  // create
  // -----------------------------
  createRemittance: async (payload) => {
    try {
      set({ createLoading: true, actionError: "" });

      const { data } = await axios.post(`${API}/api/remittance`, payload);

      set({ createLoading: false });

      await Promise.allSettled([
        get().fetchRemittances(),
        get().fetchSummary(),
        get().fetchPendingRemittances(),
      ]);

      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create remittance");
      set({ createLoading: false, actionError: message });
      throw error;
    }
  },

  // -----------------------------
  // update
  // -----------------------------
  updateRemittance: async (id, payload) => {
    try {
      set({ updateLoading: true, actionError: "" });

      const { data } = await axios.put(`${API}/api/remittance/${id}`, payload);

      set({ updateLoading: false });

      await Promise.allSettled([
        get().fetchRemittances(),
        get().fetchSummary(),
        get().fetchPendingRemittances(),
      ]);

      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update remittance");
      set({ updateLoading: false, actionError: message });
      throw error;
    }
  },

  // -----------------------------
  // delete
  // -----------------------------
  deleteRemittance: async (id) => {
    try {
      set({ deleteLoading: true, actionError: "" });

      const { data } = await axios.delete(`${API}/api/remittance/${id}`);

      set({ deleteLoading: false });

      await Promise.allSettled([
        get().fetchRemittances(),
        get().fetchSummary(),
        get().fetchPendingRemittances(),
      ]);

      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete remittance");
      set({ deleteLoading: false, actionError: message });
      throw error;
    }
  },

  // -----------------------------
  // import csv
  // -----------------------------
  importCsv: async (file) => {
    try {
      set({ importLoading: true, actionError: "" });

      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(
        `${API}/api/remittance/import/csv`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      set({ importLoading: false });

      await Promise.allSettled([
        get().fetchRemittances({ page: 1 }),
        get().fetchSummary(),
        get().fetchPendingRemittances({ page: 1 }),
      ]);

      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to import CSV");
      set({ importLoading: false, actionError: message });
      throw error;
    }
  },

  // -----------------------------
  // export helpers
  // -----------------------------
  exportCsv: async (customParams = {}) => {
    try {
      set({ exportLoading: true, actionError: "" });

      const params = cleanParams({
        ...get().filters,
        ...customParams,
      });

      const response = await axios.get(`${API}/api/remittance/export/csv`, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remittance_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      set({ exportLoading: false });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to export CSV");
      set({ exportLoading: false, actionError: message });
      throw error;
    }
  },

  exportExcel: async (customParams = {}) => {
    try {
      set({ exportLoading: true, actionError: "" });

      const params = cleanParams({
        ...get().filters,
        ...customParams,
      });

      const response = await axios.get(`${API}/api/remittance/export/excel`, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remittance_export_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      set({ exportLoading: false });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to export Excel");
      set({ exportLoading: false, actionError: message });
      throw error;
    }
  },


  exportPendingCsv: async (customParams = {}) => {
  try {
    set({ exportLoading: true, actionError: "" });

    const params = cleanParams({
      ...get().pendingFilters,
      ...customParams,
    });

    const response = await axios.get(
      `${API}/api/remittance/pending/export/csv`,
      {
        params,
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending_remittance_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    set({ exportLoading: false });
    return true;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to export pending CSV";

    set({ exportLoading: false, actionError: message });
    throw error;
  }
},

  // -----------------------------
  // quick reload
  // -----------------------------
  refreshAll: async () => {
    await Promise.allSettled([
      get().fetchRemittances(),
      get().fetchSummary(),
      get().fetchPendingRemittances(),
    ]);
  },

  clearErrors: () =>
    set({
      error: "",
      summaryError: "",
      pendingError: "",
      actionError: "",
    }),
}));