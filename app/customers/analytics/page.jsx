// app/customers/analytics/page.jsx
"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Crown,
  Download,
  IndianRupee,
  RefreshCw,
  Repeat,
  ShieldAlert,
  TrendingUp,
  Users,
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

const getA = (customer) => customer?.analytics || {};

export default function CustomersAnalyticsPage() {
  const {
    customers,
    total,
    loadingList,
    error,
    syncingAllAnalytics,
    customerAnalyticsSummary,
    fetchCustomers,
    fetchCustomerAnalyticsSummary,
    syncAllCustomerAnalytics,
  } = useCustomerStore();

  useEffect(() => {
    fetchCustomers?.({
      page: 1,
      limit: 100,
      sortBy: "totalSpend",
      sortOrder: "desc",
    });
    fetchCustomerAnalyticsSummary?.();
  }, [fetchCustomers, fetchCustomerAnalyticsSummary]);

  const vm = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];

    const totals = list.reduce(
      (acc, customer) => {
        const a = getA(customer);

        acc.totalOrders += Number(a.totalOrders || 0);
        acc.totalSpend += Number(a.totalSpend || 0);
        acc.deliveredOrders += Number(a.deliveredOrders || 0);
        acc.cancelledOrders += Number(a.cancelledOrders || 0);
        acc.returnedOrders += Number(a.returnedOrders || 0);
        acc.rtoOrders += Number(a.rtoOrders || 0);
        acc.refundPendingOrders += Number(a.refundPendingOrders || 0);

        return acc;
      },
      {
        totalOrders: 0,
        totalSpend: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        rtoOrders: 0,
        refundPendingOrders: 0,
      }
    );

    const segments = {
      new: list.filter((c) => getA(c).customerType === "new").length,
      repeat: list.filter((c) => getA(c).customerType === "repeat").length,
      vip: list.filter((c) => getA(c).customerType === "vip").length,
      risky: list.filter((c) => getA(c).customerType === "risky").length,
      inactive: list.filter((c) => getA(c).customerType === "inactive").length,
    };

    const topCustomers = [...list]
      .sort(
        (a, b) =>
          Number(getA(b).totalSpend || 0) - Number(getA(a).totalSpend || 0)
      )
      .slice(0, 8);

    const riskyCustomers = [...list]
      .sort(
        (a, b) =>
          Number(getA(b).riskScore || 0) - Number(getA(a).riskScore || 0)
      )
      .slice(0, 8);

    const deliveryRate = totals.totalOrders
      ? (totals.deliveredOrders / totals.totalOrders) * 100
      : 0;

    const rtoRate = totals.totalOrders
      ? (totals.rtoOrders / totals.totalOrders) * 100
      : 0;

    const returnRate = totals.totalOrders
      ? (totals.returnedOrders / totals.totalOrders) * 100
      : 0;

    return {
      list,
      totals,
      segments,
      topCustomers,
      riskyCustomers,
      deliveryRate,
      rtoRate,
      returnRate,
      avgOrderValue: totals.totalOrders
        ? totals.totalSpend / totals.totalOrders
        : 0,
    };
  }, [customers]);

  const handleSync = async () => {
    const result = await syncAllCustomerAnalytics?.();
    if (result?.success) {
      fetchCustomers?.({
        page: 1,
        limit: 100,
        sortBy: "totalSpend",
        sortOrder: "desc",
      });
      fetchCustomerAnalyticsSummary?.();
    }
  };

  const modules = [
    {
      title: "Overview",
      desc: "Main customer intelligence dashboard.",
      href: "/customers/analytics",
      icon: <BarChart3 size={18} />,
      tone: "sky",
      active: true,
    },
    {
      title: "Segments",
      desc: "VIP, repeat, risky, inactive customer groups.",
      href: "/customers/analytics/segments",
      icon: <Users size={18} />,
      tone: "violet",
    },
    {
      title: "RTO & Risk",
      desc: "High-risk customers, return and RTO signals.",
      href: "/customers/analytics/risk",
      icon: <ShieldAlert size={18} />,
      tone: "rose",
    },
    {
      title: "Revenue",
      desc: "Top spenders, AOV and customer value.",
      href: "/customers/analytics/revenue",
      icon: <IndianRupee size={18} />,
      tone: "emerald",
    },
    {
      title: "Retention",
      desc: "Repeat buyers, inactive users and lifecycle.",
      href: "/customers/analytics/retention",
      icon: <Repeat size={18} />,
      tone: "amber",
    },
    {
      title: "Reports",
      desc: "Excel exports and downloadable reports.",
      href: "/customers/analytics/reports",
      icon: <Download size={18} />,
      tone: "gray",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 text-gray-950 md:px-8 md:py-7">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm ring-1 ring-gray-100">
              <TrendingUp size={14} />
              Customer analytics hub
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
              Customer Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Overall customer health, revenue, fulfillment behavior, RTO risk
              and segmentation.
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncingAllAnalytics}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={syncingAllAnalytics ? "animate-spin" : ""}
            />
            {syncingAllAnalytics ? "Syncing..." : "Sync Analytics"}
          </button>
        </div>

        {error ? (
          <div className="rounded-3xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={<Users size={18} />}
            label="Customers"
            value={n(total || customerAnalyticsSummary?.totalCustomers || 0)}
            sub={`Loaded ${n(vm.list.length)}`}
            tone="sky"
          />
          <Kpi
            icon={<IndianRupee size={18} />}
            label="Revenue"
            value={money(vm.totals.totalSpend)}
            sub={`AOV ${money(vm.avgOrderValue)}`}
            tone="emerald"
          />
          <Kpi
            icon={<Crown size={18} />}
            label="VIP Customers"
            value={n(vm.segments.vip)}
            sub={`Repeat ${n(vm.segments.repeat)}`}
            tone="violet"
          />
          <Kpi
            icon={<AlertTriangle size={18} />}
            label="Risk"
            value={`${pct(vm.rtoRate)} RTO`}
            sub={`Return ${pct(vm.returnRate)}`}
            tone="rose"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <ModuleCard key={item.title} {...item} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <SectionTitle title="Customer Segments" desc="Current split" />

            <div className="mt-5 space-y-3">
              {Object.entries(vm.segments).map(([key, value]) => {
                const max = Math.max(...Object.values(vm.segments), 1);

                return (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize text-gray-500">{key}</span>
                      <span className="font-semibold text-gray-900">
                        {n(value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-950"
                        style={{
                          width: `${Math.max(4, (value / max) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ListCard
            title="Top Customers"
            desc="Highest spend customers"
            rows={vm.topCustomers}
            type="spend"
          />

          <ListCard
            title="Risk Watchlist"
            desc="Highest risk score customers"
            rows={vm.riskyCustomers}
            type="risk"
          />
        </div>

        {loadingList ? (
          <div className="rounded-3xl bg-white p-5 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
            Loading analytics...
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }) {
  const tones = {
    sky: "from-sky-50 to-white text-sky-700 ring-sky-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    violet: "from-violet-50 to-white text-violet-700 ring-violet-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${tones[tone]}`}>
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
        {value}
      </div>
      <div className="mt-2 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function ModuleCard({ title, desc, href, icon, tone, active }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    gray: "bg-gray-50 text-gray-700 ring-gray-100",
  };

  return (
    <Link
      href={href}
      className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
          {icon}
        </div>

        <ArrowRight
          size={17}
          className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700"
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
        {active ? (
          <span className="rounded-full bg-gray-950 px-2 py-0.5 text-[10px] text-white">
            Active
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</p>
    </Link>
  );
}

function SectionTitle({ title, desc }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{desc}</p>
    </div>
  );
}

function ListCard({ title, desc, rows, type }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <SectionTitle title={title} desc={desc} />

      <div className="mt-4 space-y-2">
        {rows?.length ? (
          rows.map((customer) => {
            const a = getA(customer);

            return (
              <Link
                key={customer._id}
                href={`/customers/${customer._id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-3 transition hover:bg-gray-100"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-950">
                    {customer.name || "Unnamed Customer"}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {customer.phone || customer.email || "-"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-950">
                    {type === "spend"
                      ? money(a.totalSpend)
                      : Number(a.riskScore || 0).toFixed(1)}
                  </div>
                  <div className="text-[11px] capitalize text-gray-500">
                    {a.customerType || "new"}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500">
            No data found.
          </div>
        )}
      </div>
    </div>
  );
}