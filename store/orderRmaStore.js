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
  isFulfilled: "",
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
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

const normalizePagination = (
  pagination = {},
  filters = {}
) => ({
  page: Number(
    pagination?.page ||
    filters?.page ||
    1
  ),
  limit: Number(
    pagination?.limit ||
    filters?.limit ||
    20
  ),
  total: Number(
    pagination?.total || 0
  ),
  totalPages: Number(
    pagination?.totalPages || 1
  ),
  hasNextPage: Boolean(
    pagination?.hasNextPage
  ),
  hasPrevPage: Boolean(
    pagination?.hasPrevPage
  ),
});

export const useOrderRmaStore = create(
  (set, get) => ({
    groupedProducts: [],

    loadingGroupedProducts: false,

    groupedProductsError: "",

    groupedProductsFilters: {
      ...DEFAULT_FILTERS,
    },

    groupedProductsPagination: {
      ...DEFAULT_PAGINATION,
    },

    setGroupedProductsFilters: (
      updates = {}
    ) =>
      set((state) => ({
        groupedProductsFilters: {
          ...state.groupedProductsFilters,
          ...updates,
        },
      })),

    resetGroupedProductsFilters: () =>
      set({
        groupedProductsFilters: {
          ...DEFAULT_FILTERS,
        },

        groupedProductsPagination: {
          ...DEFAULT_PAGINATION,
        },

        groupedProductsError: "",
      }),

    clearGroupedProducts: () =>
      set({
        groupedProducts: [],
        groupedProductsError: "",

        groupedProductsPagination: {
          ...DEFAULT_PAGINATION,
        },
      }),

    getGroupedRmaProducts: async (
      customFilters = {}
    ) => {
      try {
        set({
          loadingGroupedProducts: true,
          groupedProductsError: "",
        });

        const mergedFilters = {
          ...get().groupedProductsFilters,
          ...customFilters,
        };

        const queryString =
          toQueryString(mergedFilters);

        const url =
          `${API_BASE}/api/orders/rma/grouped-by-product-code` +
          (queryString
            ? `?${queryString}`
            : "");

        const { data } =
          await axios.get(url, {
            withCredentials: true,
          });

        const products =
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(
              data?.products
            )
              ? data.products
              : [];

        const pagination =
          data?.pagination
            ? normalizePagination(
              data.pagination,
              mergedFilters
            )
            : {
              ...DEFAULT_PAGINATION,

              page: Number(
                mergedFilters.page || 1
              ),

              limit: Number(
                mergedFilters.limit ||
                20
              ),
            };

        set({
          groupedProducts: products,

          groupedProductsPagination:
            pagination,

          groupedProductsFilters:
            mergedFilters,

          loadingGroupedProducts:
            false,

          groupedProductsError: "",
        });

        return data;
      } catch (error) {
        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          "Failed to fetch grouped RMA products";

        set({
          loadingGroupedProducts:
            false,

          groupedProductsError:
            message,

          groupedProducts: [],

          groupedProductsPagination: {
            ...DEFAULT_PAGINATION,
          },
        });

        return {
          success: false,
          message,
        };
      }
    },

    setFulfilledFilter: (
      isFulfilled
    ) => {
      const value =
        isFulfilled === true
          ? "true"
          : isFulfilled === false
            ? "false"
            : "";

      set((state) => ({
        groupedProductsFilters: {
          ...state.groupedProductsFilters,

          isFulfilled: value,

          page: 1,
        },
      }));
    },

    refreshGroupedRmaProducts:
      async () =>
        get().getGroupedRmaProducts(
          get().groupedProductsFilters
        ),
  })
);
