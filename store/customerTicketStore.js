"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const SUPPORT_BASE = `${API}/api/support/tickets`;

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

  /* =========================
     INTERNAL HELPERS
  ========================= */
  _start: () => set({ loading: true, error: "" }),
  _fail: (msg) => set({ loading: false, error: msg || "Something went wrong" }),
  _success: (patch = {}) => set({ loading: false, error: "", ...patch }),

  resetTickets: () =>
    set({
      tickets: [],
      page: 1,
      total: 0,
      error: "",
    }),

  resetTicket: () =>
    set({
      ticket: null,
      error: "",
    }),

  /* =========================
     CUSTOMER APIs
  ========================= */

  // 🔹 Fetch tickets by email (customer view)
  fetchTicketsByEmail: async ({ email, status, page = 1, limit = 10 }) => {
    if (!email) return;

    get()._start();

    try {
      const url = new URL(`${SUPPORT_BASE}/by-email`);
      url.searchParams.set("email", email);
      url.searchParams.set("page", page);
      url.searchParams.set("limit", limit);
      if (status) url.searchParams.set("status", status);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to load tickets");
      }

      set({
        tickets: data.tickets || [],
        total: Number(data.total || 0),
        page,
        limit,
        loading: false,
        error: "",
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  // 🔹 Fetch single ticket by ticketId
  fetchTicketById: async (ticketId) => {
    if (!ticketId) return;

    get()._start();

    try {
      const res = await fetch(`${SUPPORT_BASE}/${ticketId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Ticket not found");
      }

      get()._success({ ticket: data.ticket });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  /* =========================
     ADMIN / SUPPORT APIs
  ========================= */

  // 🔹 Admin list with filters
  fetchAdminTickets: async ({
    status,
    issueType,
    q,
    page = 1,
    limit = 15,
  }) => {
    get()._start();

    try {
      const url = new URL(`${SUPPORT_BASE}`);
      url.searchParams.set("page", page);
      url.searchParams.set("limit", limit);
      if (status) url.searchParams.set("status", status);
      if (issueType) url.searchParams.set("issueType", issueType);
      if (q) url.searchParams.set("q", q);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to load tickets");
      }

      set({
        tickets: data.tickets || [],
        total: Number(data.total || 0),
        page,
        limit,
        loading: false,
        error: "",
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  // 🔹 Admin search (quick search endpoint)
  searchTickets: async ({ q, status, page = 1, limit = 50 }) => {
    if (!q) return;

    get()._start();

    try {
      const url = new URL(`${SUPPORT_BASE}/search`);
      url.searchParams.set("q", q);
      url.searchParams.set("page", page);
      url.searchParams.set("limit", limit);
      if (status) url.searchParams.set("status", status);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Search failed");
      }

      set({
        tickets: data.tickets || [],
        total: Number(data.total || 0),
        page,
        limit,
        loading: false,
        error: "",
      });
    } catch (e) {
      get()._fail(e?.message);
    }
  },

  // 🔹 Update ticket status (admin)
  updateTicketStatus: async ({ ticketId, status, adminNotes }) => {
    if (!ticketId || !status) return;

    set({ loading: true });

    try {
      const res = await fetch(
        `${SUPPORT_BASE}/${ticketId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminNotes }),
        }
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update ticket");
      }

      // Update local state (optimistic)
      set((state) => ({
        loading: false,
        ticket:
          state.ticket?.ticketId === ticketId
            ? { ...state.ticket, ...data.ticket }
            : state.ticket,
        tickets: state.tickets.map((t) =>
          t.ticketId === ticketId ? { ...t, ...data.ticket } : t
        ),
      }));
    } catch (e) {
      get()._fail(e?.message);
    }
  },
}));
