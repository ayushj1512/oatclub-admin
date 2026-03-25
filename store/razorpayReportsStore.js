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

const defaultTransactionFilters = {
  from: "",
  to: "",
  status: "",
  page: 1,
  limit: 20,
};

const defaultSettlementFilters = {
  from: "",
  to: "",
  page: 1,
  limit: 20,
};

const defaultRemittanceFilters = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  receipt: "",
  settlementId: "",
  method: "",
  type: "",
};

/* =========================================================
   STORE
========================================================= */

export const useRazorpayReportsStore = create((set, get) => ({
  /* -----------------------------
     State
  ----------------------------- */
  transactions: [],
  settlements: [],
  recon: [],
  remittance: [],
  receiptDetail: null,
  settlementDetail: null,

  summary: {
    success: 0,
    failed: 0,
    pending: 0,
    totalAmount: 0,
  },

  remittanceSummary: {
    totalRows: 0,
    totalAmount: 0,
    totalFee: 0,
    totalTax: 0,
    totalNet: 0,
  },

  transactionFilters: { ...defaultTransactionFilters },
  settlementFilters: { ...defaultSettlementFilters },
  remittanceFilters: { ...defaultRemittanceFilters },

  transactionPagination: {
    page: 1,
    limit: 20,
    count: 0,
    pages: 1,
  },

  settlementPagination: {
    page: 1,
    limit: 20,
    count: 0,
    pages: 1,
  },

  loading: false,
  summaryLoading: false,
  receiptLoading: false,

  settlementsLoading: false,
  settlementDetailLoading: false,
  reconLoading: false,
  remittanceLoading: false,

  error: "",

  /* -----------------------------
     Setters
  ----------------------------- */
  clearError: () => set({ error: "" }),

  clearReceiptDetail: () => set({ receiptDetail: null }),

  clearSettlementDetail: () => set({ settlementDetail: null }),

  setTransactionFilters: (patch = {}) =>
    set((state) => ({
      transactionFilters: {
        ...state.transactionFilters,
        ...patch,
      },
    })),

  setSettlementFilters: (patch = {}) =>
    set((state) => ({
      settlementFilters: {
        ...state.settlementFilters,
        ...patch,
      },
    })),

  setRemittanceFilters: (patch = {}) =>
    set((state) => ({
      remittanceFilters: {
        ...state.remittanceFilters,
        ...patch,
      },
    })),

  resetTransactionFilters: () =>
    set({
      transactionFilters: { ...defaultTransactionFilters },
    }),

  resetSettlementFilters: () =>
    set({
      settlementFilters: { ...defaultSettlementFilters },
    }),

  resetRemittanceFilters: () =>
    set({
      remittanceFilters: { ...defaultRemittanceFilters },
    }),

  /* -----------------------------
     Transactions
  ----------------------------- */
  fetchTransactions: async (override = {}) => {
    try {
      set({ loading: true, error: "" });

      const filters = { ...get().transactionFilters, ...override };

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
        transactionPagination: {
          page: Number(data?.page || filters.page || 1),
          limit: Number(data?.limit || filters.limit || 20),
          count: Number(data?.count || 0),
          pages: Number(data?.pages || 1),
        },
        transactionFilters: filters,
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

  fetchSummary: async () => {
    try {
      set({ summaryLoading: true, error: "" });

      const filters = get().transactionFilters;
      const res = await fetch(
        `${API}/api/razorpay/reports/summary${qs({
          from: filters.from,
          to: filters.to,
          status: filters.status,
        })}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

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

  applyTransactionFiltersAndFetch: async (patch = {}) => {
    const next = {
      ...get().transactionFilters,
      ...patch,
      page: patch?.page ?? 1,
    };

    set({ transactionFilters: next });
    return get().fetchTransactions(next);
  },

  goToTransactionPage: async (page) => {
    const nextPage = Math.max(1, Number(page || 1));
    const next = { ...get().transactionFilters, page: nextPage };
    set({ transactionFilters: next });
    return get().fetchTransactions(next);
  },

  /* -----------------------------
     Settlements
  ----------------------------- */
  fetchSettlements: async (override = {}) => {
    try {
      set({ settlementsLoading: true, error: "" });

      const filters = { ...get().settlementFilters, ...override };

      const res = await fetch(
        `${API}/api/razorpay/reports/settlements${qs(filters)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await safeJson(res);

      set({
        settlements: Array.isArray(data?.data) ? data.data : [],
        settlementPagination: {
          page: Number(data?.page || filters.page || 1),
          limit: Number(data?.limit || filters.limit || 20),
          count: Number(data?.count || 0),
          pages: Number(data?.pages || 1),
        },
        settlementFilters: filters,
        settlementsLoading: false,
      });

      return data;
    } catch (err) {
      set({
        settlementsLoading: false,
        error: err?.message || "Failed to fetch settlements",
        settlements: [],
      });
      return { ok: false, error: err?.message || "Failed to fetch settlements" };
    }
  },

  fetchSettlementById: async (id) => {
    try {
      const cleanId = String(id || "").trim();

      if (!cleanId) {
        set({ settlementDetail: null });
        return { ok: false, error: "Settlement id is required" };
      }

      set({ settlementDetailLoading: true, error: "" });

      const res = await fetch(
        `${API}/api/razorpay/reports/settlements/${encodeURIComponent(cleanId)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await safeJson(res);

      set({
        settlementDetail: data?.data || null,
        settlementDetailLoading: false,
      });

      return data;
    } catch (err) {
      set({
        settlementDetailLoading: false,
        error: err?.message || "Failed to fetch settlement",
        settlementDetail: null,
      });
      return { ok: false, error: err?.message || "Failed to fetch settlement" };
    }
  },

  applySettlementFiltersAndFetch: async (patch = {}) => {
    const next = {
      ...get().settlementFilters,
      ...patch,
      page: patch?.page ?? 1,
    };

    set({ settlementFilters: next });
    return get().fetchSettlements(next);
  },

  goToSettlementPage: async (page) => {
    const nextPage = Math.max(1, Number(page || 1));
    const next = { ...get().settlementFilters, page: nextPage };
    set({ settlementFilters: next });
    return get().fetchSettlements(next);
  },

  /* -----------------------------
     Recon
  ----------------------------- */
  fetchRecon: async (override = {}) => {
    try {
      set({ reconLoading: true, error: "" });

      const filters = { ...get().remittanceFilters, ...override };

      const res = await fetch(
        `${API}/api/razorpay/reports/settlements/recon${qs({
          year: filters.year,
          month: filters.month,
        })}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await safeJson(res);

      set({
        recon: Array.isArray(data?.data) ? data.data : [],
        remittanceFilters: filters,
        reconLoading: false,
      });

      return data;
    } catch (err) {
      set({
        reconLoading: false,
        error: err?.message || "Failed to fetch recon",
        recon: [],
      });
      return { ok: false, error: err?.message || "Failed to fetch recon" };
    }
  },

  /* -----------------------------
     Remittance Report
  ----------------------------- */
  fetchRemittanceReport: async (override = {}) => {
    try {
      set({ remittanceLoading: true, error: "" });

      const filters = { ...get().remittanceFilters, ...override };

      const res = await fetch(
        `${API}/api/razorpay/reports/remittance${qs(filters)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await safeJson(res);

      set({
        remittance: Array.isArray(data?.data) ? data.data : [],
        remittanceSummary: {
          totalRows: Number(data?.summary?.totalRows || 0),
          totalAmount: Number(data?.summary?.totalAmount || 0),
          totalFee: Number(data?.summary?.totalFee || 0),
          totalTax: Number(data?.summary?.totalTax || 0),
          totalNet: Number(data?.summary?.totalNet || 0),
        },
        remittanceFilters: filters,
        remittanceLoading: false,
      });

      return data;
    } catch (err) {
      set({
        remittanceLoading: false,
        error: err?.message || "Failed to fetch remittance report",
        remittance: [],
        remittanceSummary: {
          totalRows: 0,
          totalAmount: 0,
          totalFee: 0,
          totalTax: 0,
          totalNet: 0,
        },
      });
      return { ok: false, error: err?.message || "Failed to fetch remittance report" };
    }
  },

  applyRemittanceFiltersAndFetch: async (patch = {}) => {
    const next = {
      ...get().remittanceFilters,
      ...patch,
    };

    set({ remittanceFilters: next });
    return get().fetchRemittanceReport(next);
  },

  /* -----------------------------
     Refresh
  ----------------------------- */
  refreshTransactions: async () => {
    await Promise.all([get().fetchSummary(), get().fetchTransactions()]);
  },

  refreshSettlements: async () => {
    await get().fetchSettlements();
  },

  refreshRemittance: async () => {
    await get().fetchRemittanceReport();
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchSummary(),
      get().fetchTransactions(),
      get().fetchSettlements(),
      get().fetchRemittanceReport(),
    ]);
  },
}));