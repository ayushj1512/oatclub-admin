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
  const key = String(method || "cod")
    .trim()
    .toLowerCase();

  const map = {
    cod: {
      label: "COD",
      icon: Banknote,
      className:
        "bg-white text-gray-800 border-gray-200",
    },

    partial_cod: {
      label: "Partial COD",
      icon: Banknote,
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    },

    razorpay: {
      label: "Razorpay",
      icon: CreditCard,
      className:
        "bg-gray-950 text-white border-gray-950",
    },

    manual_prepaid: {
      label: "Prepaid",
      icon: CreditCard,
      className:
        "bg-blue-50 text-blue-700 border-blue-200",
    },

    wallet: {
      label: "Wallet",
      icon: CreditCard,
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    },

    exchange: {
      label: "Exchange",
      icon: RefreshCw,
      className:
        "bg-gray-100 text-gray-800 border-gray-200",
    },

    complimentary: {
      label: "Complimentary",
      icon: CreditCard,
      className:
        "bg-violet-50 text-violet-700 border-violet-200",
    },
  };

  return (
    map[key] || {
      label: key || "N/A",
      icon: CreditCard,
      className:
        "bg-gray-50 text-gray-700 border-gray-200",
    }
  );
};



function OrderRow({
  order,
  childOrders = [],
  onUpdated,
  openActionsUp = false,
  selectable = false,
  selected = false,
  onSelect,
}) {
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items]
  );

  const orderId = order?._id || order?.id;

  const isSplitParent =
    String(order?.orderType || "").toLowerCase() === "parent";

  const hasChildren =
    Array.isArray(childOrders) &&
    childOrders.length > 0;

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

  const handleChildUpdated = useCallback(
    (updatedChild) => {
      const child = updatedChild?.order ?? updatedChild;

      if (!child?._id) return;

      onUpdated?.({
        ...child,
        __isChildOrderUpdate: true,
      });
    },
    [onUpdated]
  );

  return (
    <>
      <tr className="border-b border-black/[0.06] bg-white transition hover:bg-gray-50/80">
        {selectable ? (
          <td className="w-12 px-4 py-4 align-top">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelect?.(orderId, event.target.checked)}
              aria-label={`Select order ${order?.orderNumber || orderId || ""}`}
              className="h-4 w-4 rounded border-gray-300 accent-black"
            />
          </td>
        ) : null}

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

            {order?.fulfillmentReadiness &&
              !order?.isConfirmed &&
              String(order?.paymentMethod || "").toLowerCase() === "cod" &&
              effectiveStatus === "processing" && (
                <>
                  {order.fulfillmentReadiness?.isFullyFulfillable ? (
                    <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      🔥 Ready to Fulfill
                    </span>
                  ) : order.fulfillmentReadiness?.status === "partial" ? (
                    <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Partial Inventory
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      Waiting for Inventory
                    </span>
                  )}
                </>
              )}

            {(
              order?.isExchangeOrder === true ||
              String(order?.paymentMethod || "").toLowerCase() === "exchange" ||
              String(order?.orderNumber || "").toUpperCase().endsWith("-E")
            ) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 shadow-sm">
                  <RefreshCw size={11} strokeWidth={2.5} />
                  Exchange Order
                </span>
              )}

            {order?.isInfluencerOrder && (
              <span className="inline-flex rounded-md border border-pink-200 bg-pink-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-pink-700">
                Influencer
              </span>
            )}

            {order?.isTestingOrder === true && (
              <span
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                }}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
              >
                Test Order
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
              openUp={openActionsUp}
              onUpdated={handleUpdated}
            />
          </div>
        </td>
      </tr>

      {open ? (
        <tr className="border-b border-black/[0.06] bg-gray-50">
          <td
            colSpan={selectable ? 9 : 8}
            className="px-5 pb-4"
          >
            <div className="mt-3 space-y-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">

              {/* =====================================================
            SPLIT PARENT VIEW
        ===================================================== */}
              {isSplitParent && hasChildren ? (
                <div className="space-y-4">

                  {/* Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-950">
                        Split Shipments
                      </h3>

                      <p className="mt-0.5 text-xs text-gray-500">
                        This order is split into {childOrders.length} shipments
                      </p>
                    </div>

                    <span className="text-sm font-black text-gray-950">
                      {childOrders.length} Shipments
                    </span>
                  </div>

                  {/* =================================================
                TOP SHIPMENT SUMMARY
            ================================================= */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {childOrders.map((child, index) => {
                      const childItems = Array.isArray(child?.items)
                        ? child.items
                        : [];

                      const qty = childItems.reduce(
                        (sum, item) =>
                          sum + Number(item?.quantity || 0),
                        0,
                      );

                      const suffix =
                        child?.splitSuffix ||
                        String(child?.orderNumber || "")
                          .split("-")
                          .pop() ||
                        String.fromCharCode(65 + index);

                      const isA = suffix === "A";

                      const itemNames = childItems
                        .map(
                          (item) =>
                            item?.productSnapshot?.title,
                        )
                        .filter(Boolean);

                      return (
                        <div
                          key={child?._id}
                          className={`flex min-w-0 items-center gap-4 rounded-2xl border p-4 text-left ${isA
                              ? "border-blue-200 bg-blue-50/30"
                              : "border-amber-200 bg-amber-50/30"
                            }`}
                        >
                          {/* A / B */}
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white ${isA
                              ? "bg-blue-600"
                              : "bg-amber-500"
                              }`}
                          >
                            {suffix}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    `/orders/${child._id}`,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                                className="font-mono text-base font-black text-gray-950 underline underline-offset-2 decoration-black/40 hover:decoration-black"
                                title={`Open order ${child?.orderNumber || ""}`}
                              >
                                {child?.orderNumber}
                              </button>

                              <span className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                {qty} Items
                              </span>
                            </div>

                            <p className="mt-1 truncate text-xs text-gray-500">
                              {itemNames
                                .slice(0, 2)
                                .join(" • ")}

                              {itemNames.length > 2
                                ? ` +${itemNames.length - 2} more`
                                : ""}
                            </p>
                          </div>

                          {/* Amount */}
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500">
                                Shipment Total
                              </p>

                              <p className="font-mono text-base font-black text-gray-950">
                                ₹{money(child?.finalPayable)}
                              </p>
                            </div>

                            <OrderRowActions
                              order={child}
                              courierName={
                                child?.shipment?.courierName ||
                                child?.shipment?.shiprocket?.courierName ||
                                child?.shipment?.xpressbees?.courierName ||
                                child?.courierName ||
                                ""
                              }
                              trackingId={
                                child?.shipment?.awb ||
                                child?.shipment?.shiprocket?.awb ||
                                child?.shipment?.xpressbees?.awb ||
                                child?.trackingId ||
                                child?.trackingDetails?.trackingId ||
                                ""
                              }
                              onUpdated={handleChildUpdated}
                            />
                          </div>
                        </div>                      );
                    })}
                  </div>

                  {/* =================================================
                DETAILED SHIPMENTS
            ================================================= */}
                  <div className="space-y-3">
                    {childOrders.map((child, index) => {
                      const childItems = Array.isArray(child?.items)
                        ? child.items
                        : [];

                      const suffix =
                        child?.splitSuffix ||
                        String(child?.orderNumber || "")
                          .split("-")
                          .pop() ||
                        String.fromCharCode(65 + index);

                      const isA = suffix === "A";

                      return (
                        <div
                          key={`shipment-${child?._id}`}
                          className={`overflow-hidden rounded-2xl border ${isA
                            ? "border-blue-200 bg-blue-50/20"
                            : "border-amber-200 bg-amber-50/20"
                            }`}
                        >
                          {/* Shipment Header */}
                          <div
                            className={`flex items-center justify-between gap-4 border-b px-4 py-3 ${isA
                              ? "border-blue-200 bg-blue-50/60"
                              : "border-amber-200 bg-amber-50/60"
                              }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${isA
                                  ? "bg-blue-600"
                                  : "bg-amber-500"
                                  }`}
                              >
                                {suffix}
                              </div>

                              <div className="flex min-w-0 flex-wrap items-center gap-3">
                                <span className="text-sm text-gray-700">
                                  Shipment{" "}
                                  <b className="font-mono font-black text-gray-950">
                                    {child?.orderNumber}
                                  </b>
                                </span>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${isA
                                    ? "border-blue-200 bg-white text-blue-700"
                                    : "border-amber-200 bg-white text-amber-700"
                                    }`}
                                >
                                  {String(
                                    child?.fulfillmentStatus ||
                                    "processing",
                                  ).replaceAll("_", " ")}
                                </span>

                                <span className="text-xs font-medium text-gray-600">
                                  {childItems.length} Items
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-[10px] text-gray-500">
                                Shipment Total
                              </p>

                              <p className="font-mono text-base font-black text-gray-950">
                                ₹{money(child?.finalPayable)}
                              </p>
                            </div>
                          </div>

                          {/* Shipment Items */}
                          <div className="divide-y divide-gray-100 bg-white">
                            {childItems.map((item, idx) => {
                              const snap =
                                item?.productSnapshot || {};

                              const size =
                                item?.selectedSize || "";

                              const productCode = safe(
                                snap?.productCode,
                              ).trim();

                              const productUrl =
                                buildProductUrl(item);

                              return (
                                <div
                                  key={`${child?._id}-item-${idx}`}
                                  className="flex items-center justify-between gap-4 px-4 py-3"
                                >
                                  {/* Product */}
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div
                                      className={`h-14 w-1 shrink-0 rounded-full ${isA
                                        ? "bg-blue-500"
                                        : "bg-amber-500"
                                        }`}
                                    />

                                    <img
                                      src={
                                        snap.thumbnail ||
                                        "/placeholder.png"
                                      }
                                      alt={
                                        snap.title ||
                                        "Product"
                                      }
                                      loading="lazy"
                                      className="h-14 w-14 shrink-0 rounded-xl border border-gray-100 object-cover"
                                    />

                                    <div className="min-w-0">
                                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-bold text-gray-950">
                                          {snap.title || "-"}
                                        </p>

                                        {productUrl ? (
                                          <a
                                            href={productUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-gray-500 transition hover:text-black"
                                          >
                                            <ExternalLink
                                              size={13}
                                            />
                                          </a>
                                        ) : null}
                                      </div>

                                      {size ? (
                                        <p className="mt-0.5 text-xs text-gray-500">
                                          Size: {size}
                                        </p>
                                      ) : null}

                                      {productCode ? (
                                        <span className="mt-1 inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                          Code:{" "}
                                          {productCode}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Price */}
                                  <div className="ml-auto shrink-0 text-right">
                                    <p className="font-mono text-sm font-black text-gray-950">
                                      ₹{money(item?.price)} ×{" "}
                                      {money(item?.quantity)}
                                    </p>

                                    <p className="mt-0.5 text-xs text-gray-500">
                                      ₹{money(item?.subtotal)}
                                    </p>
                                  </div>

                                  {/* Assignment */}
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${isA
                                      ? "bg-blue-600"
                                      : "bg-amber-500"
                                      }`}
                                  >
                                    {suffix}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ===================================================
                   NORMAL NON-SPLIT ORDER ITEMS
                =================================================== */
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
                      Open
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No items
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {items.map((it, idx) => {
                        const snap =
                          it?.productSnapshot || {};

                        const variant =
                          it?.variant || {};

                        const size =
                          it?.selectedSize || "";

                        const color =
                          it?.selectedColor || "";

                        const productCode = safe(
                          snap?.productCode,
                        ).trim();

                        const productUrl =
                          buildProductUrl(it);

                        const variantText =
                          size || color
                            ? [
                              size
                                ? `Size: ${size}`
                                : "",
                              color
                                ? `Color: ${color}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" • ")
                            : Array.isArray(
                              variant?.attributes,
                            )
                              ? variant.attributes
                                .map(
                                  (a) =>
                                    `${a?.key}:${a?.value}`,
                                )
                                .filter(Boolean)
                                .join(", ")
                              : "";

                        return (
                          <div
                            key={`${orderId}-item-${idx}`}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <img
                                src={
                                  snap.thumbnail ||
                                  "/placeholder.png"
                                }
                                alt={
                                  snap.title ||
                                  "Product"
                                }
                                loading="lazy"
                                className="h-10 w-10 rounded-lg border border-gray-100 object-cover"
                              />

                              <div className="min-w-0">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-gray-900">
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
                                      Product
                                      <ExternalLink
                                        size={14}
                                      />
                                    </a>
                                  ) : null}
                                </div>

                                <p className="truncate text-xs text-gray-500">
                                  {variantText ||
                                    (variant?.sku ||
                                      snap?.sku
                                      ? `SKU: ${variant?.sku ||
                                      snap?.sku
                                      }`
                                      : "")}
                                </p>

                                {productCode ? (
                                  <div className="mt-1">
                                    <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                                      Code:{" "}
                                      {productCode}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                ₹{money(it?.price)} ×{" "}
                                {money(it?.quantity)}
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
              )}

              {/* =====================================================
            ORDER FINANCIAL SUMMARY
        ===================================================== */}
              <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-gray-500">
                    Items
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-950">
                    {items.reduce(
                      (sum, item) =>
                        sum +
                        Number(item?.quantity || 0),
                      0,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-gray-500">
                    Subtotal
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-gray-950">
                    ₹{money(order?.subtotal)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-gray-500">
                    Discount
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-emerald-600">
                    - ₹{money(order?.discount)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-gray-500">
                    Shipping
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-gray-950">
                    ₹{money(order?.shippingFee)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-gray-500">
                    Tax
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-gray-950">
                    ₹{money(order?.tax)}
                  </p>
                </div>

                <div className="rounded-xl bg-black px-3 py-2 text-center text-white">
                  <p className="text-[10px] font-medium text-white/70">
                    Final Amount
                  </p>
                  <p className="mt-1 font-mono text-base font-black">
                    ₹{money(order?.finalPayable)}
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default memo(OrderRow, (prev, next) => {
  return (
    prev.order === next.order &&
    prev.childOrders === next.childOrders &&
    prev.onUpdated === next.onUpdated &&
    prev.openActionsUp === next.openActionsUp &&
    prev.selectable === next.selectable &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect
  );
});
