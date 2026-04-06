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
  data?.details?.message ||
  (res?.status ? `Request failed (${res.status})` : null) ||
  "Something went wrong";

const normalizeError = (res, data) => {
  const e = new Error(errMsgFrom(res, data));
  e.status = res?.status;
  e.code = data?.code || data?.error?.code || null;
  e.payload = data || null;
  return e;
};

const toBoolLike = (value) => {
  if (typeof value === "boolean") return value;
  const v = String(value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
};

/**
 * ✅ Shiprocket Store (Admin)
 * - Get token
 * - Check serviceability
 * - Book shipment
 * - Reverse pickup
 * - Sync tracking
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

  serviceabilityLoading: false,
  serviceabilityError: null,
  serviceabilityResult: null,

  result: null,
  bulkResult: null,
  reverseResult: null,

  syncLoading: false,
  syncError: null,
  syncErrorCode: null,
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

  _startServiceability: () =>
    set({
      serviceabilityLoading: true,
      serviceabilityError: null,
    }),
  _successServiceability: () => set({ serviceabilityLoading: false }),
  _errorServiceability: (err) =>
    set({
      serviceabilityLoading: false,
      serviceabilityError: err?.message || "Serviceability check failed",
    }),

  _startSync: () =>
    set({
      syncLoading: true,
      syncError: null,
      syncErrorCode: null,
    }),
  _successSync: () => set({ syncLoading: false }),
  _errorSync: (err) =>
    set({
      syncLoading: false,
      syncError:
        err?.code === "SHIPROCKET_UPSTREAM_DOWN"
          ? "Shiprocket temporary down. Try again in 2 minutes."
          : err?.message || "Tracking sync failed",
      syncErrorCode: err?.code || null,
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
     CHECK SHIPROCKET SERVICEABILITY
     GET /api/shiprocket/serviceability
  ============================================================ */
  checkServiceability: async ({
    pickupPincode,
    deliveryPincode,
    weight = 0.5,
    cod = false,
  }) => {
    if (!pickupPincode) throw new Error("pickupPincode is required");
    if (!deliveryPincode) throw new Error("deliveryPincode is required");

    get()._startServiceability();

    try {
      const params = {
        pickupPincode: String(pickupPincode).trim(),
        deliveryPincode: String(deliveryPincode).trim(),
        weight: String(Number(weight || 0.5)),
        cod: toBoolLike(cod) ? "1" : "0",
      };

      const res = await fetch(buildUrl("/api/shiprocket/serviceability", params), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw normalizeError(res, data);

      set({ serviceabilityResult: data });
      get()._successServiceability();
      return data;
    } catch (e) {
      get()._errorServiceability(e);
      throw e;
    }
  },

  /* ============================================================
     BOOK SHIPROCKET (ADMIN)
     POST /api/orders/:id/ship
  ============================================================ */
  bookShipment: async (orderId) => {
    if (!orderId) throw new Error("orderId is required");

    get()._start();
    try {
      const res = await fetch(buildUrl(`/api/orders/${orderId}/ship`), {
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
     SYNC TRACKING (Shiprocket)
     - syncTracking({ orderId })  -> GET /api/orders/:id/tracking/sync
     - syncTracking({ orderNumber }) -> GET /api/orders/tracking/sync?orderNumber=...
     - syncTracking("orderId") (compat)
  ============================================================ */
  syncTracking: async (input) => {
    let orderId = "";
    let orderNumber = "";

    if (typeof input === "string") {
      orderId = String(input).trim();
    } else {
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
     POST /api/orders/shiprocket/book-missing
  ============================================================ */
  bulkBookShiprocketMissing: async (filters = {}) => {
    get()._start();
    try {
      const res = await fetch(buildUrl("/api/orders/shiprocket/book-missing", filters), {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

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
  clearServiceabilityError: () => set({ serviceabilityError: null }),
  clearSyncError: () => set({ syncError: null, syncErrorCode: null }),

  clearResult: () => set({ result: null }),
  clearBulkResult: () => set({ bulkResult: null }),
  clearReverseResult: () => set({ reverseResult: null }),
  clearServiceabilityResult: () => set({ serviceabilityResult: null }),
  clearSyncResult: () => set({ syncResult: null }),

  resetStore: () =>
    set({
      loading: false,
      error: null,

      tokenLoading: false,
      tokenError: null,
      token: null,
      tokenFetchedAt: null,

      serviceabilityLoading: false,
      serviceabilityError: null,
      serviceabilityResult: null,

      result: null,
      bulkResult: null,
      reverseResult: null,

      syncLoading: false,
      syncError: null,
      syncErrorCode: null,
      syncResult: null,
    }),
}));