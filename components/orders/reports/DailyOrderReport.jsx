// components/orders/reports/DailyOrderReport.jsx
"use client";

import React, { useMemo, useState } from "react";

/* -------------------------
  Helpers
------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const clampPct = (n) => (isFinite(n) ? n : 0);
const pctChange = (current, prev) => {
  const c = Number(current || 0);
  const p = Number(prev || 0);
  if (p === 0) return c === 0 ? 0 : 100;
  return clampPct(((c - p) / p) * 100);
};

const formatINR = (n) => {
  const x = Number(n || 0);
  try {
    return x.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(x).toLocaleString("en-IN")}`;
  }
};

/**
 * Try to find "order value" from common fields.
 * Customize if your backend uses a specific key.
 */
const getOrderValue = (o) => {
  const direct =
    o?.totalAmount ??
    o?.orderTotal ??
    o?.grandTotal ??
    o?.payableAmount ??
    o?.amount ??
    o?.total ??
    o?.finalAmount;

  if (typeof direct === "number") return direct;

  const items = o?.items || o?.orderItems || [];
  if (Array.isArray(items) && items.length) {
    const sum = items.reduce((acc, it) => {
      const price = Number(it?.price ?? it?.sellingPrice ?? it?.salePrice ?? it?.mrp ?? 0);
      const qty = Number(it?.qty ?? it?.quantity ?? 1);
      return acc + price * qty;
    }, 0);

    const shipping = Number(o?.shippingFee ?? o?.shipping ?? 0);
    const discount = Number(o?.discount ?? o?.couponDiscount ?? 0);

    return Math.max(0, sum + shipping - discount);
  }

  return 0;
};

const safeStatus = (o) => String(o?.fulfillmentStatus || o?.status || "").toLowerCase();

const downloadCSV = (rows, filename = "daily_orders_report.csv") => {
  if (!rows?.length) return;

  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const header = Object.keys(rows[0]);
  const lines = [header.join(","), ...rows.map((r) => header.map((k) => escape(r[k])).join(","))];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* -------------------------
  Component
------------------------- */
export default function DailyOrderReport({
  orders = [],
  excludeStatuses = ["cancelled", "rto"],
  initialDays = 7, // default only 7 days visible
  stepDays = 7, // load more by 7 days
}) {
  const [showDays, setShowDays] = useState(initialDays);

  const data = useMemo(() => {
    const ex = new Set((excludeStatuses || []).map((x) => String(x).toLowerCase()));

    // Filter: valid date + exclude cancelled/rto
    const clean = (orders || []).filter((o) => {
      const d = parseDate(o?.orderDate);
      if (!d) return false;
      if (ex.has(safeStatus(o))) return false;
      return true;
    });

    // Daily aggregation
    const map = new Map(); // date -> { date, ordersCount, revenue }
    for (const o of clean) {
      const d = parseDate(o?.orderDate);
      const key = toYMD(d);
      const value = getOrderValue(o);

      const prev = map.get(key) || { date: key, ordersCount: 0, revenue: 0 };
      prev.ordersCount += 1;
      prev.revenue += Number(value || 0);
      map.set(key, prev);
    }

    // ✅ DESC sort (latest first)
    const rows = Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));

    // KPIs: today = rows[0], yesterday = rows[1]
    const todayRow = rows[0] || null;
    const ydayRow = rows[1] || null;

    const sum = (arr, k) => (arr || []).reduce((acc, x) => acc + Number(x?.[k] || 0), 0);

    const last7 = rows.slice(0, 7);
    const prev7 = rows.slice(7, 14);

    const totalOrders = sum(rows, "ordersCount");
    const totalRevenue = sum(rows, "revenue");
    const overallAOV = totalOrders ? totalRevenue / totalOrders : 0;

    const bestDay = rows.reduce((best, r) => (!best || r.revenue > best.revenue ? r : best), null);

    // export ASC for readability
    const csvRows = rows
      .slice()
      .reverse()
      .map((r) => ({
        date: r.date,
        orders: r.ordersCount,
        revenue: Math.round(r.revenue),
        aov: Math.round(r.ordersCount ? r.revenue / r.ordersCount : 0),
      }));

    return {
      rows,
      csvRows,
      totalOrders,
      totalRevenue,
      overallAOV,
      bestDay,
      growth: {
        d1_orders: pctChange(todayRow?.ordersCount || 0, ydayRow?.ordersCount || 0),
        d1_revenue: pctChange(todayRow?.revenue || 0, ydayRow?.revenue || 0),
        w1_orders: pctChange(sum(last7, "ordersCount"), sum(prev7, "ordersCount")),
        w1_revenue: pctChange(sum(last7, "revenue"), sum(prev7, "revenue")),
      },
    };
  }, [orders, excludeStatuses]);

  const tableRows = useMemo(() => data.rows.slice(0, showDays), [data.rows, showDays]);
  const maxRevenueInTable = useMemo(
    () => tableRows.reduce((m, r) => Math.max(m, Number(r.revenue || 0)), 0),
    [tableRows]
  );

  const canLoadMore = showDays < data.rows.length;

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.title}>Daily Orders Report</div>
          <div style={styles.subTitle}>
            Latest first (DESC) • Showing <b>{Math.min(showDays, data.rows.length)}</b> / <b>{data.rows.length}</b> days •
            Excluding: <b>{excludeStatuses.join(", ")}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            style={styles.btn}
            onClick={() => downloadCSV(data.csvRows, `daily_orders_${Date.now()}.csv`)}
            disabled={!data.csvRows?.length}
          >
            Export CSV
          </button>

          {canLoadMore ? (
            <button style={styles.btn} onClick={() => setShowDays((x) => x + stepDays)}>
              Load more (+{stepDays}d)
            </button>
          ) : (
            <button style={{ ...styles.btn, ...styles.btnDisabled }} disabled>
              All loaded
            </button>
          )}

          {showDays > initialDays ? (
            <button style={styles.btn} onClick={() => setShowDays(initialDays)}>
              Show 7d
            </button>
          ) : null}
        </div>
      </div>

      {/* KPI cards */}
      <div style={styles.kpiGrid}>
        <Kpi
          label="Total Orders (range)"
          value={data.totalOrders.toLocaleString("en-IN")}
          hint={`Overall AOV: ${formatINR(data.overallAOV)}`}
        />
        <Kpi
          label="Total Revenue (range)"
          value={formatINR(data.totalRevenue)}
          hint={data.bestDay ? `Best day: ${data.bestDay.date} • ${formatINR(data.bestDay.revenue)}` : "—"}
        />
        <Kpi
          label="Today vs Yesterday"
          value={`${data.growth.d1_orders.toFixed(1)}% orders`}
          hint={`${data.growth.d1_revenue.toFixed(1)}% revenue`}
          tone={toneFromPct(data.growth.d1_revenue)}
        />
        <Kpi
          label="Last 7d vs Prev 7d"
          value={`${data.growth.w1_orders.toFixed(1)}% orders`}
          hint={`${data.growth.w1_revenue.toFixed(1)}% revenue`}
          tone={toneFromPct(data.growth.w1_revenue)}
        />
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <div style={styles.tableHeadRow}>
          <div style={{ ...styles.th, width: 120 }}>Date</div>
          <div style={{ ...styles.th, width: 90 }}>Orders</div>
          <div style={{ ...styles.th, width: 160 }}>Revenue</div>
          <div style={{ ...styles.th, width: 120 }}>AOV</div>
          <div style={{ ...styles.th, flex: 1 }}>Revenue Trend</div>
        </div>

        {tableRows.map((r) => {
          const w = maxRevenueInTable ? Math.max(2, Math.round((r.revenue / maxRevenueInTable) * 100)) : 0;
          const aov = r.ordersCount ? r.revenue / r.ordersCount : 0;

          return (
            <div key={r.date} style={styles.tr}>
              <div style={{ ...styles.td, width: 120, fontWeight: 800 }}>{r.date}</div>
              <div style={{ ...styles.td, width: 90 }}>{r.ordersCount}</div>
              <div style={{ ...styles.td, width: 160, fontWeight: 800 }}>{formatINR(r.revenue)}</div>
              <div style={{ ...styles.td, width: 120 }}>{formatINR(aov)}</div>

              <div style={{ ...styles.td, flex: 1 }}>
                <div style={styles.barBg}>
                  <div style={{ ...styles.barFill, width: `${w}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        {!tableRows.length ? <div style={styles.empty}>No data found (after excluding cancelled/rto).</div> : null}
      </div>

      <div style={styles.note}>
        Default view = <b>latest 7 days</b>. “Load more” se +7 days add hote jayenge. Sort is <b>DESC</b> (latest at top).
      </div>
    </div>
  );
}

/* -------------------------
  Small UI pieces
------------------------- */
function toneFromPct(pct) {
  if (pct > 0.5) return "good";
  if (pct < -0.5) return "bad";
  return "neutral";
}

function Kpi({ label, value, hint, tone = "neutral" }) {
  const toneStyle = tone === "good" ? styles.kpiGood : tone === "bad" ? styles.kpiBad : styles.kpiNeutral;

  return (
    <div style={{ ...styles.kpiCard, ...toneStyle }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiHint}>{hint}</div>
    </div>
  );
}

/* -------------------------
  Styles
------------------------- */
const styles = {
  card: { marginTop: 12, border: "1px solid rgba(15,23,42,0.10)", borderRadius: 12, background: "#fff", padding: 12 },
  headerRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 },
  title: { fontSize: 16, fontWeight: 900, color: "#0f172a" },
  subTitle: { marginTop: 4, fontSize: 12, color: "#64748b" },
  btn: { border: "1px solid rgba(15,23,42,0.12)", background: "#ffffff", color: "#0f172a", padding: "10px 12px", borderRadius: 10, fontWeight: 800, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 8, marginBottom: 12 },
  kpiCard: { border: "1px solid rgba(15,23,42,0.10)", borderRadius: 12, padding: 10, background: "#fff" },
  kpiLabel: { fontSize: 12, fontWeight: 900, color: "#334155" },
  kpiValue: { marginTop: 6, fontSize: 18, fontWeight: 900, color: "#0f172a" },
  kpiHint: { marginTop: 4, fontSize: 12, color: "#64748b" },
  kpiGood: { boxShadow: "0 0 0 2px rgba(16,185,129,0.10) inset" },
  kpiBad: { boxShadow: "0 0 0 2px rgba(239,68,68,0.10) inset" },
  kpiNeutral: { boxShadow: "0 0 0 2px rgba(148,163,184,0.10) inset" },

  tableWrap: { border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, overflow: "hidden" },
  tableHeadRow: { display: "flex", gap: 10, padding: "10px 10px", background: "#f8fafc", borderBottom: "1px solid rgba(15,23,42,0.08)" },
  th: { fontSize: 12, fontWeight: 900, color: "#334155" },
  tr: { display: "flex", gap: 10, padding: "10px 10px", borderBottom: "1px solid rgba(15,23,42,0.06)", alignItems: "center" },
  td: { fontSize: 12, color: "#0f172a" },
  barBg: { height: 10, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden" },
  barFill: { height: 10, borderRadius: 999, background: "rgba(15,23,42,0.55)" },
  empty: { padding: 12, fontSize: 12, color: "#64748b" },
  note: { marginTop: 10, fontSize: 12, color: "#64748b" },
};
