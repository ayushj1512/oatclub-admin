"use client";

import {
  PackageSearch,
  RefreshCcw,
} from "lucide-react";

import ProductRmaInsightCard from "./ProductRmaInsightCard";

function LoadingRow() {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        {/* IMAGE */}
        <div className="h-11 w-11 shrink-0 rounded-md bg-zinc-200" />

        {/* PRODUCT */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-14 rounded bg-zinc-200" />
            <div className="h-3 w-16 rounded bg-zinc-100" />
          </div>

          <div className="mt-1.5 h-3 w-44 max-w-full rounded bg-zinc-200" />
        </div>

        {/* STATS */}
        <div className="hidden items-center gap-5 sm:flex">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="w-12"
            >
              <div className="h-2 w-10 rounded bg-zinc-100" />
              <div className="mt-1 h-3 w-6 rounded bg-zinc-200" />
            </div>
          ))}
        </div>

        <div className="h-7 w-7 shrink-0 rounded-md bg-zinc-100" />
      </div>
    </div>
  );
}

export default function ProductRmaInsightsList({
  items = [],
  loading = false,
  emptyTitle = "No RMA insights found",
  emptyDescription = "Try changing filters or date range.",
}) {
  /* =====================================================
     INITIAL LOADING
  ===================================================== */

  if (loading && !items.length) {
    return (
      <div className="space-y-1.5">
        <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-zinc-500">
          <RefreshCcw className="h-3 w-3 animate-spin" />
          Loading RMA insights...
        </div>

        {Array.from({ length: 5 }).map((_, index) => (
          <LoadingRow key={index} />
        ))}
      </div>
    );
  }

  /* =====================================================
     EMPTY
  ===================================================== */

  if (!items.length) {
    return (
      <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-center">
        <div>
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
            <PackageSearch className="h-4 w-4 text-zinc-500" />
          </div>

          <h3 className="mt-2 text-sm font-semibold text-zinc-900">
            {emptyTitle}
          </h3>

          {emptyDescription && (
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {emptyDescription}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* =====================================================
     LIST
  ===================================================== */

  return (
    <div className="relative space-y-1.5">
      {/* subtle refreshing indicator */}
      {loading && (
        <div className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded-md border border-zinc-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-zinc-500 shadow-sm">
          <RefreshCcw className="h-3 w-3 animate-spin" />
          Updating
        </div>
      )}

      {items.map((item) => (
        <ProductRmaInsightCard
          key={
            item?.productCode ||
            item?.productId ||
            item?._id
          }
          item={item}
        />
      ))}
    </div>
  );
}
