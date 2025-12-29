"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useWordpressStore } from "@/store/wordpress.store";

/**
 * We do NOT want to show:
 * - cancelled
 * - refunded
 * - failed
 * - trash
 */
const HIDDEN_STATUSES = new Set([
  "cancelled",
  "refunded",
  "failed",
  "trash",
]);

export default function WordpressOrdersListPage() {
  const {
    orders,
    loading,
    error,
    fetchAllOrders,
  } = useWordpressStore();

  /* ============================================================
     FETCH RECENT WOOCOMMERCE ORDERS
  ============================================================ */
  useEffect(() => {
    fetchAllOrders({
      per_page: 20,
      order: "desc",
    });
  }, []);

  /* ============================================================
     FILTER ORDERS (HIDE CANCELLED / TRASH)
  ============================================================ */
  const visibleOrders = useMemo(() => {
    return (orders || []).filter(
      (order) => !HIDDEN_STATUSES.has(order?.status)
    );
  }, [orders]);

  /* ============================================================
     STATES
  ============================================================ */
  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading WooCommerce orders…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
   <div className="p-6 space-y-6 bg-gray-50">
  {/* ================= HEADER ================= */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-semibold text-gray-900">
        WooCommerce Orders
      </h1>
      <p className="text-sm text-gray-500">
        View & print invoices and packing slips
      </p>
    </div>
  </div>

  {/* ================= TABLE CARD ================= */}
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-100/70">
        <tr className="text-left text-gray-600">
          <th className="px-5 py-3 font-medium">Order</th>
          <th className="px-5 py-3 font-medium">Customer</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 font-medium">Total</th>
          <th className="px-5 py-3 font-medium">Date</th>
          <th className="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-100">
        {visibleOrders.length === 0 && (
          <tr>
            <td
              colSpan={6}
              className="px-5 py-10 text-center text-gray-500"
            >
              No active WooCommerce orders found
            </td>
          </tr>
        )}

        {visibleOrders.map((order) => (
          <tr
            key={order.id}
            className="hover:bg-blue-50/40 transition"
          >
            {/* ORDER */}
            <td className="px-5 py-4 font-semibold text-gray-900">
              #{order.order_number || order.id}
            </td>

            {/* CUSTOMER */}
            <td className="px-5 py-4">
              <div className="font-medium text-gray-900">
                {order.billing?.first_name}{" "}
                {order.billing?.last_name}
              </div>
              <div className="text-xs text-gray-500">
                {order.billing?.email}
              </div>
            </td>

            {/* STATUS */}
            <td className="px-5 py-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                {order.status}
              </span>
            </td>

            {/* TOTAL */}
            <td className="px-5 py-4 font-semibold text-gray-900">
              ₹{order.total}
            </td>

            {/* DATE */}
            <td className="px-5 py-4 text-xs text-gray-500">
              {new Date(order.date_created).toLocaleDateString("en-IN")}
            </td>

            {/* ACTIONS */}
            <td className="px-5 py-4 text-right">
              <div className="inline-flex gap-2">
                <Link
                  href={`/wordpress/orders?wcOrderId=${order.id}`}
                  className="px-3 py-1.5 text-xs rounded-md bg-black text-white hover:bg-gray-800 transition"
                >
                  Invoice
                </Link>

                <Link
                  href={`/wordpress/orders?wcOrderId=${order.id}&type=packing`}
                  className="px-3 py-1.5 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  Packing Slip
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

  );
}
