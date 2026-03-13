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

const clampRange = (from, to) => {
  const f = safe(from).trim();
  const t = safe(to).trim();
  if (!f || !t) return { from: f, to: t };
  return f > t ? { from: t, to: f } : { from: f, to: t };
};

const isWithinRangeYMD = (ymd, from, to) => {
  if (!ymd) return false;
  const f = safe(from).trim();
  const t = safe(to).trim();

  if (f && t) return ymd >= f && ymd <= t;
  if (f) return ymd >= f;
  if (t) return ymd <= t;
  return true;
};

/* ================= business rules ================= */
const getOrderDateYMD = (o) =>
  ymdInIST(o?.placedAt || o?.createdAt || o?.orderDate || o?.paidAt);

const getOrderRevenue = (o) => {
  const candidates = [
    o?.finalPayable,
    o?.pricing?.finalPayable,
    o?.coupon?.finalTotal,
    o?.amountPaid,
    o?.payableAmount,
    o?.netAmount,
    o?.pricing?.payable,
    o?.pricing?.grandTotal,
    o?.grandTotal,
    o?.total,
    o?.totalAmount,
  ];

  const val = candidates.find((x) => Number.isFinite(Number(x)));
  return Number(val || 0);
};

const isExcludedOrder = (o) => {
  const values = [
    o?.fulfillmentStatus,
    o?.paymentStatus,
    o?.status,
    o?.shipment?.status,
  ]
    .map((v) => String(v || "").trim().toLowerCase())
    .filter(Boolean);

  return values.some(
    (v) => v === "cancelled" || v === "canceled" || v === "failed"
  );
};

const getSpendDateYMD = (s) =>
  ymdInIST(s?.spentAt || s?.date || s?.createdAt || s?.updatedAt);

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
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        toneMap[tone] || toneMap.slate
      }`}
    >
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
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
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
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    fetchAllOrders,
    fetchNextOrdersPage,
  } = useOrderStore();

  const {
    spends,
    loading: spendsLoading,
    error: spendsError,
    hasMore: spendsHasMore,
    fetchSpends,
    fetchMoreSpends,
  } = useAdminMarketingSpendStore();

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
          ...(range.from || range.to ? { from: range.from, to: range.to } : {}),
          ...(cleanSource ? { source: cleanSource } : {}),
        };

        const orderFilters = {
          page: 1,
          limit: 500,
          ...(range.from || range.to ? { from: range.from, to: range.to } : {}),
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /* ================= exact filtered data for UI ================= */
  const filteredOrders = useMemo(() => {
    const range = clampRange(from, to);
    return (Array.isArray(orders) ? orders : []).filter((o) => {
      const ymd = getOrderDateYMD(o);
      return isWithinRangeYMD(ymd, range.from, range.to);
    });
  }, [orders, from, to]);

  const filteredSpends = useMemo(() => {
    const range = clampRange(from, to);
    const cleanSource = safe(source).trim().toLowerCase();

    return (Array.isArray(spends) ? spends : []).filter((s) => {
      const ymd = getSpendDateYMD(s);
      const sourceOk = cleanSource
        ? String(s?.source || "").trim().toLowerCase() === cleanSource
        : true;

      return isWithinRangeYMD(ymd, range.from, range.to) && sourceOk;
    });
  }, [spends, from, to, source]);

  const overall = useMemo(() => {
    const oList = filteredOrders;
    const sList = filteredSpends;

    const spendTotal = sList.reduce((sum, s) => sum + getSpendAmount(s), 0);

    let revenueAll = 0;
    let revenueValid = 0;
    let ordersAll = 0;
    let ordersValid = 0;

    for (const o of oList) {
      const rev = getOrderRevenue(o);
      revenueAll += rev;
      ordersAll += 1;

      if (!isExcludedOrder(o)) {
        revenueValid += rev;
        ordersValid += 1;
      }
    }

    return {
      spendTotal,
      revenueAll,
      revenueValid,
      ordersAll,
      ordersValid,
      roasAll: spendTotal > 0 ? revenueAll / spendTotal : 0,
      roasValid: spendTotal > 0 ? revenueValid / spendTotal : 0,
    };
  }, [filteredOrders, filteredSpends]);

  const dayWise = useMemo(() => {
    const map = new Map();

    const row = (ymd) => {
      if (!map.has(ymd)) {
        map.set(ymd, {
          ymd,
          spend: 0,
          revenueAll: 0,
          revenueValid: 0,
          ordersAll: 0,
          ordersValid: 0,
        });
      }
      return map.get(ymd);
    };

    filteredSpends.forEach((s) => {
      const ymd = getSpendDateYMD(s);
      if (ymd) {
        row(ymd).spend += getSpendAmount(s);
      }
    });

    filteredOrders.forEach((o) => {
      const ymd = getOrderDateYMD(o);
      if (!ymd) return;

      const r = row(ymd);
      const rev = getOrderRevenue(o);

      r.revenueAll += rev;
      r.ordersAll += 1;

      if (!isExcludedOrder(o)) {
        r.revenueValid += rev;
        r.ordersValid += 1;
      }
    });

    return Array.from(map.values())
      .filter((r) => isWithinRangeYMD(r.ymd, from, to))
      .sort((a, b) => (a.ymd < b.ymd ? 1 : -1))
      .map((r) => ({
        ...r,
        roasAll: r.spend > 0 ? r.revenueAll / r.spend : 0,
        roasValid: r.spend > 0 ? r.revenueValid / r.spend : 0,
      }));
  }, [filteredOrders, filteredSpends, from, to]);

  const spendDayWise = useMemo(() => {
    const map = new Map();

    filteredSpends.forEach((s) => {
      const ymd = getSpendDateYMD(s);
      if (!ymd) return;

      if (!map.has(ymd)) {
        map.set(ymd, {
          ymd,
          spend: 0,
          entries: 0,
        });
      }

      const row = map.get(ymd);
      row.spend += getSpendAmount(s);
      row.entries += 1;
    });

    return Array.from(map.values())
      .filter((r) => isWithinRangeYMD(r.ymd, from, to))
      .sort((a, b) => (a.ymd < b.ymd ? 1 : -1));
  }, [filteredSpends, from, to]);

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
        { header: "Revenue (Valid Only)", key: "revValid", width: 22 },
        { header: "Orders (All)", key: "oAll", width: 14 },
        { header: "Orders (Valid Only)", key: "oValid", width: 18 },
        { header: "ROAS (All)", key: "roasAll", width: 12 },
        { header: "ROAS (Valid Only)", key: "roasValid", width: 16 },
      ];

      ws1.addRow({
        from: range.from || "ALL",
        to: range.to || "ALL",
        source: source || "All",
        spend: overall.spendTotal,
        revAll: overall.revenueAll,
        revValid: overall.revenueValid,
        oAll: overall.ordersAll,
        oValid: overall.ordersValid,
        roasAll: overall.roasAll,
        roasValid: overall.roasValid,
      });
      ws1.getRow(1).font = { bold: true };

      const ws2 = wb.addWorksheet("ROAS Day-wise");
      ws2.columns = [
        { header: "Date (YMD)", key: "ymd", width: 14 },
        { header: "Date", key: "pretty", width: 18 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Revenue (All)", key: "revAll", width: 18 },
        { header: "Revenue (Valid Only)", key: "revValid", width: 22 },
        { header: "Orders (All)", key: "oAll", width: 14 },
        { header: "Orders (Valid Only)", key: "oValid", width: 18 },
        { header: "ROAS (All)", key: "roasAll", width: 12 },
        { header: "ROAS (Valid Only)", key: "roasValid", width: 16 },
      ];

      dayWise.forEach((r) =>
        ws2.addRow({
          ymd: r.ymd,
          pretty: prettyDate(r.ymd),
          spend: r.spend,
          revAll: r.revenueAll,
          revValid: r.revenueValid,
          oAll: r.ordersAll,
          oValid: r.ordersValid,
          roasAll: r.roasAll,
          roasValid: r.roasValid,
        })
      );

      ws2.getRow(1).font = { bold: true };
      ws2.views = [{ state: "frozen", ySplit: 1 }];

      const ws3 = wb.addWorksheet("Marketing Spend Day-wise");
      ws3.columns = [
        { header: "Date (YMD)", key: "ymd", width: 14 },
        { header: "Date", key: "pretty", width: 18 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Entries", key: "entries", width: 12 },
      ];

      spendDayWise.forEach((r) =>
        ws3.addRow({
          ymd: r.ymd,
          pretty: prettyDate(r.ymd),
          spend: r.spend,
          entries: r.entries,
        })
      );

      ws3.getRow(1).font = { bold: true };
      ws3.views = [{ state: "frozen", ySplit: 1 }];

      const buf = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buf]),
        `ROAS_${range.from || "ALL"}_to_${range.to || "ALL"}.xlsx`
      );
    } catch (e) {
      alert(e?.message || "Excel download failed");
    } finally {
      setDownloading(false);
    }
  }, [from, to, source, overall, dayWise, spendDayWise]);

  return (
    <>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow ring-1 ring-black/5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white">
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
              <PlusCircle className="h-4 w-4" />
              Add Spend
            </button>

            <button
              onClick={downloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10 disabled:opacity-60"
              type="button"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Excel
            </button>

            <button
              onClick={() => load({ from, to, source })}
              disabled={loadingAll}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10 disabled:opacity-60"
              type="button"
            >
              {loadingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-[28px] bg-white p-5 shadow ring-1 ring-black/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="mb-1 text-xs text-gray-600">From (IST)</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex-1">
              <div className="mb-1 text-xs text-gray-600">To (IST)</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex-1">
              <div className="mb-1 text-xs text-gray-600">Spend Source</div>
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
                    <Loader2 className="h-4 w-4 animate-spin" />
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
            <Pill tone="indigo">Orders in range: {money0(filteredOrders.length)}</Pill>
            <Pill tone="amber">Spends in range: {money0(filteredSpends.length)}</Pill>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat
            tone="amber"
            title="Marketing Spend"
            value={`₹ ${money0(overall.spendTotal)}`}
            sub={source ? `Source: ${source}` : "All sources"}
          />
          <Stat
            tone="indigo"
            title="Revenue (All Orders in Range)"
            value={`₹ ${money0(overall.revenueAll)}`}
            sub={`ROAS: ${pct2(overall.roasAll)}x`}
          />
          <Stat
            tone="emerald"
            title="Revenue (Excluding Failed/Cancelled)"
            value={`₹ ${money0(overall.revenueValid)}`}
            sub={`ROAS: ${pct2(overall.roasValid)}x`}
          />
        </div>

        {/* ROAS day-wise table */}
        <div className="overflow-hidden rounded-[28px] bg-white shadow ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-black/10 bg-gray-50 px-6 py-4">
            <div>
              <div className="text-sm font-semibold text-black">Day-wise ROAS</div>
              <div className="text-xs text-gray-500">
                Selected range only • IST grouping
              </div>
            </div>

            {inlineLoading ? (
              <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : null}
          </div>

          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-white">
                <tr className="border-b border-black/10 text-left text-xs text-gray-600">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Spend</th>
                  <th className="px-6 py-3 font-medium">Revenue (All)</th>
                  <th className="px-6 py-3 font-medium">ROAS (All)</th>
                  <th className="px-6 py-3 font-medium">Revenue (Valid)</th>
                  <th className="px-6 py-3 font-medium">ROAS (Valid)</th>
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
                        <div className="font-medium text-black">{prettyDate(r.ymd)}</div>
                        <div className="text-xs text-gray-500">{r.ymd}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-black">
                        ₹ {money0(r.spend)}
                      </td>
                      <td className="px-6 py-4">₹ {money0(r.revenueAll)}</td>
                      <td className="px-6 py-4">
                        <Pill tone={r.roasAll >= 2 ? "emerald" : r.roasAll >= 1 ? "amber" : "rose"}>
                          {pct2(r.roasAll)}x
                        </Pill>
                      </td>
                      <td className="px-6 py-4">₹ {money0(r.revenueValid)}</td>
                      <td className="px-6 py-4">
                        <Pill tone={r.roasValid >= 2 ? "emerald" : r.roasValid >= 1 ? "amber" : "rose"}>
                          {pct2(r.roasValid)}x
                        </Pill>
                      </td>
                      <td className="px-6 py-4">
                        {money0(r.ordersAll)}{" "}
                        <span className="text-xs text-gray-500">
                          (Valid: {money0(r.ordersValid)})
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div ref={sentinelRef} className="h-10" />
            {spendsHasMore ? (
              <div className="flex items-center gap-2 px-6 pb-6 text-xs text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
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