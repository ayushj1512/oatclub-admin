"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ArrowRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";

const BASE_URL = "https://mirayfashions.com";

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
};

// ✅ Payment badge updated: supports exchange + refund_pending + not_applicable
const getPaymentBadge = (order) => {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  const ps = String(order?.paymentStatus || "").toLowerCase();

  // Exchange orders (no money movement)
  if (pm === "exchange") {
    return { label: "Exchange", cls: "bg-blue-50 text-blue-700 border border-blue-100" };
  }

  // COD
  if (pm === "cod") {
    return { label: "COD", cls: "bg-gray-100 text-gray-700 border border-gray-200" };
  }

  // Razorpay (or other online)
  if (pm === "razorpay") {
    if (ps === "paid") return { label: "Paid ✅", cls: "bg-green-50 text-green-700 border border-green-100" };
    if (ps === "pending") return { label: "Pending ⏳", cls: "bg-yellow-50 text-yellow-700 border border-yellow-100" };
    if (ps === "refund_pending") return { label: "Refund Pending ⏳", cls: "bg-orange-50 text-orange-700 border border-orange-100" };
    if (ps === "refunded") return { label: "Refunded ✅", cls: "bg-emerald-50 text-emerald-700 border border-emerald-100" };
    return { label: "Failed ❌", cls: "bg-red-50 text-red-700 border border-red-100" };
  }

  // Payment not applicable (safety)
  if (ps === "not_applicable") {
    return { label: "N/A", cls: "bg-gray-50 text-gray-600 border border-gray-200" };
  }

  return { label: "Unknown", cls: "bg-gray-100 text-gray-700 border border-gray-200" };
};

// ✅ Full fulfillment statuses (from your schema)
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
};

const buildProductUrl = (item) => {
  const productId = item?.productId?._id || item?.productId; // ✅ supports populated or raw id
  return productId ? `${BASE_URL}/category/products/name/${productId}` : "";
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

// ✅ Address formatter
const formatAddress = (a) => {
  if (!a) return "";
  const parts = [a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean);
  return parts.join(", ");
};

// ✅ Coupon label helper (supports null/string/object)
const getCouponLabel = (order) => {
  const c = order?.coupon;
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.code || c.couponCode || c.name || c.title || c._id || "";
};

export default function OrderRow({ order, onUpdated }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const pay = useMemo(() => getPaymentBadge(order), [order]);
  const items = Array.isArray(order?.items) ? order.items : [];
  const orderId = order?._id || order?.id;

  // ✅ Effective status: use fulfillmentStatus; fallback to processing
  const effectiveStatus = order?.fulfillmentStatus || "processing";

  const dt = useMemo(
    () => formatOrderDateTime(order?.createdAt || order?.orderDate),
    [order?.createdAt, order?.orderDate]
  );

  // ✅ Only billing snapshot (fallback shipping)
  const bill = order?.billingAddressSnapshot || order?.shippingAddressSnapshot || null;
  const couponLabel = useMemo(() => getCouponLabel(order), [order]);

  return (
    <>
      <tr className="hover:bg-black/[0.03] transition">
        {/* Order # */}
        <td className="py-4 px-5 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-black/[0.05] transition"
              title="Expand"
              type="button"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {order?.orderNumber || "-"}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {items?.[0]?.productSnapshot?.title
              ? `${items[0].productSnapshot.title}${items.length > 1 ? ` +${items.length - 1} more` : ""}`
              : "No items"}
          </p>

          {/* ✅ Confirmation badge (kept separate from fulfillment) */}
          {order?.isConfirmed ? (
            <span className="mt-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100">
              Confirmed ✅
            </span>
          ) : (
            <span className="mt-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
              Not Confirmed
            </span>
          )}
        </td>

        {/* Customer */}
        <td className="py-4 px-5">
          <div className="font-medium text-gray-900">
            {order?.customerId?.name || order?.shippingAddressSnapshot?.fullName || "Unknown"}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.phone || order?.shippingAddressSnapshot?.phone || ""}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.email || order?.shippingAddressSnapshot?.email || ""}
          </div>
        </td>

        {/* Payment */}
        <td className="py-4 px-5">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${pay.cls}`}>
            {pay.label}
          </span>

          {/* ✅ Optional: show paymentStatus if you want more clarity */}
         
        </td>

        {/* Fulfillment */}
        <td className="py-4 px-5">
          <OrderStatusDropdown
            orderId={orderId}
            currentStatus={effectiveStatus}
            statuses={FULFILLMENT_STATUSES}
            labels={STATUS_LABELS}
            onUpdated={(updatedOrder) => onUpdated?.(updatedOrder)}
          />
        </td>

        {/* Amount */}
        <td className="py-4 px-5 font-semibold text-gray-900">₹{money(order?.finalPayable)}</td>

        {/* Time + Date */}
        <td className="py-4 px-5 text-gray-700">
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-900">{dt.time}</div>
            <div className="text-[11px] text-gray-500">{dt.date}</div>
          </div>
        </td>

        {/* Action */}
        <td className="py-4 px-5">
          <button
            onClick={() => router.push(`/orders/${orderId}`)}
            className="inline-flex items-center gap-1 text-black font-semibold hover:opacity-80 transition"
            type="button"
          >
            View <ArrowRight size={16} />
          </button>
        </td>
      </tr>

      {open ? (
        <tr className="bg-black/[0.015]">
          <td colSpan={7} className="px-5 pb-4">
            <div className="mt-3 bg-white rounded-2xl px-4 py-4 space-y-4">
              {/* Billing + Coupon */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-700">Billing Address</div>

                    <div className="text-sm text-gray-900 mt-1">{bill?.fullName || "-"}</div>

                    <div className="text-xs text-gray-600 mt-0.5">
                      {bill?.phone || ""}
                      {bill?.email ? ` • ${bill.email}` : ""}
                    </div>

                    <div className="text-xs text-gray-600 mt-1">{formatAddress(bill) || "—"}</div>
                  </div>

                  <div className="shrink-0">
                    <div className="text-xs font-semibold text-gray-700">Coupon</div>
                    <div className="mt-1 text-sm text-gray-900 font-semibold">{couponLabel || "—"}</div>

                    {order?.discount ? (
                      <div className="text-xs text-gray-600 mt-0.5">Discount: ₹{money(order.discount)}</div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-0.5">No discount</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-sm">Items ({items.length})</h3>

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
                      const itemKey = `${orderId}-item-${idx}`;

                      return (
                        <div key={itemKey} className="py-3 flex items-center justify-between gap-3">
                          {/* left */}
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
                                    Go to <ExternalLink size={14} />
                                  </a>
                                ) : null}
                              </div>

                              <p className="text-xs text-gray-500 truncate">
                                {variantText || (v?.sku || snap?.sku ? `SKU: ${v?.sku || snap?.sku}` : "")}
                              </p>

                              {v?.variantId ? (
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  VariantId: {String(v.variantId).slice(0, 10)}...
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {/* right */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900">
                              ₹{money(it?.price)} × {money(it?.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">₹{money(it?.subtotal)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Totals */}
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
