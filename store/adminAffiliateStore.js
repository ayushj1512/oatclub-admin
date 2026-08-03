"use client";

import { create } from "zustand";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000";

const getAdminToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("oatclub_admin_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

const buildHeaders = (hasBody = false) => {
  const token = getAdminToken();

  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, String(value));
    }
  });

  const value = query.toString();

  return value ? `?${value}` : "";
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message || "Affiliate request failed"
    );
  }

  return data;
};

const defaultFilters = {
  q: "",
  status: "",
  platform: "",
  state: "",
  couponCode: "",
  isActive: "",
  minRevenue: "",
  maxRevenue: "",
  minCommission: "",
  maxCommission: "",
  from: "",
  to: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 20,
};

const defaultOrderFilters = {
  q: "",
  paymentStatus: "",
  paymentMethod: "",
  fulfillmentStatus: "",
  commissionStatus: "",
  isConfirmed: "",
  orderType: "",
  from: "",
  to: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 20,
};

const defaultAffiliateForm = {
  name: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  state: "",
  platform: "instagram",

  socialLinks: {
    instagram: "",
    youtube: "",
    facebook: "",
    snapchat: "",
    twitter: "",
    linkedin: "",
    website: "",
  },

  coupon: {
    code: "",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 0,
    maxDiscount: 0,
    usageLimit: 0,
    usageLimitPerCustomer: 0,
    validFrom: "",
    validTill: "",
    description: "",
  },

  commission: {
    type: "percentage",
    value: 10,
    calculationBase: "final_payable",
    approvalTrigger: "delivered",
    holdDays: 7,
  },

  payoutAccount: {
    method: "upi",
    upiId: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  },

  notes: "",
  status: "active",
};

export const useAdminAffiliateStore = create(
  (set, get) => ({
    affiliates: [],
    affiliate: null,
    dashboard: null,
    orders: [],

    loading: false,
    detailLoading: false,
    dashboardLoading: false,
    ordersLoading: false,
    mutationLoading: false,

    error: "",
    message: "",

    filters: { ...defaultFilters },
    orderFilters: { ...defaultOrderFilters },

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },

    orderPagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },

    clearFeedback: () =>
      set({
        error: "",
        message: "",
      }),

    setFilters: (values = {}) =>
      set((state) => ({
        filters: {
          ...state.filters,
          ...values,
          page:
            values.page !== undefined
              ? values.page
              : values.q !== undefined ||
                values.status !== undefined ||
                values.platform !== undefined ||
                values.state !== undefined ||
                values.couponCode !== undefined ||
                values.isActive !== undefined ||
                values.from !== undefined ||
                values.to !== undefined
                ? 1
                : state.filters.page,
        },
      })),

    resetFilters: () =>
      set({
        filters: { ...defaultFilters },
      }),

    setOrderFilters: (values = {}) =>
      set((state) => ({
        orderFilters: {
          ...state.orderFilters,
          ...values,
          page:
            values.page !== undefined
              ? values.page
              : values.q !== undefined ||
                values.paymentStatus !== undefined ||
                values.paymentMethod !== undefined ||
                values.fulfillmentStatus !== undefined ||
                values.commissionStatus !== undefined ||
                values.isConfirmed !== undefined ||
                values.from !== undefined ||
                values.to !== undefined
                ? 1
                : state.orderFilters.page,
        },
      })),

    resetOrderFilters: () =>
      set({
        orderFilters: { ...defaultOrderFilters },
      }),

    fetchAffiliates: async (customFilters = {}) => {
      set({
        loading: true,
        error: "",
      });

      try {
        const filters = {
          ...get().filters,
          ...customFilters,
        };

        const response = await fetch(
          `${API_URL}/api/affiliates${buildQueryString(
            filters
          )}`,
          {
            headers: buildHeaders(),
            cache: "no-store",
          }
        );

        const data = await parseResponse(response);

        set({
          affiliates: data?.data || [],
          pagination: {
            ...get().pagination,
            ...(data?.pagination || {}),
          },
          filters,
          loading: false,
        });

        return data;
      } catch (error) {
        set({
          loading: false,
          error: error.message,
        });

        throw error;
      }
    },

    fetchAffiliateById: async (affiliateId) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        detailLoading: true,
        error: "",
        affiliate: null,
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}`,
          {
            headers: buildHeaders(),
            cache: "no-store",
          }
        );

        const data = await parseResponse(response);

        set({
          affiliate: data?.affiliate || null,
          detailLoading: false,
        });

        return data?.affiliate;
      } catch (error) {
        set({
          detailLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    createAffiliate: async (payload = {}) => {
      set({
        mutationLoading: true,
        error: "",
        message: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates`,
          {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(payload),
          }
        );

        const data = await parseResponse(response);

        set((state) => ({
          mutationLoading: false,
          message:
            data?.message ||
            "Affiliate created successfully",
          affiliates: data?.affiliate
            ? [data.affiliate, ...state.affiliates]
            : state.affiliates,
        }));

        return data;
      } catch (error) {
        set({
          mutationLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    updateAffiliate: async (
      affiliateId,
      payload = {}
    ) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        mutationLoading: true,
        error: "",
        message: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}`,
          {
            method: "PATCH",
            headers: buildHeaders(true),
            body: JSON.stringify(payload),
          }
        );

        const data = await parseResponse(response);
        const updatedAffiliate = data?.affiliate;

        set((state) => ({
          mutationLoading: false,
          message:
            data?.message ||
            "Affiliate updated successfully",

          affiliate:
            String(state.affiliate?._id) ===
              String(affiliateId)
              ? updatedAffiliate
              : state.affiliate,

          affiliates: state.affiliates.map((item) =>
            String(item?._id) === String(affiliateId)
              ? updatedAffiliate
              : item
          ),
        }));

        return data;
      } catch (error) {
        set({
          mutationLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    updateAffiliateStatus: async (
      affiliateId,
      payload = {}
    ) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        mutationLoading: true,
        error: "",
        message: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}/status`,
          {
            method: "PATCH",
            headers: buildHeaders(true),
            body: JSON.stringify(payload),
          }
        );

        const data = await parseResponse(response);
        const updatedAffiliate = data?.affiliate;

        set((state) => ({
          mutationLoading: false,
          message:
            data?.message ||
            "Affiliate status updated",

          affiliate:
            String(state.affiliate?._id) ===
              String(affiliateId)
              ? updatedAffiliate
              : state.affiliate,

          affiliates: state.affiliates.map((item) =>
            String(item?._id) === String(affiliateId)
              ? updatedAffiliate
              : item
          ),
        }));

        return data;
      } catch (error) {
        set({
          mutationLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    changeAffiliatePassword: async (
      affiliateId,
      newPassword
    ) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      if (!newPassword || newPassword.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters"
        );
      }

      set({
        mutationLoading: true,
        error: "",
        message: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}/password`,
          {
            method: "PATCH",
            headers: buildHeaders(true),
            body: JSON.stringify({ newPassword }),
          }
        );

        const data = await parseResponse(response);

        set({
          mutationLoading: false,
          message:
            data?.message ||
            "Password updated successfully",
        });

        return data;
      } catch (error) {
        set({
          mutationLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    fetchAffiliateDashboard: async (
      affiliateId,
      params = {}
    ) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        dashboardLoading: true,
        error: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}/dashboard${buildQueryString(
            params
          )}`,
          {
            headers: buildHeaders(),
            cache: "no-store",
          }
        );

        const data = await parseResponse(response);

        set({
          dashboard: data,
          dashboardLoading: false,
        });

        return data;
      } catch (error) {
        set({
          dashboardLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    fetchAffiliateOrders: async (
      affiliateId,
      customFilters = {}
    ) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        ordersLoading: true,
        error: "",
      });

      try {
        const filters = {
          ...get().orderFilters,
          ...customFilters,
        };

        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}/orders${buildQueryString(
            filters
          )}`,
          {
            headers: buildHeaders(),
            cache: "no-store",
          }
        );

        const data = await parseResponse(response);

        set({
          orders: data?.data || [],
          orderPagination: {
            ...get().orderPagination,
            ...(data?.pagination || {}),
          },
          orderFilters: filters,
          ordersLoading: false,
        });

        return data;
      } catch (error) {
        set({
          ordersLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    recordAffiliatePayout: async (
      affiliateId,
      payload = {}
    ) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        mutationLoading: true,
        error: "",
        message: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}/payouts`,
          {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(payload),
          }
        );

        const data = await parseResponse(response);
        const updatedAffiliate = data?.affiliate;

        set((state) => ({
          mutationLoading: false,
          message:
            data?.message ||
            "Affiliate payout recorded",

          affiliate:
            String(state.affiliate?._id) ===
              String(affiliateId)
              ? updatedAffiliate
              : state.affiliate,

          affiliates: state.affiliates.map((item) =>
            String(item?._id) === String(affiliateId)
              ? updatedAffiliate
              : item
          ),
        }));

        return data;
      } catch (error) {
        set({
          mutationLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    deleteAffiliate: async (affiliateId) => {
      if (!affiliateId) {
        throw new Error("Affiliate ID is required");
      }

      set({
        mutationLoading: true,
        error: "",
        message: "",
      });

      try {
        const response = await fetch(
          `${API_URL}/api/affiliates/${affiliateId}`,
          {
            method: "DELETE",
            headers: buildHeaders(),
          }
        );

        const data = await parseResponse(response);

        set((state) => ({
          mutationLoading: false,
          message:
            data?.message ||
            "Affiliate deleted successfully",

          affiliates: state.affiliates.filter(
            (item) =>
              String(item?._id) !== String(affiliateId)
          ),

          affiliate:
            String(state.affiliate?._id) ===
              String(affiliateId)
              ? null
              : state.affiliate,
        }));

        return data;
      } catch (error) {
        set({
          mutationLoading: false,
          error: error.message,
        });

        throw error;
      }
    },

    resetAffiliateState: () =>
      set({
        affiliates: [],
        affiliate: null,
        dashboard: null,
        orders: [],
        error: "",
        message: "",
        filters: { ...defaultFilters },
        orderFilters: { ...defaultOrderFilters },
      }),
  })
);

export {
  defaultAffiliateForm,
  defaultFilters,
  defaultOrderFilters
};
