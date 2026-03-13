"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  CheckSquare,
  Square,
  Save,
  RefreshCcw,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const safe = (v) => (v == null ? "" : String(v));
const money = (v) => {
  const n = Number(v || 0);
  return `₹${Number.isFinite(n) ? n.toLocaleString("en-IN") : "0"}`;
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-3xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

export default function TrendingProductsPage() {
  const {
    products,
    loading,
    saving,
    fetchAllProducts,
    bulkMarkTrendingByCodes,
  } = useAdminProductStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedCodes, setSelectedCodes] = useState([]);

  useEffect(() => {
    fetchAllProducts({ limit: 250, sort: "newest" });
  }, [fetchAllProducts]);

  const categoryOptions = useMemo(() => {
    const set = new Set();

    (products || []).forEach((p) => {
      const cats = Array.isArray(p?.categories) ? p.categories : [];
      cats.forEach((c) => {
        const val = safe(c).trim();
        if (val) set.add(val);
      });
    });

    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = safe(search).trim().toLowerCase();

    return (products || []).filter((p) => {
      const title = safe(p?.title).toLowerCase();
      const code = safe(p?.productCode).toLowerCase();
      const cats = Array.isArray(p?.categories)
        ? p.categories.map((c) => safe(c).toLowerCase())
        : [];

      const matchesSearch =
        !q || title.includes(q) || code.includes(q);

      const matchesCategory =
        category === "all" || cats.includes(category.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const filteredCodes = useMemo(
    () =>
      filteredProducts
        .map((p) => safe(p?.productCode).trim())
        .filter(Boolean),
    [filteredProducts]
  );

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const allFilteredSelected =
    filteredCodes.length > 0 &&
    filteredCodes.every((code) => selectedSet.has(code));

  const selectedCount = selectedCodes.length;

  const toggleOne = (productCode) => {
    const code = safe(productCode).trim();
    if (!code) return;

    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (!filteredCodes.length) return;

    setSelectedCodes((prev) => {
      const prevSet = new Set(prev);

      if (allFilteredSelected) {
        return prev.filter((code) => !filteredCodes.includes(code));
      }

      filteredCodes.forEach((code) => prevSet.add(code));
      return Array.from(prevSet);
    });
  };

  const clearSelection = () => setSelectedCodes([]);

  const handleSave = async () => {
    if (!selectedCodes.length) return;

    try {
      await bulkMarkTrendingByCodes(selectedCodes, true);

      setSelectedCodes([]);
      await fetchAllProducts({ limit: 250, sort: "newest" });
    } catch (e) {
      console.error(e);
    }
  };

  const trendingCountInFiltered = filteredProducts.filter((p) => p?.isTrending).length;

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4 md:p-6">
      <div className="mx-auto  space-y-6">
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-sm text-white">
                <Sparkles className="h-4 w-4" />
                Trending Products
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
                Mark products as Trending
              </h1>

              <p className="mt-2 text-sm text-neutral-600">
                Search by product code or name, filter by category, select the products,
                and save to mark them as trending.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-neutral-100 text-neutral-700">
                Total: {products?.length || 0}
              </Badge>
              <Badge className="bg-neutral-100 text-neutral-700">
                Filtered: {filteredProducts.length}
              </Badge>
              <Badge className="bg-neutral-100 text-neutral-700">
                Already Trending: {trendingCountInFiltered}
              </Badge>
              <Badge className="bg-black text-white">
                Selected: {selectedCount}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.7fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product code or title..."
                className="h-11 w-full rounded-2xl border-0 bg-neutral-100 pl-10 pr-4 text-sm outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-black/10"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-2xl border-0 bg-neutral-100 px-4 text-sm outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-black/10"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All categories" : cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Unselect filtered
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Select filtered
                </>
              )}
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={!selectedCount}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>

            <button
              type="button"
              onClick={() => fetchAllProducts({ limit: 250, sort: "newest" })}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-black/5 px-4 py-3 text-sm text-neutral-600 md:px-5">
            {loading
              ? "Loading products..."
              : filteredProducts.length
                ? `${filteredProducts.length} products found`
                : "No products found"}
          </div>

          <div className="max-h-[68vh] overflow-auto">
            {loading ? (
              <div className="space-y-3 p-4 md:p-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-neutral-100"
                  />
                ))}
              </div>
            ) : !filteredProducts.length ? (
              <div className="p-10 text-center text-sm text-neutral-500">
                No matching products found.
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {filteredProducts.map((product) => {
                  const code = safe(product?.productCode).trim();
                  const isChecked = selectedSet.has(code);
                  const categories = Array.isArray(product?.categories)
                    ? product.categories
                    : [];

                  return (
                    <label
                      key={product?._id || code}
                      className={`flex cursor-pointer items-start gap-4 px-4 py-4 transition md:px-5 ${
                        isChecked ? "bg-black/[0.03]" : "bg-white"
                      }`}
                    >
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(code)}
                          className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                        />
                      </div>

                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
                        {product?.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.thumbnail}
                            alt={product?.title || "Product"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-black md:text-base">
                                {product?.title || "Untitled Product"}
                              </h3>

                              {product?.isTrending && (
                                <Badge className="bg-black text-white">
                                  Trending
                                </Badge>
                              )}

                              {product?.isBestSeller && (
                                <Badge className="bg-neutral-100 text-neutral-700">
                                  Best Seller
                                </Badge>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 md:text-sm">
                              <span>Code: {code || "-"}</span>
                              <span>Price: {money(product?.price)}</span>
                              <span>
                                Stock: {Number(product?.stock || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <Badge
                              className={
                                product?.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-neutral-100 text-neutral-500"
                              }
                            >
                              {product?.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        {!!categories.length && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {categories.slice(0, 4).map((cat) => (
                              <Badge
                                key={`${code}-${cat}`}
                                className="bg-neutral-100 text-neutral-600"
                              >
                                {cat}
                              </Badge>
                            ))}
                            {categories.length > 4 && (
                              <Badge className="bg-neutral-100 text-neutral-500">
                                +{categories.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <div className="sticky bottom-4">
          <Card className="p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-neutral-600">
                {selectedCount > 0 ? (
                  <>
                    <span className="font-medium text-black">{selectedCount}</span> products selected
                    for trending.
                  </>
                ) : (
                  "Select products to mark them as trending."
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedCount || saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : `Save Trending (${selectedCount})`}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}