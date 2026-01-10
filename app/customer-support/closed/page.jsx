// app/support-tickets/closed/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, RefreshCcw, Filter, Clock, AlertCircle, ExternalLink, Mail, Image as ImageIcon, Loader2 } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API_BASE = `${BACKEND}/api/support`;

const ISSUE_TYPES = ["All", "Order Issue", "Delivery / Shipment", "Exchange / Return", "Payment / Refund", "Product / Quality", "Other"];

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

const pill = (status) => {
  const s = safe(status).toUpperCase();
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  if (s === "OPEN") return `${base} bg-blue-50 text-blue-700 ring-blue-200`;
  if (s === "IN_PROGRESS") return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
  if (s === "RESOLVED") return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
  if (s === "CLOSED") return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
  return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
};

export default function Page() {
  const fixedStatus = "CLOSED";

  const [issueType, setIssueType] = useState("All");
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");

  const [page, setPage] = useState(1);
  const limit = 20;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollMs, setPollMs] = useState(15000);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const inflight = useRef(null);

  const pages = useMemo(() => Math.max(1, Math.ceil((Number(total) || 0) / limit)), [total]);
  const appliedKey = useMemo(() => JSON.stringify({ fixedStatus, issueType, q, email, page }), [fixedStatus, issueType, q, email, page]);

  const buildUrl = () => {
    const it = issueType !== "All" ? issueType : "";
    if (safe(email)) return `${API_BASE}/tickets/by-email?${qs({ email, status: fixedStatus, page, limit })}`;
    return `${API_BASE}/tickets?${qs({ status: fixedStatus, issueType: it, q, page, limit })}`;
  };

  const fetchList = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(!!silent);
    setError("");

    try {
      if (inflight.current) inflight.current.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      const res = await fetch(buildUrl(), { method: "GET", cache: "no-store", signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.message || `Failed (${res.status})`);

      const list = Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data?.items) ? data.items : [];
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
    const id = setInterval(() => fetchList({ silent: true }), Math.max(3000, Number(pollMs) || 15000));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, pollMs, appliedKey]);

  const onSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const onClear = () => {
    setIssueType("All");
    setQ("");
    setEmail("");
    setPage(1);
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="w-full px-4 md:px-8 py-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin • Support</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Closed Tickets</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/support-tickets" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">
                Dashboard <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link href="/support-tickets/all" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">
                All <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:opacity-80 transition">
                Back to Admin <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Status is fixed to <span className="font-semibold">CLOSED</span>. Realtime polling enabled.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">
              Showing: <span className="ml-2 inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">CLOSED</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => fetchList({ silent: true })} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
              <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="h-4 w-4 accent-blue-600" /> Auto refresh
              </label>
              <select value={pollMs} onChange={(e) => setPollMs(Number(e.target.value))} className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none">
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={15000}>15s</option>
                <option value={20000}>20s</option>
              </select>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-5">
              <label className="text-xs font-semibold text-gray-700">Search</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject/message…" className="w-full bg-transparent text-sm outline-none" />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-gray-700">Issue type</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select value={issueType} onChange={(e) => (setIssueType(e.target.value), setPage(1))} className="w-full bg-transparent text-sm outline-none">
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
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" className="w-full bg-transparent text-sm outline-none" />
              </div>
            </div>

            <div className="lg:col-span-1 flex gap-2">
              <button type="submit" className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
                Go
              </button>
              <button type="button" onClick={onClear} className="w-full inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition">
                Clr
              </button>
            </div>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm font-bold text-gray-900">Results</p>
            <p className="text-xs text-gray-600">
              Total: <span className="font-semibold">{total}</span> • Page <span className="font-semibold">{page}</span>/<span className="font-semibold">{pages}</span>
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
            <div className="p-6 text-sm text-gray-600">No CLOSED tickets found.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-white sticky top-0">
                  <tr className="text-left text-xs text-gray-600 border-b border-gray-200">
                    <th className="px-4 py-3 font-semibold">Ticket</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Issue</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Files</th>
                    <th className="px-4 py-3 font-semibold">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((t) => {
                    const id = safe(t?.ticketId);
                    const atCount = Array.isArray(t?.attachments) ? t.attachments.length : 0;
                    return (
                      <tr key={id || `${safe(t?.email)}-${fmtDate(t?.createdAt)}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-semibold text-blue-700">{id || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={pill(t?.status)}>{safe(t?.status).toUpperCase().replaceAll("_", " ")}</span>
                        </td>
                        <td className="px-4 py-3">{safe(t?.name) || "-"}</td>
                        <td className="px-4 py-3">{safe(t?.email) || "-"}</td>
                        <td className="px-4 py-3">{safe(t?.issueType) || "-"}</td>
                        <td className="px-4 py-3 max-w-[360px]">
                          <span className="line-clamp-1">{safe(t?.subject) || "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {fmtDate(t?.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{atCount ? <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> {atCount}</span> : "-"}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={id ? `/support-tickets/${encodeURIComponent(id)}` : "#"}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset ${id ? "bg-white text-blue-700 ring-blue-200 hover:bg-blue-50" : "bg-gray-100 text-gray-400 ring-gray-200 pointer-events-none"}`}
                          >
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${page <= 1 ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed" : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"}`}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${page >= pages ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed" : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
