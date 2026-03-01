"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000")
  .trim()
  .replace(/\/+$/, "");

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.append(key, String(value));
  });
  const s = query.toString();
  return s ? `?${s}` : "";
};

const parseError = async (res) => {
  try {
    const data = await res.json();
    return data?.message || data?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
};

export const useAdminMarketingSpendStore = create((set, get) => ({
  spends: [],
  summary: null,

  // ✅ for infinite scrolling
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
  hasMore: false,

  // ✅ keep filters in store so UI changes don't auto-fetch unless you call fetch
  filters: {
    source: "",
    from: "",
    to: "",
  },

  loading: false,
  error: null,

  setFilters: (patch = {}) =>
    set((state) => ({
      filters: { ...state.filters, ...(patch || {}) },
    })),

  resetFilters: () =>
    set({
      filters: { source: "", from: "", to: "" },
    }),

  /* ----------------------------------------
     FETCH SPENDS (REPLACE LIST)
     - supports pagination
     - default: show all (no from/to/source)
     ---------------------------------------- */
  fetchSpends: async (opts = {}) => {
    const state = get();
    const merged = {
      ...state.filters,
      ...opts,
    };

    const page = Math.max(1, Number(merged.page || 1));
    const limit = Math.min(200, Math.max(1, Number(merged.limit || state.limit || 50)));

    // remove internal keys from query (keep only api keys)
    const apiFilters = {
      source: merged.source || "",
      from: merged.from || "",
      to: merged.to || "",
      page,
      limit,
    };

    const qs = buildQueryString(apiFilters);
    const url = `${API}/api/marketing/spend${qs}`;

    try {
      set({ loading: true, error: null });

      console.log("[MarketingSpend] fetchSpends ->", url);

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }

      const data = await res.json();

      const items = Array.isArray(data?.data) ? data.data : [];
      const pg = data?.pagination || {};
      const total = Number(pg?.total ?? items.length ?? 0);
      const pages = Number(pg?.pages ?? 0);
      const hasMore =
        typeof pg?.hasMore === "boolean"
          ? pg.hasMore
          : page < (pages || 0);

      set({
        spends: items,
        page,
        limit,
        total,
        pages,
        hasMore,
        loading: false,
      });

      return { success: true, data };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error fetching spends",
      });
      return { success: false };
    }
  },

  /* ----------------------------------------
     FETCH MORE (APPEND) - Infinite scroll
     - uses current filters
     ---------------------------------------- */
  fetchMoreSpends: async () => {
    const { loading, hasMore, page } = get();
    if (loading) return { success: false, skipped: "loading" };
    if (!hasMore) return { success: false, skipped: "no_more" };

    const nextPage = Number(page || 1) + 1;
    const state = get();

    const apiFilters = {
      source: state.filters?.source || "",
      from: state.filters?.from || "",
      to: state.filters?.to || "",
      page: nextPage,
      limit: state.limit || 50,
    };

    const qs = buildQueryString(apiFilters);
    const url = `${API}/api/marketing/spend${qs}`;

    try {
      set({ loading: true, error: null });

      console.log("[MarketingSpend] fetchMoreSpends ->", url);

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }

      const data = await res.json();

      const items = Array.isArray(data?.data) ? data.data : [];
      const pg = data?.pagination || {};
      const total = Number(pg?.total ?? state.total ?? 0);
      const pages = Number(pg?.pages ?? state.pages ?? 0);
      const hasMore =
        typeof pg?.hasMore === "boolean"
          ? pg.hasMore
          : nextPage < (pages || 0);

      set((s) => ({
        spends: [...(s.spends || []), ...items],
        page: nextPage,
        total,
        pages,
        hasMore,
        loading: false,
      }));

      return { success: true, data };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error fetching more spends",
      });
      return { success: false };
    }
  },

  /* ----------------------------------------
     CREATE SPEND
     ---------------------------------------- */
  createSpend: async (payload) => {
    const url = `${API}/api/marketing/spend`;

    try {
      set({ loading: true, error: null });

      console.log("[MarketingSpend] createSpend ->", url, payload);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }

      const data = await res.json();
      const doc = data?.data || null;

      set((state) => ({
        spends: doc ? [doc, ...(state.spends || [])] : state.spends,
        total: doc ? Number(state.total || 0) + 1 : state.total,
        loading: false,
      }));

      return { success: true, data: doc };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error creating spend",
      });
      return { success: false };
    }
  },

  /* ----------------------------------------
     DELETE SPEND
     ---------------------------------------- */
  deleteSpend: async (id) => {
    const url = `${API}/api/marketing/spend/${id}`;

    try {
      set({ loading: true, error: null });

      console.log("[MarketingSpend] deleteSpend ->", url);

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }

      set((state) => {
        const before = Array.isArray(state.spends) ? state.spends.length : 0;
        const next = (state.spends || []).filter((s) => s._id !== id);
        const after = next.length;
        const removed = before - after;

        return {
          spends: next,
          total: Math.max(0, Number(state.total || 0) - Math.max(0, removed)),
          loading: false,
        };
      });

      return { success: true };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error deleting spend",
      });
      return { success: false };
    }
  },

  /* ----------------------------------------
     FETCH MONTHLY SUMMARY
     - backend returns { success, month, tz, grandTotal, bySource }
     ---------------------------------------- */
  fetchSummary: async (month) => {
    const url = `${API}/api/marketing/spend/summary?month=${encodeURIComponent(
      month || ""
    )}`;

    try {
      set({ loading: true, error: null });

      console.log("[MarketingSpend] fetchSummary ->", url);

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }

      const data = await res.json();

      set({
        summary: data || null,
        loading: false,
      });

      return { success: true, data };
    } catch (e) {
      set({
        loading: false,
        error: e?.message || "Error fetching summary",
      });
      return { success: false };
    }
  },

  reset: () => {
    set({
      spends: [],
      summary: null,
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
      hasMore: false,
      filters: { source: "", from: "", to: "" },
      loading: false,
      error: null,
    });
  },
}));