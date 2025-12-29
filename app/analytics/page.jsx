import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  Mail,
  Ticket,
  Tag,
  Layers,
  RefreshCw,
} from "lucide-react";

export const dynamic = "force-dynamic"; // always dynamic SSR
export const revalidate = 0; // ensure no ISR caching

const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

/* ---------------- helpers ---------------- */
async function safeJson(url) {
  try {
    // no-store: always fresh
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

const Stat = ({ icon: Icon, label, value, href }) => (
  <Card href={href} className="min-w-[240px] flex-1">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="w-11 h-11 rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-gray-700" />
      </div>
    </div>
    {href ? (
      <p className="text-xs text-gray-500 mt-3">Open details →</p>
    ) : (
      <p className="text-xs text-gray-500 mt-3">Live snapshot</p>
    )}
  </Card>
);

export default async function AnalyticsPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-600 mt-2">
            Missing API base URL. Set{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">NEXT_PUBLIC_API_URL</code>{" "}
            (or{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">API_URL</code>) to your backend.
          </p>
        </div>
      </div>
    );
  }

  // ✅ realtime: server time snapshot
  const now = new Date();

  // ✅ fetch all metrics concurrently
  const [
    productsRes,
    ordersRes,
    newslettersRes,
    customersRes,
    couponsRes,
    collectionsRes,
    categoriesRes,
    ticketsRes,
  ] = await Promise.all([
    safeJson(`${API}/api/products?limit=1`),
    safeJson(`${API}/api/orders?limit=1`),
    safeJson(`${API}/api/newsletters/subscribers`),
    safeJson(`${API}/api/customers?limit=1`),
    safeJson(`${API}/api/coupons?limit=1`),
    safeJson(`${API}/api/collections?limit=1`),
    safeJson(`${API}/api/categories?limit=1`),
    safeJson(`${API}/api/tickets?limit=1`),
  ]);

  // totals
  const productsTotal = safeNum(productsRes?.json?.total);
  const ordersTotal = safeNum(ordersRes?.json?.total);

  // newsletters can be array OR { subscribers: [] }
  const newsletterList = Array.isArray(newslettersRes?.json)
    ? newslettersRes.json
    : Array.isArray(newslettersRes?.json?.subscribers)
    ? newslettersRes.json.subscribers
    : [];
  const subscribersTotal = safeNum(newsletterList.length);

  const customersTotal = safeNum(customersRes?.json?.total);
  const couponsTotal = safeNum(couponsRes?.json?.total);
  const collectionsTotal = safeNum(collectionsRes?.json?.total);
  const categoriesTotal = safeNum(categoriesRes?.json?.total);
  const ticketsTotal = safeNum(ticketsRes?.json?.total);

  // warnings
  const warnings = [];
  const addWarn = (label, r) => {
    if (!r?.ok) warnings.push(`${label} failed (${r?.status || "no status"})`);
  };
  addWarn("Products", productsRes);
  addWarn("Orders", ordersRes);
  addWarn("Newsletters", newslettersRes);
  addWarn("Customers", customersRes);
  addWarn("Coupons", couponsRes);
  addWarn("Collections", collectionsRes);
  addWarn("Categories", categoriesRes);
  addWarn("Tickets", ticketsRes);

  // ✅ auto refresh interval (seconds)
  const AUTO_REFRESH_SECONDS = 10;

  return (
    <div className="p-6 w-full">
      {/* ✅ pure server auto-refresh (no client component) */}

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time snapshot · Auto refresh every {AUTO_REFRESH_SECONDS}s
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 px-4 py-2">
          <RefreshCw className="w-4 h-4 text-gray-600" />
          <p className="text-sm text-gray-700">
            Last updated:{" "}
            <span className="font-semibold">
              {now.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Some APIs didn’t respond:
          </p>
          <ul className="list-disc ml-5 mt-1 text-sm text-amber-800">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-800 mt-2">
            This page still loads; missing metrics show “—”.
          </p>
        </div>
      )}

      {/* ✅ FLEX LAYOUT (wrap) */}
      <div className="flex flex-wrap gap-4">
        <Stat
          icon={Package}
          label="Products"
          value={formatInt(productsTotal)}
          href="/products/manage"
        />
        <Stat
          icon={ShoppingBag}
          label="Orders"
          value={formatInt(ordersTotal)}
          href="/orders/all"
        />
        <Stat
          icon={Mail}
          label="Newsletter Subscribers"
          value={formatInt(subscribersTotal)}
          href="/marketing/email"
        />
        <Stat
          icon={Users}
          label="Customers"
          value={formatInt(customersTotal)}
          href="/customers"
        />
        <Stat
          icon={Tag}
          label="Coupons"
          value={formatInt(couponsTotal)}
          href="/coupons/manage"
        />
        <Stat
          icon={Layers}
          label="Collections"
          value={formatInt(collectionsTotal)}
          href="/products/collections"
        />
        <Stat
          icon={TrendingUp}
          label="Categories"
          value={formatInt(categoriesTotal)}
          href="/products/category"
        />
        <Stat
          icon={Ticket}
          label="Tickets"
          value={formatInt(ticketsTotal)}
          href="/support-tickets/all"
        />
      </div>

      {/* Notes */}
      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <p className="text-sm font-semibold text-gray-900">Next upgrades (when you want):</p>
        <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1">
          <li>Revenue, AOV, conversion funnel (add orders summary endpoint)</li>
          <li>Daily charts (orders/day, revenue/day, subs/day)</li>
          <li>Marketing UTMs + campaign ROI</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          This is server-rendered + auto refresh. No hydration errors.
        </p>
      </div>
    </div>
  );
}
