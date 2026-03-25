"use client";

import React from "react";

export default function RemittanceFilters({
  filters,
  onChange,
  onApply,
  onExportCsv,
  onExportExcel,
  exportLoading,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          placeholder="Search order / shipping / eway"
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />

        <select
          value={filters.orderType}
          onChange={(e) => onChange({ orderType: e.target.value, page: 1 })}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        >
          <option value="">All Types</option>
          <option value="shipment">shipment</option>
          <option value="exchange">exchange</option>
          <option value="return">return</option>
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ from: e.target.value, page: 1 })}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />

        <input
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ to: e.target.value, page: 1 })}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />

        <select
          value={filters.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value, page: 1 })}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        >
          <option value="createdAt">Created</option>
          <option value="updatedAt">Updated</option>
          <option value="orderNumber">Order Number</option>
          <option value="deliveredDate">Delivered Date</option>
          <option value="remittanceDate">Remittance Date</option>
          <option value="remittedAmount">Remitted Amount</option>
        </select>

        <select
          value={filters.sortOrder}
          onChange={(e) => onChange({ sortOrder: e.target.value, page: 1 })}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onApply}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Loading..." : "Apply"}
        </button>

        <button
          onClick={onExportCsv}
          disabled={exportLoading}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
        >
          CSV
        </button>

        <button
          onClick={onExportExcel}
          disabled={exportLoading}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
        >
          Excel
        </button>
      </div>
    </div>
  );
}