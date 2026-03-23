"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react";
import { useOrderReportsStore } from "@/store/orderReportsStore";

const RANGE_OPTIONS = [
  { label: "Overall", value: "" },
  { label: "This Week", value: "weekly" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 15 Days", value: "last15" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "monthly" },
  { label: "Custom", value: "custom" },
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) => new Intl.NumberFormat("en-IN").format(num(v));

const getRangeLabel = (range) => {
  const found = RANGE_OPTIONS.find((x) => x.value === range);
  return found?.label || "Overall";
};

function FilterPill({ active, children }) {
  return (
    <div
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone = "slate", subtitle = "" }) {
  const toneMap = {
    amber:
      "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-700",
    blue: "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-700",
    green:
      "border-green-200 bg-gradient-to-br from-green-50 to-white text-green-700",
    red: "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-700",
    orange:
      "border-orange-200 bg-gradient-to-br from-orange-50 to-white text-orange-700",
    violet:
      "border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-700",
    slate:
      "border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-700",
  };

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        toneMap[tone] || toneMap.slate,
      ].join(" ")}
    >
      <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-white/40 blur-2xl" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-1.5 text-xl font-bold text-slate-900">{fmt(value)}</p>
          {subtitle ? (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-2 shadow-sm backdrop-blur">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="animate-pulse">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-2 h-7 w-20 rounded bg-slate-300" />
        <div className="mt-2 h-3 w-28 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function OperationsOrderStatusPage() {
  const {
    operationsSummary,
    operationsLoading,
    operationsError,
    operationsInitialized,
    hydrateAndFetchOperations,
    refreshOperations,
  } = useOrderReportsStore();

  const [range, setRange] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (booted) return;
    setBooted(true);
    hydrateAndFetchOperations({});
  }, [booted, hydrateAndFetchOperations]);

  useEffect(() => {
    if (!booted) return;
    if (range === "custom") return;

    const timer = setTimeout(() => {
      hydrateAndFetchOperations({ range, from: "", to: "" });
    }, 180);

    return () => clearTimeout(timer);
  }, [range, booted, hydrateAndFetchOperations]);

  useEffect(() => {
    if (!booted) return;
    if (range !== "custom") return;
    if (!from || !to) return;

    const timer = setTimeout(() => {
      hydrateAndFetchOperations({ range: "custom", from, to });
    }, 220);

    return () => clearTimeout(timer);
  }, [range, from, to, booted, hydrateAndFetchOperations]);

  const cards = useMemo(
    () => [
      {
        title: "Pending Processing",
        value: operationsSummary?.pendingProcessing,
        icon: Settings2,
        tone: "amber",
        subtitle: "Orders in processing",
      },
      {
        title: "Dispatched",
        value: operationsSummary?.dispatched,
        icon: Truck,
        tone: "blue",
        subtitle: "Shipped / OFD",
      },
      {
        title: "Delivered",
        value: operationsSummary?.delivered,
        icon: CheckCircle2,
        tone: "green",
        subtitle: "Successfully delivered",
      },
      {
        title: "Cancelled",
        value: operationsSummary?.cancelled,
        icon: XCircle,
        tone: "red",
        subtitle: "Cancelled orders",
      },
      {
        title: "RTO",
        value: operationsSummary?.returnedRto,
        icon: Undo2,
        tone: "orange",
        subtitle: "Returned to origin",
      },
      {
        title: "Refunds",
        value: operationsSummary?.refundsProcessed,
        icon: ShieldCheck,
        tone: "violet",
        subtitle: "Refunded payments",
      },
    ],
    [operationsSummary]
  );

  const totalOrders = num(operationsSummary?.totalOrders);
  const pendingAndDispatched =
    num(operationsSummary?.pendingProcessing) + num(operationsSummary?.dispatched);
  const cancelledAndRto =
    num(operationsSummary?.cancelled) + num(operationsSummary?.returnedRto);

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-4">
      <div className="w-full">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                <Boxes className="h-3.5 w-3.5" />
                Operations Dashboard
              </div>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Operations Order Status
              </h1>

              <p className="mt-1 text-xs text-slate-600">
                Track pending, dispatched, delivered, cancelled, RTO and refunds.
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <FilterPill active={!range}>Overall</FilterPill>
                <FilterPill active={!!range}>{getRangeLabel(range)}</FilterPill>
                {range === "custom" && from ? <FilterPill active>{from}</FilterPill> : null}
                {range === "custom" && to ? <FilterPill active>{to}</FilterPill> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[360px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Total Orders
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmt(totalOrders)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">Selected range</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Active Filter
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {getRangeLabel(range)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">Auto applied</p>
              </div>

              <button
                onClick={() => refreshOperations()}
                disabled={operationsLoading}
                className="flex min-h-[90px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-slate-900 p-3 text-left text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="rounded-xl bg-white/10 p-2">
                  {operationsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">Refresh Report</p>
                  <p className="mt-0.5 text-[11px] text-slate-300">Fetch latest data</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Filter by Date</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Filters apply automatically.
              </p>
            </div>

            {operationsLoading ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Range
              </label>
              <div className="relative">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {RANGE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                From
              </label>
              <input
                type="date"
                value={from}
                disabled={range !== "custom"}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                To
              </label>
              <input
                type="date"
                value={to}
                disabled={range !== "custom"}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>
        </div>

        {operationsError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load operations report</p>
              <p className="mt-0.5 text-xs">{operationsError}</p>
            </div>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {operationsLoading && !operationsInitialized
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : cards.map((item) => <StatCard key={item.title} {...item} />)}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Report Summary</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Current snapshot for selected filter.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {getRangeLabel(range)}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
              {cards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-[11px] font-semibold text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xl font-bold text-slate-900">
                    {fmt(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm">
            <p className="text-sm font-semibold">Quick Insight</p>
            <p className="mt-2 text-2xl font-bold">{fmt(totalOrders)}</p>
            <p className="mt-0.5 text-xs text-slate-300">
              total orders in selected range
            </p>

            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] text-slate-300">Delivered</p>
                <p className="mt-1 text-base font-semibold">
                  {fmt(operationsSummary?.delivered)}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] text-slate-300">Pending + Dispatched</p>
                <p className="mt-1 text-base font-semibold">
                  {fmt(pendingAndDispatched)}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] text-slate-300">Cancelled + RTO</p>
                <p className="mt-1 text-base font-semibold">
                  {fmt(cancelledAndRto)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}