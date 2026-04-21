"use client";

import ProductRmaInsightCard from "./ProductRmaInsightCard";

export default function ProductRmaInsightsList({
  items = [],
  loading = false,
  emptyTitle = "No RMA insights found",
  emptyDescription = "Try changing filters or date range.",
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100"
          >
            <div className="h-5 w-40 rounded-full bg-zinc-200" />
            <div className="mt-4 h-4 w-64 rounded-full bg-zinc-200" />
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="h-16 rounded-2xl bg-zinc-100" />
              <div className="h-16 rounded-2xl bg-zinc-100" />
              <div className="h-16 rounded-2xl bg-zinc-100" />
              <div className="h-16 rounded-2xl bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100">
        <h3 className="text-lg font-semibold text-zinc-900">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-zinc-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ProductRmaInsightCard
          key={item?.productCode || item?._id}
          item={item}
        />
      ))}
    </div>
  );
}