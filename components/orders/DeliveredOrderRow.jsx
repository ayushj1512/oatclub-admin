"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  CreditCard,
  ExternalLink,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";

import DeliveryHealthBadge, {
  getDeliveredAt,
  getDeliveryHealth,
} from "@/components/orders/DeliveryHealthBadge";

const safe = (value) => String(value ?? "").trim();

const money = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getShipment = (order = {}) => {
  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};

  return {
    awb:
      shipment?.awb ||
      shiprocket?.awb ||
      order?.trackingId ||
      order?.trackingDetails?.trackingId ||
      "",

    courier:
      shipment?.courierName ||
      shiprocket?.courierName ||
      order?.courierName ||
      "",

    trackingUrl:
      shipment?.trackingUrl ||
      shiprocket?.trackingUrl ||
      order?.trackingUrl ||
      "",

    provider:
      shipment?.provider ||
      "shiprocket",
  };
};

export default function DeliveredOrderRow({
  order,
}) {
  const [open, setOpen] = useState(false);

  const orderId = order?._id || order?.id;

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items]
  );

  const health = useMemo(
    () => getDeliveryHealth(order),
    [order]
  );

  const shipment = useMemo(
    () => getShipment(order),
    [order]
  );

  const customerName =
    order?.customerId?.name ||
    order?.customerName ||
    order?.shippingAddressSnapshot?.fullName ||
    "Unknown Customer";

  const phone =
    order?.customerId?.phone ||
    order?.customerPhone ||
    order?.shippingAddressSnapshot?.phone ||
    "";

  const email =
    order?.customerId?.email ||
    order?.customerEmail ||
    order?.shippingAddressSnapshot?.email ||
    "";

  const address = order?.shippingAddressSnapshot || {};

  const deliveredAt = getDeliveredAt(order);

  const packedAt =
    order?.fulfillmentDates?.packedAt ||
    order?.packedAt ||
    null;

  const paymentMethod = safe(
    order?.paymentMethod || "cod"
  ).toLowerCase();

  const paymentStatus = safe(
    order?.paymentStatus || "pending"
  ).toLowerCase();

  const isCod = paymentMethod === "cod";

  const PaymentIcon = isCod
    ? Banknote
    : CreditCard;

  const firstItem = items[0] || {};

  const firstTitle =
    firstItem?.productSnapshot?.title ||
    "No product title";

  const firstSize =
    firstItem?.selectedSize ||
    firstItem?.variant?.size ||
    "";

  const firstSku =
    firstItem?.variant?.sku ||
    firstItem?.productSnapshot?.sku ||
    "";

  const openOrder = () => {
    if (!orderId) return;

    window.open(
      `/orders/${orderId}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      <tr
        className={`border-b border-black/[0.06] bg-white transition hover:bg-gray-50/70 ${health.errorCount
            ? "border-l-2 border-l-red-400"
            : health.warningCount
              ? "border-l-2 border-l-amber-400"
              : "border-l-2 border-l-emerald-400"
          }`}
      >
        {/* ORDER */}
        <td className="px-5 py-4 align-top">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="mt-0.5 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 transition hover:bg-gray-100"
              title="Delivery audit"
            >
              {open ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            <div className="min-w-0">
              <button
                type="button"
                onClick={openOrder}
                className="inline-flex items-center gap-1 font-mono text-sm font-black text-gray-950 underline decoration-black/20 underline-offset-2 hover:decoration-black"
              >
                #{order?.orderNumber || "-"}
                <ExternalLink size={12} />
              </button>

              <p className="mt-1 max-w-[240px] truncate text-xs font-medium text-gray-700">
                {firstTitle}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {firstSize ? (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                    {firstSize}
                  </span>
                ) : null}

                {firstSku ? (
                  <span className="font-mono text-[10px] text-gray-400">
                    {firstSku}
                  </span>
                ) : null}

                {items.length > 1 ? (
                  <span className="text-[10px] font-semibold text-gray-500">
                    +{items.length - 1} more
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </td>

        {/* CUSTOMER */}
        <td className="px-5 py-4 align-top">
          <p className="font-semibold text-gray-950">
            {customerName}
          </p>

          {phone ? (
            <p className="mt-1 text-xs text-gray-500">
              {phone}
            </p>
          ) : null}

          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={11} />

            <span>
              {[address?.city, address?.state]
                .filter(Boolean)
                .join(", ") || "-"}
            </span>
          </div>

          {address?.pincode ? (
            <p className="ml-4 text-[10px] text-gray-400">
              {address.pincode}
            </p>
          ) : null}
        </td>

        {/* DELIVERY */}
        <td className="px-5 py-4 align-top">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <PackageCheck size={13} />
            Delivered
          </span>

          {deliveredAt ? (
            <p className="mt-2 text-xs font-semibold text-gray-800">
              {formatDate(deliveredAt)}
            </p>
          ) : (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600">
              <CircleAlert size={12} />
              Date missing
            </p>
          )}

          {packedAt ? (
            <p className="mt-1 text-[10px] text-gray-400">
              Packed {formatDate(packedAt)}
            </p>
          ) : null}
        </td>

        {/* COURIER */}
        <td className="px-5 py-4 align-top">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <Truck size={15} />
            </div>

            <div className="min-w-0">
              <p className="max-w-[150px] truncate text-xs font-bold text-gray-900">
                {shipment.courier || "Courier missing"}
              </p>

              <p className="mt-0.5 max-w-[160px] truncate font-mono text-[10px] text-gray-500">
                {shipment.awb || "AWB missing"}
              </p>
            </div>
          </div>

          {shipment.trackingUrl ? (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
            >
              Track shipment
              <ExternalLink size={10} />
            </a>
          ) : null}
        </td>

        {/* PAYMENT */}
        <td className="px-5 py-4 align-top">
          <div className="flex items-center gap-2">
            <PaymentIcon size={15} />

            <span className="text-xs font-bold uppercase text-gray-800">
              {paymentMethod}
            </span>
          </div>

          <p className="mt-2 font-mono text-sm font-black text-gray-950">
            {money(order?.finalPayable)}
          </p>

          <span
            className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : isCod && paymentStatus === "pending"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-600"
              }`}
          >
            {paymentStatus.replaceAll("_", " ")}
          </span>
        </td>

        {/* HEALTH */}
        <td className="px-5 py-4 align-top">
          <DeliveryHealthBadge
            order={order}
            compact
          />

          <div className="mt-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${health.score >= 90
                    ? "bg-emerald-500"
                    : health.score >= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                style={{
                  width: `${health.score}%`,
                }}
              />
            </div>

            <p className="mt-1 text-[10px] font-medium text-gray-400">
              Health {health.score}%
            </p>
          </div>
        </td>

        {/* ACTION */}
        <td className="px-5 py-4 align-top text-right">
          <button
            type="button"
            onClick={openOrder}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
          >
            View
            <ExternalLink size={12} />
          </button>
        </td>
      </tr>

      {/* DELIVERY AUDIT */}
      {open ? (
        <tr className="border-b border-black/[0.06] bg-gray-50/70">
          <td
            colSpan={7}
            className="px-5 py-4"
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-400">
                    Delivery Audit
                  </p>

                  <h3 className="mt-1 text-base font-black text-gray-950">
                    Order #{order?.orderNumber}
                  </h3>
                </div>

                <DeliveryHealthBadge order={order} />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
                {/* TIMELINE */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-950">
                    <Clock3 size={14} />
                    TIMELINE
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <p className="text-gray-400">
                        Order Created
                      </p>
                      <p className="font-semibold text-gray-800">
                        {formatDate(
                          order?.orderDate ||
                          order?.createdAt
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">
                        Packed
                      </p>
                      <p className="font-semibold text-gray-800">
                        {formatDate(packedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">
                        Delivered
                      </p>
                      <p
                        className={`font-semibold ${deliveredAt
                            ? "text-emerald-700"
                            : "text-red-600"
                          }`}
                      >
                        {deliveredAt
                          ? formatDate(deliveredAt)
                          : "Timestamp missing"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SHIPPING */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-950">
                    <Truck size={14} />
                    SHIPMENT
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <p className="text-gray-400">
                        Courier
                      </p>
                      <p className="font-semibold text-gray-800">
                        {shipment.courier || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">
                        AWB
                      </p>
                      <p className="break-all font-mono font-semibold text-gray-800">
                        {shipment.awb || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">
                        Provider
                      </p>
                      <p className="font-semibold capitalize text-gray-800">
                        {shipment.provider}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CUSTOMER */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-black text-gray-950">
                    CUSTOMER
                  </p>

                  <div className="mt-3 space-y-1 text-xs">
                    <p className="font-bold text-gray-900">
                      {customerName}
                    </p>

                    <p className="text-gray-600">
                      {phone || "-"}
                    </p>

                    <p className="break-all text-gray-500">
                      {email || "-"}
                    </p>

                    <p className="pt-2 text-gray-600">
                      {[
                        address?.city,
                        address?.state,
                        address?.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </p>
                  </div>
                </div>

                {/* HEALTH */}
                <div className="rounded-xl bg-gray-950 p-4 text-white">
                  <p className="text-xs font-black">
                    DELIVERY HEALTH
                  </p>

                  <p className="mt-3 text-3xl font-black">
                    {health.score}%
                  </p>

                  <p className="mt-1 text-xs text-white/50">
                    {health.issueCount
                      ? `${health.issueCount} issue${health.issueCount === 1
                        ? ""
                        : "s"
                      } detected`
                      : "Everything looks clean"}
                  </p>
                </div>
              </div>

              {/* PRODUCTS */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-black text-gray-950">
                  DELIVERED ITEMS
                </p>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {items.map((item, index) => {
                    const snapshot =
                      item?.productSnapshot || {};

                    return (
                      <div
                        key={
                          item?.lineId ||
                          `${orderId}-${index}`
                        }
                        className="flex items-center gap-3 border-b border-gray-100 p-3 last:border-b-0"
                      >
                        {snapshot?.thumbnail ? (
                          <img
                            src={snapshot.thumbnail}
                            alt={snapshot?.title || ""}
                            className="h-12 w-12 shrink-0 rounded-lg border border-gray-100 object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-gray-950">
                            {snapshot?.title || "-"}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                            <span>
                              Code:{" "}
                              {snapshot?.productCode ||
                                "-"}
                            </span>

                            <span>
                              SKU:{" "}
                              {item?.variant?.sku ||
                                "-"}
                            </span>

                            <span>
                              Size:{" "}
                              {item?.selectedSize ||
                                "-"}
                            </span>

                            <span>
                              Qty:{" "}
                              {item?.quantity || 1}
                            </span>
                          </div>
                        </div>

                        <p className="shrink-0 font-mono text-xs font-black text-gray-950">
                          {money(
                            Number(item?.price || 0) *
                            Number(
                              item?.quantity || 1
                            )
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ISSUES */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-black text-gray-950">
                  AUDIT CHECKS
                </p>

                {health.issues.length ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {health.issues.map((issue) => (
                      <div
                        key={issue.key}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${issue.type === "error"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                      >
                        <CircleAlert size={13} />
                        {issue.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                    ✓ All essential delivery data is available.
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
