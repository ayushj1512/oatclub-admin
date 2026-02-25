"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";
import {
  Loader2,
  RefreshCcw,
  Download,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  Undo2,
} from "lucide-react";

/* ================= IST + DATE FORMAT ================= */

const IST = "Asia/Kolkata";

// internal: YYYY-MM-DD (IST)
const ymdIST = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

// display: DD-MM-YYYY
const ddmmyyyy = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}-${m}-${y}`;
};

const todayIST = () => ymdIST(new Date());

const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const listDaysInclusive = (from, to) => {
  const out = [];
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return out;
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

/* ================= ORDER HELPERS ================= */

const safeLower = (v) => String(v ?? "").trim().toLowerCase();
const fmtINR = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;

const orderFS = (o) => safeLower(o?.fulfillmentStatus);
const shipFS = (o) => safeLower(o?.shipment?.status);

const isPaidPrepaid = (o) =>
  safeLower(o?.paymentMethod) !== "cod" && safeLower(o?.paymentStatus) === "paid";
const isCodConfirmed = (o) =>
  safeLower(o?.paymentMethod) === "cod" && Boolean(o?.isConfirmed);
const isConfirmed = (o) => Boolean(o?.isConfirmed) || isPaidPrepaid(o) || isCodConfirmed(o);

const isDispatched = (o) =>
  ["shipped", "out_for_delivery"].includes(orderFS(o)) ||
  ["shipped", "out_for_delivery"].includes(shipFS(o));

const isDelivered = (o) => orderFS(o) === "delivered" || shipFS(o) === "delivered";
const isCancelled = (o) => orderFS(o) === "cancelled" || shipFS(o) === "cancelled";
const isRefunded = (o) => safeLower(o?.paymentStatus) === "refunded" || orderFS(o) === "refunded";
const isRto = (o) => orderFS(o) === "rto" || shipFS(o) === "rto";
const isReturned = (o) => orderFS(o) === "returned";

const isCancelledBeforeDispatch = (o) => {
  if (!isCancelled(o)) return false;
  if (isDispatched(o) || isDelivered(o) || isRto(o)) return false;
  return true;
};

const orderRevenue = (o) => Number(o?.finalPayable ?? o?.totalAmount ?? 0) || 0;

/* ================= CSV EXPORT ================= */

const exportCSV = (rows, filename) => {
  const headers = [
    "date",
    "placed",
    "confirmed",
    "dispatched",
    "delivered",
    "cancelled_pre_dispatch",
    "rto",
    "returned",
    "net_revenue",
  ];

  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n"))
      return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ================= UI BITS ================= */

function Chip({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition shadow-sm ring-1",
        active
          ? "bg-gray-900 text-white ring-gray-900"
          : "bg-white text-gray-800 ring-black/5 hover:ring-black/10 hover:bg-gray-50",
      ].join(" ")}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function KpiCard({ title, value, sub, tone = "indigo" }) {
  const toneMap = {
    indigo: "from-indigo-600 to-violet-600",
    emerald: "from-emerald-600 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-600 to-red-600",
    cyan: "from-cyan-600 to-sky-600",
    fuchsia: "from-fuchsia-600 to-violet-600",
    slate: "from-slate-700 to-gray-900",
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-600">{title}</div>
          <div className="text-xl md:text-2xl font-semibold text-gray-900 mt-1">
            {value}
          </div>
          {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
        </div>
        <div
          className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${
            toneMap[tone] || toneMap.indigo
          } flex items-center justify-center`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
        </div>
      </div>
    </div>
  );
}

function Th({ children, right }) {
  return (
    <th
      className={[
        "p-3 text-xs font-semibold tracking-wide text-gray-700 whitespace-nowrap",
        right ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({ children, right, className = "" }) {
  return (
    <td
      className={[
        "p-3 text-sm text-gray-700 whitespace-nowrap",
        right ? "text-right" : "text-left",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}

/* ================= PAGE ================= */

export default function OrdersReportPage() {
  const { fetchAllOrders } = useOrderStore();

  const t = useMemo(() => todayIST(), []);
  const [from, setFrom] = useState(() => addDays(t, -6));
  const [to, setTo] = useState(() => t);

  // ✅ Removed: today / yesterday / mtd
  const [quick, setQuick] = useState("7d"); // 7d | 30d | all | custom
  const [scope, setScope] = useState("all"); // all | confirmed | dispatched | delivered | cancelled | rto | returned
  const [query, setQuery] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [err, setErr] = useState("");

  const earliestCreatedYMD = useMemo(() => {
    let min = "";
    for (const o of orders || []) {
      const d = ymdIST(o?.createdAt);
      if (!d) continue;
      if (!min || d < min) min = d;
    }
    return min;
  }, [orders]);

  const applyQuick = (key) => {
    setQuick(key);
    const today = todayIST();

    if (key === "7d") {
      setFrom(addDays(today, -6));
      setTo(today);
      return;
    }
    if (key === "30d") {
      setFrom(addDays(today, -29));
      setTo(today);
      return;
    }
    if (key === "all") {
      setFrom(earliestCreatedYMD || addDays(today, -3650));
      setTo(today);
      return;
    }
  };

  const run = async () => {
    setErr("");
    setLoading(true);
    setFetchedCount(0);

    try {
      const LIMIT = 500;
      const MAX_PAGES = 150;
      let page = 1;
      let all = [];

      while (page <= MAX_PAGES) {
        const chunk = await fetchAllOrders({ page, limit: LIMIT });
        const arr = Array.isArray(chunk) ? chunk : [];
        all = all.concat(arr);
        setFetchedCount(all.length);
        if (arr.length < LIMIT) break;
        page += 1;
      }

      setOrders(all);

      // keep ALL in sync after fetch
      if (quick === "all") {
        let min = "";
        for (const o of all) {
          const d = ymdIST(o?.createdAt);
          if (!d) continue;
          if (!min || d < min) min = d;
        }
        if (min) setFrom(min);
        setTo(todayIST());
      }
    } catch (e) {
      setErr(e?.message || "Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1) Date range filter (createdAt in IST)
  const inRange = useMemo(() => {
    const a = String(from || "");
    const b = String(to || "");
    return (orders || []).filter((o) => {
      const d = ymdIST(o?.createdAt);
      return d && d >= a && d <= b;
    });
  }, [orders, from, to]);

  // 2) Search filter (orderNumber)
  const byQuery = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return inRange;
    return (inRange || []).filter((o) =>
      String(o?.orderNumber || "").toLowerCase().includes(q)
    );
  }, [inRange, query]);

  // 3) Scope filter
  const filtered = useMemo(() => {
    if (scope === "all") return byQuery;
    if (scope === "confirmed") return byQuery.filter(isConfirmed);
    if (scope === "dispatched") return byQuery.filter(isDispatched);
    if (scope === "delivered") return byQuery.filter(isDelivered);
    if (scope === "cancelled") return byQuery.filter(isCancelledBeforeDispatch);
    if (scope === "rto") return byQuery.filter(isRto);
    if (scope === "returned") return byQuery.filter(isReturned);
    return byQuery;
  }, [byQuery, scope]);

  // Build daily report (createdAt buckets)
  const report = useMemo(() => {
    const days = listDaysInclusive(from, to);

    const map = new Map(
      days.map((d) => [
        d,
        {
          date: d,
          placed: 0,
          confirmed: 0,
          dispatched: 0,
          delivered: 0,
          cancelled_pre_dispatch: 0,
          rto: 0,
          returned: 0,
          net_revenue: 0,
        },
      ])
    );

    for (const o of filtered || []) {
      const d = ymdIST(o?.createdAt);
      if (!d || !map.has(d)) continue;

      const row = map.get(d);
      row.placed += 1;
      if (isConfirmed(o)) row.confirmed += 1;
      if (isDispatched(o)) row.dispatched += 1;
      if (isDelivered(o)) row.delivered += 1;
      if (isCancelledBeforeDispatch(o)) row.cancelled_pre_dispatch += 1;
      if (isRto(o)) row.rto += 1;
      if (isReturned(o)) row.returned += 1;
      if (!isCancelled(o) && !isRefunded(o)) row.net_revenue += orderRevenue(o);
    }

    // ✅ DESC order always (latest date first)
    const rows = Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));

    const totals = rows.reduce(
      (acc, r) => {
        acc.placed += r.placed;
        acc.confirmed += r.confirmed;
        acc.dispatched += r.dispatched;
        acc.delivered += r.delivered;
        acc.cancelled_pre_dispatch += r.cancelled_pre_dispatch;
        acc.rto += r.rto;
        acc.returned += r.returned;
        acc.net_revenue += r.net_revenue;
        return acc;
      },
      {
        placed: 0,
        confirmed: 0,
        dispatched: 0,
        delivered: 0,
        cancelled_pre_dispatch: 0,
        rto: 0,
        returned: 0,
        net_revenue: 0,
      }
    );

    return { rows, totals };
  }, [filtered, from, to]);

  const exportDisabled = loading || !report.rows.length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f6f7fb] p-4 md:p-6">
      <div className="mx-auto space-y-4">
        {/* Header / Controls */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-sm flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900">Orders Report</div>
                <div className="text-sm text-gray-600">
                  {ddmmyyyy(from)} → {ddmmyyyy(to)}{" "}
                  <span className="text-gray-400">•</span>{" "}
                  <span className="text-xs text-gray-500">
                    IST (Asia/Kolkata) • Latest-first (DESC)
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Fetched:{" "}
                  <span className="font-semibold text-gray-900">
                    {loading ? fetchedCount : orders.length}
                  </span>
                  {" • "}
                  Filtered:{" "}
                  <span className="font-semibold text-gray-900">{filtered.length}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={run}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <button
                onClick={() =>
                  exportCSV(
                    report.rows.map((r) => ({ ...r, date: ddmmyyyy(r.date) })),
                    `orders_report_${from}_to_${to}.csv`
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                disabled={exportDisabled}
                title={exportDisabled ? "No rows to export" : "Export CSV"}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Quick ranges */}
            <div className="rounded-2xl bg-[#fafafa] p-3 ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                  Quick Range
                </div>

                <button
                  onClick={() => {
                    // quick UX: reset to 7d + clear extras
                    setQuery("");
                    setScope("all");
                    applyQuick("7d");
                  }}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  type="button"
                >
                  Reset
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Chip
                  active={quick === "7d"}
                  label="Last 7 days"
                  onClick={() => applyQuick("7d")}
                />
                <Chip
                  active={quick === "30d"}
                  label="Last 30 days"
                  onClick={() => applyQuick("30d")}
                />
                <Chip active={quick === "all"} label="ALL" onClick={() => applyQuick("all")} />
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Use date picker for custom range.
              </div>
            </div>

            {/* Date range */}
            <div className="rounded-2xl bg-[#fafafa] p-3 ring-1 ring-black/5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                Date Range
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setQuick("custom");
                  }}
                  className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setQuick("custom");
                  }}
                  className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Table shows latest date first (DESC)
              </div>
            </div>

            {/* Scope + search */}
            <div className="rounded-2xl bg-[#fafafa] p-3 ring-1 ring-black/5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                Advanced
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2">
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="all">Scope: All orders</option>
                  <option value="confirmed">Only Confirmed</option>
                  <option value="dispatched">Only Dispatched</option>
                  <option value="delivered">Only Delivered</option>
                  <option value="cancelled">Only Cancelled (Pre-dispatch)</option>
                  <option value="rto">Only RTO</option>
                  <option value="returned">Only Returned</option>
                </select>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search order number (e.g., MIRAY-000271)"
                  className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>

          {err ? (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {err}
            </div>
          ) : null}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Placed" value={report.totals.placed} sub="Created in range" tone="slate" />
          <KpiCard
            title="Confirmed"
            value={report.totals.confirmed}
            sub="COD confirmed + prepaid paid"
            tone="emerald"
          />
          <KpiCard
            title="Dispatched"
            value={report.totals.dispatched}
            sub="shipped / out_for_delivery"
            tone="fuchsia"
          />
          <KpiCard title="Delivered" value={report.totals.delivered} sub="delivered" tone="amber" />
          <KpiCard
            title="Cancelled (Pre-dispatch)"
            value={report.totals.cancelled_pre_dispatch}
            sub="cancelled before dispatch"
            tone="rose"
          />
          <KpiCard title="RTO" value={report.totals.rto} sub="rto" tone="rose" />
          <KpiCard title="Returned" value={report.totals.returned} sub="returned" tone="cyan" />
          <KpiCard
            title="Net Revenue"
            value={fmtINR(report.totals.net_revenue)}
            sub="excl. cancelled + refunded"
            tone="indigo"
          />
        </div>

        {/* Table (DESC) */}
        <div className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="min-w-[1150px] w-full text-sm">
            <thead className="bg-[#fafafa]">
              <tr>
                <Th>Date (DD-MM-YYYY)</Th>
                <Th right>Placed</Th>
                <Th right>Confirmed</Th>
                <Th right>Dispatched</Th>
                <Th right>Delivered</Th>
                <Th right>Cancelled</Th>
                <Th right>RTO</Th>
                <Th right>Returned</Th>
                <Th right>Net Revenue</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading… ({fetchedCount})
                    </span>
                  </td>
                </tr>
              ) : report.rows.length ? (
                report.rows.map((r) => (
                  <tr key={r.date} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <Td className="font-medium text-gray-900">{ddmmyyyy(r.date)}</Td>
                    <Td right>{r.placed}</Td>
                    <Td right>{r.confirmed}</Td>
                    <Td right>{r.dispatched}</Td>
                    <Td right>{r.delivered}</Td>
                    <Td right>{r.cancelled_pre_dispatch}</Td>
                    <Td right>{r.rto}</Td>
                    <Td right>{r.returned}</Td>
                    <Td right className="font-semibold text-gray-900">
                      {fmtINR(r.net_revenue)}
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-600">
                    No data in selected range.
                  </td>
                </tr>
              )}
            </tbody>

            {report.rows.length ? (
              <tfoot className="bg-[#fafafa] border-t border-gray-100">
                <tr className="font-semibold text-gray-900">
                  <Td>Totals</Td>
                  <Td right>{report.totals.placed}</Td>
                  <Td right>{report.totals.confirmed}</Td>
                  <Td right>{report.totals.dispatched}</Td>
                  <Td right>{report.totals.delivered}</Td>
                  <Td right>{report.totals.cancelled_pre_dispatch}</Td>
                  <Td right>{report.totals.rto}</Td>
                  <Td right>{report.totals.returned}</Td>
                  <Td right>{fmtINR(report.totals.net_revenue)}</Td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        {/* Notes */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definitions used
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
            <Note
              icon={CheckCircle2}
              label="Confirmed"
              text="isConfirmed true OR prepaid (paymentMethod != cod AND paymentStatus = paid)"
            />
            <Note
              icon={Truck}
              label="Dispatched"
              text="fulfillmentStatus OR shipment.status in shipped / out_for_delivery"
            />
            <Note icon={PackageCheck} label="Delivered" text="fulfillmentStatus OR shipment.status = delivered" />
            <Note icon={XCircle} label="Cancelled (Pre-dispatch)" text="cancelled but not shipped/delivered/rto" />
            <Note icon={RotateCcw} label="RTO" text="fulfillmentStatus OR shipment.status = rto" />
            <Note icon={Undo2} label="Net Revenue" text="Sum(finalPayable) excluding cancelled + refunded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Note({ icon: Icon, label, text }) {
  return (
    <div className="rounded-xl bg-[#fafafa] p-3 ring-1 ring-black/5">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
        {Icon ? <Icon className="h-4 w-4 text-indigo-600" /> : null}
        {label}
      </div>
      <div className="mt-1 text-xs text-gray-600">{text}</div>
    </div>
  );
}