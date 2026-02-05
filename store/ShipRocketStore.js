"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").trim();

/* ---------------- helpers ---------------- */
const buildUrl = (path, params) => {
  const base = API ? API.replace(/\/+$/, "") : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  const qs = params ? new URLSearchParams(params).toString() : "";
  return `${base}${p}${qs ? `?${qs}` : ""}`;
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid JSON response" };
  }
};

const errMsgFrom = (res, data) =>
  data?.message ||
  data?.error?.message ||
  (typeof data?.error === "string" ? data.error : null) ||
  (res?.status ? `Request failed (${res.status})` : null) ||
  "Something went wrong";

export const useShiprocketStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  loading: false,
  error: null,

  tokenLoading: false,
  tokenError: null,
  token: null,
  tokenFetchedAt: null,

  result: null,       // single booking response
  bulkResult: null,   // bulk booking response
  reverseResult: null, // reverse pickup response

  /* ============================================================
     INTERNAL SETTERS
  ============================================================ */
  _start: () => set({ loading: true, error: null }),
  _success: () => set({ loading: false }),
  _error: (err) =>
    set({
      loading: false,
      error: err?.message || "Something went wrong",
    }),

  _startToken: () => set({ tokenLoading: true, tokenError: null }),
  _successToken: () => set({ tokenLoading: false }),
  _errorToken: (err) =>
    set({
      tokenLoading: false,
      tokenError: err?.message || "Token fetch failed",
    }),

  /* ============================================================
     GET TOKEN (ADMIN)
     GET /api/shiprocket/token
  ============================================================ */
  fetchToken: async () => {
    get()._startToken();
    try {
      const res = await fetch(buildUrl("/api/shiprocket/token"), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(errMsgFrom(res, data));

      const token = data?.token || null;
      set({ token, tokenFetchedAt: Date.now() });

      get()._successToken();
      return token;
    } catch (e) {
      get()._errorToken(e);
      throw e;
    }
  },

  /* ============================================================
     SINGLE: BOOK SHIPROCKET
     POST /api/orders/:id/ship
  ============================================================ */
  bookShipment: async (orderId) => {
    if (!orderId) throw new Error("orderId is required");

    get()._start();
    try {
      const res = await fetch(buildUrl(`/api/orders/${orderId}/ship`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(errMsgFrom(res, data));

      set({ result: data });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     REVERSE PICKUP (RMA)
     POST /api/shiprocket/reverse/:orderId/:rmaNumber
  ============================================================ */
  createReversePickup: async (orderId, rmaNumber) => {
    if (!orderId) throw new Error("orderId is required");
    if (!rmaNumber) throw new Error("rmaNumber is required");

    get()._start();
    try {
      const res = await fetch(buildUrl(`/api/shiprocket/reverse/${orderId}/${rmaNumber}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(errMsgFrom(res, data));

      set({ reverseResult: data });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     BULK BOOKING
     (Only keep if your backend actually has this endpoint)
     POST /api/orders/shiprocket/book-missing?limit=25&...
  ============================================================ */
  bulkBookShiprocketMissing: async (filters = {}) => {
    get()._start();
    try {
      const res = await fetch(buildUrl("/api/orders/shiprocket/book-missing", filters), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(errMsgFrom(res, data));

      set({ bulkResult: data });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     CLEAR / RESET
  ============================================================ */
  clearError: () => set({ error: null }),
  clearTokenError: () => set({ tokenError: null }),

  clearResult: () => set({ result: null }),
  clearBulkResult: () => set({ bulkResult: null }),
  clearReverseResult: () => set({ reverseResult: null }),

  resetStore: () =>
    set({
      loading: false,
      error: null,
      tokenLoading: false,
      tokenError: null,
      token: null,
      tokenFetchedAt: null,
      result: null,
      bulkResult: null,
      reverseResult: null,
    }),
}));
