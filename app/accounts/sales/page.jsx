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

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
};

const StatCard = ({ label, value, hint = "" }) => (
  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
    <div className="text-xs font-medium text-neutral-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-black">{value}</div>
    {hint ? <div className="mt-1 text-[11px] text-neutral-500">{hint}</div> : null}
  </div>
);

const Th = ({ children, className = "" }) => (
  <th
    className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide ${className}`}
  >
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

  const safeRows = Array.isArray(rows) ? rows : [];
  const safeTotals = totals || {};
  const safeMeta = meta || {};
  const safeFilters = filters || {};

  const month = safeFilters.month || "";
  const search = safeFilters.search || "";
  const page = Number(safeFilters.page || 1);
  const limit = Number(safeFilters.limit || 100);
  const startDate = safeFilters.startDate || "";
  const endDate = safeFilters.endDate || "";

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const resolvedMonth = month || currentMonthKey();

    if (!month) setMonth(resolvedMonth);

    fetchSalesReport({
      month: resolvedMonth,
      page: 1,
      limit: limit || 100,
      search: search || "",
      startDate: startDate || "",
      endDate: endDate || "",
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) return;

      setSearch(nextSearch);

      fetchSalesReport({
        month: month || currentMonthKey(),
        search: nextSearch,
        page: 1,
        limit: limit || 100,
        startDate: startDate || "",
        endDate: endDate || "",
      }).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [
    searchInput,
    search,
    month,
    limit,
    startDate,
    endDate,
    setSearch,
    fetchSalesReport,
  ]);

  const pageSummary = useMemo(() => {
    const currentPage = Number(safeMeta.page || page || 1);
    const totalPages = Number(safeMeta.totalPages || 1);
    const totalOrders = Number(safeMeta.totalOrders || 0);
    const totalRows = Number(safeMeta.totalRows || 0);

    if (totalRows > 0) {
      return `Showing page ${currentPage} of ${totalPages} • ${safeRows.length} rows on this page • ${totalRows} matched rows • ${totalOrders} matched orders overall`;
    }

    return `Showing page ${currentPage} of ${totalPages} • ${safeRows.length} rows on this page • ${totalOrders} matched orders overall`;
  }, [
    safeMeta.page,
    safeMeta.totalPages,
    safeMeta.totalOrders,
    safeMeta.totalRows,
    page,
    safeRows.length,
  ]);

  const handleMonthChange = async (e) => {
    const value = e.target.value;
    setMonth(value);

    await fetchSalesReport({
      month: value,
      search: search || "",
      page: 1,
      limit: limit || 100,
      startDate: startDate || "",
      endDate: endDate || "",
    }).catch(() => {});
  };

  const handleRefresh = async () => {
    await fetchSalesReport({
      month: month || currentMonthKey(),
      search: search || "",
      page: page || 1,
      limit: limit || 100,
      startDate: startDate || "",
      endDate: endDate || "",
    }).catch(() => {});
  };

  const handlePrev = async () => {
    if (!safeMeta?.hasPrevPage || loading) return;

    const nextPage = Math.max(1, page - 1);
    setPage(nextPage);

    await fetchSalesReport({
      month: month || currentMonthKey(),
      search: search || "",
      page: nextPage,
      limit: limit || 100,
      startDate: startDate || "",
      endDate: endDate || "",
    }).catch(() => {});
  };

  const handleNext = async () => {
    if (!safeMeta?.hasNextPage || loading) return;

    const nextPage = page + 1;
    setPage(nextPage);

    await fetchSalesReport({
      month: month || currentMonthKey(),
      search: search || "",
      page: nextPage,
      limit: limit || 100,
      startDate: startDate || "",
      endDate: endDate || "",
    }).catch(() => {});
  };

  const handleDownload = async () => {
    await downloadSalesReportCsv({
      month: month || currentMonthKey(),
      search: search || "",
      startDate: startDate || "",
      endDate: endDate || "",
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="px-4 py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales Ledger</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Delivered orders only • Clean line-item report • Paginated table • Full CSV download
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neutral-700">Month</label>
              <input
                type="month"
                value={month || currentMonthKey()}
                onChange={handleMonthChange}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search order, customer, state, courier, HSN, size..."
                className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-black"
              />
            </div>

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

        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-black">Sales Snapshot</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatCard label="Rows" value={safeTotals.rows || 0} hint="Matched dataset" />
            <StatCard label="Orders" value={safeTotals.orders || 0} hint="Matched dataset" />
            <StatCard
              label="T. Discount"
              value={`₹ ${money(safeTotals.totalDiscount)}`}
              hint="Matched dataset"
            />
            <StatCard
              label="Net (incl)"
              value={`₹ ${money(safeTotals.netInclusive)}`}
              hint="Matched dataset"
            />
            <StatCard
              label="Taxable"
              value={`₹ ${money(safeTotals.taxable)}`}
              hint="Matched dataset"
            />
            <StatCard
              label="Tax Amount"
              value={`₹ ${money(safeTotals.taxAmount)}`}
              hint="Matched dataset"
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-auto">
            <table className="min-w-[1900px] w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-black text-white">
                <tr>
                  <Th>Order ID</Th>
                  <Th>Order Date</Th>
                  <Th>Delivered Date</Th>
                  <Th>Customer Name</Th>
                  <Th>State</Th>
                  <Th>Payment Type</Th>
                  <Th>Courier</Th>
                  <Th>Product Type</Th>
                  <Th>HSN Code</Th>
                  <Th>Size</Th>
                  <Th>Qty</Th>
                  <Th>Unit (Inclusive Tax)</Th>
                  <Th>T. Discount</Th>
                  <Th>Net (Inclusive)</Th>
                  <Th>Taxable</Th>
                  <Th>Shipping Charges</Th>
                  <Th>Tax Amount</Th>
                  <Th>Tax Rate</Th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {loading && (
                  <tr>
                    <td colSpan={18} className="px-4 py-8 text-center text-neutral-500">
                      Loading sales ledger...
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={18} className="px-4 py-8 text-center text-red-600">
                      {String(error)}
                    </td>
                  </tr>
                )}

                {!loading && !error && safeRows.length === 0 && (
                  <tr>
                    <td colSpan={18} className="px-4 py-8 text-center text-neutral-500">
                      No delivered orders found for the selected filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  safeRows.map((row, idx) => (
                    <tr
                      key={`${row?.orderId || "order"}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                    >
                      <Td>
                        <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-semibold">
                          {row?.orderId || "-"}
                        </span>
                      </Td>
                      <Td>{formatDate(row?.orderDate)}</Td>
                      <Td>{formatDate(row?.deliveredDate)}</Td>
                      <Td>{row?.customerName || "-"}</Td>
                      <Td>{row?.state || "-"}</Td>
                      <Td>{row?.paymentType || "-"}</Td>
                      <Td>{row?.courier || "-"}</Td>
                      <Td>{row?.productType || "-"}</Td>
                      <Td>{row?.hsnCode || DEFAULT_HSN}</Td>
                      <Td>{row?.size || "-"}</Td>
                      <Td>{row?.qty ?? 0}</Td>
                      <Td>₹ {money(row?.unitInclusiveTax)}</Td>
                      <Td>
                        <span className="inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium">
                          ₹ {money(row?.totalDiscount)}
                        </span>
                      </Td>
                      <Td className="font-medium">₹ {money(row?.netInclusive)}</Td>
                      <Td>₹ {money(row?.taxable)}</Td>
                      <Td>₹ {money(row?.shippingCharges)}</Td>
                      <Td>₹ {money(row?.taxAmount)}</Td>
                      <Td>{row?.taxRate || "5%"}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs text-neutral-600">{pageSummary}</div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!safeMeta?.hasPrevPage || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium">
                {safeMeta?.page || page || 1} / {safeMeta?.totalPages || 1}
              </div>

              <button
                onClick={handleNext}
                disabled={!safeMeta?.hasNextPage || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Missing HSN falls back to <b>{DEFAULT_HSN}</b>. CSV download exports full matched data,
          not just current page.
        </div>
      </div>
    </div>
  );
}