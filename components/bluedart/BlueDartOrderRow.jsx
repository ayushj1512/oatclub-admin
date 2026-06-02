"use client";

import Link from "next/link";
import { Eye, PackagePlus, Square, SquareCheckBig } from "lucide-react";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

const ACTIVE_BOOKED_STATUSES = new Set([
  "booked",
  "pickup_pending",
  "pickup_scheduled",
  "picked",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

const ERROR_CODES = new Set(["400", "401", "403", "404", "422", "500"]);

export default function BlueDartOrderRow({
  order,
  shipment,
  onBook,
  selected = false,
  onToggleSelect,
}) {
  const shipping = order?.shippingAddressSnapshot || {};

  const shipmentStatus = lower(shipment?.status);
  const rawStatus = lower(shipment?.rawStatus);
  const statusCode = safe(shipment?.statusCode).trim();
  const metaCode = safe(shipment?.rawCreateResponse?.meta?.code).trim();
  const metaStatus = lower(shipment?.rawCreateResponse?.meta?.status);

  const hasError =
    rawStatus === "error" ||
    metaStatus === "error" ||
    ERROR_CODES.has(statusCode) ||
    ERROR_CODES.has(metaCode);

  const hasAwb =
    Boolean(safe(shipment?.awbNumber).trim()) ||
    Boolean(safe(shipment?.awb).trim()) ||
    Boolean(safe(shipment?.rawCreateResponse?.data?.tracking_numbers?.[0]).trim()) ||
    Boolean(
      safe(shipment?.rawCreateResponse?.data?.files?.label?.label_meta?.awb).trim()
    );

  const hasExternalBooking =
    Boolean(safe(shipment?.shipmentIdExternal).trim()) ||
    Boolean(safe(shipment?.externalOrderId).trim()) ||
    Boolean(safe(shipment?.eshipzOrderId).trim());

  const booked =
    !hasError &&
    (hasAwb || hasExternalBooking || ACTIVE_BOOKED_STATUSES.has(shipmentStatus));

  const badgeStatus = hasError
    ? "not_booked"
    : booked
    ? shipmentStatus || "booked"
    : shipmentStatus || "not_booked";

  return (
    <tr className="border-b border-neutral-100 last:border-b-0">
      <td className="px-4 py-4 align-middle">
        {!booked ? (
          <button
            type="button"
            onClick={() => onToggleSelect?.(order)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-black ring-1 ring-neutral-200 transition hover:bg-neutral-100"
            aria-label={selected ? "Unselect order" : "Select order"}
          >
            {selected ? <SquareCheckBig size={18} /> : <Square size={18} />}
          </button>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        )}
      </td>

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
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
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
