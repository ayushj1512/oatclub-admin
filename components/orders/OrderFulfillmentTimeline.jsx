"use client";

import {
  PackageCheck,
  Box,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Clock,
  RefreshCcw,
  BadgeCheck,
  Undo2,
} from "lucide-react";

const STEPS = [
  { key: "processingAt", status: "processing", label: "Processing", icon: Clock },
  { key: "packedAt", status: "packed", label: "Packed", icon: Box },
  { key: "pickedAt", status: "picked", label: "Picked", icon: PackageCheck },
  { key: "shippedAt", status: "shipped", label: "Shipped", icon: Truck },
  { key: "outForDeliveryAt", status: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "deliveredAt", status: "delivered", label: "Delivered", icon: CheckCircle2 },

  { key: "returnRequestedAt", status: "return_requested", label: "Return Requested", icon: Undo2 },
  { key: "exchangeRequestedAt", status: "exchange_requested", label: "Exchange Requested", icon: RefreshCcw },
  { key: "pickupInitiatedAt", status: "pickup_initiated", label: "Pickup Initiated", icon: Truck },

  { key: "returnedAt", status: "returned", label: "Returned", icon: RotateCcw },
  { key: "refundedAt", status: "refunded", label: "Refunded", icon: BadgeCheck },
  { key: "exchangedAt", status: "exchanged", label: "Exchanged", icon: PackageCheck },

  { key: "rtoAt", status: "rto", label: "RTO", icon: RotateCcw },
  { key: "cancelledAt", status: "cancelled", label: "Cancelled", icon: XCircle },
  { key: "failedAt", status: "failed", label: "Failed", icon: AlertCircle },
];

const styleByStatus = (status, active) => {
  if (!active) return "bg-neutral-100 text-neutral-400 ring-1 ring-neutral-200";

  switch (status) {
    case "delivered":
      return "bg-green-50 text-green-700 ring-1 ring-green-200";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "failed":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "refunded":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "returned":
    case "return_requested":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    case "exchange_requested":
    case "exchanged":
      return "bg-pink-50 text-pink-700 ring-1 ring-pink-200";
    case "pickup_initiated":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "packed":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
    case "picked":
      return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200";
    case "shipped":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "out_for_delivery":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
    case "processing":
      return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200";
    case "rto":
      return "bg-gray-200 text-gray-800 ring-1 ring-gray-300";
    default:
      return "bg-neutral-950 text-white";
  }
};

const lineColor = (status, active) => {
  if (!active) return "bg-neutral-200";
  if (status === "delivered") return "bg-green-300";
  if (status === "cancelled") return "bg-red-300";
  if (status === "failed") return "bg-rose-300";
  return "bg-neutral-900";
};

const formatIST = (date) => {
  if (!date) return "Pending";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
};

export default function OrderFulfillmentTimeline({ order }) {
  const dates = order?.fulfillmentDates || {};
  const currentStatus = String(order?.fulfillmentStatus || "").toLowerCase();

  const steps = STEPS.filter((step) => {
    const forward = [
      "processing",
      "packed",
      "picked",
      "shipped",
      "out_for_delivery",
      "delivered",
    ].includes(step.status);

    return forward || dates?.[step.key] || currentStatus === step.status;
  });

  const currentIndex = steps.findIndex((step) => step.status === currentStatus);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950">
            Fulfillment Timeline
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Compact IST timeline
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${styleByStatus(
            currentStatus,
            true
          )}`}
        >
          {currentStatus?.replaceAll("_", " ") || "N/A"}
        </span>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto pb-1 md:flex">
        <div className="flex min-w-max flex-1">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const date = dates?.[step.key];

            const isDone = Boolean(date);
            const isCurrent = currentStatus === step.status;
            const isActive = isDone || isCurrent;
            const isPast = currentIndex >= 0 && index <= currentIndex;

            return (
              <div key={step.key} className="relative flex min-w-[130px] flex-1 flex-col">
                {index !== steps.length - 1 && (
                  <div
                    className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[18px] h-px ${lineColor(
                      step.status,
                      isPast
                    )}`}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${styleByStatus(
                      step.status,
                      isActive
                    )}`}
                  >
                    <Icon size={16} />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-neutral-900">
                    {step.label}
                  </p>

                  <p className="mt-1 max-w-[115px] text-[11px] leading-4 text-neutral-500">
                    {formatIST(date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const date = dates?.[step.key];

          const isDone = Boolean(date);
          const isCurrent = currentStatus === step.status;
          const isActive = isDone || isCurrent;

          return (
            <div key={step.key} className="relative flex gap-3">
              {index !== steps.length - 1 && (
                <div
                  className={`absolute left-[17px] top-9 h-full w-px ${lineColor(
                    step.status,
                    isActive
                  )}`}
                />
              )}

              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styleByStatus(
                  step.status,
                  isActive
                )}`}
              >
                <Icon size={16} />
              </div>

              <div className="min-w-0 pb-2">
                <p className="text-xs font-semibold text-neutral-950">
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {formatIST(date)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}