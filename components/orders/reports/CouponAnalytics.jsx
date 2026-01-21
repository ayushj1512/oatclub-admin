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
  LineChart,
  Line,
  Legend,
} from "recharts";

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

function normalizeCouponCode(o) {
  const code = (o?.coupon?.code || "").trim();
  return code ? code.toUpperCase() : "";
}

function couponDiscountAmount(o) {
  // prefer coupon.discount, fallback to order.discount if coupon exists
  const cd = safeNum(o?.coupon?.discount);
  if (cd > 0) return cd;
  return safeNum(o?.discount);
}

function hasCoupon(o) {
  const code = normalizeCouponCode(o);
  return !!code;
}

/* -------------------------
  Build trends for last N days
------------------------- */
function buildCouponTrend(orders, days) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const map = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(toYMD(d), { date: toYMD(d), uses: 0, discount: 0 });
  }

  for (const o of orders || []) {
    const d = parseDate(o?.orderDate);
    if (!d) continue;
    const key = toYMD(d);
    if (!map.has(key)) continue;

    if (hasCoupon(o)) {
      const row = map.get(key);
      row.uses += 1;
      row.discount += couponDiscountAmount(o);
    }
  }

  return Array.from(map.values());
}

/* -------------------------
  UI
------------------------- */
const ui = {
  card: {
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 14px 40px rgba(2, 6, 23, 0.08)",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
    marginTop: 12,
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
    background: "rgba(139,92,246,0.12)",
    border: "1px solid rgba(139,92,246,0.22)",
    color: "#5b21b6",
    whiteSpace: "nowrap",
  },
  hint: { fontSize: 12, color: "#64748b" },
  body: { padding: 14 },
  pills: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  pill: (active) => ({
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    background: active
      ? "linear-gradient(135deg, rgba(139,92,246,0.98) 0%, rgba(99,102,241,0.98) 55%, rgba(14,165,233,0.98) 100%)"
      : "rgba(255,255,255,0.95)",
    color: active ? "white" : "#0f172a",
    boxShadow: active ? "0 10px 26px rgba(99,102,241,0.18)" : "0 10px 26px rgba(2,6,23,0.06)",
  }),
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 },
  kpi: {
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 14px 34px rgba(2, 6, 23, 0.07)",
  },
  kpiLabel: { fontSize: 12, fontWeight: 900, color: "#475569" },
  kpiValue: { marginTop: 6, fontSize: 20, fontWeight: 950, color: "#0f172a" },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    marginTop: 10,
  },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 },
  th: {
    textAlign: "left",
    padding: 10,
    background: "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    color: "#0f172a",
    fontWeight: 950,
    whiteSpace: "nowrap",
  },
  td: { padding: 10, borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#0f172a", whiteSpace: "nowrap" },
};

export default function CouponAnalytics({
  orders = [],
  excludeCancelled = true,
  topLimit = 10,
}) {
  const [range, setRange] = useState(30); // 7/15/30

  const scopedOrders = useMemo(() => {
    let arr = Array.isArray(orders) ? orders : [];
    if (excludeCancelled) arr = arr.filter((o) => String(o?.fulfillmentStatus) !== "cancelled");
    return arr;
  }, [orders, excludeCancelled]);

  const couponOrders = useMemo(() => scopedOrders.filter((o) => hasCoupon(o)), [scopedOrders]);

  const summary = useMemo(() => {
    const totalOrders = scopedOrders.length;
    const couponUses = couponOrders.length;

    const totalDiscount = couponOrders.reduce((s, o) => s + couponDiscountAmount(o), 0);

    // Final payable sum for coupon orders (helps “coupon-driven revenue” view)
    const couponRevenue = couponOrders.reduce((s, o) => s + safeNum(o?.finalPayable), 0);

    const avgDiscount = couponUses ? totalDiscount / couponUses : 0;
    const usageRate = totalOrders ? (couponUses / totalOrders) * 100 : 0;

    // Unique identities if tracked
    const identities = new Set();
    for (const o of couponOrders) {
      const id =
        String(o?.coupon?.identity || o?.analytics?.couponIdentity || "").trim().toLowerCase();
      if (id) identities.add(id);
    }

    return {
      totalOrders,
      couponUses,
      usageRate,
      totalDiscount,
      avgDiscount,
      couponRevenue,
      uniqueIdentities: identities.size,
    };
  }, [scopedOrders, couponOrders]);

  const byCoupon = useMemo(() => {
    const map = new Map();

    for (const o of couponOrders || []) {
      const code = normalizeCouponCode(o);
      if (!code) continue;

      if (!map.has(code)) {
        map.set(code, {
          code,
          uses: 0,
          discount: 0,
          revenue: 0,
          identities: new Set(),
          orders: new Set(),
        });
      }

      const row = map.get(code);
      row.uses += 1;
      row.discount += couponDiscountAmount(o);
      row.revenue += safeNum(o?.finalPayable);
      if (o?._id) row.orders.add(String(o._id));

      const identity = String(o?.coupon?.identity || o?.analytics?.couponIdentity || "").trim().toLowerCase();
      if (identity) row.identities.add(identity);
    }

    const arr = Array.from(map.values()).map((x) => ({
      code: x.code,
      uses: x.uses,
      discount: x.discount,
      revenue: x.revenue,
      uniqueIdentities: x.identities.size,
      uniqueOrders: x.orders.size,
      avgDiscount: x.uses ? x.discount / x.uses : 0,
    }));

    const topByUses = [...arr].sort((a, b) => b.uses - a.uses).slice(0, topLimit);
    const topByDiscount = [...arr].sort((a, b) => b.discount - a.discount).slice(0, topLimit);

    return { all: arr, topByUses, topByDiscount };
  }, [couponOrders, topLimit]);

  const trend = useMemo(() => buildCouponTrend(scopedOrders, range), [scopedOrders, range]);

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <div style={ui.title}>
          <span style={ui.badge}>Coupons</span>
          <span>Coupon Analytics</span>
        </div>

        <div style={ui.pills}>
          {[7, 15, 30].map((n) => (
            <button key={n} style={ui.pill(range === n)} onClick={() => setRange(n)}>
              Last {n}
            </button>
          ))}
          <div style={ui.hint}>
            {excludeCancelled ? (
              <>
                Cancelled excluded • Orders: <b style={{ color: "#0f172a" }}>{summary.totalOrders}</b>
              </>
            ) : (
              <>
                Orders: <b style={{ color: "#0f172a" }}>{summary.totalOrders}</b>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={ui.body}>
        {/* KPIs */}
        <div style={ui.kpiGrid}>
          <div style={ui.kpi}>
            <div style={ui.kpiLabel}>Coupon Uses</div>
            <div style={ui.kpiValue}>{summary.couponUses}</div>
            <div style={ui.hint}>Usage Rate: {summary.usageRate.toFixed(1)}%</div>
          </div>

          <div style={ui.kpi}>
            <div style={ui.kpiLabel}>Total Coupon Discount</div>
            <div style={ui.kpiValue}>₹ {kpiFormat(summary.totalDiscount)}</div>
            <div style={ui.hint}>Avg/Order: ₹ {kpiFormat(summary.avgDiscount)}</div>
          </div>

          <div style={ui.kpi}>
            <div style={ui.kpiLabel}>Coupon Orders Revenue</div>
            <div style={ui.kpiValue}>₹ {kpiFormat(summary.couponRevenue)}</div>
            <div style={ui.hint}>Sum of finalPayable for coupon orders</div>
          </div>

          <div style={ui.kpi}>
            <div style={ui.kpiLabel}>Unique Coupon Users</div>
            <div style={ui.kpiValue}>{summary.uniqueIdentities}</div>
            <div style={ui.hint}>via coupon.identity / analytics.couponIdentity</div>
          </div>
        </div>

        {/* Trend: uses + discount */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ ...ui.kpi, padding: 12 }}>
            <div style={{ fontWeight: 950, color: "#0f172a", marginBottom: 6 }}>Coupon Uses Trend</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, "Uses"]} labelFormatter={(l) => `Date: ${l}`} />
                  <Bar dataKey="uses" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ ...ui.kpi, padding: 12 }}>
            <div style={{ fontWeight: 950, color: "#0f172a", marginBottom: 6 }}>Coupon Discount Trend</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis />
                  <Tooltip formatter={(v) => [`₹ ${kpiFormat(v)}`, "Discount"]} labelFormatter={(l) => `Date: ${l}`} />
                  <Legend />
                  <Line type="monotone" dataKey="discount" stroke="#4f46e5" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Tables */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ ...ui.kpi, padding: 12 }}>
            <div style={{ fontWeight: 950, color: "#0f172a" }}>Top Coupons by Uses</div>
            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    {["Code", "Uses", "Discount", "Avg Disc", "Revenue", "Unique Users"].map((h) => (
                      <th key={h} style={ui.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byCoupon.topByUses.map((c) => (
                    <tr key={c.code}>
                      <td style={ui.td}><b>{c.code}</b></td>
                      <td style={ui.td}>{c.uses}</td>
                      <td style={ui.td}>₹ {kpiFormat(c.discount)}</td>
                      <td style={ui.td}>₹ {kpiFormat(c.avgDiscount)}</td>
                      <td style={ui.td}>₹ {kpiFormat(c.revenue)}</td>
                      <td style={ui.td}>{c.uniqueIdentities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...ui.kpi, padding: 12 }}>
            <div style={{ fontWeight: 950, color: "#0f172a" }}>Top Coupons by Discount Amount</div>
            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    {["Code", "Discount", "Uses", "Avg Disc", "Revenue", "Unique Users"].map((h) => (
                      <th key={h} style={ui.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byCoupon.topByDiscount.map((c) => (
                    <tr key={c.code}>
                      <td style={ui.td}><b>{c.code}</b></td>
                      <td style={ui.td}>₹ {kpiFormat(c.discount)}</td>
                      <td style={ui.td}>{c.uses}</td>
                      <td style={ui.td}>₹ {kpiFormat(c.avgDiscount)}</td>
                      <td style={ui.td}>₹ {kpiFormat(c.revenue)}</td>
                      <td style={ui.td}>{c.uniqueIdentities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Discount amount is taken from <code>order.coupon.discount</code> (fallback: <code>order.discount</code> if coupon exists).
          Coupon code is taken from <code>order.coupon.code</code>. Unique users require <code>coupon.identity</code> or <code>analytics.couponIdentity</code>.
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 900px) {
            div[style*="grid-template-columns: repeat(2"] { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
