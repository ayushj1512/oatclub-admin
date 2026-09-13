// components/ndr/NdrDashboard.jsx

"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  MessageCircle,
  PackageCheck,
  PackageX,
  Truck,
} from "lucide-react";

const modules = [
  {
    title: "All NDR Cases",
    description: "View and manage every failed delivery",
    href: "/ndr/all",
    icon: PackageX,
  },
  {
    title: "Delhivery NDR",
    description: "Reattempt, reschedule or update customer details",
    href: "/ndr/delhivery",
    icon: Truck,
  },
  {
    title: "Shiprocket NDR",
    description: "Manage Shiprocket delivery exceptions",
    href: "/ndr/shiprocket",
    icon: Truck,
  },
  {
    title: "Customer Responses",
    description: "Review customer delivery instructions",
    href: "/ndr/customer-responses",
    icon: MessageCircle,
  },
  {
    title: "Escalations",
    description: "Handle rejected and unresolved NDR requests",
    href: "/ndr/escalations",
    icon: AlertTriangle,
  },
];

export default function NdrDashboard({
  stats = {},
}) {
  const summary = [
    {
      label: "Open NDR",
      value: stats.open ?? 0,
      icon: PackageX,
    },
    {
      label: "Awaiting Customer",
      value: stats.awaitingCustomer ?? 0,
      icon: Clock3,
    },
    {
      label: "Escalations",
      value: stats.escalations ?? 0,
      icon: AlertTriangle,
    },
    {
      label: "Resolved",
      value: stats.resolved ?? 0,
      icon: PackageCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            OATCLUB Operations
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
            NDR Management
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Resolve failed deliveries before they become RTO.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">{label}</p>

                <Icon
                  size={18}
                  className="text-zinc-400"
                />
              </div>

              <p className="mt-4 text-3xl font-semibold text-zinc-950">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-950">
            NDR Operations
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map(
              ({
                title,
                description,
                href,
                icon: Icon,
              }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-zinc-100 p-2.5 text-zinc-700">
                      <Icon size={20} />
                    </div>

                    <ArrowRight
                      size={18}
                      className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-950"
                    />
                  </div>

                  <h3 className="mt-5 font-semibold text-zinc-950">
                    {title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {description}
                  </p>
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
