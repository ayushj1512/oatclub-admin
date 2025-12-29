"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */
const uniq = (arr = []) => [...new Set(arr.map(String))];

/* =======================================================
   WISHLIST STORE
======================================================= */

export const useWishlistStore = create((set, get) => ({
  // ---------------- STATE ----------------
  firebaseUID: "",
  customerId: null,

  productIds: [],

  loading: false,
  error: "",

  // ---------------- INTERNAL ----------------
  setFirebaseUID: (uid) =>
    set({
      firebaseUID: String(uid || ""),
    }),

  reset: () =>
    set({
      firebaseUID: "",
      customerId: null,
      productIds: [],
      loading: false,
      error: "",
    }),

  // ---------------- FETCH ----------------
  fetchWishlist: async (firebaseUID) => {
    const uid = String(firebaseUID || "");
    if (!uid) return;

    set({ loading: true, error: "", firebaseUID: uid });

    try {
      const res = await fetch(`${API}/api/wishlist/firebase/${uid}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to fetch wishlist");
      }

      const wishlist = data?.wishlist || {};

      set({
        productIds: uniq(wishlist.productIds || []),
        customerId: wishlist.customerId || null,
      });
    } catch (e) {
      console.error("❌ fetchWishlist:", e);
      set({ error: e.message || "Failed to load wishlist" });
    } finally {
      set({ loading: false });
    }
  },

  // ---------------- ADD ----------------
  addToWishlist: async ({ productId, customerId }) => {
    const { firebaseUID, productIds } = get();
    if (!firebaseUID || !productId) return;

    // 🔥 Optimistic update
    set({
      productIds: uniq([...productIds, productId]),
    });

    try {
      const res = await fetch(
        `${API}/api/wishlist/firebase/${firebaseUID}/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, customerId }),
        }
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to add to wishlist");
      }

      set({
        productIds: uniq(data?.wishlist?.productIds || []),
        customerId: data?.wishlist?.customerId || customerId || null,
      });
    } catch (e) {
      console.error("❌ addToWishlist:", e);
      set({ error: e.message || "Failed to add product" });

      // ❗ rollback
      set({ productIds });
    }
  },

  // ---------------- REMOVE ----------------
  removeFromWishlist: async (productId) => {
    const { firebaseUID, productIds } = get();
    if (!firebaseUID || !productId) return;

    const next = productIds.filter((id) => String(id) !== String(productId));

    // 🔥 Optimistic update
    set({ productIds: next });

    try {
      const res = await fetch(
        `${API}/api/wishlist/firebase/${firebaseUID}/remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        }
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to remove from wishlist");
      }

      set({
        productIds: uniq(data?.wishlist?.productIds || []),
      });
    } catch (e) {
      console.error("❌ removeFromWishlist:", e);
      set({ error: e.message || "Failed to remove product" });

      // ❗ rollback
      set({ productIds });
    }
  },

  // ---------------- CLEAR ----------------
  clearWishlist: async () => {
    const { firebaseUID } = get();
    if (!firebaseUID) return;

    set({ loading: true, error: "" });

    try {
      const res = await fetch(
        `${API}/api/wishlist/firebase/${firebaseUID}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to clear wishlist");
      }

      set({ productIds: [] });
    } catch (e) {
      console.error("❌ clearWishlist:", e);
      set({ error: e.message || "Failed to clear wishlist" });
    } finally {
      set({ loading: false });
    }
  },

  // ---------------- SELECTORS ----------------
  isWishlisted: (productId) => {
    const { productIds } = get();
    return productIds.includes(String(productId));
  },
}));
