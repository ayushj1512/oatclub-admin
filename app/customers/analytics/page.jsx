// app/customers/analytics/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomerStore } from "@/store/customerStore";

import AllCustomersStats from "@/components/customer/analytics/AllCustomersStats";
import AllCustomersGraphs from "@/components/customer/analytics/AllCustomersGraphs";
import AllCustomersInfo from "@/components/customer/analytics/AllCustomersInfo";

import { buildAllCustomersAnalyticsVM } from "@/components/customer/analytics/allCustomersAnalytics";

export default function CustomersAnalyticsPage() {
  const { customers, total, pages, loadingList, error, fetchAllCustomersForDashboard } =
    useCustomerStore();

  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    fetchAllCustomersForDashboard({ limit: 200 });
  }, [fetchAllCustomersForDashboard]);

  const vm = useMemo(() => buildAllCustomersAnalyticsVM(customers, { rangeDays }), [customers, rangeDays]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gray-900" />
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                Customers Analytics
              </h1>
            </div>

            <p className="text-sm md:text-[15px] text-gray-600">
              Overall customer database analytics (Spend, Wishlist, Cart Adds, Trends)
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2 py-1">
                Loaded: {customers?.length || 0}
              </span>
              {typeof total === "number" && (
                <span className="rounded-full bg-gray-100 px-2 py-1">Total: {total}</span>
              )}
              {typeof pages === "number" && (
                <span className="rounded-full bg-gray-100 px-2 py-1">Pages: {pages}</span>
              )}
              <span className="rounded-full bg-gray-100 px-2 py-1">
                Range: last {rangeDays} days
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-100 shadow-sm px-3 py-2">
              <label className="text-xs text-gray-500 block mb-1">Range</label>

              <select
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none ring-0 border border-gray-100 focus:border-gray-200"
                value={rangeDays}
                onChange={(e) => setRangeDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Body States */}
        {loadingList ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse" />
              <div className="space-y-2 w-full">
                <div className="h-3 w-40 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-72 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-red-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Something went wrong</div>
                <div className="text-sm text-gray-600 mt-1">{error}</div>
                <div className="text-xs text-gray-400 mt-2">
                  Tip: Check API connection & server logs.
                </div>
              </div>
            </div>
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">No customers found</div>
                <div className="text-sm text-gray-600 mt-1">
                  Add some customers or verify your filters / backend response.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Pastel accent wrappers (base: white/black/grey) */}
            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm">
              <div className="p-4 md:p-5">
                <AllCustomersStats vm={vm} />
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
              <div className="p-4 md:p-5 bg-gradient-to-b from-white to-gray-50/60">
                <AllCustomersGraphs vm={vm} />
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
              <div className="p-4 md:p-5">
                <AllCustomersInfo vm={vm} />
              </div>
            </div>

            {/* Soft pastel hint strip */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Tip:</span>{" "}
                  Use range selector to see trends. For deeper insights, we can add
                  cohort/retention charts.
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-200" />
                  <span className="text-xs text-gray-500 ml-2">pastel accents</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
