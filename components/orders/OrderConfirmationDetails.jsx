"use client";

import { CheckCircle2, Clock3, ShieldCheck, UserCheck, Zap } from "lucide-react";

const formatIST = (date) => {
  if (!date) return "-";

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

const getConfirmedByMeta = (confirmedBy) => {
  const value = String(confirmedBy || "").toLowerCase();

  if (value === "admin") {
    return {
      label: "Admin",
      icon: ShieldCheck,
      cls: "bg-blue-50 text-blue-700 ring-blue-100",
    };
  }

  if (value === "customer") {
    return {
      label: "Customer",
      icon: UserCheck,
      cls: "bg-green-50 text-green-700 ring-green-100",
    };
  }

  if (value === "auto") {
    return {
      label: "Auto",
      icon: Zap,
      cls: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  return {
    label: "-",
    icon: Clock3,
    cls: "bg-gray-50 text-gray-600 ring-gray-100",
  };
};

export default function OrderConfirmationDetails({ order }) {
  const isConfirmed = order?.isConfirmed === true;
  const meta = getConfirmedByMeta(order?.confirmedBy);
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <CheckCircle2 size={18} />
            Confirmation Details
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Order confirmation source and timestamp.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isConfirmed
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {isConfirmed ? "Confirmed" : "Not Confirmed"}
        </span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Status</p>
          <p className="mt-1 font-semibold text-gray-900">
            {isConfirmed ? "Confirmed" : "Pending"}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Confirmed By</p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.cls}`}
          >
            <Icon size={13} />
            {isConfirmed ? meta.label : "-"}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Confirmed At</p>
          <p className="mt-1 font-semibold text-gray-900">
            {isConfirmed ? formatIST(order?.confirmedAt) : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}