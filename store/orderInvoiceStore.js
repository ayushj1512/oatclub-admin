"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/* ============================================================
   HELPERS
============================================================ */

const stripUndefinedDeep = (obj) => {
  if (Array.isArray(obj)) return obj.map(stripUndefinedDeep);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return obj;
};

const safe = (v) => String(v ?? "").trim();

const uniqStrings = (arr = []) =>
  [...new Set((Array.isArray(arr) ? arr : []).map((x) => safe(x)).filter(Boolean))];

const normalizeInvoice = (data) => data?.invoice ?? null;

const normalizeInvoices = (data) => {
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

/* ============================================================
   STORE
============================================================ */

export const useOrderInvoiceStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  invoice: null,
  invoices: [],
  loading: false,
  error: null,

  /* =========================
     UI HELPERS
  ========================= */
  _start: () => set({ loading: true, error: null }),
  _success: () => set({ loading: false }),
  _fail: (err) =>
    set({
      loading: false,
      error: err?.message || "Something went wrong",
    }),

  /* =========================
     FETCH HELPERS
  ========================= */
  _json: async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Request failed");
    return data;
  },

  _get: async (path) => {
    get()._start();
    try {
      const res = await fetch(`${API}${path}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  _post: async (path, payload) => {
    get()._start();
    try {
      const body = JSON.stringify(stripUndefinedDeep(payload || {}));
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });
      const data = await get()._json(res);
      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  /* =========================
     ACTIONS
  ========================= */

  // GET /api/orders/:id/invoice
  fetchInvoiceById: async (orderId) => {
    const id = safe(orderId);
    if (!id) return null;

    const data = await get()._get(`/api/orders/${id}/invoice`);
    const invoice = normalizeInvoice(data);

    set({ invoice });
    return invoice;
  },

  // GET /api/orders/by-number/:orderNumber/invoice
  fetchInvoiceByOrderNumber: async (orderNumber) => {
    const num = safe(orderNumber);
    if (!num) return null;

    const data = await get()._get(
      `/api/orders/by-number/${encodeURIComponent(num)}/invoice`
    );
    const invoice = normalizeInvoice(data);

    set({ invoice });
    return invoice;
  },

  // POST /api/orders/invoices
  // body: { orderNumbers: [...] }
  fetchInvoicesByOrderNumbers: async (orderNumbers = []) => {
    const cleaned = uniqStrings(orderNumbers);

    if (!cleaned.length) {
      set({ invoices: [] });
      return [];
    }

    const data = await get()._post(`/api/orders/invoices`, {
      orderNumbers: cleaned,
    });

    const invoices = normalizeInvoices(data);
    set({ invoices });

    return invoices;
  },

  // Convenience helper for selected orders array / objects
  // accepts:
  // ["MIRAY-001", "MIRAY-002"]
  // [{ orderNumber: "MIRAY-001" }, { orderNumber: "MIRAY-002" }]
  // [{ invoiceNumber: "MIRAY-001" }]
  fetchInvoicesFromOrders: async (orders = []) => {
    const orderNumbers = uniqStrings(
      (Array.isArray(orders) ? orders : []).map(
        (o) => o?.orderNumber || o?.invoiceNumber
      )
    );

    return get().fetchInvoicesByOrderNumbers(orderNumbers);
  },

  /* =========================
     RESET
  ========================= */
  clearInvoice: () => set({ invoice: null }),

  clearInvoices: () => set({ invoices: [] }),

  resetStore: () =>
    set({
      invoice: null,
      invoices: [],
      loading: false,
      error: null,
    }),
}));

export default useOrderInvoiceStore;