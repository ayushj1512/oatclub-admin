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

      {error ? <p className="px-4 py-3 text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Eway Bill</th>
              <th className="px-4 py-3 font-medium">Shipping</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Remittance</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-t border-zinc-100">
                  <td colSpan={9} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))
            ) : rows?.length ? (
              rows.map((row) => (
                <tr key={row._id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 text-zinc-800">
                    {row.ewayBillId || "—"}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {row.shippingNo || "—"}
                  </td>

                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.orderNumber || "—"}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(row.deliveredDate)}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {row.paymentModeLabel ||
                      getPaymentLabel(row.paymentMethod)}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {row.orderType || "—"}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(row.remittanceDate)}
                  </td>

                  <td className="px-4 py-3 text-zinc-900">
                    ₹ {formatAmount(row.remittedAmount)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(row)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => onDelete(row)}
                        disabled={deleteLoading}
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
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No remittance entries found.
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