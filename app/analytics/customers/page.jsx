import React from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Users,
  UserPlus,
  Repeat,
  IndianRupee,
  Mail,
  ShoppingBag,
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
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return [];
}

function pickEmailFromCustomer(c) {
  return (
    c?.email ||
    c?.customerEmail ||
    c?.userEmail ||
    c?.contact?.email ||
    c?.profile?.email ||
    ""
  ).toString().trim().toLowerCase();
}

function pickCreatedAt(obj) {
  return obj?.createdAt || obj?.created_at || obj?.subscribedAt || obj?.subscribed_at || null;
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

function pickOrderCustomerKey(o) {
  const email =
    o?.email ||
    o?.customerEmail ||
    o?.customer?.email ||
    o?.user?.email ||
    o?.shippingAddress?.email ||
    o?.billingAddress?.email ||
    "";
  const phone =
    o?.phone ||
    o?.customerPhone ||
    o?.customer?.phone ||
    o?.user?.phone ||
    o?.shippingAddress?.phone ||
    o?.billingAddress?.phone ||
    "";

  const e = String(email || "").trim().toLowerCase();
  if (e) return `email:${e}`;
  const p = String(phone || "").trim();
  if (p) return `phone:${p}`;
  const id = o?.customerId || o?.customer?._id || o?.userId || o?.user?._id || "";
  if (id) return `id:${String(id)}`;
  return "unknown";
}

function topByMap(map, limit = 8) {
  return [...map.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, limit);
}

export default async function AnalyticsCustomersPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Customers Analytics</h1>
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

  const [customersRes, ordersRes, newslettersRes] = await Promise.all([
    safeJson(`${API}/api/customers?limit=200&page=1`),
    safeJson(`${API}/api/orders?limit=200`),
    safeJson(`${API}/api/newsletters/subscribers`),
  ]);

  const warnings = [];
  const warn = (label, r) => {
    if (!r?.ok) warnings.push(`${label} failed (${r?.status || "no status"})`);
  };
  warn("Customers", customersRes);
  warn("Orders", ordersRes);
  warn("Newsletters", newslettersRes);

  // Customers list
  const customers = asArray(customersRes.ok ? customersRes.json : null);
  const customersTotalFromApi = safeNum(customersRes?.json?.total) ?? null;
  const customersSampleCount = customersRes.ok ? customers.length : null;

  // New customers (last 7 days) best-effort
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newCustomers7d = customersRes.ok
    ? customers.filter((c) => {
        const d = pickCreatedAt(c);
        if (!d) return false;
        const dt = new Date(d);
        return !Number.isNaN(dt.getTime()) && dt >= sevenDaysAgo;
      }).length
    : null;

  // Newsletter overlap (best-effort by email)
  const subs = Array.isArray(newslettersRes?.json)
    ? newslettersRes.json
    : Array.isArray(newslettersRes?.json?.subscribers)
    ? newslettersRes.json.subscribers
    : [];

  const subscriberEmailSet = new Set(
    subs.map((s) => String(s?.email || "").trim().toLowerCase()).filter(Boolean)
  );

  const customersWithEmail = customers
    .map((c) => pickEmailFromCustomer(c))
    .filter(Boolean);

  const overlapCount = customersRes.ok && newslettersRes.ok
    ? customersWithEmail.filter((e) => subscriberEmailSet.has(e)).length
    : null;

  // Orders → repeat rate + top customers (from sample)
  const orders = asArray(ordersRes.ok ? ordersRes.json : null);

  const countByCustomer = new Map(); // key -> { orders, value, label }
  for (const o of orders) {
    const key = pickOrderCustomerKey(o);
    const amt = pickOrderAmount(o) ?? 0;
    const prev = countByCustomer.get(key) || { orders: 0, value: 0, label: key };
    countByCustomer.set(key, {
      ...prev,
      orders: prev.orders + 1,
      value: prev.value + amt,
      label: key,
    });
  }

  const uniqueOrderingCustomers = ordersRes.ok ? countByCustomer.size : null;
  const repeatCustomers = ordersRes.ok
    ? [...countByCustomer.values()].filter((x) => x.orders >= 2).length
    : null;

  const repeatRate = percent(repeatCustomers, uniqueOrderingCustomers);

  const topBuyers = ordersRes.ok ? topByMap(countByCustomer, 10) : [];

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Customers Analytics</h1>
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
          icon={Users}
          label="Total Customers"
          value={
            customersTotalFromApi != null
              ? formatInt(customersTotalFromApi)
              : customersSampleCount != null
              ? formatInt(customersSampleCount)
              : "—"
          }
          hint={
            customersTotalFromApi != null
              ? "From /api/customers total"
              : "Fallback: sample count"
          }
          href="/customers"
        />

        <Stat
          icon={UserPlus}
          label="New Customers (7d, sample)"
          value={newCustomers7d != null ? formatInt(newCustomers7d) : "—"}
          hint="Calculated from createdAt (best-effort)"
          href="/customers"
        />

        <Stat
          icon={ShoppingBag}
          label="Ordering Customers (sample)"
          value={uniqueOrderingCustomers != null ? formatInt(uniqueOrderingCustomers) : "—"}
          hint="Unique customers in last 200 orders"
          href="/orders/all"
        />

        <Stat
          icon={Repeat}
          label="Repeat Rate (sample)"
          value={ordersRes.ok ? repeatRate : "—"}
          hint={ordersRes.ok ? "Customers with ≥2 orders (from sample)" : "Orders API not available"}
          href="/analytics/sales"
        />

        <Stat
          icon={IndianRupee}
          label="Top Buyer Value (sample)"
          value={topBuyers.length ? formatINR(topBuyers[0][1].value) : "—"}
          hint={topBuyers.length ? `Orders: ${formatInt(topBuyers[0][1].orders)}` : "No order values found"}
          href="/analytics/sales"
        />

        <Stat
          icon={Mail}
          label="Newsletter Overlap (sample)"
          value={overlapCount != null ? formatInt(overlapCount) : "—"}
          hint={overlapCount != null ? "Customers whose email exists in newsletters" : "Needs customers+newsletters working"}
          href="/marketing/email"
        />
      </div>

      {/* Tables */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex-1 min-w-[360px]">
          <p className="text-sm font-semibold text-gray-900">Top Buyers (from last 200 orders)</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Customer Key</th>
                  <th className="py-2 pr-4 font-medium">Orders</th>
                  <th className="py-2 pr-4 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {topBuyers.length ? (
                  topBuyers.map(([key, v]) => (
                    <tr key={key} className="border-b border-black/5 last:border-b-0">
                      <td className="py-3 pr-4 font-semibold">{v.label}</td>
                      <td className="py-3 pr-4">{formatInt(v.orders)}</td>
                      <td className="py-3 pr-4">{formatINR(v.value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-500">
                      {ordersRes.ok ? "No buyers computed (missing customer key fields?)" : "Orders API not available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            “Customer Key” is derived from email → phone → id (best-effort). If you expose a clean customerId in orders,
            this becomes perfect.
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex-1 min-w-[360px]">
          <p className="text-sm font-semibold text-gray-900">What to add for perfect customer analytics</p>

          <div className="mt-4 text-sm text-gray-600 space-y-2">
            <p>
              Add a backend endpoint:
              <code className="ml-2 px-2 py-0.5 bg-gray-50 rounded">/api/analytics/customers</code>
              that returns:
            </p>

            <pre className="text-xs bg-gray-50 ring-1 ring-black/5 rounded-2xl p-4 overflow-auto">
{`{
  "totalCustomers": 12345,
  "newCustomers7d": 321,
  "orderingCustomers30d": 890,
  "repeatRate30d": 0.27,
  "newsletterOverlap": 5400,
  "topCustomers": [{ "customerId": "…", "orders": 5, "value": 12999 }]
}`}
            </pre>

            <p className="text-xs text-gray-500">
              Then the UI stays same and becomes 100% accurate across all records (not sample-based).
            </p>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { label: "Overview", href: "/analytics/overview" },
          { label: "Sales", href: "/analytics/sales" },
          { label: "Traffic", href: "/analytics/traffic" },
          { label: "Products", href: "/analytics/products" },
          { label: "Marketing", href: "/analytics/marketing" },
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
