"use client";

import { useEffect, useMemo } from "react";
import { useWordpressStore } from "@/store/wordpress.store";

export default function WordpressOrdersPage() {
  const {
    orders,
    loadingOrders,
    errorOrders,
    fetchOrders,
  } = useWordpressStore();

  useEffect(() => {
    fetchOrders(); // ✅ default fetch (latest 50)
  }, [fetchOrders]);

  // ✅ Remove cancelled + trash orders
  const filteredOrders = useMemo(() => {
    return (
      orders?.filter(
        (order) => !["cancelled", "trash"].includes(order.status)
      ) || []
    );
  }, [orders]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
  {/* Header */}
  <div className="flex items-center justify-between mb-2">
    <div>
      <h1 className="text-xl font-bold text-gray-900">
        📦 WooCommerce Orders
      </h1>
      <p className="text-xs text-gray-500 mt-1">
        Showing {filteredOrders.length} orders (excluding cancelled & trash)
      </p>
    </div>

    <button
      onClick={() => fetchOrders()}
      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black transition"
    >
      Refresh Orders
    </button>
  </div>

  {/* Loader */}
  {loadingOrders && (
    <div className="text-gray-600 text-sm mt-6">
      Loading orders...
    </div>
  )}

  {/* Error */}
  {errorOrders && (
    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mt-6 ring-1 ring-red-200">
      {errorOrders}
    </div>
  )}

  {/* Empty */}
  {!loadingOrders && filteredOrders.length === 0 && (
    <div className="text-gray-500 text-sm mt-6">
      No orders found.
    </div>
  )}

  {/* Orders List */}
  <div className="grid gap-4 mt-6">
    {filteredOrders.map((order) => (
      <div
        key={order.id}
        className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-gray-300 transition"
      >
        <div className="flex justify-between items-start gap-6">
          {/* Left */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">
                Order #{order.number}
              </p>

              {/* Status Badge */}
              <span className="px-2 py-[2px] text-[10px] font-semibold uppercase rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                {order.status}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              {new Date(order.date_created).toLocaleString()}
            </p>

            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">
                {order.billing?.first_name} {order.billing?.last_name}
              </span>{" "}
              <span className="text-xs text-gray-500">
                ({order.billing?.phone || "No phone"})
              </span>
            </p>
          </div>

          {/* Right */}
          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-lg font-bold text-gray-900">
              ₹{order.total}
            </p>

            <a
              href={`/wordpress/orders/${order.id}`}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
            >
              View Order →
            </a>
          </div>
        </div>

        {/* Items */}
        <div className="mt-4 bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Items
          </p>

          <ul className="text-xs text-gray-600 space-y-1">
            {order.line_items?.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-4"
              >
                <span className="truncate">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-gray-900">
                  ₹{item.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ))}
  </div>
</div>

  );
}
