"use client";

import React, { useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useOrderAccountsStore } from "@/store/orderAccountsStore";

const money = (n) => Number(n || 0).toFixed(2);

const currentMonthKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const StatCard = ({ label, value, hint = "" }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-medium text-neutral-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-black">{value}</div>
    {hint ? <div className="mt-1 text-[11px] text-neutral-500">{hint}</div> : null}
  </div>
);

/* ------------------------------------------------
   Try overall analytics first.
   If backend does not send them yet,
   safely fall back to current response totals
   so dashboard never looks empty.
------------------------------------------------- */
const resolveAnalytics = ({ meta = {}, totals = {}, rows = [] }) => {
  const overall = meta?.analytics || meta?.overallTotals || meta?.summary || null;

  if (overall && Object.keys(overall).length) {
    return {
      rows: Number(overall?.rows || 0),
      orders: Number(overall?.orders || overall?.totalOrders || meta?.totalOrders || 0),
      disc: Number(overall?.disc || 0),
      net: Number(overall?.net || 0),
      taxable: Number(overall?.taxable || 0),
      tax: Number(overall?.tax || 0),
      sumOrderTotal: Number(overall?.sumOrderTotal || 0),
      sumOrderDiscount: Number(overall?.sumOrderDiscount || 0),
      source: "overall",
    };
  }

  return {
    rows: Number(totals?.rows || rows?.length || 0),
    orders: Number(totals?.orders || meta?.totalOrders || 0),
    disc: Number(totals?.disc || 0),
    net: Number(totals?.net || 0),
    taxable: Number(totals?.taxable || 0),
    tax: Number(totals?.tax || 0),
    sumOrderTotal: Number(totals?.sumOrderTotal || 0),
    sumOrderDiscount: Number(totals?.sumOrderDiscount || 0),
    source: "fallback",
  };
};

export default function OverallSalesAnalytics({
  month,
  search = "",
  title = "Overall Sales Analytics",
  subtitle = "Delivered-order analytics for selected filters",
  autoLoad = true,
}) {
  const {
    rows,
    totals,
    meta,
    filters,
    loading,
    error,
    fetchSalesReport,
  } = useOrderAccountsStore();

  const activeMonth = month || filters.month || currentMonthKey();

  useEffect(() => {
    if (!autoLoad) return;

    fetchSalesReport({
      month: activeMonth,
      search,
      page: 1,
      limit: filters.limit || 100,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth, search, autoLoad]);

  const analytics = useMemo(
    () => resolveAnalytics({ meta, totals, rows }),
    [meta, totals, rows]
  );

  const handleRefresh = async () => {
    await fetchSalesReport({
      month: activeMonth,
      search,
      page: 1,
      limit: filters.limit || 100,
    }).catch(() => {});
  };

  return (
    <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black">{title}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {subtitle} • {activeMonth || "All months"}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {analytics.source === "overall"
              ? "Showing overall analytics"
              : "Showing latest fetched analytics"}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
        <StatCard
          label="Rows"
          value={loading ? "..." : analytics.rows}
          hint={analytics.source === "overall" ? "All matched rows" : "Fetched response rows"}
        />
        <StatCard
          label="Orders"
          value={loading ? "..." : analytics.orders}
          hint={analytics.source === "overall" ? "All matched orders" : "Fetched response orders"}
        />
        <StatCard
          label="Allocated Discount"
          value={loading ? "..." : `₹ ${money(analytics.disc)}`}
          hint="Discount total"
        />
        <StatCard
          label="Net (incl)"
          value={loading ? "..." : `₹ ${money(analytics.net)}`}
          hint="Net inclusive amount"
        />
        <StatCard
          label="Taxable (excl)"
          value={loading ? "..." : `₹ ${money(analytics.taxable)}`}
          hint="Taxable amount"
        />
        <StatCard
          label="Tax (5%)"
          value={loading ? "..." : `₹ ${money(analytics.tax)}`}
          hint="GST amount"
        />
        <StatCard
          label="Order Total"
          value={loading ? "..." : `₹ ${money(analytics.sumOrderTotal)}`}
          hint="Final payable total"
        />
        <StatCard
          label="Order Discount"
          value={loading ? "..." : `₹ ${money(analytics.sumOrderDiscount)}`}
          hint="Order-level discount"
        />
      </div>
    </div>
  );
}