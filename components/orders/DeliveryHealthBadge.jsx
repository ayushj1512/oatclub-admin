"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

const safe = (v) => String(v ?? "").trim();

export const getDeliveredAt = (order = {}) =>
  order?.fulfillmentDates?.deliveredAt ||
  order?.shipment?.deliveredAt ||
  order?.trackingDetails?.deliveredAt ||
  order?.deliveredAt ||
  order?.statusTimestamps?.deliveredAt ||
  null;

export const getDeliveryHealth = (order = {}) => {
  const issues = [];
  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};
  const address = order?.shippingAddressSnapshot || {};
  const items = Array.isArray(order?.items) ? order.items : [];

  const add = (key, type, label, missing) => {
    if (missing) issues.push({ key, type, label });
  };

  add("delivered_at", "error", "Delivered time missing", !getDeliveredAt(order));
  add("awb", "error", "AWB missing", !safe(shipment?.awb || shiprocket?.awb));
  add("courier", "error", "Courier missing", !safe(shipment?.courierName || shiprocket?.courierName));
  add("tracking", "warning", "Tracking URL missing", !safe(shipment?.trackingUrl || shiprocket?.trackingUrl));

  add(
    "phone",
    "warning",
    "Phone missing",
    !safe(order?.customerId?.phone || address?.phone)
  );

  add("city", "warning", "City missing", !safe(address?.city));
  add("state", "warning", "State missing", !safe(address?.state));
  add("pincode", "warning", "Pincode missing", !safe(address?.pincode));
  add("items", "error", "Items missing", !items.length);

  items.forEach((item, i) => {
    add(
      `title_${i}`,
      "warning",
      `Item ${i + 1} title missing`,
      !safe(item?.productSnapshot?.title)
    );

    add(
      `sku_${i}`,
      "warning",
      `Item ${i + 1} SKU missing`,
      !safe(item?.variant?.sku || item?.productSnapshot?.sku)
    );

    add(
      `size_${i}`,
      "warning",
      `Item ${i + 1} size missing`,
      !safe(item?.selectedSize || item?.variant?.size)
    );
  });

  const method = safe(order?.paymentMethod).toLowerCase();
  const status = safe(order?.paymentStatus).toLowerCase();

  add(
    "cod_payment",
    "warning",
    "COD pending",
    method === "cod" && ["", "pending", "unpaid"].includes(status)
  );

  const errorCount = issues.filter((x) => x.type === "error").length;
  const warningCount = issues.length - errorCount;

  return {
    issues,
    issueCount: issues.length,
    errorCount,
    warningCount,
    score: Math.max(0, 100 - errorCount * 20 - warningCount * 8),
    isClean: issues.length === 0,
  };
};

export default function DeliveryHealthBadge({ order, compact = false }) {
  const health = getDeliveryHealth(order);

  const config = health.isClean
    ? {
      Icon: CheckCircle2,
      text: compact ? "Clean" : "Delivery Clean",
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
    : health.errorCount
      ? {
        Icon: CircleAlert,
        text: `${health.issueCount} Issue${health.issueCount > 1 ? "s" : ""}`,
        cls: "border-red-200 bg-red-50 text-red-700",
      }
      : {
        Icon: AlertTriangle,
        text: `${health.issueCount} Warning${health.issueCount > 1 ? "s" : ""}`,
        cls: "border-amber-200 bg-amber-50 text-amber-700",
      };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${config.cls}`}
    >
      <config.Icon size={11} />
      {config.text}
    </span>
  );
}
