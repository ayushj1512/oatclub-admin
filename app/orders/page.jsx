"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Truck,
  Undo2,
  Wallet,
  Zap,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";

const num = (n) => Number(n || 0);
const money = (n) => `₹${Math.round(num(n)).toLocaleString("en-IN")}`;

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-lg border border-black/[0.06] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Stat({ title, value, sub, icon: Icon, tone = "bg-gray-950", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-black/[0.06] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/[0.12] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">{value}</p>
          {sub ? <p className="mt-2 text-xs leading-5 text-gray-500">{sub}</p> : null}
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-lg text-white ${tone}`}>
          <Icon size={21} />
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, sub, dark }) {
  return (
    <div className={`rounded-lg border border-black/[0.06] p-5 ${dark ? "bg-gray-950 text-white" : "bg-gray-50"}`}>
      <p className={`text-sm ${dark ? "text-white/60" : "text-gray-500"}`}>{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${dark ? "text-white" : "text-gray-950"}`}>
        {value}
      </p>
      {sub ? <p className={`mt-2 text-xs ${dark ? "text-white/50" : "text-gray-500"}`}>{sub}</p> : null}
    </div>
  );
}

function PipelineItem({ label, value, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-lg border border-black/[0.04] bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100"
    >
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-gray-950">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-800 shadow-sm">
        <Icon size={18} />
      </div>
    </button>
  );
}

function ActionRow({ icon: Icon, title, sub, value, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left transition hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            danger ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-800"
          }`}
        >
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-950">{title}</p>
          <p className="text-xs text-gray-500">{sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
          {value}
        </span>
        <ArrowRight size={16} className="text-gray-400" />
      </div>
    </button>
  );
}

function DonutChart({ data = [], centerTitle = "Total", centerValue = 0 }) {
  const total = data.reduce((s, x) => s + num(x.value), 0) || 1;
  let offset = 25;

  return (
    <div className="flex flex-col items-center gap-5 lg:flex-row">
      <div className="relative h-52 w-52">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="5" />

          {data.map((item) => {
            const pct = (num(item.value) / total) * 100;
            const dash = `${pct} ${100 - pct}`;
            const dashOffset = offset;
            offset -= pct;

            return (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke={item.color}
                strokeWidth="5"
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-gray-500">{centerTitle}</p>
          <p className="text-2xl font-semibold text-gray-950">{centerValue}</p>
        </div>
      </div>

      <div className="w-full space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, sub }) {
  const pct = max ? Math.min(100, (num(value) / max) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
        </div>
        <p className="text-sm font-semibold text-gray-950">{value}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-gray-950" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DailyTrendChart({ data = [] }) {
  const rows = data.slice(-14);
  const maxOrders = Math.max(...rows.map((x) => num(x.orders || x.count)), 1);
  const maxRevenue = Math.max(...rows.map((x) => num(x.revenue)), 1);

  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Daily Orders + Revenue</h2>
          <p className="text-sm text-gray-500">Last 14 days order movement.</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-950" /> Orders
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-300" /> Revenue
          </span>
        </div>
      </div>

      {rows.length ? (
        <div className="flex h-72 items-end gap-3 overflow-x-auto pb-2">
          {rows.map((item, idx) => {
            const orders = num(item.orders || item.count);
            const revenue = num(item.revenue);
            const orderH = Math.max(6, (orders / maxOrders) * 210);
            const revenueH = Math.max(6, (revenue / maxRevenue) * 210);

            return (
              <div key={item.date || idx} className="flex min-w-[54px] flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-[220px] items-end gap-1.5">
                  <div
                    title={`${orders} orders`}
                    className="w-4 rounded-t-md bg-gray-950 transition hover:opacity-80"
                    style={{ height: `${orderH}px` }}
                  />
                  <div
                    title={money(revenue)}
                    className="w-4 rounded-t-md bg-gray-300 transition hover:bg-gray-400"
                    style={{ height: `${revenueH}px` }}
                  />
                </div>
                <p className="text-[11px] font-medium text-gray-500">{fmtDate(item.date)}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
          Daily trend data not available yet.
        </div>
      )}
    </Card>
  );
}

function SourcePerformance({ data = [] }) {
  const rows = data.slice(0, 8);
  const max = Math.max(...rows.map((x) => num(x.orders || x.count)), 1);

  return (
    <Card className="p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-950">Source Performance</h2>
        <p className="text-sm text-gray-500">Orders and revenue by acquisition source.</p>
      </div>

      {rows.length ? (
        <div className="space-y-4">
          {rows.map((x, idx) => (
            <BarRow
              key={x.source || x.label || idx}
              label={String(x.source || x.label || "direct").toUpperCase()}
              value={num(x.orders || x.count)}
              max={max}
              sub={`${money(x.revenue)} revenue`}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
          Source data not available yet.
        </div>
      )}
    </Card>
  );
}

function HourlyHeatmap({ data = [] }) {
  const rows = Array.from({ length: 24 }).map((_, hour) => {
    const found = data.find((x) => Number(x.hour) === hour);
    return {
      hour,
      orders: num(found?.orders || found?.count),
      revenue: num(found?.revenue),
    };
  });

  const max = Math.max(...rows.map((x) => x.orders), 1);

  return (
    <Card className="p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-950">Hourly Order Heatmap</h2>
        <p className="text-sm text-gray-500">Best order timing by hour.</p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12">
        {rows.map((x) => {
          const opacity = Math.max(0.08, x.orders / max);

          return (
            <div key={x.hour} className="rounded-lg bg-gray-50 p-3 text-center">
              <div
                className="mx-auto mb-2 h-9 w-9 rounded-lg bg-gray-950"
                style={{ opacity }}
                title={`${x.orders} orders`}
              />
              <p className="text-xs font-semibold text-gray-900">{String(x.hour).padStart(2, "0")}:00</p>
              <p className="text-[11px] text-gray-500">{x.orders} orders</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function OrdersDashboardPage() {
  const router = useRouter();

  const { orderDashboard, orderDashboardLoading, error, fetchOrdersDashboard } = useOrderStore();

  useEffect(() => {
    fetchOrdersDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = orderDashboard?.summary || {};
  const pipeline = orderDashboard?.pipeline || {};
  const payment = orderDashboard?.payment || {};
  const actions = orderDashboard?.actions || {};
  const issues = orderDashboard?.issues || {};

  const dailyTrend = orderDashboard?.dailyTrend || orderDashboard?.trends?.daily || [];
  const sourcePerformance =
    orderDashboard?.sourcePerformance || orderDashboard?.attribution?.sources || [];
  const hourlyTrend = orderDashboard?.hourlyTrend || orderDashboard?.trends?.hourly || [];

  const nav = (url) => router.push(url);

  const pipelineMax = Math.max(
    num(pipeline.processing),
    num(pipeline.packed),
    num(pipeline.picked),
    num(pipeline.shipped),
    num(pipeline.outForDelivery),
    num(pipeline.delivered),
    1
  );

  const paymentPie = useMemo(
    () => [
      { label: "COD", value: num(payment.codOrders), color: "#111827" },
      { label: "Prepaid", value: num(payment.prepaidOrders), color: "#6b7280" },
      { label: "Exchange", value: num(payment.exchangeOrders), color: "#d1d5db" },
    ],
    [payment]
  );

  const issuePie = useMemo(
    () => [
      { label: "Cancelled", value: num(issues.cancelled), color: "#ef4444" },
      { label: "RTO", value: num(issues.rto), color: "#f97316" },
      { label: "Returned", value: num(issues.returned), color: "#8b5cf6" },
      { label: "Refunded", value: num(issues.refunded), color: "#6b7280" },
    ],
    [issues]
  );

  if (orderDashboardLoading) {
    return (
      <section className="min-h-screen bg-[#f8f8f8] px-4 py-6 md:px-6">
        <div className="space-y-5">
          <div className="h-44 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-black/[0.04]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((x) => (
              <div key={x} className="h-36 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-black/[0.04]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-[#f8f8f8] p-6">
        <Card className="p-6 text-sm text-red-600">{error}</Card>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f8f8f8] px-4 py-6 md:px-6">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="relative p-6 md:p-7">
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                  <Sparkles size={14} />
                  Orders Command Center
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 md:text-5xl">
                  Orders Dashboard
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                  Today, weekly, monthly, payment, source and fulfillment health in one clean dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fetchOrdersDashboard}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-black/[0.05] transition hover:bg-gray-50"
                >
                  <RefreshCcw size={17} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => nav("/orders/all?confirmed=true")}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  View Orders
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat
                dark
                label="Today Summary"
                value={money(summary.todayRevenue)}
                sub={`${num(summary.todayOrders)} orders today`}
              />

              <MiniStat
                label="This Week Summary"
                value={money(summary.thisWeekRevenue ?? summary.last7Revenue)}
                sub={`${num(summary.thisWeekOrders ?? summary.last7Orders)} orders this week`}
              />

              <MiniStat
                label="Weekly Summary"
                value={money(summary.last7Revenue)}
                sub={`${num(summary.last7Orders)} orders • AOV ${money(summary.aov7)}`}
              />

              <MiniStat
                label="This Month Summary"
                value={money(summary.thisMonthRevenue ?? summary.monthRevenue)}
                sub={`${num(summary.thisMonthOrders ?? summary.monthOrders)} orders this month`}
              />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Total Counted Orders"
            value={num(summary.totalOrders)}
            sub="Razorpay paid + COD confirmed + Exchange"
            icon={CalendarDays}
            onClick={() => nav("/orders/all?confirmed=true")}
          />

          <Stat
            title="Total Revenue"
            value={money(summary.totalRevenue)}
            sub="Total counted revenue"
            icon={CircleDollarSign}
            tone="bg-gray-800"
            onClick={() => nav("/orders/all?confirmed=true")}
          />

          <Stat
            title="Pending Confirmation"
            value={num(actions.pendingConfirmation)}
            sub="Orders waiting for confirmation"
            icon={Clock3}
            tone="bg-gray-700"
            onClick={() => nav("/orders/all")}
          />

          <Stat
            title="Refund Pending"
            value={num(actions.refundPending)}
            sub="Needs refund action"
            icon={Wallet}
            tone="bg-gray-950"
            onClick={() => nav("/refunds/eligible-orders")}
          />
        </div>

        <DailyTrendChart data={dailyTrend} />

        <Card className="p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Fulfillment Pipeline</h2>
              <p className="text-sm text-gray-500">Live operational movement by order status.</p>
            </div>
            <button
              type="button"
              onClick={() => nav("/orders/all?confirmed=true")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-950 hover:opacity-70"
            >
              Open list <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <PipelineItem label="Processing" value={num(pipeline.processing)} icon={PackageOpen} onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=processing")} />
            <PipelineItem label="Packed" value={num(pipeline.packed)} icon={PackageCheck} onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=packed")} />
            <PipelineItem label="Picked" value={num(pipeline.picked)} icon={Zap} onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=picked")} />
            <PipelineItem label="Shipped" value={num(pipeline.shipped)} icon={Truck} onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=shipped")} />
            <PipelineItem label="OFD" value={num(pipeline.outForDelivery)} icon={Truck} onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=out_for_delivery")} />
            <PipelineItem label="Delivered" value={num(pipeline.delivered)} icon={CheckCircle2} onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=delivered")} />
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">Payment Split</h2>
              <p className="text-sm text-gray-500">COD, prepaid and exchange distribution.</p>
            </div>
            <DonutChart data={paymentPie} centerTitle="Orders" centerValue={num(summary.totalOrders)} />
          </Card>

          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">Issue Split</h2>
              <p className="text-sm text-gray-500">Cancelled, RTO, returned and refunded breakup.</p>
            </div>
            <DonutChart data={issuePie} centerTitle="Issues" centerValue={num(issues.total)} />
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">Pipeline Graph</h2>
              <p className="text-sm text-gray-500">Visual count comparison across fulfillment stages.</p>
            </div>

            <div className="space-y-5">
              <BarRow label="Processing" value={num(pipeline.processing)} max={pipelineMax} />
              <BarRow label="Packed" value={num(pipeline.packed)} max={pipelineMax} />
              <BarRow label="Picked" value={num(pipeline.picked)} max={pipelineMax} />
              <BarRow label="Shipped" value={num(pipeline.shipped)} max={pipelineMax} />
              <BarRow label="Out for Delivery" value={num(pipeline.outForDelivery)} max={pipelineMax} />
              <BarRow label="Delivered" value={num(pipeline.delivered)} max={pipelineMax} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Action Center</h2>
                <p className="text-sm text-gray-500">Queues that need attention.</p>
              </div>
              <ShieldAlert size={22} className="text-gray-400" />
            </div>

            <div className="space-y-1">
              <ActionRow
                icon={Clock3}
                title="Confirm pending orders"
                sub="COD / unconfirmed queue"
                value={num(actions.pendingConfirmation)}
                onClick={() => nav("/orders/all")}
              />
              <ActionRow
                icon={PackageCheck}
                title="Ready to pack"
                sub="Packable confirmed orders"
                value={num(actions.packableOrders)}
                onClick={() => nav("/orders/all?confirmed=true")}
              />
              <ActionRow
                icon={Undo2}
                title="Refund pending"
                sub="Refund queue"
                value={num(actions.refundPending)}
                danger
                onClick={() => nav("/refunds/eligible-orders")}
              />
              <ActionRow
                icon={RotateCcw}
                title="RTO orders"
                sub="Return to origin"
                value={num(issues.rto)}
                danger
                onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=rto")}
              />
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SourcePerformance data={sourcePerformance} />
          <HourlyHeatmap data={hourlyTrend} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Delivery Rate"
            value={`${num(summary.deliveryRate).toFixed(1)}%`}
            sub={`${num(pipeline.delivered)} delivered orders`}
            icon={CheckCircle2}
            tone="bg-gray-800"
            onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=delivered")}
          />
          <Stat
            title="Issue Rate"
            value={`${num(summary.issueRate).toFixed(1)}%`}
            sub={`${num(issues.total)} total issue orders`}
            icon={ShieldAlert}
            tone="bg-red-600"
            onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=cancelled,rto,returned,refunded")}
          />
          <Stat
            title="Pending to Ship"
            value={num(pipeline.pendingToShip)}
            sub="Processing + packed"
            icon={PackageOpen}
            tone="bg-gray-800"
            onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=processing,packed")}
          />
          <Stat
            title="In Transit"
            value={num(pipeline.inTransit)}
            sub="Picked + shipped + OFD"
            icon={Truck}
            tone="bg-gray-700"
            onClick={() => nav("/orders/all?confirmed=true&fulfillmentStatus=picked,shipped,out_for_delivery")}
          />
        </div>
      </div>
    </section>
  );
}
