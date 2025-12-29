"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const normalizeCart = (c = {}) => ({
  _id: c._id,
  cartId: c.cartId || c._id,
  customerId: c.customerId,
  customerEmail: c.customerEmail || "",
  customerFirebaseUID: c.customerFirebaseUID || "",
  status: String(c.status || "").toLowerCase(),

  items: Array.isArray(c.items) ? c.items : [],

  subtotal: c.pricing?.subtotal ?? 0,
  total: c.pricing?.total ?? 0,
  currency: c.pricing?.currency || "INR",

  abandonedAt: c.abandonedAt,
  recoveredAt: c.recoveredAt,
  recoveredOrderId: c.recoveredOrderId || null,

  lastRetargetedAt: c.lastRetargetedAt,
  retargetCount: Number(c.retargetCount || 0),

  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export const useAdminAbandonedCartStore = create((set, get) => ({
  // ---------------- STATE ----------------
  carts: [],
  current: null,

  loading: false,
  error: "",

  page: 1,
  pages: 1,
  total: 0,

  filters: {
    status: "",
    q: "",
  },

  // ---------------- ACTIONS ----------------

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters }, page: 1 })),

  setPage: (page) => set({ page }),

  reset: () =>
    set({
      carts: [],
      current: null,
      loading: false,
      error: "",
      page: 1,
      pages: 1,
      total: 0,
      filters: { status: "", q: "" },
    }),

  // ---------------- API ----------------

  fetchCarts: async () => {
    const { page, filters } = get();
    set({ loading: true, error: "" });

    try {
      const url = new URL(`${API}/api/abandoned-carts`);
      url.searchParams.set("page", page);
      url.searchParams.set("limit", 20);

      if (filters.status) url.searchParams.set("status", filters.status.toUpperCase());
      if (filters.q) url.searchParams.set("q", filters.q);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to load carts");
      }

      const items = Array.isArray(data.items) ? data.items.map(normalizeCart) : [];

      set({
        carts: items,
        total: data.total || 0,
        pages: data.pages || 1,
      });
    } catch (e) {
      set({ error: e.message || "Failed to fetch carts" });
    } finally {
      set({ loading: false });
    }
  },

  fetchOne: async (id) => {
    if (!id) return;
    set({ loading: true, error: "" });

    try {
      const res = await fetch(`${API}/api/abandoned-carts/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to load cart");
      }

      set({ current: normalizeCart(data.cart) });
    } catch (e) {
      set({ error: e.message || "Failed to fetch cart" });
    } finally {
      set({ loading: false });
    }
  },

  markAbandoned: async (id) => {
    if (!id) return;
    await fetch(`${API}/api/abandoned-carts/${id}/abandon`, { method: "PATCH" });
    await get().fetchCarts();
  },

  markRecovered: async (id, orderId) => {
    if (!id) return;
    await fetch(`${API}/api/abandoned-carts/${id}/recover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    await get().fetchCarts();
  },

  markRetargeted: async (id) => {
    if (!id) return;
    await fetch(`${API}/api/abandoned-carts/${id}/retargeted`, {
      method: "PATCH",
    });
    await get().fetchCarts();
  },

  deleteCart: async (id) => {
    if (!id) return;
    await fetch(`${API}/api/abandoned-carts/${id}`, { method: "DELETE" });
    await get().fetchCarts();
  },
}));
