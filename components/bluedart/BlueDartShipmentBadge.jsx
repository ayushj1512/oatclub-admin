"use client";

const STATUS_STYLES = {
  not_booked: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",

  order_pushed: "bg-sky-100 text-sky-700 border-sky-200",

  created: "bg-blue-100 text-blue-700 border-blue-200",
  pickup_pending: "bg-amber-100 text-amber-700 border-amber-200",
  picked: "bg-cyan-100 text-cyan-700 border-cyan-200",
  in_transit: "bg-indigo-100 text-indigo-700 border-indigo-200",
  out_for_delivery: "bg-violet-100 text-violet-700 border-violet-200",
  delivered: "bg-green-100 text-green-700 border-green-200",

  exception: "bg-red-100 text-red-700 border-red-200",
  rto: "bg-orange-100 text-orange-700 border-orange-200",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABELS = {
  not_booked: "Not Booked",
  draft: "Draft",

  order_pushed: "Pushed",

  created: "Booked",
  pickup_pending: "Pickup Pending",
  picked: "Picked",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",

  exception: "Exception",
  rto: "RTO",
  cancelled: "Cancelled",
  failed: "Failed",
};

export default function BlueDartShipmentBadge({ status = "not_booked" }) {
  const key = String(status || "not_booked").toLowerCase();

  const cls = STATUS_STYLES[key] || STATUS_STYLES.not_booked;
  const label = STATUS_LABELS[key] || STATUS_LABELS.not_booked;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
