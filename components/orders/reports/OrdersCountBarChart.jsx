"use client";

import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

/* -------------------------
  Date helpers
------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

function buildLastNDaysSeries(orders, days) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  // create all keys upfront so chart has 0 bars too
  const map = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(toYMD(d), 0);
  }

  for (const o of orders || []) {
    const d = parseDate(o?.orderDate);
    if (!d) continue;
    const key = toYMD(d);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
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
  title: { fontWeight: 950, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.22)",
    color: "#3730a3",
    whiteSpace: "nowrap",
  },
  hint: { fontSize: 12, color: "#64748b" },
  body: { padding: 14 },
  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: (active) => ({
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    background: active
      ? "linear-gradient(135deg, rgba(79,70,229,0.98) 0%, rgba(99,102,241,0.98) 60%, rgba(14,165,233,0.98) 100%)"
      : "rgba(255,255,255,0.95)",
    color: active ? "white" : "#0f172a",
    boxShadow: active ? "0 10px 26px rgba(79,70,229,0.18)" : "0 10px 26px rgba(2,6,23,0.06)",
  }),
};

export default function OrdersCountBarChart({ orders = [] }) {
  const [range, setRange] = useState(7); // 7 | 15 | 30

  const data = useMemo(() => buildLastNDaysSeries(orders, range), [orders, range]);

  const total = useMemo(() => data.reduce((s, x) => s + (x.orders || 0), 0), [data]);
  const avg = useMemo(() => (range ? total / range : 0), [total, range]);

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <div style={ui.title}>
          <span style={ui.badge}>Orders</span>
          <span>Orders Count (Last {range} days)</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={ui.pillRow}>
            {[7, 15, 30].map((n) => (
              <button key={n} style={ui.pill(range === n)} onClick={() => setRange(n)}>
                Last {n}
              </button>
            ))}
          </div>

          <div style={ui.hint}>
            Total: <b style={{ color: "#0f172a" }}>{total}</b> • Avg/day:{" "}
            <b style={{ color: "#0f172a" }}>{avg.toFixed(1)}</b>
          </div>
        </div>
      </div>

      <div style={ui.body}>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                minTickGap={12}
                tickFormatter={(v) => v.slice(5)} // show MM-DD
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value, "Orders"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="orders" fill="#4f46e5" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
