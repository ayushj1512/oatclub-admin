"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckSquare2,
  ChevronDown,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const safe = (value) => String(value ?? "").trim();

const money = (value) => {
  const amount = Number(value || 0);

  return `₹${Number.isFinite(amount)
      ? amount.toLocaleString("en-IN")
      : "0"
    }`;
};

const Badge = ({
  children,
  className = "",
}) => (
  <span
    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${className}`}
  >
    {children}
  </span>
);

const getProductImage = (product = {}) =>
  product?.thumbnail ||
  product?.images?.[0]?.url ||
  product?.images?.[0] ||
  product?.image ||
  "";

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
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [selectedCodes, setSelectedCodes] =
    useState([]);

  useEffect(() => {
    fetchAllProducts({
      limit: 250,
      sort: "newest",
    });
  }, [fetchAllProducts]);

  /* =========================
     CATEGORY OPTIONS
  ========================= */

  const categoryOptions = useMemo(() => {
    const values = new Set();

    (products || []).forEach((product) => {
      const categories = Array.isArray(
        product?.categories
      )
        ? product.categories
        : [];

      categories.forEach((item) => {
        const value = safe(item);

        if (value) {
          values.add(value);
        }
      });
    });

    return [
      "all",
      ...Array.from(values).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [products]);

  /* =========================
     FILTER PRODUCTS
  ========================= */

  const filteredProducts = useMemo(() => {
    const query = safe(search).toLowerCase();

    return (products || []).filter(
      (product) => {
        const title = safe(
          product?.title
        ).toLowerCase();

        const code = safe(
          product?.productCode
        ).toLowerCase();

        const categories = Array.isArray(
          product?.categories
        )
          ? product.categories.map((item) =>
            safe(item).toLowerCase()
          )
          : [];

        const matchesSearch =
          !query ||
          title.includes(query) ||
          code.includes(query);

        const matchesCategory =
          category === "all" ||
          categories.includes(
            category.toLowerCase()
          );

        let matchesStatus = true;

        if (statusFilter === "trending") {
          matchesStatus =
            product?.isTrending === true;
        }

        if (statusFilter === "not-trending") {
          matchesStatus =
            product?.isTrending !== true;
        }

        if (statusFilter === "active") {
          matchesStatus =
            product?.isActive !== false;
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );
      }
    );
  }, [
    products,
    search,
    category,
    statusFilter,
  ]);

  /* =========================
     COUNTS
  ========================= */

  const totalCount = products?.length || 0;

  const trendingCount = useMemo(
    () =>
      (products || []).filter(
        (product) => product?.isTrending
      ).length,
    [products]
  );

  const filteredTrendingCount = useMemo(
    () =>
      filteredProducts.filter(
        (product) => product?.isTrending
      ).length,
    [filteredProducts]
  );

  /* =========================
     SELECTION
  ========================= */

  const selectedSet = useMemo(
    () => new Set(selectedCodes),
    [selectedCodes]
  );

  const filteredCodes = useMemo(
    () =>
      filteredProducts
        .map((product) =>
          safe(product?.productCode)
        )
        .filter(Boolean),
    [filteredProducts]
  );

  const allFilteredSelected =
    filteredCodes.length > 0 &&
    filteredCodes.every((code) =>
      selectedSet.has(code)
    );

  const toggleOne = (productCode) => {
    const code = safe(productCode);

    if (!code) return;

    setSelectedCodes((current) =>
      current.includes(code)
        ? current.filter(
          (item) => item !== code
        )
        : [...current, code]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (!filteredCodes.length) return;

    setSelectedCodes((current) => {
      if (allFilteredSelected) {
        return current.filter(
          (code) =>
            !filteredCodes.includes(code)
        );
      }

      return Array.from(
        new Set([
          ...current,
          ...filteredCodes,
        ])
      );
    });
  };

  const clearSelection = () => {
    setSelectedCodes([]);
  };

  /* =========================
     ACTIONS
  ========================= */

  const refreshProducts = async () => {
    await fetchAllProducts({
      limit: 250,
      sort: "newest",
    });
  };

  const handleSave = async () => {
    if (!selectedCodes.length) return;

    try {
      await bulkMarkTrendingByCodes(
        selectedCodes,
        true
      );

      setSelectedCodes([]);

      await refreshProducts();
    } catch (error) {
      console.error(
        "Failed to mark trending products:",
        error
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setStatusFilter("all");
  };

  const hasFilters =
    search ||
    category !== "all" ||
    statusFilter !== "all";

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full p-3 md:p-5">
        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                <Sparkles size={15} />
              </div>

              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-zinc-950 md:text-lg">
                  Trending Products
                </h1>

                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Select products and mark
                  them as trending.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                Products
              </p>

              <p className="text-sm font-bold text-zinc-950">
                {totalCount}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                Trending
              </p>

              <p className="text-sm font-bold text-zinc-950">
                {trendingCount}
              </p>
            </div>

            <div
              className={`rounded-lg border px-2.5 py-1.5 ${selectedCodes.length
                  ? "border-black bg-black text-white"
                  : "border-zinc-200 bg-zinc-50"
                }`}
            >
              <p
                className={`text-[9px] font-bold uppercase tracking-wider ${selectedCodes.length
                    ? "text-white/60"
                    : "text-zinc-400"
                  }`}
              >
                Selected
              </p>

              <p className="text-sm font-bold">
                {selectedCodes.length}
              </p>
            </div>
          </div>
        </div>

        {/* =========================
            FILTER BAR
        ========================= */}

        <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            {/* Search */}

            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search product code or name..."
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-9 text-xs font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
              />

              {!!search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category */}

            <div className="relative">
              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                className="h-9 min-w-[170px] appearance-none rounded-lg border border-zinc-200 bg-zinc-50 pl-3 pr-8 text-xs font-semibold text-zinc-700 outline-none hover:bg-zinc-100 focus:border-zinc-400"
              >
                {categoryOptions.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item === "all"
                        ? "All Categories"
                        : item}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>

            {/* Status */}

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-9 min-w-[155px] appearance-none rounded-lg border border-zinc-200 bg-zinc-50 pl-3 pr-8 text-xs font-semibold text-zinc-700 outline-none hover:bg-zinc-100 focus:border-zinc-400"
              >
                <option value="all">
                  All Products
                </option>

                <option value="not-trending">
                  Not Trending
                </option>

                <option value="trending">
                  Trending
                </option>

                <option value="active">
                  Active Only
                </option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>

            {/* Select */}

            <button
              type="button"
              onClick={
                toggleSelectAllFiltered
              }
              disabled={
                !filteredProducts.length
              }
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${allFilteredSelected
                  ? "border-black bg-black text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
            >
              {allFilteredSelected ? (
                <CheckSquare2
                  size={14}
                />
              ) : (
                <Square size={14} />
              )}

              {allFilteredSelected
                ? "Unselect All"
                : "Select All"}
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-bold text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
              >
                <X size={14} />
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={refreshProducts}
              disabled={loading}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              title="Refresh products"
            >
              <RefreshCcw
                size={14}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>
        </div>

        {/* =========================
            PRODUCT LIST
        ========================= */}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {/* Table Header */}

          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2 md:px-4">
            <div className="text-[11px] font-semibold text-zinc-500">
              {loading ? (
                "Loading products..."
              ) : (
                <>
                  <span className="font-bold text-zinc-900">
                    {
                      filteredProducts.length
                    }
                  </span>{" "}
                  products
                  {filteredTrendingCount >
                    0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-bold text-zinc-900">
                          {
                            filteredTrendingCount
                          }
                        </span>{" "}
                        trending
                      </>
                    )}
                </>
              )}
            </div>

            {!!selectedCodes.length && (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-red-600"
              >
                <X size={12} />
                Clear selection
              </button>
            )}
          </div>

          {/* Rows */}

          <div className="max-h-[calc(100vh-270px)] min-h-[420px] overflow-y-auto">
            {loading ? (
              <LoadingRows />
            ) : !filteredProducts.length ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <Search
                    size={17}
                    className="text-zinc-400"
                  />
                </div>

                <p className="mt-3 text-sm font-bold text-zinc-900">
                  No products found
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Try changing your search
                  or filters.
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-3 text-xs font-bold underline underline-offset-4"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredProducts.map(
                  (product) => {
                    const code = safe(
                      product?.productCode
                    );

                    const selected =
                      selectedSet.has(code);

                    return (
                      <ProductRow
                        key={
                          product?._id ||
                          code
                        }
                        product={
                          product
                        }
                        code={code}
                        selected={
                          selected
                        }
                        onToggle={() =>
                          toggleOne(code)
                        }
                      />
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* =========================
            STICKY SAVE BAR
        ========================= */}

        {!!selectedCodes.length && (
          <div className="sticky bottom-3 z-20 mx-auto mt-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black px-3 py-2.5 text-white shadow-xl md:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Check
                    size={14}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold">
                    {
                      selectedCodes.length
                    }{" "}
                    product
                    {selectedCodes.length >
                      1
                      ? "s"
                      : ""}{" "}
                    selected
                  </p>

                  <p className="hidden text-[10px] text-white/60 sm:block">
                    These products will be
                    marked as trending.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  disabled={saving}
                  className="hidden h-8 items-center justify-center rounded-lg px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white sm:inline-flex"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-extrabold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles
                      size={13}
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : "Mark Trending"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================
   PRODUCT ROW
========================= */

function ProductRow({
  product,
  code,
  selected,
  onToggle,
}) {
  const image =
    getProductImage(product);

  const categories = Array.isArray(
    product?.categories
  )
    ? product.categories
    : [];

  const stock = Number(
    product?.stock || 0
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition md:px-4 ${selected
          ? "bg-zinc-950/[0.035]"
          : "bg-white hover:bg-zinc-50"
        }`}
    >
      {/* Checkbox */}

      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${selected
            ? "border-black bg-black text-white"
            : "border-zinc-300 bg-white group-hover:border-zinc-500"
          }`}
      >
        {selected && (
          <Check
            size={11}
            strokeWidth={3}
          />
        )}
      </div>

      {/* Image */}

      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 md:h-14 md:w-12">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={
              product?.title ||
              "Product"
            }
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-zinc-400">
            IMAGE
          </div>
        )}
      </div>

      {/* Main */}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-bold text-zinc-950 md:text-[13px]">
            {product?.title ||
              "Untitled Product"}
          </h3>

          {product?.isTrending && (
            <Badge className="shrink-0 bg-black text-white">
              TRENDING
            </Badge>
          )}

          {product?.isBestSeller && (
            <Badge className="hidden shrink-0 bg-amber-50 text-amber-700 sm:inline-flex">
              BESTSELLER
            </Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium text-zinc-500">
          <span className="font-bold text-zinc-700">
            {code || "NO CODE"}
          </span>

          <span className="text-zinc-300">
            •
          </span>

          <span>
            {money(product?.price)}
          </span>

          <span className="text-zinc-300">
            •
          </span>

          <span
            className={
              stock > 0
                ? ""
                : "font-semibold text-red-500"
            }
          >
            Stock{" "}
            {stock.toLocaleString(
              "en-IN"
            )}
          </span>

          {!!categories.length && (
            <>
              <span className="hidden text-zinc-300 md:inline">
                •
              </span>

              <span className="hidden max-w-[260px] truncate md:inline">
                {categories
                  .slice(0, 3)
                  .join(" · ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Status */}

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`hidden rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wide sm:inline-flex ${product?.isActive ===
              false
              ? "bg-zinc-100 text-zinc-400"
              : "bg-emerald-50 text-emerald-700"
            }`}
        >
          {product?.isActive === false
            ? "Inactive"
            : "Active"}
        </span>

        <div
          className={`h-2 w-2 rounded-full ${product?.isTrending
              ? "bg-black"
              : "bg-zinc-200"
            }`}
          title={
            product?.isTrending
              ? "Trending"
              : "Not trending"
          }
        />
      </div>
    </button>
  );
}

/* =========================
   LOADING ROWS
========================= */

function LoadingRows() {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({
        length: 10,
      }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-3 py-2.5 md:px-4"
        >
          <div className="h-4 w-4 animate-pulse rounded bg-zinc-100" />

          <div className="h-14 w-12 animate-pulse rounded-md bg-zinc-100" />

          <div className="min-w-0 flex-1">
            <div className="h-3 w-52 max-w-full animate-pulse rounded bg-zinc-100" />

            <div className="mt-2 h-2.5 w-72 max-w-full animate-pulse rounded bg-zinc-100" />
          </div>

          <div className="hidden h-5 w-14 animate-pulse rounded bg-zinc-100 sm:block" />
        </div>
      ))}
    </div>
  );
}
