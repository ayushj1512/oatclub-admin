"use client";

import React from "react";

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN");
};

function Card({ label, value, muted }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
      {muted ? <p className="mt-1 text-xs text-zinc-400">{muted}</p> : null}
    </div>
  );
}

export default function RemittanceSummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[86px] animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Total Entries" value={summary?.totalEntries || 0} />
      <Card
        label="Total Remitted"
        value={formatCurrency(summary?.totalRemittedAmount || 0)}
      />
      <Card label="Pending Remittance" value={summary?.pendingCount || 0} />
      <Card
        label="Latest Remittance Date"
        value={formatDate(summary?.latestRemittanceDate)}
      />
    </div>
  );
}