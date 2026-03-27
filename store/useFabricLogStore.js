import { create } from "zustand";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const getErrorMessage = async (res, fallback) => {
  try {
    const data = await res.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
};

export const useFabricLogStore = create((set, get) => ({
  logs: [],
  selectedLog: null,
  fabricSummary: null,

  loading: false,
  creating: false,
  error: null,
  success: null,

  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
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

  codeFilters: {
    code: "",
    page: 1,
    limit: 20,
    action: "",
    type: "",
  },

  setFilters: (payload = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...payload,
      },
    })),

  setCodeFilters: (payload = {}) =>
    set((state) => ({
      codeFilters: {
        ...state.codeFilters,
        ...payload,
      },
    })),

  resetMessages: () =>
    set({
      error: null,
      success: null,
    }),

  resetSelectedLog: () =>
    set({
      selectedLog: null,
    }),

  resetLogs: () =>
    set({
      logs: [],
      fabricSummary: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        count: 0,
      },
    }),

  /* ============================================================
     GET ALL LOGS
  ============================================================ */
  fetchFabricLogs: async (customParams = {}) => {
    try {
      set({ loading: true, error: null, success: null });

      const state = get();
      const params = {
        ...state.filters,
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...customParams,
      };

      const query = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, value);
        }
      });

      const res = await fetch(`${BASE_URL}/api/fabric-logs?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch fabric logs");
      }

      set({
        logs: data?.data || [],
        fabricSummary: null,
        loading: false,
        pagination: {
          page: data?.page || 1,
          limit: data?.limit || 20,
          total: data?.total || 0,
          totalPages: data?.totalPages || 0,
          count: data?.count || 0,
        },
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        error: error.message || "Failed to fetch fabric logs",
      });
      return null;
    }
  },

  /* ============================================================
     GET LOGS BY FABRIC CODE
  ============================================================ */
  fetchFabricLogsByCode: async (code, customParams = {}) => {
    try {
      set({ loading: true, error: null, success: null });

      const state = get();
      const finalCode = String(code || state.codeFilters.code || "").trim();

      if (!finalCode) {
        throw new Error("Fabric code is required");
      }

      const params = {
        page: state.codeFilters.page,
        limit: state.codeFilters.limit,
        action: state.codeFilters.action,
        type: state.codeFilters.type,
        ...customParams,
      };

      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, value);
        }
      });

      const res = await fetch(
        `${BASE_URL}/api/fabric-logs/code/${encodeURIComponent(finalCode)}?${query.toString()}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch fabric logs by code");
      }

      set({
        logs: data?.data || [],
        loading: false,
        fabricSummary: {
          fabricCode: data?.fabricCode || finalCode,
        },
        codeFilters: {
          ...state.codeFilters,
          code: finalCode,
          page: data?.page || 1,
          limit: data?.limit || 20,
          action: params.action || "",
          type: params.type || "",
        },
        pagination: {
          page: data?.page || 1,
          limit: data?.limit || 20,
          total: data?.total || 0,
          totalPages: data?.totalPages || 0,
          count: data?.count || 0,
        },
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        error: error.message || "Failed to fetch fabric logs by code",
      });
      return null;
    }
  },

  /* ============================================================
     GET SINGLE LOG
  ============================================================ */
  fetchFabricLogById: async (id) => {
    try {
      set({ loading: true, error: null, success: null });

      const res = await fetch(`${BASE_URL}/api/fabric-logs/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch fabric log");
      }

      set({
        selectedLog: data?.data || null,
        loading: false,
      });

      return data?.data || null;
    } catch (error) {
      set({
        loading: false,
        error: error.message || "Failed to fetch fabric log",
      });
      return null;
    }
  },

  /* ============================================================
     CREATE STOCK LOG
  ============================================================ */
  createFabricStockLog: async (payload = {}) => {
    try {
      set({ creating: true, error: null, success: null });

      const res = await fetch(`${BASE_URL}/api/fabric-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await getErrorMessage(
          res,
          "Failed to create fabric stock log"
        );
        throw new Error(message);
      }

      const data = await res.json();

      set({
        creating: false,
        success: data?.message || "Fabric stock log created successfully",
      });

      const currentCode = get().codeFilters.code;

      if (payload?.code && currentCode && payload.code === currentCode) {
        await get().fetchFabricLogsByCode(currentCode);
      } else {
        await get().fetchFabricLogs();
      }

      return data;
    } catch (error) {
      set({
        creating: false,
        error: error.message || "Failed to create fabric stock log",
      });
      return null;
    }
  },
}));