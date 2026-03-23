"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/* =========================================================
   HELPERS
========================================================= */

const qs = (params = {}) => {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    sp.append(key, String(value));
  });

  const str = sp.toString();
  return str ? `?${str}` : "";
};

const safeJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }
  return data;
};

/* =========================================================
   STORE
========================================================= */

export const useRazorpayReportsStore = create((set, get) => ({
  /* -----------------------------
     State
  ----------------------------- */
  transactions: [],
  summary: {
    success: 0,
    failed: 0,
    pending: 0,
    totalAmount: 0,
  },
  receiptDetail: null,

  filters: {
    from: "",
    to: "",
    status: "",
    page: 1,
    limit: 20,
  },

  pagination: {
    page: 1,
    limit: 20,
    count: 0,
  },

  loading: false,
  summaryLoading: false,
  receiptLoading: false,
  error: "",

  /* -----------------------------
     Setters
  ----------------------------- */
  setFilters: (patch = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...patch,
      },
    })),

  resetFilters: () =>
    set({
      filters: {
        from: "",
        to: "",
        status: "",
        page: 1,
        limit: 20,
      },
    }),

  clearReceiptDetail: () => set({ receiptDetail: null }),

  clearError: () => set({ error: "" }),

  /* -----------------------------
     Fetch Transactions
  ----------------------------- */
  fetchTransactions: async (override = {}) => {
    try {
      set({ loading: true, error: "" });

      const filters = { ...get().filters, ...override };

      const res = await fetch(
        `${API}/api/razorpay/reports/transactions${qs(filters)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await safeJson(res);

      set({
        transactions: Array.isArray(data?.data) ? data.data : [],
        pagination: {
          page: Number(data?.page || filters.page || 1),
          limit: Number(data?.limit || filters.limit || 20),
          count: Number(data?.count || 0),
        },
        filters,
        loading: false,
      });

      return data;
    } catch (err) {
      set({
        loading: false,
        error: err?.message || "Failed to fetch transactions",
        transactions: [],
      });
      return { ok: false, error: err?.message || "Failed to fetch transactions" };
    }
  },

  /* -----------------------------
     Fetch Summary
  ----------------------------- */
  fetchSummary: async () => {
    try {
      set({ summaryLoading: true, error: "" });

      const res = await fetch(`${API}/api/razorpay/reports/summary`, {
        method: "GET",
        credentials: "include",
      });

      const data = await safeJson(res);

      set({
        summary: {
          success: Number(data?.summary?.success || 0),
          failed: Number(data?.summary?.failed || 0),
          pending: Number(data?.summary?.pending || 0),
          totalAmount: Number(data?.summary?.totalAmount || 0),
        },
        summaryLoading: false,
      });

      return data;
    } catch (err) {
      set({
        summaryLoading: false,
        error: err?.message || "Failed to fetch summary",
      });
      return { ok: false, error: err?.message || "Failed to fetch summary" };
    }
  },

  /* -----------------------------
     Fetch By Receipt
  ----------------------------- */
  fetchByReceipt: async (receipt) => {
    try {
      const cleanReceipt = String(receipt || "").trim();

      if (!cleanReceipt) {
        set({ receiptDetail: null });
        return { ok: false, error: "Receipt is required" };
      }

      set({ receiptLoading: true, error: "" });

      const res = await fetch(
        `${API}/api/razorpay/reports/receipt/${encodeURIComponent(cleanReceipt)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await safeJson(res);

      set({
        receiptDetail: data || null,
        receiptLoading: false,
      });

      return data;
    } catch (err) {
      set({
        receiptLoading: false,
        error: err?.message || "Failed to fetch receipt details",
        receiptDetail: null,
      });
      return { ok: false, error: err?.message || "Failed to fetch receipt details" };
    }
  },

  /* -----------------------------
     Refresh Helpers
  ----------------------------- */
  refreshAll: async () => {
    await Promise.all([get().fetchSummary(), get().fetchTransactions()]);
  },

  applyFiltersAndFetch: async (patch = {}) => {
    const next = {
      ...get().filters,
      ...patch,
      page: patch?.page ?? 1,
    };

    set({ filters: next });
    return get().fetchTransactions(next);
  },

  goToPage: async (page) => {
    const nextPage = Math.max(1, Number(page || 1));
    const next = { ...get().filters, page: nextPage };
    set({ filters: next });
    return get().fetchTransactions(next);
  },
}));