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

    if (Array.isArray(v)) {
      const arr = v.map((x) => String(x).trim()).filter(Boolean);
      if (!arr.length) continue;
      q.set(k, arr.join(","));
      continue;
    }

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
  refIds: [],
  orderLineId: "",
};

export const useInventoryReservationStore = create((set, get) => ({
  loading: false,
  actionLoading: false,
  error: null,

  reservations: [],
  total: 0,
  repairRows: [],
  repairSummary: null,

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
        total: Number(data?.total || 0),
        loading: false,
      });

      invLog("fetchReservations <-", { count: data?.count || data?.total || 0 });
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

  moveReservationToPending: async (
    id,
    reason = "Moved to pending by admin"
  ) => {
    if (!id) throw new Error("Reservation id required");

    set({ actionLoading: true, error: null });
    invLog("moveReservationToPending ->", { id, reason });

    try {
      const { data } = await api.post(
        `/api/inventory-reservations/${id}/move-to-pending`,
        {
          reason,
          reconcile: true,
        }
      );

      set({ actionLoading: false });

      // Reconciliation can update multiple rows,
      // so refresh complete list instead of updating one row only.
      await get().fetchReservations();

      invLog("moveReservationToPending <-", data);
      return data?.summary;
    } catch (e) {
      const m = msg(e, "Failed to move reservation to pending");

      set({
        actionLoading: false,
        error: m,
      });

      invLog("moveReservationToPending ERROR", m);
      throw e;
    }
  },

  transferReservation: async ({
    id,
    targetOrderNumber,
    qty = "",
    reason = "",
  }) => {
    if (!id) {
      throw new Error("Source reservation id required");
    }

    if (!String(targetOrderNumber || "").trim()) {
      throw new Error("Target order number required");
    }

    set({
      actionLoading: true,
      error: null,
    });

    invLog("transferReservation ->", {
      id,
      targetOrderNumber,
      qty,
      reason,
    });

    try {
      const payload = {
        targetOrderNumber: String(
          targetOrderNumber
        ).trim(),

        reason:
          String(reason || "").trim() ||
          "Reservation transferred by admin",
      };

      if (
        qty !== "" &&
        qty !== null &&
        qty !== undefined
      ) {
        payload.qty = Number(qty);
      }

      const { data } = await api.post(
        `/api/inventory-reservations/${id}/transfer`,
        payload
      );

      set({
        actionLoading: false,
      });

      await get().fetchReservations();

      invLog("transferReservation <-", data);

      return data?.summary;
    } catch (error) {
      const message = msg(
        error,
        "Failed to transfer reservation"
      );

      set({
        actionLoading: false,
        error: message,
      });

      invLog(
        "transferReservation ERROR",
        message
      );

      throw error;
    }
  },

  deleteReservation: async (
    id,
    reason = "Deleted by admin"
  ) => {
    if (!id) throw new Error("Reservation id required");

    set({ actionLoading: true, error: null });
    invLog("deleteReservation ->", { id, reason });

    try {
      const { data } = await api.delete(
        `/api/inventory-reservations/${id}`,
        {
          data: {
            reason,
            reconcile: true,
          },
        }
      );

      set({ actionLoading: false });

      // Deleted row + possibly promoted pending rows.
      await get().fetchReservations();

      invLog("deleteReservation <-", data);
      return data?.summary;
    } catch (e) {
      const m = msg(e, "Failed to delete reservation");

      set({
        actionLoading: false,
        error: m,
      });

      invLog("deleteReservation ERROR", m);
      throw e;
    }
  },

  /* ---------------- pending repair ---------------- */

  detectPendingReservationIssues: async (limit = 500) => {
    set({
      actionLoading: true,
      error: null,
    });

    try {
      const { data } = await api.get(
        `/api/inventory-reservations/repair/pending-orders?limit=${limit}`
      );

      set({
        actionLoading: false,
        repairRows: data?.rows || [],
        repairSummary: data?.summary || null,
      });

      return data;
    } catch (e) {
      const m = msg(
        e,
        "Failed to detect pending reservation issues"
      );

      set({
        actionLoading: false,
        error: m,
      });

      throw e;
    }
  },

  bulkDeletePendingReservationIssues: async (ids = []) => {
    const cleanIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      )
    );

    if (!cleanIds.length) {
      throw new Error("No reservations selected");
    }

    set({
      actionLoading: true,
      error: null,
    });

    try {
      const { data } = await api.delete(
        `/api/inventory-reservations/repair/pending-orders`,
        {
          data: {
            ids: cleanIds,
          },
        }
      );

      set({
        actionLoading: false,
      });

      // Refresh both repair list and normal reservation list
      await get().detectPendingReservationIssues();
      await get().fetchReservations();

      return data?.summary;
    } catch (e) {
      const m = msg(
        e,
        "Failed to repair pending reservations"
      );

      set({
        actionLoading: false,
        error: m,
      });

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
    return get().cancelOrderReservations(orderId, reason || "order cancelled", "released");
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
