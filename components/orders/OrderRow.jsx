"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CreditCard,
  Banknote,
  RefreshCw,
} from "lucide-react";

import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";
import OrderPriorityDropdown from "@/components/orders/OrderPriorityDropdown";
import OrderPaymentStatusDropdown from "@/components/orders/OrderPaymentStatusDropdown";
import OrderRowActions from "@/components/orders/OrderRowActions";

const BASE_URL = "https://oatclub.in";

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

const paymentMethodMeta = (method) => {
  const key = String(method || "cod").toLowerCase();

  if (key === "razorpay") {
    return {
      label: "Razorpay",
      icon: CreditCard,
      className: "bg-gray-950 text-white border-gray-950",
    };
  }

  if (key === "exchange") {
    return {
      label: "Exchange",
      icon: RefreshCw,
      className: "bg-gray-100 text-gray-800 border-gray-200",
    };
  }

  return {
    label: "COD",
    icon: Banknote,
    className: "bg-white text-gray-800 border-gray-200",
  };
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

  const paymentMethod = useMemo(
    () => paymentMethodMeta(order?.paymentMethod),
    [order?.paymentMethod]
  );

  const PaymentMethodIcon = paymentMethod.icon;

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
      <tr className="border-b border-black/[0.06] bg-white transition hover:bg-gray-50/80">
        <td className="px-5 py-4 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleOpen}
              title="Expand"
              className="rounded-md border border-black/[0.06] bg-gray-50 p-1.5 text-gray-700 transition hover:bg-gray-100"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            <button
              type="button"
              onClick={goToOrder}
              title="Open order"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <span className="font-mono text-sm tracking-wide text-gray-950 underline underline-offset-2 decoration-black/25 hover:decoration-black">
                {order?.orderNumber || "-"}
              </span>
              <ExternalLink size={14} className="opacity-70" />
            </button>
          </div>

          <p className="mt-1 max-w-[280px] truncate text-xs text-gray-500">
            {firstTitle
              ? `${firstTitle}${items.length > 1 ? ` +${items.length - 1} more` : ""}`
              : "No items"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {order?.isConfirmed ? (
              <span className="inline-flex rounded-md border border-gray-950 bg-gray-950 px-2 py-0.5 text-[11px] font-semibold text-white">
                Confirmed
              </span>
            ) : (
              <span className="inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
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

        <td className="px-5 py-4">
          <div className="font-medium text-gray-900">
            {order?.customerId?.name ||
              order?.customerName ||
              order?.shippingAddressSnapshot?.fullName ||
              "Unknown"}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.phone ||
              order?.customerPhone ||
              order?.shippingAddressSnapshot?.phone ||
              ""}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.email ||
              order?.customerEmail ||
              order?.shippingAddressSnapshot?.email ||
              ""}
          </div>
        </td>

        <td className="px-5 py-4">
          <OrderPaymentStatusDropdown
            orderId={orderId}
            currentStatus={paymentStatus}
            onUpdated={handleUpdated}
          />
        </td>

        <td className="px-5 py-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${paymentMethod.className}`}
          >
            <PaymentMethodIcon size={13} />
            {paymentMethod.label}
          </span>
        </td>

        <td className="px-5 py-4">
          <OrderStatusDropdown
            orderId={orderId}
            currentStatus={effectiveStatus}
            order={order}
            onUpdated={handleUpdated}
          />
        </td>

        <td className="px-5 py-4 font-mono text-sm font-semibold text-gray-950">
          ₹{money(order?.finalPayable)}
        </td>

        <td className="px-5 py-4 text-gray-700">
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-900">{dt.time}</div>
            <div className="text-[11px] text-gray-500">{dt.date}</div>
          </div>
        </td>

        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-2">
            <OrderRowActions
              order={order}
              courierName={
                order?.shipment?.courierName ||
                order?.shipment?.shiprocket?.courierName ||
                order?.shipment?.xpressbees?.courierName ||
                order?.courierName ||
                ""
              }
              trackingId={
                order?.shipment?.awb ||
                order?.shipment?.shiprocket?.awb ||
                order?.shipment?.xpressbees?.awb ||
                order?.trackingId ||
                order?.trackingDetails?.trackingId ||
                ""
              }
            />
          </div>
        </td>
      </tr>

      {open ? (
        <tr className="border-b border-black/[0.06] bg-gray-50">
          <td colSpan={8} className="px-5 pb-4">
            <div className="mt-3 space-y-4 rounded-lg border border-black/[0.06] bg-white px-4 py-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Items ({items.length})
                  </h3>

                  <button
                    type="button"
                    onClick={goToOrder}
                    title="Open order"
                    className="inline-flex items-center gap-1 rounded-md border border-black/[0.06] px-2.5 py-1 text-xs font-semibold text-gray-900 transition hover:bg-gray-50"
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
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={snap.thumbnail || "/placeholder.png"}
                              alt={snap.title || "Product"}
                              loading="lazy"
                              className="h-10 w-10 rounded-lg border border-gray-100 object-cover"
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
                                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-950"
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
                                  <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
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
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Subtotal: <b>₹{money(order?.subtotal)}</b>
                </span>
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Discount: <b>₹{money(order?.discount)}</b>
                </span>
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Shipping: <b>₹{money(order?.shippingFee)}</b>
                </span>
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  Tax: <b>₹{money(order?.tax)}</b>
                </span>
                <span className="ml-auto rounded-md bg-black px-4 py-1 font-semibold text-white">
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
