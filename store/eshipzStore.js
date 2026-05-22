// store/eshipzStore.js

import { create } from "zustand";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export const useEshipzStore = create((set) => ({
  loading: false,
  error: null,
  shipment: null,
  response: null,

  createShipment: async (payload) => {
    try {
      set({
        loading: true,
        error: null,
        response: null,
      });

      const { data } = await axios.post(
        `${API_BASE_URL}/api/eshipz/create`,
        payload,
        {
          withCredentials: true,
        }
      );

      set({
        shipment: data?.data || null,
        response: data,
        loading: false,
      });

      return {
        success: true,
        data,
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to create eShipz shipment";

      set({
        loading: false,
        error: message,
      });

      return {
        success: false,
        message,
        error: error.response?.data || error,
      };
    }
  },

  resetEshipz: () =>
    set({
      loading: false,
      error: null,
      shipment: null,
      response: null,
    }),
}));