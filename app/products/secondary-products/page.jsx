"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  RefreshCcw,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const isPrimary = (product) => {
  const value = product?.isPrimaryProduct;
  return value === true || String(value).toLowerCase() === "true";
};

const formatPrice = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

export default function SecondaryProductsPage() {
  const products = useAdminProductStore((s) => s.products || []);
  const loading = useAdminProductStore((s) => s.loading);
  const saving = useAdminProductStore((s) => s.saving);
  const fetchProducts = useAdminProductStore((s) => s.fetchProducts);
  const updatePrimaryProductStatus = useAdminProductStore(
    (s) => s.updatePrimaryProductStatus
  );

  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all"); // all | primary | secondary
  const [categoryFilter, setCategoryFilter] = useState("all");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchInput);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    if (typeof fetchProducts !== "function") return;

    const params = {
      page: 1,
      limit: 100,
    };

    if (String(query || "").trim()) {
      params.search = String(query).trim();
    }

    if (categoryFilter !== "all") {
      params.category = categoryFilter;
    }

    if (statusFilter === "primary") {
      params.isPrimaryProduct = "true";
    } else if (statusFilter === "secondary") {
      params.isPrimaryProduct = "false";
    }

    await fetchProducts(params);
  }, [fetchProducts, query, categoryFilter, statusFilter]);

  useEffect(() => {
    loadProducts();
    setSelectedIds([]);
  }, [loadProducts]);

  const categoryOptions = useMemo(() => {
    const set = new Set();

    (products || []).forEach((p) => {
      if (Array.isArray(p?.categories)) {
        p.categories.forEach((cat) => {
          const value = String(cat || "").trim();
          if (value) set.add(value);
        });
      }
    });

    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products || [];
  }, [products]);

  const allVisibleSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((p) => selectedIds.includes(String(p._id)));

  const toggleSelect = (id) => {
    const key = String(id);
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleProducts.map((p) => String(p._id)));
      setSelectedIds((prev) =>
        prev.filter((id) => !visibleIds.has(String(id)))
      );
      return;
    }

    const merged = new Set([
      ...selectedIds.map(String),
      ...visibleProducts.map((p) => String(p._id)),
    ]);
    setSelectedIds(Array.from(merged));
  };

  const handleRefresh = async () => {
    await loadProducts();
  };

  const handleSingleUpdate = async (product, nextValue) => {
    const id = String(product?._id || "");
    if (!id) return;

    await updatePrimaryProductStatus({ ids: [id] }, nextValue);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    await loadProducts();
  };

  const handleBulkUpdate = async (nextValue) => {
    if (!selectedIds.length) return;
    await updatePrimaryProductStatus({ ids: selectedIds }, nextValue);
    setSelectedIds([]);
    await loadProducts();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-black">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Primary & Secondary Products
              </h1>
              <p className="mt-1 text-sm text-black/60">
                Manage product type status for cart pricing logic.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                onClick={() => handleBulkUpdate(false)}
                disabled={saving || !selectedIds.length}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#ececec] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#dfdfdf] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Tag className="h-4 w-4" />
                Mark Secondary
              </button>

              <button
                onClick={() => handleBulkUpdate(true)}
                disabled={saving || !selectedIds.length}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Mark Primary
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                <input
                  type="text"
                  placeholder="Search by product name, code, category..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-black/10 bg-[#fafafa] pl-10 pr-4 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-black/30 focus:bg-white"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-2">
                <FilterButton
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </FilterButton>
                <FilterButton
                  active={statusFilter === "primary"}
                  onClick={() => setStatusFilter("primary")}
                >
                  Primary
                </FilterButton>
                <FilterButton
                  active={statusFilter === "secondary"}
                  onClick={() => setStatusFilter("secondary")}
                >
                  Secondary
                </FilterButton>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-black/60">
              <button
                onClick={toggleSelectAllVisible}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-2 font-medium text-black transition hover:bg-black hover:text-white"
              >
                <CheckSquare className="h-4 w-4" />
                {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
              </button>

              <span className="rounded-2xl bg-[#f0f0f0] px-3 py-2">
                {visibleProducts.length} products
              </span>
              <span className="rounded-2xl bg-[#f0f0f0] px-3 py-2">
                {selectedIds.length} selected
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f5f5f5] text-left">
                <tr className="border-b border-black/5">
                  <th className="px-4 py-4 font-semibold">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-black/20"
                    />
                  </th>
                  <th className="px-4 py-4 font-semibold">Image</th>
                  <th className="px-4 py-4 font-semibold">Product</th>
                  <th className="px-4 py-4 font-semibold">Category</th>
                  <th className="px-4 py-4 font-semibold">Price</th>
                  <th className="px-4 py-4 font-semibold">Compare Price</th>
                  <th className="px-4 py-4 font-semibold">Type</th>
                  <th className="px-4 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-black/5">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-12 animate-pulse rounded-2xl bg-[#f3f3f3]" />
                      </td>
                    </tr>
                  ))
                ) : visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <p className="text-base font-semibold">No products found</p>
                      <p className="mt-1 text-sm text-black/55">
                        Try changing the search, category, or status filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => {
                    const id = String(product?._id || "");
                    const checked = selectedIds.includes(id);
                    const primary = isPrimary(product);
                    const categories = Array.isArray(product?.categories)
                      ? product.categories.join(", ")
                      : "-";

                    return (
                      <tr
                        key={id}
                        className="border-b border-black/5 transition hover:bg-[#fafafa]"
                      >
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(id)}
                            className="h-4 w-4 rounded border-black/20"
                          />
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="h-14 w-12 overflow-hidden rounded-xl bg-[#f3f3f3]">
                            {product?.thumbnail ? (
                              <img
                                src={product.thumbnail}
                                alt={product?.title || "product"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-black/35">
                                No Image
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="min-w-[220px]">
                            <p className="font-medium text-black">
                              {product?.title || "Untitled Product"}
                            </p>
                            <p className="mt-1 text-xs text-black/50">
                              Code: {product?.productCode || "-"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="max-w-[260px] text-black/70">
                            {categories || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle font-medium">
                          {formatPrice(product?.price)}
                        </td>

                        <td className="px-4 py-4 align-middle font-medium text-black/65">
                          {product?.compareAtPrice
                            ? formatPrice(product.compareAtPrice)
                            : "-"}
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              primary
                                ? "bg-black text-white"
                                : "bg-[#efe7c7] text-[#7d6415]"
                            }`}
                          >
                            {primary ? "Primary" : "Secondary"}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-middle text-right">
                          <button
                            onClick={() => handleSingleUpdate(product, !primary)}
                            disabled={saving}
                            className={`rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              primary
                                ? "bg-[#ececec] text-black hover:bg-[#dfdfdf]"
                                : "bg-black text-white hover:opacity-90"
                            }`}
                          >
                            {primary ? "Mark Secondary" : "Mark Primary"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!!selectedIds.length && (
          <div className="sticky bottom-3 mt-5 rounded-3xl border border-black/10 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {selectedIds.length} product(s) selected
                </p>
                <p className="text-xs text-black/60">
                  Update the selected products in one action.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:bg-[#f3f3f3]"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => handleBulkUpdate(false)}
                  disabled={saving}
                  className="rounded-2xl bg-[#ececec] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#dfdfdf] disabled:opacity-50"
                >
                  Mark Secondary
                </button>
                <button
                  onClick={() => handleBulkUpdate(true)}
                  disabled={saving}
                  className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Mark Primary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-black text-white"
          : "border border-black/10 bg-white text-black hover:bg-[#f3f3f3]"
      }`}
    >
      {children}
    </button>
  );
}