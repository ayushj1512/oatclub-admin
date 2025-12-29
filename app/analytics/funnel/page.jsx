import React from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  ArrowRight,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Truck,
  CheckCircle2,
  XCircle,
  Mail,
  Users,
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

function normalizeStatus(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "_");
}

function getOrderList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function pickStatus(o) {
  return (
    o?.status ||
    o?.orderStatus ||
    o?.state ||
    o?.paymentStatus ||
    o?.fulfillmentStatus ||
    "unknown"
  );
}

/* A flexible matcher for your order status naming */
function countStatuses(orders) {
  const counts = {
    total: orders.length,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    rto: 0,
    failed: 0,
    unknown: 0,
  };

  for (const o of orders) {
    const st = normalizeStatus(pickStatus(o));

    if (["pending", "awaiting_payment", "payment_pending"].includes(st)) counts.pending++;
    else if (["processing", "confirmed", "packed", "ready_to_ship"].includes(st)) counts.processing++;
    else if (["shipped", "in_transit", "out_for_delivery"].includes(st)) counts.shipped++;
    else if (["delivered", "completed"].includes(st)) counts.delivered++;
    else if (["cancelled", "canceled"].includes(st)) counts.cancelled++;
    else if (["returned", "return"].includes(st)) counts.returned++;
    else if (["rto", "returned_to_origin"].includes(st)) counts.rto++;
    else if (["failed", "payment_failed"].includes(st)) counts.failed++;
    else counts.unknown++;
  }

  return counts;
}

const Step = ({ icon: Icon, title, count, rate, href, hint }) => (
  <Card href={href} className="min-w-[260px] flex-1">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-700">
            Conversion: <span className="font-semibold ml-1">{rate}</span>
          </span>
        </div>
        {hint ? <p className="text-xs text-gray-500 mt-3">{hint}</p> : null}
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

export default async function AnalyticsFunnelPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Funnel</h1>
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

  // Orders sample to compute funnel steps
  const ordersRes = await safeJson(`${API}/api/orders?limit=200`);

  // Optional endpoints (if present). If not present, it will do “—” and still render.
  const cartsRes = await safeJson(`${API}/api/customers/carts`);
  const abandonedRes = await safeJson(`${API}/api/customers/abandoned-carts`);

  const newslettersRes = await safeJson(`${API}/api/newsletters/subscribers`);

  const warnings = [];
  if (!ordersRes.ok) warnings.push(`Orders failed (${ordersRes.status || "no status"})`);

  // Orders breakdown
  const orders = getOrderList(ordersRes.json);
  const sc = countStatuses(orders);

  // Cart counts (best-effort)
  const cartsList =
    Array.isArray(cartsRes?.json?.carts) ? cartsRes.json.carts :
    Array.isArray(cartsRes?.json) ? cartsRes.json :
    Array.isArray(cartsRes?.json?.data) ? cartsRes.json.data :
    [];
  const abandonedList =
    Array.isArray(abandonedRes?.json?.carts) ? abandonedRes.json.carts :
    Array.isArray(abandonedRes?.json) ? abandonedRes.json :
    Array.isArray(abandonedRes?.json?.data) ? abandonedRes.json.data :
    [];

  const cartCount = cartsRes.ok ? cartsList.length : null;
  const abandonedCount = abandonedRes.ok ? abandonedList.length : null;

  // Newsletter subscribers
  const newsletterList = Array.isArray(newslettersRes?.json)
    ? newslettersRes.json
    : Array.isArray(newslettersRes?.json?.subscribers)
    ? newslettersRes.json.subscribers
    : [];
  const subscribersTotal = newslettersRes.ok ? newsletterList.length : null;

  // Funnel numbers (best effort)
  // If you don’t have carts endpoints, consider "Orders total" as entry point.
  const entry = cartCount != null ? cartCount : sc.total;

  const placed = sc.total;
  const processing = sc.processing;
  const shipped = sc.shipped;
  const delivered = sc.delivered;

  const cancelled = sc.cancelled;
  const returned = sc.returned + sc.rto;

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Funnel</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time funnel · Auto refresh every {AUTO_REFRESH_SECONDS}s
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

      {/* Funnel Steps (flex wrap) */}
      <div className="flex flex-wrap gap-4">
        <Step
          icon={ShoppingCart}
          title="Cart Started"
          count={cartCount != null ? formatInt(cartCount) : "—"}
          rate={percent(cartCount, entry)}
          href={cartCount != null ? "/customers/carts" : undefined}
          hint={cartCount == null ? "No carts endpoint detected, showing —" : "Customers who added items to cart"}
        />

        <Step
          icon={ShoppingBag}
          title="Orders Placed"
          count={formatInt(placed)}
          rate={percent(placed, entry)}
          href="/orders/all"
          hint="Orders received (sample from last 200)"
        />

        <Step
          icon={CreditCard}
          title="Processing"
          count={formatInt(processing)}
          rate={percent(processing, placed)}
          href="/orders/processing"
          hint="Confirmed / packed / ready to ship"
        />

        <Step
          icon={Truck}
          title="Shipped"
          count={formatInt(shipped)}
          rate={percent(shipped, placed)}
          href="/orders/shipped"
          hint="In transit / out for delivery"
        />

        <Step
          icon={CheckCircle2}
          title="Delivered"
          count={formatInt(delivered)}
          rate={percent(delivered, placed)}
          href="/orders/delivered"
          hint="Completed orders"
        />

        <Step
          icon={XCircle}
          title="Cancelled / Returned"
          count={formatInt(cancelled + returned)}
          rate={percent(cancelled + returned, placed)}
          href="/orders/returns"
          hint="Cancelled + Returned + RTO (from sample)"
        />

        <Step
          icon={Mail}
          title="Newsletter Subscribers"
          count={subscribersTotal != null ? formatInt(subscribersTotal) : "—"}
          rate={"—"}
          href="/marketing/email"
          hint="Subscribers list"
        />

        <Step
          icon={Users}
          title="Abandoned Carts"
          count={abandonedCount != null ? formatInt(abandonedCount) : "—"}
          rate={abandonedCount != null ? percent(abandonedCount, entry) : "—"}
          href={abandonedCount != null ? "/analytics/abandoned-carts" : undefined}
          hint={abandonedCount == null ? "No abandoned-carts endpoint detected, showing —" : "Carts with no checkout"}
        />
      </div>

      {/* Notes */}
      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <p className="text-sm font-semibold text-gray-900">How this funnel is calculated</p>
        <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1">
          <li>Orders funnel uses the last 200 orders response to count statuses.</li>
          <li>If carts endpoints exist, “Cart Started” becomes the funnel entry; otherwise “Orders Placed” is entry.</li>
          <li>For perfect accuracy, create a backend endpoint like <code className="mx-1 px-2 py-0.5 bg-gray-50 rounded">/api/analytics/funnel</code>.</li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/analytics/overview"
            className="rounded-2xl bg-gray-50 ring-1 ring-black/5 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition"
          >
            Back to Overview
          </Link>
          <Link
            href="/analytics/sales"
            className="rounded-2xl bg-gray-50 ring-1 ring-black/5 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition"
          >
            Sales Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
