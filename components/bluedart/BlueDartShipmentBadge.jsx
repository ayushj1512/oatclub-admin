"use client";

import {
  CheckCircle2,
  Clock3,
  Package,
  Truck,
  AlertTriangle,
  Ban,
  RefreshCcw,
  RadioTower,
} from "lucide-react";

const STATUS_CONFIG = {
  not_booked: {
    label: "Not Booked",
    className:
      "bg-neutral-100 text-neutral-700 ring-neutral-200",
    icon: Package,
  },

  draft: {
    label: "Draft",
    className:
      "bg-slate-100 text-slate-700 ring-slate-200",
    icon: Clock3,
  },

  order_pushed: {
    label: "Pushed",
    className:
      "bg-sky-100 text-sky-700 ring-sky-200",
    icon: RadioTower,
  },

  created: {
    label: "Created",
    className:
      "bg-blue-100 text-blue-700 ring-blue-200",
    icon: Package,
  },

  booked: {
    label: "Booked",
    className:
      "bg-blue-100 text-blue-700 ring-blue-200",
    icon: Package,
  },

  pickup_pending: {
    label: "Pickup Pending",
    className:
      "bg-amber-100 text-amber-700 ring-amber-200",
    icon: Clock3,
  },

  pickup_scheduled: {
    label: "Pickup Scheduled",
    className:
      "bg-yellow-100 text-yellow-700 ring-yellow-200",
    icon: Clock3,
  },

  picked: {
    label: "Picked",
    className:
      "bg-cyan-100 text-cyan-700 ring-cyan-200",
    icon: Truck,
  },

  shipped: {
    label: "Shipped",
    className:
      "bg-indigo-100 text-indigo-700 ring-indigo-200",
    icon: Truck,
  },

  in_transit: {
    label: "In Transit",
    className:
      "bg-violet-100 text-violet-700 ring-violet-200",
    icon: Truck,
  },

  out_for_delivery: {
    label: "Out for Delivery",
    className:
      "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
    icon: Truck,
  },

  delivered: {
    label: "Delivered",
    className:
      "bg-emerald-100 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
  },

  exception: {
    label: "Exception",
    className:
      "bg-red-100 text-red-700 ring-red-200",
    icon: AlertTriangle,
  },

  rto: {
    label: "RTO",
    className:
      "bg-orange-100 text-orange-700 ring-orange-200",
    icon: RefreshCcw,
  },

  cancelled: {
    label: "Cancelled",
    className:
      "bg-zinc-100 text-zinc-700 ring-zinc-200",
    icon: Ban,
  },

  failed: {
    label: "Failed",
    className:
      "bg-rose-100 text-rose-700 ring-rose-200",
    icon: AlertTriangle,
  },
};

export default function BlueDartShipmentBadge({
  status = "not_booked",
  className = "",
  showIcon = true,
}) {
  const key = String(status || "not_booked")
    .toLowerCase()
    .trim();

  const config =
    STATUS_CONFIG[key] || STATUS_CONFIG.not_booked;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.className} ${className}`}
    >
      {showIcon ? <Icon size={12} /> : null}
      {config.label}
    </span>
  );
}