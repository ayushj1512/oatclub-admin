"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomerTicketStore } from "@/store/customerTicketStore";
import {
  Search,
  Loader2,
  Ticket,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const STATUSES = ["open", "in_progress", "resolved", "closed"];

const Badge = ({ status }) => {
  const map = {
    open: "bg-red-100 text-red-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-200 text-gray-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] || "bg-gray-100"
      }`}
    >
      {String(status).toUpperCase()}
    </span>
  );
};

/* =====================================================
   ADMIN SUPPORT PAGE
===================================================== */
export default function AdminSupportPage() {
  const {
    tickets,
    ticket,
    loading,
    error,
    page,
    limit,
    total,
    fetchAdminTickets,
    fetchTicketById,
    updateTicketStatus,
    resetTicket,
  } = useCustomerTicketStore();

  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const pages = Math.ceil(total / limit);

  /* ---------------- fetch list ---------------- */
  useEffect(() => {
    fetchAdminTickets({ status, q, page, limit });
  }, [status, q, page, limit]);

  /* ---------------- open ticket ---------------- */
  const openTicket = async (ticketId) => {
    await fetchTicketById(ticketId);
    setSelected(ticketId);
  };

  const closeModal = () => {
    resetTicket();
    setSelected(null);
    setAdminNotes("");
  };

  /* ---------------- update status ---------------- */
  const updateStatus = async (s) => {
    await updateTicketStatus({
      ticketId: ticket.ticketId,
      status: s,
      adminNotes,
    });
  };

  return (
  <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen">
    {/* ================= HEADER ================= */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Customer Support
          </h1>
          <p className="text-sm text-slate-500">
            Manage and resolve customer tickets
          </p>
        </div>
      </div>
    </div>

    {/* ================= FILTER BAR ================= */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ticket, email or subject"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* ================= TICKET LIST ================= */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Loading */}
      {loading && (
        <div className="p-10 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mb-2" />
          <span className="text-sm">Loading tickets…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && tickets.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-500">
          No support tickets found
        </div>
      )}

      {/* Rows */}
      {!loading &&
        tickets.map((t) => (
          <div
            key={t.ticketId}
            onClick={() => openTicket(t.ticketId)}
            className="px-6 py-4 border-t border-slate-100 hover:bg-blue-50/40 transition cursor-pointer"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  #{t.ticketId} — {t.subject}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.email}
                </p>
              </div>

              <Badge status={t.status} />
            </div>
          </div>
        ))}
    </div>

    {/* ================= PAGINATION ================= */}
    {pages > 1 && (
      <div className="flex gap-2 mt-6">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            onClick={() =>
              fetchAdminTickets({
                status,
                q,
                page: i + 1,
                limit,
              })
            }
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              page === i + 1
                ? "bg-blue-600 text-white shadow"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    )}

    {/* ================= MODAL ================= */}
    {ticket && selected && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
        <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 relative">
          <button
            onClick={closeModal}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Ticket #{ticket.ticketId}
            </h2>
            <p className="text-sm text-slate-500">
              {ticket.email}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 mb-4">
            {ticket.message}
          </div>

          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal admin notes (not visible to customer)"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-4"
            rows={3}
          />

          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-blue-600 hover:text-white transition"
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ================= ERROR ================= */}
    {error && (
      <div className="mt-6 flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )}
  </div>
);

}
