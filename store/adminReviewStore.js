"use client";

import { create } from "zustand";

/* ---------------- helpers ---------------- */
const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).trim();

const REVIEWS_API = `${API_BASE}/api/reviews`;

const safe = (v) => (v == null ? "" : String(v).trim());

const toInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const isFormData = (payload) =>
  typeof FormData !== "undefined" && payload instanceof FormData;

const buildQuery = (params = {}) => {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

    const s = typeof v === "string" ? v.trim() : v;
    if (s === "" || s === false) return;

    sp.set(k, String(s));
  });

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

async function requestJSON(url, options = {}) {
  const bodyIsFormData = isFormData(options.body);

  const headers = bodyIsFormData
    ? { ...(options.headers || {}) }
    : { "Content-Type": "application/json", ...(options.headers || {}) };

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : null;

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `Request failed (${res.status} ${res.statusText})`;

    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

const normalizeQuery = (query = {}) => ({
  page: Math.max(toInt(query.page, 1), 1),
  limit: Math.min(Math.max(toInt(query.limit, 20), 1), 100),
  sort: safe(query.sort) || "latest",
  status: safe(query.status),
  rating: safe(query.rating),
  productCode: safe(query.productCode),
  customerEmail: safe(query.customerEmail).toLowerCase(),
  orderNumber: safe(query.orderNumber).toUpperCase(),
  q: safe(query.q),
});

const DEFAULT_QUERY = {
  page: 1,
  limit: 20,
  status: "",
  rating: "",
  productCode: "",
  customerEmail: "",
  orderNumber: "",
  q: "",
  sort: "latest",
};

/* =========================================================
   Admin Review Store
========================================================= */
export const useAdminReviewStore = create((set, get) => ({
  /* ---------------- data ---------------- */
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },

  /* ---------------- order review link data ---------------- */
  orderReviewData: null,

  /* ---------------- ui state ---------------- */
  isLoading: false,
  isSaving: false,
  isOrderReviewLoading: false,
  isOrderReviewSubmitting: false,
  error: "",
  orderReviewError: "",

  /* ---------------- selection ---------------- */
  selectedIds: [],

  /* ---------------- query state ---------------- */
  query: DEFAULT_QUERY,

  /* ---------------- internal ---------------- */
  _controller: null,

  /* ---------------- query helpers ---------------- */
  setQuery: (patch = {}) =>
    set((st) => ({
      query: {
        ...st.query,
        ...patch,
        page: patch.page ?? st.query.page,
      },
    })),

  resetQuery: () =>
    set({
      query: DEFAULT_QUERY,
      selectedIds: [],
    }),

  clearError: () => set({ error: "", orderReviewError: "" }),

  /* ---------------- selection helpers ---------------- */
  setSelectedIds: (ids = []) =>
    set({
      selectedIds: Array.from(new Set(ids.map(String).filter(Boolean))),
    }),

  toggleSelect: (id) => {
    const sid = safe(id);
    if (!sid) return;

    const { selectedIds } = get();
    const has = selectedIds.includes(sid);

    set({
      selectedIds: has
        ? selectedIds.filter((x) => x !== sid)
        : [...selectedIds, sid],
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  selectAllOnPage: () => {
    const ids = (get().items || [])
      .map((r) => String(r?._id || ""))
      .filter(Boolean);

    set({ selectedIds: Array.from(new Set(ids)) });
  },

  /* ---------------- fetch admin list ---------------- */
  fetchAdminReviews: async (override = {}) => {
    try {
      get()._controller?.abort?.();
    } catch (_) {}

    const controller = new AbortController();

    set({
      _controller: controller,
      isLoading: true,
      error: "",
    });

    try {
      const params = normalizeQuery({
        ...get().query,
        ...override,
      });

      const url = `${REVIEWS_API}/admin/list${buildQuery(params)}`;

      const data = await requestJSON(url, {
        method: "GET",
        signal: controller.signal,
      });

      set({
        items: Array.isArray(data?.items) ? data.items : [],
        meta: data?.meta || {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 1,
        },
        query: { ...get().query, ...params },
        isLoading: false,
      });

      return data;
    } catch (e) {
      if (e?.name === "AbortError") return null;

      set({
        isLoading: false,
        error: e?.message || "Failed to load reviews",
      });

      return null;
    }
  },

  /* ---------------- create review ---------------- */
  createReview: async (payload = {}) => {
    set({ isSaving: true, error: "" });

    try {
      const data = await requestJSON(REVIEWS_API, {
        method: "POST",
        body: isFormData(payload) ? payload : JSON.stringify(payload),
      });

      set({ isSaving: false });

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({
        isSaving: false,
        error: e?.message || "Failed to create review",
      });

      return null;
    }
  },

  /* ---------------- create rating ---------------- */
  createProductRating: async (payload = {}) => {
    set({ isSaving: true, error: "" });

    try {
      const data = await requestJSON(`${REVIEWS_API}/rating`, {
        method: "POST",
        body: isFormData(payload) ? payload : JSON.stringify(payload),
      });

      set({ isSaving: false });

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({
        isSaving: false,
        error: e?.message || "Failed to create rating",
      });

      return null;
    }
  },

  /* ---------------- update review ---------------- */
  updateReview: async (id, payload = {}) => {
    const rid = safe(id);
    if (!rid) return null;

    set({ isSaving: true, error: "" });

    try {
      const data = await requestJSON(`${REVIEWS_API}/${rid}`, {
        method: "PUT",
        body: isFormData(payload) ? payload : JSON.stringify(payload),
      });

      const updated = data?.review;

      if (updated?._id) {
        set((st) => ({
          items: st.items.map((r) =>
            String(r?._id) === String(updated._id) ? updated : r
          ),
          isSaving: false,
        }));
      } else {
        set({ isSaving: false });
      }

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({
        isSaving: false,
        error: e?.message || "Failed to update review",
      });

      return null;
    }
  },

  /* ---------------- delete review ---------------- */
  deleteReview: async (id) => {
    const rid = safe(id);
    if (!rid) return null;

    set({ isSaving: true, error: "" });

    try {
      const data = await requestJSON(`${REVIEWS_API}/${rid}`, {
        method: "DELETE",
      });

      set((st) => ({
        items: st.items.filter((r) => String(r?._id) !== rid),
        selectedIds: st.selectedIds.filter((x) => x !== rid),
        isSaving: false,
      }));

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({
        isSaving: false,
        error: e?.message || "Failed to delete review",
      });

      return null;
    }
  },

  /* ---------------- bulk status ---------------- */
  bulkUpdateStatus: async (status) => {
    const ids = get().selectedIds || [];

    if (!ids.length) {
      set({ error: "Select at least 1 review" });
      return null;
    }

    const s = safe(status);

    if (!["approved", "rejected", "pending"].includes(s)) {
      set({ error: "Invalid status" });
      return null;
    }

    set({ isSaving: true, error: "" });

    try {
      const data = await requestJSON(`${REVIEWS_API}/admin/bulk/status`, {
        method: "PATCH",
        body: JSON.stringify({ ids, status: s }),
      });

      set({
        isSaving: false,
        selectedIds: [],
      });

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({
        isSaving: false,
        error: e?.message || "Bulk status update failed",
      });

      return null;
    }
  },

  /* ---------------- bulk delete ---------------- */
  bulkDelete: async () => {
    const ids = get().selectedIds || [];

    if (!ids.length) {
      set({ error: "Select at least 1 review" });
      return null;
    }

    set({ isSaving: true, error: "" });

    try {
      const data = await requestJSON(`${REVIEWS_API}/admin/bulk/delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });

      set({
        isSaving: false,
        selectedIds: [],
      });

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({
        isSaving: false,
        error: e?.message || "Bulk delete failed",
      });

      return null;
    }
  },

  /* =========================================================
     Customer Order Review Link APIs
     GET  /api/reviews/order/:orderNumber
     POST /api/reviews/order/:orderNumber
  ========================================================= */

  fetchOrderReviewData: async (orderNumber) => {
    const num = safe(orderNumber).toUpperCase();

    if (!num) {
      set({ orderReviewError: "Order number is required" });
      return null;
    }

    set({
      isOrderReviewLoading: true,
      orderReviewError: "",
      orderReviewData: null,
    });

    try {
      const data = await requestJSON(`${REVIEWS_API}/order/${encodeURIComponent(num)}`, {
        method: "GET",
      });

      set({
        orderReviewData: data,
        isOrderReviewLoading: false,
      });

      return data;
    } catch (e) {
      set({
        isOrderReviewLoading: false,
        orderReviewError: e?.message || "Failed to load order review data",
      });

      return null;
    }
  },

  submitOrderReviews: async (orderNumber, payload) => {
    const num = safe(orderNumber).toUpperCase();

    if (!num) {
      set({ orderReviewError: "Order number is required" });
      return null;
    }

    set({
      isOrderReviewSubmitting: true,
      orderReviewError: "",
    });

    try {
      const body = isFormData(payload) ? payload : JSON.stringify(payload);

      const data = await requestJSON(`${REVIEWS_API}/order/${encodeURIComponent(num)}`, {
        method: "POST",
        body,
      });

      set({
        isOrderReviewSubmitting: false,
      });

      await get().fetchOrderReviewData(num);

      return data;
    } catch (e) {
      set({
        isOrderReviewSubmitting: false,
        orderReviewError: e?.message || "Failed to submit reviews",
      });

      return null;
    }
  },

  clearOrderReviewData: () =>
    set({
      orderReviewData: null,
      orderReviewError: "",
      isOrderReviewLoading: false,
      isOrderReviewSubmitting: false,
    }),
}));