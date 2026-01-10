"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAdminProductionStore from "@/store/adminProductionStore";

/**
 * /production
 * Dashboard page:
 * - metrics summary
 * - production queue
 * - filter + search
 * - mark shipped (production done)
 */

const STATUS_OPTIONS = [
  { label: "Processing (Production Queue)", value: "processing" },
  { label: "Packed", value: "packed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ProductionDashboardPage() {
  const router = useRouter();

  const {
    queue,
    summary,
    loadingQueue,
    loadingSummary,
    updatingShipped,
    error,
    fulfillmentStatus,
    setFulfillmentStatus,
    fetchProductionQueue,
    fetchProductionSummary,
    markOrderShipped,
    refreshAll,
    clearError,
  } = useAdminProductionStore();

  const [search, setSearch] = useState("");

  // ✅ On load: summary + queue
  useEffect(() => {
    fetchProductionSummary();
    fetchProductionQueue({ fulfillmentStatus: "processing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Filter changes -> fetch queue
  useEffect(() => {
    fetchProductionQueue({ fulfillmentStatus });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillmentStatus]);

  // ✅ local filtered queue
  const filteredQueue = useMemo(() => {
    const q = (queue || []).slice();

    const term = String(search || "").trim().toLowerCase();
    if (!term) return q;

    return q.filter((o) => {
      const orderNumber = String(o?.orderNumber || "").toLowerCase();
      const name = String(o?.shippingAddressSnapshot?.fullName || "").toLowerCase();
      const phone = String(o?.shippingAddressSnapshot?.phone || "").toLowerCase();

      return (
        orderNumber.includes(term) ||
        name.includes(term) ||
        phone.includes(term)
      );
    });
  }, [queue, search]);

  const onMarkShipped = async (orderId) => {
    try {
      await markOrderShipped(orderId);
      // refresh queue silently
      await fetchProductionQueue({ fulfillmentStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const onOpenOrder = (orderId) => {
    // ✅ next page we'll create later
    router.push(`/production/order/${orderId}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Production Dashboard</h1>
          <p className="text-sm text-gray-500">
            Confirmed orders → Production queue. Production complete → Mark shipped.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => refreshAll()}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={clearError}
            className="text-sm px-3 py-1 rounded-md bg-white border hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="Processing"
          value={summary?.processing}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("processing")}
          active={fulfillmentStatus === "processing"}
        />
        <MetricCard
          title="Packed"
          value={summary?.packed}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("packed")}
          active={fulfillmentStatus === "packed"}
        />
        <MetricCard
          title="Shipped"
          value={summary?.shipped}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("shipped")}
          active={fulfillmentStatus === "shipped"}
        />
        <MetricCard
          title="Delivered"
          value={summary?.delivered}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("delivered")}
          active={fulfillmentStatus === "delivered"}
        />
        <MetricCard
          title="Cancelled"
          value={summary?.cancelled}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("cancelled")}
          active={fulfillmentStatus === "cancelled"}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Status Filter */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Filter Status</label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-white text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order #, customer name, phone..."
              className="px-3 py-2 rounded-lg border bg-white text-sm w-full md:w-[320px]"
            />
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">{filteredQueue.length}</span>{" "}
          orders
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Production Queue ({fulfillmentStatus})
          </h2>
          {loadingQueue ? (
            <span className="text-xs text-gray-500">Loading...</span>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {loadingQueue ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((order) => (
                  <tr
                    key={order._id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => onOpenOrder(order._id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt || order.orderDate || Date.now()).toLocaleString()}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {order?.shippingAddressSnapshot?.fullName || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order?.shippingAddressSnapshot?.phone || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-700">
                        {(order.items || []).slice(0, 2).map((it, idx) => (
                          <div key={idx}>
                            {it?.productSnapshot?.title || "Item"} × {it?.quantity || 1}
                          </div>
                        ))}
                        {(order.items || []).length > 2 ? (
                          <div className="text-gray-500">
                            +{(order.items || []).length - 2} more
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium">
                      ₹{Number(order.finalPayable || 0).toFixed(0)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {String(order.paymentMethod || "").toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.paymentStatus || "pending"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill status={order.fulfillmentStatus} />
                    </td>

                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Only allow mark shipped if current status is processing/packed */}
                      {["processing", "packed"].includes(order.fulfillmentStatus) ? (
                        <button
                          disabled={updatingShipped}
                          onClick={() => onMarkShipped(order._id)}
                          className="px-3 py-2 rounded-lg bg-black text-white text-xs hover:opacity-90 disabled:opacity-50"
                        >
                          {updatingShipped ? "Updating..." : "Mark Shipped"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-xs text-gray-500">
        ✅ Shiprocket booking happens on <b>Confirm Order</b> (not here). Production
        only marks shipped.
      </div>
    </div>
  );
}

/* -----------------------------
   Components
------------------------------ */

function MetricCard({ title, value, loading, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left bg-white hover:bg-gray-50 transition ${
        active ? "border-black" : "border-gray-200"
      }`}
    >
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-semibold mt-1">
        {loading ? "—" : Number(value || 0)}
      </div>
    </button>
  );
}

function StatusPill({ status }) {
  const s = String(status || "processing");

  const map = {
    processing: "bg-yellow-100 text-yellow-800",
    packed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    rto: "bg-gray-200 text-gray-800",
  };

  const cls = map[s] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {s.replaceAll("_", " ")}
    </span>
  );
}
