"use client";

import {
  Ban,
  CalendarClock,
  MessageSquareText,
  UserRound,
} from "lucide-react";

const fmt = (v) => {
  if (!v) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
};

const pretty = (v) =>
  String(v || "").replace(/_/g, " ").trim() || "-";

export default function OrderCancellationDetails({ order }) {
  const cancellation = order?.cancellation || {};

  const isCancelled =
    order?.fulfillmentStatus === "cancelled" ||
    cancellation?.isCancelled;

  if (
    !isCancelled &&
    !cancellation?.cancelledAt &&
    !cancellation?.reason
  ) {
    return null;
  }

  const cancelledAt =
    cancellation?.cancelledAt ||
    order?.fulfillmentDates?.cancelledAt;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
          <Ban size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-red-900">
                Cancellation Details
              </h2>

              <p className="mt-0.5 text-sm text-red-700">
                This order has been cancelled.
              </p>
            </div>

            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
              Cancelled
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-red-100 bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <UserRound size={14} />
                Cancelled By
              </div>

              <p className="mt-1.5 text-sm font-semibold capitalize text-red-950">
                {pretty(cancellation?.cancelledBy)}
              </p>
            </div>

            <div className="rounded-xl border border-red-100 bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <CalendarClock size={14} />
                Cancelled At
              </div>

              <p className="mt-1.5 text-sm font-semibold text-red-950">
                {fmt(cancelledAt)}
              </p>
            </div>

            <div className="rounded-xl border border-red-100 bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <MessageSquareText size={14} />
                Reason
              </div>

              <p className="mt-1.5 text-sm font-semibold text-red-950">
                {pretty(cancellation?.reason)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
