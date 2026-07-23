"use client";

import { create } from "zustand";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

const API_BASE = `${BASE_URL}/api/barcodes`;

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_FILTERS = {
  q: "",
  productCode: "",
  size: "",
  uniqueId: "",
  sequence: "",
  variantSku: "",
  pieceSku: "",
  barcode: "",
  status: "",
  source: "",
  assignedOrderNumber: "",
  inwardBatchCode: "",
  product: "",
  variantId: "",
  vendor: "",
  sort: "newest",
  page: 1,
  limit: 50,
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

/* =========================================================
   HELPERS
========================================================= */

const normalizeText = (value = "") =>
  String(value ?? "").trim();

const normalizeUppercase = (value = "") =>
  normalizeText(value).toUpperCase();

const normalizeOptionalNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const normalizeOptionalId = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "object") {
    return value?._id || null;
  }

  return String(value).trim() || null;
};

const getErrorMessage = async (
  response,
  fallback = "Something went wrong"
) => {
  try {
    const data = await response.json();

    return (
      data?.message ||
      data?.error ||
      fallback
    );
  } catch {
    return fallback;
  }
};

const buildQueryString = (
  params = {}
) => {
  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        searchParams.set(
          key,
          String(value)
        );
      }
    }
  );

  const query =
    searchParams.toString();

  return query ? `?${query}` : "";
};

const normalizeAssignmentHistory = (
  history = []
) =>
  Array.isArray(history)
    ? history.map((entry) => ({
        ...entry,
        orderNumber:
          normalizeUppercase(
            entry?.orderNumber
          ),
        action: normalizeText(
          entry?.action
        ).toLowerCase(),
        note: normalizeText(
          entry?.note
        ),
        performedAt:
          entry?.performedAt || null,
      }))
    : [];

const normalizeBarcodeItem = (
  item = {}
) => ({
  ...item,

  _id: normalizeText(item?._id),

  product: item?.product || null,
  variantId:
    item?.variantId || null,

  productCode:
    normalizeUppercase(
      item?.productCode
    ),

  size: normalizeUppercase(
    item?.size
  ),

  variantSku:
    normalizeUppercase(
      item?.variantSku
    ),

  sequence:
    Number(item?.sequence || 0),

  uniqueId: normalizeText(
    item?.uniqueId
  ),

  pieceSku:
    normalizeUppercase(
      item?.pieceSku
    ),

  barcode:
    normalizeUppercase(
      item?.barcode
    ),

  priceSnapshot:
    normalizeOptionalNumber(
      item?.priceSnapshot
    ),

  mrpSnapshot:
    normalizeOptionalNumber(
      item?.mrpSnapshot
    ),

  status: normalizeText(
    item?.status
  ).toLowerCase(),

  assignedOrder:
    item?.assignedOrder || null,

  assignedOrderNumber:
    normalizeUppercase(
      item?.assignedOrderNumber
    ),

  assignedAt:
    item?.assignedAt || null,

  packedAt:
    item?.packedAt || null,

  shippedAt:
    item?.shippedAt || null,

  deliveredAt:
    item?.deliveredAt || null,

  assignmentHistory:
    normalizeAssignmentHistory(
      item?.assignmentHistory
    ),

  inwardBatchCode:
    normalizeUppercase(
      item?.inwardBatchCode
    ),

  inwardAt:
    item?.inwardAt || null,

  vendor: item?.vendor || null,

  source: normalizeText(
    item?.source
  ).toLowerCase(),

  notes: normalizeText(
    item?.notes
  ),

  createdAt:
    item?.createdAt || null,

  updatedAt:
    item?.updatedAt || null,
});

const normalizeCreatePayload = (
  payload = {}
) => ({
  product:
    normalizeOptionalId(
      payload.product
    ),

  variantId:
    normalizeOptionalId(
      payload.variantId
    ),

  productCode:
    normalizeUppercase(
      payload.productCode
    ),

  size:
    normalizeUppercase(
      payload.size
    ),

  priceSnapshot:
    normalizeOptionalNumber(
      payload.priceSnapshot
    ),

  mrpSnapshot:
    normalizeOptionalNumber(
      payload.mrpSnapshot
    ),

  inwardBatchCode:
    normalizeUppercase(
      payload.inwardBatchCode
    ),

  vendor:
    normalizeOptionalId(
      payload.vendor
    ),

  source:
    normalizeText(
      payload.source || "production"
    ).toLowerCase(),

  notes:
    normalizeText(
      payload.notes
    ),
});

const normalizeUpdatePayload = (
  payload = {}
) => {
  const update = {};

  if (payload.status !== undefined) {
    update.status = normalizeText(
      payload.status
    ).toLowerCase();
  }

  if (
    payload.priceSnapshot !==
    undefined
  ) {
    update.priceSnapshot =
      normalizeOptionalNumber(
        payload.priceSnapshot
      );
  }

  if (
    payload.mrpSnapshot !==
    undefined
  ) {
    update.mrpSnapshot =
      normalizeOptionalNumber(
        payload.mrpSnapshot
      );
  }

  if (
    payload.inwardBatchCode !==
    undefined
  ) {
    update.inwardBatchCode =
      normalizeUppercase(
        payload.inwardBatchCode
      );
  }

  if (
    payload.inwardAt !== undefined
  ) {
    update.inwardAt =
      payload.inwardAt || null;
  }

  if (payload.vendor !== undefined) {
    update.vendor =
      normalizeOptionalId(
        payload.vendor
      );
  }

  if (payload.source !== undefined) {
    update.source =
      normalizeText(
        payload.source
      ).toLowerCase();
  }

  if (payload.notes !== undefined) {
    update.notes =
      normalizeText(
        payload.notes
      );
  }

  return update;
};

/* =========================================================
   STORE
========================================================= */

export const useBarcodeStore = create(
  (set, get) => ({
    /* ================= DATA ================= */

    items: [],
    selectedItem: null,
    scannedItem: null,
    lastParsedScan: null,

    /* ================= PAGINATION ================= */

    pagination: {
      ...DEFAULT_PAGINATION,
    },

    /* ================= FILTERS ================= */

    filters: {
      ...DEFAULT_FILTERS,
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

    setFilter: (key, value) => {
      set((state) => ({
        filters: {
          ...state.filters,
          [key]: value,
        },
      }));
    },

    resetFilters: () => {
      set({
        filters: {
          ...DEFAULT_FILTERS,
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
        lastParsedScan: null,
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

    fetchBarcodeItems: async (
      customFilters = {}
    ) => {
      try {
        set({
          loading: true,
          error: "",
        });

        const filters = {
          ...get().filters,
          ...customFilters,
        };

        const query =
          buildQueryString(filters);

        const response = await fetch(
          `${API_BASE}${query}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(
              response,
              "Failed to fetch barcode items"
            )
          );
        }

        const result =
          await response.json();

        const items = Array.isArray(
          result?.data
        )
          ? result.data.map(
              normalizeBarcodeItem
            )
          : [];

        set({
          items,

          pagination: {
            page:
              result?.pagination?.page ||
              1,

            limit:
              result?.pagination?.limit ||
              50,

            total:
              result?.pagination?.total ||
              0,

            pages:
              result?.pagination?.pages ||
              0,

            hasNextPage: Boolean(
              result?.pagination
                ?.hasNextPage
            ),

            hasPreviousPage: Boolean(
              result?.pagination
                ?.hasPreviousPage
            ),
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
       CREATE SINGLE BARCODE ITEM
    ========================================================= */

    createBarcodeItem: async (
      payload = {}
    ) => {
      try {
        set({
          creating: true,
          error: "",
          successMessage: "",
        });

        const body =
          normalizeCreatePayload(
            payload
          );

        if (!body.productCode) {
          throw new Error(
            "Product code is required"
          );
        }

        if (!body.size) {
          throw new Error(
            "Size is required"
          );
        }

        const response = await fetch(
          API_BASE,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(
              response,
              "Failed to create barcode item"
            )
          );
        }

        const result =
          await response.json();

        const item =
          normalizeBarcodeItem(
            result?.data
          );

        set((state) => ({
          items: [
            item,
            ...state.items,
          ],

          selectedItem: item,
          creating: false,

          successMessage:
            result?.message ||
            "Barcode item created successfully",

          pagination: {
            ...state.pagination,
            total:
              state.pagination.total +
              1,
          },
        }));

        return item;
      } catch (error) {
        set({
          creating: false,

          error:
            error?.message ||
            "Failed to create barcode item",
        });

        throw error;
      }
    },

    /* =========================================================
       CREATE BARCODE BATCH
    ========================================================= */

    createBarcodeBatch: async (
      payload = {}
    ) => {
      try {
        set({
          batchCreating: true,
          error: "",
          successMessage: "",
        });

        const quantity = Number(
          payload.quantity
        );

        if (
          !Number.isSafeInteger(
            quantity
          ) ||
          quantity <= 0
        ) {
          throw new Error(
            "Quantity must be a positive integer"
          );
        }

        const body = {
          ...normalizeCreatePayload(
            payload
          ),

          quantity,
        };

        if (!body.productCode) {
          throw new Error(
            "Product code is required"
          );
        }

        if (!body.size) {
          throw new Error(
            "Size is required"
          );
        }

        const response = await fetch(
          `${API_BASE}/batch`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(body),
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

        const result =
          await response.json();

        const createdItems =
          Array.isArray(result?.data)
            ? result.data.map(
                normalizeBarcodeItem
              )
            : [];

        set((state) => ({
          items: [
            ...createdItems,
            ...state.items,
          ],

          batchCreating: false,

          successMessage:
            result?.message ||
            `${createdItems.length} barcode items created`,

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

    fetchBarcodeItemById: async (
      id
    ) => {
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
          `${API_BASE}/${encodeURIComponent(
            id
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
              "Failed to fetch barcode item"
            )
          );
        }

        const result =
          await response.json();

        const item =
          normalizeBarcodeItem(
            result?.data
          );

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

    fetchByBarcode: async (
      barcodeText
    ) => {
      try {
        const barcode =
          normalizeUppercase(
            barcodeText
          );

        if (!barcode) {
          throw new Error(
            "Barcode is required"
          );
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

        const result =
          await response.json();

        const item =
          normalizeBarcodeItem(
            result?.data
          );

        set({
          selectedItem: item,
          lastParsedScan:
            result?.parsed || null,
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

    scanBarcode: async (
      barcodeText
    ) => {
      try {
        const barcode =
          normalizeUppercase(
            barcodeText
          );

        if (!barcode) {
          throw new Error(
            "Barcode is required"
          );
        }

        set({
          scanning: true,
          error: "",
          successMessage: "",
          scannedItem: null,
          lastParsedScan: null,
        });

        const response = await fetch(
          `${API_BASE}/scan`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
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

        const result =
          await response.json();

        const item =
          normalizeBarcodeItem(
            result?.data
          );

        set({
          scannedItem: item,
          selectedItem: item,

          lastParsedScan:
            result?.parsed || null,

          scanning: false,

          successMessage:
            result?.message ||
            "Barcode scanned successfully",
        });

        return {
          item,
          parsed:
            result?.parsed || null,
          tracking:
            result?.tracking || null,
        };
      } catch (error) {
        set({
          scanning: false,
          scannedItem: null,
          lastParsedScan: null,

          error:
            error?.message ||
            "Barcode scan failed",
        });

        throw error;
      }
    },

    /* =========================================================
       UPDATE BARCODE ITEM
    ========================================================= */

    updateBarcodeItem: async (
      id,
      payload = {}
    ) => {
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

        const body =
          normalizeUpdatePayload(
            payload
          );

        const response = await fetch(
          `${API_BASE}/${encodeURIComponent(
            id
          )}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(body),
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

        const result =
          await response.json();

        const updatedItem =
          normalizeBarcodeItem(
            result?.data
          );

        set((state) => ({
          items: state.items.map(
            (item) =>
              item._id === id
                ? updatedItem
                : item
          ),

          selectedItem:
            state.selectedItem?._id ===
            id
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

    deleteBarcodeItem: async (
      id
    ) => {
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
          `${API_BASE}/${encodeURIComponent(
            id
          )}`,
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

        const result =
          await response.json();

        set((state) => ({
          items: state.items.filter(
            (item) =>
              item._id !== id
          ),

          selectedItem:
            state.selectedItem?._id ===
            id
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
              state.pagination.total -
                1
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
      if (!id) {
        return "";
      }

      const query =
        buildQueryString({
          displayValue,
          scale,
          height,
        });

      return `${API_BASE}/${encodeURIComponent(
        id
      )}/barcode.png${query}`;
    },

    /**
     * Preview only.
     *
     * This does not create or reserve a unique ID.
     *
     * Example:
     * 00034-M-29
     */
    getPreviewBarcodePngUrl: ({
      productCode,
      size,
      uniqueId,
      sequence,
      displayValue = true,
      scale = 3,
      height = 12,
    }) => {
      const query =
        buildQueryString({
          productCode:
            normalizeUppercase(
              productCode
            ),

          size:
            normalizeUppercase(size),

          uniqueId:
            uniqueId !== undefined &&
            uniqueId !== null &&
            uniqueId !== ""
              ? Number(uniqueId)
              : "",

          sequence:
            sequence !== undefined &&
            sequence !== null &&
            sequence !== ""
              ? Number(sequence)
              : "",

          displayValue,
          scale,
          height,
        });

      return `${API_BASE}/generate.png${query}`;
    },

    /* =========================================================
       PAGINATION ACTIONS
    ========================================================= */

    goToPage: async (page) => {
      const nextPage = Math.max(
        1,
        Number(page) || 1
      );

      get().setFilters({
        page: nextPage,
      });

      return get().fetchBarcodeItems({
        page: nextPage,
      });
    },

    nextPage: async () => {
      const { pagination } = get();

      if (
        !pagination.hasNextPage
      ) {
        return null;
      }

      return get().goToPage(
        pagination.page + 1
      );
    },

    previousPage: async () => {
      const { pagination } = get();

      if (
        !pagination.hasPreviousPage
      ) {
        return null;
      }

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
        lastParsedScan: null,

        pagination: {
          ...DEFAULT_PAGINATION,
        },

        filters: {
          ...DEFAULT_FILTERS,
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
  })
);