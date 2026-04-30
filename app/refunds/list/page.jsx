"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";

import useRazorpayRefundStore from "@/store/razorpayRefundStore";

const STATUS_OPTIONS = [
  "",
  "created",
  "approved",
  "processing",
  "processed",
  "failed",
  "cancelled",
  "manual_required",
];

const METHOD_OPTIONS = [
  "",
  "razorpay_source",
  "razorpayx_payout",
  "upi",
  "bank_transfer",
  "cash",
  "store_credit",
  "other",
];

const MODE_OPTIONS = ["", "automatic", "manual"];
const PAYMENT_OPTIONS = ["", "razorpay", "cod", "exchange"];

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const nice = (v) => String(v || "—").replaceAll("_", " ");

const statusClass = (status) => {
  const map = {
    processed: "bg-emerald-50 text-emerald-700",
    processing: "bg-blue-50 text-blue-700",
    approved: "bg-purple-50 text-purple-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
    manual_required: "bg-amber-50 text-amber-700",
    created: "bg-gray-50 text-gray-700",
  };

  return map[status] || "bg-gray-50 text-gray-600";
};

export default function RefundListPage() {
  const router = useRouter();

  const {
    refunds,
    pagination,
    loading,
    error,
    fetchRefunds,
    clearError,
  } = useRazorpayRefundStore();

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentMethod: "",
    refundMode: "",
    refundMethod: "",
    from: "",
    to: "",
    page: 1,
    limit: 20,
    sort: "latest",
  });

  const cleanFilters = useMemo(() => {
    return Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== "" && value !== null && value !== undefined
      )
    );
  }, [filters]);

  const loadRefunds = async () => {
    try {
      await fetchRefunds(cleanFilters);
    } catch {
      // store handles error
    }
  };

  useEffect(() => {
    loadRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanFilters]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const resetFilters = () => {
    clearError?.();
    setFilters({
      search: "",
      status: "",
      paymentMethod: "",
      refundMode: "",
      refundMethod: "",
      from: "",
      to: "",
      page: 1,
      limit: 20,
      sort: "latest",
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Refunds
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              All refund requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Filter, track and manage Razorpay/manual refunds.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadRefunds}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCcw size={16} />
              )}
              Refresh
            </button>

            <button
              onClick={() => router.push("/refunds/create")}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
            >
              <RotateCcw size={16} />
              Create Refund
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <ShieldAlert size={17} />
          {error}
        </div>
      )}

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
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
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "All Status"}
              </option>
            ))}
          </select>

          <select
            value={filters.paymentMethod}
            onChange={(e) => updateFilter("paymentMethod", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          >
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "Payment Method"}
              </option>
            ))}
          </select>

          <select
            value={filters.refundMode}
            onChange={(e) => updateFilter("refundMode", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          >
            {MODE_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "Refund Mode"}
              </option>
            ))}
          </select>

          <select
            value={filters.refundMethod}
            onChange={(e) => updateFilter("refundMethod", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          >
            {METHOD_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? nice(s) : "Refund Method"}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          />

          <select
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="amount_high">Amount High</option>
            <option value="amount_low">Amount Low</option>
            <option value="processed_latest">Processed Latest</option>
          </select>

          <button
            onClick={resetFilters}
            className="h-11 rounded-2xl bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-black"
          >
            Reset Filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Method</th>
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
                refunds.map((refund) => (
                  <tr key={refund._id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-950">
                        {refund.refundNumber || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {nice(refund.refundType)}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {refund.orderNumber || "—"}
                      </p>
                      <p className="max-w-[180px] truncate text-xs text-gray-500">
                        {refund.reason || "No reason"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {nice(refund.paymentMethod)}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {nice(refund.refundMode)}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {nice(refund.refundMethod)}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-950">
                      {money(refund.amount)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
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
                        onClick={() => router.push(`/refunds/${refund._id}`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-black"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing page {pagination.page || 1} of {pagination.pages || 1} ·{" "}
            {pagination.total || 0} refunds
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={Number(filters.page) <= 1}
              onClick={() => updateFilter("page", Number(filters.page) - 1)}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>

            <button
              disabled={Number(filters.page) >= Number(pagination.pages || 1)}
              onClick={() => updateFilter("page", Number(filters.page) + 1)}
              className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs font-medium text-gray-400">
        Powered by Razorpay
      </p>
    </main>
  );
}