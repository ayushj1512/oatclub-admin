"use client";

import { create } from "zustand";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

const API_BASE = `${BASE_URL}/api/barcodes`;

/* =========================================================
   HELPERS
========================================================= */

const getErrorMessage = async (
  response,
  fallback = "Something went wrong"
) => {
  try {
    const data = await response.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const normalizeBarcodeItem = (item = {}) => ({
  ...item,
  productId: String(item?.productId || ""),
  size: String(item?.size || ""),
  price: Number(item?.price || 0),
  serialNumber: Number(item?.serialNumber || 0),
  serialCode: String(item?.serialCode || ""),
  barcode: String(item?.barcode || ""),
});

/* =========================================================
   STORE
========================================================= */

export const useBarcodeStore = create((set, get) => ({
  /* ================= DATA ================= */

  items: [],
  selectedItem: null,
  scannedItem: null,

  /* ================= PAGINATION ================= */

  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },

  /* ================= FILTERS ================= */

  filters: {
    q: "",
    productId: "",
    size: "",
    price: "",
    serialNumber: "",
    page: 1,
    limit: 50,
  },

  /* ================= LOADING ================= */

  loading: false,
  creating: false,
  batchCreating: false,
  scanning: false,
  updating: false,
  deleting: false,

  /* ================= ERROR ================= */

  error: "",
  successMessage: "",

  /* =========================================================
     BASIC STATE ACTIONS
  ========================================================= */

  setFilters: (updates = {}) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...updates,
      },
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        q: "",
        productId: "",
        size: "",
        price: "",
        serialNumber: "",
        page: 1,
        limit: 50,
      },
    });
  },

  setSelectedItem: (item) => {
    set({
      selectedItem: item
        ? normalizeBarcodeItem(item)
        : null,
    });
  },

  clearSelectedItem: () => {
    set({
      selectedItem: null,
    });
  },

  clearScannedItem: () => {
    set({
      scannedItem: null,
    });
  },

  clearMessages: () => {
    set({
      error: "",
      successMessage: "",
    });
  },

  /* =========================================================
     FETCH BARCODE ITEMS
  ========================================================= */

  fetchBarcodeItems: async (customFilters = {}) => {
    try {
      set({
        loading: true,
        error: "",
      });

      const filters = {
        ...get().filters,
        ...customFilters,
      };

      const query = buildQueryString(filters);

      const response = await fetch(`${API_BASE}${query}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to fetch barcode items"
          )
        );
      }

      const result = await response.json();

      const items = Array.isArray(result?.data)
        ? result.data.map(normalizeBarcodeItem)
        : [];

      set({
        items,
        pagination: {
          page: result?.pagination?.page || 1,
          limit: result?.pagination?.limit || 50,
          total: result?.pagination?.total || 0,
          pages: result?.pagination?.pages || 0,
          hasNextPage:
            result?.pagination?.hasNextPage || false,
          hasPreviousPage:
            result?.pagination?.hasPreviousPage ||
            false,
        },
        filters,
        loading: false,
      });

      return result;
    } catch (error) {
      set({
        loading: false,
        error:
          error?.message ||
          "Failed to fetch barcode items",
      });

      throw error;
    }
  },

  /* =========================================================
     CREATE SINGLE BARCODE
  ========================================================= */

  createBarcodeItem: async ({
    productId,
    size,
    price,
  }) => {
    try {
      set({
        creating: true,
        error: "",
        successMessage: "",
      });

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: String(productId || "").trim(),
          size: String(size || "")
            .trim()
            .toUpperCase(),
          price: Number(price),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to create barcode"
          )
        );
      }

      const result = await response.json();
      const item = normalizeBarcodeItem(result?.data);

      set((state) => ({
        items: [item, ...state.items],
        selectedItem: item,
        creating: false,
        successMessage:
          result?.message ||
          "Barcode created successfully",
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));

      return item;
    } catch (error) {
      set({
        creating: false,
        error:
          error?.message ||
          "Failed to create barcode",
      });

      throw error;
    }
  },

  /* =========================================================
     CREATE BARCODE BATCH
  ========================================================= */

  createBarcodeBatch: async ({
    productId,
    size,
    price,
    quantity,
  }) => {
    try {
      set({
        batchCreating: true,
        error: "",
        successMessage: "",
      });

      const response = await fetch(
        `${API_BASE}/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: String(productId || "").trim(),
            size: String(size || "")
              .trim()
              .toUpperCase(),
            price: Number(price),
            quantity: Number(quantity),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to create barcode batch"
          )
        );
      }

      const result = await response.json();

      const createdItems = Array.isArray(result?.data)
        ? result.data.map(normalizeBarcodeItem)
        : [];

      set((state) => ({
        items: [
          ...createdItems.reverse(),
          ...state.items,
        ],
        batchCreating: false,
        successMessage:
          result?.message ||
          `${createdItems.length} barcodes created`,
        pagination: {
          ...state.pagination,
          total:
            state.pagination.total +
            createdItems.length,
        },
      }));

      return createdItems;
    } catch (error) {
      set({
        batchCreating: false,
        error:
          error?.message ||
          "Failed to create barcode batch",
      });

      throw error;
    }
  },

  /* =========================================================
     GET BARCODE BY ID
  ========================================================= */

  fetchBarcodeItemById: async (id) => {
    try {
      if (!id) {
        throw new Error(
          "Barcode item id is required"
        );
      }

      set({
        loading: true,
        error: "",
      });

      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to fetch barcode item"
          )
        );
      }

      const result = await response.json();
      const item = normalizeBarcodeItem(result?.data);

      set({
        selectedItem: item,
        loading: false,
      });

      return item;
    } catch (error) {
      set({
        loading: false,
        error:
          error?.message ||
          "Failed to fetch barcode item",
      });

      throw error;
    }
  },

  /* =========================================================
     GET BY EXACT BARCODE
  ========================================================= */

  fetchByBarcode: async (barcodeText) => {
    try {
      const barcode = String(
        barcodeText || ""
      ).trim();

      if (!barcode) {
        throw new Error("Barcode is required");
      }

      set({
        loading: true,
        error: "",
      });

      const response = await fetch(
        `${API_BASE}/by-barcode/${encodeURIComponent(
          barcode
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Barcode item not found"
          )
        );
      }

      const result = await response.json();
      const item = normalizeBarcodeItem(result?.data);

      set({
        selectedItem: item,
        loading: false,
      });

      return item;
    } catch (error) {
      set({
        loading: false,
        error:
          error?.message ||
          "Failed to fetch barcode item",
      });

      throw error;
    }
  },

  /* =========================================================
     SCAN BARCODE
  ========================================================= */

  scanBarcode: async (barcodeText) => {
    try {
      const barcode = String(
        barcodeText || ""
      ).trim();

      if (!barcode) {
        throw new Error("Barcode is required");
      }

      set({
        scanning: true,
        error: "",
        successMessage: "",
        scannedItem: null,
      });

      const response = await fetch(
        `${API_BASE}/scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            barcodeText: barcode,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Barcode scan failed"
          )
        );
      }

      const result = await response.json();
      const item = normalizeBarcodeItem(result?.data);

      set({
        scannedItem: item,
        selectedItem: item,
        scanning: false,
        successMessage:
          result?.message ||
          "Barcode scanned successfully",
      });

      return item;
    } catch (error) {
      set({
        scanning: false,
        scannedItem: null,
        error:
          error?.message || "Barcode scan failed",
      });

      throw error;
    }
  },

  /* =========================================================
     UPDATE BARCODE ITEM
  ========================================================= */

  updateBarcodeItem: async (id, payload = {}) => {
    try {
      if (!id) {
        throw new Error(
          "Barcode item id is required"
        );
      }

      set({
        updating: true,
        error: "",
        successMessage: "",
      });

      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to update barcode item"
          )
        );
      }

      const result = await response.json();
      const updatedItem =
        normalizeBarcodeItem(result?.data);

      set((state) => ({
        items: state.items.map((item) =>
          item._id === id ? updatedItem : item
        ),
        selectedItem:
          state.selectedItem?._id === id
            ? updatedItem
            : state.selectedItem,
        scannedItem:
          state.scannedItem?._id === id
            ? updatedItem
            : state.scannedItem,
        updating: false,
        successMessage:
          result?.message ||
          "Barcode item updated",
      }));

      return updatedItem;
    } catch (error) {
      set({
        updating: false,
        error:
          error?.message ||
          "Failed to update barcode item",
      });

      throw error;
    }
  },

  /* =========================================================
     DELETE BARCODE ITEM
  ========================================================= */

  deleteBarcodeItem: async (id) => {
    try {
      if (!id) {
        throw new Error(
          "Barcode item id is required"
        );
      }

      set({
        deleting: true,
        error: "",
        successMessage: "",
      });

      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Failed to delete barcode item"
          )
        );
      }

      const result = await response.json();

      set((state) => ({
        items: state.items.filter(
          (item) => item._id !== id
        ),
        selectedItem:
          state.selectedItem?._id === id
            ? null
            : state.selectedItem,
        scannedItem:
          state.scannedItem?._id === id
            ? null
            : state.scannedItem,
        deleting: false,
        successMessage:
          result?.message ||
          "Barcode item deleted",
        pagination: {
          ...state.pagination,
          total: Math.max(
            0,
            state.pagination.total - 1
          ),
        },
      }));

      return result?.data;
    } catch (error) {
      set({
        deleting: false,
        error:
          error?.message ||
          "Failed to delete barcode item",
      });

      throw error;
    }
  },

  /* =========================================================
     BARCODE IMAGE URLS
  ========================================================= */

  getBarcodePngUrl: (
    id,
    {
      displayValue = true,
      scale = 3,
      height = 12,
    } = {}
  ) => {
    if (!id) return "";

    const query = buildQueryString({
      displayValue,
      scale,
      height,
    });

    return `${API_BASE}/${encodeURIComponent(
      id
    )}/barcode.png${query}`;
  },

  getPreviewBarcodePngUrl: ({
    productId,
    size,
    price,
    serialNumber,
    displayValue = true,
  }) => {
    const query = buildQueryString({
      productId,
      size,
      price,
      serialNumber,
      displayValue,
    });

    return `${API_BASE}/generate.png${query}`;
  },

  /* =========================================================
     PAGINATION ACTIONS
  ========================================================= */

  goToPage: async (page) => {
    const nextPage = Math.max(1, Number(page) || 1);

    get().setFilters({
      page: nextPage,
    });

    return get().fetchBarcodeItems({
      page: nextPage,
    });
  },

  nextPage: async () => {
    const { pagination } = get();

    if (!pagination.hasNextPage) return;

    return get().goToPage(
      pagination.page + 1
    );
  },

  previousPage: async () => {
    const { pagination } = get();

    if (!pagination.hasPreviousPage) return;

    return get().goToPage(
      pagination.page - 1
    );
  },

  /* =========================================================
     RESET STORE
  ========================================================= */

  resetBarcodeStore: () => {
    set({
      items: [],
      selectedItem: null,
      scannedItem: null,

      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },

      filters: {
        q: "",
        productId: "",
        size: "",
        price: "",
        serialNumber: "",
        page: 1,
        limit: 50,
      },

      loading: false,
      creating: false,
      batchCreating: false,
      scanning: false,
      updating: false,
      deleting: false,

      error: "",
      successMessage: "",
    });
  },
}));