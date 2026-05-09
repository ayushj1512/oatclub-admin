"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Loader2,
  RefreshCcw,
  Search,
  WalletCards,
  Zap,
} from "lucide-react";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const money = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const date = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

const nice = (v) => String(v || "—").replaceAll("_", " ");

export default function EligibleRefundOrdersPage() {
  const {
    orders,
    summary,
    pagination,
    loading,
    actionLoading,
    error,
    fetchEligibleOrders,
    createAndProcessRazorpayRefund,
    createManualRefundFromOrder,
    clearError,
  } = useOrderRefundStore();

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [excludeActiveRefunds, setExcludeActiveRefunds] = useState(true);
  const [activeId, setActiveId] = useState("");

  const loadData = async (override = {}) => {
    await fetchEligibleOrders({
      page: pagination?.page || 1,
      limit: 100,
      search: search.trim(),
      paymentMethod,
      excludeActiveRefunds,
      ...override,
    });
  };

  useEffect(() => {
    loadData({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadData({ page: 1 });
  };

  const handleRefundNow = async (order) => {
    const orderId = order?._id || order?.id;
    if (!orderId) return;

    const amount =
      order?.refundSummary?.pendingAmount ||
      order?.refundSummary?.eligibleAmount ||
      order?.finalPayable ||
      0;

    const payload = {
      amount: Number(amount),
      reason: order?.refundSummary?.reason || "Eligible refund",
      speed: "normal",
      notes: {
        source: "eligible_refund_orders_page",
        orderNumber: order?.orderNumber || "",
      },
    };

    try {
      setActiveId(orderId);

      if (order?.paymentMethod === "razorpay") {
        await createAndProcessRazorpayRefund(orderId, payload);
      } else {
        await createManualRefundFromOrder(orderId, {
          amount: Number(amount),
          reason: payload.reason,
          refundMethod: "upi",
          adminNote: "Created from eligible refund orders page",
        });
      }

      await loadData({ page: pagination?.page || 1 });
    } finally {
      setActiveId("");
    }
  };

  const goToPage = async (page) => {
    await loadData({ page: Math.max(1, Number(page || 1)) });
  };

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-5 md:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} />
            Eligible Orders
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
            Eligible Unrefunded Orders
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Razorpay orders will create and process refund immediately.
          </p>
        </div>

        <button
          onClick={() => loadData({ page: pagination?.page || 1 })}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Kpi icon={WalletCards} label="Eligible Orders" value={summary?.totalOrders || 0} />
        <Kpi icon={IndianRupee} label="Refund Amount" value={money(summary?.totalRefundAmount || 0)} />
        <Kpi icon={CheckCircle2} label="Razorpay" value={summary?.razorpayCount || 0} />
        <Kpi icon={CheckCircle2} label="Manual / COD" value={summary?.codCount || 0} />
      </section>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <form
          onSubmit={handleSearch}
          className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_220px_auto]"
        >
          <div className="flex items-center gap-2 rounded-xl bg-[#fafafa] px-4 py-2.5 ring-1 ring-gray-100">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                clearError();
                setSearch(e.target.value);
              }}
              placeholder="Search order / customer / phone / payment id..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-xl bg-[#fafafa] px-4 py-2.5 text-sm outline-none ring-1 ring-gray-100"
          >
            <option value="">All payments</option>
            <option value="razorpay">Razorpay</option>
            <option value="cod">COD</option>
            <option value="exchange">Exchange</option>
          </select>

          <label className="flex items-center gap-2 rounded-xl bg-[#fafafa] px-4 py-2.5 text-sm text-gray-600 ring-1 ring-gray-100">
            <input
              type="checkbox"
              checked={excludeActiveRefunds}
              onChange={(e) => setExcludeActiveRefunds(e.target.checked)}
            />
            Hide active refunds
          </label>

          <button className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white">
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="px-3 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left">Payment</th>
                <th className="px-3 py-3 text-left">Refund Status</th>
                <th className="px-3 py-3 text-left">Amount</th>
                <th className="px-3 py-3 text-left">Updated</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    Loading eligible orders...
                  </td>
                </tr>
              ) : orders?.length ? (
                orders.map((order) => {
                  const id = order?._id || order?.id;
                  const busy = actionLoading && activeId === id;
                  const amount =
                    order?.refundSummary?.pendingAmount ||
                    order?.refundSummary?.eligibleAmount ||
                    order?.finalPayable ||
                    0;

                  const isRazorpay = order?.paymentMethod === "razorpay";

                  return (
                    <tr key={id} className="border-b border-gray-50 hover:bg-[#fafafa]">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-gray-950">
                          {order?.orderNumber || "—"}
                        </p>
                        <p className="text-xs text-gray-400">{date(order?.createdAt)}</p>
                      </td>

                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-800">
                          {order?.customerName || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {order?.customerPhone || order?.customerEmail || "—"}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-800">
                          {nice(order?.paymentMethod)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {isRazorpay
                            ? order?.razorpay?.paymentId || "Payment ID missing"
                            : nice(order?.paymentStatus)}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {nice(order?.refundSummary?.status || order?.refundStage)}
                        </span>
                      </td>

                      <td className="px-3 py-4 font-semibold text-gray-950">
                        {money(amount)}
                      </td>

                      <td className="px-3 py-4 text-gray-500">
                        {date(order?.updatedAt)}
                      </td>

                      <td className="px-3 py-4 text-right">
                        <button
                          onClick={() => handleRefundNow(order)}
                          disabled={busy || (isRazorpay && !order?.razorpay?.paymentId)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Zap size={14} />
                          )}
                          {isRazorpay ? "Refund Now" : "Create Manual"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    No eligible unrefunded orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <p>
            Page {pagination?.page || 1} of {pagination?.totalPages || 1}
          </p>

          <div className="flex gap-2">
            <button
              disabled={(pagination?.page || 1) <= 1}
              onClick={() => goToPage((pagination?.page || 1) - 1)}
              className="rounded-lg bg-gray-100 px-4 py-2 font-medium disabled:opacity-50"
            >
              Prev
            </button>

            <button
              disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1)}
              onClick={() => goToPage((pagination?.page || 1) + 1)}
              className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-900">
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-gray-950">{value}</p>
    </div>
  );
}