"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import StatusDropdown from "@/components/customer-support/StatusDropdown";
import {
  Search,
  RefreshCcw,
  Filter,
  Clock,
  AlertCircle,
  ExternalLink,
  Mail,
  Image as ImageIcon,
  Loader2,
  Phone,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clipboard,
  X,
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
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

const qs = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = safe(v);
    if (!val) return;
    sp.set(k, val);
  });
  return sp.toString();
};

const isImageUrl = (a) => {
  const mt = safe(a?.mimeType).toLowerCase();
  const url = safe(a?.url).toLowerCase();
  if (mt.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url);
};

const clip = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    toast.success("Copied ✅");
  } catch {
    toast.error("Copy failed");
  }
};

/* ---------------- Confirm Delete Modal ---------------- */
function ConfirmDeleteModal({ open, ticketId, loading, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200">
          <div>
            <p className="text-sm font-extrabold text-gray-900">Delete Ticket?</p>
            <p className="mt-1 text-xs text-gray-600">This action cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Ticket ID</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{ticketId || "-"}</p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
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
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Image Lightbox ---------------- */
function Lightbox({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-5xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow ring-1 ring-black/10 hover:bg-gray-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <img
          src={src}
          alt={alt || "preview"}
          className="w-full max-h-[85vh] object-contain rounded-2xl bg-black/20 ring-1 ring-white/10"
          loading="eager"
        />
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

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleting, setDeleting] = useState(false);

  // lightbox
  const [lb, setLb] = useState({ open: false, src: "", alt: "" });
  const openLightbox = (src, alt) => setLb({ open: true, src: safe(src), alt: safe(alt) });
  const closeLightbox = () => setLb({ open: false, src: "", alt: "" });

  const inflight = useRef(null);

  const pages = useMemo(
    () => Math.max(1, Math.ceil((Number(total) || 0) / limit)),
    [total]
  );

  const appliedKey = useMemo(
    () => JSON.stringify({ status, issueType, q, email, page }),
    [status, issueType, q, email, page]
  );

  const buildUrl = () => {
    const st = status !== "ALL" ? status : "";
    const it = issueType !== "All" ? issueType : "";
    if (safe(email)) {
      return `${API_BASE}/tickets/by-email?${qs({ email, status: st, page, limit })}`;
    }
    return `${API_BASE}/tickets?${qs({ status: st, issueType: it, q, page, limit })}`;
  };

  const fetchList = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(!!silent);
    setError("");

    try {
      if (inflight.current) inflight.current.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      const res = await fetch(buildUrl(), {
        method: "GET",
        cache: "no-store",
        signal: ctrl.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed (${res.status})`);
      }

      const list = Array.isArray(data?.tickets)
        ? data.tickets
        : Array.isArray(data?.items)
        ? data.items
        : [];

      const tot = Number(data?.total ?? data?.count ?? list.length ?? 0);

      setItems(list);
      setTotal(tot);
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

  const openDeleteModal = (ticketId) => {
    const id = safe(ticketId);
    if (!id) return;
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteId("");
  };

  const confirmDelete = async () => {
    const id = safe(deleteId);
    if (!id) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Delete failed (${res.status})`);
      }

      toast.success("Ticket deleted ✅");
      setOpenId((cur) => (cur === id ? "" : cur));
      setItems((prev) => prev.filter((t) => safe(t?.ticketId) !== id));
      setTotal((t) => Math.max(0, Number(t || 0) - 1));
      closeDeleteModal();
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchList({ silent: false });
    return () => {
      if (inflight.current) inflight.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchList({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(
      () => fetchList({ silent: true }),
      Math.max(3000, Number(pollMs) || 7000)
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, pollMs, appliedKey]);

  const onSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setOpenId("");
  };

  const onClear = () => {
    setStatus("ALL");
    setIssueType("All");
    setQ("");
    setEmail("");
    setPage(1);
    setOpenId("");
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      {/* modals */}
      <ConfirmDeleteModal
        open={deleteOpen}
        ticketId={deleteId}
        loading={deleting}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
      <Lightbox open={lb.open} src={lb.src} alt={lb.alt} onClose={closeLightbox} />

      <div className="w-full px-4 md:px-8 py-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">
            Admin • Support
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              All Support Tickets
            </h1>
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
          <p className="text-sm text-gray-600">
            Full list + realtime polling. Expand any row to see full message + images + actions.
          </p>
        </div>

        {/* filters */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => (setStatus(s), setPage(1), setOpenId(""))}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                    status === s
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
                  onChange={(e) => (setIssueType(e.target.value), setPage(1), setOpenId(""))}
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

        {/* table */}
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
              <table className="min-w-[1300px] w-full text-sm">
                <thead className="bg-white sticky top-0">
                  <tr className="text-left text-xs text-gray-600 border-b border-gray-200">
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
                    const rowKey = id || `${safe(t?.email)}-${safe(t?.createdAt)}-${idx}`;
                    const atCount = Array.isArray(t?.attachments) ? t.attachments.length : 0;
                    const phone = safe(t?.phone);
                    const isOpen = openId === id;

                    return (
                      <Fragment key={rowKey}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-semibold text-blue-700">
                            <button
                              type="button"
                              onClick={() => setOpenId((cur) => (cur === id ? "" : id))}
                              className="inline-flex items-center gap-2 hover:underline"
                              title="Expand"
                            >
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {id || "-"}
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <StatusDropdown ticketId={id} value={t?.status} adminNotes={t?.adminNotes} />
                          </td>

                          <td className="px-4 py-3">{safe(t?.name) || "-"}</td>
                          <td className="px-4 py-3">{safe(t?.email) || "-"}</td>

                          <td className="px-4 py-3 text-xs text-gray-800">
                            {phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-gray-400" /> {phone}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="px-4 py-3">{safe(t?.issueType) || "-"}</td>

                          <td className="px-4 py-3 max-w-[360px]">
                            <span className="line-clamp-1">{safe(t?.subject) || "-"}</span>
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {fmtDate(t?.createdAt)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-700">
                            {atCount ? (
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5" /> {atCount}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setOpenId((cur) => (cur === id ? "" : id))}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset ${
                                isOpen
                                  ? "bg-blue-600 text-white ring-blue-600"
                                  : "bg-white text-blue-700 ring-blue-200 hover:bg-blue-50"
                              }`}
                            >
                              {isOpen ? "Hide" : "View"} <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openDeleteModal(id)}
                              disabled={!id}
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset transition ${
                                id
                                  ? "bg-white text-red-700 ring-red-200 hover:bg-red-50"
                                  : "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </td>
                        </tr>

                        {isOpen ? (
                          <tr className="bg-gray-50">
                            <td colSpan={11} className="px-4 py-4">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                <div className="lg:col-span-8">
                                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500">Message</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                                          {safe(t?.message) || "-"}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => clip(id)}
                                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold bg-white ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                                      >
                                        <Clipboard className="h-4 w-4" /> Copy ID
                                      </button>
                                    </div>

                                    {safe(t?.adminNotes) ? (
                                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-xs font-semibold text-gray-500">Admin Notes</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                          {safe(t?.adminNotes)}
                                        </p>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="lg:col-span-4">
                                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                    <p className="text-xs font-semibold text-gray-500">Attachments</p>

                                    {!Array.isArray(t?.attachments) || !t.attachments.length ? (
                                      <p className="mt-2 text-sm text-gray-600">No files</p>
                                    ) : (
                                      <div className="mt-3 space-y-3">
                                        {t.attachments.map((a, i) => {
                                          const url = safe(a?.url);
                                          const img = isImageUrl(a);
                                          const name = safe(a?.filename) || `file-${i + 1}`;

                                          return (
                                            <div
                                              key={`${rowKey}-att-${i}`}
                                              className="rounded-xl border border-gray-200 bg-white p-3"
                                            >
                                              <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                                                  {name}
                                                </p>
                                                <a
                                                  href={url || "#"}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                                                >
                                                  Open <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                              </div>

                                              {img && url ? (
                                                <button
                                                  type="button"
                                                  onClick={() => openLightbox(url, name)}
                                                  className="mt-2 w-full text-left"
                                                  title="Open preview"
                                                >
                                                  <img
                                                    src={url}
                                                    alt={name}
                                                    className="w-full max-h-[220px] object-cover rounded-lg border border-gray-100 hover:opacity-95"
                                                    loading="lazy"
                                                  />
                                                </button>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-3">
                                    <Link
                                      href={id ? `/customer-support/${encodeURIComponent(id)}` : "#"}
                                      className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ring-inset transition ${
                                        id
                                          ? "bg-blue-600 text-white ring-blue-600 hover:opacity-90"
                                          : "bg-gray-100 text-gray-400 ring-gray-200 pointer-events-none"
                                      }`}
                                    >
                                      Open Full Page <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => (setPage((p) => Math.max(1, p - 1)), setOpenId(""))}
              disabled={page <= 1}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                page <= 1
                  ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => (setPage((p) => Math.min(pages, p + 1)), setOpenId(""))}
              disabled={page >= pages}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                page >= pages
                  ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
