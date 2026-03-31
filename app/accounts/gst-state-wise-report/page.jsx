"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  RefreshCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ReceiptText,
  Landmark,
  CalendarDays,
} from "lucide-react";

import useOrderAccountsStore from "@/store/orderAccountsStore";

/* ---------------------------------------
   Small utilities
---------------------------------------- */
const inr = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const safe = (value, fallback = "") =>
  value === null || value === undefined || value === "" ? fallback : value;

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/* sort by state code so UI always looks clean */
const sortRowsByStateCode = (list = []) =>
  [...list].sort((a, b) => {
    const aCode = toNum(a?.stateCode, 999);
    const bCode = toNum(b?.stateCode, 999);

    if (aCode !== bCode) return aCode - bCode;

    return String(a?.stateName || "").localeCompare(String(b?.stateName || ""));
  });

const inputBase =
  "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-black";

const btnBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

const cardBase = "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm";

export default function GSTStateWiseReportPage() {
  const {
    rows,
    allRows,
    gstSummary,
    meta,
    filters,
    loading,
    downloading,
    hydratingAll,
    error,

    setReportType,
    setMonth,
    setSearch,
    setStartDate,
    setEndDate,
    setPage,
    setLimit,
    resetFilters,

    fetchGSTReport,
    downloadGSTReportCsv,
  } = useOrderAccountsStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");

  /* ---------------------------------------
     Init
  ---------------------------------------- */
  useEffect(() => {
    setReportType("gst");
  }, [setReportType]);

  useEffect(() => {
    fetchGSTReport({}, true).catch(() => {});
  }, [fetchGSTReport]);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  /* ---------------------------------------
     Derived data
  ---------------------------------------- */
  const sortedRows = useMemo(() => sortRowsByStateCode(rows || []), [rows]);
  const totalVisibleRows = sortedRows.length;
  const totalHydratedRows = Array.isArray(allRows) ? allRows.length : 0;

  const appliedFilterText = useMemo(() => {
    const parts = [];

    if (filters.month) parts.push(`Month: ${filters.month}`);
    if (filters.startDate) parts.push(`From: ${filters.startDate}`);
    if (filters.endDate) parts.push(`To: ${filters.endDate}`);
    if (filters.search) parts.push(`Search: ${filters.search}`);

    return parts.length ? parts.join(" • ") : "Overall";
  }, [filters]);

  /* ---------------------------------------
     Actions
  ---------------------------------------- */
  const runReport = async (override = {}) => {
    try {
      await fetchGSTReport(override, true);
    } catch {
      // store handles error
    }
  };

  const handleSearch = async () => {
    setSearch(searchInput);
    await runReport({ search: searchInput, page: 1 });
  };

  const handleRefresh = async () => {
    await runReport();
  };

  const handleOverall = async () => {
    resetFilters();
    setSearchInput("");

    try {
      await fetchGSTReport(
        {
          month: "",
          search: "",
          startDate: "",
          endDate: "",
          page: 1,
          limit: 50,
        },
        true
      );
    } catch {
      // store handles error
    }
  };

  const handleMonthChange = async (value) => {
    setMonth(value);
    await runReport({ month: value, page: 1 });
  };

  const handleStartDateChange = async (value) => {
    setStartDate(value);
    await runReport({ startDate: value, page: 1 });
  };

  const handleEndDateChange = async (value) => {
    setEndDate(value);
    await runReport({ endDate: value, page: 1 });
  };

  const handleLimitChange = async (value) => {
    const next = Number(value) || 50;
    setLimit(next);
    await runReport({ limit: next, page: 1 });
  };

  const handlePrevPage = async () => {
    if (!meta.hasPrevPage || loading) return;

    const nextPage = Math.max(1, (meta.page || 1) - 1);
    setPage(nextPage);
    await runReport({ page: nextPage });
  };

  const handleNextPage = async () => {
    if (!meta.hasNextPage || loading) return;

    const nextPage = (meta.page || 1) + 1;
    setPage(nextPage);
    await runReport({ page: nextPage });
  };

  const handleDownload = async () => {
    try {
      await downloadGSTReportCsv();
    } catch {
      // store handles error
    }
  };

  /* ---------------------------------------
     UI
  ---------------------------------------- */
  return (
    <div className="w-full bg-neutral-50 px-4 py-4 md:px-6 lg:px-8">
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <ReceiptText className="h-4 w-4" />
                Accounts Report
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-black md:text-3xl">
                GST State Wise Report
              </h1>

              <p className="mt-1 text-sm text-neutral-600">
                State wise taxable value, tax amount, tax rate and total orders.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={`${btnBase} border border-neutral-200 bg-white text-black hover:bg-neutral-100`}
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                onClick={handleOverall}
                disabled={loading}
                className={`${btnBase} border border-neutral-200 bg-white text-black hover:bg-neutral-100`}
              >
                Overall
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading || loading || hydratingAll}
                className={`${btnBase} bg-black text-white hover:bg-neutral-800`}
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download CSV"}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className={cardBase}>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Landmark className="h-4 w-4" />
              Taxable Value
            </div>
            <div className="mt-2 text-2xl font-bold text-black">
              {inr(gstSummary?.taxableValue)}
            </div>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <ReceiptText className="h-4 w-4" />
              Tax Amount
            </div>
            <div className="mt-2 text-2xl font-bold text-black">
              {inr(gstSummary?.taxAmount)}
            </div>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <FileSpreadsheet className="h-4 w-4" />
              Tax Rate
            </div>
            <div className="mt-2 text-2xl font-bold text-black">
              {safe(gstSummary?.taxRate, "5%")}
            </div>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <MapPin className="h-4 w-4" />
              Total States
            </div>
            <div className="mt-2 text-2xl font-bold text-black">
              {toNum(gstSummary?.totalStates)}
            </div>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <CalendarDays className="h-4 w-4" />
              Total Orders
            </div>
            <div className="mt-2 text-2xl font-bold text-black">
              {toNum(gstSummary?.totalOrders)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Search
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search state name / code"
                  className={inputBase}
                />

                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className={`${btnBase} min-w-[110px] bg-black text-white hover:bg-neutral-800`}
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Month
              </label>
              <input
                type="month"
                value={filters.month || ""}
                onChange={(e) => handleMonthChange(e.target.value)}
                className={inputBase}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className={inputBase}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className={inputBase}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Rows Per Page
              </label>
              <select
                value={filters.limit || 50}
                onChange={(e) => handleLimitChange(e.target.value)}
                className={inputBase}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            <span>Applied: {appliedFilterText}</span>
            <span>
              Visible Rows: {totalVisibleRows}
              {hydratingAll ? " • Preparing full CSV..." : ""}
            </span>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-4">State Name</th>
                  <th className="px-4 py-4">State Code</th>
                  <th className="px-4 py-4">Taxable Value</th>
                  <th className="px-4 py-4">Tax Amount</th>
                  <th className="px-4 py-4">Tax Rate</th>
                  <th className="px-4 py-4">Total Orders</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-neutral-500">
                      Loading GST report...
                    </td>
                  </tr>
                ) : sortedRows.length ? (
                  sortedRows.map((row, index) => (
                    <tr
                      key={`${safe(row.stateCode, "NA")}-${safe(
                        row.stateName,
                        "UNKNOWN"
                      )}-${index}`}
                      className="border-t border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4 font-medium text-black">
                        {safe(row.stateName, "-")}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {safe(row.stateCode, "-")}
                      </td>
                      <td className="px-4 py-4 font-semibold text-black">
                        {inr(row.taxableValue)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-black">
                        {inr(row.taxAmount)}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {safe(row.taxRate, "5%")}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {toNum(row.totalOrders)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-neutral-500">
                      No GST data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-neutral-600">
              Page <span className="font-semibold text-black">{meta.page || 1}</span> of{" "}
              <span className="font-semibold text-black">{meta.totalPages || 1}</span>
              {" • "}
              Total Rows:{" "}
              <span className="font-semibold text-black">
                {meta.total || meta.totalRows || meta.totalOrders || totalVisibleRows}
              </span>
              {totalHydratedRows > 0 ? (
                <>
                  {" • "}
                  Full CSV Rows:{" "}
                  <span className="font-semibold text-black">{totalHydratedRows}</span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={!meta.hasPrevPage || loading}
                className={`${btnBase} border border-neutral-200 bg-white text-black hover:bg-neutral-100`}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                onClick={handleNextPage}
                disabled={!meta.hasNextPage || loading}
                className={`${btnBase} border border-neutral-200 bg-white text-black hover:bg-neutral-100`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}