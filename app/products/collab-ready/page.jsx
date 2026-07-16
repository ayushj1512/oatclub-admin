"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const PAGE_SIZE = 48;

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Recently Updated", value: "updated_desc" },
  { label: "Name: A to Z", value: "title_asc" },
  { label: "Name: Z to A", value: "title_desc" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const STATUS_OPTIONS = [
  { label: "All products", value: "all" },
  { label: "Collab ready", value: "ready" },
  { label: "Not collab ready", value: "not-ready" },
];

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

const getProductImage = (product) =>
  product?.thumbnail ||
  product?.images?.[0] ||
  "/placeholder.png";

const getProductColors = (product) =>
  Array.isArray(product?.colors)
    ? product.colors.filter(Boolean).slice(0, 3)
    : [];

export default function CollabReadyAdminPage() {
  const {
    products,
    page,
    pages,
    total,
    loading,
    saving,
    error,
    bulkSelectedIds,
    fetchProducts,
    toggleBulkSelect,
    clearBulkSelection,
    updateCollabReadyStatus,
  } = useAdminProductStore();

  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("all");

  const [busyProductId, setBusyProductId] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchPage = useCallback(
    async (nextPage = 1) => {
      await fetchProducts({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        color: color || undefined,
        sort,
        isActive: true,
        isDraft: false,
        availableForCollab:
          status === "ready"
            ? true
            : status === "not-ready"
              ? false
              : undefined,
      });
    },
    [fetchProducts, search, category, color, sort, status],
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const selectedSet = useMemo(
    () => new Set((bulkSelectedIds || []).map(String)),
    [bulkSelectedIds],
  );

  const allCurrentPageSelected =
    products.length > 0 &&
    products.every((product) =>
      selectedSet.has(String(product?._id || "")),
    );

  const collabReadyCount = useMemo(
    () =>
      products.filter(
        (product) => product?.availableForCollab,
      ).length,
    [products],
  );

  const handleSearch = (event) => {
    event.preventDefault();
    clearBulkSelection();
    setSearch(searchDraft.trim());
  };

  const clearSearch = () => {
    setSearch("");
    setSearchDraft("");
    clearBulkSelection();
  };

  const toggleSelectAll = () => {
    const currentIds = products
      .map((product) => String(product?._id || ""))
      .filter(Boolean);

    currentIds.forEach((id) => {
      const shouldToggle = allCurrentPageSelected
        ? selectedSet.has(id)
        : !selectedSet.has(id);

      if (shouldToggle) {
        toggleBulkSelect(id);
      }
    });
  };

  const updateSingle = async (product) => {
    const id = String(product?._id || "").trim();

    if (!id || saving || bulkUpdating) return;

    try {
      setBusyProductId(id);

      await updateCollabReadyStatus(
        id,
        !Boolean(product?.availableForCollab),
      );
    } finally {
      setBusyProductId("");
    }
  };

  const updateSelected = async (nextValue) => {
    const ids = [...new Set(bulkSelectedIds || [])];

    if (!ids.length || saving || bulkUpdating) return;

    try {
      setBulkUpdating(true);

      await Promise.all(
        ids.map((id) =>
          updateCollabReadyStatus(id, nextValue),
        ),
      );

      clearBulkSelection();
    } finally {
      setBulkUpdating(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSearchDraft("");
    setCategory("");
    setColor("");
    setSort("newest");
    setStatus("all");
    clearBulkSelection();
  };

  const isBusy = saving || bulkUpdating;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-[1700px] px-3 py-4 sm:px-4 lg:px-6">
        <header className="border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                <Sparkles className="h-4 w-4" />
                Products
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-black sm:text-3xl">
                Collab Ready Products
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
                Select products available for creator, influencer and barter
                collaborations.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
              <StatCard label="Total" value={total} />

              <StatCard
                label="Ready on page"
                value={collabReadyCount}
              />

              <StatCard
                label="Selected"
                value={bulkSelectedIds.length}
              />
            </div>
          </div>
        </header>

        <section className="mt-3 border border-neutral-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 lg:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                value={searchDraft}
                onChange={(event) =>
                  setSearchDraft(event.target.value)
                }
                placeholder="Search name, product code, SKU, category, color or tag"
                className="h-11 w-full border border-neutral-300 bg-white pl-10 pr-10 text-sm outline-none focus:border-black"
              />

              {searchDraft ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="h-11 bg-black px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-neutral-800"
            >
              Search
            </button>
          </form>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <FilterInput
              label="Category"
              value={category}
              onChange={setCategory}
              placeholder="e.g. dresses"
            />

            <FilterInput
              label="Color"
              value={color}
              onChange={setColor}
              placeholder="e.g. black"
            />

            <SelectFilter
              label="Collab status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />

            <SelectFilter
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />

            <button
              type="button"
              onClick={resetFilters}
              className="mt-auto h-11 border border-neutral-300 bg-white px-4 text-xs font-bold uppercase tracking-[0.08em] text-neutral-700 hover:border-black hover:text-black"
            >
              Reset Filters
            </button>
          </div>
        </section>

        <section className="sticky top-0 z-30 mt-3 border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={!products.length || isBusy}
                className="inline-flex h-9 items-center gap-2 border border-neutral-300 px-3 text-xs font-bold text-neutral-800 hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {allCurrentPageSelected ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}

                {allCurrentPageSelected
                  ? "Unselect Page"
                  : "Select Page"}
              </button>

              <span className="text-xs font-medium text-neutral-500">
                {bulkSelectedIds.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!bulkSelectedIds.length || isBusy}
                onClick={() => updateSelected(true)}
                className="inline-flex h-9 items-center gap-2 bg-black px-4 text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}

                Mark Collab Ready
              </button>

              <button
                type="button"
                disabled={!bulkSelectedIds.length || isBusy}
                onClick={() => updateSelected(false)}
                className="h-9 border border-neutral-300 bg-white px-4 text-xs font-bold uppercase tracking-[0.08em] text-neutral-800 hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove from Collab
              </button>

              {bulkSelectedIds.length ? (
                <button
                  type="button"
                  onClick={clearBulkSelection}
                  disabled={isBusy}
                  className="h-9 px-3 text-xs font-semibold text-neutral-500 hover:text-black disabled:opacity-40"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <section className="mt-3 border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchPage(page || 1)}
              className="mt-3 bg-red-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white"
            >
              Retry
            </button>
          </section>
        ) : null}

        <section className="mt-3">
          {loading && !products.length ? (
            <ProductGridSkeleton />
          ) : products.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {products.map((product) => (
                <CollabProductCard
                  key={product._id}
                  product={product}
                  selected={selectedSet.has(
                    String(product._id),
                  )}
                  busy={
                    busyProductId ===
                    String(product._id)
                  }
                  disabled={isBusy}
                  onSelect={() =>
                    toggleBulkSelect(product._id)
                  }
                  onToggle={() =>
                    updateSingle(product)
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState resetFilters={resetFilters} />
          )}
        </section>

        <footer className="mt-5 flex flex-col gap-3 border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Page {page || 1} of {pages || 1} · {total || 0} products
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                fetchPage(Math.max(1, page - 1))
              }
              className="inline-flex h-9 items-center gap-1 border border-neutral-300 px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <button
              type="button"
              disabled={
                loading ||
                page >= Math.max(1, pages)
              }
              onClick={() =>
                fetchPage(
                  Math.min(
                    Math.max(1, pages),
                    page + 1,
                  ),
                )
              }
              className="inline-flex h-9 items-center gap-1 border border-neutral-300 px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CollabProductCard({
  product,
  selected,
  busy,
  disabled,
  onSelect,
  onToggle,
}) {
  const image = getProductImage(product);
  const colors = getProductColors(product);
  const isReady = Boolean(product?.availableForCollab);

  return (
    <article
      className={`relative overflow-hidden border bg-white transition ${
        selected
          ? "border-black ring-1 ring-black"
          : "border-neutral-200 hover:border-neutral-400"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-label={selected ? "Unselect product" : "Select product"}
        className={`absolute left-2 top-2 z-20 grid h-8 w-8 place-items-center border shadow-sm disabled:opacity-50 ${
          selected
            ? "border-black bg-black text-white"
            : "border-neutral-300 bg-white text-neutral-700"
        }`}
      >
        {selected ? (
          <Check className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

      <div className="absolute right-2 top-2 z-20">
        <span
          className={`inline-flex px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${
            isReady
              ? "bg-black text-white"
              : "bg-white text-neutral-500 shadow-sm"
          }`}
        >
          {isReady ? "Collab Ready" : "Not Ready"}
        </span>
      </div>

      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        <Image
          src={image}
          alt={product?.title || "Product"}
          fill
          sizes="(max-width: 640px) 50vw, 250px"
          className="object-cover"
        />
      </div>

      <div className="p-3">
        <h2 className="line-clamp-2 min-h-10 text-xs font-black uppercase leading-5 tracking-[0.03em] text-black">
          {product?.title || "Untitled product"}
        </h2>

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-neutral-500">
            Code: {product?.productCode || "—"}
          </span>

          <span className="text-xs font-black text-black">
            ₹{money(product?.price)}
          </span>
        </div>

        <div className="mt-2 flex min-h-6 flex-wrap gap-1">
          {(product?.categories || [])
            .slice(0, 2)
            .map((item) => (
              <span
                key={item}
                className="bg-neutral-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.07em] text-neutral-600"
              >
                {item}
              </span>
            ))}

          {colors.map((item) => (
            <span
              key={item}
              className="border border-neutral-200 px-2 py-1 text-[9px] font-semibold capitalize text-neutral-500"
            >
              {item}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={busy || disabled}
          className={`mt-3 flex h-9 w-full items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-50 ${
            isReady
              ? "border border-neutral-300 bg-white text-black hover:border-black"
              : "bg-black text-white hover:bg-neutral-800"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isReady ? (
            "Remove from Collab"
          ) : (
            "Mark Collab Ready"
          )}
        </button>
      </div>
    </article>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-black"
      />
    </label>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-black"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border border-neutral-200 bg-neutral-50 px-3 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-black">
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden border border-neutral-200 bg-white"
        >
          <div className="aspect-[4/5] animate-pulse bg-neutral-200" />

          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse bg-neutral-200" />
            <div className="h-3 w-2/5 animate-pulse bg-neutral-200" />
            <div className="h-9 w-full animate-pulse bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ resetFilters }) {
  return (
    <div className="border border-dashed border-neutral-300 bg-white px-4 py-20 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-neutral-300" />

      <h2 className="mt-4 text-lg font-black text-black">
        No products found
      </h2>

      <p className="mt-1 text-sm text-neutral-500">
        Try changing your search or filters.
      </p>

      <button
        type="button"
        onClick={resetFilters}
        className="mt-4 bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white"
      >
        Reset Filters
      </button>
    </div>
  );
}