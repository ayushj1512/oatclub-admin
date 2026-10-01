"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;

const getError = async (response) => {
  const data = await response
    .json()
    .catch(() => ({}));

  throw new Error(
    data?.message || "Something went wrong",
  );
};

const otpRequest = async ({
  path,
  payload,
}) => {
  const response = await fetch(
    `${API}/api/otp/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    await getError(response);
  }

  return response.json();
};

const getOtpPath = (action, payload = {}) =>
  payload.channel === "whatsapp"
    ? `whatsapp/${action}`
    : action;

export const useOtpStore = create(
  (set, get) => ({
    /* ================= STATE ================= */

    logs: [],
    analytics: null,

    loading: false,
    sending: false,
    verifying: false,

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    },

    /* ================= RESET ================= */

    clearLogs: () =>
      set({
        logs: [],
        analytics: null,
      }),

    /* ================= SEND OTP ================= */

    sendOTP: async (payload) => {
      set({ sending: true });

      try {
        return await otpRequest({
          path: getOtpPath("send", payload),
          payload,
        });
      } finally {
        set({ sending: false });
      }
    },

    sendWhatsappOTP: async (payload) =>
      get().sendOTP({
        ...payload,
        channel: "whatsapp",
      }),

    /* ================= RESEND OTP ================= */

    resendOTP: async (payload) => {
      set({ sending: true });

      try {
        return await otpRequest({
          path: getOtpPath("resend", payload),
          payload,
        });
      } finally {
        set({ sending: false });
      }
    },

    resendWhatsappOTP: async (payload) =>
      get().resendOTP({
        ...payload,
        channel: "whatsapp",
      }),

    /* ================= VERIFY OTP ================= */

    verifyOTP: async (payload) => {
      set({ verifying: true });

      try {
        return await otpRequest({
          path: getOtpPath("verify", payload),
          payload,
        });
      } finally {
        set({ verifying: false });
      }
    },

    verifyWhatsappOTP: async (payload) =>
      get().verifyOTP({
        ...payload,
        channel: "whatsapp",
      }),

    /* ================= LOGS ================= */

    fetchLogs: async (query = "") => {
      set({ loading: true });

      try {
        const response = await fetch(
          `${API}/api/otp/logs${query ? `?${query}` : ""
          }`,
        );

        if (!response.ok) {
          await getError(response);
        }

        const data = await response.json();

        set({
          logs: data.data || [],
          pagination: data.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
          },
        });

        return data;
      } finally {
        set({ loading: false });
      }
    },

    /* ================= ANALYTICS ================= */

    fetchAnalytics: async () => {
      set({ loading: true });

      try {
        const response = await fetch(
          `${API}/api/otp/analytics`,
        );

        if (!response.ok) {
          await getError(response);
        }

        const data = await response.json();

        set({
          analytics: data.data || null,
        });

        return data;
      } finally {
        set({ loading: false });
      }
    },

    /* ================= DELETE LOG ================= */

    deleteLog: async (id) => {
      const response = await fetch(
        `${API}/api/otp/logs/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        await getError(response);
      }

      set((state) => ({
        logs: state.logs.filter(
          (item) => item._id !== id,
        ),
      }));

      return true;
    },

    /* ================= CLEANUP ================= */

    cleanupLogs: async (payload = {}) => {
      const response = await fetch(
        `${API}/api/otp/cleanup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        await getError(response);
      }

      return response.json();
    },
  }),
);
