"use client";

import { create } from "zustand";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:6001";

const request = async (
  url,
  options = {},
  unwrap = true,
) => {
  const response = await fetch(
    `${API_URL}/api/delhivery${url}`,
    {
      cache: "no-store",
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    },
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (
    !response.ok ||
    result?.success === false
  ) {
    throw new Error(
      result?.message ||
      result?.error ||
      "Delhivery request failed",
    );
  }

  return unwrap
    ? result?.data ?? result
    : result;
};

export const useDelhiveryStore = create(
  (set) => ({
    loading: false,
    error: null,

    serviceability: null,
    shipment: null,
    tracking: null,
    trackingSync: null,
    label: null,
    warehouse: null,
    pickup: null,

    clearError: () =>
      set({ error: null }),

    reset: () =>
      set({
        error: null,
        serviceability: null,
        shipment: null,
        tracking: null,
        trackingSync: null,
        label: null,
        warehouse: null,
        pickup: null,
      }),

    checkServiceability: async (
      pincode,
    ) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const data = await request(
          `/serviceability/${pincode}`,
        );

        set({
          serviceability: data,
        });

        return data;
      } catch (error) {
        set({ error: error.message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    createShipment: async (payload) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const data = await request(
          "/shipments",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        set({ shipment: data });
        return data;
      } catch (error) {
        set({ error: error.message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    // Single AWB + DB sync
    trackShipment: async (waybill) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const result = await request(
          `/tracking/${encodeURIComponent(
            waybill,
          )}`,
          {},
          false,
        );

        set({
          tracking: result?.data || null,
        });

        return result;
      } catch (error) {
        set({ error: error.message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    // Fallback reconciliation
    syncAllTracking: async () => {
      set({
        loading: true,
        error: null,
      });

      try {
        const result = await request(
          "/tracking/sync-all",
          {
            method: "POST",
            body: JSON.stringify({}),
          },
          false,
        );

        set({
          trackingSync: result,
        });

        return result;
      } catch (error) {
        set({ error: error.message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    getLabel: async (waybill) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const data = await request(
          `/label/${encodeURIComponent(
            waybill,
          )}`,
        );

        set({ label: data });
        return data;
      } catch (error) {
        set({ error: error.message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    createWarehouse: async (
      payload,
    ) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const data = await request(
          "/warehouse",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        set({ warehouse: data });
        return data;
      } catch (error) {
        set({ error: error.message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    createPickup: async ({
      pickupDate,
      pickupTime,
      packageCount = 1,
    }) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const payload = {
          pickupDate: String(
            pickupDate || "",
          ).trim(),

          pickupTime: String(
            pickupTime || "",
          ).trim(),

          packageCount: Math.max(
            1,
            Math.floor(
              Number(packageCount) || 1,
            ),
          ),
        };

        const data = await request(
          "/pickup",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        set({ pickup: data });

        return data;
      } catch (error) {
        set({
          error:
            error?.message ||
            "Pickup scheduling failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },
  }),
);

export default useDelhiveryStore;
