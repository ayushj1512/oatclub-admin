"use client";

import Link from "next/link";
import { Eye, PackagePlus } from "lucide-react";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

const ACTIVE_BOOKED_STATUSES = new Set([
  "order_pushed",
  "created",
  "pickup_pending",
  "picked",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

export default function BlueDartOrderRow({ order, shipment, onBook }) {
  const shipping = order?.shippingAddressSnapshot || {};

  const shipmentStatus = lower(shipment?.status);
  const hasShipmentId = Boolean(shipment?._id);
  const hasAwb = Boolean(safe(shipment?.awbNumber).trim());

  const booked =
    hasShipmentId ||
    hasAwb ||
    ACTIVE_BOOKED_STATUSES.has(shipmentStatus);

  const badgeStatus = booked
    ? shipmentStatus || (hasAwb ? "created" : "order_pushed")
    : "not_booked";

  return (
    <tr className="border-b border-neutral-100 last:border-b-0">
      <td className="px-4 py-4">
        <div className="font-semibold text-neutral-900">
          {safe(order?.orderNumber)}
        </div>
        <div className="text-xs text-neutral-500">
          {safe(order?.orderDate)
            ? new Date(order.orderDate).toLocaleString("en-IN")
            : "-"}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="font-medium text-neutral-900">
          {safe(shipping?.fullName) || "-"}
        </div>
        <div className="text-xs text-neutral-500">
          {safe(shipping?.phone) || "-"}
        </div>
      </td>

      <td className="px-4 py-4 text-sm text-neutral-700">
        <div>{safe(shipping?.city) || "-"}</div>
        <div className="text-xs text-neutral-500">
          {safe(shipping?.state)} {safe(shipping?.pincode)}
        </div>
      </td>

      <td className="px-4 py-4 text-sm">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">
          {safe(order?.paymentMethod) || "-"}
        </span>
      </td>

      <td className="px-4 py-4 text-sm font-medium text-neutral-900">
        ₹ {money(order?.finalPayable)}
      </td>

      <td className="px-4 py-4">
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-700">
          {safe(order?.fulfillmentStatus).replaceAll("_", " ") || "-"}
        </span>
      </td>

      <td className="px-4 py-4">
        <BlueDartShipmentBadge status={badgeStatus} />
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {!booked ? (
            <button
              type="button"
              onClick={() => onBook?.(order)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <PackagePlus size={16} />
              Book
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"
              >
                Booked
              </button>

              <Link
                href={`/bluedart/${shipment?._id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                <Eye size={16} />
                View
              </Link>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
