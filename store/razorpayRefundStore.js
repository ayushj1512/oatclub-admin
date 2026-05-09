// store/razorpayRefundStore.js

import { create } from "zustand";
import axios from "axios";

const API =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const BASE = `${API}/api/razorpay/admin/refunds`;

const cleanError = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

const normalizeRefund = (refund = {}) => ({
  ...refund,
  id: refund?._id || refund?.id || "",
  amount: Number(refund?.amount || 0),
  status: refund?.status || "",
  refundNumber: refund?.refundNumber || "",
  paymentMethod: refund?.paymentMethod || "",
  refundMode: refund?.refundMode || "",
  refundMethod: refund?.refundMethod || "",
  razorpay: refund?.razorpay || {},
});

const normalizeOrder = (order = {}) => ({
  ...order,
  id: order?._id || order?.id || "",
  refundSummary: order?.refundSummary || {},
  razorpay: order?.razorpay || {},
});

const useRazorpayRefundStore = create((set, get) => ({
  loading: false,
  actionLoading: false,
  error: null,

  pendingOrders: [],
  refunds: [],
  refund: null,
  order: null,
  razorpayRefund: null,

  summary: {
    count: 0,
    totalRefundAmount: 0,
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  clearRefund: () =>
    set({
      refund: null,
      order: null,
      razorpayRefund: null,
    }),

  fetchPendingOrders: async () => {
    set({ loading: true, error: null });

    try {
      const { data } = await axios.get(`${BASE}/pending-orders`, {
        withCredentials: true,
      });

      const orders = Array.isArray(data?.orders)
        ? data.orders.map(normalizeOrder)
        : [];

      const totalRefundAmount = orders.reduce((sum, order) => {
        return (
          sum +
          Number(
            order?.refundSummary?.pendingAmount ||
              order?.refundSummary?.eligibleAmount ||
              order?.finalPayable ||
              0
          )
        );
      }, 0);

      set({
        pendingOrders: orders,
        summary: {
          count: Number(data?.count || orders.length),
          totalRefundAmount,
        },
        loading: false,
      });

      return data;
    } catch (err) {
      const error = cleanError(err);
      set({ error, loading: false });
      return null;
    }
  },

  createRefundFromOrder: async (orderId, payload = {}) => {
    if (!orderId) return null;

    set({ actionLoading: true, error: null });

    try {
      const { data } = await axios.post(
        `${BASE}/order/${orderId}/create`,
        payload,
        { withCredentials: true }
      );

      const refund = normalizeRefund(data?.refund);
      const order = normalizeOrder(data?.order);

      set((state) => ({
        refund,
        order,
        refunds: [
          refund,
          ...state.refunds.filter((r) => String(r.id) !== String(refund.id)),
        ],
        pendingOrders: state.pendingOrders.map((item) =>
          String(item.id) === String(order.id) ? order : item
        ),
        actionLoading: false,
      }));

      return data;
    } catch (err) {
      const error = cleanError(err);
      set({ error, actionLoading: false });
      return null;
    }
  },

  processRazorpayRefund: async (refundId, payload = {}) => {
    if (!refundId) return null;

    set({ actionLoading: true, error: null });

    try {
      const { data } = await axios.post(
        `${BASE}/${refundId}/process`,
        {
          speed: payload?.speed || "normal",
          notes: payload?.notes || {},
        },
        { withCredentials: true }
      );

      const refund = normalizeRefund(data?.refund);
      const order = normalizeOrder(data?.order);

      set((state) => ({
        refund,
        order,
        razorpayRefund: data?.razorpayRefund || null,
        refunds: [
          refund,
          ...state.refunds.filter((r) => String(r.id) !== String(refund.id)),
        ],
        pendingOrders: state.pendingOrders.map((item) =>
          String(item.id) === String(order.id) ? order : item
        ),
        actionLoading: false,
      }));

      return data;
    } catch (err) {
      const error = cleanError(err);
      set({ error, actionLoading: false });
      return null;
    }
  },

  fetchRazorpayRefundStatus: async (refundId) => {
    if (!refundId) return null;

    set({ actionLoading: true, error: null });

    try {
      const { data } = await axios.get(`${BASE}/${refundId}/status`, {
        withCredentials: true,
      });

      const refund = normalizeRefund(data?.refund);
      const order = normalizeOrder(data?.order);

      set((state) => ({
        refund,
        order,
        razorpayRefund: data?.razorpayRefund || null,
        refunds: [
          refund,
          ...state.refunds.filter((r) => String(r.id) !== String(refund.id)),
        ],
        pendingOrders: state.pendingOrders.map((item) =>
          String(item.id) === String(order.id) ? order : item
        ),
        actionLoading: false,
      }));

      return data;
    } catch (err) {
      const error = cleanError(err);
      set({ error, actionLoading: false });
      return null;
    }
  },

  createAndProcessRefund: async (orderId, payload = {}) => {
    const created = await get().createRefundFromOrder(orderId, payload);
    const refundId = created?.refund?._id || created?.refund?.id;

    if (!refundId) return created;

    return get().processRazorpayRefund(refundId, {
      speed: payload?.speed || "normal",
      notes: payload?.notes || {},
    });
  },

  removePendingOrder: (orderId) =>
    set((state) => ({
      pendingOrders: state.pendingOrders.filter(
        (order) => String(order.id) !== String(orderId)
      ),
    })),

  reset: () =>
    set({
      loading: false,
      actionLoading: false,
      error: null,
      pendingOrders: [],
      refunds: [],
      refund: null,
      order: null,
      razorpayRefund: null,
      summary: {
        count: 0,
        totalRefundAmount: 0,
      },
    }),
}));

export default useRazorpayRefundStore;