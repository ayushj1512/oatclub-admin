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
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (amount, currency = "INR") => {
  const value = safeNum(amount);
  return `${currency} ${value.toLocaleString("en-IN")}`;
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

const labelize = (value = "") =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

export default function BlueDartAnalyticsPage() {
  const {
    shipments,
    listLoading,
    bulkSyncing,
    fetchShipments,
    bulkSyncShipments,
  } = useBlueDartStore();

  useEffect(() => {
    fetchShipments({ page: 1, limit: 100 });
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
      other: 0,
    };

    let totalValue = 0;
    let totalCodValue = 0;
    let totalWeight = 0;
    let totalPieces = 0;
    let syncedToday = 0;
    let withAwb = 0;
    let withoutAwb = 0;

    const serviceTypeMap = {};
    const paymentModeMap = {};
    const dailyMap = {};

    rows.forEach((s) => {
      const status = String(s?.status || "").trim().toLowerCase();

      if (status in statusCount) statusCount[status] += 1;
      else statusCount.other += 1;

      totalValue += safeNum(s?.declaredValue);
      totalCodValue += safeNum(s?.codAmount);
      totalWeight += safeNum(s?.weight);
      totalPieces += safeNum(s?.pieces);

      if (s?.awbNumber) withAwb += 1;
      else withoutAwb += 1;

      if (isSameDay(s?.lastSyncedAt)) syncedToday += 1;

      const serviceType = s?.serviceType || "Unknown";
      serviceTypeMap[serviceType] = (serviceTypeMap[serviceType] || 0) + 1;

      const paymentMode = s?.paymentMode || "Unknown";
      paymentModeMap[paymentMode] = (paymentModeMap[paymentMode] || 0) + 1;

      const createdAt = s?.createdAt ? new Date(s.createdAt) : null;
      if (createdAt && !Number.isNaN(createdAt.getTime())) {
        const key = createdAt.toLocaleDateString("en-CA");
        dailyMap[key] = (dailyMap[key] || 0) + 1;
      }
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

    return {
      totalShipments,
      totalValue,
      totalCodValue,
      totalWeight,
      totalPieces,
      avgWeight,
      avgPieces,
      syncedToday,
      withAwb,
      withoutAwb,
      statusCount,
      recentDays,
      topServices,
      topPaymentModes,
      deliveredRate: totalShipments
        ? (statusCount.delivered / totalShipments) * 100
        : 0,
      transitRate: totalShipments
        ? ((statusCount.in_transit + statusCount.out_for_delivery) /
            totalShipments) *
          100
        : 0,
    };
  }, [shipments]);

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                BlueDart Analytics
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                Shipment Analytics Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Shipments ka summary, status breakdown, values, sync health aur
                service insights ek jagah.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fetchShipments({ page: 1, limit: 100 })}
                disabled={listLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={bulkSyncShipments}
                disabled={bulkSyncing}
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${bulkSyncing ? "animate-spin" : ""}`}
                />
                Bulk Sync
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Package}
            label="Total Shipments"
            value={String(analytics.totalShipments)}
          />
          <StatCard
            icon={CheckCircle2}
            label="Delivered"
            value={String(analytics.statusCount.delivered)}
            subtext={`${analytics.deliveredRate.toFixed(1)}% of total`}
          />
          <StatCard
            icon={Truck}
            label="In Transit"
            value={String(
              analytics.statusCount.in_transit +
                analytics.statusCount.out_for_delivery
            )}
            subtext={`${analytics.transitRate.toFixed(1)}% of total`}
          />
          <StatCard
            icon={Clock3}
            label="Synced Today"
            value={String(analytics.syncedToday)}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={BarChart3}
            label="Declared Value"
            value={formatCurrency(analytics.totalValue)}
          />
          <StatCard
            icon={BarChart3}
            label="COD Value"
            value={formatCurrency(analytics.totalCodValue)}
          />
          <StatCard
            icon={BarChart3}
            label="Avg Weight"
            value={`${analytics.avgWeight.toFixed(2)} kg`}
          />
          <StatCard
            icon={BarChart3}
            label="Avg Pieces"
            value={analytics.avgPieces.toFixed(2)}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Status Breakdown
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Shipment lifecycle ka current snapshot.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MiniStat
                  label="Order Pushed"
                  value={analytics.statusCount.order_pushed}
                />
                <MiniStat
                  label="Created"
                  value={analytics.statusCount.created}
                />
                <MiniStat
                  label="Pickup Pending"
                  value={analytics.statusCount.pickup_pending}
                />
                <MiniStat label="Picked" value={analytics.statusCount.picked} />
                <MiniStat
                  label="In Transit"
                  value={analytics.statusCount.in_transit}
                />
                <MiniStat
                  label="Out for Delivery"
                  value={analytics.statusCount.out_for_delivery}
                />
                <MiniStat
                  label="Delivered"
                  value={analytics.statusCount.delivered}
                />
                <MiniStat label="Failed" value={analytics.statusCount.failed} />
                <MiniStat
                  label="Cancelled"
                  value={analytics.statusCount.cancelled}
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Shipments in Last 7 Active Days
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Created shipment volume trend.
              </p>

              <div className="mt-5 space-y-3">
                {analytics.recentDays.length ? (
                  analytics.recentDays.map(([date, count]) => {
                    const max = Math.max(
                      ...analytics.recentDays.map(([, c]) => c),
                      1
                    );
                    const width = `${(count / max) * 100}%`;

                    return (
                      <div key={date} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-neutral-600">{date}</span>
                          <span className="font-medium text-neutral-900">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-900"
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
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Quick Links
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Operations pages fast access.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <QuickLink
                  href="/bluedart/shipments"
                  title="All Shipments"
                  subtitle="View, search and filter shipments"
                />
                <QuickLink
                  href="/bluedart/create"
                  title="Create Shipment"
                  subtitle="Create a new shipment from order"
                />
                <QuickLink
                  href="/bluedart/external-orders"
                  title="External Orders"
                  subtitle="Inspect eShipz pushed orders"
                />
                <QuickLink
                  href="/bluedart/edd"
                  title="EDD Prediction"
                  subtitle="Check ETA by pincode"
                />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Sync / AWB Health
              </h2>

              <div className="mt-5 space-y-3">
                <InfoRow label="With AWB" value={analytics.withAwb} />
                <InfoRow label="Without AWB" value={analytics.withoutAwb} />
                <InfoRow label="Synced Today" value={analytics.syncedToday} />
                <InfoRow
                  label="Needs Attention"
                  value={
                    analytics.withoutAwb +
                    analytics.statusCount.failed +
                    analytics.statusCount.other
                  }
                  danger
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Top Service Types
              </h2>

              <div className="mt-5 space-y-3">
                {analytics.topServices.length ? (
                  analytics.topServices.map(([name, count]) => (
                    <RankRow key={name} label={name} value={count} />
                  ))
                ) : (
                  <EmptyState text="No service type data yet." />
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Payment Modes
              </h2>

              <div className="mt-5 space-y-3">
                {analytics.topPaymentModes.length ? (
                  analytics.topPaymentModes.map(([name, count]) => (
                    <RankRow key={name} label={name} value={count} />
                  ))
                ) : (
                  <EmptyState text="No payment mode data yet." />
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-neutral-100 p-3">
                  <AlertCircle className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Notes
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Ye analytics current loaded shipments par based hai. Agar
                    total records zyada hain, to later dedicated analytics API
                    bana sakte ho for better accuracy and charts.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-2 break-all text-xl font-semibold text-neutral-900">
            {value}
          </p>
          {subtext ? (
            <p className="mt-1 text-xs text-neutral-500">{subtext}</p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, danger = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span
        className={`text-sm font-semibold ${
          danger ? "text-red-600" : "text-neutral-900"
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
      <span className="truncate text-sm text-neutral-700">
        {labelize(label)}
      </span>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm">
        {value}
      </span>
    </div>
  );
}

function QuickLink({ href, title, subtitle }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-4 transition hover:bg-neutral-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
      {text}
    </div>
  );
}