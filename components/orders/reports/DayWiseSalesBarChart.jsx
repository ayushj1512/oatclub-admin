// components/orders/reports/DayWiseSalesBarChart.jsx
"use client";

import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

/* -------------------------
  Helpers
------------------------- */
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

function kpiFormat(n) {
  const x = safeNum(n);
  if (Math.abs(x) >= 1e7) return `${(x / 1e7).toFixed(2)}Cr`;
  if (Math.abs(x) >= 1e5) return `${(x / 1e5).toFixed(2)}L`;
  if (Math.abs(x) >= 1e3) return `${(x / 1e3).toFixed(2)}K`;
  return `${Math.round(x)}`;
}

function buildLastNDaysSales(orders, days, excludeCancelled) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  // create all keys upfront so chart shows zeros
  const map = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(toYMD(d), { date: toYMD(d), sales: 0, orders: 0 });
  }

  for (const o of orders || []) {
    if (excludeCancelled && String(o?.fulfillmentStatus) === "cancelled") continue;

    const d = parseDate(o?.orderDate);
    if (!d) continue;

    const key = toYMD(d);
    if (!map.has(key)) continue;

    const row = map.get(key);
    row.orders += 1;
    row.sales += safeNum(o?.finalPayable); // ✅ net sales
  }

  return Array.from(map.values());
}

/* -------------------------
  Simple sober UI
------------------------- */
const ui = {
  card: {
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 14px 40px rgba(2, 6, 23, 0.08)",
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
  title: { fontWeight: 950, color: "#0f172a" },
  pills: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  pill: (active) => ({
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    background: active ? "#0f172a" : "#ffffff",
    color: active ? "#ffffff" : "#0f172a",
  }),
  hint: { fontSize: 12, color: "#64748b" },
  body: { padding: 14 },
};

export default function DayWiseSalesBarChart({
  orders = [],
  excludeCancelled = true,
  title = "Day-wise Sales",
}) {
  const [range, setRange] = useState(7); // 7 | 15 | 30

  const data = useMemo(
    () => buildLastNDaysSales(orders, range, excludeCancelled),
    [orders, range, excludeCancelled]
  );

  const totalSales = useMemo(() => data.reduce((s, x) => s + safeNum(x.sales), 0), [data]);
  const totalOrders = useMemo(() => data.reduce((s, x) => s + safeNum(x.orders), 0), [data]);

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <div>
          <div style={ui.title}>
            {title} (Last {range} days)
          </div>
          <div style={ui.hint}>
            Total Sales: <b style={{ color: "#0f172a" }}>₹ {kpiFormat(totalSales)}</b> • Orders:{" "}
            <b style={{ color: "#0f172a" }}>{totalOrders}</b>
            {excludeCancelled ? " • Cancelled excluded" : ""}
          </div>
        </div>

        <div style={ui.pills}>
          {[7, 15, 30].map((n) => (
            <button key={n} style={ui.pill(range === n)} onClick={() => setRange(n)}>
              Last {n}
            </button>
          ))}
        </div>
      </div>

      <div style={ui.body}>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tickFormatter={(v) => `₹${kpiFormat(v)}`} />
              <Tooltip
                labelFormatter={(l) => `Date: ${l}`}
                formatter={(value) => [`₹ ${kpiFormat(value)}`, "Sales"]}
              />
              <Bar dataKey="sales" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
