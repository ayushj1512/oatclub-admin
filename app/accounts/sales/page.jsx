"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useOrderAccountsStore } from "@/store/orderAccountsStore";

const DEFAULT_HSN = "62105000";

const money = (n) => Number(n || 0).toFixed(2);

const currentMonthKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

/* -----------------------------
   Small UI helpers
------------------------------ */
const StatCard = ({ label, value, hint = "" }) => (
  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
    <div className="text-xs font-medium text-neutral-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-black">{value}</div>
    {hint ? <div className="mt-1 text-[11px] text-neutral-500">{hint}</div> : null}
  </div>
);

const Th = ({ children, className = "" }) => (
  <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide ${className}`}>
    {children}
  </th>
);

const Td = ({ children, className = "" }) => (
  <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>
);

export default function SalesReportPage() {
  const {
    rows,
    totals,
    meta,
    filters,
    loading,
    downloading,
    error,
    setMonth,
    setSearch,
    setPage,
    fetchSalesReport,
    downloadSalesReportCsv,
  } = useOrderAccountsStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");

  /* -----------------------------
     Initial load
  ------------------------------ */
  useEffect(() => {
    const month = filters.month || currentMonthKey();

    if (!filters.month) setMonth(month);

    fetchSalesReport({
      month,
      page: 1,
      limit: filters.limit || 100,
      search: filters.search || "",
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------
     Debounced search
  ------------------------------ */
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next === (filters.search || "")) return;

      setSearch(next);
      fetchSalesReport({
        ...filters,
        search: next,
        page: 1,
      }).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, filters, setSearch, fetchSalesReport]);

  const pageSummary = useMemo(() => {
    const currentPage = Number(meta?.page || 1);
    const totalPages = Number(meta?.totalPages || 1);
    const totalOrders = Number(meta?.totalOrders || 0);

    return `Showing page ${currentPage} of ${totalPages} • ${rows.length} rows on this page • ${totalOrders} matched orders overall`;
  }, [meta, rows.length]);

  const handleMonthChange = async (e) => {
    const value = e.target.value;
    setMonth(value);

    await fetchSalesReport({
      ...filters,
      month: value,
      page: 1,
    }).catch(() => {});
  };

  const handleRefresh = async () => {
    await fetchSalesReport({
      month: filters.month,
      search: filters.search,
      page: filters.page,
      limit: filters.limit,
    }).catch(() => {});
  };

  const handlePrev = async () => {
    if (!meta?.hasPrevPage || loading) return;

    const nextPage = Math.max(1, Number(filters.page || 1) - 1);
    setPage(nextPage);

    await fetchSalesReport({
      ...filters,
      page: nextPage,
    }).catch(() => {});
  };

  const handleNext = async () => {
    if (!meta?.hasNextPage || loading) return;

    const nextPage = Number(filters.page || 1) + 1;
    setPage(nextPage);

    await fetchSalesReport({
      ...filters,
      page: nextPage,
    }).catch(() => {});
  };

  const handleDownload = async () => {
    await downloadSalesReportCsv({
      month: filters.month,
      search: filters.search,
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales Report</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Delivered orders only • Month level reporting • Paginated table • Full month CSV download
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            {/* Month */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neutral-700">Month</label>
              <input
                type="month"
                value={filters.month || ""}
                onChange={handleMonthChange}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search order, customer, state, coupon, HSN, size..."
                className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-black"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading full CSV..." : "Download Full CSV"}
              </button>
            </div>
          </div>
        </div>

        {/* Current page snapshot */}
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-black">Current Page Snapshot</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatCard label="Rows" value={totals?.rows || 0} hint="Current page only" />
            <StatCard label="Orders" value={totals?.orders || 0} hint="Current page only" />
            <StatCard
              label="Allocated Discount"
              value={`₹ ${money(totals?.disc)}`}
              hint="Current page only"
            />
            <StatCard
              label="Net (incl)"
              value={`₹ ${money(totals?.net)}`}
              hint="Current page only"
            />
            <StatCard
              label="Taxable (excl)"
              value={`₹ ${money(totals?.taxable)}`}
              hint="Current page only"
            />
            <StatCard
              label="Tax (5%)"
              value={`₹ ${money(totals?.tax)}`}
              hint="Current page only"
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-auto">
            <table className="min-w-[2100px] w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-black text-white">
                <tr>
                  <Th>Order ID</Th>
                  <Th>Month</Th>
                  <Th>Customer</Th>
                  <Th>State</Th>
                  <Th>Pay</Th>
                  <Th>Payment Method</Th>
                  <Th>Courier</Th>
                  <Th>Product Type</Th>
                  <Th>HSN</Th>
                  <Th>Size</Th>
                  <Th>Qty</Th>
                  <Th>Unit (incl)</Th>
                  <Th>Disc</Th>
                  <Th>Net (incl)</Th>
                  <Th>Taxable</Th>
                  <Th>Tax</Th>
                  <Th>Rate</Th>
                  <Th>Order Total</Th>
                  <Th>Order Disc</Th>
                  <Th>Coupon</Th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {loading && (
                  <tr>
                    <td colSpan={20} className="px-4 py-8 text-center text-neutral-500">
                      Loading sales report...
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={20} className="px-4 py-8 text-center text-red-600">
                      {String(error)}
                    </td>
                  </tr>
                )}

                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={20} className="px-4 py-8 text-center text-neutral-500">
                      No delivered orders found for the selected filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  rows.map((row, idx) => (
                    <tr
                      key={`${row.orderId}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                    >
                      <Td>
                        <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-semibold">
                          {row.orderId}
                        </span>
                      </Td>
                      <Td>{row.deliveredMonth}</Td>
                      <Td>{row.customerName || "-"}</Td>
                      <Td>{row.customerState || "-"}</Td>
                      <Td>{row.paymentMode || "-"}</Td>
                      <Td>{row.paymentMethod || "-"}</Td>
                      <Td>{row.courierName || "-"}</Td>
                      <Td>{row.productType || "-"}</Td>
                      <Td>{row.hsnCode || DEFAULT_HSN}</Td>
                      <Td>{row.productSize || "-"}</Td>
                      <Td>{row.qty}</Td>
                      <Td>₹ {money(row.sellingPrice)}</Td>
                      <Td>
                        <span className="inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium">
                          ₹ {money(row.allocatedDiscount)}
                        </span>
                      </Td>
                      <Td className="font-medium">₹ {money(row.netLine)}</Td>
                      <Td>₹ {money(row.taxableValue)}</Td>
                      <Td>₹ {money(row.taxAmount)}</Td>
                      <Td>{row.taxRate || "5%"}</Td>
                      <Td>₹ {money(row.orderTotalAmount)}</Td>
                      <Td>₹ {money(row.orderDiscount)}</Td>
                      <Td>{row.couponCode || "-"}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs text-neutral-600">{pageSummary}</div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!meta?.hasPrevPage || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium">
                {meta?.page || 1} / {meta?.totalPages || 1}
              </div>

              <button
                onClick={handleNext}
                disabled={!meta?.hasNextPage || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 text-xs text-neutral-500">
          Notes: table paginated hai, lekin <b>Download Full CSV</b> selected month/search ke
          according <b>saara matched data</b> export karega, sirf current page nahi. Missing HSN
          falls back to <b>{DEFAULT_HSN}</b>.
        </div>
      </div>
    </div>
  );
}