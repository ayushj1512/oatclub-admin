"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeCodes = (codes) => [
  ...new Set(safeArray(codes).map(normalizeCode).filter(Boolean)),
];

const parseError = async (res) => {
  try {
    const data = await res.json();
    return data?.message || "Something went wrong";
  } catch {
    return "Something went wrong";
  }
};

export const useAdminCommerceManagerStore = create(
  devtools(
    (set, get) => ({
      config: null,
      loading: false,
      saving: false,
      actionLoading: false,
      error: "",
      initialized: false,

      /* -----------------------------
         HELPERS
      ----------------------------- */
      setConfig: (config) => set({ config }),

      clearError: () => set({ error: "" }),

      resetStore: () =>
        set({
          config: null,
          loading: false,
          saving: false,
          actionLoading: false,
          error: "",
          initialized: false,
        }),

      /* -----------------------------
         GET CONFIG
      ----------------------------- */
      fetchConfig: async (showToast = false) => {
        set({ loading: true, error: "" });

        try {
          const res = await fetch(`${BASE_URL}/api/commerce-manager`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });

          if (!res.ok) {
            throw new Error(await parseError(res));
          }

          const data = await res.json();

          set({
            config: data?.data || null,
            loading: false,
            initialized: true,
          });

          if (showToast) toast.success("Commerce manager loaded");
          return { success: true, data: data?.data || null };
        } catch (error) {
          const message = error?.message || "Failed to load commerce manager";

          set({
            loading: false,
            error: message,
            initialized: true,
          });

          if (showToast) toast.error(message);
          return { success: false, message };
        }
      },

      /* -----------------------------
         UPDATE FULL CONFIG
      ----------------------------- */
      updateConfig: async ({
        selectedProductCodes,
        isActive,
        notes,
        lastUpdatedBy = "",
        showToast = true,
      } = {}) => {
        set({ saving: true, error: "" });

        try {
          const payload = {};

          if (selectedProductCodes !== undefined) {
            payload.selectedProductCodes = normalizeCodes(selectedProductCodes);
          }

          if (typeof isActive === "boolean") {
            payload.isActive = isActive;
          }

          if (notes !== undefined) {
            payload.notes = String(notes ?? "").trim();
          }

          if (lastUpdatedBy) {
            payload.lastUpdatedBy = String(lastUpdatedBy).trim();
          }

          const res = await fetch(`${BASE_URL}/api/commerce-manager`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw new Error(await parseError(res));
          }

          const data = await res.json();

          set({
            config: data?.data || null,
            saving: false,
          });

          if (showToast) {
            toast.success(data?.message || "Commerce manager updated");
          }

          return { success: true, data: data?.data || null };
        } catch (error) {
          const message = error?.message || "Failed to update commerce manager";

          set({
            saving: false,
            error: message,
          });

          if (showToast) toast.error(message);
          return { success: false, message };
        }
      },

      /* -----------------------------
         ADD PRODUCT CODES
      ----------------------------- */
      addProductCodes: async ({
        productCodes = [],
        lastUpdatedBy = "",
        showToast = true,
      } = {}) => {
        const normalizedCodes = normalizeCodes(productCodes);

        if (!normalizedCodes.length) {
          const message = "Please add valid product codes";
          set({ error: message });
          if (showToast) toast.error(message);
          return { success: false, message };
        }

        set({ actionLoading: true, error: "" });

        try {
          const res = await fetch(
            `${BASE_URL}/api/commerce-manager/product-codes`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                productCodes: normalizedCodes,
                lastUpdatedBy,
              }),
            }
          );

          if (!res.ok) {
            throw new Error(await parseError(res));
          }

          const data = await res.json();

          set({
            config: data?.data || null,
            actionLoading: false,
          });

          if (showToast) {
            toast.success(data?.message || "Product codes added");
          }

          return { success: true, data: data?.data || null };
        } catch (error) {
          const message = error?.message || "Failed to add product codes";

          set({
            actionLoading: false,
            error: message,
          });

          if (showToast) toast.error(message);
          return { success: false, message };
        }
      },

      /* -----------------------------
         REMOVE PRODUCT CODES
      ----------------------------- */
      removeProductCodes: async ({
        productCodes = [],
        lastUpdatedBy = "",
        showToast = true,
      } = {}) => {
        const normalizedCodes = normalizeCodes(productCodes);

        if (!normalizedCodes.length) {
          const message = "Please select valid product codes";
          set({ error: message });
          if (showToast) toast.error(message);
          return { success: false, message };
        }

        set({ actionLoading: true, error: "" });

        try {
          const res = await fetch(
            `${BASE_URL}/api/commerce-manager/product-codes`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                productCodes: normalizedCodes,
                lastUpdatedBy,
              }),
            }
          );

          if (!res.ok) {
            throw new Error(await parseError(res));
          }

          const data = await res.json();

          set({
            config: data?.data || null,
            actionLoading: false,
          });

          if (showToast) {
            toast.success(data?.message || "Product codes removed");
          }

          return { success: true, data: data?.data || null };
        } catch (error) {
          const message = error?.message || "Failed to remove product codes";

          set({
            actionLoading: false,
            error: message,
          });

          if (showToast) toast.error(message);
          return { success: false, message };
        }
      },

      /* -----------------------------
         CLEAR ALL PRODUCT CODES
      ----------------------------- */
      clearAllProductCodes: async ({
        lastUpdatedBy = "",
        showToast = true,
      } = {}) => {
        set({ actionLoading: true, error: "" });

        try {
          const res = await fetch(
            `${BASE_URL}/api/commerce-manager/product-codes/all`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ lastUpdatedBy }),
            }
          );

          if (!res.ok) {
            throw new Error(await parseError(res));
          }

          const data = await res.json();

          set({
            config: data?.data || null,
            actionLoading: false,
          });

          if (showToast) {
            toast.success(data?.message || "All product codes cleared");
          }

          return { success: true, data: data?.data || null };
        } catch (error) {
          const message = error?.message || "Failed to clear product codes";

          set({
            actionLoading: false,
            error: message,
          });

          if (showToast) toast.error(message);
          return { success: false, message };
        }
      },

      /* -----------------------------
         TOGGLE ACTIVE STATUS
      ----------------------------- */
      toggleStatus: async ({
        isActive,
        lastUpdatedBy = "",
        showToast = true,
      } = {}) => {
        if (typeof isActive !== "boolean") {
          const message = "isActive must be true or false";
          set({ error: message });
          if (showToast) toast.error(message);
          return { success: false, message };
        }

        set({ actionLoading: true, error: "" });

        try {
          const res = await fetch(`${BASE_URL}/api/commerce-manager/toggle`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              isActive,
              lastUpdatedBy,
            }),
          });

          if (!res.ok) {
            throw new Error(await parseError(res));
          }

          const data = await res.json();

          set({
            config: data?.data || null,
            actionLoading: false,
          });

          if (showToast) {
            toast.success(
              data?.message ||
                `Commerce manager ${isActive ? "activated" : "deactivated"}`
            );
          }

          return { success: true, data: data?.data || null };
        } catch (error) {
          const message =
            error?.message || "Failed to update commerce manager status";

          set({
            actionLoading: false,
            error: message,
          });

          if (showToast) toast.error(message);
          return { success: false, message };
        }
      },

      /* -----------------------------
         LOCAL HELPERS
      ----------------------------- */
      setSelectedProductCodesLocal: (codes = []) => {
        const current = get().config || {};

        set({
          config: {
            ...current,
            selectedProductCodes: normalizeCodes(codes),
            selectedProductCodesCount: normalizeCodes(codes).length,
          },
        });
      },

      addSelectedProductCodeLocal: (code) => {
        const current = get().config || {};
        const prevCodes = safeArray(current?.selectedProductCodes);
        const nextCodes = normalizeCodes([...prevCodes, code]);

        set({
          config: {
            ...current,
            selectedProductCodes: nextCodes,
            selectedProductCodesCount: nextCodes.length,
          },
        });
      },

      removeSelectedProductCodeLocal: (code) => {
        const target = normalizeCode(code);
        const current = get().config || {};
        const prevCodes = safeArray(current?.selectedProductCodes);
        const nextCodes = prevCodes.filter(
          (item) => normalizeCode(item) !== target
        );

        set({
          config: {
            ...current,
            selectedProductCodes: nextCodes,
            selectedProductCodesCount: nextCodes.length,
          },
        });
      },
    }),
    { name: "admin-commerce-manager-store" }
  )
);