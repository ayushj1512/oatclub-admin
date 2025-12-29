import React from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Mail,
  Tag,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  IndianRupee,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

/* ---------------- helpers ---------------- */
async function safeJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: String(e?.message || e) };
  }
}

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

const formatInt = (n) => {
  const x = safeNum(n);
  if (x == null) return "—";
  return new Intl.NumberFormat("en-IN").format(x);
};

const formatINR = (n) => {
  const x = safeNum(n);
  if (x == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(x);
};

const percent = (num, den) => {
  const a = safeNum(num);
  const b = safeNum(den);
  if (a == null || b == null || b === 0) return "—";
  return `${((a / b) * 100).toFixed(1)}%`;
};

const Chip = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-700">
    {children}
  </span>
);

const Card = ({ children, href, className = "" }) => {
  const base =
    "rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 hover:shadow-md transition";
  if (!href) return <div className={`${base} ${className}`}>{children}</div>;
  return (
    <Link href={href} className={`${base} ${className}`}>
      {children}
    </Link>
  );
};

const Stat = ({ icon: Icon, label, value, hint, href }) => (
  <Card href={href} className="min-w-[260px] flex-1">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {hint ? <p className="text-xs text-gray-500 mt-2">{hint}</p> : null}
      </div>
      <div className="w-11 h-11 rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-gray-700" />
      </div>
    </div>

    {href ? (
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Open</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    ) : (
      <p className="text-xs text-gray-500 mt-3">Live snapshot</p>
    )}
  </Card>
);

function asArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.coupons)) return payload.coupons;
  if (Array.isArray(payload?.queries)) return payload.queries;
  if (Array.isArray(payload?.subscribers)) return payload.subscribers;
  return [];
}

function topBy(list, getKey, limit = 8) {
  const m = new Map();
  for (const it of list) {
    const k = String(getKey(it) || "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function pickOrderAmount(o) {
  const keys = [
    "totalAmount",
    "total_amount",
    "grandTotal",
    "grand_total",
    "total",
    "amount",
    "payableAmount",
    "payable_amount",
    "orderTotal",
    "order_total",
    "finalAmount",
    "final_amount",
  ];
  for (const k of keys) {
    const v = safeNum(o?.[k]);
    if (v != null) return v;
  }
  return safeNum(o?.pricing?.total) ?? safeNum(o?.pricing?.grandTotal) ?? null;
}

function pickCouponFromOrder(o) {
  // adapt to many shapes
  const direct =
    o?.coupon ||
    o?.couponCode ||
    o?.coupon_code ||
    o?.appliedCoupon ||
    o?.applied_coupon ||
    null;

  if (direct) return String(direct).trim();

  const list =
    Array.isArray(o?.coupons) ? o.coupons :
    Array.isArray(o?.appliedCoupons) ? o.appliedCoupons :
    Array.isArray(o?.discounts) ? o.discounts :
    [];

  if (list.length) {
    const first = list[0];
    if (typeof first === "string") return first.trim();
    return String(first?.code || first?.coupon || first?.name || "").trim() || null;
  }

  return null;
}

function couponLooksActive(c) {
  // best-effort
  if (typeof c?.isActive === "boolean") return c.isActive;
  if (typeof c?.active === "boolean") return c.active;
  if (typeof c?.status === "string") return String(c.status).toLowerCase() === "active";
  return null;
}

export default async function AnalyticsMarketingPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-600 mt-2">
            Missing API base URL. Set{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">NEXT_PUBLIC_API_URL</code>{" "}
            (or{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">API_URL</code>).
          </p>
        </div>
      </div>
    );
  }

  const AUTO_REFRESH_SECONDS = 10;
  const now = new Date();

  const [newsRes, couponsRes, ordersRes, queriesRes] = await Promise.all([
    safeJson(`${API}/api/newsletters/subscribers`),
    safeJson(`${API}/api/coupons?limit=200`),
    safeJson(`${API}/api/orders?limit=200`),
    safeJson(`${API}/api/queries?limit=200`),
  ]);

  const warnings = [];
  const warn = (label, r) => {
    if (!r?.ok) warnings.push(`${label} failed (${r?.status || "no status"})`);
  };
  warn("Newsletters", newsRes);
  warn("Coupons", couponsRes);
  warn("Orders", ordersRes);
  warn("Queries", queriesRes);

  // Newsletter stats
  const subs = asArray(newsRes.ok ? newsRes.json : null);
  const subscribersTotal = newsRes.ok ? subs.length : null;
  const verifiedCount =
    newsRes.ok ? subs.filter((s) => s?.isVerified === true).length : null;
  const activeCount =
    newsRes.ok ? subs.filter((s) => s?.isActive !== false).length : null;

  // Coupon stats
  const coupons = asArray(couponsRes.ok ? couponsRes.json : null);
  const couponsTotal =
    safeNum(couponsRes?.json?.total) ?? (couponsRes.ok ? coupons.length : null);

  const activeCouponsCount = couponsRes.ok
    ? coupons.reduce((acc, c) => {
        const a = couponLooksActive(c);
        if (a === true) return acc + 1;
        return acc;
      }, 0)
    : null;

  // Orders stats + coupon usage signal
  const orders = asArray(ordersRes.ok ? ordersRes.json : null);
  const amounts = orders.map(pickOrderAmount).filter((v) => v != null);
  const recentRevenue = amounts.reduce((s, x) => s + x, 0);

  const couponUsedOrders = ordersRes.ok
    ? orders.filter((o) => Boolean(pickCouponFromOrder(o))).length
    : null;

  const couponUsageRate = percent(couponUsedOrders, orders.length || 0);

  // Top coupons used (from orders)
  const topCoupons = ordersRes.ok
    ? topBy(orders, (o) => pickCouponFromOrder(o) || "", 8)
    : [];

  // Top searches (queries)
  const queries = asArray(queriesRes.ok ? queriesRes.json : null);
  const topSearches = queriesRes.ok
    ? topBy(queries, (q) => q.query || q.q || q.search || q.keyword || q.text || "", 10)
    : [];

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Marketing Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time snapshot · Auto refresh every {AUTO_REFRESH_SECONDS}s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip>
            <Activity className="w-4 h-4 text-gray-600" />
            Live
          </Chip>
          <Chip>
            <RefreshCw className="w-4 h-4 text-gray-600" />
            Updated: <span className="font-semibold">{now.toLocaleString("en-IN")}</span>
          </Chip>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900">Some APIs didn’t respond:</p>
          <ul className="list-disc ml-5 mt-1 text-sm text-amber-800">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <Stat
          icon={Mail}
          label="Subscribers"
          value={subscribersTotal != null ? formatInt(subscribersTotal) : "—"}
          hint={
            subscribersTotal == null
              ? "From /api/newsletters/subscribers (array expected)"
              : `${formatInt(activeCount)} active · ${formatInt(verifiedCount)} verified`
          }
          href="/marketing/email"
        />

        <Stat
          icon={Tag}
          label="Coupons"
          value={couponsTotal != null ? formatInt(couponsTotal) : "—"}
          hint={
            couponsTotal == null
              ? "From /api/coupons"
              : activeCouponsCount != null
              ? `${formatInt(activeCouponsCount)} active (best-effort)`
              : "Active count not available in payload"
          }
          href="/marketing/coupons"
        />

        <Stat
          icon={ShoppingBag}
          label="Orders (sample)"
          value={ordersRes.ok ? formatInt(orders.length) : "—"}
          hint={ordersRes.ok ? "From /api/orders?limit=200" : "Orders API not available"}
          href="/orders/all"
        />

        <Stat
          icon={IndianRupee}
          label="Revenue (recent orders)"
          value={ordersRes.ok ? formatINR(recentRevenue) : "—"}
          hint="Computed from fetched orders"
          href="/analytics/sales"
        />

        <Stat
          icon={Sparkles}
          label="Coupon Usage (sample)"
          value={ordersRes.ok ? couponUsageRate : "—"}
          hint={ordersRes.ok ? `${formatInt(couponUsedOrders)} orders used a coupon` : "Unable to compute"}
          href="/analytics/sales"
        />

        <Stat
          icon={Search}
          label="Top Searches (fallback)"
          value={queriesRes.ok ? formatInt(queries.length) : "—"}
          hint={queriesRes.ok ? "From /api/queries?limit=200" : "Queries API not available"}
          href="/analytics/traffic"
        />
      </div>

      {/* Lists */}
      <div className="mt-6 flex flex-wrap gap-4">
        <Card className="flex-1 min-w-[360px]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top Coupons Used (from recent orders)</h2>
            <Link href="/marketing/coupons" className="text-xs text-blue-700 hover:underline">
              Coupons →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {topCoupons.length ? (
              topCoupons.map(([code, c]) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-800"
                >
                  {code}
                  <span className="font-semibold">{c}</span>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                {ordersRes.ok ? "No coupon field found in orders payload (or no coupons used)." : "Orders API not available."}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            This is best-effort based on whatever coupon fields exist in your orders payload.
          </p>
        </Card>

        <Card className="flex-1 min-w-[360px]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top Search Terms (fallback signal)</h2>
            <Link href="/analytics/traffic" className="text-xs text-blue-700 hover:underline">
              Traffic →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {topSearches.length ? (
              topSearches.map(([q, c]) => (
                <span
                  key={q}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-800"
                >
                  {q}
                  <span className="font-semibold">{c}</span>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                {queriesRes.ok ? "No query text field found in payload." : "Queries API not available."}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Uses <code className="px-2 py-0.5 bg-gray-50 rounded">/api/queries</code> as a marketing-intent fallback.
          </p>
        </Card>
      </div>

      {/* Bottom nav */}
      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { label: "Overview", href: "/analytics/overview" },
          { label: "Sales", href: "/analytics/sales" },
          { label: "Traffic", href: "/analytics/traffic" },
          { label: "Funnel", href: "/analytics/funnel" },
          { label: "Email Marketing", href: "/marketing/email" },
        ].map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 px-4 py-2 text-sm text-gray-800 hover:shadow-md transition"
          >
            {x.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
