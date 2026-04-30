"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Settings,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

const cards = [
  {
    title: "All Refunds",
    desc: "View, filter and manage every refund request.",
    icon: RotateCcw,
    route: "/refunds/list",
  },
  {
    title: "Create Refund",
    desc: "Create a new refund request.",
    icon: Plus,
    route: "/refunds/create",
  },
  {
    title: "Refund Details",
    desc: "Open refund detail page from the refund list.",
    icon: WalletCards,
    route: "/refunds/list",
  },
  {
    title: "Razorpay Queue",
    desc: "Process Razorpay source refunds.",
    icon: CreditCard,
    route: "/refunds/razorpay",
  },
  {
    title: "Manual Refunds",
    desc: "Create and track manual refund requests.",
    icon: Banknote,
    route: "/refunds/manual",
  },
  {
    title: "Failed Refunds",
    desc: "Sync, review or retry failed refunds.",
    icon: ShieldAlert,
    route: "/refunds/failed",
  },
  {
    title: "Reports",
    desc: "Track totals and refund status reports.",
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

const stats = [
  { label: "Pending", value: "—", icon: Clock3 },
  { label: "Processing", value: "—", icon: WalletCards },
  { label: "Processed", value: "—", icon: CheckCircle2 },
  { label: "Failed", value: "—", icon: ShieldAlert },
];

export default function RefundsHomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
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
              Create refunds, process Razorpay refunds, track failed requests,
              manage reports and configure refund settings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/refunds/create")}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={16} />
            Create Refund
          </button>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <span className="rounded-2xl bg-gray-100 p-2 text-gray-700">
                <Icon size={17} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

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
        Powered by Razorpay
      </p>
    </main>
  );
}