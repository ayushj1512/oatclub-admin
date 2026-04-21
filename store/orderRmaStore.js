"use client";

import { create } from "zustand";
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000";

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  startDate: "",
  endDate: "",
  type: "",
  status: "",
  reason: "",
  search: "",
  sortBy: "totalRmaQty",
  sortOrder: "desc",
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

export const useOrderRmaStore = create((set, get) => ({
  groupedProducts: [],
  loadingGroupedProducts: false,
  groupedProductsError: "",
  groupedProductsFilters: { ...DEFAULT_FILTERS },
  groupedProductsPagination: { ...DEFAULT_PAGINATION },

  setGroupedProductsFilters: (updates = {}) =>
    set((state) => ({
      groupedProductsFilters: {
        ...state.groupedProductsFilters,
        ...updates,
      },
    })),

  resetGroupedProductsFilters: () =>
    set({
      groupedProductsFilters: { ...DEFAULT_FILTERS },
    }),

  clearGroupedProducts: () =>
    set({
      groupedProducts: [],
      groupedProductsError: "",
      groupedProductsPagination: { ...DEFAULT_PAGINATION },
    }),

  getGroupedRmaProducts: async (customFilters = {}) => {
    try {
      set({
        loadingGroupedProducts: true,
        groupedProductsError: "",
      });

      const mergedFilters = {
        ...get().groupedProductsFilters,
        ...customFilters,
      };

      const queryString = toQueryString(mergedFilters);
      const url = `${API_BASE}/api/orders/rma/grouped-by-product-code${
        queryString ? `?${queryString}` : ""
      }`;

      const { data } = await axios.get(url, {
        withCredentials: true,
      });

      set({
        groupedProducts: Array.isArray(data?.data) ? data.data : [],
        groupedProductsPagination: data?.pagination
          ? {
              page: Number(data.pagination.page || mergedFilters.page || 1),
              limit: Number(data.pagination.limit || mergedFilters.limit || 20),
              total: Number(data.pagination.total || 0),
              totalPages: Number(data.pagination.totalPages || 1),
              hasNextPage: Boolean(data.pagination.hasNextPage),
              hasPrevPage: Boolean(data.pagination.hasPrevPage),
            }
          : {
              ...DEFAULT_PAGINATION,
              page: Number(mergedFilters.page || 1),
              limit: Number(mergedFilters.limit || 20),
            },
        groupedProductsFilters: mergedFilters,
        loadingGroupedProducts: false,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch grouped RMA products";

      set({
        loadingGroupedProducts: false,
        groupedProductsError: message,
        groupedProducts: [],
      });

      return {
        success: false,
        message,
      };
    }
  },

  refreshGroupedRmaProducts: async () => {
    const filters = get().groupedProductsFilters;
    return get().getGroupedRmaProducts(filters);
  },
}));