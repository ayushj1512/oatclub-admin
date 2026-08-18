"use client";

import { useEffect } from "react";
import {
  CalendarRange,
  Download,
  PackageSearch,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";

import { useOrderRmaStore } from "@/store/orderRmaStore";
import ProductRmaInsightsList from "@/components/rma/ProductRmaInsightsList";

const SORT_OPTIONS = [
  ["RMA Qty", "totalRmaQty"],
  ["RMA Cases", "totalRmaCases"],
  ["Returns", "returnCases"],
  ["Exchanges", "exchangeCases"],
  ["Orders", "affectedOrdersCount"],
  ["Customers", "affectedCustomersCount"],
  ["Product Code", "productCode"],
  ["Price", "price"],
];

const REASON_OPTIONS = [
  ["All Reasons", ""],
  ["Wrong Size", "wrong_size"],
  ["Wrong Item", "wrong_item"],
  ["Damaged", "damaged"],
  ["Defective", "defective"],
  ["Quality Issue", "quality_issue"],
  ["Changed Mind", "changed_mind"],
  ["Other", "other"],
];

const TYPE_OPTIONS = [
  ["All Types", ""],
  ["Return", "return"],
  ["Exchange", "exchange"],
];

const STATUS_OPTIONS = [
  ["All Statuses", ""],
  ["Requested", "requested"],
  ["Approved", "approved"],
  ["Rejected", "rejected"],
  ["Pickup Scheduled", "pickup_scheduled"],
  ["Picked", "picked"],
  ["In Transit", "in_transit"],
  ["Received", "received"],
  ["QC Pass", "qc_pass"],
  ["QC Fail", "qc_fail"],
  ["Refund Initiated", "refund_initiated"],
  ["Refund Completed", "refund_completed"],
  ["Replacement Shipped", "replacement_shipped"],
  ["Closed", "closed"],
];

const FULFILLED_OPTIONS = [
  ["All", ""],
  ["Pending", "false"],
  ["Fulfilled", "true"],
];

const inputClass =
  "h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400";

const buttonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

function Field({
  label,
  children,
  className = "",
}) {
  return (
    <label className={`min-w-0 ${className}`}>
      <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>

      {children}
    </label>
  );
}

export default function ProductRmaInsightsPage({
  title = "Product RMA Insights",
  subtitle = "Product-wise returns and exchanges",
  defaultLimit = 20,
  showHeader = true,
}) {
  const {
    groupedProducts,
    loadingGroupedProducts,
    exportingGroupedProducts,

    groupedProductsError,
    groupedProductsExportError,

    groupedProductsFilters,
    groupedProductsPagination,

    setGroupedProductsFilters,
    resetGroupedProductsFilters,

    getGroupedRmaProducts,
    exportGroupedRmaCsv,
  } = useOrderRmaStore();

  const items = groupedProducts || {};
  const filters = groupedProductsFilters || {};
  const pagination = groupedProductsPagination || {};

  useEffect(() => {
    getGroupedRmaProducts();
  }, [getGroupedRmaProducts]);

  const change = (key, value) => {
    setGroupedProductsFilters({
      [key]: value,
      ...(key !== "page"
        ? { page: 1 }
        : {}),
    });
  };

  const applyFilters = () => {
    getGroupedRmaProducts({
      ...filters,
      page: 1,
    });
  };

  const resetFilters = () => {
    resetGroupedProductsFilters();

    getGroupedRmaProducts({
      page: 1,
      limit: defaultLimit,
      startDate: "",
      endDate: "",
      type: "",
      status: "",
      reason: "",
      search: "",
      isFulfilled: "",
      sortBy: "totalRmaQty",
      sortOrder: "desc",
    });
  };

  const refresh = () => {
    getGroupedRmaProducts(filters);
  };

  const changePage = (page) => {
    getGroupedRmaProducts({
      ...filters,
      page,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-2 py-2 sm:px-3">
      <div className="space-y-2">
        {/* ===================================================
            HEADER
        =================================================== */}
        {showHeader && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <PackageSearch className="h-4 w-4 shrink-0 text-zinc-500" />

                <h1 className="truncate text-sm font-semibold text-zinc-900">
                  {title}
                </h1>

                <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600">
                  {pagination?.total ||
                    items?.length ||
                    0}
                </span>
              </div>

              {subtitle && (
                <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* EXPORT */}
              <button
                type="button"
                onClick={exportGroupedRmaCsv}
                disabled={exportingGroupedProducts}
                className={`${buttonClass} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50`}
              >
                <Download className="h-3.5 w-3.5" />

                {exportingGroupedProducts
                  ? "Exporting..."
                  : "CSV"}
              </button>

              {/* REFRESH */}
              <button
                type="button"
                onClick={refresh}
                disabled={loadingGroupedProducts}
                className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-800`}
              >
                <RefreshCcw
                  className={`h-3.5 w-3.5 ${loadingGroupedProducts
                      ? "animate-spin"
                      : ""
                    }`}
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================
            FILTERS
        =================================================== */}
        <div className="rounded-lg border border-zinc-200 bg-white p-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-10">
            {/* SEARCH */}
            <Field
              label="Search"
              className="col-span-2 sm:col-span-3 lg:col-span-2"
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />

                <input
                  value={filters.search || ""}
                  onChange={(e) =>
                    change(
                      "search",
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder="Code, product, order, RMA, customer..."
                  className={`${inputClass} pl-7`}
                />
              </div>
            </Field>

            {/* FROM */}
            <Field label="From">
              <div className="relative">
                <CalendarRange className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />

                <input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) =>
                    change(
                      "startDate",
                      e.target.value
                    )
                  }
                  className={`${inputClass} pl-6`}
                />
              </div>
            </Field>

            {/* TO */}
            <Field label="To">
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) =>
                  change(
                    "endDate",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            {/* TYPE */}
            <Field label="Type">
              <select
                value={filters.type || ""}
                onChange={(e) =>
                  change(
                    "type",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {TYPE_OPTIONS.map(
                  ([label, value]) => (
                    <option
                      key={
                        value || "all-types"
                      }
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            {/* REASON */}
            <Field label="Reason">
              <select
                value={filters.reason || ""}
                onChange={(e) =>
                  change(
                    "reason",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {REASON_OPTIONS.map(
                  ([label, value]) => (
                    <option
                      key={
                        value || "all-reasons"
                      }
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            {/* STATUS */}
            <Field label="Status">
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  change(
                    "status",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {STATUS_OPTIONS.map(
                  ([label, value]) => (
                    <option
                      key={
                        value ||
                        "all-statuses"
                      }
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            {/* FULFILLED */}
            <Field label="Fulfilled">
              <select
                value={
                  filters.isFulfilled || ""
                }
                onChange={(e) =>
                  change(
                    "isFulfilled",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {FULFILLED_OPTIONS.map(
                  ([label, value]) => (
                    <option
                      key={
                        value ||
                        "all-fulfilled"
                      }
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            {/* SORT */}
            <Field label="Sort">
              <select
                value={
                  filters.sortBy ||
                  "totalRmaQty"
                }
                onChange={(e) =>
                  change(
                    "sortBy",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                {SORT_OPTIONS.map(
                  ([label, value]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            {/* ORDER */}
            <Field label="Order">
              <select
                value={
                  filters.sortOrder ||
                  "desc"
                }
                onChange={(e) =>
                  change(
                    "sortOrder",
                    e.target.value
                  )
                }
                className={inputClass}
              >
                <option value="desc">
                  Desc
                </option>

                <option value="asc">
                  Asc
                </option>
              </select>
            </Field>

            {/* LIMIT */}
            <Field label="Rows">
              <select
                value={
                  filters.limit ||
                  defaultLimit
                }
                onChange={(e) =>
                  change(
                    "limit",
                    Number(e.target.value)
                  )
                }
                className={inputClass}
              >
                {[10, 20, 30, 50, 100].map(
                  (size) => (
                    <option
                      key={size}
                      value={size}
                    >
                      {size}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>

          {/* FILTER FOOTER */}
          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
            <p className="text-[10px] text-zinc-400">
              Page{" "}
              <b className="text-zinc-700">
                {pagination?.page || 1}
              </b>
              {" / "}
              {pagination?.totalPages || 1}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetFilters}
                className={`${buttonClass} bg-zinc-100 text-zinc-600 hover:bg-zinc-200`}
              >
                <X className="h-3 w-3" />
                Clear
              </button>

              <button
                type="button"
                onClick={applyFilters}
                disabled={loadingGroupedProducts}
                className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-800`}
              >
                <Search className="h-3 w-3" />
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================
            ERRORS
        =================================================== */}
        {(groupedProductsError ||
          groupedProductsExportError) && (
            <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
              {groupedProductsError ||
                groupedProductsExportError}
            </div>
          )}

        {/* ===================================================
            PRODUCTS
        =================================================== */}
        <ProductRmaInsightsList
          items={Array.isArray(items) ? items : []}
          loading={loadingGroupedProducts}
          emptyTitle="No RMA insights found"
          emptyDescription="Try changing filters or date range."
        />

        {/* ===================================================
            PAGINATION
        =================================================== */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5">
          <div className="text-[10px] text-zinc-500">
            <span className="font-semibold text-zinc-800">
              {pagination?.page || 1}
            </span>

            {" / "}

            {pagination?.totalPages || 1}

            <span className="ml-2 hidden sm:inline">
              {pagination?.total || 0} products
            </span>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              disabled={
                !pagination?.hasPrevPage ||
                loadingGroupedProducts
              }
              onClick={() =>
                changePage(
                  (pagination?.page || 1) -
                  1
                )
              }
              className={`${buttonClass} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}
            >
              Prev
            </button>

            <button
              type="button"
              disabled={
                !pagination?.hasNextPage ||
                loadingGroupedProducts
              }
              onClick={() =>
                changePage(
                  (pagination?.page || 1) +
                  1
                )
              }
              className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-800`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
