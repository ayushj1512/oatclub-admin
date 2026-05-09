"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const LIMIT = 100;

const STATUS = [
  "",
  "created",
  "approved",
  "processing",
  "processed",
  "failed",
  "cancelled",
  "manual_required",
];

const PAYMENT = ["", "razorpay", "cod", "exchange"];
const MODE = ["", "automatic", "manual"];

const money = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const nice = (v) => String(v || "—").replaceAll("_", " ");

const getId = (v) => v?._id || v?.id || "";

const badge = (status) =>
  ({
    processed: "bg-emerald-50 text-emerald-700",
    processing: "bg-blue-50 text-blue-700",
    approved: "bg-purple-50 text-purple-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
    manual_required: "bg-amber-50 text-amber-700",
    created: "bg-gray-50 text-gray-700",
  }[status] || "bg-gray-50 text-gray-600");

export default function RefundListPage() {
  const router = useRouter();

  const { refunds, pagination, loading, error, fetchRefunds, clearError } =
    useOrderRefundStore();

  const [filters, setFilters] = useState({
    page: 1,
    limit: LIMIT,
    search: "",
    status: "",
    paymentMethod: "",
    refundMode: "",
  });

  const query = useMemo(() => filters, [filters]);

  useEffect(() => {
    fetchRefunds(query);
  }, [fetchRefunds, query]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? Math.max(1, Number(value || 1)) : 1,
    }));
  };

  const resetFilters = () => {
    clearError?.();
    setFilters({
      page: 1,
      limit: LIMIT,
      search: "",
      status: "",
      paymentMethod: "",
      refundMode: "",
    });
  };

  const page = Number(pagination?.page || filters.page || 1);
  const totalPages = Number(pagination?.totalPages || 1);

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Refunds
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              All Refund Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage Razorpay, COD and manual refund records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchRefunds(filters)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCcw size={16} />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={() => router.push("/refunds/create")}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <RotateCcw size={16} />
              Create Refund
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="inline-flex items-center gap-2">
            <ShieldAlert size={17} />
            {error}
          </span>
          <button type="button" onClick={clearError} className="font-medium">
            Dismiss
          </button>
        </section>
      ) : null}

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter size={16} />
          Filters
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Search refund no, order no, UTR..."
              className="h-11 w-full rounded-2xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          >
            {STATUS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "All Status"}
              </option>
            ))}
          </select>

          <select
            value={filters.paymentMethod}
            onChange={(e) => updateFilter("paymentMethod", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          >
            {PAYMENT.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "Payment Method"}
              </option>
            ))}
          </select>

          <select
            value={filters.refundMode}
            onChange={(e) => updateFilter("refundMode", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          >
            {MODE.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "Refund Mode"}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="h-11 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                    Loading refunds...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                    No refunds found.
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => {
                  const isManual = refund.refundMode === "manual";

                  return (
                    <tr key={getId(refund)} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {refund.refundNumber || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {nice(refund.refundType)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium">{refund.orderNumber || "—"}</p>
                        <p className="max-w-[190px] truncate text-xs text-gray-500">
                          {refund.reason || "No reason"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {refund.customerId?.name || "—"}
                        </p>
                        <p className="max-w-[180px] truncate text-xs text-gray-500">
                          {refund.customerId?.phone ||
                            refund.customerId?.email ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          {refund.paymentMethod === "razorpay" ? (
                            <CreditCard size={15} />
                          ) : (
                            <Banknote size={15} />
                          )}
                          {nice(refund.paymentMethod)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-gray-700">{nice(refund.refundMode)}</p>
                        <p className="text-xs text-gray-400">
                          {nice(refund.refundMethod)}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {money(refund.amount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badge(
                            refund.status
                          )}`}
                        >
                          {nice(refund.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-500">
                        {refund.createdAt
                          ? new Date(refund.createdAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/refunds/${getId(refund)}`)}
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white transition ${
                            isManual
                              ? "bg-gray-800 hover:bg-black"
                              : "bg-black hover:bg-gray-800"
                          }`}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} · {pagination?.totalCount || 0} refunds
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => updateFilter("page", page - 1)}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => updateFilter("page", page + 1)}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}