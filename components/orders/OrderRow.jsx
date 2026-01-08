"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
};

const getPaymentBadge = (order) => {
  if (order?.paymentMethod === "cod") {
    return {
      label: "COD",
      cls: "bg-gray-100 text-gray-700",
    };
  }

  if (order?.paymentMethod === "razorpay") {
    if (order?.paymentStatus === "paid") {
      return {
        label: "Paid ✅",
        cls: "bg-green-50 text-green-700",
      };
    }
    if (order?.paymentStatus === "pending") {
      return {
        label: "Pending ⏳",
        cls: "bg-yellow-50 text-yellow-700",
      };
    }
    return {
      label: "Failed ❌",
      cls: "bg-red-50 text-red-700",
    };
  }

  return {
    label: "Unknown",
    cls: "bg-gray-100 text-gray-700",
  };
};

export default function OrderRow({ order, onUpdated }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const pay = getPaymentBadge(order);
  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <>
      {/* ===========================
          MAIN ROW
      ============================ */}
      <tr className="hover:bg-black/[0.03] transition">
        {/* Order # */}
        <td className="py-4 px-5 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-black/[0.05] transition"
              title="Expand"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {order.orderNumber}
          </div>

          {/* ✅ Mini Item Preview */}
          <p className="text-xs text-gray-500 mt-1">
            {items?.[0]?.productSnapshot?.title
              ? `${items[0].productSnapshot.title}${
                  items.length > 1 ? ` +${items.length - 1} more` : ""
                }`
              : "No items"}
          </p>
        </td>

        {/* Customer */}
        <td className="py-4 px-5">
          <div className="font-medium text-gray-900">
            {order.customerId?.name || "Unknown"}
          </div>
          <div className="text-xs text-gray-500">
            {order.customerId?.phone || ""}
          </div>
        </td>

        {/* Payment Badge */}
        <td className="py-4 px-5">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${pay.cls}`}
          >
            {pay.label}
          </span>
        </td>

        {/* Fulfillment Dropdown */}
        <td className="py-4 px-5">
          <OrderStatusDropdown
            orderId={order._id}
            currentStatus={order.fulfillmentStatus}
            onUpdated={(updatedOrder) => {
              if (onUpdated) onUpdated(updatedOrder);
            }}
          />
        </td>

        {/* Amount */}
        <td className="py-4 px-5 font-semibold text-gray-900">
          ₹{money(order.finalPayable)}
        </td>

        {/* Date */}
        <td className="py-4 px-5 text-gray-700">
          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
        </td>

        {/* Action */}
        <td className="py-4 px-5">
          <button
            onClick={() => router.push(`/orders/${order._id}`)}
            className="inline-flex items-center gap-1 text-black font-semibold hover:opacity-80 transition"
          >
            View <ArrowRight size={16} />
          </button>
        </td>
      </tr>

      {/* ===========================
          EXPANDED ROW (COMPACT)
      ============================ */}
      {open && (
        <tr className="bg-black/[0.015]">
          <td colSpan={7} className="px-5 pb-4">
            <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-4">
              
              {/* ✅ COMPACT ITEMS */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Items ({items.length})
                </h3>

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

                      return (
                        <div
                          key={idx}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          {/* left */}
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={snap.thumbnail || "/placeholder.png"}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                              alt={snap.title || "Product"}
                            />

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {snap.title || "-"}
                              </p>

                              <p className="text-xs text-gray-500 truncate">
                                {variantText ||
                                  (v?.sku || snap?.sku
                                    ? `SKU: ${v?.sku || snap?.sku}`
                                    : "")}
                              </p>

                              {/* ✅ variantId mini */}
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
                              ₹{money(it.price)} × {money(it.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₹{money(it.subtotal)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ✅ COMPACT TOTALS */}
              <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 text-xs text-gray-700">
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Subtotal: <b>₹{money(order.subtotal)}</b>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Discount: <b>₹{money(order.discount)}</b>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Shipping: <b>₹{money(order.shippingFee)}</b>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  Tax: <b>₹{money(order.tax)}</b>
                </span>

                <span className="ml-auto px-4 py-1 rounded-full bg-black text-white font-semibold">
                  Final: ₹{money(order.finalPayable)}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
