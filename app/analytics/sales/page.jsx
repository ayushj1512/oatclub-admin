import React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  RefreshCw,
  Activity,
  ArrowRight,
  IndianRupee,
  BarChart3,
  ClipboardList,
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

const pickOrderAmount = (o) => {
  if (!o || typeof o !== "object") return null;

  const directKeys = [
    "total",
    "totalAmount",
    "total_amount",
    "totalPrice",
    "total_price",
    "grandTotal",
    "grand_total",
    "finalAmount",
    "final_amount",
    "amount",
  ];

  for (const k of directKeys) {
    const v = Number(o[k]);
    if (Number.isFinite(v)) return v;
  }

  // nested (very common)
  const nested =
    Number(o?.pricing?.total) ||
    Number(o?.pricing?.grandTotal) ||
    Number(o?.payment?.amount) ||
    Number(o?.payment?.total) ||
    null;

  return Number.isFinite(nested) ? nested : null;
};


const pickStatus = (o) => {
  const s =
    o?.status ||
    o?.orderStatus ||
    o?.state ||
    o?.paymentStatus ||
    o?.fulfillmentStatus ||
    "";
  return String(s || "").trim() || "unknown";
};

const pickCreatedAt = (o) => {
  return o?.createdAt || o?.created_at || o?.orderDate || o?.date || null;
};

const pickCode = (o) => {
  return (
    o?.orderCode ||
    o?.orderId ||
    o?._id ||
    o?.id ||
    o?.number ||
    "—"
  );
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

const Stat = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 min-w-[260px] flex-1">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub ? <p className="text-xs text-gray-500 mt-2">{sub}</p> : null}
      </div>
      <div className="w-11 h-11 rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-gray-700" />
      </div>
    </div>
  </div>
);

export default async function AnalyticsSalesPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
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

  // 1) total orders
  const totalRes = await safeJson(`${API}/api/orders?limit=1`);

  // 2) sample recent orders (for revenue/AOV + table)
  const recentRes = await safeJson(`${API}/api/orders?limit=50`);

  const warnings = [];
  if (!totalRes.ok) warnings.push(`Orders total failed (${totalRes.status || "no status"})`);
  if (!recentRes.ok) warnings.push(`Orders list failed (${recentRes.status || "no status"})`);

  // extract list (common shapes)
  const list =
    Array.isArray(recentRes?.json?.orders)
      ? recentRes.json.orders
      : Array.isArray(recentRes?.json?.data)
      ? recentRes.json.data
      : Array.isArray(recentRes?.json)
      ? recentRes.json
      : [];

  const getTotal = (res, arrayKey) => {
  if (!res?.ok) return null;
  if (Number.isFinite(Number(res?.json?.total))) return Number(res.json.total);
  if (Number.isFinite(Number(res?.json?.count))) return Number(res.json.count);
  if (Array.isArray(res?.json?.[arrayKey])) return res.json[arrayKey].length;
  if (Array.isArray(res?.json)) return res.json.length;
  return null;
};

const ordersTotal = getTotal(totalRes, "orders");


  // compute revenue + AOV from fetched list
  const amounts = list
    .map(pickOrderAmount)
    .filter((v) => v != null);

  const revenueFromFetched = amounts.reduce((s, x) => s + x, 0);
  const aovFromFetched = amounts.length ? revenueFromFetched / amounts.length : null;

  // status breakdown
  const statusCounts = {};
  for (const o of list) {
    const rawStatus = pickStatus(o);
const st = rawStatus ? rawStatus.toLowerCase() : "unknown";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }

  const statusPairs = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  // last 10 orders for table
  const last10 = [...list]
    .sort((a, b) => {
      const da = new Date(pickCreatedAt(a) || 0).getTime();
      const db = new Date(pickCreatedAt(b) || 0).getTime();
      return db - da;
    })
    .slice(0, 10);

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Sales Analytics</h1>
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

      {/* Stats (flex) */}
       <div className="flex flex-wrap gap-4">
        <Stat
          icon={ShoppingBag}
          label="Total Orders"
          value={formatInt(ordersTotal)}
          sub="From /api/orders?limit=1 (total)"
        />
        <Stat
          icon={IndianRupee}
          label="Revenue (recent 50 orders)"
          value={formatINR(revenueFromFetched)}
          sub="Computed from fetched orders (last 50)"
        />
        <Stat
          icon={BarChart3}
          label="AOV (recent 50 orders)"
          value={formatINR(aovFromFetched)}
          sub="Revenue ÷ orders with amount"
        />
      </div>

      {/* Status breakdown */}
      <div className="mt-6 flex flex-wrap gap-4">
        <Card className="flex-[2] min-w-[320px]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Status Breakdown (recent 50)</h2>
            <Link href="/orders/all" className="text-xs text-blue-700 hover:underline">
              View orders
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusPairs.length ? (
              statusPairs.map(([st, count]) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-800"
                >
                  <span className="capitalize">{st}</span>
                  <span className="font-semibold">{count}</span>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">No status data found in recent orders payload.</p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            If you add an orders summary endpoint later, we’ll make this fully accurate (not based on 50 sample orders).
          </p>
        </Card>

        <Card className="flex-1 min-w-[320px]">
          <h2 className="text-sm font-semibold text-gray-900">Quick Links</h2>

          <div className="mt-4 flex flex-col gap-2">
            {[
              { label: "All Orders", href: "/orders/all" },
              { label: "Pending", href: "/orders/pending" },
              { label: "Processing", href: "/orders/processing" },
              { label: "Delivered", href: "/orders/delivered" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="rounded-2xl bg-gray-50 ring-1 ring-black/5 px-4 py-3 text-sm text-gray-900 hover:bg-gray-100 transition flex items-center justify-between"
              >
                {x.label}
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent orders table */}
      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-700" />
            Recent Orders (latest 10 from fetched list)
          </h2>
          <Link href="/orders/all" className="text-xs text-blue-700 hover:underline">
            View all →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Order</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
              </tr>
            </thead>

            <tbody className="text-gray-900">
              {last10.length ? (
                last10.map((o, idx) => {
                  const code = pickCode(o);
                  const st = pickStatus(o);
                  const amt = pickOrderAmount(o);
                  const dt = pickCreatedAt(o);

                  return (
                    <tr key={`${code}-${idx}`} className="border-b border-black/5 last:border-b-0">
                      <td className="py-3 pr-4">
                        <span className="font-semibold">{String(code).slice(0, 14)}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {dt ? new Date(dt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs capitalize">
                          {String(st || "unknown")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{formatINR(amt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    No orders found in the response.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Note: Revenue + AOV is computed from the fetched list. For perfect accuracy, add a backend endpoint like
          <code className="mx-1 px-2 py-0.5 bg-gray-50 rounded">/api/orders/summary</code>.
        </p>
      </div>
    </div>
  );
}
