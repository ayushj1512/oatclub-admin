"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CategoryMultiSelect from "@/components/product/CategoryMultiSelect.jsx";
import {
  BarChart3,
  Eye,
  ShoppingBag,
  Heart,
  TrendingUp,
  Search,
  Star,
  IndianRupee,
  Layers,
  Percent,
  LineChart,
  Hash,
} from "lucide-react";

/**
 * ProductAnalyticsDashboard (handles 200+ products)
 *
 * ✅ Fetches ALL pages (backend caps limit <= 200)
 * ✅ No default categories (starts empty => loads all)
 * ✅ Category analytics section removed
 * ✅ Product link removed
 * ✅ ProductCode search option added (uses your controller's productCode filter path)
 *
 * API:
 * - GET /api/products?page=1&limit=200&category=a,b,c&search=...&productCode=... (or code=... )
 * Controller notes:
 * - applyProductCodeFilter(filters, { q, title, productCode, code, search });
 */

const PAGE_LIMIT = 200; // backend cap
const MAX_TOTAL_GUARD = 5000; // safety

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const s = (v) => String(v ?? "");
const trim = (v) => s(v).trim();

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toPercent(v) {
  const n = toNumber(v);
  if (n <= 1) return n * 100;
  return clamp(n, 0, 100);
}
function fmtINR(n) {
  const value = toNumber(n);
  return `₹${value.toLocaleString("en-IN")}`;
}
function safeDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ProductAnalyticsDashboard({
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
}) {
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  // data
  const [products, setProducts] = useState([]);

  // meta/progress
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [pages, setPages] = useState(0);

  // filters
  const [categories, setCategories] = useState([]); // [] => all
  const [search, setSearch] = useState("");
  const [productCode, setProductCode] = useState(""); // ✅ NEW
  const [sort, setSort] = useState("views_desc");
  const [topCount, setTopCount] = useState(50);

  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedCode = useDebouncedValue(productCode, 350);

  /* ==========================================================
     FETCH ALL (paged) - handles > 200
  ========================================================== */
  useEffect(() => {
    let alive = true;

    const loadAllPages = async () => {
      try {
        setLoading(true);
        setProducts([]);
        setTotal(0);
        setLoaded(0);
        setPages(0);

        abortRef.current?.abort?.();
        const controller = new AbortController();
        abortRef.current = controller;

        const baseParams = new URLSearchParams();
        baseParams.set("limit", String(PAGE_LIMIT));

        // categories
        if (categories?.length) baseParams.set("category", categories.join(","));

        // normal search (title/text etc)
        if (trim(debouncedSearch)) baseParams.set("search", trim(debouncedSearch));

        // ✅ product code search (controller supports productCode / code)
        if (trim(debouncedCode)) baseParams.set("productCode", trim(debouncedCode));

        // page 1
        const page1 = new URLSearchParams(baseParams);
        page1.set("page", "1");

        const res1 = await fetch(`${apiUrl}/api/products?${page1.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data1 = await res1.json().catch(() => null);

        const list1 = Array.isArray(data1?.products)
          ? data1.products
          : Array.isArray(data1)
          ? data1
          : [];

        const totalCount = toNumber(data1?.total) || list1.length;
        const totalPages = toNumber(data1?.pages) || 1;

        if (!alive) return;

        const guardedTotal = Math.min(totalCount, MAX_TOTAL_GUARD);
        setTotal(guardedTotal);
        setPages(totalPages);

        let all = list1;
        setProducts(all);
        setLoaded(all.length);

        // backward compatible if pages/total not returned
        if (!toNumber(data1?.pages) && !toNumber(data1?.total)) return;

        const maxPages = Math.ceil(guardedTotal / PAGE_LIMIT);

        for (let p = 2; p <= Math.min(totalPages, maxPages); p++) {
          const qp = new URLSearchParams(baseParams);
          qp.set("page", String(p));

          const resp = await fetch(`${apiUrl}/api/products?${qp.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const d = await resp.json().catch(() => null);

          const chunk = Array.isArray(d?.products)
            ? d.products
            : Array.isArray(d)
            ? d
            : [];

          if (!alive) return;

          all = all.concat(chunk);
          if (all.length > guardedTotal) all = all.slice(0, guardedTotal);

          setProducts(all);
          setLoaded(all.length);

          if (all.length >= guardedTotal) break;
          if (chunk.length === 0) break;
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.error("❌ Failed to fetch products analytics", e);
        if (!alive) return;
        setProducts([]);
        setTotal(0);
        setLoaded(0);
        setPages(0);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAllPages();

    return () => {
      alive = false;
      abortRef.current?.abort?.();
    };
  }, [apiUrl, categories, debouncedSearch, debouncedCode]);

  /* ==========================================================
     NORMALIZE ANALYTICS
  ========================================================== */
  const withAnalytics = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return list.map((p) => {
      const a = p?.analytics || {};
      const price = toNumber(p?.price);

      const views = toNumber(a.views);
      const purchases = toNumber(a.purchases);
      const wishlistCount = toNumber(a.wishlistCount);
      const cartAdds = toNumber(a.cartAdds);
      const searchAppearances = toNumber(a.searchAppearances);

      const revenue = toNumber(a.revenue);
      const avgDwellSeconds = toNumber(a.avgDwellSeconds);
      const conversionRate = toPercent(a.conversionRate);

      const last7dViews = toNumber(a.last7dViews);
      const last7dPurchases = toNumber(a.last7dPurchases);
      const last30dViews = toNumber(a.last30dViews);
      const last30dPurchases = toNumber(a.last30dPurchases);

      const searchToViewRate =
        searchAppearances > 0 ? (views / searchAppearances) * 100 : 0;
      const viewToCartRate = views > 0 ? (cartAdds / views) * 100 : 0;
      const viewToPurchaseRate = views > 0 ? (purchases / views) * 100 : 0;

      const estRevenue = revenue > 0 ? revenue : purchases * price;

      return {
        ...p,
        price,
        createdAtDate: safeDate(p?.createdAt),
        analytics: {
          views,
          purchases,
          wishlistCount,
          cartAdds,
          searchAppearances,
          revenue,
          avgDwellSeconds,
          conversionRate,
          last7dViews,
          last7dPurchases,
          last30dViews,
          last30dPurchases,
          estRevenue,
          searchToViewRate,
          viewToCartRate,
          viewToPurchaseRate,
        },
      };
    });
  }, [products]);

  /* ==========================================================
     TOTALS
  ========================================================== */
  const totals = useMemo(() => {
    const base = withAnalytics.reduce(
      (acc, p) => {
        const a = p.analytics;

        acc.products += 1;
        acc.views += a.views;
        acc.purchases += a.purchases;
        acc.wishlist += a.wishlistCount;
        acc.cartAdds += a.cartAdds;
        acc.searchAppearances += a.searchAppearances;

        acc.revenue += a.revenue;
        acc.estRevenue += a.estRevenue;

        acc.avgDwellSecondsSum += a.avgDwellSeconds;
        acc.avgDwellSecondsCount += a.avgDwellSeconds > 0 ? 1 : 0;

        acc.last7dViews += a.last7dViews;
        acc.last7dPurchases += a.last7dPurchases;
        acc.last30dViews += a.last30dViews;
        acc.last30dPurchases += a.last30dPurchases;

        return acc;
      },
      {
        products: 0,
        views: 0,
        purchases: 0,
        wishlist: 0,
        cartAdds: 0,
        searchAppearances: 0,
        revenue: 0,
        estRevenue: 0,
        avgDwellSecondsSum: 0,
        avgDwellSecondsCount: 0,
        last7dViews: 0,
        last7dPurchases: 0,
        last30dViews: 0,
        last30dPurchases: 0,
      }
    );

    const overallViewToPurchaseRate =
      base.views > 0 ? (base.purchases / base.views) * 100 : 0;
    const overallViewToCartRate =
      base.views > 0 ? (base.cartAdds / base.views) * 100 : 0;
    const overallSearchToViewRate =
      base.searchAppearances > 0
        ? (base.views / base.searchAppearances) * 100
        : 0;

    const avgDwellSeconds =
      base.avgDwellSecondsCount > 0
        ? base.avgDwellSecondsSum / base.avgDwellSecondsCount
        : 0;

    const avgOrderValue =
      base.purchases > 0 ? base.estRevenue / base.purchases : 0;

    return {
      ...base,
      overallViewToPurchaseRate,
      overallViewToCartRate,
      overallSearchToViewRate,
      avgDwellSeconds,
      avgOrderValue,
    };
  }, [withAnalytics]);

  /* ==========================================================
     SORT + TOP
  ========================================================== */
  const sortedProducts = useMemo(() => {
    const list = [...withAnalytics];

    const sortMap = {
      views_desc: (a, b) => b.analytics.views - a.analytics.views,
      purchases_desc: (a, b) => b.analytics.purchases - a.analytics.purchases,
      wishlist_desc: (a, b) =>
        b.analytics.wishlistCount - a.analytics.wishlistCount,
      cart_desc: (a, b) => b.analytics.cartAdds - a.analytics.cartAdds,
      search_desc: (a, b) =>
        b.analytics.searchAppearances - a.analytics.searchAppearances,

      revenue_desc: (a, b) => b.analytics.estRevenue - a.analytics.estRevenue,
      conv_desc: (a, b) =>
        b.analytics.viewToPurchaseRate - a.analytics.viewToPurchaseRate,
      atc_rate_desc: (a, b) =>
        b.analytics.viewToCartRate - a.analytics.viewToCartRate,
      search_to_view_desc: (a, b) =>
        b.analytics.searchToViewRate - a.analytics.searchToViewRate,

      newest: (a, b) => {
        const da = a.createdAtDate?.getTime?.() ?? 0;
        const db = b.createdAtDate?.getTime?.() ?? 0;
        return db - da;
      },

      price_desc: (a, b) => b.price - a.price,
      price_asc: (a, b) => a.price - b.price,
    };

    return list.sort(sortMap[sort] || sortMap.views_desc);
  }, [withAnalytics, sort]);

  const topProducts = useMemo(() => {
    const count = Math.max(10, Math.min(200, toNumber(topCount) || 50));
    return sortedProducts.slice(0, count);
  }, [sortedProducts, topCount]);

  /* ==========================================================
     UI
  ========================================================== */
  const StatCard = ({ icon: Icon, label, value, sub }) => (
    <div className="rounded-2xl bg-white shadow p-4 flex gap-3 items-center">
      <div className="p-3 rounded-xl bg-gray-100">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold truncate">{value}</p>
        {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );

  const MetricPill = ({ label, value }) => (
    <div className="px-3 py-2 rounded-2xl bg-gray-50 ring-1 ring-gray-100 flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );

  const loadedLabel =
    total > 0
      ? `${loaded.toLocaleString()} / ${total.toLocaleString()}`
      : `${loaded.toLocaleString()}`;

  const clearCode = () => setProductCode("");
  const clearSearch = () => setSearch("");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gray-900 text-white shadow-sm">
              <BarChart3 size={18} />
            </span>
            Product Analytics
          </h1>
          <p className="text-sm text-gray-500 max-w-2xl">
            Views, purchases, wishlist, cart, search — plus conversion, revenue and velocity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Loading… <span className="tabular-nums">{loadedLabel}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Loaded: <span className="font-medium tabular-nums">{loadedLabel}</span>
              {pages ? <span className="text-gray-400"> · pages: {pages}</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-gray-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] p-5 space-y-4">
        <div className="grid md:grid-cols-4 gap-5">
          {/* Categories */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Categories
            </p>
            <CategoryMultiSelect value={categories} onChange={setCategories} />
            <p className="text-[11px] text-gray-400">
              Leave empty to load all categories.
            </p>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Search
              </p>
              {trim(search) ? (
                <button
                  onClick={clearSearch}
                  className="text-[11px] text-gray-500 hover:text-gray-900"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-blue-600 transition">
              <Search size={16} className="text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title / text / SKU…"
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            <p className="text-[11px] text-gray-400">Debounced for speed.</p>
          </div>

          {/* ✅ Product Code Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Product Code
              </p>
              {trim(productCode) ? (
                <button
                  onClick={clearCode}
                  className="text-[11px] text-gray-500 hover:text-gray-900"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-blue-600 transition">
              <Hash size={16} className="text-gray-500" />
              <input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="e.g. 00042"
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            <p className="text-[11px] text-gray-400">
              Exact / numeric code (uses <span className="font-medium">productCode</span> filter).
            </p>
          </div>

          {/* Sort + TopCount */}
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sort
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 ring-1 ring-gray-100 outline-none focus:ring-2 focus:ring-blue-600 transition"
              >
                <option value="views_desc">Most Views</option>
                <option value="purchases_desc">Most Purchases</option>
                <option value="wishlist_desc">Most Wishlist</option>
                <option value="cart_desc">Most Cart Adds</option>
                <option value="search_desc">Most Search Appearances</option>

                <option value="revenue_desc">Highest Revenue (est.)</option>
                <option value="conv_desc">Best Conversion (Views → Purchases)</option>
                <option value="atc_rate_desc">Best ATC Rate (Views → Cart)</option>
                <option value="search_to_view_desc">Best Search → View Rate</option>

                <option value="newest">Newest</option>
                <option value="price_desc">Price High → Low</option>
                <option value="price_asc">Price Low → High</option>
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Top
              </p>
              <select
                value={topCount}
                onChange={(e) => setTopCount(Number(e.target.value))}
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 ring-1 ring-gray-100 outline-none focus:ring-2 focus:ring-blue-600 transition"
              >
                <option value={15}>Top 15</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
                <option value={200}>Top 200</option>
              </select>
            </div>
          </div>
        </div>

        {(trim(search) || trim(productCode) || categories.length) ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {categories.length ? (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                Categories: {categories.length}
              </span>
            ) : null}
            {trim(search) ? (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                Search: “{trim(search)}”
              </span>
            ) : null}
            {trim(productCode) ? (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                ProductCode: {trim(productCode)}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Filters empty → loading all products.
          </p>
        )}
      </div>

      {/* Totals (Core) */}
      <div className="grid md:grid-cols-6 gap-4">
        <StatCard icon={Layers} label="Products Loaded" value={totals.products.toLocaleString()} />
        <StatCard icon={Eye} label="Total Views" value={totals.views.toLocaleString()} />
        <StatCard icon={ShoppingBag} label="Total Purchases" value={totals.purchases.toLocaleString()} />
        <StatCard icon={Heart} label="Total Wishlist" value={totals.wishlist.toLocaleString()} />
        <StatCard icon={TrendingUp} label="Cart Adds" value={totals.cartAdds.toLocaleString()} />
        <StatCard icon={Search} label="Search Appearances" value={totals.searchAppearances.toLocaleString()} />
      </div>

      {/* Totals (More) */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Estimated Revenue"
          value={fmtINR(totals.estRevenue)}
          sub={totals.revenue > 0 ? "Using backend revenue" : "Purchases × Price fallback"}
        />
        <StatCard
          icon={Percent}
          label="Conversion"
          value={`${totals.overallViewToPurchaseRate.toFixed(2)}%`}
          sub="Views → Purchases"
        />
        <StatCard
          icon={LineChart}
          label="ATC Rate"
          value={`${totals.overallViewToCartRate.toFixed(2)}%`}
          sub="Views → Cart Adds"
        />
        <StatCard
          icon={Star}
          label="Avg Order Value"
          value={fmtINR(totals.avgOrderValue)}
          sub="Est. Revenue / Purchases"
        />
      </div>

      {/* Velocity */}
      <div className="rounded-3xl bg-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Velocity (Rolling Windows)
          </h2>
          <p className="text-xs text-gray-500">Optional analytics fields</p>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <MetricPill label="Last 7d Views" value={totals.last7dViews.toLocaleString()} />
          <MetricPill label="Last 7d Purchases" value={totals.last7dPurchases.toLocaleString()} />
          <MetricPill label="Last 30d Views" value={totals.last30dViews.toLocaleString()} />
          <MetricPill label="Last 30d Purchases" value={totals.last30dPurchases.toLocaleString()} />
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-3xl bg-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium">{topProducts.length}</span> of{" "}
              <span className="font-medium">{sortedProducts.length}</span> · Sorted by{" "}
              {sort.replaceAll("_", " ")}
            </p>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="py-3 px-4 font-medium">Product</th>
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Views</th>
                <th className="py-3 px-4 font-medium">Purchases</th>
                <th className="py-3 px-4 font-medium">Wishlist</th>
                <th className="py-3 px-4 font-medium">Cart</th>
                <th className="py-3 px-4 font-medium">Search</th>
                <th className="py-3 px-4 font-medium">Conv%</th>
                <th className="py-3 px-4 font-medium">ATC%</th>
                <th className="py-3 px-4 font-medium">Revenue (est.)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {topProducts.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {p.thumbnail ? (
                        <img
                          src={p.thumbnail}
                          alt={p.title}
                          className="w-10 h-10 rounded-2xl object-cover bg-gray-100 ring-1 ring-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 ring-1 ring-gray-100" />
                      )}

                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-900 truncate">
                          {p.title}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {p.slug}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-gray-700 font-medium tabular-nums">
                    {p.productCode || "-"}
                  </td>

                  <td className="py-3 px-4 text-gray-700">{fmtINR(p.price)}</td>
                  <td className="py-3 px-4 text-gray-700">{p.analytics.views}</td>
                  <td className="py-3 px-4 text-gray-700">{p.analytics.purchases}</td>
                  <td className="py-3 px-4 text-gray-700">{p.analytics.wishlistCount}</td>
                  <td className="py-3 px-4 text-gray-700">{p.analytics.cartAdds}</td>
                  <td className="py-3 px-4 text-gray-700">{p.analytics.searchAppearances}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {p.analytics.viewToPurchaseRate.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {p.analytics.viewToCartRate.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {fmtINR(p.analytics.estRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && topProducts.length === 0 && (
          <p className="text-sm text-gray-500 mt-3">No products found</p>
        )}
      </div>
    </div>
  );
}