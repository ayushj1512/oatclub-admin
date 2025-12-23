"use client";

import { create } from "zustand";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL + "/api/newsletters";

/**
 * Admin Newsletter Store
 * Single source of truth for newsletter subscribers
 */
export const useNewsletterAdminStore = create((set) => ({
  /* ---------------- STATE ---------------- */
  subscribers: [],
  loading: false,
  error: null,

  /* ---------------- META ---------------- */
  total: 0,
  lastFetchedAt: null,

  /* ---------------- ACTIONS ---------------- */

  /**
   * Fetch all newsletter subscribers (admin)
   * NOTE: credentials removed to avoid CORS preflight
   */
  fetchSubscribers: async () => {
    set({ loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/subscribers`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch (${res.status})`);
      }

      const data = await res.json();

      set({
        subscribers: data,
        total: data.length,
        lastFetchedAt: Date.now(),
        loading: false,
      });
    } catch (err) {
      console.error("Newsletter fetch error:", err);
      set({
        error: err?.message || "Something went wrong",
        loading: false,
      });
    }
  },

  /**
   * Optimistic update for a single subscriber
   */
  updateSubscriber: (email, updates = {}) =>
    set((state) => ({
      subscribers: state.subscribers.map((s) =>
        s.email === email ? { ...s, ...updates } : s
      ),
    })),

  /**
   * Add subscriber locally (manual add / import)
   */
  addSubscriberLocal: (subscriber) =>
    set((state) => ({
      subscribers: [subscriber, ...state.subscribers],
      total: state.total + 1,
    })),

  /**
   * Remove subscriber locally (soft delete)
   */
  removeSubscriberLocal: (email) =>
    set((state) => ({
      subscribers: state.subscribers.filter((s) => s.email !== email),
      total: Math.max(0, state.total - 1),
    })),

  /**
   * Reset store (logout / role switch)
   */
  reset: () =>
    set({
      subscribers: [],
      loading: false,
      error: null,
      total: 0,
      lastFetchedAt: null,
    }),
}));
