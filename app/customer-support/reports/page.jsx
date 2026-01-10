// app/support-tickets/reports/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCcw, AlertCircle, ExternalLink, Loader2, Filter, Clock } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API_BASE = `${BACKEND}/api/support`;

const safe = (v) => String(v ?? "").trim();
const upper = (v) => safe(v).toUpperCase();
const fmt = (n) => Number(n || 0).toLocaleString();
const dayKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

const STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const ISSUE_TYPES = ["All", "Order Issue", "Delivery / Shipment", "Exchange / Return", "Payment / Refund", "Product / Quality", "Other"];
const RANGE = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = safe(v);
    if (!val) return;
    sp.set(k, val);
  });
  return sp.toString();
}

export default function Page() {
  const [days, setDays] = useState(14);
  const [issueType, setIssueType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState([]); // collected tickets (best-effort)
  const inflight = useRef(null);

  const limit = 50; // pulling multiple pages; keep sane

  const fetchPage = async (page, { status, signal }) => {
    const it = issueType !== "All" ? issueType : "";
    const url = `${API_BASE}/tickets?${qs({ status, issueType: it, page, limit })}`;
    const res = await fetch(url, { method: "GET", cache: "no-store", signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) throw new Error(data?.message || `Failed (${res.status})`);
    const list = Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data?.items) ? data.items : [];
    const total = Number(data?.total ?? data?.count ?? list.length ?? 0);
    return { list, total };
  };

  const fetchAll = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(!!silent);
    setError("");
    setItems([]);

    try {
      if (inflight.current) inflight.current.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      // Pull per-status (so we can compute status totals even if API doesn't provide a global "reports" endpoint)
      const now = Date.now();
      const cutoff = now - Number(days) * 24 * 60 * 60 * 1000;

      const collected = [];
      for (const st of ["", ...STATUS]) {
        // "" => ALL (only one pass) but we still do per-status below, skip ALL to reduce load
        if (!st) continue;

        // page 1 first to learn total
        const first = await fetchPage(1, { status: st, signal: ctrl.signal });
        const pages = Math.max(1, Math.ceil(first.total / limit));
        first.list.forEach((t) => collected.push(t));

        // fetch next pages sequentially (simpler + avoids spamming backend)
        for (let p = 2; p <= Math.min(pages, 6); p++) {
          const nxt = await fetchPage(p, { status: st, signal: ctrl.signal });
          nxt.list.forEach((t) => collected.push(t));
        }
      }

      // Dedupe by ticketId
      const map = new Map();
      for (const t of collected) {
        const id = safe(t.ticketId);
        if (!id) continue;
        if (!map.has(id)) map.set(id, t);
      }

      // Filter to date range (best effort, based on createdAt)
      const filtered = Array.from(map.values()).filter((t) => {
        const dt = new Date(t.createdAt).getTime();
        return !Number.isNaN(dt) && dt >= cutoff;
      });

      // sort newest
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(filtered);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to load report");
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll({ silent: false });
    return () => {
      if (inflight.current) inflight.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, issueType]);

  const stats = useMemo(() => {
    const s = { total: 0, byStatus: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 }, byIssue: {}, byDay: {} };
    items.forEach((t) => {
      s.total += 1;
      const st = upper(t.status);
      if (s.byStatus[st] !== undefined) s.byStatus[st] += 1;
      const it = safe(t.issueType) || "Other";
      s.byIssue[it] = (s.byIssue[it] || 0) + 1;
      const dk = dayKey(t.createdAt);
      if (dk) s.byDay[dk] = (s.byDay[dk] || 0) + 1;
    });

    const issueRows = Object.entries(s.byIssue)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ key: k, val: v, pct: s.total ? Math.round((v * 1000) / s.total) / 10 : 0 }));

    const dayRows = Object.entries(s.byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ day: k, val: v }));

    return { ...s, issueRows, dayRows };
  }, [items]);

  const recent = useMemo(() => items.slice(0, 12), [items]);

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="w-full px-4 md:px-8 py-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin • Support</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Reports</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/support-tickets" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">
                Dashboard <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => fetchAll({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Best-effort report (client-side aggregation). For perfect accuracy, add a backend “/reports” endpoint later.</p>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex flex-col md:flex-row md:items-end gap-3">
          <div className="w-full md:w-[220px]">
            <label className="text-xs font-semibold text-gray-700">Range</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full bg-transparent text-sm outline-none">
                {RANGE.map((r) => (
                  <option key={r.value} value={r.value}>
                    Last {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full md:w-[320px]">
            <label className="text-xs font-semibold text-gray-700">Issue Type</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full bg-transparent text-sm outline-none">
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ml-auto w-full md:w-auto">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-xs text-blue-800 inline-flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Aggregating from <span className="font-semibold">GET /api/support/tickets</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Building report…
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold text-gray-600">TOTAL (range)</p>
                <p className="mt-1 text-2xl font-extrabold text-gray-900">{fmt(stats.total)}</p>
                <p className="mt-1 text-[11px] text-gray-500">Filtered by createdAt.</p>
              </div>
              {STATUS.map((st) => (
                <div key={st} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold text-gray-600">{st.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">{fmt(stats.byStatus[st])}</p>
                  <p className="mt-1 text-[11px] text-gray-500">Count in range.</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-bold text-gray-900">By Issue Type</p>
                </div>
                {!stats.issueRows.length ? (
                  <div className="p-6 text-sm text-gray-600">No data in selected range.</div>
                ) : (
                  <div className="p-4 space-y-3">
                    {stats.issueRows.slice(0, 10).map((r) => (
                      <div key={r.key} className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">{r.key}</p>
                          <p className="text-sm font-extrabold text-gray-900">{fmt(r.val)}</p>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, r.pct)}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">{r.pct}% of total</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-bold text-gray-900">Recent Tickets</p>
                  <p className="mt-0.5 text-xs text-gray-600">Newest first (range-filtered)</p>
                </div>
                {!recent.length ? (
                  <div className="p-6 text-sm text-gray-600">No recent tickets.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recent.map((t) => {
                      const id = safe(t.ticketId);
                      const atCount = Array.isArray(t.attachments) ? t.attachments.length : 0;
                      return (
                        <div key={id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-blue-700">{id}</p>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">{safe(t.subject) || "(No subject)"}</p>
                              <p className="mt-1 text-xs text-gray-600 line-clamp-1">{safe(t.email) || "-"}</p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${upper(t.status) === "OPEN" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-gray-100 text-gray-700 ring-gray-200"}`}>
                              {upper(t.status).replaceAll("_", " ")}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                              <Clock className="h-3.5 w-3.5" /> {new Date(t.createdAt).toLocaleString()}
                            </span>
                            {atCount ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                <ImageIcon className="h-3.5 w-3.5" /> {atCount}
                              </span>
                            ) : null}
                            <Link href={`/support-tickets/${encodeURIComponent(id)}`} className="ml-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">
                              Open <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <p className="text-sm font-bold text-gray-900">Tickets per Day</p>
              </div>
              {!stats.dayRows.length ? (
                <div className="p-6 text-sm text-gray-600">No daily data available.</div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.dayRows.slice(-18).map((r) => (
                    <div key={r.day} className="rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{r.day}</p>
                      <p className="text-sm font-extrabold text-gray-900">{fmt(r.val)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-[11px] text-gray-500">
              Note: This page aggregates by fetching paginated lists. For accuracy + performance, add a backend endpoint like <span className="font-semibold">GET /api/support/reports?days=14</span>.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
