"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const money = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const nice = (v) => String(v || "—").replaceAll("_", " ");

const getRefundAmount = (order) =>
  Number(
    order?.refundSummary?.pendingAmount ||
      order?.refundSummary?.eligibleAmount ||
      order?.finalPayable ||
      0
  );

export default function RazorpayRefundPage() {
  const router = useRouter();

  const {
    orders,
    summary,
    loading,
    refreshing,
    actionLoading,
    error,
    filters,
    refundsByOrderId,
    fetchRefundOrders,
    refreshRefundOrders,
    setFilterValue,
    createRazorpayRefundFromOrder,
    processRazorpayRefund,
    createAndProcessRazorpayRefund,
    fetchRazorpayRefundStatus,
    clearError,
  } = useOrderRefundStore();

  useEffect(() => {
    fetchRefundOrders({
      page: 1,
      limit: 100,
      paymentMethod: "razorpay",
    });
  }, [fetchRefundOrders]);

  const filteredOrders = useMemo(() => {
    const search = String(filters?.search || "").toLowerCase().trim();

    if (!search) return orders;

    return orders.filter((order) => {
      const text = [
        order?.orderNumber,
        order?.customerName,
        order?.customerEmail,
        order?.customerPhone,
        order?.razorpay?.paymentId,
        order?.refundSummary?.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [orders, filters?.search]);

  const handleCreate = async (order) => {
    await createRazorpayRefundFromOrder(order.id || order._id, {
      amount: getRefundAmount(order),
      reason: order?.refundSummary?.reason || "Paid order cancelled before shipment",
    });
  };

  const handleProcess = async (order) => {
    const refund = refundsByOrderId?.[String(order.id || order._id)];

    if (!refund?.id && !refund?._id) {
      const created = await createRazorpayRefundFromOrder(order.id || order._id, {
        amount: getRefundAmount(order),
        reason:
          order?.refundSummary?.reason || "Paid order cancelled before shipment",
      });

      const refundId = created?.refund?._id || created?.refund?.id;
      if (!refundId) return;

      await processRazorpayRefund(refundId, { speed: "normal" });
      return;
    }

    await processRazorpayRefund(refund.id || refund._id, { speed: "normal" });
  };

  const handleOneClickRefund = async (order) => {
    await createAndProcessRazorpayRefund(order.id || order._id, {
      amount: getRefundAmount(order),
      speed: "normal",
      reason: order?.refundSummary?.reason || "Paid order cancelled before shipment",
    });
  };

  const handleStatus = async (order) => {
    const refund = refundsByOrderId?.[String(order.id || order._id)];
    const refundId =
      refund?.id || refund?._id || order?.refundSummary?.lastRefundId || "";

    if (!refundId) return;
    await fetchRazorpayRefundStatus(refundId);
  };

  const stats = [
    {
      label: "Pending Orders",
      value: summary?.refundPendingCount || filteredOrders.length || 0,
      icon: CreditCard,
    },
    {
      label: "Refund Amount",
      value: money(summary?.totalRefundAmount || 0),
      icon: WalletCards,
    },
    {
      label: "Action Required",
      value: summary?.actionRequiredCount || filteredOrders.length || 0,
      icon: ShieldAlert,
    },
    {
      label: "Queue Total",
      value: summary?.totalOrders || filteredOrders.length || 0,
      icon: CheckCircle2,
    },
  ];

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      {/* Header */}
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Razorpay Refunds
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Razorpay Refund Queue
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Paid Razorpay orders cancelled before shipment appear here for
              source refund processing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/refunds/list")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <RotateCcw size={16} />
              All Refunds
            </button>

            <button
              type="button"
              onClick={refreshRefundOrders}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {refreshing || loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCcw size={16} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Error */}
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

      {/* Stats */}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <span className="rounded-2xl bg-gray-100 p-2 text-gray-700">
                <Icon size={17} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-semibold">
              {loading ? "—" : value}
            </p>
          </div>
        ))}
      </section>

      {/* Search */}
      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={filters?.search || ""}
            onChange={(e) => setFilterValue("search", e.target.value)}
            placeholder="Search order, customer, phone, payment id..."
            className="h-11 w-full rounded-2xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
          />
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500">
                    Loading Razorpay refund queue...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500">
                    No Razorpay refund pending orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const orderId = order.id || order._id;
                  const refund = refundsByOrderId?.[String(orderId)];
                  const refundId =
                    refund?.id ||
                    refund?._id ||
                    order?.refundSummary?.lastRefundId ||
                    "";

                  return (
                    <tr key={orderId} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{order.orderNumber || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("en-IN")
                            : "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {order.customerName || "Customer"}
                        </p>
                        <p className="max-w-[190px] truncate text-xs text-gray-500">
                          {order.customerPhone || order.customerEmail || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="max-w-[210px] truncate font-mono text-xs text-gray-600">
                          {order?.razorpay?.paymentId || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {money(getRefundAmount(order))}
                      </td>

                      <td className="px-4 py-3">
                        <p className="max-w-[220px] truncate text-gray-600">
                          {order?.refundSummary?.reason ||
                            order?.cancellation?.reason ||
                            "Cancelled before shipment"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {refundId ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/refunds/${refundId}`)}
                            className="text-xs font-semibold text-gray-900 underline underline-offset-4"
                          >
                            {refund?.refundNumber ||
                              order?.refundSummary?.lastRefundNumber ||
                              "View refund"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not created
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-700">
                          {nice(order?.refundSummary?.status || "refund_pending")}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {!refundId ? (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleCreate(order)}
                              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-800 transition hover:bg-gray-200 disabled:opacity-60"
                            >
                              Create
                            </button>
                          ) : null}

                          {refundId ? (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleStatus(order)}
                              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-800 transition hover:bg-gray-200 disabled:opacity-60"
                            >
                              Status
                            </button>
                          ) : null}

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleProcess(order)}
                            className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                          >
                            Process
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleOneClickRefund(order)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            1-click
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-center text-xs font-medium text-gray-400">
        Powered by Razorpay
      </p>
    </main>
  );
}