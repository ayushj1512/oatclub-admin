"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export const useOrderStore = create((set, get) => ({
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
      error: err?.message || "Something went wrong",
    }),

  /* ============================================================
     CREATE ORDER
     POST /api/orders
  ============================================================ */
  createOrder: async (payload) => {
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const order = data?.order || data;
      set({ order });

      get()._success();
      return order;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     GET ORDER BY ID
     GET /api/orders/:id
  ============================================================ */
  fetchOrderById: async (orderId) => {
    if (!orderId) return null;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const order = data?.order || data;
      set({ order });

      get()._success();
      return order; // ✅ IMPORTANT
    } catch (e) {
      get()._error(e);
      return null; // ✅ IMPORTANT
    }
  },

  /* ============================================================
     GET ORDER BY ORDER NUMBER
     GET /api/orders/by-number/:orderNumber
  ============================================================ */
  fetchOrderByNumber: async (orderNumber) => {
    if (!orderNumber) return null;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/by-number/${orderNumber}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const order = data?.order || data;
      set({ order });

      get()._success();
      return order; // ✅ IMPORTANT
    } catch (e) {
      get()._error(e);
      return null; // ✅ IMPORTANT
    }
  },

  /* ============================================================
     GET ORDERS BY CUSTOMER
     GET /api/orders/customer/:customerId
  ============================================================ */
  fetchOrdersByCustomer: async (customerId) => {
    if (!customerId) return [];

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/customer/${customerId}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const orders = Array.isArray(data) ? data : data?.orders || [];
      set({ orders });

      get()._success();
      return orders;
    } catch (e) {
      get()._error(e);
      return [];
    }
  },

  /* ============================================================
     GET ALL ORDERS (ADMIN)
     GET /api/orders?filters
  ============================================================ */
  fetchAllOrders: async (filters = {}) => {
    get()._start();
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetch(`${API}/api/orders?${qs}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const orders = Array.isArray(data) ? data : data?.orders || [];
      set({ orders });

      get()._success();
      return orders;
    } catch (e) {
      get()._error(e);
      return [];
    }
  },

  /* ============================================================
     UPDATE ORDER STATUS
     PATCH /api/orders/:id/status
  ============================================================ */
  updateOrderStatus: async (orderId, payload) => {
    if (!orderId) return null;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const order = data?.order || data;
      set({ order });

      get()._success();
      return order;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     CANCEL ORDER
     POST /api/orders/:id/cancel
  ============================================================ */
  cancelOrder: async (orderId, reason) => {
    if (!orderId) return false;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      // ✅ update local order state (nice UX)
      const current = get().order;
      if (current && (current._id === orderId || current.id === orderId)) {
        set({
          order: {
            ...current,
            fulfillmentStatus: "cancelled",
            shipment: {
              ...(current.shipment || {}),
              status: "cancelled",
            },
          },
        });
      }

      get()._success();
      return true;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     RESET / CLEAR
  ============================================================ */
  clearOrder: () => set({ order: null }),
clearOrders: () => set({ orders: [] }),

  resetStore: () =>
    set({
      orders: [],
      order: null,
      loading: false,
      error: null,
    }),
}));
