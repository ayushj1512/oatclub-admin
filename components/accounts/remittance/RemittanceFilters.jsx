"use client";

import React from "react";

const inputClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400";

export default function RemittanceFilters({
  filters,
  onChange,
  onApply,
  onExportCsv,
  onExportExcel,
  exportLoading,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          value={filters.search}
          onChange={(event) =>
            onChange({
              search:
                event.target.value,
              page: 1,
            })
          }
          placeholder="Order, AWB, UTR or reference"
          className={inputClass}
        />

        <select
          value={filters.source}
          onChange={(event) =>
            onChange({
              source:
                event.target.value,
              page: 1,
            })
          }
          className={inputClass}
        >
          <option value="">
            All Sources
          </option>
          <option value="manual">
            Manual
          </option>
          <option value="delhivery">
            Delhivery
          </option>
          <option value="shiprocket">
            Shiprocket
          </option>
        </select>

        <select
          value={
            filters.reconciliationStatus
          }
          onChange={(event) =>
            onChange({
              reconciliationStatus:
                event.target.value,
              page: 1,
            })
          }
          className={inputClass}
        >
          <option value="">
            All Statuses
          </option>
          <option value="fully_remitted">
            Fully Remitted
          </option>
          <option value="partially_remitted">
            Partially Remitted
          </option>
          <option value="excess_remitted">
            Excess Remitted
          </option>
          <option value="amount_adjusted">
            Amount Adjusted
          </option>
          <option value="needs_review">
            Needs Review
          </option>
          <option value="unmapped">
            Unmapped
          </option>
        </select>

        <select
          value={filters.orderType}
          onChange={(event) =>
            onChange({
              orderType:
                event.target.value,
              page: 1,
            })
          }
          className={inputClass}
        >
          <option value="">
            All Payment Types
          </option>
          <option value="cod">
            COD
          </option>
          <option value="partial_cod">
            Partial COD
          </option>
          <option value="razorpay">
            Prepaid
          </option>
        </select>

        <label className="text-xs text-zinc-500">
          Delivered from
          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              onChange({
                from:
                  event.target.value,
                page: 1,
              })
            }
            className={`${inputClass} mt-1 w-full text-zinc-700`}
          />
        </label>

        <label className="text-xs text-zinc-500">
          Delivered to
          <input
            type="date"
            value={filters.to}
            onChange={(event) =>
              onChange({
                to:
                  event.target.value,
                page: 1,
              })
            }
            className={`${inputClass} mt-1 w-full text-zinc-700`}
          />
        </label>

        <select
          value={filters.sortBy}
          onChange={(event) =>
            onChange({
              sortBy:
                event.target.value,
              page: 1,
            })
          }
          className={inputClass}
        >
          <option value="createdAt">
            Created
          </option>
          <option value="orderNumber">
            Order Number
          </option>
          <option value="remittanceDate">
            Remittance Date
          </option>
          <option value="receivedAmount">
            Received Amount
          </option>
          <option value="differenceAmount">
            Difference
          </option>
          <option value="reconciliationStatus">
            Status
          </option>
        </select>

        <select
          value={filters.sortOrder}
          onChange={(event) =>
            onChange({
              sortOrder:
                event.target.value,
              page: 1,
            })
          }
          className={inputClass}
        >
          <option value="desc">
            Descending
          </option>
          <option value="asc">
            Ascending
          </option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onApply}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : "Apply"}
        </button>

        <button
          onClick={onExportCsv}
          disabled={exportLoading}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
        >
          CSV
        </button>

        <button
          onClick={onExportExcel}
          disabled={exportLoading}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
        >
          Excel
        </button>
      </div>
    </div>
  );
}
