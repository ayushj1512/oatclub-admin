// app/customer-support/all/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import CustomerTicketRow from "@/components/customer-support/CustomerTicketRow";
import {
  Search,
  RefreshCcw,
  Filter,
  AlertCircle,
  ExternalLink,
  Mail,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API_BASE = `${BACKEND}/api/support`;

const STATUS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const ISSUE_TYPES = [
  "All",
  "Order Issue",
  "Delivery / Shipment",
  "Exchange / Return",
  "Payment / Refund",
  "Product / Quality",
  "Other",
];

const safe = (v) => String(v ?? "").trim();

const qs = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = safe(v);
    if (!val) return;
    sp.set(k, val);
  });
  return sp.toString();
};

const safeJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.message || `Failed (${res.status})`);
  return data;
};

function ConfirmModal({ open, title, desc, dangerText = "Confirm", loading, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm font-extrabold text-gray-900">{title}</p>
          {desc ? <p className="mt-1 text-xs text-gray-600">{desc}</p> : null}
        </div>
        <div className="p-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:opacity-90 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? "Working…" : dangerText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [status, setStatus] = useState("ALL");
  const [issueType, setIssueType] = useState("All");
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");

  const [page, setPage] = useState(1);
  const limit = 20;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollMs, setPollMs] = useState(7000);

  const [openId, setOpenId] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ✅ bulk selection + actions
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState("OPEN");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const inflight = useRef(null);

  const pages = useMemo(() => Math.max(1, Math.ceil((Number(total) || 0) / limit)), [total]);

  const appliedKey = useMemo(
    () => JSON.stringify({ status, issueType, q, email, page }),
    [status, issueType, q, email, page]
  );

  const pageIds = useMemo(
    () => items.map((t) => safe(t?.ticketId)).filter(Boolean),
    [items]
  );

  const selectedCount = selectedIds.size;

  const allSelectedOnPage = useMemo(() => {
    if (!pageIds.length) return false;
    for (const id of pageIds) if (!selectedIds.has(id)) return false;
    return true;
  }, [pageIds, selectedIds]);

  const buildUrl = () => {
    const st = status !== "ALL" ? status : "";
    const it = issueType !== "All" ? issueType : "";
    if (safe(email)) return `${API_BASE}/tickets/by-email?${qs({ email, status: st, page, limit })}`;
    return `${API_BASE}/tickets?${qs({ status: st, issueType: it, q, page, limit })}`;
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleOne = (id, checked) => {
    const tid = safe(id);
    if (!tid) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(tid) : next.delete(tid);
      return next;
    });
  };

  const toggleAllOnPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const fetchList = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(!!silent);
    setError("");

    try {
      inflight.current?.abort?.();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      const res = await fetch(buildUrl(), { method: "GET", cache: "no-store", signal: ctrl.signal });
      const data = await safeJson(res);

      const list = Array.isArray(data?.tickets)
        ? data.tickets
        : Array.isArray(data?.items)
          ? data.items
          : [];

      setItems(list);
      setTotal(Number(data?.total ?? data?.count ?? list.length ?? 0));
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to load tickets");
      setItems([]);
      setTotal(0);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchList({ silent: false });
    return () => inflight.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearSelection();
    setOpenId("");
    fetchList({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchList({ silent: true }), Math.max(3000, Number(pollMs) || 7000));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, pollMs, appliedKey]);

  const onSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setOpenId("");
    clearSelection();
  };

  const onClear = () => {
    setStatus("ALL");
    setIssueType("All");
    setQ("");
    setEmail("");
    setPage(1);
    setOpenId("");
    clearSelection();
  };

  const onDeleted = (deletedId) => {
    const id = safe(deletedId);
    if (!id) return;
    setOpenId((cur) => (cur === id ? "" : cur));
    setItems((prev) => prev.filter((x) => safe(x?.ticketId) !== id));
    setTotal((t) => Math.max(0, Number(t || 0) - 1));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // ✅ bulk status
  const bulkUpdateStatus = async () => {
    if (!selectedCount) return;
    const ids = Array.from(selectedIds);
    const nextStatus = safe(bulkStatus);
    if (!nextStatus) return;

    setBulkSaving(true);
    try {
      // PATCH /api/support/tickets/bulk-status  { ticketIds:[], status:"IN_PROGRESS" }
      const res = await fetch(`${API_BASE}/tickets/bulk-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds: ids, status: nextStatus }),
      });
      await safeJson(res);

      setItems((prev) =>
        prev.map((t) => {
          const id = safe(t?.ticketId);
          return id && selectedIds.has(id) ? { ...t, status: nextStatus } : t;
        })
      );

      toast.success(`Updated ${ids.length} ticket(s)`);
      clearSelection();
      setOpenId("");
    } catch (e) {
      toast.error(e?.message || "Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  };

  // ✅ bulk delete
  const bulkDelete = async () => {
    if (!selectedCount) return;
    const ids = Array.from(selectedIds);

    setBulkDeleting(true);
    try {
      // DELETE /api/support/tickets/bulk-delete  { ticketIds:[] }
      const res = await fetch(`${API_BASE}/tickets/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds: ids }),
      });
      await safeJson(res);

      setItems((prev) => prev.filter((t) => !selectedIds.has(safe(t?.ticketId))));
      setTotal((t) => Math.max(0, Number(t || 0) - ids.length));

      toast.success(`Deleted ${ids.length} ticket(s)`);
      clearSelection();
      setOpenId("");
      setConfirmBulkDelete(false);
    } catch (e) {
      toast.error(e?.message || "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      <ConfirmModal
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} ticket(s)?`}
        desc="This action cannot be undone."
        dangerText="Delete"
        loading={bulkDeleting}
        onClose={() => !bulkDeleting && setConfirmBulkDelete(false)}
        onConfirm={bulkDelete}
      />

      <div className="w-full px-4 md:px-8 py-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin • Support</p>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">All Support Tickets</h1>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/customer-support"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition"
              >
                Dashboard <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:opacity-80 transition"
              >
                Back to Admin <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="text-sm text-gray-600">Bulk status update + bulk delete supported.</p>
        </div>

        {/* Filters */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                    setOpenId("");
                    clearSelection();
                  }}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${status === s
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {s === "ALL" ? "All" : s.replaceAll("_", " ")}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchList({ silent: true })}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                Auto refresh
              </label>

              <select
                value={pollMs}
                onChange={(e) => setPollMs(Number(e.target.value))}
                className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none"
              >
                <option value={5000}>5s</option>
                <option value={7000}>7s</option>
                <option value={10000}>10s</option>
                <option value={15000}>15s</option>
              </select>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-5">
              <label className="text-xs font-semibold text-gray-700">Search</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search subject/message…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-gray-700">Issue type</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={issueType}
                  onChange={(e) => {
                    setIssueType(e.target.value);
                    setPage(1);
                    setOpenId("");
                    clearSelection();
                  }}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-gray-700">Email (optional)</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-1 flex gap-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                Go
              </button>
              <button
                type="button"
                onClick={onClear}
                className="w-full inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
              >
                Clr
              </button>
            </div>
          </form>
        </div>

        {/* Bulk actions */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <button
              type="button"
              onClick={() => toggleAllOnPage(!allSelectedOnPage)}
              disabled={!pageIds.length}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ${!pageIds.length
                  ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
                }`}
              title="Select all on current page"
            >
              {allSelectedOnPage ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              Select page
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">
                Selected: <span className="font-semibold">{selectedCount}</span>
              </span>

              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 outline-none"
              >
                {STATUS.filter((s) => s !== "ALL").map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={bulkUpdateStatus}
                disabled={!selectedCount || bulkSaving}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${!selectedCount || bulkSaving
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:opacity-90"
                  }`}
              >
                {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Apply
              </button>

              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={!selectedCount}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ${!selectedCount
                    ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                    : "bg-white text-red-700 ring-red-200 hover:bg-red-50"
                  }`}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>

              {selectedCount ? (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-200 bg-white text-gray-900 hover:bg-gray-50 transition"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm font-bold text-gray-900">Results</p>
            <p className="text-xs text-gray-600">
              Total: <span className="font-semibold">{total}</span> • Page{" "}
              <span className="font-semibold">{page}</span>/<span className="font-semibold">{pages}</span>
            </p>
          </div>

          {error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
            </div>
          ) : null}

          {loading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !items.length ? (
            <div className="p-6 text-sm text-gray-600">No tickets found.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[1380px] w-full text-sm">
                <thead className="bg-white sticky top-0">
                  <tr className="text-left text-xs text-gray-600 border-b border-gray-200">
                    <th className="px-4 py-3 font-semibold w-[70px]">Select</th>
                    <th className="px-4 py-3 font-semibold">Ticket</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Mobile</th>
                    <th className="px-4 py-3 font-semibold">Issue</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Files</th>
                    <th className="px-4 py-3 font-semibold">More</th>
                    <th className="px-4 py-3 font-semibold">Delete</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {items.map((t, idx) => {
                    const id = safe(t?.ticketId);
                    const key = id || `${safe(t?.email)}-${safe(t?.createdAt)}-${idx}`;
                    const checked = id ? selectedIds.has(id) : false;

                    return (
                      <CustomerTicketRow
                        key={key}
                        t={t}
                        apiBase={API_BASE}
                        isOpen={openId === id}
                        onToggle={() => setOpenId((cur) => (cur === id ? "" : id))}
                        onDeleted={onDeleted}
                        checked={checked}
                        onCheck={(next) => toggleOne(id, next)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setOpenId("");
                clearSelection();
              }}
              disabled={page <= 1}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${page <= 1
                  ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
                }`}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                setPage((p) => Math.min(pages, p + 1));
                setOpenId("");
                clearSelection();
              }}
              disabled={page >= pages}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${page >= pages
                  ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
                }`}
            >
              Next
            </button>
          </div>
        </div>

        {/* NOTE for backend */}
        <p className="mt-4 text-xs text-gray-500">
          Bulk endpoints used:{" "}
          <span className="font-mono">PATCH /tickets/bulk-status</span> and{" "}
          <span className="font-mono">DELETE /tickets/bulk-delete</span>
        </p>
      </div>
    </main>
  );
}
