// stores/inventoryReservationStore.js
import { create } from "zustand";
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

/* ---------------- utils ---------------- */
const qs = (params = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    q.set(k, s);
  }
  const str = q.toString();
  return str ? `?${str}` : "";
};

const msg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

// ✅ toggle logs here
const INV_DEBUG = true;
const invLog = (...a) => INV_DEBUG && console.log("[INV_RES]", ...a);

const upsert = (list = [], doc) => {
  if (!doc?._id) return list;
  const id = String(doc._id);
  const idx = list.findIndex((x) => String(x?._id) === id);
  if (idx === -1) return [doc, ...list];
  const next = [...list];
  next[idx] = doc;
  return next;
};

const DEFAULT_FILTERS = {
  productId: "",
  variantId: "",
  productCode: "",
  orderNumber: "",
  productTitle: "",
  status: "",
  refType: "",
  refId: "",
  orderLineId: "", // ✅ optional (if backend supports)
};

export const useInventoryReservationStore = create((set, get) => ({
  loading: false,
  actionLoading: false,
  error: null,

  reservations: [],
  total: 0,

  filters: { ...DEFAULT_FILTERS },

  clearError: () => set({ error: null }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...(patch || {}) } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  /* ---------------- list ---------------- */
  fetchReservations: async (overrideFilters = null) => {
    const filters = overrideFilters ?? get().filters;
    set({ loading: true, error: null });
    invLog("fetchReservations ->", filters);
    try {
      const { data } = await api.get(`/api/inventory-reservations${qs(filters)}`);
      set({
        reservations: data?.data || [],
        total: data?.count || 0,
        loading: false,
      });
      invLog("fetchReservations <-", { count: data?.count || 0 });
      return data;
    } catch (e) {
      const m = msg(e, "Failed to fetch reservations");
      set({ loading: false, error: m });
      invLog("fetchReservations ERROR", m);
      throw e;
    }
  },

  /* ---------------- get single ---------------- */
  getReservation: async (id) => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    invLog("getReservation ->", id);
    try {
      const { data } = await api.get(`/api/inventory-reservations/${id}`);
      set({ actionLoading: false });
      invLog("getReservation <-", id);
      return data?.reservation;
    } catch (e) {
      const m = msg(e, "Failed to fetch reservation");
      set({ actionLoading: false, error: m });
      invLog("getReservation ERROR", m);
      throw e;
    }
  },

  /* ---------------- create ---------------- */
  createReservation: async (payload) => {
    set({ actionLoading: true, error: null });
    invLog("createReservation ->", payload);
    try {
      const { data } = await api.post(`/api/inventory-reservations`, payload);
      const r = data?.reservation;

      set((s) => ({
        actionLoading: false,
        reservations: r ? upsert(s.reservations, r) : s.reservations,
        total: s.total + (r ? 1 : 0),
      }));

      invLog("createReservation <-", r?._id);
      return r;
    } catch (e) {
      const m = msg(e, "Failed to create reservation");
      set({ actionLoading: false, error: m });
      invLog("createReservation ERROR", m);
      throw e;
    }
  },

  /* ---------------- status actions ---------------- */
  releaseReservation: async (id, reason = "") => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    invLog("releaseReservation ->", { id, reason });
    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/release`, { reason });
      const r = data?.reservation;

      set((s) => ({
        actionLoading: false,
        reservations: r
          ? (s.reservations || []).map((x) => (String(x?._id) === String(id) ? r : x))
          : s.reservations,
      }));

      invLog("releaseReservation <-", id);
      return r;
    } catch (e) {
      const m = msg(e, "Failed to release reservation");
      set({ actionLoading: false, error: m });
      invLog("releaseReservation ERROR", m);
      throw e;
    }
  },

  consumeReservation: async (id, reason = "") => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    invLog("consumeReservation ->", { id, reason });
    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/consume`, { reason });
      const r = data?.reservation;

      set((s) => ({
        actionLoading: false,
        reservations: r
          ? (s.reservations || []).map((x) => (String(x?._id) === String(id) ? r : x))
          : s.reservations,
      }));

      invLog("consumeReservation <-", id);
      return r;
    } catch (e) {
      const m = msg(e, "Failed to consume reservation");
      set({ actionLoading: false, error: m });
      invLog("consumeReservation ERROR", m);
      throw e;
    }
  },

  expireReservation: async (id) => {
    if (!id) throw new Error("Reservation id required");
    set({ actionLoading: true, error: null });
    invLog("expireReservation ->", id);
    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/expire`);
      const r = data?.reservation;

      set((s) => ({
        actionLoading: false,
        reservations: r
          ? (s.reservations || []).map((x) => (String(x?._id) === String(id) ? r : x))
          : s.reservations,
      }));

      invLog("expireReservation <-", id);
      return r;
    } catch (e) {
      const m = msg(e, "Failed to expire reservation");
      set({ actionLoading: false, error: m });
      invLog("expireReservation ERROR", m);
      throw e;
    }
  },

  /* ---------------- bulk helpers ---------------- */
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
    invLog("consumeOrderReservations ->", { orderId, count: ids.length, reason });

    try {
      for (const id of ids) await api.post(`/api/inventory-reservations/${id}/consume`, { reason });

      set((s) => ({
        actionLoading: false,
        reservations: (s.reservations || []).map((r) =>
          ids.includes(String(r?._id)) ? { ...r, status: "consumed" } : r
        ),
      }));

      invLog("consumeOrderReservations <-", ids.length);
      return { consumed: ids.length, ids };
    } catch (e) {
      const m = msg(e, "Failed to consume order reservations");
      set({ actionLoading: false, error: m });
      invLog("consumeOrderReservations ERROR", m);
      throw e;
    }
  },

  releaseOrderReservations: async (orderId, reason = "") => {
    const ids = Array.from(new Set(get().getOrderReservationIds(orderId)));
    if (!ids.length) return { released: 0, ids: [] };

    set({ actionLoading: true, error: null });
    invLog("releaseOrderReservations ->", { orderId, count: ids.length, reason });

    try {
      for (const id of ids) await api.post(`/api/inventory-reservations/${id}/release`, { reason });

      set((s) => ({
        actionLoading: false,
        reservations: (s.reservations || []).map((r) =>
          ids.includes(String(r?._id)) ? { ...r, status: "released" } : r
        ),
      }));

      invLog("releaseOrderReservations <-", ids.length);
      return { released: ids.length, ids };
    } catch (e) {
      const m = msg(e, "Failed to release order reservations");
      set({ actionLoading: false, error: m });
      invLog("releaseOrderReservations ERROR", m);
      throw e;
    }
  },

  /* ---------------- expire due (bulk) ---------------- */
  expireDueReservations: async () => {
    set({ actionLoading: true, error: null });
    invLog("expireDueReservations ->");
    try {
      const { data } = await api.post(`/api/inventory-reservations/expire-due`);
      set({ actionLoading: false });
      invLog("expireDueReservations <-", data);

      // refresh list with current filters (or defaults if empty)
      await get().fetchReservations();

      return data;
    } catch (e) {
      const m = msg(e, "Failed to expire due reservations");
      set({ actionLoading: false, error: m });
      invLog("expireDueReservations ERROR", m);
      throw e;
    }
  },
}));
