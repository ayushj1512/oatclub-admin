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

export const useWordpressStore = create((set) => ({
  /* ============================================================
     STATE
  ============================================================ */
  orders: [],
  order: null,
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
      error: err?.message || "Failed to fetch WooCommerce data",
    }),

  


  /* ============================================================
     FETCH SINGLE WC ORDER BY ID
     /wp-json/wc/v3/orders/:id
  ============================================================ */
  fetchOrderById: async (orderId) => {
    if (!orderId) return;

    set({ loading: true, error: null });

    try {
      const res = await fetch(
        withAuth(`${WC_BASE}/orders/${orderId}`),
        { cache: "no-store" }
      );

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
      const res = await fetch(
        withAuth(`${WC_BASE}/orders?search=${orderNumber}`),
        { cache: "no-store" }
      );

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
     FETCH MULTIPLE WC ORDERS (OPTIONAL)
     status, per_page, page
  ============================================================ */
  fetchAllOrders: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetch(
        withAuth(`${WC_BASE}/orders?${qs}`),
        { cache: "no-store" }
      );

      console.log("WC CONFIG", {
  WC_BASE: `${process.env.NEXT_PUBLIC_WC_STORE_URL}/wp-json/wc/v3`,
  CK_PRESENT: !!process.env.NEXT_PUBLIC_WC_CONSUMER_KEY,
  CS_PRESENT: !!process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET,
});


      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch Woo orders");
      }

      const data = await res.json();
      set({
        orders: Array.isArray(data) ? data : [],
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  

  /* ============================================================
     RESET
  ============================================================ */
  clearOrder: () => set({ order: null }),
}));
