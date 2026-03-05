// components/orders/OrderRow.jsx
"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";
import OrderPriorityDropdown from "@/components/orders/OrderPriorityDropdown";

// ✅ NEW: 3-dots options (download/print invoice etc.)
import OrderRowActions from "@/components/orders/OrderRowActions";

const BASE_URL = "https://mirayfashions.com";

const safe = (v) => (v == null ? "" : String(v));
const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

const getPaymentBadge = (order) => {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  const ps = String(order?.paymentStatus || "").toLowerCase();

  if (pm === "exchange")
    return {
      label: "Exchange",
      cls: "bg-blue-50 text-blue-700 border border-blue-100",
    };
  if (pm === "cod")
    return {
      label: "COD",
      cls: "bg-gray-100 text-gray-700 border border-gray-200",
    };

  if (pm === "razorpay") {
    if (ps === "paid")
      return {
        label: "Paid ✅",
        cls: "bg-green-50 text-green-700 border border-green-100",
      };
    if (ps === "pending")
      return {
        label: "Pending ⏳",
        cls: "bg-yellow-50 text-yellow-700 border border-yellow-100",
      };
    if (ps === "refund_pending")
      return {
        label: "Refund Pending ⏳",
        cls: "bg-orange-50 text-orange-700 border border-orange-100",
      };
    if (ps === "refunded")
      return {
        label: "Refunded ✅",
        cls: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    return {
      label: "Failed ❌",
      cls: "bg-red-50 text-red-700 border border-red-100",
    };
  }

  if (ps === "not_applicable")
    return {
      label: "N/A",
      cls: "bg-gray-50 text-gray-600 border border-gray-200",
    };

  return {
    label: "Unknown",
    cls: "bg-gray-100 text-gray-700 border border-gray-200",
  };
};

const FULFILLMENT_STATUSES = [
  "processing",
  "packed",
  "picked",
  "shipped",
  "out_for_delivery",
  "delivered",
  "return_requested",
  "exchange_requested",
  "returned",
  "cancelled",
  "rto",
  "refunded",
];

const STATUS_LABELS = {
  processing: "Processing",
  packed: "Packed",
  picked: "Picked",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  return_requested: "Return Requested",
  exchange_requested: "Exchange Requested",
  returned: "Returned",
  cancelled: "Cancelled",
  rto: "RTO",
  refunded: "Refunded",
};

const formatOrderDateTime = (value) => {
  if (!value) return { time: "", date: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { time: "", date: "" };
  return {
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
  };
};

const buildProductUrl = (item) => {
  const productId = item?.productId?._id || item?.productId;
  return productId ? `${BASE_URL}/category/products/name/${productId}` : "";
};

export default function OrderRow({ order, onUpdated }) {
  const router = useRouter();

  const [open, setOpen] = useState(false); // row expand

  const items = Array.isArray(order?.items) ? order.items : [];
  const orderId = order?._id || order?.id;

  const pay = useMemo(() => getPaymentBadge(order), [order]);
  const effectiveStatus = String(
    order?.fulfillmentStatus || "processing"
  ).toLowerCase();
  const dt = useMemo(
    () => formatOrderDateTime(order?.createdAt || order?.orderDate),
    [order?.createdAt, order?.orderDate]
  );

  const toggleOpen = () => setOpen((v) => !v);

  const goToOrder = () => {
    if (!orderId) return;
    router.push(`/orders/${orderId}`);
  };

  return (
    <>
      {/* ================= ROW ================= */}
      <tr className="hover:bg-black/[0.03] transition">
        <td className="py-4 px-5 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleOpen}
              className="p-1.5 rounded-lg hover:bg-black/[0.05] transition"
              title="Expand"
              type="button"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {/* ✅ Clickable order number -> /orders/[id] */}
            <button
              type="button"
              onClick={goToOrder}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToOrder();
                }
              }}
              className="text-left inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/[0.05] focus:outline-none focus:ring-2 focus:ring-black/10"
              title="Open order"
            >
              <span className="underline underline-offset-2 decoration-black/30 hover:decoration-black">
                {order?.orderNumber || "-"}
              </span>
              <ExternalLink size={14} className="opacity-70" />
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {items?.[0]?.productSnapshot?.title
              ? `${items[0].productSnapshot.title}${
                  items.length > 1 ? ` +${items.length - 1} more` : ""
                }`
              : "No items"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {order?.isConfirmed ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100">
                Confirmed ✅
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                Not Confirmed
              </span>
            )}

            <OrderPriorityDropdown
              orderId={orderId}
              currentPriority={order?.priority}
              onUpdated={(u) => onUpdated?.(u?.order ?? u)}
            />
          </div>
        </td>

        <td className="py-4 px-5">
          <div className="font-medium text-gray-900">
            {order?.customerId?.name ||
              order?.shippingAddressSnapshot?.fullName ||
              "Unknown"}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.phone ||
              order?.shippingAddressSnapshot?.phone ||
              ""}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.email ||
              order?.shippingAddressSnapshot?.email ||
              ""}
          </div>
        </td>

        <td className="py-4 px-5">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${pay.cls}`}
          >
            {pay.label}
          </span>
        </td>

        <td className="py-4 px-5">
         <OrderStatusDropdown
  orderId={orderId}
  currentStatus={effectiveStatus}
  onUpdated={(u) => onUpdated?.(u?.order ?? u)}
/>
        </td>

        <td className="py-4 px-5 font-semibold text-gray-900">
          ₹{money(order?.finalPayable)}
        </td>

        <td className="py-4 px-5 text-gray-700">
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-900">{dt.time}</div>
            <div className="text-[11px] text-gray-500">{dt.date}</div>
          </div>
        </td>

        {/* ✅ ACTIONS COLUMN */}
        <td className="py-4 px-5">
          <div className="flex items-center justify-end gap-2">
            <OrderRowActions
              order={order}
              courierName={order?.shipment?.courierName || order?.courierName || ""}
              trackingId={order?.shipment?.awb || order?.trackingId || ""}
            />
          </div>
        </td>
      </tr>

      {/* ================= EXPANDED (ONLY ITEMS + AMOUNTS) ================= */}
      {open ? (
        <tr className="bg-black/[0.015]">
          <td colSpan={7} className="px-5 pb-4">
            <div className="mt-3 bg-white rounded-2xl px-4 py-4 space-y-4">
              {/* ITEMS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Items ({items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={goToOrder}
                    className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                    title="Open order"
                  >
                    Open <ExternalLink size={14} />
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-gray-500">No items</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {items.map((it, idx) => {
                      const snap = it?.productSnapshot || {};
                      const v = it?.variant || {};
                      const size = it?.selectedSize || "";
                      const color = it?.selectedColor || "";

                      const variantText =
                        size || color
                          ? [size ? `Size: ${size}` : "", color ? `Color: ${color}` : ""]
                              .filter(Boolean)
                              .join(" • ")
                          : Array.isArray(v?.attributes)
                          ? v.attributes
                              .map((a) => `${a?.key}:${a?.value}`)
                              .filter(Boolean)
                              .join(", ")
                          : "";

                      const productUrl = buildProductUrl(it);
                      const key = `${orderId}-item-${idx}`;

                      return (
                        <div
                          key={key}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={snap.thumbnail || "/placeholder.png"}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                              alt={snap.title || "Product"}
                              loading="lazy"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {snap.title || "-"}
                                </p>
                                {productUrl ? (
                                  <a
                                    href={productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                    title="Open product on mirayfashions.com"
                                  >
                                    Product <ExternalLink size={14} />
                                  </a>
                                ) : null}
                              </div>

                              <p className="text-xs text-gray-500 truncate">
                                {variantText ||
                                  (v?.sku || snap?.sku
                                    ? `SKU: ${v?.sku || snap?.sku}`
                                    : "")}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900">
                              ₹{money(it?.price)} × {money(it?.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₹{money(it?.subtotal)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TOTALS */}
              <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 text-xs text-gray-700">
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Subtotal: <b>₹{money(order?.subtotal)}</b>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Discount: <b>₹{money(order?.discount)}</b>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Shipping: <b>₹{money(order?.shippingFee)}</b>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Tax: <b>₹{money(order?.tax)}</b>
                </span>
                <span className="ml-auto px-4 py-1 rounded-full bg-black text-white font-semibold">
                  Final: ₹{money(order?.finalPayable)}
                </span>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}