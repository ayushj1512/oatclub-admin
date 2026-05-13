"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
  AlertCircle,
  RefreshCcw,
  ArrowRight,
  IndianRupee,
  Weight,
  Boxes,
  Activity,
  ShieldAlert,
  CircleDot,
  ExternalLink,
  CalendarClock,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const safe = (v) => (v == null ? "" : String(v));

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const labelize = (value = "") =>
  safe(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatCurrency = (amount, currency = "INR") => {
  const value = safeNum(amount);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || "INR"} ${value.toLocaleString("en-IN")}`;
  }
};

const isSameDay = (value, date = new Date()) => {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
};

const getDateKey = (value) => {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleDateString("en-CA");
};

const getStatusTone = (status = "") => {
  const s = safe(status).toLowerCase();

  if (s.includes("deliver")) return "bg-emerald-50 text-emerald-700";
  if (s.includes("cancel") || s.includes("fail") || s.includes("error"))
    return "bg-rose-50 text-rose-700";
  if (s.includes("rto") || s.includes("return"))
    return "bg-orange-50 text-orange-700";
  if (s.includes("ship") || s.includes("transit") || s.includes("ofd"))
    return "bg-blue-50 text-blue-700";

  return "bg-neutral-100 text-neutral-700";
};

const STATUS_BUCKETS = [
  ["order_pushed", "Order Pushed"],
  ["created", "Created"],
  ["pickup_pending", "Pickup Pending"],
  ["picked", "Picked"],
  ["in_transit", "In Transit"],
  ["out_for_delivery", "Out For Delivery"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
  ["cancelled", "Cancelled"],
  ["rto", "RTO"],
  ["other", "Other"],
];

export default function BlueDartAnalyticsPage() {
  const {
    shipments,
    listLoading,
    bulkSyncing,
    fetchShipments,
    bulkSyncShipments,
    error,
  } = useBlueDartStore();

  useEffect(() => {
    fetchShipments({
      page: 1,
      limit: 100,
      carrierSlug: "bluedart",
      partner: "eshipz",
    });
  }, [fetchShipments]);

  const analytics = useMemo(() => {
    const rows = Array.isArray(shipments) ? shipments : [];

    const statusCount = {
      created: 0,
      order_pushed: 0,
      pickup_pending: 0,
      picked: 0,
      in_transit: 0,
      out_for_delivery: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      rto: 0,
      other: 0,
    };

    let totalValue = 0;
    let totalCodValue = 0;
    let totalWeight = 0;
    let totalPieces = 0;
    let syncedToday = 0;
    let webhookToday = 0;
    let withAwb = 0;
    let withoutAwb = 0;
    let syncPending = 0;
    let syncErrors = 0;
    let cancelled = 0;

    const serviceTypeMap = {};
    const paymentModeMap = {};
    const carrierMap = {};
    const dailyMap = {};

    rows.forEach((s) => {
      const status = safe(s?.status).trim().toLowerCase();

      if (status in statusCount) statusCount[status] += 1;
      else statusCount.other += 1;

      totalValue += safeNum(s?.declaredValue);
      totalCodValue += safeNum(s?.codAmount);
      totalWeight += safeNum(s?.weight);
      totalPieces += safeNum(s?.pieces);

      if (s?.awbNumber || s?.awb) withAwb += 1;
      else withoutAwb += 1;

      if (s?.syncPending) syncPending += 1;
      if (s?.syncError) syncErrors += 1;
      if (s?.isCancelled || status === "cancelled") cancelled += 1;

      if (isSameDay(s?.lastSyncedAt)) syncedToday += 1;
      if (isSameDay(s?.lastWebhookAt)) webhookToday += 1;

      const serviceType = safe(s?.serviceType || "Unknown") || "Unknown";
      serviceTypeMap[serviceType] = (serviceTypeMap[serviceType] || 0) + 1;

      const paymentMode = safe(s?.paymentMode || "Unknown") || "Unknown";
      paymentModeMap[paymentMode] = (paymentModeMap[paymentMode] || 0) + 1;

      const carrier = safe(s?.carrierName || s?.carrierSlug || "BlueDart");
      carrierMap[carrier] = (carrierMap[carrier] || 0) + 1;

      const key = getDateKey(s?.createdAt || s?.bookedAt);
      if (key) dailyMap[key] = (dailyMap[key] || 0) + 1;
    });

    const totalShipments = rows.length;
    const avgWeight = totalShipments ? totalWeight / totalShipments : 0;
    const avgPieces = totalShipments ? totalPieces / totalShipments : 0;

    const recentDays = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7);

    const topServices = Object.entries(serviceTypeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topPaymentModes = Object.entries(paymentModeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCarriers = Object.entries(carrierMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const activeTransit =
      statusCount.in_transit + statusCount.out_for_delivery + statusCount.picked;

    const needsAttention =
      withoutAwb + syncPending + syncErrors + statusCount.failed + statusCount.other;

    return {
      totalShipments,
      totalValue,
      totalCodValue,
      totalWeight,
      totalPieces,
      avgWeight,
      avgPieces,
      syncedToday,
      webhookToday,
      withAwb,
      withoutAwb,
      syncPending,
      syncErrors,
      cancelled,
      statusCount,
      recentDays,
      topServices,
      topPaymentModes,
      topCarriers,
      activeTransit,
      needsAttention,
      deliveredRate: totalShipments
        ? (statusCount.delivered / totalShipments) * 100
        : 0,
      transitRate: totalShipments ? (activeTransit / totalShipments) * 100 : 0,
      awbRate: totalShipments ? (withAwb / totalShipments) * 100 : 0,
      issueRate: totalShipments ? (needsAttention / totalShipments) * 100 : 0,
    };
  }, [shipments]);

  const handleRefresh = () => {
    fetchShipments({
      page: 1,
      limit: 100,
      carrierSlug: "bluedart",
      partner: "eshipz",
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="relative p-5 md:p-7">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-neutral-100/80" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  BlueDart / Eshipz
                </div>

                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                  Shipment Analytics Dashboard
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                  BlueDart Eshipz shipments ka status, AWB health, sync health,
                  COD value, service split aur recent shipment trend.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={listLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => bulkSyncShipments({ carrierSlug: "bluedart" })}
                  disabled={bulkSyncing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${bulkSyncing ? "animate-spin" : ""}`}
                  />
                  Bulk Sync
                </button>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="flex items-start gap-3 rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Package}
            label="Total Shipments"
            value={analytics.totalShipments}
            subtext="Current loaded records"
          />
          <StatCard
            icon={CheckCircle2}
            label="Delivered"
            value={analytics.statusCount.delivered}
            subtext={`${analytics.deliveredRate.toFixed(1)}% delivery rate`}
          />
          <StatCard
            icon={Truck}
            label="Active Transit"
            value={analytics.activeTransit}
            subtext={`${analytics.transitRate.toFixed(1)}% in movement`}
          />
          <StatCard
            icon={ShieldAlert}
            label="Needs Attention"
            value={analytics.needsAttention}
            subtext={`${analytics.issueRate.toFixed(1)}% possible issues`}
            danger={analytics.needsAttention > 0}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={IndianRupee}
            label="Declared Value"
            value={formatCurrency(analytics.totalValue)}
            subtext="Total shipment value"
          />
          <StatCard
            icon={IndianRupee}
            label="COD Value"
            value={formatCurrency(analytics.totalCodValue)}
            subtext="Collectable amount"
          />
          <StatCard
            icon={Weight}
            label="Avg Weight"
            value={`${analytics.avgWeight.toFixed(2)} kg`}
            subtext={`${analytics.totalWeight.toFixed(2)} kg total`}
          />
          <StatCard
            icon={Boxes}
            label="Avg Pieces"
            value={analytics.avgPieces.toFixed(2)}
            subtext={`${analytics.totalPieces} total pieces`}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            label="AWB Health"
            value={`${analytics.awbRate.toFixed(1)}%`}
            meta={`${analytics.withAwb} with AWB / ${analytics.withoutAwb} missing`}
            icon={CircleDot}
          />
          <HealthCard
            label="Synced Today"
            value={analytics.syncedToday}
            meta="Tracking sync count"
            icon={RefreshCcw}
          />
          <HealthCard
            label="Webhook Today"
            value={analytics.webhookToday}
            meta="Webhook update count"
            icon={Activity}
          />
          <HealthCard
            label="Sync Errors"
            value={analytics.syncErrors}
            meta={`${analytics.syncPending} pending sync`}
            icon={AlertCircle}
            danger={analytics.syncErrors > 0 || analytics.syncPending > 0}
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-5">
            <Card title="Status Breakdown" icon={Activity}>
              <p className="mb-5 text-sm leading-6 text-neutral-500">
                Shipment lifecycle ka current snapshot.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STATUS_BUCKETS.map(([key, label]) => (
                  <MiniStat
                    key={key}
                    label={label}
                    value={analytics.statusCount[key] || 0}
                    tone={getStatusTone(key)}
                  />
                ))}
              </div>
            </Card>

            <Card title="Shipments in Last 7 Active Days" icon={CalendarClock}>
              <p className="mb-5 text-sm leading-6 text-neutral-500">
                Shipment created/booked trend based on currently loaded records.
              </p>

              <div className="space-y-3">
                {analytics.recentDays.length ? (
                  analytics.recentDays.map(([date, count]) => {
                    const max = Math.max(
                      ...analytics.recentDays.map(([, c]) => c),
                      1
                    );
                    const width = `${Math.max((count / max) * 100, 8)}%`;

                    return (
                      <div key={date} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-neutral-600">
                            {date}
                          </span>
                          <span className="font-semibold text-neutral-950">
                            {count}
                          </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-950"
                            style={{ width }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState text="No recent shipment data available." />
                )}
              </div>
            </Card>

            <Card title="Quick Links" icon={ExternalLink}>
              <div className="grid gap-3 md:grid-cols-2">
                <QuickLink
                  href="/bluedart/shipments"
                  title="All Shipments"
                  subtitle="View, search and filter shipments"
                />
                <QuickLink
                  href="/bluedart/create"
                  title="Create Shipment"
                  subtitle="Create shipment from order"
                />
                <QuickLink
                  href="/bluedart/external-orders"
                  title="External Orders"
                  subtitle="Inspect Eshipz pushed orders"
                />
                <QuickLink
                  href="/bluedart/edd"
                  title="EDD Prediction"
                  subtitle="Check ETA by pincode"
                />
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Sync / AWB Health" icon={ShieldAlert}>
              <div className="space-y-3">
                <InfoRow label="With AWB" value={analytics.withAwb} />
                <InfoRow label="Without AWB" value={analytics.withoutAwb} />
                <InfoRow label="Sync Pending" value={analytics.syncPending} />
                <InfoRow label="Sync Errors" value={analytics.syncErrors} danger />
                <InfoRow label="Synced Today" value={analytics.syncedToday} />
                <InfoRow label="Webhook Today" value={analytics.webhookToday} />
                <InfoRow
                  label="Needs Attention"
                  value={analytics.needsAttention}
                  danger
                />
              </div>
            </Card>

            <Card title="Top Service Types" icon={Truck}>
              <div className="space-y-3">
                {analytics.topServices.length ? (
                  analytics.topServices.map(([name, count]) => (
                    <RankRow key={name} label={name} value={count} />
                  ))
                ) : (
                  <EmptyState text="No service type data yet." />
                )}
              </div>
            </Card>

            <Card title="Payment Modes" icon={IndianRupee}>
              <div className="space-y-3">
                {analytics.topPaymentModes.length ? (
                  analytics.topPaymentModes.map(([name, count]) => (
                    <RankRow key={name} label={name} value={count} />
                  ))
                ) : (
                  <EmptyState text="No payment mode data yet." />
                )}
              </div>
            </Card>

            <Card title="Carrier Split" icon={Truck}>
              <div className="space-y-3">
                {analytics.topCarriers.length ? (
                  analytics.topCarriers.map(([name, count]) => (
                    <RankRow key={name} label={name} value={count} />
                  ))
                ) : (
                  <EmptyState text="No carrier data yet." />
                )}
              </div>
            </Card>

            <section className="rounded-[2rem] bg-neutral-950 p-5 text-white shadow-sm md:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Note
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Ye dashboard current loaded 100 shipment records par based
                    hai. Later exact full analytics ke liye dedicated backend
                    analytics endpoint banana best rahega.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-2xl bg-neutral-100 p-2">
          <Icon className="h-4 w-4 text-neutral-700" />
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, subtext, danger = false }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {label}
          </p>
          <p
            className={`mt-2 break-all text-xl font-semibold tracking-tight ${
              danger ? "text-rose-700" : "text-neutral-950"
            }`}
          >
            {value}
          </p>
          {subtext ? (
            <p className="mt-1 text-xs leading-5 text-neutral-500">{subtext}</p>
          ) : null}
        </div>

        <div
          className={`rounded-2xl p-3 ${
            danger ? "bg-rose-50" : "bg-neutral-100"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${danger ? "text-rose-700" : "text-neutral-700"}`}
          />
        </div>
      </div>
    </div>
  );
}

function HealthCard({ icon: Icon, label, value, meta, danger = false }) {
  return (
    <div
      className={`rounded-[2rem] p-5 shadow-sm ${
        danger ? "bg-rose-50" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${
              danger ? "text-rose-500" : "text-neutral-400"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              danger ? "text-rose-700" : "text-neutral-950"
            }`}
          >
            {value}
          </p>
          <p
            className={`mt-1 text-xs leading-5 ${
              danger ? "text-rose-600" : "text-neutral-500"
            }`}
          >
            {meta}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${danger ? "bg-white" : "bg-neutral-100"}`}>
          <Icon
            className={`h-5 w-5 ${danger ? "text-rose-700" : "text-neutral-700"}`}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = "bg-neutral-100 text-neutral-700" }) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {label}
        </p>

        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
          {value}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value, danger = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl px-4 py-3 ${
        danger ? "bg-rose-50" : "bg-neutral-50"
      }`}
    >
      <span className={`text-sm ${danger ? "text-rose-600" : "text-neutral-500"}`}>
        {label}
      </span>

      <span
        className={`text-sm font-semibold ${
          danger ? "text-rose-700" : "text-neutral-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function RankRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="truncate text-sm font-medium text-neutral-700">
        {labelize(label)}
      </span>

      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-950 shadow-sm">
        {value}
      </span>
    </div>
  );
}

function QuickLink({ href, title, subtitle }) {
  return (
    <Link
      href={href}
      className="group rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100 transition hover:bg-neutral-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-950">{title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{subtitle}</p>
        </div>

        <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-800" />
      </div>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-5 text-sm font-medium text-neutral-500 ring-1 ring-neutral-100">
      {text}
    </div>
  );
}