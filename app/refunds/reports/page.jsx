"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Search,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import useRazorpayRefundStore from "@/store/razorpayRefundStore";

const statusCards = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
  },
  {
    key: "processed",
    label: "Processed",
    icon: CheckCircle2,
  },
  {
    key: "failed",
    label: "Failed",
    icon: XCircle,
  },
  {
    key: "total",
    label: "Total",
    icon: IndianRupee,
  },
];

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
};

export default function RefundReportsPage() {
  const { refunds, pagination, loading, error, fetchRefunds } =
    useRazorpayRefundStore();

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    page: 1,
    limit: 20,
  });

  const loadRefunds = async (custom = {}) => {
    const params = { ...filters, ...custom };

    Object.keys(params).forEach((key) => {
      if (!params[key]) delete params[key];
    });

    await fetchRefunds(params);
  };

  useEffect(() => {
    loadRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status]);

  const stats = useMemo(() => {
    return refunds.reduce(
      (acc, item) => {
        const amount = Number(item?.amount || item?.refundAmount || 0);
        const status = String(item?.status || "").toLowerCase();

        acc.total.count += 1;
        acc.total.amount += amount;

        if (status.includes("pending")) {
          acc.pending.count += 1;
          acc.pending.amount += amount;
        }

        if (
          status.includes("processed") ||
          status.includes("success") ||
          status.includes("refunded")
        ) {
          acc.processed.count += 1;
          acc.processed.amount += amount;
        }

        if (status.includes("failed")) {
          acc.failed.count += 1;
          acc.failed.amount += amount;
        }

        return acc;
      },
      {
        pending: { count: 0, amount: 0 },
        processed: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 },
      }
    );
  }, [refunds]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadRefunds({ page: 1 });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Refund Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track refund totals, status-wise reports and recent refund activity.
          </p>
        </div>

        <button
          onClick={() => loadRefunds()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statusCards.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <Icon size={18} />
              </div>
              <span className="text-xs text-gray-400">{stats[key].count}</span>
            </div>

            <p className="text-sm text-gray-500">{label}</p>
            <h2 className="mt-1 text-xl font-semibold">
              {formatMoney(stats[key].amount)}
            </h2>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl bg-[#fafafa] px-4 py-2.5 ring-1 ring-gray-100">
              <Search size={16} className="text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder="Search order no, refund id, payment id..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <button className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white">
              Search
            </button>
          </form>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value,
                page: 1,
              }))
            }
            className="rounded-2xl bg-[#fafafa] px-4 py-2.5 text-sm outline-none ring-1 ring-gray-100"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <th className="px-3 py-3 font-medium">Order</th>
                <th className="px-3 py-3 font-medium">Refund ID</th>
                <th className="px-3 py-3 font-medium">Payment ID</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Created</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-500">
                    Loading reports...
                  </td>
                </tr>
              ) : refunds.length ? (
                refunds.map((item) => (
                  <tr
                    key={item?._id}
                    className="border-b border-gray-50 transition hover:bg-[#fafafa]"
                  >
                    <td className="px-3 py-4 font-medium">
                      {item?.orderNumber || item?.order?.orderNumber || "-"}
                    </td>

                    <td className="px-3 py-4 text-gray-500">
                      {item?.razorpayRefundId || item?.refundId || "-"}
                    </td>

                    <td className="px-3 py-4 text-gray-500">
                      {item?.paymentId || item?.razorpayPaymentId || "-"}
                    </td>

                    <td className="px-3 py-4 font-semibold">
                      {formatMoney(item?.amount || item?.refundAmount)}
                    </td>

                    <td className="px-3 py-4">
                      <StatusBadge status={item?.status} />
                    </td>

                    <td className="px-3 py-4 text-gray-500">
                      {formatDate(item?.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-500">
                    No refund reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <p>
            Page {pagination?.page || 1} of {pagination?.pages || 1}
          </p>

          <div className="flex gap-2">
            <button
              disabled={(pagination?.page || 1) <= 1 || loading}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              className="rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 disabled:opacity-40"
            >
              Prev
            </button>

            <button
              disabled={
                (pagination?.page || 1) >= (pagination?.pages || 1) || loading
              }
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: prev.page + 1,
                }))
              }
              className="rounded-xl bg-black px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status = "pending" }) {
  const value = String(status || "pending").toLowerCase();

  const cls = value.includes("failed")
    ? "bg-red-50 text-red-600"
    : value.includes("processed") ||
        value.includes("success") ||
        value.includes("refunded")
      ? "bg-green-50 text-green-700"
      : "bg-yellow-50 text-yellow-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}
    >
      {status || "pending"}
    </span>
  );
}