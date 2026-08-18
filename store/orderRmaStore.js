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

/* =========================================================
   HELPERS
========================================================= */

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

const csvValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return '""';
  }

  const text = Array.isArray(value)
    ? value.join(", ")
    : String(value);

  return `"${text.replace(/"/g, '""')}"`;
};

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getExchangeAttribute = (
  attributes = [],
  keys = []
) => {
  const wanted = keys.map((key) =>
    String(key).toLowerCase()
  );

  const found = (
    Array.isArray(attributes)
      ? attributes
      : []
  ).find((item) =>
    wanted.includes(
      String(item?.key || "")
        .trim()
        .toLowerCase()
    )
  );

  return found?.value || "";
};

/* =========================================================
   STORE
========================================================= */

export const useOrderRmaStore = create(
  (set, get) => ({
    groupedProducts: [],

    loadingGroupedProducts: false,
    exportingGroupedProducts: false,

    groupedProductsError: "",
    groupedProductsExportError: "",

    groupedProductsFilters: {
      ...DEFAULT_FILTERS,
    },

    groupedProductsPagination: {
      ...DEFAULT_PAGINATION,
    },

    /* =====================================================
       FILTERS
    ===================================================== */

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
        groupedProductsExportError: "",
      }),

    clearGroupedProducts: () =>
      set({
        groupedProducts: [],
        groupedProductsError: "",

        groupedProductsPagination: {
          ...DEFAULT_PAGINATION,
        },
      }),

    /* =====================================================
       FETCH GROUPED PRODUCTS
    ===================================================== */

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
            : [];

        const pagination =
          normalizePagination(
            data?.pagination,
            mergedFilters
          );

        set({
          groupedProducts: products,

          groupedProductsPagination:
            pagination,

          groupedProductsFilters:
            mergedFilters,

          loadingGroupedProducts: false,

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
          loadingGroupedProducts: false,

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

    /* =====================================================
       EXPORT ALL FILTERED RMA DATA CSV
       - fetches ALL pages
       - 1 RMA item = 1 row
    ===================================================== */

    exportGroupedRmaCsv: async () => {
      try {
        set({
          exportingGroupedProducts: true,
          groupedProductsExportError: "",
        });

        const filters = {
          ...get().groupedProductsFilters,

          page: 1,

          // backend max is 200
          limit: 200,
        };

        const allProducts = [];

        let page = 1;
        let totalPages = 1;

        do {
          const queryString =
            toQueryString({
              ...filters,
              page,
            });

          const { data } =
            await axios.get(
              `${API_BASE}/api/orders/rma/grouped-by-product-code?${queryString}`,
              {
                withCredentials: true,
              }
            );

          const products =
            Array.isArray(data?.data)
              ? data.data
              : [];

          allProducts.push(
            ...products
          );

          totalPages = Math.max(
            1,
            Number(
              data?.pagination
                ?.totalPages || 1
            )
          );

          page += 1;
        } while (page <= totalPages);

        if (!allProducts.length) {
          throw new Error(
            "No RMA data found for export"
          );
        }

        /* ===============================================
           CSV HEADERS
        =============================================== */

        const headers = [
          "RMA Number",

          "Order Number",
          "Order Date",
          "Order Created At",

          "Delivered At",
          "Packed At",
          "Shipped At",

          "Product Code",
          "Product Name",

          "Product Size",
          "Product Color",
          "Variant SKU",

          "RMA Quantity",
          "Product Price",
          "Product Subtotal",
          "Product Discount",
          "Product Tax",

          "Return / Exchange",
          "Reason",
          "RMA Status",
          "Resolution",
          "RMA Fulfilled",

          "Customer Note",
          "Admin Note",

          "RMA Created At",
          "RMA Updated At",

          "Customer Name",
          "Customer Phone",
          "Customer Email",
          "Customer City",
          "Customer State",
          "Customer Pincode",

          "Payment Method",
          "Payment Status",
          "Fulfillment Status",

          "Order Final Payable",
          "Order Subtotal",
          "Order Discount",
          "Shipping Fee",
          "Order Tax",

          "Exchange New Size",
          "Exchange New Color",
          "Exchange Variant SKU",
          "Exchange Note",

          "Exchange Fee",
          "Exchange Fee Status",

          "Refund Amount",
          "Refund Mode",
          "Refund Status",
          "Refund Reference",

          "Reverse Courier",
          "Reverse AWB",
          "Reverse Status",
          "Reverse Tracking URL",
          "Reverse Freight Charge",

          "Reverse Pickup Scheduled At",
          "Reverse Expected Pickup At",
          "Reverse Picked At",
          "Reverse In Transit At",
          "Reverse Received At",

          "Order Source",
          "Order Type",
        ];

        /* ===============================================
           FLATTEN PRODUCT -> RMA ROWS
        =============================================== */

        const rows =
          allProducts.flatMap(
            (product) => {
              const rmas =
                Array.isArray(
                  product?.recentRmas
                )
                  ? product.recentRmas
                  : [];

              return rmas.map(
                (rma) => {
                  const exchangeSize =
                    getExchangeAttribute(
                      rma?.exchangeAttributes,
                      ["size", "sizes"]
                    );

                  const exchangeColor =
                    getExchangeAttribute(
                      rma?.exchangeAttributes,
                      [
                        "color",
                        "colour",
                      ]
                    );

                  return [
                    rma?.rmaNumber,

                    rma?.orderNumber,
                    formatDate(
                      rma?.orderDate
                    ),
                    formatDate(
                      rma?.orderCreatedAt
                    ),

                    formatDate(
                      rma?.deliveredAt
                    ),
                    formatDate(
                      rma?.packedAt
                    ),
                    formatDate(
                      rma?.shippedAt
                    ),

                    rma?.productCode ||
                    product?.productCode,

                    rma?.productName ||
                    product?.title,

                    rma?.productSize,
                    rma?.productColor,
                    rma?.variantSku,

                    rma?.quantity,
                    rma?.productPrice,
                    rma?.productSubtotal,
                    rma?.productDiscount,
                    rma?.productTax,

                    rma?.type,
                    rma?.reason,
                    rma?.status,
                    rma?.resolution,
                    rma?.isFulfilled
                      ? "Yes"
                      : "No",

                    rma?.customerNote,
                    rma?.adminNote,

                    formatDate(
                      rma?.rmaCreatedAt
                    ),

                    formatDate(
                      rma?.rmaUpdatedAt
                    ),

                    rma?.customerName,
                    rma?.customerPhone,
                    rma?.customerEmail,
                    rma?.customerCity,
                    rma?.customerState,
                    rma?.customerPincode,

                    rma?.paymentMethod,
                    rma?.paymentStatus,
                    rma?.fulfillmentStatus,

                    rma?.orderFinalPayable,
                    rma?.orderSubtotal,
                    rma?.orderDiscount,
                    rma?.orderShippingFee,
                    rma?.orderTax,

                    exchangeSize,
                    exchangeColor,

                    rma?.exchangeVariantSku,
                    rma?.exchangeNote,

                    rma?.exchangeFeeAmount,
                    rma?.exchangeFeeStatus,

                    rma?.refundAmount,
                    rma?.refundMode,
                    rma?.refundStatus,
                    rma?.refundReferenceId,

                    rma?.reverseCourierName,
                    rma?.reverseAwb,
                    rma?.reverseStatus,
                    rma?.reverseTrackingUrl,
                    rma?.reverseFreightCharge,

                    formatDate(
                      rma?.reversePickupScheduledAt
                    ),

                    formatDate(
                      rma?.reverseExpectedPickupAt
                    ),

                    formatDate(
                      rma?.reversePickedAt
                    ),

                    formatDate(
                      rma?.reverseInTransitAt
                    ),

                    formatDate(
                      rma?.reverseReceivedAt
                    ),

                    rma?.source,
                    rma?.orderType,
                  ];
                }
              );
            }
          );

        if (!rows.length) {
          throw new Error(
            "No RMA rows found for export"
          );
        }

        /* ===============================================
           GENERATE CSV
        =============================================== */

        const csv = [
          headers
            .map(csvValue)
            .join(","),

          ...rows.map((row) =>
            row
              .map(csvValue)
              .join(",")
          ),
        ].join("\n");

        const blob = new Blob(
          [
            // BOM -> Excel opens UTF-8 properly
            "\uFEFF",
            csv,
          ],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        const date =
          new Date()
            .toISOString()
            .slice(0, 10);

        link.href = url;

        link.download =
          `rma-master-report-${date}.csv`;

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        set({
          exportingGroupedProducts:
            false,

          groupedProductsExportError:
            "",
        });

        return {
          success: true,
          rows: rows.length,
          products:
            allProducts.length,
        };
      } catch (error) {
        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          "Failed to export RMA report";

        set({
          exportingGroupedProducts:
            false,

          groupedProductsExportError:
            message,
        });

        return {
          success: false,
          message,
        };
      }
    },

    /* =====================================================
       FULFILLED FILTER
    ===================================================== */

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

    /* =====================================================
       REFRESH
    ===================================================== */

    refreshGroupedRmaProducts:
      async () =>
        get().getGroupedRmaProducts(
          get()
            .groupedProductsFilters
        ),
  })
);
