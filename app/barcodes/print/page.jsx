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
  productId: "",
  size: "",
  price: "",
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
      page: 1,
      limit: PAGE_LIMIT,
    }).catch(() => {});
  }, [fetchBarcodeItems]);

  const updateFilter = (field, value) => {
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
      page: 1,
      limit: PAGE_LIMIT,
    }).catch(() => {});
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    await fetchFilteredItems({
      ...filters,
      q: filters.q.trim(),
      productId:
        filters.productId.trim(),
      price: filters.price
        ? Number(filters.price)
        : "",
    });
  };

  const resetFilters = async () => {
    setFilters(EMPTY_FILTERS);
    clearMessages?.();

    await fetchFilteredItems(
      EMPTY_FILTERS
    );
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
            Search existing barcode units,
            select the required tags and
            print or download them.
          </p>
        </section>

        <section className="no-print rounded-2xl border border-neutral-200 bg-white p-5">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          >
            <div className="relative xl:col-span-2">
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
                placeholder="Search barcode or serial"
                className="filter-control pl-10"
              />
            </div>

            <input
              type="text"
              value={filters.productId}
              onChange={(event) =>
                updateFilter(
                  "productId",
                  event.target.value
                )
              }
              placeholder="Product ID"
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
              value={filters.price}
              onChange={(event) =>
                updateFilter(
                  "price",
                  event.target.value
                )
              }
              placeholder="Price"
              min="0"
              step="1"
              className="filter-control"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 xl:col-span-4"
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
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-950 bg-white px-4 text-xs font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
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
              title="Available Barcode Tags"
              emptyMessage="No barcode records matched the selected filters."
            />
          )}

          {pagination.pages > 1 && (
            <div className="no-print mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={previousPage}
                disabled={
                  loading ||
                  !pagination.hasPreviousPage
                }
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs text-neutral-500">
                Page {pagination.page} of{" "}
                {pagination.pages}
              </span>

              <button
                type="button"
                onClick={nextPage}
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