// app/orders/report/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";

// ✅ Use ONLY these components
import CouponAnalytics from "@/components/orders/reports/CouponAnalytics";
import DailyOrderReport from "@/components/orders/reports/DailyOrderReport";
import OrdersCountBarChart from "@/components/orders/reports/OrdersCountBarChart";
import OrderStatsCards from "@/components/orders/reports/OrderStatsCards";
import OrderStatusPieChart from "@/components/orders/reports/OrderStatusPieChart";
import OrderValueStatsCards from "@/components/orders/reports/OrderValueStatsCards";
import ProductOrderAnalytics from "@/components/orders/reports/ProductOrderAnalytics";

/* -------------------------
  Date helpers (simple)
------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const lower = (v) => String(v ?? "").trim().toLowerCase();

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// ✅ "Counted" orders logic aligned with your backend rules
const isRazorpayPaid = (o) => {
  const method = lower(o?.paymentMethod || o?.paymentGateway);
  const status = lower(o?.paymentStatus || o?.paymentState);

  const looksRazorpay =
    method === "razorpay" ||
    method.includes("razorpay") ||
    Boolean(o?.razorpay?.orderId || o?.razorpay?.paymentId || o?.razorpayOrderId);

  const paidLike =
    status === "paid" || status === "captured" || status === "success" || Boolean(o?.razorpay?.paidAt);

  return looksRazorpay && paidLike;
};

const isCodConfirmed = (o) => lower(o?.paymentMethod) === "cod" && o?.isConfirmed === true;

const isExchangeOrder = (o) => lower(o?.paymentMethod) === "exchange" || lower(o?.paymentStatus) === "not_applicable";

const isCountableOrder = (o) => isRazorpayPaid(o) || isCodConfirmed(o) || isExchangeOrder(o);

// ✅ Use orderDate for reporting (range filter), fallback safe
const orderDateOf = (o) => o?.orderDate || o?.createdAt || o?.updatedAt || null;

export default function OrderReportPage() {
  const { fetchAllOrders, loading, error } = useOrderStore();

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    from: toYMD(thirtyDaysAgo),
    to: toYMD(today),
    q: "",
    source: "",
    paymentMethod: "",
    paymentStatus: "",
    fulfillmentStatus: "",
    isConfirmed: "",
    countedOnly: "true",
  });

  const onChange = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));

  const fetchOrders = async () => {
    const res = await fetchAllOrders({});
    setOrders(Array.isArray(res) ? res : []);
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const fromD = filters.from ? parseDate(filters.from) : null;
    const toD = filters.to ? parseDate(filters.to) : null;
    const toEnd = toD ? endOfDay(toD) : null;

    const q = String(filters.q || "").trim().toLowerCase();
    const countedOnly = filters.countedOnly === "true";

    return (orders || []).filter((o) => {
      const d = parseDate(orderDateOf(o));
      if (!d) return false;

      if (fromD && d < fromD) return false;
      if (toEnd && d > toEnd) return false;

      if (countedOnly && !isCountableOrder(o)) return false;

      if (filters.source && String(o.source) !== String(filters.source)) return false;
      if (filters.paymentMethod && String(o.paymentMethod) !== String(filters.paymentMethod)) return false;
      if (filters.paymentStatus && String(o.paymentStatus) !== String(filters.paymentStatus)) return false;
      if (filters.fulfillmentStatus && String(o.fulfillmentStatus) !== String(filters.fulfillmentStatus)) return false;

      if (filters.isConfirmed === "true" && !o.isConfirmed) return false;
      if (filters.isConfirmed === "false" && !!o.isConfirmed) return false;

      if (q) {
        const hay = [
          o.orderNumber,
          o?.shippingAddressSnapshot?.fullName,
          o?.shippingAddressSnapshot?.phone,
          o?.shippingAddressSnapshot?.email,
          o?.billingAddressSnapshot?.fullName,
          o?.billingAddressSnapshot?.phone,
          o?.billingAddressSnapshot?.email,
        ]
          .map((x) => String(x || "").toLowerCase())
          .join(" ");
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [orders, filters]);

  const meta = useMemo(() => {
    const data = filteredOrders || [];
    const totalPayable = data.reduce((acc, o) => acc + (Number(o?.finalPayable) || 0), 0);
    const totalOrders = data.length || 1;

    const aov = totalPayable / totalOrders;

    const count = (s) => data.filter((o) => String(o?.fulfillmentStatus || "") === s).length;

    const cancelled = count("cancelled");
    const rto = count("rto");
    const returned = count("returned");
    const refunded = count("refunded");
    const delivered = count("delivered");

    const problem = cancelled + rto + returned + refunded;

    return {
      totalPayable,
      aov,
      delivered,
      refunded,
      cancelled,
      returned,
      rto,
      problem,
    };
  }, [filteredOrders]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Orders Report</h1>
            <div style={styles.subTitle}>
              Frontend-only analytics • Local filters • Uses your components • Includes new <b>refunded</b> status
            </div>
          </div>

          <button onClick={fetchOrders} disabled={loading} style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <div style={styles.field}>
              <label style={styles.label}>From</label>
              <input type="date" value={filters.from} onChange={onChange("from")} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>To</label>
              <input type="date" value={filters.to} onChange={onChange("to")} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Search</label>
              <input placeholder="MIRAY / name / phone / email" value={filters.q} onChange={onChange("q")} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Counted Only</label>
              <select value={filters.countedOnly} onChange={onChange("countedOnly")} style={styles.select}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Source</label>
              <select value={filters.source} onChange={onChange("source")} style={styles.select}>
                <option value="">All</option>
                <option value="website">website</option>
                <option value="mobile_app">mobile_app</option>
                <option value="social_media">social_media</option>
                <option value="manual">manual</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Payment Method</label>
              <select value={filters.paymentMethod} onChange={onChange("paymentMethod")} style={styles.select}>
                <option value="">All</option>
                <option value="cod">cod</option>
                <option value="razorpay">razorpay</option>
                <option value="exchange">exchange</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Payment Status</label>
              <select value={filters.paymentStatus} onChange={onChange("paymentStatus")} style={styles.select}>
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
                <option value="refunded">refunded</option>
                <option value="refund_pending">refund_pending</option>
                <option value="not_applicable">not_applicable</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Fulfillment Status</label>
              <select value={filters.fulfillmentStatus} onChange={onChange("fulfillmentStatus")} style={styles.select}>
                <option value="">All</option>
                <option value="processing">processing</option>
                <option value="packed">packed</option>
                <option value="picked">picked</option>
                <option value="shipped">shipped</option>
                <option value="out_for_delivery">out_for_delivery</option>
                <option value="delivered">delivered</option>
                <option value="return_requested">return_requested</option>
                <option value="exchange_requested">exchange_requested</option>
                <option value="returned">returned</option>
                <option value="refunded">refunded</option>
                <option value="cancelled">cancelled</option>
                <option value="rto">rto</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirmed</label>
              <select value={filters.isConfirmed} onChange={onChange("isConfirmed")} style={styles.select}>
                <option value="">All</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <div style={styles.metaRow}>
            <div style={styles.metaText}>
              Showing <b>{filteredOrders.length}</b> orders • Total Payable <b>₹{meta.totalPayable.toLocaleString("en-IN")}</b> • AOV{" "}
              <b>₹{meta.aov.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b> • Delivered <b>{meta.delivered}</b> • Refunded{" "}
              <b>{meta.refunded}</b> • Issues <b>{meta.problem}</b>
            </div>
            {error ? <div style={styles.error}>{error}</div> : null}
          </div>
        </div>

        {/* ✅ Daily Report */}
        <DailyOrderReport orders={filteredOrders} excludeStatuses={["cancelled", "rto"]} />

        {/* KPIs */}
        <OrderStatsCards orders={filteredOrders} />
        <OrderValueStatsCards orders={filteredOrders} excludeCancelled />

        {/* Charts */}
        <div style={styles.grid2}>
          <OrdersCountBarChart orders={filteredOrders} />
          <OrderStatusPieChart orders={filteredOrders} />
        </div>

        {/* ✅ Product-wise analytics */}
        <ProductOrderAnalytics orders={filteredOrders} excludeStatuses={["cancelled", "rto"]} />

        {/* Coupon Analytics */}
        <CouponAnalytics orders={filteredOrders} excludeCancelled />

        <div style={styles.footerNote}>Note: This report fetches orders from existing API and runs analytics on the frontend only.</div>
      </div>
    </div>
  );
}

/* -------------------------
  Simple sober styles
------------------------- */
const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", padding: 16 },
  container: { margin: "0 auto" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" },
  subTitle: { marginTop: 6, fontSize: 13, color: "#475569" },
  btn: { border: "1px solid rgba(15,23,42,0.12)", background: "#ffffff", color: "#0f172a", padding: "10px 12px", borderRadius: 10, fontWeight: 800, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  filtersCard: { border: "1px solid rgba(15,23,42,0.10)", borderRadius: 12, background: "#ffffff", padding: 12 },
  filtersGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 800, color: "#334155" },
  input: { height: 38, borderRadius: 10, border: "1px solid rgba(15,23,42,0.12)", padding: "0 10px", outline: "none", background: "#fff", color: "#0f172a" },
  select: { height: 38, borderRadius: 10, border: "1px solid rgba(15,23,42,0.12)", padding: "0 10px", outline: "none", background: "#fff", color: "#0f172a" },
  metaRow: { marginTop: 10, display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  metaText: { fontSize: 12, color: "#64748b", lineHeight: 1.6 },
  error: { fontSize: 12, color: "#b91c1c", fontWeight: 700 },
  grid2: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  footerNote: { marginTop: 12, fontSize: 12, color: "#64748b" },
};

styles._jsx = undefined;
