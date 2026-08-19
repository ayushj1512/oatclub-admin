"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ExternalLink,
} from "lucide-react";

import DeliveryHealthBadge, {
  getDeliveredAt,
  getDeliveryHealth,
} from "@/components/orders/DeliveryHealthBadge";

const safe = (v) => String(v ?? "").trim();

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const formatDate = (v) => {
  if (!v) return "-";

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-IN", {
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
  const s = order?.shipment || {};
  const sr = s?.shiprocket || {};

  return {
    awb:
      s?.awb ||
      sr?.awb ||
      order?.trackingDetails?.trackingId ||
      order?.trackingDetails?.awb ||
      "",
    courier:
      s?.courierName ||
      sr?.courierName ||
      order?.trackingDetails?.courierName ||
      "",
    trackingUrl:
      s?.trackingUrl ||
      sr?.trackingUrl ||
      order?.trackingDetails?.trackingUrl ||
      "",
    provider: s?.provider || "",
  };
};

export default function DeliveredOrderRow({ order }) {
  const [open, setOpen] = useState(false);

  const orderId = order?._id || order?.id;
  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items],
  );

  const health = useMemo(() => getDeliveryHealth(order), [order]);
  const shipment = useMemo(() => getShipment(order), [order]);

  const address = order?.shippingAddressSnapshot || {};

  const customerName =
    order?.customerId?.name ||
    address?.fullName ||
    "Unknown Customer";

  const phone =
    order?.customerId?.phone ||
    address?.phone ||
    "";

  const email =
    order?.customerId?.email ||
    address?.email ||
    "";

  const deliveredAt = getDeliveredAt(order);

  const packedAt =
    order?.fulfillmentDates?.packedAt ||
    order?.packedAt ||
    null;

  const returnExpiresAt = deliveredAt
    ? new Date(
      new Date(deliveredAt).getTime() +
      7 * 24 * 60 * 60 * 1000,
    )
    : null;

  const isReturnEligible =
    returnExpiresAt &&
    Date.now() < returnExpiresAt.getTime();

  const paymentMethod = safe(
    order?.paymentMethod || "cod",
  ).toLowerCase();

  const paymentStatus = safe(
    order?.paymentStatus || "pending",
  ).toLowerCase();

  const firstItem = items[0] || {};
  const firstTitle =
    firstItem?.productSnapshot?.title || "No product";

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
      "noopener,noreferrer",
    );
  };

  return (
    <>
      <tr
        className={`border-b border-gray-100 bg-white transition hover:bg-gray-50/70 ${health.errorCount
            ? "border-l-2 border-l-red-400"
            : health.warningCount
              ? "border-l-2 border-l-amber-400"
              : "border-l-2 border-l-emerald-400"
          }`}
      >
        {/* ORDER */}
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-black"
            >
              {open ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            <div className="min-w-0">
              <button
                type="button"
                onClick={openOrder}
                className="font-mono text-xs font-bold text-gray-950 hover:underline"
              >
                #{order?.orderNumber || "-"}
              </button>

              <p className="max-w-[220px] truncate text-[11px] text-gray-500">
                {firstTitle}
                {firstSize ? ` · ${firstSize}` : ""}
                {items.length > 1
                  ? ` · +${items.length - 1}`
                  : ""}
              </p>
            </div>
          </div>
        </td>

        {/* CUSTOMER */}
        <td className="px-4 py-2.5">
          <p className="max-w-[180px] truncate text-xs font-semibold text-gray-900">
            {customerName}
          </p>

          <p className="mt-0.5 max-w-[210px] truncate text-[10px] text-gray-500">
            {phone || "-"} ·{" "}
            {[address?.city, address?.state]
              .filter(Boolean)
              .join(", ") || "-"}
          </p>
        </td>

        {/* DELIVERY */}
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              Delivered
            </span>

            {deliveredAt ? (
              <span
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${isReturnEligible
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                  }`}
              >
                {isReturnEligible
                  ? "Return Eligible"
                  : "Return Closed"}
              </span>
            ) : null}
          </div>

          <p
            className={`mt-1 text-[10px] ${deliveredAt
                ? "text-gray-500"
                : "font-semibold text-red-600"
              }`}
          >
            {deliveredAt
              ? formatDate(deliveredAt)
              : "Delivered date missing"}
          </p>
        </td>

        {/* COURIER */}
        <td className="px-4 py-2.5">
          <p className="max-w-[160px] truncate text-xs font-semibold text-gray-900">
            {shipment.courier || "Courier missing"}
          </p>

          <div className="mt-0.5 flex items-center gap-2">
            <span className="max-w-[140px] truncate font-mono text-[10px] text-gray-500">
              {shipment.awb || "AWB missing"}
            </span>

            {shipment.trackingUrl ? (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-blue-600 hover:underline"
              >
                Track
              </a>
            ) : null}
          </div>
        </td>

        {/* PAYMENT */}
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-950">
              {money(order?.finalPayable)}
            </span>

            <span className="text-[10px] font-semibold uppercase text-gray-500">
              {paymentMethod}
            </span>
          </div>

          <span
            className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold capitalize ${paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : paymentMethod === "cod" &&
                  paymentStatus === "pending"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-600"
              }`}
          >
            {paymentStatus.replaceAll("_", " ")}
          </span>
        </td>

        {/* HEALTH */}
        <td className="px-4 py-2.5">
          {/* HEALTH */}
          <td className="px-4 py-2.5">
            <DeliveryHealthBadge order={order} compact />

            {health.issues.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {health.issues.slice(0, 2).map((issue) => (
                  <p
                    key={issue.key}
                    className={`max-w-[170px] truncate text-[9px] font-medium ${issue.type === "error"
                        ? "text-red-600"
                        : "text-amber-600"
                      }`}
                    title={issue.label}
                  >
                    • {issue.label}
                  </p>
                ))}

                {health.issues.length > 2 && (
                  <p className="text-[9px] text-gray-400">
                    +{health.issues.length - 2} more
                  </p>
                )}
              </div>
            )}
          </td>        </td>

        {/* ACTION */}
        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={openOrder}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            View
            <ExternalLink size={10} />
          </button>
        </td>
      </tr>

      {/* COMPACT AUDIT */}
      {open ? (
        <tr className="border-b border-gray-100 bg-gray-50/60">
          <td colSpan={7} className="px-4 py-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-950">
                    #{order?.orderNumber}
                  </span>

                  <span className="ml-2 text-[10px] text-gray-400">
                    Delivery Audit
                  </span>
                </div>

                <DeliveryHealthBadge order={order} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-[11px] md:grid-cols-4">
                <Info
                  label="Created"
                  value={formatDate(
                    order?.orderDate || order?.createdAt,
                  )}
                />

                <Info
                  label="Packed"
                  value={formatDate(packedAt)}
                />

                <Info
                  label="Delivered"
                  value={formatDate(deliveredAt)}
                />

                <Info
                  label="Return"
                  value={
                    deliveredAt
                      ? isReturnEligible
                        ? `Till ${formatDate(returnExpiresAt)}`
                        : "Period closed"
                      : "-"
                  }
                />

                <Info
                  label="Courier"
                  value={shipment.courier || "-"}
                />

                <Info
                  label="AWB"
                  value={shipment.awb || "-"}
                  mono
                />

                <Info
                  label="Customer"
                  value={customerName}
                />

                <Info
                  label="Contact"
                  value={phone || email || "-"}
                />
              </div>

              {items.length ? (
                <div className="mt-3 border-t border-gray-100 pt-2">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Items
                  </p>

                  <div className="space-y-1">
                    {items.map((item, index) => {
                      const snap =
                        item?.productSnapshot || {};

                      return (
                        <div
                          key={
                            item?.lineId ||
                            `${orderId}-${index}`
                          }
                          className="flex items-center justify-between gap-3 text-[11px]"
                        >
                          <p className="min-w-0 truncate text-gray-700">
                            <b>{snap?.title || "-"}</b>
                            {" · "}
                            {snap?.productCode || "-"}
                            {" · "}
                            {item?.selectedSize || "-"}
                            {" · "}
                            Qty {item?.quantity || 1}
                          </p>

                          <span className="shrink-0 font-semibold text-gray-900">
                            {money(
                              Number(item?.price || 0) *
                              Number(item?.quantity || 1),
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {health.issues.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
                  {health.issues.map((issue) => (
                    <span
                      key={issue.key}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium ${issue.type === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                        }`}
                    >
                      <CircleAlert size={10} />
                      {issue.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p
        className={`mt-0.5 truncate font-medium text-gray-800 ${mono ? "font-mono" : ""
          }`}
        title={String(value || "-")}
      >
        {value || "-"}
      </p>
    </div>
  );
}
