// store/customerTicketStore.js
"use client";

import { create } from "zustand";

/**
 * ✅ Backend base: NEXT_PUBLIC_BACKEND_URL
 *
 * Supported routes (as per your controller):
 *  - GET    /api/support/tickets/by-email
 *  - GET    /api/support/tickets/by-order
 *  - GET    /api/support/tickets/:ticketId
 *  - GET    /api/support/tickets
 *  - GET    /api/support/tickets/search
 *  - PATCH  /api/support/tickets/:ticketId/status
 *  - PATCH  /api/support/tickets/:ticketId/order
 *  - PATCH  /api/support/tickets/:ticketId          (patchTicketDetails)
 *  - DELETE /api/support/tickets/:ticketId
 *
 * Optional (if you wire later):
 *  - POST   /api/support/tickets   (create)
 */

const BACKEND =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "").trim();

const SUPPORT_BASE = `${BACKEND}/api/support/tickets`;

/* ---------------- helpers ---------------- */
const safe = (v) => String(v ?? "").trim();
const up = (v) => safe(v).toUpperCase();
const low = (v) => safe(v).toLowerCase();

const clampInt = (v, d, min = 1, max = 50) => {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return d;
  return Math.min(max, Math.max(min, n));
};

const readJSON = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
};

const buildQuery = (url, params = {}) => {
  Object.entries(params).forEach(([k, v]) => {
    const val = safe(v);
    if (val) url.searchParams.set(k, val);
  });
  return url;
};

// best-effort merge into list + selected ticket
const mergeTicketIntoState = (state, ticketId, patch) => {
  const id = safe(ticketId);

  const next = { ...state };

  if (Array.isArray(next.tickets)) {
    next.tickets = next.tickets.map((t) =>
      safe(t?.ticketId) === id ? { ...t, ...patch } : t
    );
  }

  if (safe(next.ticket?.ticketId) === id) {
    next.ticket = { ...next.ticket, ...patch };
  }

  return next;
};

export const useCustomerTicketStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  tickets: [],
  ticket: null,

  loading: false,
  error: "",

  page: 1,
  limit: 10,
  total: 0,

  // { mode, params }
  // modes: by-email | by-order | admin | search
  lastList: null,

  /* =========================
     INTERNAL HELPERS
  ========================= */
  _start: () => set({ loading: true, error: "" }),
  _fail: (msg) =>
    set({ loading: false, error: msg || "Something went wrong" }),
  _success: (patch = {}) => set({ loading: false, error: "", ...patch }),

  resetTickets: () =>
    set({
      tickets: [],
      page: 1,
      total: 0,
      limit: 10,
      error: "",
      lastList: null,
    }),
  resetTicket: () => set({ ticket: null, error: "" }),

  /* =========================
     CUSTOMER APIs
  ========================= */

  /** ✅ Fetch tickets by email */
  fetchTicketsByEmail: async ({ email, status, page = 1, limit = 10 } = {}) => {
    const em = low(email);
    if (!em) return;

    const p = clampInt(page, 1, 1, 999999);
    const l = clampInt(limit, 10, 1, 50);
    const st = safe(status) ? up(status) : "";

    get()._start();
    try {
      const url = buildQuery(new URL(`${SUPPORT_BASE}/by-email`), {
        email: em,
        page: String(p),
        limit: String(l),
        status: st,
      });

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || p),
        limit: Number(data?.limit || l),
        loading: false,
        error: "",
        lastList: { mode: "by-email", params: { email: em, status: st, page: p, limit: l } },
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /** ✅ Fetch tickets by orderNumber */
  fetchTicketsByOrderNumber: async ({
    orderNumber,
    status,
    page = 1,
    limit = 10,
  } = {}) => {
    const on = up(orderNumber);
    if (!on) return;

    const p = clampInt(page, 1, 1, 999999);
    const l = clampInt(limit, 10, 1, 50);
    const st = safe(status) ? up(status) : "";

    get()._start();
    try {
      const url = buildQuery(new URL(`${SUPPORT_BASE}/by-order`), {
        orderNumber: on,
        page: String(p),
        limit: String(l),
        status: st,
      });

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || p),
        limit: Number(data?.limit || l),
        loading: false,
        error: "",
        lastList: { mode: "by-order", params: { orderNumber: on, status: st, page: p, limit: l } },
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /** ✅ Fetch single ticket by ticketId */
  fetchTicketById: async (ticketId) => {
    const id = safe(ticketId);
    if (!id) return;

    get()._start();
    try {
      const res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = await readJSON(res);
      get()._success({ ticket: data?.ticket || null });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /* =========================
     ADMIN / SUPPORT APIs
  ========================= */

  /** ✅ Admin list with filters (+ orderNumber exact) */
  fetchAdminTickets: async ({
    status,
    issueType,
    q,
    orderNumber,
    page = 1,
    limit = 15,
  } = {}) => {
    const p = clampInt(page, 1, 1, 999999);
    const l = clampInt(limit, 15, 1, 50);

    const st = safe(status) ? up(status) : "";
    const it = safe(issueType);
    const qq = safe(q);
    const on = safe(orderNumber) ? up(orderNumber) : "";

    get()._start();
    try {
      const url = buildQuery(new URL(`${SUPPORT_BASE}`), {
        page: String(p),
        limit: String(l),
        status: st,
        issueType: it,
        q: qq,
        orderNumber: on,
      });

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || p),
        limit: Number(data?.limit || l),
        loading: false,
        error: "",
        lastList: {
          mode: "admin",
          params: { status: st, issueType: it, q: qq, orderNumber: on, page: p, limit: l },
        },
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /** ✅ Admin search endpoint */
  searchTickets: async ({ q, status, page = 1, limit = 50 } = {}) => {
    const query = safe(q);
    if (!query) return;

    const p = clampInt(page, 1, 1, 999999);
    const l = clampInt(limit, 50, 1, 50);
    const st = safe(status) ? up(status) : "";

    get()._start();
    try {
      const url = buildQuery(new URL(`${SUPPORT_BASE}/search`), {
        q: query,
        page: String(p),
        limit: String(l),
        status: st,
      });

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || p),
        limit: Number(data?.limit || l),
        loading: false,
        error: "",
        lastList: { mode: "search", params: { q: query, status: st, page: p, limit: l } },
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /** ✅ Patch ticket details (admin): name/email/phone/orderNumber/issueType/subject/message/adminNotes/status (+ optional files if you use form-data) */
  patchTicketDetails: async ({ ticketId, payload = {}, files } = {}) => {
    const id = safe(ticketId);
    if (!id) return { ok: false, message: "ticketId required" };

    // optimistic merge
    const prevTickets = get().tickets;
    const prevTicket = get().ticket;

    const optimistic = { ...payload };
    if (optimistic.email !== undefined) optimistic.email = low(optimistic.email);
    if (optimistic.orderNumber !== undefined) optimistic.orderNumber = up(optimistic.orderNumber);
    if (optimistic.status !== undefined) optimistic.status = up(optimistic.status);

    set((st) => ({
      ...mergeTicketIntoState(st, id, optimistic),
      loading: true,
      error: "",
    }));

    try {
      let res;

      // if files provided, use multipart/form-data, else JSON
      if (Array.isArray(files) && files.length) {
        const fd = new FormData();
        Object.entries(payload || {}).forEach(([k, v]) => {
          if (v === undefined) return;
          fd.append(k, String(v));
        });
        files.slice(0, 5).forEach((f) => fd.append("files", f));

        res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: fd,
        });
      } else {
        res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload || {}),
        });
      }

      const data = await readJSON(res);
      const updated = data?.ticket || null;

      set((st) => ({
        loading: false,
        error: "",
        ...(updated ? mergeTicketIntoState(st, id, updated) : st),
      }));

      return { ok: true, ticket: updated };
    } catch (e) {
      // rollback
      set({ tickets: prevTickets, ticket: prevTicket, loading: false });
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Failed to patch ticket" };
    }
  },

  /** ✅ Update ticket status (admin) */
  updateTicketStatus: async ({ ticketId, status, adminNotes } = {}) => {
    const id = safe(ticketId);
    const st = up(status);
    if (!id || !st) return { ok: false, message: "ticketId and status required" };

    const prevTickets = get().tickets;
    const prevTicket = get().ticket;

    // optimistic
    set((state) => ({
      ...mergeTicketIntoState(state, id, {
        status: st,
        adminNotes: adminNotes ?? state.ticket?.adminNotes ?? "",
      }),
      loading: true,
      error: "",
    }));

    try {
      const res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: st, adminNotes: adminNotes ?? "" }),
      });

      const data = await readJSON(res);
      const updated = data?.ticket || null;

      set((state) => ({
        loading: false,
        error: "",
        ...(updated ? mergeTicketIntoState(state, id, updated) : state),
      }));

      return { ok: true, ticket: updated };
    } catch (e) {
      set({ tickets: prevTickets, ticket: prevTicket, loading: false });
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Failed to update ticket status" };
    }
  },

  /** ✅ Update only orderNumber (admin) */
  updateTicketOrderNumber: async ({ ticketId, orderNumber } = {}) => {
    const id = safe(ticketId);
    const on = up(orderNumber);
    if (!id || !on) return { ok: false, message: "ticketId and orderNumber required" };

    const prevTickets = get().tickets;
    const prevTicket = get().ticket;

    // optimistic
    set((state) => ({
      ...mergeTicketIntoState(state, id, { orderNumber: on }),
      loading: true,
      error: "",
    }));

    try {
      const res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: on }),
      });

      const data = await readJSON(res);
      const updated = data?.ticket || null;

      set((state) => ({
        loading: false,
        error: "",
        ...(updated ? mergeTicketIntoState(state, id, updated) : state),
      }));

      return { ok: true, ticket: updated };
    } catch (e) {
      set({ tickets: prevTickets, ticket: prevTicket, loading: false });
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Failed to update order number" };
    }
  },

  /** ✅ Delete ticket (admin/support) */
  deleteTicketById: async (ticketId) => {
    const id = safe(ticketId);
    if (!id) return { ok: false, message: "ticketId required" };

    const prevTickets = get().tickets;
    const prevTicket = get().ticket;

    // optimistic remove
    set({
      tickets: prevTickets.filter((t) => safe(t?.ticketId) !== id),
      ticket: safe(prevTicket?.ticketId) === id ? null : prevTicket,
      loading: true,
      error: "",
    });

    try {
      const res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      await readJSON(res);

      set({ loading: false, error: "" });
      return { ok: true };
    } catch (e) {
      set({ tickets: prevTickets, ticket: prevTicket, loading: false });
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Delete failed" };
    }
  },

  /* =========================
     LIST HELPERS (paging)
  ========================= */

  refreshList: async () => {
    const last = get().lastList;
    if (!last) return;

    const { mode, params } = last;
    if (mode === "by-email") return get().fetchTicketsByEmail(params);
    if (mode === "by-order") return get().fetchTicketsByOrderNumber(params);
    if (mode === "admin") return get().fetchAdminTickets(params);
    if (mode === "search") return get().searchTickets(params);
  },

  nextPage: async () => {
    const last = get().lastList;
    if (!last) return;

    const { mode, params } = last;

    const limit = clampInt(params?.limit ?? get().limit, get().limit, 1, 50);
    const page = clampInt(params?.page ?? get().page, get().page, 1, 999999);

    const total = Number(get().total || 0);
    const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const next = Math.min(pages, page + 1);

    const nextParams = { ...params, page: next, limit };
    set({ lastList: { mode, params: nextParams } });

    if (mode === "by-email") return get().fetchTicketsByEmail(nextParams);
    if (mode === "by-order") return get().fetchTicketsByOrderNumber(nextParams);
    if (mode === "admin") return get().fetchAdminTickets(nextParams);
    if (mode === "search") return get().searchTickets(nextParams);
  },

  prevPage: async () => {
    const last = get().lastList;
    if (!last) return;

    const { mode, params } = last;

    const limit = clampInt(params?.limit ?? get().limit, get().limit, 1, 50);
    const page = clampInt(params?.page ?? get().page, get().page, 1, 999999);
    const prev = Math.max(1, page - 1);

    const prevParams = { ...params, page: prev, limit };
    set({ lastList: { mode, params: prevParams } });

    if (mode === "by-email") return get().fetchTicketsByEmail(prevParams);
    if (mode === "by-order") return get().fetchTicketsByOrderNumber(prevParams);
    if (mode === "admin") return get().fetchAdminTickets(prevParams);
    if (mode === "search") return get().searchTickets(prevParams);
  },

  /* =========================
     OPTIONAL: CREATE (if you use it from admin)
     - supports files using FormData
  ========================= */
  createTicket: async ({ payload = {}, files } = {}) => {
    const prevTickets = get().tickets;

    get()._start();
    try {
      const fd = new FormData();
      Object.entries(payload || {}).forEach(([k, v]) => {
        if (v === undefined) return;
        fd.append(k, String(v));
      });
      (Array.isArray(files) ? files : []).slice(0, 5).forEach((f) => fd.append("files", f));

      const res = await fetch(`${SUPPORT_BASE}`, {
        method: "POST",
        body: fd,
      });
      const data = await readJSON(res);

      // If your create response returns ticket in `ticket`, keep it, else refresh list.
      const created = data?.ticket || null;

      set({
        loading: false,
        error: "",
        ticket: created ? created : get().ticket,
        tickets: created ? [created, ...prevTickets] : prevTickets,
      });

      return { ok: true, data };
    } catch (e) {
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Create failed" };
    }
  },
}));
