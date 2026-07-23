"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import BarcodePrintGrid from "@/components/barcode/BarcodePrintGrid";
import { useBarcodeStore } from "@/store/barcodeStore";

const PAGE_LIMIT = 48;

const EMPTY_FILTERS = {
  q: "",
  productCode: "",
  size: "",
  uniqueId: "",
  status: "",
  source: "",
  assignedOrderNumber: "",
  inwardBatchCode: "",
};

const SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "FREE",
];

const STATUSES = [
  "available",
  "reserved",
  "allocated",
  "packed",
  "shipped",
  "delivered",
  "returned",
  "damaged",
  "lost",
  "removed",
];

const SOURCES = [
  "production",
  "vendor",
  "return",
  "manual",
  "opening-stock",
  "other",
];

const normalizeProductCode = (
  value = ""
) => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d+$/.test(raw)) {
    return raw.padStart(5, "0");
  }

  return raw
    .toUpperCase()
    .replace(/\s+/g, "");
};

const formatLabel = (value = "") =>
  String(value || "")
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");

export default function PrintBarcodePage() {
  const {
    items,
    loading,
    error,
    pagination,
    fetchBarcodeItems,
    nextPage,
    previousPage,
    clearMessages,
  } = useBarcodeStore();

  const [filters, setFilters] =
    useState(EMPTY_FILTERS);

  useEffect(() => {
    fetchBarcodeItems({
      ...EMPTY_FILTERS,
      sort: "newest",
      page: 1,
      limit: PAGE_LIMIT,
    }).catch(() => {});
  }, [fetchBarcodeItems]);

  const updateFilter = (
    field,
    value
  ) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const fetchFilteredItems = async (
    nextFilters
  ) => {
    await fetchBarcodeItems({
      ...nextFilters,
      sort: "newest",
      page: 1,
      limit: PAGE_LIMIT,
    }).catch(() => {});
  };

  const handleSearch = async (
    event
  ) => {
    event.preventDefault();

    await fetchFilteredItems({
      ...filters,

      q: String(filters.q || "").trim(),

      productCode:
        normalizeProductCode(
          filters.productCode
        ),

      size: String(
        filters.size || ""
      )
        .trim()
        .toUpperCase(),

      uniqueId: filters.uniqueId
        ? Number(filters.uniqueId)
        : "",

      status: String(
        filters.status || ""
      )
        .trim()
        .toLowerCase(),

      source: String(
        filters.source || ""
      )
        .trim()
        .toLowerCase(),

      assignedOrderNumber: String(
        filters.assignedOrderNumber || ""
      )
        .trim()
        .toUpperCase(),

      inwardBatchCode: String(
        filters.inwardBatchCode || ""
      )
        .trim()
        .toUpperCase(),
    });
  };

  const resetFilters = async () => {
    setFilters({
      ...EMPTY_FILTERS,
    });

    clearMessages?.();

    await fetchFilteredItems({
      ...EMPTY_FILTERS,
    });
  };

  return (
    <main className="barcode-print-page min-h-screen bg-neutral-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="no-print rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            Barcode Printing
          </span>

          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-neutral-950 md:text-5xl">
            Print Product Tags
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
            Search and print exact physical
            product pieces using barcodes like
            00034-M-29.
          </p>
        </section>

        <section className="no-print rounded-2xl border border-neutral-200 bg-white p-5">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                type="search"
                value={filters.q}
                onChange={(event) =>
                  updateFilter(
                    "q",
                    event.target.value
                  )
                }
                placeholder="Search barcode, piece SKU, product code or order"
                className="filter-control pl-10"
              />
            </div>

            <input
              type="text"
              value={
                filters.productCode
              }
              onChange={(event) =>
                updateFilter(
                  "productCode",
                  event.target.value
                )
              }
              onBlur={() =>
                updateFilter(
                  "productCode",
                  normalizeProductCode(
                    filters.productCode
                  )
                )
              }
              placeholder="Product code"
              className="filter-control"
            />

            <select
              value={filters.size}
              onChange={(event) =>
                updateFilter(
                  "size",
                  event.target.value
                )
              }
              className="filter-control"
            >
              <option value="">
                All sizes
              </option>

              {SIZES.map((size) => (
                <option
                  key={size}
                  value={size}
                >
                  {size}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              step="1"
              value={filters.uniqueId}
              onChange={(event) =>
                updateFilter(
                  "uniqueId",
                  event.target.value
                )
              }
              placeholder="Unique piece ID"
              className="filter-control"
            />

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value
                )
              }
              className="filter-control"
            >
              <option value="">
                All statuses
              </option>

              {STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {formatLabel(status)}
                  </option>
                )
              )}
            </select>

            <select
              value={filters.source}
              onChange={(event) =>
                updateFilter(
                  "source",
                  event.target.value
                )
              }
              className="filter-control"
            >
              <option value="">
                All sources
              </option>

              {SOURCES.map((source) => (
                <option
                  key={source}
                  value={source}
                >
                  {formatLabel(source)}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={
                filters.assignedOrderNumber
              }
              onChange={(event) =>
                updateFilter(
                  "assignedOrderNumber",
                  event.target.value
                )
              }
              placeholder="Order number"
              className="filter-control"
            />

            <input
              type="text"
              value={
                filters.inwardBatchCode
              }
              onChange={(event) =>
                updateFilter(
                  "inwardBatchCode",
                  event.target.value
                )
              }
              placeholder="Inward batch code"
              className="filter-control"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-1 xl:col-span-3"
            >
              {loading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Search size={16} />
              )}

              Search Barcodes
            </button>

            <button
              type="button"
              onClick={resetFilters}
              disabled={loading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-950 bg-white px-4 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </form>
        </section>

        {error && (
          <div className="no-print flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={clearMessages}
              aria-label="Dismiss error"
              className="shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="barcode-results-section rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
          {loading &&
          items.length === 0 ? (
            <div className="grid min-h-72 place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <BarcodePrintGrid
              items={items}
              title="Available Physical Product Tags"
              emptyMessage="No barcode records matched the selected filters."
            />
          )}

          {pagination.pages > 1 && (
            <div className="no-print mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() =>
                  previousPage()
                }
                disabled={
                  loading ||
                  !pagination.hasPreviousPage
                }
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <div className="text-center">
                <span className="block text-xs font-semibold text-neutral-700">
                  Page {pagination.page} of{" "}
                  {pagination.pages}
                </span>

                <span className="mt-1 block text-[10px] text-neutral-500">
                  {pagination.total} physical
                  pieces
                </span>
              </div>

              <button
                type="button"
                onClick={() => nextPage()}
                disabled={
                  loading ||
                  !pagination.hasNextPage
                }
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .filter-control {
          width: 100%;
          min-height: 44px;
          border: 1px solid #dedede;
          border-radius: 11px;
          background: #ffffff;
          padding: 0 12px;
          color: #111111;
          font-size: 12px;
          outline: none;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .filter-control:focus {
          border-color: #111111;
          box-shadow: 0 0 0 3px
            rgba(0, 0, 0, 0.06);
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .barcode-print-page {
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .barcode-print-page > div {
            max-width: none !important;
            margin: 0 !important;
          }

          .barcode-results-section {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}