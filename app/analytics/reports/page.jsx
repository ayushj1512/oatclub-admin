import React from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Download,
  FileText,
  ShoppingBag,
  IndianRupee,
  Users,
  Package,
  Mail,
  Tag,
  Search,
  AlertTriangle,
  ArrowRight,
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
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.coupons)) return payload.coupons;
  if (Array.isArray(payload?.queries)) return payload.queries;
  return [];
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

function pickAnalytics(p) {
  const a = p?.analytics || {};
  return {
    views: safeNum(a.views) ?? 0,
    purchases: safeNum(a.purchases) ?? 0,
    wishlist: safeNum(a.wishlistCount) ?? 0,
    cartAdds: safeNum(a.cartAdds) ?? 0,
  };
}

function topCounts(list, getKey, limit = 12) {
  const m = new Map();
  for (const it of list) {
    const k = String(getKey(it) || "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function jsonDownloadResponse(obj, filename = "analytics_report.json") {
  const body = JSON.stringify(obj, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

export default async function AnalyticsReportsPage({ searchParams }) {
  const params = searchParams || {};
  const download = params.download === "1";

  if (!API) {
    const msg = {
      ok: false,
      error: "Missing API base URL. Set NEXT_PUBLIC_API_URL or API_URL.",
    };
    return download ? jsonDownloadResponse(msg, "analytics_report_error.json") : (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Reports</h1>
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

  const AUTO_REFRESH_SECONDS = 30;
  const now = new Date();

  // Fetch snapshots (limit=200 for sample dashboards)
  const [ordersRes, productsRes, customersRes, newslettersRes, couponsRes, queriesRes] =
    await Promise.all([
      safeJson(`${API}/api/orders?limit=200`),
      safeJson(`${API}/api/products?limit=200&page=1`),
      safeJson(`${API}/api/customers?limit=200&page=1`),
      safeJson(`${API}/api/newsletters/subscribers`),
      safeJson(`${API}/api/coupons?limit=200`),
      safeJson(`${API}/api/queries?limit=200`),
    ]);

  const warnings = [];
  const warn = (label, r) => {
    if (!r?.ok) warnings.push({ label, status: r?.status || 0 });
  };
  warn("orders", ordersRes);
  warn("products", productsRes);
  warn("customers", customersRes);
  warn("newsletters", newslettersRes);
  warn("coupons", couponsRes);
  warn("queries", queriesRes);

  const orders = asArray(ordersRes.ok ? ordersRes.json : null);
  const products = asArray(productsRes.ok ? productsRes.json : null);
  const customers = asArray(customersRes.ok ? customersRes.json : null);
  const subs = asArray(newslettersRes.ok ? newslettersRes.json : null);
  const coupons = asArray(couponsRes.ok ? couponsRes.json : null);
  const queries = asArray(queriesRes.ok ? queriesRes.json : null);

  // KPIs (best-effort)
  const ordersCount = ordersRes.ok ? orders.length : null;
  const ordersRevenue = ordersRes.ok
    ? orders.map(pickOrderAmount).filter((v) => v != null).reduce((s, v) => s + v, 0)
    : null;

  const productsCount = safeNum(productsRes?.json?.total) ?? (productsRes.ok ? products.length : null);
  const customersCount = safeNum(customersRes?.json?.total) ?? (customersRes.ok ? customers.length : null);
  const newsletterCount = newslettersRes.ok ? subs.length : null;
  const couponsCount = safeNum(couponsRes?.json?.total) ?? (couponsRes.ok ? coupons.length : null);

  const productAnalyticsTotals = productsRes.ok
    ? products.reduce(
        (acc, p) => {
          const a = pickAnalytics(p);
          acc.views += a.views;
          acc.purchases += a.purchases;
          acc.wishlist += a.wishlist;
          acc.cartAdds += a.cartAdds;
          return acc;
        },
        { views: 0, purchases: 0, wishlist: 0, cartAdds: 0 }
      )
    : null;

  const topSearches = queriesRes.ok
    ? topCounts(queries, (q) => q.query || q.q || q.search || q.keyword || q.text || "", 12)
    : [];

  const report = {
    generatedAt: now.toISOString(),
    sampleLimits: { orders: 200, products: 200, customers: 200, coupons: 200, queries: 200 },
    warnings,
    kpis: {
      ordersCount,
      ordersRevenue,
      productsCount,
      customersCount,
      newsletterCount,
      couponsCount,
      productAnalyticsTotals,
    },
    topSearches: topSearches.map(([term, count]) => ({ term, count })),
  };

  if (download) {
    return jsonDownloadResponse(report, `analytics_report_${now.toISOString().slice(0, 10)}.json`);
  }

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Analytics Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live snapshot · Auto refresh every {AUTO_REFRESH_SECONDS}s
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

          <Link
            href="/analytics/reports?download=1"
            className="inline-flex items-center gap-2 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 px-4 py-2 text-sm text-gray-800 hover:shadow-md transition"
          >
            <Download className="w-4 h-4" />
            Download JSON Report
          </Link>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Some APIs didn’t respond
          </p>
          <ul className="list-disc ml-5 mt-1 text-sm text-amber-800">
            {warnings.map((w) => (
              <li key={w.label}>
                {w.label} ({w.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <Stat
          icon={FileText}
          label="Report Type"
          value="Live Snapshot"
          hint="One file, all KPIs"
          href="/analytics/reports?download=1"
        />

        <Stat
          icon={ShoppingBag}
          label="Orders (sample)"
          value={ordersCount != null ? formatInt(ordersCount) : "—"}
          hint="From /api/orders?limit=200"
          href="/orders/all"
        />

        <Stat
          icon={IndianRupee}
          label="Revenue (sample)"
          value={ordersRevenue != null ? formatINR(ordersRevenue) : "—"}
          hint="Sum of order totals (best-effort fields)"
          href="/analytics/sales"
        />

        <Stat
          icon={Package}
          label="Products"
          value={productsCount != null ? formatInt(productsCount) : "—"}
          hint="From /api/products total"
          href="/products/manage"
        />

        <Stat
          icon={Users}
          label="Customers"
          value={customersCount != null ? formatInt(customersCount) : "—"}
          hint="From /api/customers total"
          href="/customers"
        />

        <Stat
          icon={Mail}
          label="Newsletter"
          value={newsletterCount != null ? formatInt(newsletterCount) : "—"}
          hint="From /api/newsletters/subscribers"
          href="/marketing/email"
        />

        <Stat
          icon={Tag}
          label="Coupons"
          value={couponsCount != null ? formatInt(couponsCount) : "—"}
          hint="From /api/coupons"
          href="/marketing/coupons"
        />

        <Stat
          icon={Search}
          label="Top Searches (sample)"
          value={queriesRes.ok ? formatInt(queries.length) : "—"}
          hint="From /api/queries?limit=200"
          href="/analytics/traffic"
        />
      </div>

      {/* Highlights */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex-1 min-w-[360px]">
          <p className="text-sm font-semibold text-gray-900">Product Analytics Totals (sample)</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 ring-1 ring-black/5 p-3">
              <p className="text-xs text-gray-500">Views</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {productAnalyticsTotals ? formatInt(productAnalyticsTotals.views) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 ring-1 ring-black/5 p-3">
              <p className="text-xs text-gray-500">Purchases</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {productAnalyticsTotals ? formatInt(productAnalyticsTotals.purchases) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 ring-1 ring-black/5 p-3">
              <p className="text-xs text-gray-500">Wishlist Adds</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {productAnalyticsTotals ? formatInt(productAnalyticsTotals.wishlist) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 ring-1 ring-black/5 p-3">
              <p className="text-xs text-gray-500">Cart Adds</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {productAnalyticsTotals ? formatInt(productAnalyticsTotals.cartAdds) : "—"}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            These totals come from products in the fetched sample (limit=200). For full accuracy, add MongoDB
            aggregation endpoints.
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex-1 min-w-[360px]">
          <p className="text-sm font-semibold text-gray-900">Top Searches (sample)</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {topSearches.length ? (
              topSearches.map(([term, count]) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-800"
                >
                  {term}
                  <span className="font-semibold">{count}</span>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">No query text field found (or queries API not available).</p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Source: <code className="px-2 py-0.5 bg-gray-50 rounded">/api/queries?limit=200</code>
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { label: "Overview", href: "/analytics/overview" },
          { label: "Sales", href: "/analytics/sales" },
          { label: "Traffic", href: "/analytics/traffic" },
          { label: "Funnel", href: "/analytics/funnel" },
          { label: "Products", href: "/analytics/products" },
          { label: "Customers", href: "/analytics/customers" },
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
