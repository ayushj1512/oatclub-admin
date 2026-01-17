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

  _normalizeOrders: (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    return [];
  },

  _normalizeOrder: (data) => data?.order || data || null,

  _syncOrderInList: (updatedOrder) => {
    if (!updatedOrder?._id) return;

    set((state) => ({
      orders: (state.orders || []).map((o) =>
        String(o?._id) === String(updatedOrder._id) ? updatedOrder : o
      ),
    }));
  },

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

      const order = get()._normalizeOrder(data);
      set({ order });

      // ✅ keep orders list updated too
      set((state) => ({
        orders: order ? [order, ...(state.orders || [])] : state.orders,
      }));

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

      const order = get()._normalizeOrder(data);
      set({ order });

      get()._success();
      return order;
    } catch (e) {
      get()._error(e);
      return null;
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

      const order = get()._normalizeOrder(data);
      set({ order });

      get()._success();
      return order;
    } catch (e) {
      get()._error(e);
      return null;
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

      const orders = get()._normalizeOrders(data);
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
      const res = await fetch(`${API}/api/orders${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const orders = get()._normalizeOrders(data);
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

      const order = get()._normalizeOrder(data);

      set({ order });
      get()._syncOrderInList(order); // ✅ FIX: update list also

      get()._success();
      return order;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  /* ============================================================
     UPDATE TRACKING (optional admin)
     PATCH /api/orders/:id/tracking
  ============================================================ */
  updateTracking: async (orderId, payload) => {
    if (!orderId) return null;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const order = get()._normalizeOrder(data);

      set({ order });
      get()._syncOrderInList(order);

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
     ✅ Updated:
     - default reason -> cancelled_by_admin
     - also sends cancelledBy: "admin" (safe/future-proof)
     - updates local state with adminRemarks
  ============================================================ */
  cancelOrder: async (orderId, reason = "cancelled_by_admin") => {
  if (!orderId) return false;

  get()._start();
  try {
    const res = await fetch(`${API}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillmentStatus: "cancelled",
        reason: reason || "cancelled_by_admin",   // ✅ explicit
        cancelledBy: "admin",                     // ✅ extra safety
        adminRemarks: "cancelled_by_admin",       // ✅ helps your pickCancelReason fallback
        // customerMessage: ""                    // optional
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Cancel failed");

    // ✅ use server as source of truth (IMPORTANT)
    const serverOrder = data?.order;

    if (serverOrder) {
      set({ order: serverOrder });
      get()._syncOrderInList(serverOrder);
    } else {
      // fallback (shouldn't happen)
      const current = get().order;
      if (current && String(current._id) === String(orderId)) {
        const updated = {
          ...current,
          fulfillmentStatus: "cancelled",
          adminRemarks: "cancelled_by_admin",
          customerMessage: "", // ✅ clear customer side msg
          shipment: { ...(current.shipment || {}), status: "cancelled" },
        };
        set({ order: updated });
        get()._syncOrderInList(updated);
      }
    }

    get()._success();
    return true;
  } catch (e) {
    get()._error(e);
    throw e;
  }
},


  /* ============================================================
   UPDATE ADDRESS (admin)
   PATCH /api/orders/:id/address
============================================================ */
  updateOrderAddress: async (orderId, payload) => {
    if (!orderId) return null;

    get()._start();
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/address`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // { type: "shipping"|"billing", address: {...} }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message);

      const order = get()._normalizeOrder(data);

      set({ order });
      get()._syncOrderInList(order);

      get()._success();
      return order;
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
