"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function OrderSection({ customerId }) {
  const router = useRouter();

  const { orders, loading, error, fetchOrdersByCustomer } = useOrderStore();

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!customerId) return;
    fetchOrdersByCustomer(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  /* -----------------------------------------
     SEARCH (client-side, fast)
  ----------------------------------------- */
  const filteredOrders = useMemo(() => {
    if (!query) return orders;

    const q = query.toLowerCase();
    return orders.filter((o) => {
      return (
        String(o.orderNumber || "").toLowerCase().includes(q) ||
        String(o.fulfillmentStatus || "").toLowerCase().includes(q) ||
        String(o.paymentMethod || "").toLowerCase().includes(q)
      );
    });
  }, [orders, query]);

  const visibleOrders = expanded
    ? filteredOrders
    : filteredOrders.slice(0, 3);

  const card =
    "bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all";

  return (
    <div className={card}>
      {/* HEADER */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-semibold">Customer Orders</h2>
        </div>

        {/* SEARCH */}
        {orders.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order #, status, payment…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin w-4 h-4" />
          Loading orders…
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="text-gray-600 text-sm">
          No orders found for this customer.
        </p>
      ) : (
        <>
          {/* ORDERS LIST */}
          <div className="space-y-4">
            {visibleOrders.map((order) => (
              <div
                key={order._id}
                onClick={() => router.push(`/orders/${order._id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 capitalize">
                      Status:{" "}
                      {String(order.fulfillmentStatus || "").replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {fmtDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₹{order.finalPayable}
                    </p>
                    <p className="text-xs text-gray-500 uppercase">
                      {order.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SHOW MORE / LESS */}
          {filteredOrders.length > 3 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="mt-5 flex items-center gap-2 text-sm font-semibold text-black hover:opacity-70 transition"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show more ({filteredOrders.length - 3}){" "}
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
