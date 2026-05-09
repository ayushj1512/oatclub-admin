"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSpreadsheet,
  Plus,
  RefreshCcw,
  RotateCcw,
  Settings,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const cards = [
  {
    title: "All Refunds",
    desc: "View Razorpay, COD and manual refund records.",
    icon: RotateCcw,
    route: "/refunds/list",
  },
  {
    title: "Razorpay Queue",
    desc: "Process automatic source refunds.",
    icon: CreditCard,
    route: "/refunds/razorpay",
  },
  {
    title: "Manual Refunds",
    desc: "Handle UPI, bank, cash and store credit.",
    icon: Banknote,
    route: "/refunds/manual",
  },
  {
    title: "Create Refund",
    desc: "Create a manual refund request.",
    icon: Plus,
    route: "/refunds/create",
  },
  {
    title: "Failed Refunds",
    desc: "Review failed cases and retry actions.",
    icon: ShieldAlert,
    route: "/refunds/failed",
  },
  {
    title: "Reports",
    desc: "Track amount, volume and refund trends.",
    icon: FileSpreadsheet,
    route: "/refunds/reports",
  },
  {
    title: "Settings",
    desc: "Manage refund rules and preferences.",
    icon: Settings,
    route: "/refunds/settings",
  },
];

export default function RefundsHomePage() {
  const router = useRouter();

  const { summary, loading, refreshing, error, fetchRefundOrders, clearError } =
    useOrderRefundStore();

  useEffect(() => {
    fetchRefundOrders({ page: 1, limit: 100 }, { silent: true });
  }, [fetchRefundOrders]);

  const stats = [
    {
      label: "Pending Orders",
      value: summary?.refundPendingCount || 0,
      sub: "Waiting for action",
      icon: Clock3,
    },
    {
      label: "Refund Amount",
      value: money(summary?.totalRefundAmount),
      sub: "Estimated pending value",
      icon: WalletCards,
    },
    {
      label: "Action Required",
      value: summary?.actionRequiredCount || 0,
      sub: "Needs admin review",
      icon: ShieldAlert,
    },
    {
      label: "Queue Total",
      value: summary?.totalOrders || 0,
      sub: "In refund queue",
      icon: CheckCircle2,
    },
  ];

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      {/* Header */}
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Refund Portal
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Manage Refunds
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Track Razorpay refunds, COD/manual refunds, failed cases and
              reports from one clean admin panel.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchRefundOrders({ page: 1, limit: 100 }, { silent: true })}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={loading || refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => router.push("/refunds/razorpay")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <CreditCard size={16} />
              Razorpay Queue
            </button>

            <button
              type="button"
              onClick={() => router.push("/refunds/create")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <Plus size={16} />
              Create Refund
            </button>
          </div>
        </div>
      </section>

      {/* Error */}
      {error ? (
        <section className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="font-medium text-red-800"
          >
            Dismiss
          </button>
        </section>
      ) : null}

      {/* Stats */}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <span className="rounded-2xl bg-gray-100 p-2 text-gray-700">
                <Icon size={17} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-semibold">
              {loading ? "—" : value}
            </p>

            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </section>

      {/* Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, desc, icon: Icon, route }) => (
          <button
            key={title}
            type="button"
            onClick={() => router.push(route)}
            className="group rounded-3xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-2xl bg-gray-100 p-3 text-gray-900 transition group-hover:bg-black group-hover:text-white">
                <Icon size={21} />
              </span>

              <ArrowRight
                size={18}
                className="mt-1 text-gray-300 transition group-hover:translate-x-1 group-hover:text-black"
              />
            </div>

            <h2 className="mt-5 text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">{desc}</p>
          </button>
        ))}
      </section>

      <p className="mt-8 text-center text-xs font-medium text-gray-400">
        Powered by Razorpay + Manual Refunds
      </p>
    </main>
  );
}