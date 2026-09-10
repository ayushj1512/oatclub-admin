"use client";

import React from "react";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN"
  );
};

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const titleCase = (value) =>
  String(value || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

function StatusChip({
  status,
  review,
}) {
  const value =
    status || "pending";

  const classes =
    value === "fully_remitted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : review
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {titleCase(value)}
    </span>
  );
}

function Pager({
  pagination,
  onPageChange,
  loading,
}) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
      <p className="text-xs text-zinc-500">
        Page{" "}
        {pagination?.page || 1} of{" "}
        {pagination?.totalPages || 1}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() =>
            onPageChange(
              (pagination?.page ||
                1) - 1
            )
          }
          disabled={
            !pagination?.hasPrevPage ||
            loading
          }
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-40"
        >
          Prev
        </button>

        <button
          onClick={() =>
            onPageChange(
              (pagination?.page ||
                1) + 1
            )
          }
          disabled={
            !pagination?.hasNextPage ||
            loading
          }
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function RemittanceTable({
  rows,
  loading,
  error,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  deleteLoading,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Remittance Entries
        </h2>
      </div>

      {error ? (
        <p className="px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">
                Order
              </th>
              <th className="px-4 py-3 font-medium">
                AWB
              </th>
              <th className="px-4 py-3 font-medium">
                Source
              </th>
              <th className="px-4 py-3 font-medium">
                Expected
              </th>
              <th className="px-4 py-3 font-medium">
                Received
              </th>
              <th className="px-4 py-3 font-medium">
                Difference
              </th>
              <th className="px-4 py-3 font-medium">
                Status
              </th>
              <th className="px-4 py-3 font-medium">
                Remittance Date
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(6)].map(
                (_, index) => (
                  <tr
                    key={index}
                    className="border-t border-zinc-100"
                  >
                    <td
                      colSpan={9}
                      className="px-4 py-4"
                    >
                      <div className="h-4 animate-pulse rounded bg-zinc-100" />
                    </td>
                  </tr>
                )
              )
            ) : rows?.length ? (
              rows.map((row) => (
                <tr
                  key={row._id}
                  className="border-t border-zinc-100"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.orderNumber ||
                      "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {row.shippingNo ||
                      "—"}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {titleCase(
                      row.source
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                    ₹{" "}
                    {formatAmount(
                      row.expectedAmount
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                    ₹{" "}
                    {formatAmount(
                      row.receivedAmount ??
                      row.remittedAmount
                    )}
                  </td>

                  <td
                    className={`whitespace-nowrap px-4 py-3 ${Number(
                      row.differenceAmount
                    ) === 0
                        ? "text-emerald-700"
                        : "text-red-600"
                      }`}
                  >
                    ₹{" "}
                    {formatAmount(
                      row.differenceAmount
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusChip
                      status={
                        row.reconciliationStatus
                      }
                      review={
                        row.requiresReview
                      }
                    />
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {formatDate(
                      row.remittanceDate
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          onEdit(row)
                        }
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          onDelete(row)
                        }
                        disabled={
                          deleteLoading
                        }
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-zinc-100">
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No remittance entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager
        pagination={pagination}
        onPageChange={onPageChange}
        loading={loading}
      />
    </div>
  );
}
