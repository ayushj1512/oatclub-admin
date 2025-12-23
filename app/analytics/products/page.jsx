import React from "react";
import Link from "next/link";
import {
  Layers,
  Eye,
  ShoppingCart,
  Heart,
  BadgeDollarSign,
  ArrowUpRight,
} from "lucide-react";
import ProductMetricsGraph from "@/components/analytics/ProductMetricsGraph";
import ProductEventsPie from "@/components/analytics/ProductEventsPie";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
async function safeJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    return { ok: res.ok, json: text ? JSON.parse(text) : null };
  } catch {
    return { ok: false, json: null };
  }
}

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const format = (v) => new Intl.NumberFormat("en-IN").format(n(v));

const analyticsOf = (p) => ({
  views: n(p?.analytics?.views),
  cart: n(p?.analytics?.cartAdds),
  wishlist: n(p?.analytics?.wishlistCount),
  purchases: n(p?.analytics?.purchases),
});

const totalEventsOf = (a) =>
  a.views + a.cart + a.wishlist + a.purchases;

const getProducts = (payload) =>
  Array.isArray(payload?.products) ? payload.products : [];

const sortTop = (list, key) =>
  [...list]
    .sort((a, b) => analyticsOf(b)[key] - analyticsOf(a)[key])
    .slice(0, 5);

/* -------------------------------------------------------
   UI PRIMITIVES
------------------------------------------------------- */
const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 transition hover:shadow-md ${className}`}
  >
    {children}
  </div>
);

const Metric = ({ icon: Icon, label, value, subtle }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 font-bold ${
          subtle ? "text-xl" : "text-2xl"
        } text-gray-900`}
      >
        {format(value)}
      </p>
    </div>
    <div className="w-11 h-11 rounded-xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center">
      <Icon className="w-5 h-5 text-gray-700" />
    </div>
  </div>
);

const TopList = ({ title, rows, metric }) => (
  <Card>
    <p className="text-sm font-semibold text-gray-900">{title}</p>

    <ul className="mt-4 divide-y divide-black/5">
      {rows.map((p, i) => {
        const a = analyticsOf(p);
        return (
          <li
            key={p._id || p.slug || i}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold text-gray-400 w-5">
                {i + 1}
              </span>

              <div className="min-w-0">
                <Link
                  href={`/analytics/products/${p._id}`}
                  className="block text-sm font-medium text-gray-900 truncate hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-xs text-gray-500">
                  ₹{format(p.price)}
                </p>
              </div>
            </div>

            <span className="text-sm font-semibold text-gray-900">
              {format(a[metric])}
            </span>
          </li>
        );
      })}
    </ul>

    <div className="mt-4 flex justify-end">
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        View details <ArrowUpRight className="w-3 h-3" />
      </span>
    </div>
  </Card>
);




/* -------------------------------------------------------
   PAGE
------------------------------------------------------- */
export default async function AnalyticsProductsPage() {
  if (!API) {
    return <div className="p-6">API URL not configured</div>;
  }

  const res = await safeJson(`${API}/api/products?limit=500&page=1`);
  const products = getProducts(res.json);

  /* ---------------- TOTALS ---------------- */
  const totals = products.reduce(
    (acc, p) => {
      const a = analyticsOf(p);
      acc.views += a.views;
      acc.cart += a.cart;
      acc.wishlist += a.wishlist;
      acc.purchases += a.purchases;
      acc.events += totalEventsOf(a);
      return acc;
    },
    { views: 0, cart: 0, wishlist: 0, purchases: 0, events: 0 }
  );

  const graphData = [
  { name: "Views", value: totals.views },
  { name: "Cart Adds", value: totals.cart },
  { name: "Wishlist", value: totals.wishlist },
  { name: "Purchases", value: totals.purchases },
];

  /* ---------------- TOP 5 ---------------- */
  const topViews = sortTop(products, "views");
  const topCart = sortTop(products, "cart");
  const topWishlist = sortTop(products, "wishlist");
  const topPurchases = sortTop(products, "purchases");

  return (
   <div className="w-full max-w-[1440px] mx-auto px-6 md:px-8 lg:px-10 py-8">
  {/* ================= HEADER ================= */}
  <div className="mb-10">
    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
      Product Analytics
    </h1>
    <p className="text-sm md:text-base text-gray-500 mt-2 max-w-2xl">
      Engagement & intent signals across all products — views, cart activity,
      wishlist behavior, and purchases.
    </p>
  </div>

  {/* ================= GRAPHS ================= */}
  <section className="mb-12">
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
      <ProductMetricsGraph data={graphData} />
      <ProductEventsPie data={graphData} />
    </div>
  </section>

  {/* ================= TOTAL EVENTS (HERO) ================= */}
  <section className="mb-12">
    <Card className="p-6 md:p-7 lg:p-8">
      {/* Main metric */}
      <div className="mb-8">
        <Metric
          icon={Layers}
          label="Total Events"
          value={totals.events}
        />
      </div>

      {/* Sub-metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-6">
        <Metric
          icon={Eye}
          label="Views"
          value={totals.views}
          subtle
        />
        <Metric
          icon={ShoppingCart}
          label="Cart Adds"
          value={totals.cart}
          subtle
        />
        <Metric
          icon={Heart}
          label="Wishlist Adds"
          value={totals.wishlist}
          subtle
        />
        <Metric
          icon={BadgeDollarSign}
          label="Purchases"
          value={totals.purchases}
          subtle
        />
      </div>
    </Card>
  </section>

  {/* ================= TOP PRODUCTS ================= */}
  <section>
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Top Performing Products
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        Products ranked by key engagement metrics
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-7">
      <TopList
        title="Top 5 · Most Viewed"
        rows={topViews}
        metric="views"
      />
      <TopList
        title="Top 5 · Added to Cart"
        rows={topCart}
        metric="cart"
      />
      <TopList
        title="Top 5 · Wishlisted"
        rows={topWishlist}
        metric="wishlist"
      />
      <TopList
        title="Top 5 · Purchased"
        rows={topPurchases}
        metric="purchases"
      />
    </div>
  </section>
</div>

  );
}
