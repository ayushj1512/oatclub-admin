"use client";

import { create } from "zustand";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

const API_BASE = `${BASE_URL}/api/newsletters`;

export const useNewsletterAdminStore = create((set) => ({
  /* ---------------- STATE ---------------- */
  subscribers: [],
  loading: false,
  error: null,

  /* ---------------- META ---------------- */
  total: 0,
  page: 1,
  limit: 50,
  lastFetchedAt: null,

  /* ---------------- ACTIONS ---------------- */

  fetchSubscribers: async () => {
    set({ loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/subscribers?page=1&limit=5000`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch (${res.status})`);
      }

      const data = await res.json();

      // ✅ Correct response parsing
      set({
        subscribers: data?.subscriptions || [],
        total: data?.total || 0,
        lastFetchedAt: Date.now(),
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Newsletter fetch error:", err);
      set({
        error: err?.message || "Something went wrong",
        loading: false,
      });
    }
  },

  updateSubscriber: (email, updates = {}) =>
    set((state) => ({
      subscribers: state.subscribers.map((s) =>
        s.email === email ? { ...s, ...updates } : s
      ),
    })),

  addSubscriberLocal: (subscriber) =>
    set((state) => ({
      subscribers: [subscriber, ...state.subscribers],
      total: state.total + 1,
    })),

  removeSubscriberLocal: (email) =>
    set((state) => ({
      subscribers: state.subscribers.filter((s) => s.email !== email),
      total: Math.max(0, state.total - 1),
    })),

  reset: () =>
    set({
      subscribers: [],
      loading: false,
      error: null,
      total: 0,
      lastFetchedAt: null,
    }),
}));
