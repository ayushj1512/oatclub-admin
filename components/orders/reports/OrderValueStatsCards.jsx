"use client";

import React, { useMemo } from "react";

/* -------------------------
  Helpers
------------------------- */
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function kpiFormat(n) {
  const x = safeNum(n);
  if (Math.abs(x) >= 1e7) return `${(x / 1e7).toFixed(2)}Cr`;
  if (Math.abs(x) >= 1e5) return `${(x / 1e5).toFixed(2)}L`;
  if (Math.abs(x) >= 1e3) return `${(x / 1e3).toFixed(2)}K`;
  return `${Math.round(x)}`;
}

const ui = {
  wrap: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  card: (tone = "indigo") => {
    const t =
      {
        indigo: { ring: "rgba(99,102,241,0.25)", glow: "rgba(99,102,241,0.14)" },
        emerald: { ring: "rgba(16,185,129,0.25)", glow: "rgba(16,185,129,0.14)" },
        rose: { ring: "rgba(244,63,94,0.25)", glow: "rgba(244,63,94,0.14)" },
        slate: { ring: "rgba(15,23,42,0.12)", glow: "rgba(2,6,23,0.06)" },
      }[tone] || { ring: "rgba(99,102,241,0.25)", glow: "rgba(99,102,241,0.14)" };

    return {
      border: "1px solid rgba(15,23,42,0.10)",
      borderRadius: 16,
      padding: 14,
      background: `radial-gradient(800px 160px at 25% 0%, ${t.glow} 0%, rgba(255,255,255,0) 60%), rgba(255,255,255,0.92)`,
      boxShadow: `0 14px 40px rgba(2, 6, 23, 0.08), 0 0 0 1px ${t.ring} inset`,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minHeight: 120,
    };
  },
  badge: (tone = "indigo") => {
    const t =
      {
        indigo: { bg: "rgba(99,102,241,0.12)", fg: "#3730a3", br: "rgba(99,102,241,0.22)" },
        emerald: { bg: "rgba(16,185,129,0.12)", fg: "#065f46", br: "rgba(16,185,129,0.22)" },
        rose: { bg: "rgba(244,63,94,0.12)", fg: "#9f1239", br: "rgba(244,63,94,0.22)" },
        slate: { bg: "rgba(2,6,23,0.06)", fg: "#334155", br: "rgba(2,6,23,0.10)" },
      }[tone] || { bg: "rgba(99,102,241,0.12)", fg: "#3730a3", br: "rgba(99,102,241,0.22)" };

    return {
      alignSelf: "flex-start",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      background: t.bg,
      border: `1px solid ${t.br}`,
      color: t.fg,
      whiteSpace: "nowrap",
    };
  },
  label: { fontSize: 12, fontWeight: 900, color: "#475569" },
  value: { fontSize: 22, fontWeight: 950, color: "#0f172a", letterSpacing: -0.2 },
  meta: { fontSize: 12, color: "#64748b", lineHeight: 1.4 },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 8,
    background: "rgba(2,6,23,0.06)",
    border: "1px solid rgba(2,6,23,0.10)",
    color: "#0f172a",
  },
};

function pickOrderValue(order) {
  // Prefer finalPayable; fallback to totalAmount/subtotal if missing
  const fp = safeNum(order?.finalPayable);
  if (fp) return fp;
  const ta = safeNum(order?.totalAmount);
  if (ta) return ta;
  return safeNum(order?.subtotal);
}

export default function OrderValueStatsCards({
  orders = [],
  excludeCancelled = true,
  title = "Order Value Stats",
}) {
  const stats = useMemo(() => {
    let arr = Array.isArray(orders) ? orders : [];

    if (excludeCancelled) {
      arr = arr.filter((o) => String(o?.fulfillmentStatus) !== "cancelled");
    }

    // keep only orders with some numeric value
    const withValue = arr
      .map((o) => ({ o, value: pickOrderValue(o) }))
      .filter((x) => Number.isFinite(x.value) && x.value > 0);

    const totalOrders = withValue.length;

    const totalValue = withValue.reduce((s, x) => s + x.value, 0);
    const aov = totalOrders ? totalValue / totalOrders : 0;

    let highest = null;
    let lowest = null;

    for (const x of withValue) {
      if (!highest || x.value > highest.value) highest = x;
      if (!lowest || x.value < lowest.value) lowest = x;
    }

    return {
      totalOrders,
      aov,
      highest,
      lowest,
      cancelledExcludedCount: excludeCancelled
        ? (Array.isArray(orders) ? orders.filter((o) => String(o?.fulfillmentStatus) === "cancelled").length : 0)
        : 0,
    };
  }, [orders, excludeCancelled]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
        <div style={ui.meta}>
          Counting: <b style={{ color: "#0f172a" }}>{stats.totalOrders}</b> orders
          {excludeCancelled ? (
            <>
              {" "}
              • Cancelled excluded: <b style={{ color: "#0f172a" }}>{stats.cancelledExcludedCount}</b>
            </>
          ) : null}
        </div>
      </div>

      <div style={ui.wrap}>
        {/* AOV */}
        <div style={ui.card("indigo")}>
          <div style={ui.badge("indigo")}>AOV</div>
          <div style={ui.label}>Average Order Value</div>
          <div style={ui.value}>₹ {kpiFormat(stats.aov)}</div>
          <div style={ui.meta}>
            Average of <span style={ui.code}>finalPayable</span> (fallback: totalAmount/subtotal)
          </div>
        </div>

        {/* Highest */}
        <div style={ui.card("emerald")}>
          <div style={ui.badge("emerald")}>Highest</div>
          <div style={ui.label}>Highest Order Value</div>
          <div style={ui.value}>₹ {kpiFormat(stats.highest?.value || 0)}</div>
          <div style={ui.meta}>
            Order: <span style={ui.code}>{stats.highest?.o?.orderNumber || "NA"}</span>
            <br />
            Payment: <span style={ui.code}>{stats.highest?.o?.paymentMethod || "NA"}</span> •{" "}
            <span style={ui.code}>{stats.highest?.o?.paymentStatus || "NA"}</span>
          </div>
        </div>

        {/* Lowest */}
        <div style={ui.card("rose")}>
          <div style={ui.badge("rose")}>Lowest</div>
          <div style={ui.label}>Lowest Order Value</div>
          <div style={ui.value}>₹ {kpiFormat(stats.lowest?.value || 0)}</div>
          <div style={ui.meta}>
            Order: <span style={ui.code}>{stats.lowest?.o?.orderNumber || "NA"}</span>
            <br />
            Fulfillment: <span style={ui.code}>{stats.lowest?.o?.fulfillmentStatus || "NA"}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
