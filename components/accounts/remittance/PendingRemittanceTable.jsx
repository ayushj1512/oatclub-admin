"use client";

import React from "react";

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN");
};

const formatAmount = (n) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const getPaymentLabel = (method) => {
  if (method === "cod") return "COD";
  if (method === "razorpay") return "Prepaid";
  if (method === "exchange") return "Exchange";
  return "—";
};

function PaymentChip({ value }) {
  const label = value || "—";

  const cls =
    label === "COD"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : label === "Prepaid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : label === "Exchange"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-zinc-200 bg-zinc-50 text-zinc-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function Pager({ pagination, onPageChange, loading }) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
      <p className="text-xs text-zinc-500">
        Page {pagination?.page || 1} of {pagination?.totalPages || 1}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onPageChange((pagination?.page || 1) - 1)}
          disabled={!pagination?.hasPrevPage || loading}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-40"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange((pagination?.page || 1) + 1)}
          disabled={!pagination?.hasNextPage || loading}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function PendingRemittanceTable({
  rows,
  loading,
  error,
  pagination,
  onPageChange,
  onQuickCreate,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Pending Remittance</h2>
      </div>

      {error ? <p className="px-4 py-3 text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Order Number</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Order Type</th>
              <th className="px-4 py-3 font-medium">Shipping No</th>
              <th className="px-4 py-3 font-medium">Order Amount</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-t border-zinc-100">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))
            ) : rows?.length ? (
              rows.map((row, i) => {
                const paymentLabel =
                  row.paymentModeLabel || getPaymentLabel(row.paymentMethod);

                return (
                  <tr
                    key={row._id || row.orderNumber || i}
                    className="border-t border-zinc-100"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {row.orderNumber || "—"}
                    </td>

                    <td className="px-4 py-3 text-zinc-600">
                      {formatDate(row.deliveredDate)}
                    </td>

                    <td className="px-4 py-3 text-zinc-600">
                      <PaymentChip value={paymentLabel} />
                    </td>

                    <td className="px-4 py-3 text-zinc-600">
                      {row.shippingNo || "—"}
                    </td>

                    <td className="px-4 py-3 text-zinc-900">
                      ₹ {formatAmount(row.finalPayable)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => onQuickCreate(row)}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Add Remittance
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-t border-zinc-100">
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No pending remittance found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager pagination={pagination} onPageChange={onPageChange} loading={loading} />
    </div>
  );
}