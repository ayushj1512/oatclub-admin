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

      // ✅ PATCH: ensure remark key exists (safe)
      const normalized = Array.isArray(data)
        ? data.map((o) => ({
            ...o,
            customerSupportRemark: o?.customerSupportRemark ?? "",
          }))
        : [];

      set({ orders: normalized, isLoading: false });
    } catch (err) {
      set({
        error: err?.message || "Something went wrong",
        isLoading: false,
      });
    }
  },

  // ✅ PATCH: UPDATE ORDER REMARK ONLY
  updateOrderRemark: async (orderId, remark) => {
    const prevOrders = get().orders;

    try {
      set({ isUpdating: true, error: null });

      const nextRemark = String(remark || "").trim();

      // ✅ Optimistic update
      set({
        orders: prevOrders.map((o) =>
          (o._id === orderId || o.id === orderId)
            ? { ...o, customerSupportRemark: nextRemark }
            : o
        ),
      });

      // ✅ Use your updateOrder route
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerSupportRemark: nextRemark }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update remark");
      }

      const updated = await res.json().catch(() => null);

      // ✅ sync from backend if order returned
      if (updated?.order) {
        set({
          orders: get().orders.map((o) =>
            (o._id === orderId || o.id === orderId) ? updated.order : o
          ),
        });
      }

      set({ isUpdating: false });
    } catch (err) {
      set({
        orders: prevOrders,
        error: err?.message || "Failed to update remark",
        isUpdating: false,
      });
    }
  },

  // ✅ UPDATE SINGLE ORDER STATUS (with optional remark)
  updateOrderStatus: async (orderId, newStatus, customerSupportRemark) => {
    const prevOrders = get().orders;

    try {
      set({ isUpdating: true, error: null });

      const nextRemark =
        customerSupportRemark == null ? null : String(customerSupportRemark || "").trim();

      // ✅ Optimistic update
      set({
        orders: prevOrders.map((o) =>
          (o._id === orderId || o.id === orderId)
            ? {
                ...o,
                status: newStatus,
                ...(nextRemark !== null ? { customerSupportRemark: nextRemark } : {}),
              }
            : o
        ),
      });

      const payload = {
        status: newStatus,
        ...(nextRemark !== null ? { customerSupportRemark: nextRemark } : {}),
      };

      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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
          orderIds.includes(o._id || o.id) ? { ...o, status: newStatus } : o
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
