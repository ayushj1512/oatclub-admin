"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

const safe = (v) => String(v ?? "").trim();
const toNum = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

const normalizeCart = (c = {}) => {
  const pricing = c?.pricing || {};
  const customerPop =
    c?.customerId && typeof c.customerId === "object" ? c.customerId : null;

  return {
    _id: c._id,
    cartId: c.cartId || c._id,

    // populated OR raw
    customerId:
      typeof c.customerId === "string"
        ? c.customerId
        : customerPop?._id || null,
    customer: customerPop,

    customerEmail: c.customerEmail || "",
    customerFirebaseUID: c.customerFirebaseUID || "",
    customerPhone: c.customerPhone || "",

    status: safe(c.status).toLowerCase(),

    items: Array.isArray(c.items) ? c.items : [],

    subtotal: pricing.subtotal ?? c.subtotal ?? 0,
    total: pricing.total ?? c.total ?? 0,
    currency: pricing.currency || c.currency || "INR",

    abandonedAt: c.abandonedAt,
    recoveredAt: c.recoveredAt,
    recoveredOrderId: c.recoveredOrderId || null,

    lastRetargetedAt: c.lastRetargetedAt,
    retargetCount: toNum(c.retargetCount, 0),

    lastActivityAt: c.lastActivityAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

const buildUrl = ({ page, limit, filters }) => {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is missing");

  const url = new URL(`${API}/api/abandoned-carts`);
  url.searchParams.set("page", String(Math.max(1, toNum(page, 1))));
  url.searchParams.set("limit", String(Math.min(200, Math.max(1, toNum(limit, 20)))));

  const st = safe(filters?.status);
  const q = safe(filters?.q);

  if (st) url.searchParams.set("status", st.toUpperCase());
  if (q) url.searchParams.set("q", q);
  if (filters?.hasCustomer) url.searchParams.set("hasCustomer", "1");

  return url.toString();
};

export const useAdminAbandonedCartStore = create((set, get) => ({
  // ---------------- STATE ----------------
  carts: [],
  current: null,

  loading: false,
  error: "",

  page: 1,
  pages: 1,
  total: 0,

  limit: 20,

  // ✅ filters include hasCustomer (server-side)
  filters: {
    status: "",
    q: "",
    hasCustomer: false,
  },

  // ---------------- ACTIONS ----------------
  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...(patch || {}) },
      page: 1,
    })),

  setPage: (page) => set({ page: Math.max(1, toNum(page, 1)) }),

  setLimit: (limit) =>
    set({
      limit: Math.min(200, Math.max(1, toNum(limit, 20))),
      page: 1,
    }),

  reset: () =>
    set({
      carts: [],
      current: null,
      loading: false,
      error: "",
      page: 1,
      pages: 1,
      total: 0,
      limit: 20,
      filters: { status: "", q: "", hasCustomer: false },
    }),

  // ---------------- API ----------------
  fetchCarts: async (opts = {}) => {
    const { page, limit, filters } = get();
    const nextPage = opts.page != null ? opts.page : page;
    const nextLimit = opts.limit != null ? opts.limit : limit;
    const nextFilters = opts.filters ? { ...filters, ...opts.filters } : filters;

    set({ loading: true, error: "" });

    try {
      const url = buildUrl({ page: nextPage, limit: nextLimit, filters: nextFilters });

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data?.success === false) throw new Error(data?.message || "Failed to load carts");

      const items = Array.isArray(data.items) ? data.items.map(normalizeCart) : [];

      set({
        carts: items,
        total: toNum(data.total, 0),
        pages: Math.max(1, toNum(data.pages, 1)),
        page: Math.max(1, toNum(data.page, nextPage)),
        limit: nextLimit,
        filters: nextFilters,
      });

      return items;
    } catch (e) {
      set({ error: e?.message || "Failed to fetch carts" });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  fetchOne: async (id) => {
    const cartId = safe(id);
    if (!cartId) return null;

    set({ loading: true, error: "" });

    try {
      if (!API) throw new Error("NEXT_PUBLIC_API_URL is missing");

      const res = await fetch(`${API}/api/abandoned-carts/${cartId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data?.success === false) throw new Error(data?.message || "Failed to load cart");

      const cart = normalizeCart(data.cart);
      set({ current: cart });
      return cart;
    } catch (e) {
      set({ error: e?.message || "Failed to fetch cart" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  // ✅ actions (refresh list after)
  markAbandoned: async (id) => {
    const cartId = safe(id);
    if (!cartId) return;

    await fetch(`${API}/api/abandoned-carts/${cartId}/abandon`, { method: "PATCH" });
    await get().fetchCarts();
  },

  markRecovered: async (id, orderId) => {
    const cartId = safe(id);
    if (!cartId) return;

    await fetch(`${API}/api/abandoned-carts/${cartId}/recover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: safe(orderId) || undefined }),
    });

    await get().fetchCarts();
  },

  markRetargeted: async (id) => {
    const cartId = safe(id);
    if (!cartId) return;

    await fetch(`${API}/api/abandoned-carts/${cartId}/retargeted`, { method: "PATCH" });
    await get().fetchCarts();
  },

  deleteCart: async (id) => {
    const cartId = safe(id);
    if (!cartId) return;

    await fetch(`${API}/api/abandoned-carts/${cartId}`, { method: "DELETE" });
    await get().fetchCarts();
  },
}));
