import { create } from "zustand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

const request = async (url, options = {}) => {
  const response = await fetch(`${API_URL}/api/delhivery${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Delhivery request failed");
  }

  return result.data;
};

export const useDelhiveryStore = create((set) => ({
  loading: false,
  error: null,

  serviceability: null,
  shipment: null,
  tracking: null,
  label: null,
  warehouse: null,
  pickup: null,

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      error: null,
      serviceability: null,
      shipment: null,
      tracking: null,
      label: null,
      warehouse: null,
      pickup: null,
    }),

  checkServiceability: async (pincode) => {
    set({ loading: true, error: null });

    try {
      const data = await request(`/serviceability/${pincode}`);
      set({ serviceability: data });
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createShipment: async (payload) => {
    set({ loading: true, error: null });

    try {
      const data = await request("/shipments", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      set({ shipment: data });
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  trackShipment: async (waybill) => {
    set({ loading: true, error: null });

    try {
      const data = await request(`/tracking/${waybill}`);
      set({ tracking: data });
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getLabel: async (waybill) => {
    set({ loading: true, error: null });

    try {
      const data = await request(`/label/${waybill}`);
      set({ label: data });
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createWarehouse: async (payload) => {
    set({ loading: true, error: null });

    try {
      const data = await request("/warehouse", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      set({ warehouse: data });
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createPickup: async (payload) => {
    set({ loading: true, error: null });

    try {
      const data = await request("/pickup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      set({ pickup: data });
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));

export default useDelhiveryStore;
