"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

const safe = (value) => String(value ?? "").trim();

export const getDeliveredAt = (order = {}) =>
  order?.fulfillmentDates?.deliveredAt ||
  order?.deliveredAt ||
  order?.shipment?.deliveredAt ||
  order?.statusTimestamps?.deliveredAt ||
  order?.trackingDetails?.deliveredAt ||
  null;

export const getDeliveryHealth = (order = {}) => {
  const issues = [];

  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};

  const awb =
    shipment?.awb ||
    shiprocket?.awb ||
    order?.trackingId ||
    order?.trackingDetails?.trackingId ||
    "";

  const courier =
    shipment?.courierName ||
    shiprocket?.courierName ||
    order?.courierName ||
    "";

  const trackingUrl =
    shipment?.trackingUrl ||
    shiprocket?.trackingUrl ||
    order?.trackingUrl ||
    "";

  const address = order?.shippingAddressSnapshot || {};

  const phone =
    order?.customerId?.phone ||
    order?.customerPhone ||
    address?.phone ||
    "";

  const items = Array.isArray(order?.items) ? order.items : [];

  if (!getDeliveredAt(order)) {
    issues.push({
      key: "delivered_at",
      type: "error",
      label: "Delivered timestamp missing",
    });
  }

  if (!safe(awb)) {
    issues.push({
      key: "awb",
      type: "error",
      label: "AWB missing",
    });
  }

  if (!safe(courier)) {
    issues.push({
      key: "courier",
      type: "error",
      label: "Courier missing",
    });
  }

  if (!safe(trackingUrl)) {
    issues.push({
      key: "tracking",
      type: "warning",
      label: "Tracking URL missing",
    });
  }

  if (!safe(phone)) {
    issues.push({
      key: "phone",
      type: "warning",
      label: "Customer phone missing",
    });
  }

  if (!safe(address?.city)) {
    issues.push({
      key: "city",
      type: "warning",
      label: "City missing",
    });
  }

  if (!safe(address?.state)) {
    issues.push({
      key: "state",
      type: "warning",
      label: "State missing",
    });
  }

  if (!safe(address?.pincode)) {
    issues.push({
      key: "pincode",
      type: "warning",
      label: "Pincode missing",
    });
  }

  if (!items.length) {
    issues.push({
      key: "items",
      type: "error",
      label: "Order items missing",
    });
  }

  items.forEach((item, index) => {
    const title = item?.productSnapshot?.title;
    const sku =
      item?.variant?.sku ||
      item?.productSnapshot?.sku ||
      "";

    const size =
      item?.selectedSize ||
      item?.variant?.size ||
      "";

    if (!safe(title)) {
      issues.push({
        key: `item_title_${index}`,
        type: "warning",
        label: `Item ${index + 1} title missing`,
      });
    }

    if (!safe(sku)) {
      issues.push({
        key: `item_sku_${index}`,
        type: "warning",
        label: `Item ${index + 1} SKU missing`,
      });
    }

    if (!safe(size)) {
      issues.push({
        key: `item_size_${index}`,
        type: "warning",
        label: `Item ${index + 1} size missing`,
      });
    }
  });

  const paymentMethod = safe(order?.paymentMethod).toLowerCase();
  const paymentStatus = safe(order?.paymentStatus).toLowerCase();

  if (
    paymentMethod === "cod" &&
    ["", "pending", "unpaid"].includes(paymentStatus)
  ) {
    issues.push({
      key: "cod_payment",
      type: "warning",
      label: "COD collection still pending",
    });
  }

  const errorCount = issues.filter(
    (issue) => issue.type === "error"
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.type === "warning"
  ).length;

  const score = Math.max(
    0,
    100 - errorCount * 20 - warningCount * 8
  );

  return {
    issues,
    issueCount: issues.length,
    errorCount,
    warningCount,
    score,
    isClean: issues.length === 0,
  };
};

export default function DeliveryHealthBadge({
  order,
  compact = false,
}) {
  const health = getDeliveryHealth(order);

  if (health.isClean) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 size={13} />

        {compact ? "Clean" : "Delivery Clean"}
      </span>
    );
  }

  if (health.errorCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
        <CircleAlert size={13} />

        {health.issueCount}{" "}
        {health.issueCount === 1 ? "Issue" : "Issues"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
      <AlertTriangle size={13} />

      {health.issueCount}{" "}
      {health.issueCount === 1 ? "Warning" : "Warnings"}
    </span>
  );
}
