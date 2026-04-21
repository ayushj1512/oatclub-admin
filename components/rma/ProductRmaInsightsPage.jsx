"use client";

import { useEffect } from "react";
import {
  ArrowDownWideNarrow,
  CalendarRange,
  PackageSearch,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { useOrderRmaStore } from "@/store/orderRmaStore";
import ProductRmaInsightsList from "@/components/rma/ProductRmaInsightsList";

const SORT_OPTIONS = [
  { label: "RMA Qty", value: "totalRmaQty" },
  { label: "RMA Cases", value: "totalRmaCases" },
  { label: "Returns", value: "returnCases" },
  { label: "Exchanges", value: "exchangeCases" },
  { label: "Orders Affected", value: "affectedOrdersCount" },
  { label: "Customers Affected", value: "affectedCustomersCount" },
  { label: "Product Code", value: "productCode" },
  { label: "Price", value: "price" },
];

const REASON_OPTIONS = [
  { label: "All Reasons", value: "" },
  { label: "Wrong Size", value: "wrong_size" },
  { label: "Wrong Item", value: "wrong_item" },
  { label: "Damaged", value: "damaged" },
  { label: "Defective", value: "defective" },
  { label: "Quality Issue", value: "quality_issue" },
  { label: "Changed Mind", value: "changed_mind" },
  { label: "Other", value: "other" },
];

const TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "Return", value: "return" },
  { label: "Exchange", value: "exchange" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Requested", value: "requested" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Pickup Scheduled", value: "pickup_scheduled" },
  { label: "Picked", value: "picked" },
  { label: "In Transit", value: "in_transit" },
  { label: "Received", value: "received" },
  { label: "QC Pass", value: "qc_pass" },
  { label: "QC Fail", value: "qc_fail" },
  { label: "Refund Initiated", value: "refund_initiated" },
  { label: "Refund Completed", value: "refund_completed" },
  { label: "Replacement Shipped", value: "replacement_shipped" },
  { label: "Closed", value: "closed" },
];

function FilterField({ label, icon: Icon, children, className = "" }) {
  return (
    <label
      className={`flex min-w-0 flex-col gap-2 rounded-[24px] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100 ${className}`}
    >
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default function ProductRmaInsightsPage({
  title = "Grouped RMA reasons by product",
  subtitle = "One product card shows all return and exchange reasons together so designing, production, and reports teams can quickly spot weak products and recurring issues.",
  defaultLimit = 20,
  showHeader = true,
}) {
  const {
    groupedProducts,
    loadingGroupedProducts,
    groupedProductsError,
    groupedProductsFilters,
    groupedProductsPagination,
    setGroupedProductsFilters,
    resetGroupedProductsFilters,
    getGroupedRmaProducts,
  } = useOrderRmaStore();

  useEffect(() => {
    getGroupedRmaProducts();
  }, [getGroupedRmaProducts]);

  const filters = groupedProductsFilters || {};
  const pagination = groupedProductsPagination || {};

  const handleFilterChange = (key, value) => {
    setGroupedProductsFilters({
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    });
  };

  const handleApplyFilters = () => {
    getGroupedRmaProducts({
      ...filters,
      page: 1,
    });
  };

  const handleResetFilters = () => {
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
      sortBy: "totalRmaQty",
      sortOrder: "desc",
    });
  };

  const handleRefresh = () => {
    getGroupedRmaProducts(filters);
  };

  const handlePageChange = (nextPage) => {
    getGroupedRmaProducts({
      ...filters,
      page: nextPage,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="space-y-5">
        {showHeader ? (
          <div className="rounded-[32px] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.06)] ring-1 ring-zinc-100 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
                  <PackageSearch className="h-3.5 w-3.5" />
                  Product RMA Insights
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                  {title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  {subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
                >
                  <X className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Products Found"
            value={pagination?.total || groupedProducts?.length || 0}
          />
          <MiniStat
            label="Current Page"
            value={`${pagination?.page || 1} / ${pagination?.totalPages || 1}`}
          />
          <MiniStat label="Page Size" value={pagination?.limit || defaultLimit} />
          <MiniStat
            label="Status"
            value={loadingGroupedProducts ? "Loading..." : "Ready"}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Search Product / Reason" icon={Search}>
            <input
              type="text"
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Product code, title, order no..."
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:bg-white focus:ring-zinc-200"
            />
          </FilterField>

          <FilterField label="Date From" icon={CalendarRange}>
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            />
          </FilterField>

          <FilterField label="Date To" icon={CalendarRange}>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            />
          </FilterField>

          <FilterField label="Reason" icon={ArrowDownWideNarrow}>
            <select
              value={filters.reason || ""}
              onChange={(e) => handleFilterChange("reason", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value || "all-reason"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Type" icon={ArrowDownWideNarrow}>
            <select
              value={filters.type || ""}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value || "all-type"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Status" icon={ArrowDownWideNarrow}>
            <select
              value={filters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all-status"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Sort By" icon={ArrowDownWideNarrow}>
            <select
              value={filters.sortBy || "totalRmaQty"}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Order" icon={ArrowDownWideNarrow}>
            <select
              value={filters.sortOrder || "desc"}
              onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </FilterField>

          <FilterField label="Page Size" icon={ArrowDownWideNarrow}>
            <select
              value={filters.limit || defaultLimit}
              onChange={(e) => handleFilterChange("limit", Number(e.target.value))}
              className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm text-zinc-900 outline-none ring-1 ring-zinc-100 focus:bg-white focus:ring-zinc-200"
            >
              {[10, 20, 30, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Search className="h-4 w-4" />
            Apply Filters
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>

        {groupedProductsError ? (
          <div className="rounded-[24px] bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {groupedProductsError}
          </div>
        ) : null}

        <ProductRmaInsightsList
          items={groupedProducts}
          loading={loadingGroupedProducts}
          emptyTitle="No product RMA insights found"
          emptyDescription="Try changing filters, date range, or sort options."
        />

        <div className="flex flex-col gap-3 rounded-[28px] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-600">
            Showing page{" "}
            <span className="font-semibold text-zinc-900">
              {pagination?.page || 1}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-900">
              {pagination?.totalPages || 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination?.hasPrevPage}
              onClick={() => handlePageChange((pagination?.page || 1) - 1)}
              className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!pagination?.hasNextPage}
              onClick={() => handlePageChange((pagination?.page || 1) + 1)}
              className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}