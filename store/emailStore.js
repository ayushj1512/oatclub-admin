"use client";

import { create } from "zustand";
import { useOrderStore } from "@/store/orderStore";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export const useEmailStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  busy: false,
  busyKey: "",
  error: null,

  /* ============================================================
     HELPERS
  ============================================================ */
  _start: (key = "") => set({ busy: true, busyKey: key, error: null }),
  _success: () => set({ busy: false, busyKey: "" }),
  _error: (err) =>
    set({
      busy: false,
      busyKey: "",
      error: err?.message || "Something went wrong",
    }),

  _postAction: async (orderId, actionPath, body = {}) => {
    const res = await fetch(
      `${API}/api/admin/orders/${orderId}/actions/${actionPath}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Action failed");

    return data;
  },

  _refreshOrder: async (orderId) => {
    // reuse orderStore fetch
    const { fetchOrderById } = useOrderStore.getState();
    if (fetchOrderById) await fetchOrderById(orderId);
  },

  /* ============================================================
     ACTIONS
  ============================================================ */

  // ✅ Send confirmation email
  sendConfirmationEmail: async (orderId) => {
    if (!orderId) return null;

    get()._start("send-confirmation-email");
    try {
      const data = await get()._postAction(orderId, "send-confirmation-email");
      await get()._refreshOrder(orderId);
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  // ✅ Send tracking email (uses admin inputs)
  sendTrackingEmail: async (
    orderId,
    { trackingId = "", courierName = "", trackingUrl = "" } = {}
  ) => {
    if (!orderId) return null;

    get()._start("send-tracking-email");
    try {
      const data = await get()._postAction(orderId, "send-tracking-email", {
        trackingId,
        courierName,
        trackingUrl,
      });
      await get()._refreshOrder(orderId);
      get()._success();
      return data;
    } catch (e) {
      get()._error(e);
      throw e;
    }
  },

  // ✅ Book courier (Shiprocket)
  bookCourier: async (orderId) => {
    if (!orderId) return null;

    get()._start("book-courier");
    try {
      const data = await get()._postAction(orderId, "book-courier");
      await get()._refreshOrder(orderId);
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
  resetStore: () => set({ busy: false, busyKey: "", error: null }),
}));
