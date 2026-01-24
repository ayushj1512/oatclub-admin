"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* -------------------------
  Date helpers
------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/* -------------------------
  Cancellation logic (BASED ON YOUR API)
------------------------- */
const isCancelled = (order) => {
  return (
    order?.fulfillmentStatus?.toLowerCase() === "cancelled" ||
    order?.shipment?.status?.toLowerCase() === "cancelled"
  );
};

function buildLastNDaysSeries(orders, days) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  // Create all dates with 0 count
  const map = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(toYMD(d), 0);
  }

  for (const order of orders || []) {
    if (isCancelled(order)) continue; // 🚫 exclude cancelled

    const d = parseDate(order?.orderDate);
    if (!d) continue;

    const key = toYMD(d);
    if (map.has(key)) {
      map.set(key, map.get(key) + 1);
    }
  }

  return Array.from(map.entries()).map(([date, orders]) => ({
    date,
    orders,
  }));
}

/* -------------------------
  UI styles
------------------------- */
const ui = {
  card: {
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 14px 40px rgba(2, 6, 23, 0.08)",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
  },
  header: {
    padding: 14,
    borderBottom: "1px solid rgba(15,23,42,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  title: {
    fontWeight: 950,
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.22)",
    color: "#3730a3",
  },
  hint: { fontSize: 12, color: "#64748b" },
  body: { padding: 14 },
  pillRow: { display: "flex", gap: 8 },
  pill: (active) => ({
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    background: active
      ? "linear-gradient(135deg, #4f46e5, #6366f1)"
      : "white",
    color: active ? "white" : "#0f172a",
  }),
};

export default function OrdersCountBarChart({ orders = [] }) {
  const [range, setRange] = useState(7);

  const data = useMemo(
    () => buildLastNDaysSeries(orders, range),
    [orders, range]
  );

  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.orders, 0),
    [data]
  );

  const avg = useMemo(() => (range ? total / range : 0), [total, range]);

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <div style={ui.title}>
          <span style={ui.badge}>Orders</span>
          <span>Orders Count (Last {range} days)</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={ui.pillRow}>
            {[7, 15, 30].map((n) => (
              <button
                key={n}
                style={ui.pill(range === n)}
                onClick={() => setRange(n)}
              >
                Last {n}
              </button>
            ))}
          </div>

          <div style={ui.hint}>
            Total: <b>{total}</b> • Avg/day: <b>{avg.toFixed(1)}</b>
          </div>
        </div>
      </div>

      <div style={ui.body}>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, "Orders"]}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Bar dataKey="orders" fill="#4f46e5" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
