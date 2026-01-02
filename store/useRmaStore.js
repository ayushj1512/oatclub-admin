"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export const useRmaStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  rmas: [], // ✅ list of rmas (admin or order specific)
  rma: null, // ✅ single rma

  loading: false,
  error: null,

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

  /* ============================================================
     ✅ ADMIN: FETCH ALL RMAs (GLOBAL LIST)
     GET /api/orders/rma
  ============================================================ */
  fetchAllRmas: async (filters = {}) => {
    get()._start();
    try {
      const qs = new URLSearchParams(filters).toString();

      const res = await fetch(`${API}/api/orders/rma?${qs}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      // backend returns { rmas: [] }
      set({ rmas: Array.isArray(data?.rmas) ? data.rmas : [] });

      get()._success();
      return data?.rmas || [];
    } catch (e) {
      get()._error(e);
      return [];
    }
  },

  /* ============================================================
     CREATE RMA
     POST /api/orders/:id/rma
     payload: { type, reason, items, exchangeTo? }
  ============================================================ */
  createRma: async (orderId, payload) => {
    if (!orderId) return null;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/rma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const created = data?.rma || null;

      // ✅ push new RMA into list
      set({
        rma: created,
        rmas: [...(get().rmas || []), created].filter(Boolean),
      });

      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     GET ALL RMAs OF AN ORDER
     GET /api/orders/:id/rma
  ============================================================ */
  fetchRmasByOrder: async (orderId) => {
    if (!orderId) return [];
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/rma`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({
        rmas: Array.isArray(data?.rmas) ? data.rmas : [],
        rma: null,
      });

      get()._success();
      return data?.rmas || [];
    } catch (e) {
      get()._error(e);
      return [];
    }
  },

  /* ============================================================
     GET SINGLE RMA
     GET /api/orders/:id/rma/:rmaNumber
  ============================================================ */
  fetchRmaByNumber: async (orderId, rmaNumber) => {
    if (!orderId || !rmaNumber) return null;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/rma/${rmaNumber}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const single = data?.rma || null;

      set({ rma: single });
      get()._success();
      return single;
    } catch (e) {
      get()._error(e);
      return null;
    }
  },

  /* ============================================================
     UPDATE RMA (ADMIN)
     PATCH /api/orders/:id/rma/:rmaNumber
  ============================================================ */
  updateRma: async (orderId, rmaNumber, payload) => {
    if (!orderId || !rmaNumber) return null;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/rma/${rmaNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      // backend might return { rma } OR { rma: updated }
      const updated = data?.rma || data?.updatedRma || null;

      set({
        rma: updated,
        rmas: (get().rmas || []).map((r) =>
          r?.rmaNumber === updated?.rmaNumber ? updated : r
        ),
      });

      get()._success();
      return updated;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     RESET
  ============================================================ */
  clearRma: () => set({ rma: null }),
  clearRmas: () => set({ rmas: [], rma: null }),

  resetStore: () =>
    set({
      rmas: [],
      rma: null,
      loading: false,
      error: null,
    }),
}));
