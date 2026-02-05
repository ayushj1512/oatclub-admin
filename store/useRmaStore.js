"use client";

import { create } from "zustand";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/* ---------------- tiny helpers ---------------- */
const safeStr = (v) => (v == null ? "" : String(v));
const norm = (v) => safeStr(v).trim();
const normLower = (v) => norm(v).toLowerCase();

const buildQS = (filters = {}) => {
  const qs = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v == null) return;
    const s = String(v).trim();
    if (!s) return;
    qs.set(k, s);
  });
  const out = qs.toString();
  return out ? `?${out}` : "";
};

const apiFetch = async (path, { method = "GET", body, headers } = {}) => {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

const upsertRmaInList = (list, updated, { matchOrderId } = {}) => {
  const arr = Array.isArray(list) ? list.slice() : [];
  const u = updated || null;
  if (!u?.rmaNumber) return arr;

  const idx = arr.findIndex((x) => String(x?.rmaNumber) === String(u.rmaNumber));
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], ...u };
    return arr;
  }

  // optionally keep list scoped to one order
  if (matchOrderId && String(u?.orderId || "") !== String(matchOrderId)) return arr;

  return [u, ...arr].filter(Boolean);
};

export const useRmaStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  rmas: [], // global/admin list OR order list
  rma: null, // selected single rma

  loading: false,
  error: null,

  // UI helpers / meta
  lastQuery: null, // remember last admin filter query
  lastOrderId: null, // remember last order list fetch
  lastUpdatedAt: null,

  /* ============================================================
     INTERNAL STATE HELPERS
  ============================================================ */
  _start: () => set({ loading: true, error: null }),
  _success: () => set({ loading: false, lastUpdatedAt: Date.now() }),
  _fail: (e) =>
    set({
      loading: false,
      error: e?.message || "Something went wrong",
      lastUpdatedAt: Date.now(),
    }),

  /* ============================================================
     ✅ ADMIN: FETCH ALL RMAs (GLOBAL LIST)
     GET /api/orders/rma?status=&type=&search=
  ============================================================ */
  fetchAllRmas: async (filters = {}) => {
    get()._start();
    try {
      const qs = buildQS(filters);
      const data = await apiFetch(`/api/orders/rma${qs}`);

      const list = Array.isArray(data?.rmas) ? data.rmas : [];
      set({ rmas: list, rma: null, lastQuery: filters, lastOrderId: null });

      get()._success();
      return list;
    } catch (e) {
      get()._fail(e);
      return [];
    }
  },

  /* ============================================================
     ✅ ADMIN: REFRESH last admin query (if any)
  ============================================================ */
  refreshAllRmas: async () => {
    const q = get().lastQuery || {};
    return get().fetchAllRmas(q);
  },

  /* ============================================================
     ✅ CUSTOMER/ADMIN: CREATE RMA
     POST /api/orders/:id/rma
     payload: { type, reason, customerNote?, items, exchangeTo? }
  ============================================================ */
  createRma: async (orderId, payload) => {
    const id = norm(orderId);
    if (!id) return null;

    get()._start();
    try {
      const data = await apiFetch(`/api/orders/${id}/rma`, {
        method: "POST",
        body: payload || {},
      });

      const created = data?.rma || null;

      set((s) => ({
        rma: created,
        rmas: created ? upsertRmaInList(s.rmas, created, { matchOrderId: s.lastOrderId }) : s.rmas,
        lastOrderId: s.lastOrderId || id, // helpful if you're on order page
      }));

      get()._success();
      return data;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  /* ============================================================
     ✅ GET ALL RMAs OF AN ORDER
     GET /api/orders/:id/rma
  ============================================================ */
  fetchRmasByOrder: async (orderId) => {
    const id = norm(orderId);
    if (!id) return [];

    get()._start();
    try {
      const data = await apiFetch(`/api/orders/${id}/rma`);
      const list = Array.isArray(data?.rmas) ? data.rmas : [];

      // normalize to include orderId on items (useful for UI consistency)
      const normalized = list.map((r) => ({ ...r, orderId: r?.orderId || id }));

      set({ rmas: normalized, rma: null, lastOrderId: id, lastQuery: null });

      get()._success();
      return normalized;
    } catch (e) {
      get()._fail(e);
      return [];
    }
  },

  /* ============================================================
     ✅ GET SINGLE RMA
     GET /api/orders/:id/rma/:rmaNumber
  ============================================================ */
  fetchRmaByNumber: async (orderId, rmaNumber) => {
    const id = norm(orderId);
    const rn = norm(rmaNumber);
    if (!id || !rn) return null;

    get()._start();
    try {
      const data = await apiFetch(`/api/orders/${id}/rma/${encodeURIComponent(rn)}`);
      const single = data?.rma ? { ...data.rma, orderId: data?.rma?.orderId || id } : null;

      set((s) => ({
        rma: single,
        rmas: single ? upsertRmaInList(s.rmas, single, { matchOrderId: s.lastOrderId }) : s.rmas,
        lastOrderId: s.lastOrderId || id,
      }));

      get()._success();
      return single;
    } catch (e) {
      get()._fail(e);
      return null;
    }
  },

  /* ============================================================
     ✅ ADMIN: UPDATE RMA
     PATCH /api/orders/:id/rma/:rmaNumber
     payload supports:
       { status, adminNote, resolution, refund, reverseShipment, fee }
  ============================================================ */
  updateRma: async (orderId, rmaNumber, payload) => {
    const id = norm(orderId);
    const rn = norm(rmaNumber);
    if (!id || !rn) return null;

    get()._start();
    try {
      const data = await apiFetch(`/api/orders/${id}/rma/${encodeURIComponent(rn)}`, {
        method: "PATCH",
        body: payload || {},
      });

      const updated = data?.rma || data?.updatedRma || null;
      const u = updated ? { ...updated, orderId: updated?.orderId || id } : null;

      set((s) => ({
        rma: u,
        rmas: u ? upsertRmaInList(s.rmas, u, { matchOrderId: s.lastOrderId }) : s.rmas,
      }));

      get()._success();
      return u;
    } catch (e) {
      get()._fail(e);
      throw e;
    }
  },

  /* ============================================================
     ✅ Convenience actions (admin flows)
     These just call updateRma with common payloads
  ============================================================ */
  setRmaStatus: async (orderId, rmaNumber, status, extra = {}) =>
    get().updateRma(orderId, rmaNumber, { status: normLower(status), ...extra }),

  setRmaResolution: async (orderId, rmaNumber, resolution, extra = {}) =>
    get().updateRma(orderId, rmaNumber, { resolution: normLower(resolution), ...extra }),

  markExchangeFeePaid: async (orderId, rmaNumber, extra = {}) =>
    get().updateRma(orderId, rmaNumber, { fee: { status: "paid" }, ...extra }),

  updateReverseShipment: async (orderId, rmaNumber, reverseShipment, extra = {}) =>
    get().updateRma(orderId, rmaNumber, { reverseShipment: reverseShipment || {}, ...extra }),

  updateRefund: async (orderId, rmaNumber, refund, extra = {}) =>
    get().updateRma(orderId, rmaNumber, { refund: refund || {}, ...extra }),

  /* ============================================================
     SELECTORS / CLIENT-SIDE FILTERS (no API)
  ============================================================ */
  selectRma: (rma) => set({ rma: rma || null }),
  getRmaByNumberLocal: (rmaNumber) => {
    const rn = norm(rmaNumber);
    if (!rn) return null;
    return (get().rmas || []).find((r) => String(r?.rmaNumber) === rn) || null;
  },

  filterLocal: ({ status, type, q } = {}) => {
    const s = normLower(status);
    const t = normLower(type);
    const query = normLower(q);

    return (get().rmas || []).filter((r) => {
      if (!r) return false;
      if (s && normLower(r.status) !== s) return false;
      if (t && normLower(r.type) !== t) return false;
      if (query) {
        const hay =
          `${safeStr(r.rmaNumber)} ${safeStr(r.orderNumber)} ${safeStr(r.customer?.phone)} ${safeStr(
            r.customer?.email
          )}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  },

  /* ============================================================
     RESET / CLEAR
  ============================================================ */
  clearRma: () => set({ rma: null }),
  clearRmas: () => set({ rmas: [], rma: null, lastQuery: null, lastOrderId: null }),
  resetStore: () =>
    set({
      rmas: [],
      rma: null,
      loading: false,
      error: null,
      lastQuery: null,
      lastOrderId: null,
      lastUpdatedAt: null,
    }),
}));
