"use client";

import { useEffect, useMemo, useState } from "react";
import CategoryMultiSelect from "@/components/product/CategoryMultiSelect.jsx"; // ✅ adjust import
import { TrendingUp, ShoppingBag, Heart, Eye, Search, BarChart3 } from "lucide-react";

/**
 * ProductAnalyticsDashboard
 *
 * Uses:
 * - GET /api/products?limit=200&page=1&category=a,b,c&search=...&sort=...
 * - GET /api/categories
 *
 * Assumes:
 * - product.analytics = { views, purchases, wishlistCount, cartAdds, searchAppearances }
 * - product.categories = [string]
 */
export default function ProductAnalyticsDashboard({
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
}) {
  const [loading, setLoading] = useState(false);

  // Products
  const [products, setProducts] = useState([]);

  // Filters
  const [categories, setCategories] = useState(["all-clothing", "new-arrivals"]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("views_desc");

  // Pagination (if needed)
  const [page, setPage] = useState(1);
  const limit = 200;

  /* ==========================================================
     FETCH PRODUCTS
  ========================================================== */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));

        if (categories?.length) params.set("category", categories.join(","));
        if (search?.trim()) params.set("search", search.trim());

        // We'll handle sorting locally, but can pass if you want:
        // params.set("sort", "popularity") etc.

        const res = await fetch(`${apiUrl}/api/products?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        setProducts(list);
      } catch (e) {
        console.error("❌ Failed to fetch products analytics", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [apiUrl, page, categories, search]);

  /* ==========================================================
     NORMALIZE / SAFE READ ANALYTICS
  ========================================================== */
  const withAnalytics = useMemo(() => {
    return products.map((p) => {
      const a = p.analytics || {};
      return {
        ...p,
        analytics: {
          views: Number(a.views || 0),
          purchases: Number(a.purchases || 0),
          wishlistCount: Number(a.wishlistCount || 0),
          cartAdds: Number(a.cartAdds || 0),
          searchAppearances: Number(a.searchAppearances || 0),
        },
      };
    });
  }, [products]);

  /* ==========================================================
     OVERALL TOTALS
  ========================================================== */
  const totals = useMemo(() => {
    return withAnalytics.reduce(
      (acc, p) => {
        acc.views += p.analytics.views;
        acc.purchases += p.analytics.purchases;
        acc.wishlist += p.analytics.wishlistCount;
        acc.cartAdds += p.analytics.cartAdds;
        acc.searchAppearances += p.analytics.searchAppearances;
        return acc;
      },
      {
        views: 0,
        purchases: 0,
        wishlist: 0,
        cartAdds: 0,
        searchAppearances: 0,
      }
    );
  }, [withAnalytics]);

  /* ==========================================================
     CATEGORY-WISE BREAKDOWN
  ========================================================== */
  const categoryAnalytics = useMemo(() => {
    const map = {};

    for (const p of withAnalytics) {
      const cats = Array.isArray(p.categories) ? p.categories : [];
      for (const c of cats) {
        if (!c) continue;

        map[c] ??= {
          category: c,
          products: 0,
          views: 0,
          purchases: 0,
          wishlist: 0,
          cartAdds: 0,
          searchAppearances: 0,
        };

        map[c].products += 1;
        map[c].views += p.analytics.views;
        map[c].purchases += p.analytics.purchases;
        map[c].wishlist += p.analytics.wishlistCount;
        map[c].cartAdds += p.analytics.cartAdds;
        map[c].searchAppearances += p.analytics.searchAppearances;
      }
    }

    return Object.values(map).sort((a, b) => b.views - a.views);
  }, [withAnalytics]);

  /* ==========================================================
     SORT PRODUCTS
  ========================================================== */
  const sortedProducts = useMemo(() => {
    const list = [...withAnalytics];

    const sortMap = {
      views_desc: (a, b) => b.analytics.views - a.analytics.views,
      purchases_desc: (a, b) => b.analytics.purchases - a.analytics.purchases,
      wishlist_desc: (a, b) => b.analytics.wishlistCount - a.analytics.wishlistCount,
      cart_desc: (a, b) => b.analytics.cartAdds - a.analytics.cartAdds,
      search_desc: (a, b) => b.analytics.searchAppearances - a.analytics.searchAppearances,
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      price_desc: (a, b) => Number(b.price || 0) - Number(a.price || 0),
      price_asc: (a, b) => Number(a.price || 0) - Number(b.price || 0),
    };

    return list.sort(sortMap[sort] || sortMap.views_desc);
  }, [withAnalytics, sort]);

  const topProducts = sortedProducts.slice(0, 15);

  /* ==========================================================
     UI HELPERS
  ========================================================== */
  const StatCard = ({ icon: Icon, label, value }) => (
    <div className="rounded-2xl bg-white shadow p-4 flex gap-3 items-center">
      <div className="p-3 rounded-xl bg-gray-100">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold">{value.toLocaleString()}</p>
      </div>
    </div>
  );

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
          Track views, purchases, wishlist, cart adds and search appearances across products + categories.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          Loading analytics…
        </div>
      )}
    </div>

    {/* Filters */}
    <div className="rounded-3xl bg-white/80 backdrop-blur border border-gray-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] p-5 space-y-4">
      <div className="grid md:grid-cols-3 gap-5">
        {/* Categories */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Categories
          </p>
          <CategoryMultiSelect value={categories} onChange={setCategories} />
        </div>

        {/* Search */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Search Product
          </p>

          <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-blue-600 transition">
            <Search size={16} className="text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Sort Top Products
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
            <option value="newest">Newest</option>
            <option value="price_desc">Price High → Low</option>
            <option value="price_asc">Price Low → High</option>
          </select>
        </div>
      </div>
    </div>

    {/* Totals */}
    <div className="grid md:grid-cols-5 gap-4">
      <StatCard icon={Eye} label="Total Views" value={totals.views} accent="blue" />
      <StatCard icon={ShoppingBag} label="Total Purchases" value={totals.purchases} accent="blue" />
      <StatCard icon={Heart} label="Total Wishlist" value={totals.wishlist} accent="blue" />
      <StatCard icon={TrendingUp} label="Cart Adds" value={totals.cartAdds} accent="blue" />
      <StatCard icon={Search} label="Search Appearances" value={totals.searchAppearances} accent="blue" />
    </div>

    {/* Category breakdown */}
    <div className="rounded-3xl bg-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Category Breakdown</h2>
        <p className="text-xs text-gray-500">Top 50 categories</p>
      </div>

      <div className="overflow-auto rounded-2xl ring-1 ring-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-3 px-4 font-medium">Category</th>
              <th className="py-3 px-4 font-medium">Products</th>
              <th className="py-3 px-4 font-medium">Views</th>
              <th className="py-3 px-4 font-medium">Purchases</th>
              <th className="py-3 px-4 font-medium">Wishlist</th>
              <th className="py-3 px-4 font-medium">Cart Adds</th>
              <th className="py-3 px-4 font-medium">Search Appearances</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {categoryAnalytics.slice(0, 50).map((row) => (
              <tr
                key={row.category}
                className="hover:bg-gray-50/70 transition"
              >
                <td className="py-3 px-4 font-medium text-gray-900">
                  {row.category}
                </td>
                <td className="py-3 px-4 text-gray-700">{row.products}</td>
                <td className="py-3 px-4 text-gray-700">{row.views}</td>
                <td className="py-3 px-4 text-gray-700">{row.purchases}</td>
                <td className="py-3 px-4 text-gray-700">{row.wishlist}</td>
                <td className="py-3 px-4 text-gray-700">{row.cartAdds}</td>
                <td className="py-3 px-4 text-gray-700">{row.searchAppearances}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && categoryAnalytics.length === 0 && (
        <p className="text-sm text-gray-500 mt-3">No analytics found</p>
      )}
    </div>

    {/* Top Products */}
    <div className="rounded-3xl bg-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
        <p className="text-xs text-gray-500">Sorted by: {sort.replace("_", " ")}</p>
      </div>

      <div className="overflow-auto rounded-2xl ring-1 ring-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-3 px-4 font-medium">Product</th>
              <th className="py-3 px-4 font-medium">Price</th>
              <th className="py-3 px-4 font-medium">Views</th>
              <th className="py-3 px-4 font-medium">Purchases</th>
              <th className="py-3 px-4 font-medium">Wishlist</th>
              <th className="py-3 px-4 font-medium">Cart Adds</th>
              <th className="py-3 px-4 font-medium">Search</th>
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

                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{p.title}</span>
                      <span className="text-xs text-gray-500">{p.slug}</span>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4 text-gray-700">
                  ₹{Number(p.price || 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-gray-700">{p.analytics.views}</td>
                <td className="py-3 px-4 text-gray-700">{p.analytics.purchases}</td>
                <td className="py-3 px-4 text-gray-700">{p.analytics.wishlistCount}</td>
                <td className="py-3 px-4 text-gray-700">{p.analytics.cartAdds}</td>
                <td className="py-3 px-4 text-gray-700">{p.analytics.searchAppearances}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && topProducts.length === 0 && (
        <p className="text-sm text-gray-500 mt-3">No products found</p>
      )}
    </div>

    {/* Pagination */}
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="px-4 py-2 rounded-2xl bg-gray-50 text-sm text-gray-900 ring-1 ring-gray-100 hover:bg-gray-100 transition"
      >
        Prev
      </button>

      <p className="text-sm text-gray-500">Page {page}</p>

      <button
        type="button"
        onClick={() => setPage((p) => p + 1)}
        className="px-4 py-2 rounded-2xl bg-gray-50 text-sm text-gray-900 ring-1 ring-gray-100 hover:bg-gray-100 transition"
      >
        Next
      </button>
    </div>
  </div>
);

}
