// components/marketing/ROASreport.jsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, TrendingUp, Download, PlusCircle, Loader2 } from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import { useAdminMarketingSpendStore } from "@/store/adminMarketingSpendStore";
import MarketingSpendModal from "@/components/marketing/MarketingSpendModal";

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

const prettyDate = (ymd) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

const clampRange = (from, to) => {
  const f = safe(from).trim();
  const t = safe(to).trim();
  if (!f || !t) return { from: f, to: t };
  return f > t ? { from: t, to: f } : { from: f, to: t };
};

/* ================= business rules ================= */
const getOrderDateYMD = (o) => ymdInIST(o?.placedAt || o?.createdAt || o?.orderDate || o?.paidAt);

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
  return fs === "cancelled" || fs === "canceled" || ps === "cancelled" || ps === "canceled";
};

const getSpendDateYMD = (s) => ymdInIST(s?.spentAt || s?.date || s?.createdAt || s?.updatedAt);

const getSpendAmount = (s) => {
  const candidates = [s?.amount, s?.spend, s?.cost, s?.value, s?.total];
  const v = candidates.find((x) => Number.isFinite(Number(x)));
  return Number(v || 0);
};

/* ================= UI ================= */
const Pill = ({ children, tone = "slate" }) => {
  const toneMap = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${toneMap[tone] || toneMap.slate}`}>
      {children}
    </span>
  );
};

const Stat = ({ title, value, sub, tone = "slate" }) => {
  const bar = {
    slate: "from-slate-900/10",
    indigo: "from-indigo-600/15",
    emerald: "from-emerald-600/15",
    rose: "from-rose-600/15",
    amber: "from-amber-500/20",
  }[tone];
  return (
    <div className="relative rounded-3xl bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden">
      <div className={`h-1.5 w-full bg-gradient-to-r ${bar} to-transparent`} />
      <div className="p-5">
        <div className="text-xs text-gray-600">{title}</div>
        <div className="mt-1 text-2xl font-semibold text-black">{value}</div>
        {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
      </div>
    </div>
  );
};

export default function ROASreport() {
  const { orders, loading: ordersLoading, error: ordersError, fetchAllOrders, fetchNextOrdersPage } = useOrderStore();

  const { spends, loading: spendsLoading, error: spendsError, hasMore: spendsHasMore, fetchSpends, fetchMoreSpends } =
    useAdminMarketingSpendStore();

  // ✅ Default ALL TIME (blank filters)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);

  const load = useCallback(
    async (override = null) => {
      setLoadingAll(true);
      try {
        const rawFrom = override?.from ?? from;
        const rawTo = override?.to ?? to;
        const range = clampRange(rawFrom, rawTo);
        const cleanSource = safe(override?.source ?? source).trim();

        const spendFilters = {
          page: 1,
          limit: 50,
          ...(range.from && range.to ? { from: range.from, to: range.to } : {}),
          ...(cleanSource ? { source: cleanSource } : {}),
        };

        const orderFilters = {
          page: 1,
          limit: 500,
          ...(range.from && range.to ? { from: range.from, to: range.to } : {}),
        };

        await fetchSpends(spendFilters);

        await fetchAllOrders(orderFilters);
        let guard = 0;
        while (guard < 200) {
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
        setLoadingAll(false);
      }
    },
    [from, to, source, fetchSpends, fetchAllOrders, fetchNextOrdersPage]
  );

  // ✅ only once on mount (NO auto refresh on calendar change)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ spends infinite scroll
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;

    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries?.[0]?.isIntersecting) return;
        if (!spendsHasMore) return;
        await fetchMoreSpends();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [fetchMoreSpends, spendsHasMore]);

  const errorText = ordersError || spendsError;
  const inlineLoading = ordersLoading || spendsLoading || loadingAll;

  const sources = useMemo(() => {
    const set = new Set();
    (spends || []).forEach((s) => {
      const v = safe(s?.source).trim();
      if (v) set.add(v);
    });
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [spends]);

  const overall = useMemo(() => {
    const oList = Array.isArray(orders) ? orders : [];
    const sList = Array.isArray(spends) ? spends : [];
    const spendTotal = sList.reduce((sum, s) => sum + getSpendAmount(s), 0);

    let revenueAll = 0,
      revenueNoCancel = 0,
      ordersAll = 0,
      ordersNoCancel = 0;

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

  const dayWise = useMemo(() => {
    const map = new Map();
    const row = (ymd) => {
      if (!map.has(ymd)) map.set(ymd, { ymd, spend: 0, revenueAll: 0, revenueNoCancel: 0, ordersAll: 0, ordersNoCancel: 0 });
      return map.get(ymd);
    };

    (spends || []).forEach((s) => {
      const ymd = getSpendDateYMD(s);
      if (ymd) row(ymd).spend += getSpendAmount(s);
    });

    (orders || []).forEach((o) => {
      const ymd = getOrderDateYMD(o);
      if (!ymd) return;
      const r = row(ymd);
      const rev = getOrderRevenue(o);
      r.revenueAll += rev;
      r.ordersAll += 1;
      if (!isCancelledOrder(o)) {
        r.revenueNoCancel += rev;
        r.ordersNoCancel += 1;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => (a.ymd < b.ymd ? 1 : -1))
      .map((r) => ({
        ...r,
        roasAll: r.spend > 0 ? r.revenueAll / r.spend : 0,
        roasNoCancel: r.spend > 0 ? r.revenueNoCancel / r.spend : 0,
      }));
  }, [orders, spends]);

  const downloadExcel = useCallback(async () => {
    try {
      setDownloading(true);
      const range = clampRange(from, to);

      const wb = new ExcelJS.Workbook();
      wb.creator = "Miray Admin";

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
        from: range.from || "ALL",
        to: range.to || "ALL",
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
      dayWise.forEach((r) =>
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
        })
      );
      ws2.getRow(1).font = { bold: true };
      ws2.views = [{ state: "frozen", ySplit: 1 }];

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `ROAS_${range.from || "ALL"}_to_${range.to || "ALL"}.xlsx`);
    } catch (e) {
      alert(e?.message || "Excel download failed");
    } finally {
      setDownloading(false);
    }
  }, [from, to, source, overall, dayWise]);

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
                IST • {from && to ? `${from} → ${to}` : "ALL TIME"}
                {source ? ` • ${source}` : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowSpendModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm text-white"
              type="button"
            >
              <PlusCircle className="w-4 h-4" />
              Add Spend
            </button>

            <button
              onClick={downloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10 disabled:opacity-60"
              type="button"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Excel
            </button>

            <button
              onClick={() => load({ from, to, source })}
              disabled={loadingAll}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10 disabled:opacity-60"
              type="button"
            >
              {loadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
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
                  setFrom("");
                  setTo("");
                  setSource("");
                  load({ from: "", to: "", source: "" });
                }}
                className="rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10"
                type="button"
              >
                All
              </button>

              <button
                onClick={() => load({ from, to, source })}
                disabled={loadingAll}
                className="rounded-2xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                type="button"
              >
                {loadingAll ? (
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
            <Pill tone="indigo">Orders: {money0((orders || []).length)}</Pill>
            <Pill tone="amber">Spends (loaded): {money0((spends || []).length)}</Pill>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat tone="amber" title="Spend" value={`₹ ${money0(overall.spendTotal)}`} sub={source ? `Source: ${source}` : "All sources"} />
          <Stat tone="indigo" title="Revenue (All)" value={`₹ ${money0(overall.revenueAll)}`} sub={`ROAS: ${pct2(overall.roasAll)}x`} />
          <Stat
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
              <div className="text-xs text-gray-500">Latest dates first • IST grouping</div>
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
                      No data found.
                    </td>
                  </tr>
                ) : (
                  dayWise.map((r) => (
                    <tr key={r.ymd} className="text-sm">
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">{prettyDate(r.ymd)}</div>
                        <div className="text-xs text-gray-500">{r.ymd}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-black">₹ {money0(r.spend)}</td>
                      <td className="px-6 py-4">₹ {money0(r.revenueAll)}</td>
                      <td className="px-6 py-4">
                        <Pill tone={r.roasAll >= 2 ? "emerald" : r.roasAll >= 1 ? "amber" : "rose"}>{pct2(r.roasAll)}x</Pill>
                      </td>
                      <td className="px-6 py-4">₹ {money0(r.revenueNoCancel)}</td>
                      <td className="px-6 py-4">
                        <Pill tone={r.roasNoCancel >= 2 ? "emerald" : r.roasNoCancel >= 1 ? "amber" : "rose"}>
                          {pct2(r.roasNoCancel)}x
                        </Pill>
                      </td>
                      <td className="px-6 py-4">
                        {money0(r.ordersAll)} <span className="text-xs text-gray-500">(No-cancel: {money0(r.ordersNoCancel)})</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div ref={sentinelRef} className="h-10" />
            {spendsHasMore ? (
              <div className="px-6 pb-6 text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more spends…
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <MarketingSpendModal
        open={showSpendModal}
        onClose={() => setShowSpendModal(false)}
        onSaved={() => {
          setShowSpendModal(false);
          load({ from, to, source });
        }}
      />
    </>
  );
}