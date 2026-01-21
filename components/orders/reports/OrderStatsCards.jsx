"use client";

import React, { useMemo } from "react";

/* -------------------------
  Helpers
------------------------- */
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

function kpiFormat(n) {
  const x = safeNum(n);
  if (Math.abs(x) >= 1e7) return `${(x / 1e7).toFixed(2)}Cr`;
  if (Math.abs(x) >= 1e5) return `${(x / 1e5).toFixed(2)}L`;
  if (Math.abs(x) >= 1e3) return `${(x / 1e3).toFixed(2)}K`;
  return `${Math.round(x)}`;
}

/* -------------------------
  UI Styles
------------------------- */
const ui = {
  wrap: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 10,
  },
  card: (tone = "indigo") => {
    const tones = {
      indigo: { ring: "rgba(99,102,241,0.25)", glow: "rgba(99,102,241,0.14)", badgeBg: "rgba(99,102,241,0.12)", badgeFg: "#3730a3", badgeBr: "rgba(99,102,241,0.22)" },
      emerald: { ring: "rgba(16,185,129,0.25)", glow: "rgba(16,185,129,0.14)", badgeBg: "rgba(16,185,129,0.12)", badgeFg: "#065f46", badgeBr: "rgba(16,185,129,0.22)" },
      amber: { ring: "rgba(245,158,11,0.25)", glow: "rgba(245,158,11,0.14)", badgeBg: "rgba(245,158,11,0.12)", badgeFg: "#92400e", badgeBr: "rgba(245,158,11,0.22)" },
      rose: { ring: "rgba(244,63,94,0.25)", glow: "rgba(244,63,94,0.14)", badgeBg: "rgba(244,63,94,0.12)", badgeFg: "#9f1239", badgeBr: "rgba(244,63,94,0.22)" },
      sky: { ring: "rgba(14,165,233,0.25)", glow: "rgba(14,165,233,0.14)", badgeBg: "rgba(14,165,233,0.12)", badgeFg: "#075985", badgeBr: "rgba(14,165,233,0.22)" },
      slate: { ring: "rgba(15,23,42,0.12)", glow: "rgba(2,6,23,0.06)", badgeBg: "rgba(2,6,23,0.06)", badgeFg: "#334155", badgeBr: "rgba(2,6,23,0.10)" },
    };
    const t = tones[tone] || tones.indigo;

    return {
      border: "1px solid rgba(15,23,42,0.10)",
      borderRadius: 16,
      padding: 12,
      minHeight: 92,
      background: `radial-gradient(800px 140px at 20% 0%, ${t.glow} 0%, rgba(255,255,255,0) 60%), rgba(255,255,255,0.92)`,
      boxShadow: `0 14px 40px rgba(2, 6, 23, 0.08), 0 0 0 1px ${t.ring} inset`,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    };
  },
  label: { fontSize: 12, fontWeight: 900, color: "#475569" },
  value: { fontSize: 20, fontWeight: 950, color: "#0f172a", letterSpacing: -0.2 },
  sub: { fontSize: 12, color: "#64748b" },
  badge: (tone = "indigo") => {
    const tones = {
      indigo: { bg: "rgba(99,102,241,0.12)", fg: "#3730a3", br: "rgba(99,102,241,0.22)" },
      emerald: { bg: "rgba(16,185,129,0.12)", fg: "#065f46", br: "rgba(16,185,129,0.22)" },
      amber: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", br: "rgba(245,158,11,0.22)" },
      rose: { bg: "rgba(244,63,94,0.12)", fg: "#9f1239", br: "rgba(244,63,94,0.22)" },
      sky: { bg: "rgba(14,165,233,0.12)", fg: "#075985", br: "rgba(14,165,233,0.22)" },
      slate: { bg: "rgba(2,6,23,0.06)", fg: "#334155", br: "rgba(2,6,23,0.10)" },
    };
    const t = tones[tone] || tones.indigo;
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
  note: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748b",
  },
};

export default function OrderStatsCards({ orders = [] }) {
  const stats = useMemo(() => {
    const nonCancelled = (orders || []).filter((o) => String(o?.fulfillmentStatus) !== "cancelled");

    const totalOrders = nonCancelled.length;

    const paidOrders = nonCancelled.filter((o) => o?.paymentStatus === "paid").length;
    const codOrders = nonCancelled.filter((o) => o?.paymentMethod === "cod").length;
    const onlineOrders = nonCancelled.filter((o) => o?.paymentMethod === "razorpay").length;

    const deliveredOrders = nonCancelled.filter((o) => o?.fulfillmentStatus === "delivered").length;
    const rtoOrders = nonCancelled.filter((o) => o?.fulfillmentStatus === "rto").length;
    const returnedOrders = nonCancelled.filter((o) => o?.fulfillmentStatus === "returned").length;

    // ✅ Revenue excluding cancelled orders
    const revenue = sum(nonCancelled.map((o) => safeNum(o?.finalPayable)));

    // Optional: exclude cancelled AND refunded? (not requested, so keep as-is)
    const paidRate = totalOrders ? (paidOrders / totalOrders) * 100 : 0;
    const deliveryRate = totalOrders ? (deliveredOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      paidOrders,
      codOrders,
      onlineOrders,
      deliveredOrders,
      rtoOrders,
      returnedOrders,
      revenue,
      paidRate,
      deliveryRate,
      cancelledExcluded: (orders || []).filter((o) => String(o?.fulfillmentStatus) === "cancelled").length,
    };
  }, [orders]);

  const cards = [
    { label: "Orders (excl. cancelled)", value: stats.totalOrders, tone: "indigo", badge: "Total" },
    { label: "Revenue (excl. cancelled)", value: `₹ ${kpiFormat(stats.revenue)}`, tone: "emerald", badge: "₹" },
    { label: "Paid Orders", value: stats.paidOrders, tone: "emerald", badge: "Paid" },
    { label: "COD Orders", value: stats.codOrders, tone: "amber", badge: "COD" },
    { label: "Online (Razorpay)", value: stats.onlineOrders, tone: "sky", badge: "Online" },
    { label: "Paid Rate", value: `${stats.paidRate.toFixed(1)}%`, tone: "amber", badge: "%" },
    { label: "Delivered", value: stats.deliveredOrders, tone: "emerald", badge: "Delivered" },
    { label: "Delivery Rate", value: `${stats.deliveryRate.toFixed(1)}%`, tone: "emerald", badge: "%" },
    { label: "RTO", value: stats.rtoOrders, tone: "rose", badge: "RTO" },
    { label: "Returned", value: stats.returnedOrders, tone: "amber", badge: "Return" },
    { label: "Cancelled (excluded)", value: stats.cancelledExcluded, tone: "slate", badge: "Info" },
  ];

  return (
    <div>
      <div style={ui.wrap}>
        {cards.map((c) => (
          <div key={c.label} style={ui.card(c.tone)}>
            <div style={ui.badge(c.tone)}>{c.badge}</div>
            <div style={ui.label}>{c.label}</div>
            <div style={ui.value}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={ui.note}>
        Note: All KPIs above are calculated <b>excluding</b> orders where <code>fulfillmentStatus === "cancelled"</code>.
      </div>

      {/* quick responsiveness */}
      <style jsx>{`
        @media (max-width: 1100px) {
          div[style*="grid-template-columns: repeat(6"] {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(6"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
