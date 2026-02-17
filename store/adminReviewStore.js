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
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

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

/* =========================================================
   Admin Review Store
========================================================= */
export const useAdminReviewStore = create((set, get) => ({
  /* ---------------- data ---------------- */
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },

  /* ---------------- ui state ---------------- */
  isLoading: false,
  isSaving: false,
  error: "",

  /* ---------------- selection (bulk ops) ---------------- */
  selectedIds: [],

  /* ---------------- query state ---------------- */
  query: {
    page: 1,
    limit: 20,
    status: "", // pending | approved | rejected
    rating: "", // 1..5
    productCode: "",
    customerEmail: "",
    q: "", // text search
    sort: "latest", // latest|oldest|ratingHigh|ratingLow
  },

  /* ---------------- internal (abort) ---------------- */
  _controller: null,

  /* ---------------- actions: query helpers ---------------- */
  setQuery: (patch = {}) =>
    set((st) => ({
      query: { ...st.query, ...patch, page: patch.page ?? st.query.page },
    })),

  resetQuery: () =>
    set({
      query: {
        page: 1,
        limit: 20,
        status: "",
        rating: "",
        productCode: "",
        customerEmail: "",
        q: "",
        sort: "latest",
      },
    }),

  /* ---------------- actions: selection ---------------- */
  setSelectedIds: (ids = []) => set({ selectedIds: Array.from(new Set(ids)) }),
  toggleSelect: (id) => {
    const sid = safe(id);
    if (!sid) return;
    const { selectedIds } = get();
    const has = selectedIds.includes(sid);
    set({ selectedIds: has ? selectedIds.filter((x) => x !== sid) : [...selectedIds, sid] });
  },
  clearSelection: () => set({ selectedIds: [] }),
  selectAllOnPage: () => {
    const ids = (get().items || []).map((r) => String(r?._id || "")).filter(Boolean);
    set({ selectedIds: Array.from(new Set(ids)) });
  },

  /* ---------------- actions: fetch list ---------------- */
  fetchAdminReviews: async (override = {}) => {
    // cancel previous in-flight
    try {
      get()._controller?.abort?.();
    } catch (_) {}

    const controller = new AbortController();
    set({ _controller: controller, isLoading: true, error: "" });

    try {
      const q = { ...get().query, ...override };

      // normalize
      const params = {
        page: Math.max(toInt(q.page, 1), 1),
        limit: Math.min(Math.max(toInt(q.limit, 20), 1), 100),
        sort: safe(q.sort) || "latest",
        status: safe(q.status),
        rating: safe(q.rating),
        productCode: safe(q.productCode),
        customerEmail: safe(q.customerEmail).toLowerCase(),
        q: safe(q.q),
      };

      const url = `${REVIEWS_API}/admin/list${buildQuery(params)}`;
      const data = await requestJSON(url, { method: "GET", signal: controller.signal });

      set({
        items: Array.isArray(data?.items) ? data.items : [],
        meta: data?.meta || { page: params.page, limit: params.limit, total: 0, totalPages: 1 },
        query: { ...get().query, ...params }, // keep in sync
        isLoading: false,
      });

      return data;
    } catch (e) {
      if (e?.name === "AbortError") return null;
      set({ isLoading: false, error: e?.message || "Failed to load reviews" });
      return null;
    }
  },

  /* ---------------- actions: single update ---------------- */
  updateReview: async (id, payload = {}) => {
    const rid = safe(id);
    if (!rid) return null;

    set({ isSaving: true, error: "" });
    try {
      const url = `${REVIEWS_API}/${rid}`;
      const data = await requestJSON(url, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // optimistic refresh in list
      const updated = data?.review;
      if (updated?._id) {
        set((st) => ({
          items: st.items.map((r) => (String(r?._id) === String(updated._id) ? updated : r)),
          isSaving: false,
        }));
      } else {
        set({ isSaving: false });
      }

      // list stats can change (approved/pending etc) => safest: refetch current page
      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({ isSaving: false, error: e?.message || "Failed to update review" });
      return null;
    }
  },

  /* ---------------- actions: single delete ---------------- */
  deleteReview: async (id) => {
    const rid = safe(id);
    if (!rid) return null;

    set({ isSaving: true, error: "" });
    try {
      const url = `${REVIEWS_API}/${rid}`;
      const data = await requestJSON(url, { method: "DELETE" });

      // remove from list
      set((st) => ({
        items: st.items.filter((r) => String(r?._id) !== rid),
        selectedIds: st.selectedIds.filter((x) => x !== rid),
        isSaving: false,
      }));

      // refetch to keep pagination/meta correct
      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({ isSaving: false, error: e?.message || "Failed to delete review" });
      return null;
    }
  },

  /* ---------------- actions: bulk status ---------------- */
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
      const url = `${REVIEWS_API}/admin/bulk/status`;
      const data = await requestJSON(url, {
        method: "PATCH",
        body: JSON.stringify({ ids, status: s }),
      });

      set({ isSaving: false, selectedIds: [] });

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({ isSaving: false, error: e?.message || "Bulk status update failed" });
      return null;
    }
  },

  /* ---------------- actions: bulk delete ---------------- */
  bulkDelete: async () => {
    const ids = get().selectedIds || [];
    if (!ids.length) {
      set({ error: "Select at least 1 review" });
      return null;
    }

    set({ isSaving: true, error: "" });
    try {
      const url = `${REVIEWS_API}/admin/bulk/delete`;
      const data = await requestJSON(url, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });

      set({ isSaving: false, selectedIds: [] });

      await get().fetchAdminReviews({ page: get().query.page });

      return data;
    } catch (e) {
      set({ isSaving: false, error: e?.message || "Bulk delete failed" });
      return null;
    }
  },
}));
