    // store/razorpayRefundStore.js

    import { create } from "zustand";
    import axios from "axios";

    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const cleanError = (err) =>
    err?.response?.data?.message || err?.message || "Something went wrong";

    const useRazorpayRefundStore = create((set, get) => ({
    loading: false,
    actionLoading: false,
    error: null,

    refunds: [],
    refund: null,
    razorpayRefund: null,

    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    clearRefund: () => set({ refund: null, razorpayRefund: null }),

    fetchRefunds: async (params = {}) => {
        set({ loading: true, error: null });

        try {
        const { data } = await axios.get(`${API}/api/admin/refunds`, {
            params,
            withCredentials: true,
        });

        set({
            refunds: data?.data || [],
            pagination: data?.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            pages: 1,
            },
            loading: false,
        });

        return data;
        } catch (err) {
        const error = cleanError(err);
        set({ error, loading: false });
        throw new Error(error);
        }
    },

    fetchRefundById: async (refundId) => {
        if (!refundId) return null;

        set({ loading: true, error: null });

        try {
        const { data } = await axios.get(`${API}/api/admin/refunds/${refundId}`, {
            withCredentials: true,
        });

        set({
            refund: data?.refund || null,
            loading: false,
        });

        return data;
        } catch (err) {
        const error = cleanError(err);
        set({ error, loading: false });
        throw new Error(error);
        }
    },

    createRefund: async (payload = {}) => {
        set({ actionLoading: true, error: null });

        try {
        const { data } = await axios.post(`${API}/api/admin/refunds`, payload, {
            withCredentials: true,
        });

        set({
            refund: data?.refund || null,
            actionLoading: false,
        });

        return data;
        } catch (err) {
        const error = cleanError(err);
        set({ error, actionLoading: false });
        throw new Error(error);
        }
    },

    processRazorpayRefund: async (refundId, payload = {}) => {
        if (!refundId) return null;

        set({ actionLoading: true, error: null });

        try {
        const { data } = await axios.post(
            `${API}/api/razorpay/admin/refunds/${refundId}/process`,
            {
            speed: payload.speed || "normal",
            notes: payload.notes || {},
            },
            { withCredentials: true }
        );

        set({
            refund: data?.refund || null,
            razorpayRefund: data?.razorpayRefund || null,
            actionLoading: false,
        });

        return data;
        } catch (err) {
        const error = cleanError(err);
        set({ error, actionLoading: false });
        throw new Error(error);
        }
    },

    fetchRazorpayRefundStatus: async (refundId) => {
        if (!refundId) return null;

        set({ actionLoading: true, error: null });

        try {
        const { data } = await axios.get(
            `${API}/api/razorpay/admin/refunds/${refundId}/status`,
            { withCredentials: true }
        );

        set({
            refund: data?.refund || null,
            razorpayRefund: data?.razorpayRefund || null,
            actionLoading: false,
        });

        return data;
        } catch (err) {
        const error = cleanError(err);
        set({ error, actionLoading: false });
        throw new Error(error);
        }
    },
    }));

    export default useRazorpayRefundStore;