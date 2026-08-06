"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = `${BASE_URL}/api/commerce-manager`;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeCodes = (codes = []) => [
  ...new Set(safeArray(codes).map(normalizeCode).filter(Boolean)),
];

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
};

const request = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  return parseResponse(res);
};

export const useAdminCommerceManagerStore = create(
  devtools(
    (set, get) => ({
      feeds: [],
      currentFeed: null,
      pagination: null,

      loading: false,
      saving: false,
      actionLoading: false,
      error: "",

      setCurrentFeed: (feed) => set({ currentFeed: feed }),

      clearError: () => set({ error: "" }),

      resetStore: () =>
        set({
          feeds: [],
          currentFeed: null,
          pagination: null,
          loading: false,
          saving: false,
          actionLoading: false,
          error: "",
        }),

      fetchFeeds: async ({
        search = "",
        isActive = "",
        page = 1,
        limit = 50,
        showToast = false,
      } = {}) => {
        set({ loading: true, error: "" });

        try {
          const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
          });

          if (search) params.set("search", search);
          if (isActive !== "") params.set("isActive", String(isActive));

          const data = await request(`${API_URL}/feeds?${params}`);

          set({
            feeds: safeArray(data?.data),
            pagination: data?.pagination || null,
            loading: false,
          });

          if (showToast) toast.success("Commerce feeds loaded");

          return { success: true, data: data?.data };
        } catch (error) {
          const message = error?.message || "Failed to load feeds";

          set({ loading: false, error: message });

          if (showToast) toast.error(message);

          return { success: false, message };
        }
      },

      fetchFeed: async (id, showToast = false) => {
        if (!id) return { success: false, message: "Feed ID is required" };

        set({ loading: true, error: "" });

        try {
          const data = await request(`${API_URL}/feeds/${id}`);

          set({
            currentFeed: data?.data || null,
            loading: false,
          });

          if (showToast) toast.success("Feed loaded");

          return { success: true, data: data?.data };
        } catch (error) {
          const message = error?.message || "Failed to load feed";

          set({ loading: false, error: message });

          if (showToast) toast.error(message);

          return { success: false, message };
        }
      },

      createFeed: async (payload = {}) => {
        set({ saving: true, error: "" });

        try {
          const data = await request(`${API_URL}/feeds`, {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              selectedProductCodes: normalizeCodes(
                payload.selectedProductCodes,
              ),
            }),
          });

          set((state) => ({
            feeds: [data.data, ...state.feeds],
            currentFeed: data.data,
            saving: false,
          }));

          toast.success(data?.message || "Feed created");

          return { success: true, data: data?.data };
        } catch (error) {
          const message = error?.message || "Failed to create feed";

          set({ saving: false, error: message });
          toast.error(message);

          return { success: false, message };
        }
      },

      updateFeed: async (id, payload = {}) => {
        if (!id) return { success: false, message: "Feed ID is required" };

        set({ saving: true, error: "" });

        try {
          const body = { ...payload };

          if (payload.selectedProductCodes !== undefined) {
            body.selectedProductCodes = normalizeCodes(
              payload.selectedProductCodes,
            );
          }

          const data = await request(`${API_URL}/feeds/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });

          set((state) => ({
            feeds: state.feeds.map((feed) =>
              String(feed._id) === String(data.data._id) ? data.data : feed,
            ),
            currentFeed: data.data,
            saving: false,
          }));

          toast.success(data?.message || "Feed updated");

          return { success: true, data: data?.data };
        } catch (error) {
          const message = error?.message || "Failed to update feed";

          set({ saving: false, error: message });
          toast.error(message);

          return { success: false, message };
        }
      },

      deleteFeed: async (id) => {
        if (!id) return { success: false, message: "Feed ID is required" };

        set({ actionLoading: true, error: "" });

        try {
          const data = await request(`${API_URL}/feeds/${id}`, {
            method: "DELETE",
          });

          set((state) => ({
            feeds: state.feeds.filter(
              (feed) => String(feed._id) !== String(id),
            ),
            currentFeed:
              String(state.currentFeed?._id) === String(id)
                ? null
                : state.currentFeed,
            actionLoading: false,
          }));

          toast.success(data?.message || "Feed deleted");

          return { success: true };
        } catch (error) {
          const message = error?.message || "Failed to delete feed";

          set({ actionLoading: false, error: message });
          toast.error(message);

          return { success: false, message };
        }
      },

      addProductCodes: async (id, productCodes = [], lastUpdatedBy = "") => {
        const codes = normalizeCodes(productCodes);

        if (!id || !codes.length) {
          return {
            success: false,
            message: "Feed ID and product codes are required",
          };
        }

        return get().runFeedAction(
          id,
          "product-codes",
          "POST",
          { productCodes: codes, lastUpdatedBy },
          "Product codes added",
        );
      },

      removeProductCodes: async (
        id,
        productCodes = [],
        lastUpdatedBy = "",
      ) => {
        const codes = normalizeCodes(productCodes);

        if (!id || !codes.length) {
          return {
            success: false,
            message: "Feed ID and product codes are required",
          };
        }

        return get().runFeedAction(
          id,
          "product-codes",
          "DELETE",
          { productCodes: codes, lastUpdatedBy },
          "Product codes removed",
        );
      },

      clearProductCodes: async (id, lastUpdatedBy = "") => {
        if (!id) {
          return { success: false, message: "Feed ID is required" };
        }

        return get().runFeedAction(
          id,
          "product-codes/all",
          "DELETE",
          { lastUpdatedBy },
          "Product codes cleared",
        );
      },

      refreshXmlFeed: async (id = "default") => {
        set({ actionLoading: true, error: "" });

        try {
          const url =
            id === "default"
              ? `${API_URL}/xml/refresh`
              : `${API_URL}/feeds/${id}/xml/refresh`;

          const data = await request(url, {
            method: "POST",
          });

          set({ actionLoading: false });

          toast.success(`XML refreshed: ${data?.count || 0} items`);

          return { success: true, data };
        } catch (error) {
          const message = error?.message || "Failed to refresh XML";

          set({ actionLoading: false, error: message });
          toast.error(message);

          return { success: false, message };
        }
      },

      runFeedAction: async (
        id,
        endpoint,
        method,
        body,
        successMessage,
      ) => {
        set({ actionLoading: true, error: "" });

        try {
          const data = await request(
            `${API_URL}/feeds/${id}/${endpoint}`,
            {
              method,
              body: JSON.stringify(body),
            },
          );

          set((state) => ({
            feeds: state.feeds.map((feed) =>
              String(feed._id) === String(data.data._id) ? data.data : feed,
            ),
            currentFeed: data.data,
            actionLoading: false,
          }));

          toast.success(data?.message || successMessage);

          return { success: true, data: data?.data };
        } catch (error) {
          const message = error?.message || "Action failed";

          set({ actionLoading: false, error: message });
          toast.error(message);

          return { success: false, message };
        }
      },

      setSelectedProductCodesLocal: (codes = []) => {
        const normalized = normalizeCodes(codes);

        set((state) => ({
          currentFeed: {
            ...(state.currentFeed || {}),
            selectedProductCodes: normalized,
            selectedProductCodesCount: normalized.length,
          },
        }));
      },

      addSelectedProductCodeLocal: (code) => {
        const currentCodes = safeArray(
          get().currentFeed?.selectedProductCodes,
        );

        get().setSelectedProductCodesLocal([...currentCodes, code]);
      },

      removeSelectedProductCodeLocal: (code) => {
        const target = normalizeCode(code);

        const currentCodes = safeArray(
          get().currentFeed?.selectedProductCodes,
        );

        get().setSelectedProductCodesLocal(
          currentCodes.filter((item) => normalizeCode(item) !== target),
        );
      },
    }),
    {
      name: "admin-commerce-manager-store",
    },
  ),
);
