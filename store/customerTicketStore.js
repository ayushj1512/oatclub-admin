// store/customerTicketStore.js
"use client";

import { create } from "zustand";

/**
 * ✅ Uses your backend: NEXT_PUBLIC_BACKEND_URL
 * Routes:
 *  - GET    /api/support/tickets/by-email
 *  - GET    /api/support/tickets/:ticketId
 *  - GET    /api/support/tickets
 *  - GET    /api/support/tickets/search
 *  - PATCH  /api/support/tickets/:ticketId/status
 *  - DELETE /api/support/tickets/:ticketId
 */
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
const SUPPORT_BASE = `${BACKEND}/api/support/tickets`;

/* ---------------- helpers ---------------- */
const safe = (v) => String(v ?? "").trim();
const up = (v) => safe(v).toUpperCase();

const readJSON = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
};

export const useCustomerTicketStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  tickets: [],
  ticket: null,

  loading: false,
  error: "",

  // pagination (for list endpoints)
  page: 1,
  limit: 10,
  total: 0,

  // remember last list query for paging/refresh
  lastList: null, // { mode: "by-email"|"admin"|"search", params: {...} }

  /* =========================
     INTERNAL HELPERS
  ========================= */
  _start: () => set({ loading: true, error: "" }),
  _fail: (msg) => set({ loading: false, error: msg || "Something went wrong" }),
  _success: (patch = {}) => set({ loading: false, error: "", ...patch }),

  resetTickets: () => set({ tickets: [], page: 1, total: 0, limit: 10, error: "", lastList: null }),
  resetTicket: () => set({ ticket: null, error: "" }),

  /* =========================
     CUSTOMER APIs
  ========================= */

  /** ✅ Fetch tickets by email */
  fetchTicketsByEmail: async ({ email, status, page = 1, limit = 10 } = {}) => {
    const em = safe(email);
    if (!em) return;

    get()._start();
    try {
      const url = new URL(`${SUPPORT_BASE}/by-email`);
      url.searchParams.set("email", em);
      url.searchParams.set("page", String(Math.max(1, Number(page) || 1)));
      url.searchParams.set("limit", String(Math.min(50, Math.max(1, Number(limit) || 10))));
      if (safe(status)) url.searchParams.set("status", up(status));

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || page),
        limit: Number(data?.limit || limit),
        loading: false,
        error: "",
        lastList: { mode: "by-email", params: { email: em, status: safe(status) ? up(status) : "", page, limit } },
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
      const res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await readJSON(res);
      get()._success({ ticket: data?.ticket || null });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /* =========================
     ADMIN / SUPPORT APIs
  ========================= */

  /** ✅ Admin list with filters */
  fetchAdminTickets: async ({ status, issueType, q, page = 1, limit = 15 } = {}) => {
    get()._start();
    try {
      const url = new URL(`${SUPPORT_BASE}`);
      url.searchParams.set("page", String(Math.max(1, Number(page) || 1)));
      url.searchParams.set("limit", String(Math.min(50, Math.max(1, Number(limit) || 15))));
      if (safe(status)) url.searchParams.set("status", up(status));
      if (safe(issueType)) url.searchParams.set("issueType", safe(issueType));
      if (safe(q)) url.searchParams.set("q", safe(q));

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || page),
        limit: Number(data?.limit || limit),
        loading: false,
        error: "",
        lastList: { mode: "admin", params: { status: safe(status) ? up(status) : "", issueType: safe(issueType), q: safe(q), page, limit } },
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /** ✅ Admin search endpoint */
  searchTickets: async ({ q, status, page = 1, limit = 50 } = {}) => {
    const query = safe(q);
    if (!query) return;

    get()._start();
    try {
      const url = new URL(`${SUPPORT_BASE}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("page", String(Math.max(1, Number(page) || 1)));
      url.searchParams.set("limit", String(Math.min(50, Math.max(1, Number(limit) || 50))));
      if (safe(status)) url.searchParams.set("status", up(status));

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await readJSON(res);

      set({
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || page),
        limit: Number(data?.limit || limit),
        loading: false,
        error: "",
        lastList: { mode: "search", params: { q: query, status: safe(status) ? up(status) : "", page, limit } },
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /** ✅ Update ticket status (admin) */
  updateTicketStatus: async ({ ticketId, status, adminNotes } = {}) => {
    const id = safe(ticketId);
    const st = up(status);
    if (!id || !st) return { ok: false, message: "ticketId and status required" };

    // optimistic update
    const prevTickets = get().tickets;
    const prevTicket = get().ticket;

    set({
      tickets: prevTickets.map((t) => (safe(t?.ticketId) === id ? { ...t, status: st, adminNotes: adminNotes ?? t.adminNotes } : t)),
      ticket: safe(prevTicket?.ticketId) === id ? { ...prevTicket, status: st, adminNotes: adminNotes ?? prevTicket?.adminNotes } : prevTicket,
      loading: true,
      error: "",
    });

    try {
      const res = await fetch(`${SUPPORT_BASE}/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: st, adminNotes: adminNotes ?? "" }),
      });

      const data = await readJSON(res);
      const updated = data?.ticket || null;

      set((s) => ({
        loading: false,
        ticket: safe(s.ticket?.ticketId) === id && updated ? { ...s.ticket, ...updated } : s.ticket,
        tickets: s.tickets.map((t) => (safe(t?.ticketId) === id && updated ? { ...t, ...updated } : t)),
      }));

      return { ok: true, ticket: updated };
    } catch (e) {
      // rollback
      set({ tickets: prevTickets, ticket: prevTicket });
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Failed to update ticket" };
    }
  },

  /** ✅ NEW: Delete ticket (admin/support) */
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

      set({ loading: false });
      return { ok: true };
    } catch (e) {
      // rollback
      set({ tickets: prevTickets, ticket: prevTicket });
      get()._fail(e?.message);
      return { ok: false, message: e?.message || "Delete failed" };
    }
  },

  /** ✅ NEW: Paging helpers (works for email/admin/search based on lastList) */
  refreshList: async () => {
    const last = get().lastList;
    if (!last) return;

    const { mode, params } = last;
    if (mode === "by-email") return get().fetchTicketsByEmail(params);
    if (mode === "admin") return get().fetchAdminTickets(params);
    if (mode === "search") return get().searchTickets(params);
  },

  nextPage: async () => {
    const last = get().lastList;
    if (!last) return;

    const { mode, params } = last;
    const page = Math.max(1, Number(params?.page || get().page || 1));
    const limit = Number(params?.limit || get().limit || 10);
    const total = Number(get().total || 0);
    const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const next = Math.min(pages, page + 1);

    const nextParams = { ...params, page: next, limit };
    set({ lastList: { mode, params: nextParams } });

    if (mode === "by-email") return get().fetchTicketsByEmail(nextParams);
    if (mode === "admin") return get().fetchAdminTickets(nextParams);
    if (mode === "search") return get().searchTickets(nextParams);
  },

  prevPage: async () => {
    const last = get().lastList;
    if (!last) return;

    const { mode, params } = last;
    const page = Math.max(1, Number(params?.page || get().page || 1));
    const limit = Number(params?.limit || get().limit || 10);
    const prev = Math.max(1, page - 1);

    const prevParams = { ...params, page: prev, limit };
    set({ lastList: { mode, params: prevParams } });

    if (mode === "by-email") return get().fetchTicketsByEmail(prevParams);
    if (mode === "admin") return get().fetchAdminTickets(prevParams);
    if (mode === "search") return get().searchTickets(prevParams);
  },
}));
