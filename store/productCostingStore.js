import { create } from "zustand";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      search.set(key, value);
    }
  });

  const query = search.toString();

  return query ? `?${query}` : "";
};

export const useProductCostingStore = create(
  (set, get) => ({
    /* =====================================================
       STATE
    ===================================================== */

    costings: [],
    currentCosting: null,
    currentProduct: null,

    loading: false,
    saving: false,
    deleting: false,
    error: null,

    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
    },

    filters: {
      q: "",
      productCode: "",

      minFabricCost: "",
      maxFabricCost: "",

      minStitchingCost: "",
      maxStitchingCost: "",

      minPackagingCost: "",
      maxPackagingCost: "",

      createdFrom: "",
      createdTo: "",

      updatedFrom: "",
      updatedTo: "",

      sortBy: "updatedAt",
      sortOrder: "desc",

      page: 1,
      limit: 50,
    },

    /* =====================================================
       FILTERS
    ===================================================== */

    setFilter: (key, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [key]: value,
          page:
            key === "page"
              ? value
              : 1,
        },
      })),

    setFilters: (values = {}) =>
      set((state) => ({
        filters: {
          ...state.filters,
          ...values,
        },
      })),

    resetFilters: () =>
      set({
        filters: {
          q: "",
          productCode: "",

          minFabricCost: "",
          maxFabricCost: "",

          minStitchingCost: "",
          maxStitchingCost: "",

          minPackagingCost: "",
          maxPackagingCost: "",

          createdFrom: "",
          createdTo: "",

          updatedFrom: "",
          updatedTo: "",

          sortBy: "updatedAt",
          sortOrder: "desc",

          page: 1,
          limit: 50,
        },
      }),

    /* =====================================================
       GET ALL
    ===================================================== */

    fetchCostings: async (
      extraParams = {},
    ) => {
      try {
        set({
          loading: true,
          error: null,
        });

        const params = {
          ...get().filters,
          ...extraParams,
        };

        const res = await fetch(
          `${BASE_URL}/api/product-costing${buildQuery(
            params,
          )}`,
          {
            cache: "no-store",
          },
        );

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.message ||
            "Failed to fetch product costings",
          );
        }

        set({
          costings: data.data || [],
          pagination:
            data.pagination || {
              page: 1,
              limit: 50,
              total: 0,
              pages: 0,
            },
        });

        return data;
      } catch (error) {
        set({
          error: error.message,
        });

        throw error;
      } finally {
        set({
          loading: false,
        });
      }
    },

    /* =====================================================
       GET SINGLE
    ===================================================== */

    fetchCostingByCode: async (
      productCode,
      params = {},
    ) => {
      try {
        if (!productCode) return null;

        set({
          loading: true,
          error: null,
        });

        const res = await fetch(
          `${BASE_URL}/api/product-costing/${encodeURIComponent(
            productCode,
          )}${buildQuery(params)}`,
          {
            cache: "no-store",
          },
        );

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.message ||
            "Failed to fetch product costing",
          );
        }

        set({
          currentCosting:
            data.costing || null,
          currentProduct:
            data.product || null,
        });

        return data;
      } catch (error) {
        set({
          error: error.message,
        });

        throw error;
      } finally {
        set({
          loading: false,
        });
      }
    },

    /* =====================================================
       SAVE / UPDATE
    ===================================================== */

    saveCosting: async (
      productCode,
      payload = {},
    ) => {
      try {
        if (!productCode) {
          throw new Error(
            "Product code is required",
          );
        }

        set({
          saving: true,
          error: null,
        });

        const res = await fetch(
          `${BASE_URL}/api/product-costing/${encodeURIComponent(
            productCode,
          )}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.message ||
            "Failed to save costing",
          );
        }

        set((state) => ({
          currentCosting:
            data.costing || null,

          costings:
            state.costings.some(
              (item) =>
                item.productCode ===
                productCode,
            )
              ? state.costings.map(
                (item) =>
                  item.productCode ===
                    productCode
                    ? {
                      ...item,
                      ...data.costing,
                    }
                    : item,
              )
              : state.costings,
        }));

        return data;
      } catch (error) {
        set({
          error: error.message,
        });

        throw error;
      } finally {
        set({
          saving: false,
        });
      }
    },

    /* =====================================================
       DELETE
    ===================================================== */

    deleteCosting: async (
      productCode,
    ) => {
      try {
        if (!productCode) return;

        set({
          deleting: true,
          error: null,
        });

        const res = await fetch(
          `${BASE_URL}/api/product-costing/${encodeURIComponent(
            productCode,
          )}`,
          {
            method: "DELETE",
          },
        );

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.message ||
            "Failed to delete costing",
          );
        }

        set((state) => ({
          costings:
            state.costings.filter(
              (item) =>
                item.productCode !==
                productCode,
            ),

          currentCosting:
            state.currentCosting
              ?.productCode ===
              productCode
              ? null
              : state.currentCosting,
        }));

        return data;
      } catch (error) {
        set({
          error: error.message,
        });

        throw error;
      } finally {
        set({
          deleting: false,
        });
      }
    },

    /* =====================================================
       LOCAL HELPERS
    ===================================================== */

    clearCurrentCosting: () =>
      set({
        currentCosting: null,
        currentProduct: null,
      }),

    clearError: () =>
      set({
        error: null,
      }),
  }),
);
