"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Zap,
} from "lucide-react";
import axios from "axios";

import useRazorpayRefundStore from "@/store/razorpayRefundStore";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nice = (v) => String(v || "—").replaceAll("_", " ");

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const statusClass = (status) => {
  const map = {
    processed: "bg-emerald-50 text-emerald-700",
    processing: "bg-blue-50 text-blue-700",
    approved: "bg-purple-50 text-purple-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
    created: "bg-gray-50 text-gray-700",
  };

  return map[status] || "bg-gray-50 text-gray-600";
};

export default function RazorpayRefundsPage() {
  const router = useRouter();

  const {
    loading: razorpayLoading,
    error: razorpayError,
    processRazorpayRefund,
    fetchRazorpayRefundStatus,
    clearError,
  } = useRazorpayRefundStore();

  const [refunds, setRefunds] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    from: "",
    to: "",
    page: 1,
    limit: 20,
    sort: "latest",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const query = useMemo(() => {
    const params = new URLSearchParams({
      paymentMethod: "razorpay",
      refundMode: "automatic",
      refundMethod: "razorpay_source",
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.set(key, value);
      }
    });

    return params.toString();
  }, [filters]);

  const fetchRefunds = async () => {
    try {
      setLoadingList(true);
      setError("");
      clearError?.();

      const { data } = await axios.get(`${API}/api/admin/refunds?${query}`, {
        withCredentials: true,
      });

      setRefunds(data?.data || []);
      setPagination(
        data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 1,
        }
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to fetch Razorpay refunds"
      );
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const processRefund = async (id) => {
    try {
      setActionId(id);
      clearError?.();

      await processRazorpayRefund(id, { speed: "normal" });
      await fetchRefunds();
    } catch (err) {
      setError(err?.message || "Razorpay refund failed");
    } finally {
      setActionId("");
    }
  };

  const syncStatus = async (id) => {
    try {
      setActionId(id);
      clearError?.();

      await fetchRazorpayRefundStatus(id);
      await fetchRefunds();
    } catch (err) {
      setError(err?.message || "Status sync failed");
    } finally {
      setActionId("");
    }
  };

  const isBusy = (id) => actionId === id && razorpayLoading;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Razorpay Refunds
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              Automatic source refunds
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Process approved Razorpay refunds and sync refund status.
            </p>
          </div>

          <button
            onClick={fetchRefunds}
            disabled={loadingList}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingList ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCcw size={16} />
            )}
            Refresh
          </button>
        </div>
      </section>

      {(error || razorpayError) && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <ShieldAlert size={17} />
          {error || razorpayError}
        </div>
      )}

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Filter size={16} />
          Filters
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Search refund/order/payment id"
              className="h-11 w-full rounded-2xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          >
            <option value="">All Status</option>
            <option value="created">Created</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          />

          <select
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="h-11 rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="amount_high">Amount High</option>
            <option value="amount_low">Amount Low</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Refund ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loadingList ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500">
                    Loading Razorpay refunds...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500">
                    No Razorpay refunds found.
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
                      <p className="max-w-[190px] truncate text-xs text-gray-500">
                        {refund.reason || "No reason"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-600">
                      {refund?.razorpay?.paymentId || "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-600">
                      {refund?.razorpay?.refundId || "—"}
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

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {["created", "approved"].includes(refund.status) && (
                          <button
                            onClick={() => processRefund(refund._id)}
                            disabled={isBusy(refund._id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                          >
                            {isBusy(refund._id) ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Zap size={14} />
                            )}
                            Process
                          </button>
                        )}

                        {refund?.razorpay?.refundId && (
                          <button
                            onClick={() => syncStatus(refund._id)}
                            disabled={isBusy(refund._id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 disabled:opacity-60"
                          >
                            {isBusy(refund._id) ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCcw size={14} />
                            )}
                            Sync
                          </button>
                        )}

                        <button
                          onClick={() => router.push(`/refunds/${refund._id}`)}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-medium text-white"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page || 1} of {pagination.pages || 1} ·{" "}
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