"use client";

import { Ban, CalendarClock, UserRound, MessageSquareText } from "lucide-react";

const fmt = (v) => {
  if (!v) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
};

const pretty = (v) => String(v || "").replace(/_/g, " ").trim() || "-";

export default function OrderCancellationDetails({ order }) {
  const cancellation = order?.cancellation || {};
  const isCancelled =
    order?.fulfillmentStatus === "cancelled" || cancellation?.isCancelled;

  if (!isCancelled && !cancellation?.cancelledAt && !cancellation?.reason) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
          <Ban size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-red-900">
            Cancellation Details
          </h2>
          <p className="mt-0.5 text-sm text-red-700/80">
            This order has cancellation information stored.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <UserRound size={14} /> Cancelled By
              </div>
              <p className="mt-1 text-sm font-semibold capitalize text-gray-900">
                {pretty(cancellation?.cancelledBy)}
              </p>
            </div>

            <div className="rounded-xl bg-white/80 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <CalendarClock size={14} /> Cancelled At
              </div>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {fmt(cancellation?.cancelledAt || order?.fulfillmentDates?.cancelledAt)}
              </p>
            </div>

            <div className="rounded-xl bg-white/80 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <MessageSquareText size={14} /> Reason
              </div>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {pretty(cancellation?.reason) || "No reason added"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}