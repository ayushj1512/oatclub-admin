"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b", "#22c55e"];

function breakdownCount(orders, field) {
  const map = new Map();
  for (const o of orders || []) {
    const k = String(o?.[field] ?? "unknown");
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const LABELS = {
  processing: "Processing",
  packed: "Packed",
  picked: "Picked",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  return_requested: "Return requested",
  exchange_requested: "Exchange requested",
  returned: "Returned",
  cancelled: "Cancelled",
  rto: "RTO",
  unknown: "Unknown",
};

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
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.22)",
    color: "#92400e",
    whiteSpace: "nowrap",
  },
  hint: { fontSize: 12, color: "#64748b" },
  body: { padding: 14 },
};

export default function OrderStatusPieChart({ orders = [], field = "fulfillmentStatus", title = "Order Status (Fulfillment)" }) {
  const data = useMemo(() => {
    const raw = breakdownCount(orders, field);
    return raw.map((d) => ({
      ...d,
      label: LABELS[d.name] || d.name,
    }));
  }, [orders, field]);

  const total = useMemo(() => data.reduce((s, x) => s + (x.value || 0), 0), [data]);

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <div style={ui.title}>
          <span style={ui.badge}>Pie</span>
          <span>{title}</span>
        </div>
        <div style={ui.hint}>
          Total: <b style={{ color: "#0f172a" }}>{total}</b>
        </div>
      </div>

      <div style={ui.body}>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                outerRadius={110}
                innerRadius={55}
                paddingAngle={2}
                label={(p) => `${p.label}: ${p.value}`}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "Orders"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
