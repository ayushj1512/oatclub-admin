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

const replaceReservationInState = (list = [], id, nextDoc) => {
  if (!nextDoc?._id) return list;
  return list.map((x) => (String(x?._id) === String(id) ? nextDoc : x));
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
  orderLineId: "",
};

export const useInventoryReservationStore = create((set, get) => ({
  loading: false,
  actionLoading: false,
  error: null,

  reservations: [],
  total: 0,

  filters: { ...DEFAULT_FILTERS },

  clearError: () => set({ error: null }),

  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...(patch || {}) },
    })),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
    }),

  /* ---------------- list ---------------- */
  fetchReservations: async (overrideFilters = null) => {
    const filters = overrideFilters ?? get().filters;

    set({ loading: true, error: null });
    invLog("fetchReservations ->", filters);

    try {
      const { data } = await api.get(`/api/inventory-reservations${qs(filters)}`);

      set({
        reservations: data?.data || [],
        total: Number(data?.count || 0),
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
        total: r ? Number(s.total || 0) + 1 : s.total,
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
        reservations: replaceReservationInState(s.reservations || [], id, r),
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
        reservations: replaceReservationInState(s.reservations || [], id, r),
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

  expireReservation: async (id, reason = "") => {
    if (!id) throw new Error("Reservation id required");

    set({ actionLoading: true, error: null });
    invLog("expireReservation ->", { id, reason });

    try {
      const { data } = await api.post(`/api/inventory-reservations/${id}/expire`, { reason });
      const r = data?.reservation;

      set((s) => ({
        actionLoading: false,
        reservations: replaceReservationInState(s.reservations || [], id, r),
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

  /* ---------------- inventory actions ---------------- */
  addStockAndReconcile: async ({ productId, variantId = null, qty, reason = "" }) => {
    set({ actionLoading: true, error: null });
    invLog("addStockAndReconcile ->", { productId, variantId, qty, reason });

    try {
      const { data } = await api.post(`/api/inventory-reservations/add-stock`, {
        productId,
        variantId,
        qty,
        reason,
      });

      set({ actionLoading: false });
      await get().fetchReservations();
      invLog("addStockAndReconcile <-", data);
      return data?.summary;
    } catch (e) {
      const m = msg(e, "Failed to add stock");
      set({ actionLoading: false, error: m });
      invLog("addStockAndReconcile ERROR", m);
      throw e;
    }
  },

  restockFromRTO: async ({
    productId,
    variantId = null,
    qty,
    reason = "RTO received",
  }) => {
    set({ actionLoading: true, error: null });
    invLog("restockFromRTO ->", { productId, variantId, qty, reason });

    try {
      const { data } = await api.post(`/api/inventory-reservations/rto-restock`, {
        productId,
        variantId,
        qty,
        reason,
      });

      set({ actionLoading: false });
      await get().fetchReservations();
      invLog("restockFromRTO <-", data);
      return data?.summary;
    } catch (e) {
      const m = msg(e, "Failed to restock RTO inventory");
      set({ actionLoading: false, error: m });
      invLog("restockFromRTO ERROR", m);
      throw e;
    }
  },

  cancelOrderReservations: async (
    orderId,
    reason = "order cancelled",
    nextStatus = "released"
  ) => {
    if (!orderId) throw new Error("orderId required");

    set({ actionLoading: true, error: null });
    invLog("cancelOrderReservations ->", { orderId, reason, nextStatus });

    try {
      const { data } = await api.post(`/api/inventory-reservations/cancel-order/${orderId}`, {
        reason,
        nextStatus,
      });

      set({ actionLoading: false });
      await get().fetchReservations();
      invLog("cancelOrderReservations <-", data);
      return data?.summary;
    } catch (e) {
      const m = msg(e, "Failed to cancel order reservations");
      set({ actionLoading: false, error: m });
      invLog("cancelOrderReservations ERROR", m);
      throw e;
    }
  },

  /* ---------------- helpers ---------------- */
  getOrderReservationIds: (orderId, listOverride = null) => {
    const oid = String(orderId || "").trim();
    if (!oid) return [];

    const list = Array.isArray(listOverride) ? listOverride : get().reservations || [];

    return list
      .filter(
        (r) =>
          r &&
          ["pending", "reserved"].includes(String(r.status)) &&
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
      let consumed = 0;

      for (const id of ids) {
        const row = (get().reservations || []).find((x) => String(x?._id) === String(id));
        if (String(row?.status) !== "reserved") continue;

        await api.post(`/api/inventory-reservations/${id}/consume`, { reason });
        consumed += 1;
      }

      set((s) => ({
        actionLoading: false,
        reservations: (s.reservations || []).map((r) =>
          ids.includes(String(r?._id)) && String(r?.status) === "reserved"
            ? { ...r, status: "consumed" }
            : r
        ),
      }));

      invLog("consumeOrderReservations <-", consumed);
      return { consumed, ids };
    } catch (e) {
      const m = msg(e, "Failed to consume order reservations");
      set({ actionLoading: false, error: m });
      invLog("consumeOrderReservations ERROR", m);
      throw e;
    }
  },

  releaseOrderReservations: async (orderId, reason = "") => {
    return get().cancelOrderReservations(
      orderId,
      reason || "order cancelled",
      "released"
    );
  },

  /* ---------------- expire due ---------------- */
  expireDueReservations: async () => {
    set({ actionLoading: true, error: null });
    invLog("expireDueReservations ->");

    try {
      const { data } = await api.post(`/api/inventory-reservations/expire-due`);
      set({ actionLoading: false });
      invLog("expireDueReservations <-", data);
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