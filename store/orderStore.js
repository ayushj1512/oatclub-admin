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

      set({ order: data.order });
      get()._success();
      return data.order;
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
    if (!orderId) return;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ order: data });
      get()._success();
    } catch (e) {
      get()._error(e);
    }
  },

  /* ============================================================
     GET ORDER BY ORDER NUMBER
     GET /api/orders/by-number/:orderNumber
  ============================================================ */
  fetchOrderByNumber: async (orderNumber) => {
    if (!orderNumber) return;
    get()._start();
    try {
      const res = await fetch(
        `${API}/api/orders/by-number/${orderNumber}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ order: data });
      get()._success();
    } catch (e) {
      get()._error(e);
    }
  },

  /* ============================================================
     GET ORDERS BY CUSTOMER
     GET /api/orders/customer/:customerId
  ============================================================ */
  fetchOrdersByCustomer: async (customerId) => {
    if (!customerId) return;
    get()._start();
    try {
      const res = await fetch(
        `${API}/api/orders/customer/${customerId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ orders: Array.isArray(data) ? data : [] });
      get()._success();
    } catch (e) {
      get()._error(e);
    }
  },

  /* ============================================================
     GET ALL ORDERS (ADMIN)
     GET /api/orders
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

      set({ orders: Array.isArray(data) ? data : [] });
      get()._success();
    } catch (e) {
      get()._error(e);
    }
  },

  /* ============================================================
     UPDATE ORDER STATUS
     PATCH /api/orders/:id/status
  ============================================================ */
  updateOrderStatus: async (orderId, payload) => {
    if (!orderId) return;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ order: data.order });
      get()._success();
      return data.order;
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
    if (!orderId) return;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      get()._success();
      return true;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     CREATE RMA
     POST /api/orders/:id/rma
  ============================================================ */
  createRma: async (orderId, payload) => {
    if (!orderId) return;
    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/rma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ order: data.order || get().order });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     UPDATE RMA (ADMIN)
     PATCH /api/orders/:id/rma/:rmaNumber
  ============================================================ */
  updateRma: async (orderId, rmaNumber, payload) => {
    if (!orderId || !rmaNumber) return;
    get()._start();
    try {
      const res = await fetch(
        `${API}/api/orders/${orderId}/rma/${rmaNumber}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      set({ order: data.order || get().order });
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     RESET
  ============================================================ */
  clearOrder: () => set({ order: null }),
}));
