"use client";

import { create } from "zustand";

const API = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).trim();

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

const normalizeError = (res, data) => new Error(errMsgFrom(res, data));

/**
 * ✅ Shiprocket Admin Store
 * - Token fetch
 * - Book shipment (✅ fixed route)
 * - Reverse pickup (RMA)
 * - Sync tracking from Shiprocket
 *   ✅ supports BOTH:
 *      - by orderId:      GET /api/orders/:id/tracking/sync
 *      - by orderNumber:  GET /api/orders/tracking/sync?orderNumber=MIRAY-000271
 * - Optional bulk booking (keep if backend exists)
 */
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

  result: null, // single booking response
  bulkResult: null, // bulk booking response
  reverseResult: null, // reverse pickup response

  syncLoading: false,
  syncError: null,
  syncResult: null,

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

  _startSync: () => set({ syncLoading: true, syncError: null }),
  _successSync: () => set({ syncLoading: false }),
  _errorSync: (err) =>
    set({
      syncLoading: false,
      syncError: err?.message || "Tracking sync failed",
    }),

  /* ============================================================
     GET TOKEN (ADMIN)
     GET /api/shiprocket/token
     NOTE: optional (backend can handle token server-to-server)
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
      if (!res.ok) throw normalizeError(res, data);

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
     ✅ SINGLE: BOOK SHIPROCKET (ADMIN)
     FIXED ROUTE:
     POST /api/orders/:id/shiprocket/book
     (matches your adminBookShiprocketIfMissing controller)
  ============================================================ */
  bookShipment: async (orderId) => {
    if (!orderId) throw new Error("orderId is required");

    get()._start();
    try {
      const res = await fetch(buildUrl(`/api/orders/${orderId}/shiprocket/book`), {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw normalizeError(res, data);

      set({ result: data });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     ✅ SYNC TRACKING (Shiprocket)
     Supports:
       1) syncTracking({ orderId })
       2) syncTracking({ orderNumber })
       3) syncTracking("orderId")  // backwards compatible
  ============================================================ */
  syncTracking: async (input) => {
    let orderId = "";
    let orderNumber = "";

    if (typeof input === "string") orderId = input;
    else {
      orderId = String(input?.orderId || "").trim();
      orderNumber = String(input?.orderNumber || "").trim();
    }

    if (!orderId && !orderNumber) {
      throw new Error("orderId or orderNumber is required");
    }

    get()._startSync();
    try {
      const url = orderId
        ? buildUrl(`/api/orders/${orderId}/tracking/sync`)
        : buildUrl(`/api/orders/tracking/sync`, { orderNumber });

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw normalizeError(res, data);

      set({ syncResult: data });
      get()._successSync();
      return data;
    } catch (e) {
      get()._errorSync(e);
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
      const res = await fetch(
        buildUrl(`/api/shiprocket/reverse/${orderId}/${rmaNumber}`),
        {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) throw normalizeError(res, data);

      set({ reverseResult: data });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     BULK BOOKING (optional)
     POST /api/orders/shiprocket/book-missing?limit=25&...
     (keep only if this backend route exists)
  ============================================================ */
  bulkBookShiprocketMissing: async (filters = {}) => {
    get()._start();
    try {
      const res = await fetch(
        buildUrl("/api/orders/shiprocket/book-missing", filters),
        {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );

      const data = await safeJson(res);
      if (!res.ok) throw normalizeError(res, data);

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
  clearSyncError: () => set({ syncError: null }),

  clearResult: () => set({ result: null }),
  clearBulkResult: () => set({ bulkResult: null }),
  clearReverseResult: () => set({ reverseResult: null }),
  clearSyncResult: () => set({ syncResult: null }),

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

      syncLoading: false,
      syncError: null,
      syncResult: null,
    }),
}));
