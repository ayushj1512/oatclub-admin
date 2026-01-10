// app/support-tickets/search/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Mail, Hash, Ticket, RefreshCcw, AlertCircle, ExternalLink, Loader2, Clock, Image as ImageIcon, User } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API_BASE = `${BACKEND}/api/support`;

const safe = (v) => String(v ?? "").trim();
const upper = (v) => safe(v).toUpperCase();
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
  const s = upper(status);
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  if (s === "OPEN") return `${base} bg-blue-50 text-blue-700 ring-blue-200`;
  if (s === "IN_PROGRESS") return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
  if (s === "RESOLVED") return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
  if (s === "CLOSED") return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
  return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
};

const looksLikeTicketId = (s) => /^MF-[A-Z0-9]{6,}$/i.test(safe(s));
const looksLikeEmail = (s) => safe(s).includes("@");

export default function Page() {
  const [mode, setMode] = useState("smart"); // smart | email | ticket
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState("");

  const [items, setItems] = useState([]);
  const [single, setSingle] = useState(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const inflight = useRef(null);

  const effectiveMode = useMemo(() => {
    if (mode === "email" || mode === "ticket") return mode;
    const q = safe(query);
    if (!q) return "smart";
    if (looksLikeTicketId(q)) return "ticket";
    if (looksLikeEmail(q)) return "email";
    return "smart"; // partial name / keyword => admin search endpoint
  }, [mode, query]);

  const canSearch = useMemo(() => {
    if (mode === "email") return !!safe(email);
    if (mode === "ticket") return !!safe(ticketId);
    return !!safe(query);
  }, [mode, email, ticketId, query]);

  const fetchSearch = async ({ silent = false } = {}) => {
    if (!canSearch) return;
    if (!silent) setLoading(true);
    setRefreshing(!!silent);
    setError("");
    setItems([]);
    setSingle(null);

    try {
      if (inflight.current) inflight.current.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;

      const qRaw = safe(query);
      const qEmail = safe(email).toLowerCase();
      const qTicket = safe(ticketId);

      const url =
        mode === "email"
          ? `${API_BASE}/tickets/by-email?${qs({ email: qEmail, page: 1, limit: 50 })}`
          : mode === "ticket"
          ? `${API_BASE}/tickets/${encodeURIComponent(qTicket)}`
          : effectiveMode === "ticket"
          ? `${API_BASE}/tickets/${encodeURIComponent(qRaw)}`
          : effectiveMode === "email"
          ? `${API_BASE}/tickets/by-email?${qs({ email: qRaw.toLowerCase(), page: 1, limit: 50 })}`
          : `${API_BASE}/tickets/search?${qs({ q: qRaw, page: 1, limit: 50 })}`;

      const res = await fetch(url, { method: "GET", cache: "no-store", signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.message || `Failed (${res.status})`);

      if (mode === "ticket" || effectiveMode === "ticket") {
        setSingle(data?.ticket || null);
      } else {
        const list = Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data?.items) ? data.items : [];
        setItems(list);
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Search failed");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (inflight.current) inflight.current.abort();
    };
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    fetchSearch({ silent: false });
  };

  const onClear = () => {
    setQuery("");
    setEmail("");
    setTicketId("");
    setItems([]);
    setSingle(null);
    setError("");
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="w-full px-4 md:px-8 py-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin • Support</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Search Tickets</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/support-tickets" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">
                Dashboard <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link href="/support-tickets/all" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">
                All <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <p className="text-sm text-gray-600">Smart search supports: full email, Ticket ID (MF-...), or partial text like “ayushjuneja” (via /tickets/search).</p>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => (setMode("smart"), setItems([]), setSingle(null), setError(""), setEmail(""), setTicketId(""))} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-inset transition ${mode === "smart" ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"}`}>
              <User className="h-4 w-4" /> Smart
            </button>
            <button type="button" onClick={() => (setMode("email"), setItems([]), setSingle(null), setError(""), setQuery(""), setTicketId(""))} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-inset transition ${mode === "email" ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"}`}>
              <Mail className="h-4 w-4" /> By Email
            </button>
            <button type="button" onClick={() => (setMode("ticket"), setItems([]), setSingle(null), setError(""), setQuery(""), setEmail(""))} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-inset transition ${mode === "ticket" ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"}`}>
              <Ticket className="h-4 w-4" /> By Ticket ID
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => fetchSearch({ silent: true })} disabled={!canSearch} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition ${canSearch ? "bg-blue-600 hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}>
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-700">
                {mode === "smart" ? "Search (email / ticketId / name / keyword)" : mode === "email" ? "Customer Email" : "Ticket ID"}
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                {mode === "email" ? <Mail className="h-4 w-4 text-gray-400" /> : mode === "ticket" ? <Hash className="h-4 w-4 text-gray-400" /> : <Search className="h-4 w-4 text-gray-400" />}
                <input
                  value={mode === "email" ? email : mode === "ticket" ? ticketId : query}
                  onChange={(e) => (mode === "email" ? setEmail(e.target.value) : mode === "ticket" ? setTicketId(e.target.value) : setQuery(e.target.value))}
                  placeholder={mode === "email" ? "customer@email.com" : mode === "ticket" ? "MF-XXXXXXXX" : "ayushjuneja / MF-XXXX / customer@email.com"}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {mode === "smart" ? (
                  <>
                    Auto routes to: <span className="font-semibold">/tickets/by-email</span> (email) · <span className="font-semibold">/tickets/:ticketId</span> (MF-...) · <span className="font-semibold">/tickets/search?q=</span> (text)
                  </>
                ) : mode === "email" ? (
                  <>
                    Calls: <span className="font-semibold">GET /api/support/tickets/by-email?email=...</span>
                  </>
                ) : (
                  <>
                    Calls: <span className="font-semibold">GET /api/support/tickets/:ticketId</span>
                  </>
                )}
              </p>
            </div>

            <button type="submit" disabled={!canSearch || loading} className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${!canSearch || loading ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:opacity-90"}`}>
              <Search className="h-4 w-4 mr-2" /> Search
            </button>

            <button type="button" onClick={onClear} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition">
              Clear
            </button>
          </form>

          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5" /> {error}</div> : null}
          {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</div> : null}
        </div>

        {/* Results */}
        {(mode === "ticket" || effectiveMode === "ticket") ? (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-bold text-gray-900">Ticket Result</p>
            </div>

            {!single ? (
              <div className="p-6 text-sm text-gray-600">Search a Ticket ID to see details.</div>
            ) : (
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-700">{safe(single.ticketId)}</p>
                    <p className="mt-1 text-lg font-extrabold text-gray-900">{safe(single.subject) || "(No subject)"}</p>
                    <p className="mt-1 text-sm text-gray-600">{safe(single.issueType) || "-"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(single.createdAt)}</span>
                      <span className={pill(single.status)}>{upper(single.status).replaceAll("_", " ")}</span>
                      {safe(single.orderId) ? <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">Order: <span className="ml-1 font-semibold">{safe(single.orderId)}</span></span> : null}
                      {Array.isArray(single.attachments) && single.attachments.length ? <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1"><ImageIcon className="h-3.5 w-3.5" /> {single.attachments.length}</span> : null}
                    </div>
                  </div>

                  <Link href={`/support-tickets/${encodeURIComponent(safe(single.ticketId))}`} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
                    Open Details <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-700">Customer Message</p>
                  <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{safe(single.message) || "-"}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-bold text-gray-900">{mode === "email" || effectiveMode === "email" ? "Email Results" : "Search Results"}</p>
              <p className="mt-0.5 text-xs text-gray-600">Showing up to 50 tickets.</p>
            </div>

            {!items.length ? (
              <div className="p-6 text-sm text-gray-600">{mode === "email" || effectiveMode === "email" ? "Search an email to list tickets." : "Search by name / keyword / ticketId etc."}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((t) => {
                  const id = safe(t.ticketId);
                  const atCount = Array.isArray(t.attachments) ? t.attachments.length : 0;
                  return (
                    <div key={id || `${safe(t.email)}-${fmtDate(t.createdAt)}`} className="px-4 py-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-blue-700">{id || "-"}</p>
                          <p className="text-sm font-bold text-gray-900 line-clamp-1">{safe(t.subject) || "(No subject)"}</p>
                          <p className="mt-1 text-xs text-gray-600 line-clamp-1">{safe(t.issueType) || "-"}</p>
                        </div>
                        <span className={pill(t.status)}>{upper(t.status).replaceAll("_", " ")}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(t.createdAt)}</span>
                        {atCount ? <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1"><ImageIcon className="h-3.5 w-3.5" /> {atCount}</span> : null}
                        {safe(t.orderId) ? <span className="text-gray-500">• Order: {safe(t.orderId)}</span> : null}
                        {safe(t.email) ? <span className="text-gray-500">• {safe(t.email)}</span> : null}
                      </div>

                      <div className="mt-3">
                        <Link href={`/support-tickets/${encodeURIComponent(id)}`} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset transition ${id ? "bg-white text-blue-700 ring-blue-200 hover:bg-blue-50" : "bg-gray-100 text-gray-400 ring-gray-200 pointer-events-none"}`}>
                          View <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
