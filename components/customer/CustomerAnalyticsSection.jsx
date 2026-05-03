"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  IndianRupee,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Truck,
  XCircle,
  CreditCard,
} from "lucide-react";
import { useCustomerStore } from "@/store/customerStore";

const n = (v = 0) => new Intl.NumberFormat("en-IN").format(Number(v || 0));

const money = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const pct = (v = 0) => `${Number(v || 0).toFixed(1)}%`;

const date = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const analyticsOf = (customer) => customer?.analytics || {};

export default function CustomerAnalyticsSection({ customer }) {
  const syncCustomerAnalytics = useCustomerStore((s) => s.syncCustomerAnalytics);
  const syncingAnalytics = useCustomerStore((s) => s.syncingAnalytics);

  const a = analyticsOf(customer);

  const handleSync = async () => {
    if (!customer?._id) return;
    await syncCustomerAnalytics?.(customer._id);
  };

  const cards = [
    {
      label: "Orders",
      value: n(a.totalOrders),
      sub: `${n(a.confirmedOrders)} confirmed`,
      icon: <PackageCheck size={17} />,
      tone: "sky",
    },
    {
      label: "Spend",
      value: money(a.totalSpend),
      sub: `AOV ${money(a.avgOrderValue)}`,
      icon: <IndianRupee size={17} />,
      tone: "emerald",
    },
    {
      label: "Delivered",
      value: n(a.deliveredOrders),
      sub: pct(a.deliveryRate),
      icon: <CheckCircle2 size={17} />,
      tone: "violet",
    },
    {
      label: "Risk",
      value: Number(a.riskScore || 0).toFixed(1),
      sub: `RTO ${pct(a.rtoRate)}`,
      icon: <AlertTriangle size={17} />,
      tone: "rose",
    },
  ];

  const fulfillmentRows = [
    ["Processing", a.processingOrders, <Clock size={14} />, "bg-amber-400"],
    ["Packed", a.packedOrders, <PackageCheck size={14} />, "bg-indigo-400"],
    ["Shipped", a.shippedOrders, <Truck size={14} />, "bg-sky-400"],
    ["Delivered", a.deliveredOrders, <CheckCircle2 size={14} />, "bg-emerald-500"],
    ["Cancelled", a.cancelledOrders, <XCircle size={14} />, "bg-rose-500"],
    ["Returned", a.returnedOrders, <RotateCcw size={14} />, "bg-orange-500"],
    ["RTO", a.rtoOrders, <AlertTriangle size={14} />, "bg-red-600"],
    ["Failed", a.failedOrders, <XCircle size={14} />, "bg-gray-500"],
  ];

  const paymentRows = [
    ["COD", a.codOrders, "bg-amber-50 text-amber-700"],
    ["Prepaid", a.prepaidOrders, "bg-emerald-50 text-emerald-700"],
    ["Paid", a.paidOrders, "bg-sky-50 text-sky-700"],
    ["Pending", a.paymentPendingOrders, "bg-gray-50 text-gray-700"],
    ["Refund Pending", a.refundPendingOrders, "bg-orange-50 text-orange-700"],
    ["Refunded", a.refundedOrders, "bg-violet-50 text-violet-700"],
  ];

  const maxFulfillment = Math.max(
    ...fulfillmentRows.map(([, value]) => Number(value || 0)),
    1
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.045)]">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-sky-50 via-white to-rose-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-sky-100">
            <Activity className="h-4.5 w-4.5" />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-950">
              Customer Analytics
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              Spend, fulfillment, payment and risk snapshot.
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge icon={<Crown size={12} />} label={a.customerType || "new"} tone="amber" />
              <Badge label={`Synced: ${date(a.lastAnalyticsSyncAt)}`} tone="gray" />
            </div>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncingAnalytics || !customer?._id}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncingAnalytics ? "animate-spin" : ""}`}
          />
          {syncingAnalytics ? "Syncing..." : "Sync"}
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-2xl bg-gray-50/70 p-3 ring-1 ring-gray-100 xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-900">
                Fulfillment Graph
              </div>
              <span className="text-[11px] text-gray-400">
                Total {n(a.totalOrders)}
              </span>
            </div>

            <div className="space-y-2.5">
              {fulfillmentRows.map(([label, value, icon, color]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      {icon}
                      <span>{label}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{n(value)}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${Math.max(
                          Number(value || 0) > 0 ? 6 : 0,
                          (Number(value || 0) / maxFulfillment) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50/70 p-3 ring-1 ring-gray-100">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-900">
              <CreditCard size={15} />
              Payment
            </div>

            <div className="grid grid-cols-2 gap-2">
              {paymentRows.map(([label, value, tone]) => (
                <div
                  key={label}
                  className={`rounded-xl px-3 py-2 ring-1 ring-white ${tone}`}
                >
                  <div className="text-[11px] opacity-80">{label}</div>
                  <div className="mt-0.5 text-sm font-bold">{n(value)}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-100">
              <div className="text-[11px] text-gray-500">Success Rate</div>
              <div className="mt-1 text-xl font-semibold text-gray-950">
                {pct(a.paymentSuccessRate)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MiniInfo label="First" value={date(a.firstOrderAt)} tone="sky" />
          <MiniInfo label="Last" value={date(a.lastOrderAt)} tone="emerald" />
          <MiniInfo label="Delivered" value={date(a.lastDeliveredAt)} tone="violet" />
          <MiniInfo label="RTO" value={date(a.lastRtoAt)} tone="rose" />
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, label, value, sub, tone = "gray" }) {
  const tones = {
    sky: "from-sky-50 to-white text-sky-700 ring-sky-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    violet: "from-violet-50 to-white text-violet-700 ring-violet-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
    gray: "from-gray-50 to-white text-gray-800 ring-gray-100",
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br p-3 ring-1 ${tones[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          {icon}
        </div>
      </div>

      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tracking-tight text-gray-950">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">{sub}</div>
    </div>
  );
}

function MiniInfo({ label, value, tone = "gray" }) {
  const dots = {
    sky: "bg-sky-400",
    emerald: "bg-emerald-400",
    violet: "bg-violet-400",
    rose: "bg-rose-400",
    gray: "bg-gray-400",
  };

  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-gray-100">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
        {label}
      </div>
      <div className="mt-1 text-xs font-medium text-gray-900">{value}</div>
    </div>
  );
}

function Badge({ icon, label, tone = "gray" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    gray: "bg-white/80 text-gray-600 ring-gray-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] capitalize ring-1 ${tones[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}