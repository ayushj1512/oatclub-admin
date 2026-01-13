"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export const useShiprocketStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  loading: false,
  error: null,

  // last action results
  result: null,       // for single booking response
  bulkResult: null,   // for bulk booking response

  /* ============================================================
     HELPERS
  ============================================================ */
  _start: () => set({ loading: true, error: null }),
  _success: () => set({ loading: false }),
  _error: (err) =>
    set({
      loading: false,
      error: err?.message || "Something went wrong",
    }),

  _normalize: (data) => data?.order || data || null,

  /* ============================================================
     SINGLE: BOOK SHIPROCKET (ONLY IF MISSING)
     POST /api/orders/:id/shiprocket/book
  ============================================================ */
  bookShiprocketIfMissing: async (orderId) => {
    if (!orderId) return null;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/shiprocket/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ result: data });

      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     BULK: BOOK SHIPROCKET FOR ELIGIBLE ORDERS (CONFIRMED + MISSING)
     POST /api/orders/shiprocket/book-missing?limit=25&paymentMethod=cod&fulfillmentStatus=processing
  ============================================================ */
  bulkBookShiprocketMissing: async (filters = {}) => {
    get()._start();
    try {
      const qs = new URLSearchParams(filters).toString();

      const res = await fetch(
        `${API}/api/orders/shiprocket/book-missing${qs ? `?${qs}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ bulkResult: data });

      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     RESET / CLEAR
  ============================================================ */
  clearResult: () => set({ result: null }),
  clearBulkResult: () => set({ bulkResult: null }),

  resetStore: () =>
    set({
      loading: false,
      error: null,
      result: null,
      bulkResult: null,
    }),
}));
