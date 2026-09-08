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
      credentials: "include",
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

    reverseShipment: null,
    reverseSync: null,

    clearError: () =>
      set({ error: null }),

    reset: () =>
      set({
        loading: false,
        error: null,
        serviceability: null,
        shipment: null,
        tracking: null,
        trackingSync: null,
        label: null,
        warehouse: null,
        pickup: null,
        reverseShipment: null,
        reverseSync: null,
      }),

    checkServiceability: async (
      pincode,
    ) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const pin = String(
          pincode || "",
        ).trim();

        if (!/^\d{6}$/.test(pin)) {
          throw new Error(
            "Valid 6-digit pincode is required",
          );
        }

        const data = await request(
          `/serviceability/${pin}`,
        );

        set({
          serviceability: data,
        });

        return data;
      } catch (error) {
        set({
          error:
            error?.message ||
            "Serviceability check failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },

    createShipment: async (
      payload,
    ) => {
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
        set({
          error:
            error?.message ||
            "Shipment creation failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },

    trackShipment: async (
      waybill,
    ) => {
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
          tracking:
            result?.data || null,
        });

        return result;
      } catch (error) {
        set({
          error:
            error?.message ||
            "Tracking failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },

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
        set({
          error:
            error?.message ||
            "Tracking sync failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },

    getLabel: async (
      waybill,
    ) => {
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
        set({
          error:
            error?.message ||
            "Label fetch failed",
        });

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
        set({
          error:
            error?.message ||
            "Warehouse creation failed",
        });

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
        const data = await request(
          "/pickup",
          {
            method: "POST",
            body: JSON.stringify({
              pickupDate: String(
                pickupDate || "",
              ).trim(),

              pickupTime: String(
                pickupTime || "",
              ).trim(),

              packageCount: Math.max(
                1,
                Math.floor(
                  Number(
                    packageCount,
                  ) || 1,
                ),
              ),
            }),
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

    createReversePickup: async (
      orderId,
      rmaNumber,
    ) => {
      set({
        loading: true,
        error: null,
      });

      try {
        if (!orderId || !rmaNumber) {
          throw new Error(
            "Order ID and RMA number are required",
          );
        }

        const data = await request(
          `/reverse/${encodeURIComponent(
            orderId,
          )}/${encodeURIComponent(
            rmaNumber,
          )}`,
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );

        set({
          reverseShipment: data,
        });

        return data;
      } catch (error) {
        set({
          error:
            error?.message ||
            "Delhivery reverse pickup booking failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },

    syncReversePickup: async (
      orderId,
      rmaNumber,
    ) => {
      set({
        loading: true,
        error: null,
      });

      try {
        if (!orderId || !rmaNumber) {
          throw new Error(
            "Order ID and RMA number are required",
          );
        }

        const data = await request(
          `/reverse/${encodeURIComponent(
            orderId,
          )}/${encodeURIComponent(
            rmaNumber,
          )}/sync`,
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );

        set({
          reverseSync: data,
        });

        return data;
      } catch (error) {
        set({
          error:
            error?.message ||
            "Delhivery reverse pickup sync failed",
        });

        throw error;
      } finally {
        set({ loading: false });
      }
    },
  }),
);

export default useDelhiveryStore;
