"use client";

import { create } from "zustand";
import axios from "axios";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/packaging-evidence`,
  withCredentials: true,
  timeout: 30000,
});

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

export const usePackagingEvidenceStore = create((set, get) => ({
  // Order recording
  order: null,
  recordingDetails: null,

  // Evidence records
  evidenceList: [],
  orderEvidence: [],
  selectedEvidence: null,

  // Statistics
  stats: {
    summary: {
      total: 0,
      forward: 0,
      rto: 0,
      totalSizeBytes: 0,
      totalDurationSeconds: 0,
    },
    stations: [],
  },

  pagination: initialPagination,

  filters: {
    orderNumber: "",
    awb: "",
    evidenceType: "",
    stationName: "",
    status: "",
  },

  loadingOrder: false,
  loadingList: false,
  loadingOrderEvidence: false,
  loadingEvidence: false,
  loadingStats: false,
  savingEvidence: false,
  updatingStatus: false,

  error: "",
  successMessage: "",

  setFilters: (values) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...values,
      },
    })),

  resetFilters: () =>
    set({
      filters: {
        orderNumber: "",
        awb: "",
        evidenceType: "",
        stationName: "",
        status: "",
      },
      pagination: initialPagination,
    }),

  clearMessages: () =>
    set({
      error: "",
      successMessage: "",
    }),

  clearCurrentOrder: () =>
    set({
      order: null,
      recordingDetails: null,
      orderEvidence: [],
      error: "",
      successMessage: "",
    }),

  clearSelectedEvidence: () =>
    set({
      selectedEvidence: null,
    }),

  /*
   * Fetch order before recording.
   *
   * evidenceType:
   * - forward
   * - rto
   */
  lookupOrder: async ({
    orderNumber,
    evidenceType = "forward",
    rmaNumber = "",
  }) => {
    const normalizedOrderNumber = String(orderNumber || "")
      .trim()
      .replace(/^#/, "")
      .toUpperCase();

    if (!normalizedOrderNumber) {
      set({
        error: "Order number is required.",
      });

      return {
        success: false,
        message: "Order number is required.",
      };
    }

    set({
      loadingOrder: true,
      order: null,
      recordingDetails: null,
      error: "",
      successMessage: "",
    });

    try {
      const response = await api.get(
        `/lookup/${encodeURIComponent(normalizedOrderNumber)}`,
        {
          params: {
            evidenceType,
            ...(rmaNumber ? { rmaNumber } : {}),
          },
        },
      );

      const payload = response.data?.data || {};

      set({
        order: payload.order || null,
        recordingDetails: payload.evidence || null,
        loadingOrder: false,
      });

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to fetch order.",
      );

      set({
        loadingOrder: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  /*
   * Call this only after local recorder confirms
   * that the video has been written successfully.
   */
  createEvidence: async (payload) => {
    set({
      savingEvidence: true,
      error: "",
      successMessage: "",
    });

    try {
      const response = await api.post("/", payload);
      const evidence = response.data?.data;

      set((state) => ({
        savingEvidence: false,
        selectedEvidence: evidence || null,
        successMessage:
          response.data?.message ||
          "Packaging evidence saved successfully.",

        evidenceList: evidence
          ? [
            evidence,
            ...state.evidenceList.filter(
              (item) => item._id !== evidence._id,
            ),
          ]
          : state.evidenceList,

        orderEvidence: evidence
          ? [
            evidence,
            ...state.orderEvidence.filter(
              (item) => item._id !== evidence._id,
            ),
          ]
          : state.orderEvidence,
      }));

      return {
        success: true,
        data: evidence,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to save packaging evidence.",
      );

      set({
        savingEvidence: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  fetchEvidenceList: async (options = {}) => {
    const state = get();

    const page =
      Number(options.page) ||
      Number(state.pagination.page) ||
      1;

    const limit =
      Number(options.limit) ||
      Number(state.pagination.limit) ||
      20;

    const filters = {
      ...state.filters,
      ...(options.filters || {}),
    };

    const params = {
      page,
      limit,
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        params[key] = String(value).trim();
      }
    });

    set({
      loadingList: true,
      error: "",
    });

    try {
      const response = await api.get("/", { params });

      set({
        evidenceList: response.data?.data || [],
        pagination:
          response.data?.pagination || initialPagination,
        loadingList: false,
      });

      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to fetch packaging evidence.",
      );

      set({
        loadingList: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  fetchOrderEvidence: async (orderNumber) => {
    const normalizedOrderNumber = String(orderNumber || "")
      .trim()
      .replace(/^#/, "")
      .toUpperCase();

    if (!normalizedOrderNumber) {
      set({
        error: "Order number is required.",
      });

      return {
        success: false,
        message: "Order number is required.",
      };
    }

    set({
      loadingOrderEvidence: true,
      error: "",
    });

    try {
      const response = await api.get(
        `/order/${encodeURIComponent(normalizedOrderNumber)}`,
      );

      const records = response.data?.data || [];

      set({
        orderEvidence: records,
        loadingOrderEvidence: false,
      });

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to fetch order evidence.",
      );

      set({
        loadingOrderEvidence: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  fetchEvidenceById: async (evidenceId) => {
    if (!evidenceId) {
      return {
        success: false,
        message: "Evidence ID is required.",
      };
    }

    set({
      loadingEvidence: true,
      selectedEvidence: null,
      error: "",
    });

    try {
      const response = await api.get(`/${evidenceId}`);
      const evidence = response.data?.data || null;

      set({
        selectedEvidence: evidence,
        loadingEvidence: false,
      });

      return {
        success: true,
        data: evidence,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to fetch evidence details.",
      );

      set({
        loadingEvidence: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  updateEvidenceStatus: async (
    evidenceId,
    status,
    failureReason = "",
  ) => {
    if (!evidenceId) {
      return {
        success: false,
        message: "Evidence ID is required.",
      };
    }

    set({
      updatingStatus: true,
      error: "",
      successMessage: "",
    });

    try {
      const response = await api.patch(
        `/${evidenceId}/status`,
        {
          status,
          failureReason,
        },
      );

      const updatedEvidence = response.data?.data;

      set((state) => ({
        updatingStatus: false,
        selectedEvidence:
          state.selectedEvidence?._id === evidenceId
            ? updatedEvidence
            : state.selectedEvidence,

        evidenceList: state.evidenceList.map((item) =>
          item._id === evidenceId
            ? updatedEvidence
            : item,
        ),

        orderEvidence: state.orderEvidence.map((item) =>
          item._id === evidenceId
            ? updatedEvidence
            : item,
        ),

        successMessage:
          response.data?.message ||
          "Evidence status updated.",
      }));

      return {
        success: true,
        data: updatedEvidence,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to update evidence status.",
      );

      set({
        updatingStatus: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  fetchStats: async (filters = {}) => {
    set({
      loadingStats: true,
      error: "",
    });

    try {
      const response = await api.get("/stats", {
        params: {
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
        },
      });

      const stats = response.data?.data || {};

      set({
        stats: {
          summary: stats.summary || {
            total: 0,
            forward: 0,
            rto: 0,
            totalSizeBytes: 0,
            totalDurationSeconds: 0,
          },
          stations: stats.stations || [],
        },
        loadingStats: false,
      });

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to fetch evidence statistics.",
      );

      set({
        loadingStats: false,
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },

  generateSessionId: async () => {
    try {
      const response = await api.get("/session");

      return {
        success: true,
        data: response.data?.data,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to generate recording session.",
      );

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    }
  },
}));
