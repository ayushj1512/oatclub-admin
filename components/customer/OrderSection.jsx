"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const FALLBACK_IMG =
  "https://i.pinimg.com/736x/54/5c/c1/545cc16292db0d62ac333fc422e4aff4.jpg";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const getSize = (item) =>
  item?.selectedSize ||
  item?.variant?.attributes?.find(
    (a) => String(a?.key || "").toLowerCase() === "size"
  )?.value ||
  "—";

const getImage = (item) =>
  item?.productSnapshot?.thumbnail ||
  item?.productSnapshot?.images?.[0] ||
  FALLBACK_IMG;

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

  const filteredOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    if (!query.trim()) return list;

    const q = query.toLowerCase();

    return list.filter((o) => {
      const itemMatch = o?.items?.some((item) => {
        return (
          String(item?.productSnapshot?.title || "").toLowerCase().includes(q) ||
          String(item?.productSnapshot?.productCode || "")
            .toLowerCase()
            .includes(q) ||
          String(item?.variant?.sku || "").toLowerCase().includes(q) ||
          String(item?.selectedSize || "").toLowerCase().includes(q)
        );
      });

      return (
        String(o.orderNumber || "").toLowerCase().includes(q) ||
        String(o.fulfillmentStatus || "").toLowerCase().includes(q) ||
        String(o.paymentMethod || "").toLowerCase().includes(q) ||
        itemMatch
      );
    });
  }, [orders, query]);

  const visibleOrders = expanded ? filteredOrders : filteredOrders.slice(0, 3);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-700" />
          <h2 className="text-base font-semibold text-gray-900">
            Customer Orders
          </h2>
        </div>

        {Array.isArray(orders) && orders.length > 0 && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search order, product, size..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:bg-white focus:ring-2 focus:ring-black/5"
            />
          </div>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* BODY */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders…
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders found.</p>
      ) : (
        <>
          <div className="space-y-3">
            {visibleOrders.map((order) => {
              const items = Array.isArray(order?.items) ? order.items : [];

              return (
                <div
                  key={order._id}
                  onClick={() => router.push(`/orders/${order._id}`)}
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-gray-50 p-3 transition hover:bg-white hover:shadow-sm"
                >
                  {/* ORDER TOP */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        #{order.orderNumber || order._id}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-gray-500">
                        {String(order.fulfillmentStatus || "pending").replace(
                          /_/g,
                          " "
                        )}{" "}
                        • {fmtDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{order.finalPayable ?? order.totalAmount ?? 0}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        {order.paymentMethod || "—"}
                      </p>
                    </div>
                  </div>

                  {/* PRODUCTS */}
                  {items.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {items.map((item, index) => (
                        <div
                          key={item?.lineId || item?._id || index}
                          className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-gray-100"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            <Image
                              src={getImage(item)}
                              alt={item?.productSnapshot?.title || "Product"}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-900">
                              {item?.productSnapshot?.title || "Product"}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-gray-500">
                              Code:{" "}
                              <span className="font-medium text-gray-700">
                                {item?.productSnapshot?.productCode || "—"}
                              </span>{" "}
                              • Size:{" "}
                              <span className="font-medium text-gray-700">
                                {getSize(item)}
                              </span>{" "}
                              • Qty:{" "}
                              <span className="font-medium text-gray-700">
                                {item?.quantity || 1}
                              </span>
                            </p>
                          </div>

                          <p className="shrink-0 text-xs font-semibold text-gray-900">
                            ₹{item?.subtotal ?? item?.price ?? 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredOrders.length > 3 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-black transition hover:opacity-70"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show more ({filteredOrders.length - 3})
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}