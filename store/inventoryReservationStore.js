// stores/inventoryReservationStore.js
import { create } from "zustand";
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

const qs = (params = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    q.set(k, s);
  }
  const str = q.toString();
  return str ? `?${str}` : "";
};

const upsertLocal = (list, doc) => {
  if (!doc?._id) return list;
  const id = String(doc._id);
  const idx = (list || []).findIndex((x) => String(x?._id) === id);
  if (idx === -1) return [doc, ...(list || [])];
  const next = [...list];
  next[idx] = doc;
  return next;
};

export const useInventoryReservationStore = create((set, get) => ({
  loading: false,
  actionLoading: false,
  error: null,

  reservations: [],
  total: 0,

  // ✅ added orderNumber + title/code for new model
  filters: {
    productId: "",
    variantId: "",
    productCode: "",
    orderNumber: "",
    productTitle: "",
    status: "",
    refType: "",
    refId: "",
  },

  clearError: () => set({ error: null }),

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...(patch || {}) } })),

  resetFilters: () =>
    set({
      filters: {
        productId: "",
        variantId: "",
        productCode: "",
        orderNumber: "",
        productTitle: "",
        status: "",
        refType: "",
        refId: "",
      },
    }),

  // -----------------
  // fetch list
  // -----------------
  fetchReservations: async (overrideFilters = null) => {
    set({ loading: true, error: null });
    try {
      const filters = overrideFilters ?? get().filters;
      const { data } = await api.get(`/api/inventory-reservations${qs(filters)}`);
      set({
        reservations: data?.data || [],
        total: data?.count || 0,
        loading: false,
      });
      return data;
    } catch (e) {
      set({
        loading: false,
        error: e?.response?.data?.message || e?.message || "Failed to fetch reservations",
      });
      throw e;
    }
  },

  // -----------------
  // get single
  // -----------------
  getReservation: async (id) => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    try {
      const { data } = await api.get(`/api/inventory-reservations/${id}`);
      set({ actionLoading: false });
      return data?.reservation;
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to fetch reservation",
      });
      throw e;
    }
  },

  // -----------------
  // create
  // payload can now include:
  // productTitle, productImage, orderNumber, variantSku, selectedSize, selectedColor
  // -----------------
  createReservation: async (payload) => {
    set({ actionLoading: true, error: null });
    try {
      const { data } = await api.post(`/api/inventory-reservations`, payload);

      const r = data?.reservation;
      set((s) => ({
        actionLoading: false,
        reservations: r ? upsertLocal(s.reservations, r) : s.reservations,
        total: s.total + (r ? 1 : 0),
      }));

      return r;
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to create reservation",
      });
      throw e;
    }
  },

  // -----------------
  // status actions
  // -----------------
  releaseReservation: async (id, reason = "") => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/release`, { reason });
      const r = data?.reservation;
      set((s) => ({
        actionLoading: false,
        reservations: r
          ? (s.reservations || []).map((x) => (String(x?._id) === String(id) ? r : x))
          : s.reservations,
      }));
      return r;
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to release reservation",
      });
      throw e;
    }
  },

  consumeReservation: async (id, reason = "") => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/consume`, { reason });
      const r = data?.reservation;
      set((s) => ({
        actionLoading: false,
        reservations: r
          ? (s.reservations || []).map((x) => (String(x?._id) === String(id) ? r : x))
          : s.reservations,
      }));
      return r;
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to consume reservation",
      });
      throw e;
    }
  },

  expireReservation: async (id) => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/expire`);
      const r = data?.reservation;
      set((s) => ({
        actionLoading: false,
        reservations: r
          ? (s.reservations || []).map((x) => (String(x?._id) === String(id) ? r : x))
          : s.reservations,
      }));
      return r;
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to expire reservation",
      });
      throw e;
    }
  },

  // -----------------
  // bulk helpers (by order refId)
  // -----------------
  getOrderReservationIds: (orderId, listOverride = null) => {
    const oid = String(orderId || "").trim();
    if (!oid) return [];
    const list = Array.isArray(listOverride) ? listOverride : get().reservations || [];
    return list
      .filter(
        (r) =>
          r &&
          String(r.status) === "reserved" &&
          String(r.refType) === "order" &&
          String(r.refId) === oid
      )
      .map((r) => String(r._id || "").trim())
      .filter(Boolean);
  },

  consumeOrderReservations: async (orderId, reason = "") => {
    const ids = Array.from(new Set(get().getOrderReservationIds(orderId)));
    if (!ids.length) return { consumed: 0, ids: [] };

    set({ actionLoading: true, error: null });
    try {
      for (const id of ids) await api.post(`/api/inventory-reservations/${id}/consume`, { reason });

      set((s) => ({
        actionLoading: false,
        reservations: (s.reservations || []).map((r) =>
          ids.includes(String(r?._id)) ? { ...r, status: "consumed" } : r
        ),
      }));

      return { consumed: ids.length, ids };
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to consume order reservations",
      });
      throw e;
    }
  },

  releaseOrderReservations: async (orderId, reason = "") => {
    const ids = Array.from(new Set(get().getOrderReservationIds(orderId)));
    if (!ids.length) return { released: 0, ids: [] };

    set({ actionLoading: true, error: null });
    try {
      for (const id of ids) await api.post(`/api/inventory-reservations/${id}/release`, { reason });

      set((s) => ({
        actionLoading: false,
        reservations: (s.reservations || []).map((r) =>
          ids.includes(String(r?._id)) ? { ...r, status: "released" } : r
        ),
      }));

      return { released: ids.length, ids };
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to release order reservations",
      });
      throw e;
    }
  },

  // -----------------
  // expire due (bulk)
  // -----------------
  expireDueReservations: async () => {
    set({ actionLoading: true, error: null });
    try {
      const { data } = await api.post(`/api/inventory-reservations/expire-due`);
      set({ actionLoading: false });
      await get().fetchReservations();
      return data;
    } catch (e) {
      set({
        actionLoading: false,
        error: e?.response?.data?.message || e?.message || "Failed to expire due reservations",
      });
      throw e;
    }
  },
}));
