"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";
import OrderPriorityDropdown from "@/components/orders/OrderPriorityDropdown";
import OrderPaymentStatusDropdown from "@/components/orders/OrderPaymentStatusDropdown";
import OrderRowActions from "@/components/orders/OrderRowActions";

const BASE_URL = "https://mirayfashions.com";

const safe = (v) => (v == null ? "" : String(v));

const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

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

function OrderRow({ order, onUpdated }) {
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items]
  );

  const orderId = order?._id || order?.id;

  const effectiveStatus = useMemo(
    () => String(order?.fulfillmentStatus || "processing").toLowerCase(),
    [order?.fulfillmentStatus]
  );

  const paymentStatus = useMemo(
    () => String(order?.paymentStatus || "pending").toLowerCase(),
    [order?.paymentStatus]
  );

  const dt = useMemo(
    () => formatOrderDateTime(order?.createdAt || order?.orderDate),
    [order?.createdAt, order?.orderDate]
  );

  const firstItem = items[0] || null;
  const firstTitle = firstItem?.productSnapshot?.title || "";

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const goToOrder = useCallback(() => {
    if (!orderId || typeof window === "undefined") return;
    window.open(`/orders/${orderId}`, "_blank", "noopener,noreferrer");
  }, [orderId]);

  const handleUpdated = useCallback(
    (payload) => {
      onUpdated?.(payload?.order ?? payload);
    },
    [onUpdated]
  );

  return (
    <>
      <tr className="hover:bg-black/[0.03] transition">
        <td className="py-4 px-5 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleOpen}
              title="Expand"
              className="p-1.5 rounded-lg hover:bg-black/[0.05] transition"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            <button
              type="button"
              onClick={goToOrder}
              title="Open order"
              className="text-left inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/[0.05] focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <span className="underline underline-offset-2 decoration-black/30 hover:decoration-black">
                {order?.orderNumber || "-"}
              </span>
              <ExternalLink size={14} className="opacity-70" />
            </button>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {firstTitle
              ? `${firstTitle}${items.length > 1 ? ` +${items.length - 1} more` : ""}`
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
              onUpdated={handleUpdated}
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
          <OrderPaymentStatusDropdown
            orderId={orderId}
            currentStatus={paymentStatus}
            onUpdated={handleUpdated}
          />
        </td>

        <td className="py-4 px-5">
          <OrderStatusDropdown
            orderId={orderId}
            currentStatus={effectiveStatus}
            order={order}
            onUpdated={handleUpdated}
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

        <td className="py-4 px-5">
          <div className="flex items-center justify-end gap-2">
            <OrderRowActions
              order={order}
              courierName={
                order?.shipment?.courierName || order?.courierName || ""
              }
              trackingId={order?.shipment?.awb || order?.trackingId || ""}
            />
          </div>
        </td>
      </tr>

      {open ? (
        <tr className="bg-black/[0.015]">
          <td colSpan={7} className="px-5 pb-4">
            <div className="mt-3 bg-white rounded-2xl px-4 py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Items ({items.length})
                  </h3>

                  <button
                    type="button"
                    onClick={goToOrder}
                    title="Open order"
                    className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
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
                      const variant = it?.variant || {};
                      const size = it?.selectedSize || "";
                      const color = it?.selectedColor || "";
                      const productCode = safe(snap?.productCode).trim();
                      const productUrl = buildProductUrl(it);

                      const variantText =
                        size || color
                          ? [
                              size ? `Size: ${size}` : "",
                              color ? `Color: ${color}` : "",
                            ]
                              .filter(Boolean)
                              .join(" • ")
                          : Array.isArray(variant?.attributes)
                            ? variant.attributes
                                .map((a) => `${a?.key}:${a?.value}`)
                                .filter(Boolean)
                                .join(", ")
                            : "";

                      return (
                        <div
                          key={`${orderId}-item-${idx}`}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={snap.thumbnail || "/placeholder.png"}
                              alt={snap.title || "Product"}
                              loading="lazy"
                              className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {snap.title || "-"}
                                </p>

                                {productUrl ? (
                                  <a
                                    href={productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open product"
                                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                  >
                                    Product <ExternalLink size={14} />
                                  </a>
                                ) : null}
                              </div>

                              <p className="text-xs text-gray-500 truncate">
                                {variantText ||
                                  (variant?.sku || snap?.sku
                                    ? `SKU: ${variant?.sku || snap?.sku}`
                                    : "")}
                              </p>

                              {productCode ? (
                                <div className="mt-1">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#800020]/8 text-[#800020] border border-[#800020]/15">
                                    Code: {productCode}
                                  </span>
                                </div>
                              ) : null}
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

export default memo(OrderRow, (prev, next) => {
  return prev.order === next.order && prev.onUpdated === next.onUpdated;
});