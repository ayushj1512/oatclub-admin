"use client";

import { create } from "zustand";

/* ============================================================
   WOOCOMMERCE CONFIG (FRONTEND-ONLY)
============================================================ */
const WC_BASE = `${process.env.NEXT_PUBLIC_WC_STORE_URL}/wp-json/wc/v3`;
const CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
const CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;

const withAuth = (url) =>
  `${url}${url.includes("?") ? "&" : "?"}consumer_key=${CK}&consumer_secret=${CS}`;

export const useWordpressStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  orders: [],
  order: null,

  // ✅ Common loader/error (used for both single + list)
  loading: false,
  error: null,

  /* ============================================================
     ✅ ALIASES (Dashboard expects these names)
  ============================================================ */
  loadingOrders: false,
  errorOrders: null,

  /* ============================================================
     HELPERS
  ============================================================ */
  _start: () =>
    set({
      loading: true,
      error: null,

      // ✅ Dashboard friendly
      loadingOrders: true,
      errorOrders: null,
    }),

  _success: () =>
    set({
      loading: false,

      // ✅ Dashboard friendly
      loadingOrders: false,
    }),

  _error: (err) =>
    set({
      loading: false,
      error: err?.message || "Failed to fetch WooCommerce data",

      // ✅ Dashboard friendly
      loadingOrders: false,
      errorOrders: err?.message || "Failed to fetch WooCommerce data",
    }),

  /* ============================================================
     DEBUG CONFIG (call once if needed)
  ============================================================ */
  debugConfig: () => {
    console.log("WC CONFIG", {
      WC_BASE,
      CK_PRESENT: !!CK,
      CS_PRESENT: !!CS,
      STORE_URL: process.env.NEXT_PUBLIC_WC_STORE_URL,
    });
  },

  /* ============================================================
     FETCH SINGLE WC ORDER BY ID
     /wp-json/wc/v3/orders/:id
  ============================================================ */
  fetchOrderById: async (orderId) => {
    if (!orderId) return;

    set({ loading: true, error: null });

    try {
      const res = await fetch(withAuth(`${WC_BASE}/orders/${orderId}`), {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch Woo order");
      }

      const data = await res.json();
      set({ order: data, loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* ============================================================
     FETCH WC ORDER BY ORDER NUMBER
     Uses ?search=
  ============================================================ */
  fetchOrderByNumber: async (orderNumber) => {
    if (!orderNumber) return;

    set({ loading: true, error: null });

    try {
      const res = await fetch(withAuth(`${WC_BASE}/orders?search=${orderNumber}`), {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch Woo order");
      }

      const data = await res.json();
      const order = Array.isArray(data) ? data[0] : null;

      if (!order) throw new Error("Order not found");

      set({ order, loading: false });
      return order;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* ============================================================
     ✅ FETCH MULTIPLE WC ORDERS (LIST)
     filters example:
     { status: "processing", per_page: 50, page: 1 }
  ============================================================ */
  fetchAllOrders: async (filters = {}) => {
    get()._start();

    try {
      // ✅ default filters (latest 50 orders)
      const finalFilters = {
        per_page: 50,
        page: 1,
        orderby: "date",
        order: "desc",
        ...filters,
      };

      const qs = new URLSearchParams(finalFilters).toString();
      const url = withAuth(`${WC_BASE}/orders?${qs}`);

      // ✅ Debug
      console.log("FETCH ALL ORDERS =>", url);

      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch Woo orders");
      }

      const data = await res.json();

      set({
        orders: Array.isArray(data) ? data : [],
      });

      get()._success();
    } catch (e) {
      get()._error(e);
    }
  },

  /* ============================================================
     ✅ ALIAS: Dashboard expects fetchOrders()
  ============================================================ */
  fetchOrders: async (filters = {}) => {
    return get().fetchAllOrders(filters);
  },

  /* ============================================================
     RESET
  ============================================================ */
  clearOrder: () => set({ order: null }),
}));
