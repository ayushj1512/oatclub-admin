import { create } from "zustand";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export const useCustomerCareOrdersStore = create((set, get) => ({
  orders: [],
  isLoading: false,
  isUpdating: false,
  error: null,

  clearError: () => set({ error: null }),

  resetOrders: () =>
    set({
      orders: [],
      isLoading: false,
      isUpdating: false,
      error: null,
    }),

  // ✅ FETCH ALL ORDERS
  fetchAllOrders: async () => {
    try {
      set({ isLoading: true, error: null });

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to fetch orders");
      }

      const data = await res.json();
      set({ orders: data, isLoading: false });
    } catch (err) {
      set({
        error: err?.message || "Something went wrong",
        isLoading: false,
      });
    }
  },

  // ✅ UPDATE SINGLE ORDER STATUS
  updateOrderStatus: async (orderId, newStatus) => {
    const prevOrders = get().orders;

    try {
      set({ isUpdating: true, error: null });

      // ✅ Optimistic update
      set({
        orders: prevOrders.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        ),
      });

      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update order status");
      }

      set({ isUpdating: false });
    } catch (err) {
      set({
        orders: prevOrders,
        error: err?.message || "Failed to update status",
        isUpdating: false,
      });
    }
  },

  // ✅ BULK UPDATE STATUS
  bulkUpdateOrderStatus: async (orderIds, newStatus) => {
    const prevOrders = get().orders;

    try {
      set({ isUpdating: true, error: null });

      // ✅ Optimistic update
      set({
        orders: prevOrders.map((o) =>
          orderIds.includes(o.id) ? { ...o, status: newStatus } : o
        ),
      });

      const res = await fetch(`${API_BASE}/api/orders/bulk-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderIds, status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to bulk update order status");
      }

      set({ isUpdating: false });
    } catch (err) {
      set({
        orders: prevOrders,
        error: err?.message || "Failed to bulk update status",
        isUpdating: false,
      });
    }
  },
}));
