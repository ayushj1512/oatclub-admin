"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;

const getError = async (res) => {
  const data = await res.json().catch(() => ({}));
  throw new Error(data?.message || "Something went wrong");
};

export const useOtpStore = create((set) => ({
  /* ===========================
      State
  =========================== */

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

  /* ===========================
      Actions
  =========================== */

  clearLogs: () =>
    set({
      logs: [],
      analytics: null,
    }),

  /* ===========================
      Send OTP
  =========================== */

  sendOTP: async (payload) => {
    set({ sending: true });

    try {
      const res = await fetch(`${API}/api/otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) await getError(res);

      const data = await res.json();

      return data;
    } finally {
      set({ sending: false });
    }
  },

  /* ===========================
      Verify OTP
  =========================== */

  verifyOTP: async (payload) => {
    set({ verifying: true });

    try {
      const res = await fetch(`${API}/api/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) await getError(res);

      const data = await res.json();

      return data;
    } finally {
      set({ verifying: false });
    }
  },

  /* ===========================
      Resend OTP
  =========================== */

  resendOTP: async (payload) => {
    set({ sending: true });

    try {
      const res = await fetch(`${API}/api/otp/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) await getError(res);

      const data = await res.json();

      return data;
    } finally {
      set({ sending: false });
    }
  },

  /* ===========================
      Logs
  =========================== */

  fetchLogs: async (query = "") => {
    set({ loading: true });

    try {
      const res = await fetch(
        `${API}/api/otp/logs${query ? `?${query}` : ""}`
      );

      if (!res.ok) await getError(res);

      const data = await res.json();

      set({
        logs: data.data || [],
        pagination:
          data.pagination || {
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

  /* ===========================
      Analytics
  =========================== */

  fetchAnalytics: async () => {
    set({ loading: true });

    try {
      const res = await fetch(`${API}/api/otp/analytics`);

      if (!res.ok) await getError(res);

      const data = await res.json();

      set({
        analytics: data.data || null,
      });

      return data;
    } finally {
      set({ loading: false });
    }
  },

  /* ===========================
      Delete Log
  =========================== */

  deleteLog: async (id) => {
    const res = await fetch(`${API}/api/otp/logs/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) await getError(res);

    set((state) => ({
      logs: state.logs.filter((item) => item._id !== id),
    }));

    return true;
  },

  /* ===========================
      Cleanup Logs
  =========================== */

  cleanupLogs: async (payload = {}) => {
    const res = await fetch(`${API}/api/otp/cleanup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) await getError(res);

    return res.json();
  },
}));