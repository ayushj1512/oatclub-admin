"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  RefreshCcw,
  RotateCcw,
  Search,
  XCircle,
  Loader2,
} from "lucide-react";
import useRazorpayRefundStore from "@/store/razorpayRefundStore";

const formatMoney = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
};

export default function FailedRefundsPage() {
  const {
    refunds,
    pagination,
    loading,
    actionLoading,
    error,
    fetchRefunds,
    processRazorpayRefund,
    fetchRazorpayRefundStatus,
    clearError,
  } = useRazorpayRefundStore();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState(null);

  const loadData = async (custom = {}) => {
    const params = {
      status: "failed",
      page,
      limit: 20,
      search: search.trim() || undefined,
      ...custom,
    };

    Object.keys(params).forEach((k) => !params[k] && delete params[k]);

    try {
      await fetchRefunds(params);
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadData({ page: 1 });
  };

  const handleRetry = async (id) => {
    if (!id) return;

    try {
      setActiveId(id);
      await processRazorpayRefund(id, { speed: "normal" });
      await loadData();
    } finally {
      setActiveId(null);
    }
  };

  const handleSync = async (id) => {
    if (!id) return;

    try {
      setActiveId(id);
      await fetchRazorpayRefundStatus(id);
      await loadData();
    } finally {
      setActiveId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 md:px-6">
      {/* HEADER */}
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
            <XCircle size={14} />
            Failed Queue
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Failed Refunds
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Retry, sync or inspect failed Razorpay refunds.
          </p>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
        >
          <RefreshCcw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* TABLE CARD */}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        {/* SEARCH */}
        <form
          onSubmit={handleSearch}
          className="mb-4 flex gap-2"
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#fafafa] px-4 py-2.5">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                clearError();
                setSearch(e.target.value);
              }}
              placeholder="Search order / payment / refund..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <button className="rounded-xl bg-black px-4 py-2 text-sm text-white">
            Search
          </button>
        </form>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-400">
                <th className="px-3 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Payment</th>
                <th className="px-3 py-3 text-left">Refund</th>
                <th className="px-3 py-3 text-left">Amount</th>
                <th className="px-3 py-3 text-left">Reason</th>
                <th className="px-3 py-3 text-left">Failed At</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : refunds.length ? (
                refunds.map((r) => {
                  const busy = actionLoading && activeId === r._id;

                  return (
                    <tr
                      key={r._id}
                      className="border-b border-gray-50 hover:bg-[#fafafa]"
                    >
                      <td className="px-3 py-4">
                        <p className="font-medium">
                          {r?.orderNumber || "-"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {r?.orderId}
                        </p>
                      </td>

                      <td className="px-3 py-4 text-gray-500">
                        {r?.paymentId || "-"}
                      </td>

                      <td className="px-3 py-4 text-gray-500">
                        {r?.razorpayRefundId || "-"}
                      </td>

                      <td className="px-3 py-4 font-medium">
                        {formatMoney(r?.amount)}
                      </td>

                      <td className="px-3 py-4 text-gray-500 max-w-[220px]">
                        <span className="line-clamp-2">
                          {r?.failureReason || r?.reason || "-"}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-gray-500">
                        {formatDate(r?.updatedAt)}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSync(r._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <RefreshCcw size={14} />
                            )}
                            Sync
                          </button>

                          <button
                            onClick={() => handleRetry(r._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs text-white"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-gray-500">
                    No failed refunds found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <p>
            Page {pagination?.page || page} of {pagination?.pages || 1}
          </p>

          <div className="flex gap-2">
            <button
              disabled={(pagination?.page || page) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg bg-gray-100 px-4 py-2"
            >
              Prev
            </button>

            <button
              disabled={(pagination?.page || page) >= (pagination?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}