import React from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  ShoppingCart,
  Users,
  IndianRupee,
  Timer,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Mail,
  Phone,
  Hash,
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
  const base = "rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 hover:shadow-md transition";
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
  if (Array.isArray(payload?.carts)) return payload.carts;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function pickCartTotal(c) {
  // your AbandonedCart model will likely have one of these
  const keys = ["total", "grandTotal", "totalAmount", "value", "amount", "subtotal"];
  for (const k of keys) {
    const v = safeNum(c?.[k]);
    if (v != null) return v;
  }
  return safeNum(c?.pricing?.total) ?? safeNum(c?.pricing?.grandTotal) ?? null;
}

function pickCartItemsCount(c) {
  if (Array.isArray(c?.items)) return c.items.reduce((s, it) => s + (safeNum(it?.qty) ?? 1), 0);
  if (Array.isArray(c?.products)) return c.products.length;
  if (Array.isArray(c?.lines)) return c.lines.length;
  return safeNum(c?.itemsCount) ?? safeNum(c?.qty) ?? 0;
}

function pickCartAgeHours(c) {
  const t = c?.abandonedAt || c?.updatedAt || c?.createdAt || null;
  if (!t) return null;
  const dt = new Date(t);
  if (Number.isNaN(dt.getTime())) return null;
  const diffMs = Date.now() - dt.getTime();
  return Math.max(0, diffMs / 36e5);
}

function pickCustomerKey(c) {
  const email = (c?.email || c?.customerEmail || c?.customer?.email || c?.customer?.email || "").toString().trim().toLowerCase();
  if (email) return email;
  const phone = (c?.phone || c?.customerPhone || c?.customer?.phone || "").toString().trim();
  if (phone) return phone;
  const uid = (c?.firebaseUID || c?.customerFirebaseUID || c?.customer?.firebaseUID || "").toString().trim();
  if (uid) return uid;
  const id = c?.customerId || c?.customer?._id;
  return id ? String(id) : "unknown";
}

function pickCustomerIdForLink(c) {
  // If your AbandonedCart store customerId (ObjectId of Customer), we can deep link
  return c?.customerId || c?.customer?._id || null;
}

function sortDesc(list, getVal) {
  return [...list].sort((a, b) => (getVal(b) || 0) - (getVal(a) || 0));
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN");
}

function maybeStr(v) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

function ItemMiniList({ cart }) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  if (!items.length) return <div className="text-xs text-gray-500">No items payload.</div>;

  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.slice(0, 6).map((it, idx) => {
        const title = it?.title || it?.productTitle || it?.name || "Item";
        const sku = it?.sku || it?.variantSku || it?.productSku || "";
        const code = it?.productCode || "";
        const qty = safeNum(it?.qty) ?? safeNum(it?.quantity) ?? 1;
        const price = safeNum(it?.price) ?? safeNum(it?.unitPrice) ?? null;
        return (
          <div key={idx} className="rounded-xl border border-black/5 bg-white p-3">
            <div className="text-sm font-semibold text-gray-900 line-clamp-1">{maybeStr(title)}</div>
            <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
              {code ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-gray-50 px-2 py-0.5">
                  <Hash className="w-3 h-3" /> {code}
                </span>
              ) : null}
              {sku ? (
                <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2 py-0.5">SKU: {sku}</span>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2 py-0.5">Qty: {qty}</span>
              {price != null ? (
                <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2 py-0.5">
                  {formatINR(price)}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
      {items.length > 6 ? <div className="text-xs text-gray-500">Showing first 6 items…</div> : null}
    </div>
  );
}

export default async function AnalyticsAbandonedCartsPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Abandoned Carts</h1>
          <p className="text-sm text-gray-600 mt-2">
            Missing API base URL. Set{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">NEXT_PUBLIC_API_URL</code>{" "}
            (or <code className="px-2 py-1 bg-gray-50 rounded">API_URL</code>).
          </p>
        </div>
      </div>
    );
  }

  const AUTO_REFRESH_SECONDS = 10;
  const now = new Date();

  // ✅ NEW: your AbandonedCart API
  // Expected shape: { success:true, items:[...], total, page, pages } OR { carts:[...] }
  const r = await safeJson(`${API}/api/abandoned-carts?page=1&limit=200`);

  const dataRes = r;
  const carts = dataRes?.ok ? asArray(dataRes.json) : [];

  // Metrics
  const totalCarts = dataRes?.ok ? (safeNum(dataRes.json?.total) ?? carts.length) : null;

  const uniqueCustomers = dataRes?.ok ? new Set(carts.map(pickCustomerKey).filter(Boolean)).size : null;

  const totalValue = dataRes?.ok
    ? carts
        .map((c) => pickCartTotal(c))
        .filter((v) => v != null)
        .reduce((s, v) => s + v, 0)
    : null;

  const avgCartValue = dataRes?.ok && totalCarts && totalValue != null ? totalValue / totalCarts : null;

  const hotCarts = dataRes?.ok
    ? carts.filter((c) => {
        const h = pickCartAgeHours(c);
        return h != null && h <= 2;
      }).length
    : null;

  const staleCarts = dataRes?.ok
    ? carts.filter((c) => {
        const h = pickCartAgeHours(c);
        return h != null && h >= 24;
      }).length
    : null;

  const hotRate = dataRes?.ok ? percent(hotCarts, totalCarts) : "—";

  // Lists
  const topValue = sortDesc(carts, (c) => pickCartTotal(c) ?? 0).slice(0, 10);
  const mostItems = sortDesc(carts, (c) => pickCartItemsCount(c) ?? 0).slice(0, 10);

  // Latest details list
  const latest = sortDesc(carts, (c) => {
    const t = c?.abandonedAt || c?.updatedAt || c?.createdAt;
    const dt = t ? new Date(t) : null;
    return dt && !Number.isNaN(dt.getTime()) ? dt.getTime() : 0;
  }).slice(0, 12);

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Abandoned Carts</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time snapshot · Auto refresh every {AUTO_REFRESH_SECONDS}s</p>
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

      {/* Endpoint warning */}
      {!dataRes?.ok && (
        <div className="mb-6 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900">Abandoned carts endpoint not found.</p>
          <p className="text-sm text-amber-800 mt-1">
            Tried:
            <code className="ml-2 px-2 py-0.5 bg-white/70 rounded">/api/abandoned-carts</code>
          </p>
          <p className="text-xs text-amber-800 mt-2">
            Ensure your server mounts it like: <code className="px-2 py-0.5 bg-white/70 rounded">app.use("/api/abandoned-carts", ...)</code>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <Stat
          icon={ShoppingCart}
          label="Abandoned Carts (sample)"
          value={totalCarts != null ? formatInt(totalCarts) : "—"}
          hint={dataRes?.ok ? "From /api/abandoned-carts (limit=200)" : "Endpoint missing"}
          href="/analytics/abandoned-carts"
        />
        <Stat
          icon={Users}
          label="Unique Customers (sample)"
          value={uniqueCustomers != null ? formatInt(uniqueCustomers) : "—"}
          hint="Derived from email/phone/firebaseUID/customerId"
        />
        <Stat icon={IndianRupee} label="Total Cart Value (sample)" value={totalValue != null ? formatINR(totalValue) : "—"} hint="Sum of totals (best-effort)" />
        <Stat icon={IndianRupee} label="Avg Cart Value (sample)" value={avgCartValue != null ? formatINR(avgCartValue) : "—"} hint="total value ÷ carts" />
        <Stat icon={Timer} label="Hot Carts (≤ 2 hrs)" value={hotCarts != null ? formatInt(hotCarts) : "—"} hint={dataRes?.ok ? `Hot rate: ${hotRate}` : "Needs abandonedAt/updatedAt"} />
        <Stat icon={AlertTriangle} label="Stale Carts (≥ 24 hrs)" value={staleCarts != null ? formatInt(staleCarts) : "—"} hint="Older carts to retarget first" />
      </div>

      {/* Tables */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex-1 min-w-[360px]">
          <p className="text-sm font-semibold text-gray-900">Highest Value Carts</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Items</th>
                  <th className="py-2 pr-4 font-medium">Value</th>
                  <th className="py-2 pr-4 font-medium">Age</th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {topValue.length ? (
                  topValue.map((c, idx) => {
                    const hrs = pickCartAgeHours(c);
                    const custKey = pickCustomerKey(c);
                    const custId = pickCustomerIdForLink(c);
                    return (
                      <tr key={`${custKey}-${idx}`} className="border-b border-black/5 last:border-b-0">
                        <td className="py-3 pr-4 font-semibold">
                          {custId ? (
                            <Link href={`/customers/${encodeURIComponent(String(custId))}`} className="text-blue-700 hover:underline inline-flex items-center gap-2">
                              {custKey} <ExternalLink className="w-4 h-4" />
                            </Link>
                          ) : (
                            custKey
                          )}
                        </td>
                        <td className="py-3 pr-4">{formatInt(pickCartItemsCount(c))}</td>
                        <td className="py-3 pr-4">{formatINR(pickCartTotal(c) ?? 0)}</td>
                        <td className="py-3 pr-4">{hrs == null ? "—" : `${Math.round(hrs)}h`}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      {dataRes?.ok ? "No carts / missing fields" : "No carts endpoint"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex-1 min-w-[360px]">
          <p className="text-sm font-semibold text-gray-900">Most Items Carts</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Items</th>
                  <th className="py-2 pr-4 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {mostItems.length ? (
                  mostItems.map((c, idx) => (
                    <tr key={`${pickCustomerKey(c)}-items-${idx}`} className="border-b border-black/5 last:border-b-0">
                      <td className="py-3 pr-4 font-semibold">{pickCustomerKey(c)}</td>
                      <td className="py-3 pr-4">{formatInt(pickCartItemsCount(c))}</td>
                      <td className="py-3 pr-4">{formatINR(pickCartTotal(c) ?? 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-500">
                      {dataRes?.ok ? "No carts / missing fields" : "No carts endpoint"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Tip: make sure each abandoned cart store <code className="px-2 py-0.5 bg-gray-50 rounded">items</code>,{" "}
            <code className="px-2 py-0.5 bg-gray-50 rounded">total</code>, and{" "}
            <code className="px-2 py-0.5 bg-gray-50 rounded">abandonedAt</code>.
          </p>
        </div>
      </div>

      {/* Details list */}
      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Latest Abandoned Carts (Details)</p>
            <p className="text-xs text-gray-500 mt-1">Shows customer identifiers + items snapshot (if your API returns items).</p>
          </div>
          <Chip>
            <ShoppingCart className="w-4 h-4 text-gray-600" />
            {formatInt(latest.length)} shown
          </Chip>
        </div>

        <div className="mt-4 space-y-3">
          {latest.length ? (
            latest.map((c, idx) => {
              const cartId = c?.cartId || c?._id || `cart-${idx}`;
              const email = (c?.email || c?.customerEmail || c?.customer?.email || "").toString().trim().toLowerCase();
              const phone = (c?.phone || c?.customerPhone || c?.customer?.phone || "").toString().trim();
              const uid = (c?.firebaseUID || c?.customerFirebaseUID || c?.customer?.firebaseUID || "").toString().trim();
              const custId = pickCustomerIdForLink(c);

              const total = pickCartTotal(c);
              const itemsCount = pickCartItemsCount(c);
              const ageH = pickCartAgeHours(c);

              return (
                <div key={String(cartId)} className="rounded-2xl border border-black/5 bg-white p-4 hover:bg-gray-50 transition">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700 break-all">{String(cartId)}</span>
                        <span className="text-xs text-gray-500">
                          Abandoned: <span className="font-semibold">{fmtDate(c?.abandonedAt || c?.updatedAt || c?.createdAt)}</span>
                        </span>
                        {ageH != null ? (
                          <span className="text-xs text-gray-500">
                            · Age: <span className="font-semibold">{Math.round(ageH)}h</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1">
                          <ShoppingCart className="w-4 h-4 text-gray-600" /> Items: <span className="font-semibold">{formatInt(itemsCount)}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1">
                          <IndianRupee className="w-4 h-4 text-gray-600" /> Total: <span className="font-semibold">{total != null ? formatINR(total) : "—"}</span>
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {email ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/10 px-3 py-1 text-gray-700">
                            <Mail className="w-4 h-4 text-gray-600" /> {email}
                          </span>
                        ) : null}
                        {phone ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/10 px-3 py-1 text-gray-700">
                            <Phone className="w-4 h-4 text-gray-600" /> {phone}
                          </span>
                        ) : null}
                        {uid ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-black/10 px-3 py-1 text-gray-700">
                            <Users className="w-4 h-4 text-gray-600" /> UID: {uid}
                          </span>
                        ) : null}
                      </div>

                      <ItemMiniList cart={c} />
                    </div>

                    <div className="flex items-center gap-2">
                      {custId ? (
                        <Link
                          href={`/customers/${encodeURIComponent(String(custId))}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                        >
                          Open Customer <ExternalLink className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500">No customerId link</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-500">{dataRes?.ok ? "No abandoned carts found." : "No carts endpoint."}</div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { label: "Overview", href: "/analytics/overview" },
          { label: "Sales", href: "/analytics/sales" },
          { label: "Funnel", href: "/analytics/funnel" },
          { label: "Traffic", href: "/analytics/traffic" },
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
