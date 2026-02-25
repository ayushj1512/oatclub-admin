// components/marketing/ROASreport.jsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, TrendingUp, Download } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { useAdminMarketingSpendStore } from "@/store/adminMarketingSpendStore";

// ✅ Excel export (already used in your project)
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* ---------------- helpers ---------------- */
const safe = (v) => (v == null ? "" : String(v));

const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const money = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const startOfMonthYMD = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return toYMD(d);
};

const todayYMD = () => toYMD(new Date());

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

/* ---------------- revenue & status rules ---------------- */
const getOrderDateYMD = (o) =>
  toYMD(o?.placedAt || o?.createdAt || o?.orderDate || o?.paidAt);

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

const getSpendDateYMD = (s) => toYMD(s?.spentAt || s?.createdAt);

/* ---------------- UI bits ---------------- */
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
};

const Card = ({ title, value, sub, tone = "slate" }) => {
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

  const loading = ordersLoading || spendsLoading;

  const load = useCallback(async () => {
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

    await Promise.allSettled([fetchSpends(spendFilters), fetchAllOrders(orderFilters)]);

    // ✅ fetch remaining pages if meta.hasMore exists
    let guard = 0;
    while (guard < 60) {
      guard += 1;

      const meta = ordersMeta || null;
      if (!meta) break;

      const hasMore = meta?.hasMore === true;
      if (meta?.hasMore != null && !hasMore) break;

      if (hasMore) {
        const next = await fetchNextOrdersPage({
          ...orderFilters,
          from: cleanFrom,
          to: cleanTo,
          limit: Number(meta?.limit || orderFilters.limit || 500),
        });

        if (!Array.isArray(next) || next.length === 0) break;
        continue;
      }

      break;
    }
  }, [from, to, source, fetchAllOrders, fetchNextOrdersPage, fetchSpends, ordersMeta]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, source]);

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

    const roasAll = spendTotal > 0 ? revenueAll / spendTotal : 0;
    const roasNoCancel = spendTotal > 0 ? revenueNoCancel / spendTotal : 0;

    return {
      spendTotal,
      revenueAll,
      revenueNoCancel,
      ordersAll,
      ordersNoCancel,
      roasAll,
      roasNoCancel,
    };
  }, [orders, spends]);

  /* ---------------- day-wise table ---------------- */
  const dayWise = useMemo(() => {
    const oList = Array.isArray(orders) ? orders : [];
    const sList = Array.isArray(spends) ? spends : [];

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

    for (const s of sList) {
      const ymd = getSpendDateYMD(s);
      if (!ymd) continue;
      const r = getRow(ymd);
      r.spend += Number(s?.amount || 0);
    }

    for (const o of oList) {
      const ymd = getOrderDateYMD(o);
      if (!ymd) continue;
      const r = getRow(ymd);
      const rev = getOrderRevenue(o);

      r.revenueAll += rev;
      r.ordersAll += 1;

      if (!isCancelledOrder(o)) {
        r.revenueNoCancel += rev;
        r.ordersNoCancel += 1;
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => (a.ymd < b.ymd ? 1 : -1));

    return rows.map((r) => ({
      ...r,
      roasAll: r.spend > 0 ? r.revenueAll / r.spend : 0,
      roasNoCancel: r.spend > 0 ? r.revenueNoCancel / r.spend : 0,
    }));
  }, [orders, spends]);

  const roasTone = (v) => {
    if (!Number.isFinite(v) || v <= 0) return "slate";
    if (v >= 5) return "emerald";
    if (v >= 3) return "indigo";
    if (v >= 2) return "amber";
    return "rose";
  };

  /* ---------------- Excel Download ---------------- */
  const downloadExcel = useCallback(async () => {
    try {
      setDownloading(true);

      const wb = new ExcelJS.Workbook();
      wb.creator = "Miray Admin";

      // Sheet 1: Summary
      const ws1 = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });

      ws1.columns = [
        { header: "From", key: "from", width: 14 },
        { header: "To", key: "to", width: 14 },
        { header: "Source", key: "source", width: 20 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Revenue (With cancellations)", key: "revAll", width: 26 },
        { header: "Revenue (Without cancellations)", key: "revNo", width: 28 },
        { header: "ROAS (With cancellations)", key: "roasAll", width: 22 },
        { header: "ROAS (Without cancellations)", key: "roasNo", width: 26 },
        { header: "Orders (All)", key: "ordersAll", width: 14 },
        { header: "Orders (Without cancellations)", key: "ordersNo", width: 26 },
      ];

      ws1.addRow({
        from,
        to,
        source: source || "All",
        spend: Number(overall.spendTotal || 0),
        revAll: Number(overall.revenueAll || 0),
        revNo: Number(overall.revenueNoCancel || 0),
        roasAll: overall.spendTotal > 0 ? Number(overall.roasAll.toFixed(4)) : 0,
        roasNo: overall.spendTotal > 0 ? Number(overall.roasNoCancel.toFixed(4)) : 0,
        ordersAll: Number(overall.ordersAll || 0),
        ordersNo: Number(overall.ordersNoCancel || 0),
      });

      // style header
      ws1.getRow(1).font = { bold: true };
      ws1.getRow(1).alignment = { vertical: "middle" };
      ws1.getRow(1).height = 20;

      // number formats
      const moneyCols = ["D", "E", "F"];
      moneyCols.forEach((col) => {
        ws1.getColumn(col).numFmt = "₹#,##0";
      });
      ws1.getColumn("G").numFmt = "0.00";
      ws1.getColumn("H").numFmt = "0.00";

      // Sheet 2: Day-wise
      const ws2 = wb.addWorksheet("Day-wise ROAS", { views: [{ state: "frozen", ySplit: 1 }] });
      ws2.columns = [
        { header: "Date (YMD)", key: "ymd", width: 14 },
        { header: "Date", key: "pretty", width: 18 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Revenue (With cancellations)", key: "revAll", width: 26 },
        { header: "Revenue (Without cancellations)", key: "revNo", width: 28 },
        { header: "ROAS (With cancellations)", key: "roasAll", width: 22 },
        { header: "ROAS (Without cancellations)", key: "roasNo", width: 26 },
        { header: "Orders (All)", key: "ordersAll", width: 14 },
        { header: "Orders (Without cancellations)", key: "ordersNo", width: 26 },
      ];

      dayWise.forEach((r) => {
        ws2.addRow({
          ymd: r.ymd,
          pretty: prettyDate(r.ymd),
          spend: Number(r.spend || 0),
          revAll: Number(r.revenueAll || 0),
          revNo: Number(r.revenueNoCancel || 0),
          roasAll: r.spend > 0 ? Number(r.roasAll.toFixed(4)) : 0,
          roasNo: r.spend > 0 ? Number(r.roasNoCancel.toFixed(4)) : 0,
          ordersAll: Number(r.ordersAll || 0),
          ordersNo: Number(r.ordersNoCancel || 0),
        });
      });

      ws2.getRow(1).font = { bold: true };
      ws2.getRow(1).height = 20;

      ["C", "D", "E"].forEach((col) => (ws2.getColumn(col).numFmt = "₹#,##0"));
      ws2.getColumn("F").numFmt = "0.00";
      ws2.getColumn("G").numFmt = "0.00";

      // Sheet 3: Raw spends (optional but useful)
      const ws3 = wb.addWorksheet("Spends (Raw)", { views: [{ state: "frozen", ySplit: 1 }] });
      ws3.columns = [
        { header: "Date (YMD)", key: "ymd", width: 14 },
        { header: "Source", key: "source", width: 22 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "Notes", key: "notes", width: 38 },
        { header: "Id", key: "id", width: 26 },
      ];

      (spends || []).forEach((s) => {
        ws3.addRow({
          ymd: getSpendDateYMD(s),
          source: safe(s?.source),
          amount: Number(s?.amount || 0),
          currency: safe(s?.currency || "INR"),
          notes: safe(s?.notes),
          id: safe(s?._id),
        });
      });

      ws3.getRow(1).font = { bold: true };
      ws3.getColumn("C").numFmt = "₹#,##0";

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const name = `ROAS_${from}_to_${to}${source ? `_${source}` : ""}.xlsx`;
      saveAs(blob, name);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Excel download failed");
    } finally {
      setDownloading(false);
    }
  }, [dayWise, from, to, source, overall, spends]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="rounded-[28px] bg-white shadow-[0_16px_55px_rgba(0,0,0,0.07)] ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-white border-b border-black/5 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <div className="text-lg font-semibold text-black">ROAS Report</div>
              <div className="text-xs text-gray-500 mt-1">
                {from} → {to} {source ? `• ${source}` : "• All sources"}
              </div>

              <div className="text-[11px] text-gray-500 mt-2 flex flex-wrap gap-2">
                <Pill tone="indigo">ROAS (With cancellations)</Pill>
                <Pill tone="emerald">ROAS (Without cancellations)</Pill>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadExcel}
              disabled={downloading || loading}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white ring-1 ring-black/10 hover:ring-black/20 hover:bg-gray-50 transition disabled:opacity-60"
              title="Download Excel"
            >
              <Download className={`w-4 h-4 ${downloading ? "animate-pulse" : ""}`} />
              <span className="text-sm text-black">
                {downloading ? "Preparing…" : "Excel"}
              </span>
            </button>

            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white ring-1 ring-black/10 hover:ring-black/20 hover:bg-gray-50 transition disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="text-sm text-black">Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-gray-50/70 ring-1 ring-black/5 px-4 py-3">
              <div className="text-[11px] text-gray-500 mb-1">From</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-transparent text-sm text-black outline-none"
              />
            </div>

            <div className="rounded-2xl bg-gray-50/70 ring-1 ring-black/5 px-4 py-3">
              <div className="text-[11px] text-gray-500 mb-1">To</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-transparent text-sm text-black outline-none"
              />
            </div>

            <div className="rounded-2xl bg-gray-50/70 ring-1 ring-black/5 px-4 py-3 md:col-span-2">
              <div className="text-[11px] text-gray-500 mb-1">Source</div>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-transparent text-sm text-black outline-none"
              >
                <option value="">All sources</option>
                {sources
                  .filter((x) => x)
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {(ordersError || spendsError) && (
            <div className="mt-4 rounded-2xl bg-white ring-1 ring-red-200 px-4 py-3">
              <div className="text-sm text-red-700 font-medium">Error</div>
              <div className="text-xs text-red-600 mt-1">
                {ordersError ? `Orders: ${ordersError}` : null}
                {ordersError && spendsError ? " • " : null}
                {spendsError ? `Spends: ${spendsError}` : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card
          title="Revenue (With cancellations)"
          value={`₹${money(overall.revenueAll)}`}
          sub="All orders included"
          tone="slate"
        />
        <Card
          title="Revenue (Without cancellations)"
          value={`₹${money(overall.revenueNoCancel)}`}
          sub="Cancelled excluded"
          tone="emerald"
        />
        <Card
          title="Spend"
          value={`₹${money(overall.spendTotal)}`}
          sub="Marketing spend"
          tone="indigo"
        />
        <Card
          title="ROAS (With cancellations)"
          value={overall.spendTotal > 0 ? overall.roasAll.toFixed(2) : "—"}
          sub="Revenue(all) ÷ Spend"
          tone="amber"
        />
        <Card
          title="ROAS (Without cancellations)"
          value={overall.spendTotal > 0 ? overall.roasNoCancel.toFixed(2) : "—"}
          sub="Revenue(no cancel) ÷ Spend"
          tone="emerald"
        />
        <Card
          title="Orders Count (All / Without cancellations)"
          value={`${money(overall.ordersAll)} / ${money(overall.ordersNoCancel)}`}
          sub="Two counts"
          tone="slate"
        />
      </div>

      {/* Day-wise Table */}
      <div className="mt-5 rounded-3xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-white border-b border-black/5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-black">Day-wise ROAS</div>
            <div className="text-xs text-gray-500 mt-1">
              ROAS columns (with + without cancellations)
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {loading ? "Loading…" : `${money(dayWise.length)} days`}
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : dayWise.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No data for selected range.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-black/5">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
                  <th className="px-6 py-3 font-semibold text-indigo-700 text-right">Spend</th>
                  <th className="px-6 py-3 font-semibold text-slate-700 text-right">
                    Revenue (With cancellations)
                  </th>
                  <th className="px-6 py-3 font-semibold text-emerald-700 text-right">
                    Revenue (Without cancellations)
                  </th>
                  <th className="px-6 py-3 font-semibold text-amber-800 text-right">
                    ROAS (With cancellations)
                  </th>
                  <th className="px-6 py-3 font-semibold text-emerald-700 text-right">
                    ROAS (Without cancellations)
                  </th>
                  <th className="px-6 py-3 font-semibold text-slate-700 text-right">
                    Orders Count (All / Without cancellations)
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {dayWise.map((r) => {
                  const t1 = roasTone(r.roasAll);
                  const t2 = roasTone(r.roasNoCancel);

                  return (
                    <tr key={r.ymd} className="hover:bg-gray-50/70 transition">
                      <td className="px-6 py-3">
                        <div className="font-medium text-black">{prettyDate(r.ymd)}</div>
                        <div className="text-xs text-gray-500">{r.ymd}</div>
                      </td>

                      <td className="px-6 py-3 text-right">
                        <div className="font-semibold text-indigo-700">₹{money(r.spend)}</div>
                      </td>

                      <td className="px-6 py-3 text-right">
                        <div className="text-slate-800">₹{money(r.revenueAll)}</div>
                      </td>

                      <td className="px-6 py-3 text-right">
                        <div className="text-emerald-800">₹{money(r.revenueNoCancel)}</div>
                      </td>

                      <td className="px-6 py-3 text-right">
                        <Pill tone={t1}>{r.spend > 0 ? r.roasAll.toFixed(2) : "—"}</Pill>
                      </td>

                      <td className="px-6 py-3 text-right">
                        <Pill tone={t2}>{r.spend > 0 ? r.roasNoCancel.toFixed(2) : "—"}</Pill>
                      </td>

                      <td className="px-6 py-3 text-right">
                        <div className="text-slate-800">
                          {money(r.ordersAll)} / {money(r.ordersNoCancel)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-[12px] text-gray-500">
        Excel includes: Summary + Day-wise + Raw spends. If you also want “Raw orders” sheet, bol do — add kar dunga.
      </div>
    </div>
  );
}