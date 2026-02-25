// components/marketing/ROASreport.jsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  TrendingUp,
  Download,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { useAdminMarketingSpendStore } from "@/store/adminMarketingSpendStore";
import MarketingSpendModal from "@/components/marketing/MarketingSpendModal";

// ✅ Excel export
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* ================= IST helpers ================= */
const IST = "Asia/Kolkata";

const safe = (v) => (v == null ? "" : String(v));

const ymdInIST = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
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

const todayYMD = () => ymdInIST(new Date());

const startOfMonthYMD = () => {
  // IST month start
  const now = new Date();
  const ymd = ymdInIST(now);
  const [y, m] = ymd.split("-").map((x) => parseInt(x, 10));
  return `${y}-${String(m).padStart(2, "0")}-01`;
};

const prettyDate = (ymd) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const money0 = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const pct2 = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
};

/* ================= revenue & status rules ================= */
const getOrderDateYMD = (o) =>
  ymdInIST(o?.placedAt || o?.createdAt || o?.orderDate || o?.paidAt);

const getOrderRevenue = (o) => {
  const candidates = [
    o?.totalAmount,
    o?.total,
    o?.grandTotal,
    o?.amountPaid,
    o?.netAmount,
    o?.payableAmount,
    o?.pricing?.total,
    o?.pricing?.grandTotal,
    o?.pricing?.payable,
  ];
  const val = candidates.find((x) => Number.isFinite(Number(x)));
  return Number(val || 0);
};

const isCancelledOrder = (o) => {
  const fs = String(o?.fulfillmentStatus || o?.status || "").toLowerCase();
  const ps = String(o?.paymentStatus || "").toLowerCase();
  if (fs === "cancelled" || fs === "canceled") return true;
  if (ps === "cancelled" || ps === "canceled") return true;
  return false;
};

const getSpendDateYMD = (s) => ymdInIST(s?.spentAt || s?.createdAt);

/* ================= UI bits ================= */
const Pill = ({ children, tone = "slate" }) => {
  const toneMap = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        toneMap[tone] || toneMap.slate
      }`}
    >
      {children}
    </span>
  );
};

const StatCard = ({ title, value, sub, tone = "slate" }) => {
  const topBar = {
    slate: "from-slate-900/10",
    indigo: "from-indigo-600/15",
    emerald: "from-emerald-600/15",
    rose: "from-rose-600/15",
    amber: "from-amber-500/20",
  }[tone];

  const titleColor = {
    slate: "text-slate-600",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    amber: "text-amber-800",
  }[tone];

  return (
    <div className="relative rounded-3xl bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden">
      <div className={`h-1.5 w-full bg-gradient-to-r ${topBar} to-transparent`} />
      <div className="p-5">
        <div className={`text-xs ${titleColor}`}>{title}</div>
        <div className="mt-1 text-2xl font-semibold text-black">{value}</div>
        {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
      </div>
    </div>
  );
};

const FullPageLoader = ({ label = "Loading report…" }) => (
  <div className="rounded-[28px] bg-white shadow ring-1 ring-black/5 p-10">
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="h-12 w-12 rounded-2xl bg-black/5 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
      <div className="text-sm font-medium text-black">{label}</div>
      <div className="text-xs text-gray-500">
        Fetching orders + spends, please wait…
      </div>
    </div>
  </div>
);

export default function ROASreport() {
  const {
    orders,
    ordersMeta,
    loading: ordersLoading,
    error: ordersError,
    fetchAllOrders,
    fetchNextOrdersPage,
  } = useOrderStore();

  const {
    spends,
    loading: spendsLoading,
    error: spendsError,
    fetchSpends,
  } = useAdminMarketingSpendStore();

  const [from, setFrom] = useState(startOfMonthYMD());
  const [to, setTo] = useState(todayYMD());
  const [source, setSource] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);

  // ✅ NEW: local loader that stays true until ALL pagination is done
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    setInitialLoading(true);
    try {
      const cleanFrom = safe(from).trim();
      const cleanTo = safe(to).trim();

      const orderFilters = {
        from: cleanFrom,
        to: cleanTo,
        page: 1,
        limit: 500,
      };

      const spendFilters = {
        from: cleanFrom,
        to: cleanTo,
        ...(source ? { source } : {}),
      };

      // first fetch: spends + first page orders
      await Promise.allSettled([
        fetchSpends(spendFilters),
        fetchAllOrders(orderFilters),
      ]);

      // ✅ pagination guard with "latest meta" from zustand state
      let guard = 0;
      while (guard < 80) {
        guard += 1;
        const meta = useOrderStore.getState().ordersMeta;
        if (!meta?.hasMore) break;

        const next = await fetchNextOrdersPage({
          ...orderFilters,
          limit: Number(meta?.limit || orderFilters.limit || 500),
        });

        if (!Array.isArray(next) || next.length === 0) break;
      }
    } finally {
      setInitialLoading(false);
    }
  }, [from, to, source, fetchAllOrders, fetchNextOrdersPage, fetchSpends]);

  useEffect(() => {
    load();
  }, [load]);

  const errorText = ordersError || spendsError;

  /* ---------------- sources dropdown ---------------- */
  const sources = useMemo(() => {
    const set = new Set();
    (spends || []).forEach((s) => {
      const v = safe(s?.source).trim();
      if (v) set.add(v);
    });
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [spends]);

  /* ---------------- overall metrics ---------------- */
  const overall = useMemo(() => {
    const oList = Array.isArray(orders) ? orders : [];
    const sList = Array.isArray(spends) ? spends : [];

    const spendTotal = sList.reduce((sum, s) => sum + Number(s?.amount || 0), 0);

    let revenueAll = 0;
    let revenueNoCancel = 0;
    let ordersAll = 0;
    let ordersNoCancel = 0;

    for (const o of oList) {
      const rev = getOrderRevenue(o);
      revenueAll += rev;
      ordersAll += 1;

      if (!isCancelledOrder(o)) {
        revenueNoCancel += rev;
        ordersNoCancel += 1;
      }
    }

    return {
      spendTotal,
      revenueAll,
      revenueNoCancel,
      ordersAll,
      ordersNoCancel,
      roasAll: spendTotal > 0 ? revenueAll / spendTotal : 0,
      roasNoCancel: spendTotal > 0 ? revenueNoCancel / spendTotal : 0,
    };
  }, [orders, spends]);

  /* ---------------- day-wise table ---------------- */
  const dayWise = useMemo(() => {
    const map = new Map();

    const getRow = (ymd) => {
      if (!map.has(ymd)) {
        map.set(ymd, {
          ymd,
          spend: 0,
          revenueAll: 0,
          revenueNoCancel: 0,
          ordersAll: 0,
          ordersNoCancel: 0,
        });
      }
      return map.get(ymd);
    };

    (spends || []).forEach((s) => {
      const ymd = getSpendDateYMD(s);
      if (ymd) getRow(ymd).spend += Number(s?.amount || 0);
    });

    (orders || []).forEach((o) => {
      const ymd = getOrderDateYMD(o);
      if (!ymd) return;
      const r = getRow(ymd);
      const rev = getOrderRevenue(o);

      r.revenueAll += rev;
      r.ordersAll += 1;

      if (!isCancelledOrder(o)) {
        r.revenueNoCancel += rev;
        r.ordersNoCancel += 1;
      }
    });

    const rows = Array.from(map.values()).sort((a, b) =>
      a.ymd < b.ymd ? 1 : -1
    );

    return rows.map((r) => ({
      ...r,
      roasAll: r.spend > 0 ? r.revenueAll / r.spend : 0,
      roasNoCancel: r.spend > 0 ? r.revenueNoCancel / r.spend : 0,
    }));
  }, [orders, spends]);

  /* ---------------- Excel Download ---------------- */
  const downloadExcel = useCallback(async () => {
    try {
      setDownloading(true);

      const wb = new ExcelJS.Workbook();
      wb.creator = "Miray Admin";

      // Summary
      const ws1 = wb.addWorksheet("Summary");
      ws1.columns = [
        { header: "From", key: "from", width: 14 },
        { header: "To", key: "to", width: 14 },
        { header: "Source", key: "source", width: 18 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Revenue (All)", key: "revAll", width: 18 },
        { header: "Revenue (No Cancel)", key: "revNo", width: 22 },
        { header: "Orders (All)", key: "oAll", width: 14 },
        { header: "Orders (No Cancel)", key: "oNo", width: 18 },
        { header: "ROAS (All)", key: "roasAll", width: 12 },
        { header: "ROAS (No Cancel)", key: "roasNo", width: 16 },
      ];
      ws1.addRow({
        from,
        to,
        source: source || "All",
        spend: overall.spendTotal,
        revAll: overall.revenueAll,
        revNo: overall.revenueNoCancel,
        oAll: overall.ordersAll,
        oNo: overall.ordersNoCancel,
        roasAll: overall.roasAll,
        roasNo: overall.roasNoCancel,
      });
      ws1.getRow(1).font = { bold: true };

      // Day-wise
      const ws2 = wb.addWorksheet("Day-wise");
      ws2.columns = [
        { header: "Date (YMD)", key: "ymd", width: 14 },
        { header: "Date", key: "pretty", width: 18 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Revenue (All)", key: "revAll", width: 18 },
        { header: "Revenue (No Cancel)", key: "revNo", width: 22 },
        { header: "Orders (All)", key: "oAll", width: 14 },
        { header: "Orders (No Cancel)", key: "oNo", width: 18 },
        { header: "ROAS (All)", key: "roasAll", width: 12 },
        { header: "ROAS (No Cancel)", key: "roasNo", width: 16 },
      ];

      dayWise.forEach((r) => {
        ws2.addRow({
          ymd: r.ymd,
          pretty: prettyDate(r.ymd),
          spend: r.spend,
          revAll: r.revenueAll,
          revNo: r.revenueNoCancel,
          oAll: r.ordersAll,
          oNo: r.ordersNoCancel,
          roasAll: r.roasAll,
          roasNo: r.roasNoCancel,
        });
      });

      ws2.getRow(1).font = { bold: true };
      ws2.views = [{ state: "frozen", ySplit: 1 }];

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `ROAS_${from}_to_${to}.xlsx`);
    } catch (e) {
      alert(e?.message || "Excel download failed");
    } finally {
      setDownloading(false);
    }
  }, [from, to, source, overall, dayWise]);

  // (keep small inline table loader if stores are still toggling loading)
  const inlineLoading = ordersLoading || spendsLoading;

  // ✅ FULL loader: first load OR when applying new filters until pagination completes
  if (initialLoading && !errorText) {
    return (
      <div className="w-full space-y-4">
        {/* Header skeleton */}
        <div className="rounded-[28px] bg-white shadow ring-1 ring-black/5 p-6 flex items-center justify-between">
          <div className="flex gap-3 items-center">
            <div className="h-10 w-10 rounded-2xl bg-black/10" />
            <div>
              <div className="h-4 w-40 bg-black/10 rounded" />
              <div className="mt-2 h-3 w-56 bg-black/5 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-black/5 rounded-2xl" />
            <div className="h-9 w-24 bg-black/5 rounded-2xl" />
            <div className="h-9 w-24 bg-black/5 rounded-2xl" />
          </div>
        </div>

        {/* Full loader card */}
        <FullPageLoader label="Loading ROAS report…" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="rounded-[28px] bg-white shadow ring-1 ring-black/5 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-2xl bg-black text-white flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-black">ROAS Report</div>
              <div className="text-xs text-gray-500">
                IST • {from} → {to}
                {source ? ` • ${source}` : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowSpendModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm text-white"
            >
              <PlusCircle className="w-4 h-4" />
              Add Spend
            </button>

            <button
              onClick={downloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Excel
            </button>

            <button
              onClick={load}
              disabled={initialLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10 disabled:opacity-60"
            >
              {initialLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-[28px] bg-white shadow ring-1 ring-black/5 p-5">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">From (IST)</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">To (IST)</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">Spend Source</div>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {sources.map((s) => (
                  <option key={s || "__all"} value={s}>
                    {s ? s : "All"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 md:justify-end">
              <button
                onClick={() => {
                  setFrom(startOfMonthYMD());
                  setTo(todayYMD());
                  setSource("");
                }}
                className="rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10"
              >
                Reset
              </button>
              <button
                onClick={load}
                disabled={initialLoading}
                className="rounded-2xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {initialLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying…
                  </span>
                ) : (
                  "Apply"
                )}
              </button>
            </div>
          </div>

          {errorText ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorText}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone="indigo">Orders: {money0(overall.ordersAll)}</Pill>
            <Pill tone="emerald">No-Cancel: {money0(overall.ordersNoCancel)}</Pill>
            <Pill tone="amber">Days: {money0(dayWise.length)}</Pill>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            tone="amber"
            title="Spend"
            value={`₹ ${money0(overall.spendTotal)}`}
            sub={source ? `Source: ${source}` : "All sources"}
          />
          <StatCard
            tone="indigo"
            title="Revenue (All)"
            value={`₹ ${money0(overall.revenueAll)}`}
            sub={`ROAS: ${pct2(overall.roasAll)}x`}
          />
          <StatCard
            tone="emerald"
            title="Revenue (No Cancel)"
            value={`₹ ${money0(overall.revenueNoCancel)}`}
            sub={`ROAS: ${pct2(overall.roasNoCancel)}x`}
          />
        </div>

        {/* Day-wise table */}
        <div className="rounded-[28px] bg-white shadow ring-1 ring-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-black">Day-wise ROAS</div>
              <div className="text-xs text-gray-500">
                Latest dates first • IST grouping
              </div>
            </div>
            {inlineLoading ? (
              <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : null}
          </div>

          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-white">
                <tr className="text-left text-xs text-gray-600 border-b border-black/10">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Spend</th>
                  <th className="px-6 py-3 font-medium">Revenue (All)</th>
                  <th className="px-6 py-3 font-medium">ROAS (All)</th>
                  <th className="px-6 py-3 font-medium">Revenue (No Cancel)</th>
                  <th className="px-6 py-3 font-medium">ROAS (No Cancel)</th>
                  <th className="px-6 py-3 font-medium">Orders</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {dayWise.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-600" colSpan={7}>
                      No data found for selected range.
                    </td>
                  </tr>
                ) : (
                  dayWise.map((r) => (
                    <tr key={r.ymd} className="text-sm">
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">
                          {prettyDate(r.ymd)}
                        </div>
                        <div className="text-xs text-gray-500">{r.ymd}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-black">
                          ₹ {money0(r.spend)}
                        </div>
                        {r.spend > 0 ? (
                          <div className="text-xs text-gray-500">Active spend</div>
                        ) : (
                          <div className="text-xs text-gray-400">No spend</div>
                        )}
                      </td>

                      <td className="px-6 py-4">₹ {money0(r.revenueAll)}</td>

                      <td className="px-6 py-4">
                        <Pill
                          tone={
                            r.roasAll >= 2
                              ? "emerald"
                              : r.roasAll >= 1
                              ? "amber"
                              : "rose"
                          }
                        >
                          {pct2(r.roasAll)}x
                        </Pill>
                      </td>

                      <td className="px-6 py-4">₹ {money0(r.revenueNoCancel)}</td>

                      <td className="px-6 py-4">
                        <Pill
                          tone={
                            r.roasNoCancel >= 2
                              ? "emerald"
                              : r.roasNoCancel >= 1
                              ? "amber"
                              : "rose"
                          }
                        >
                          {pct2(r.roasNoCancel)}x
                        </Pill>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-black">
                          {money0(r.ordersAll)}{" "}
                          <span className="text-xs text-gray-500">
                            (No-cancel: {money0(r.ordersNoCancel)})
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Use your existing modal here */}
      <MarketingSpendModal
        open={showSpendModal}
        onClose={() => setShowSpendModal(false)}
        onSaved={() => {
          setShowSpendModal(false);
          load(); // ✅ loader will show until everything finishes
        }}
      />
    </>
  );
}