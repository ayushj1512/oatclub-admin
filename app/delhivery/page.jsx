"use client";

import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Box,
  ClipboardList,
  Clock3,
  FileText,
  MapPin,
  PackageSearch,
  Settings,
  ShieldAlert,
  Truck,
} from "lucide-react";

const modules = [
  {
    title: "Create Shipment",
    description: "Book packed orders with Delhivery.",
    route: "/delhivery/create",
    icon: Box,
  },
  {
    title: "Tracking",
    description: "Track shipments using AWB numbers.",
    route: "/delhivery/tracking",
    icon: PackageSearch,
  },
  {
    title: "Labels",
    description: "Generate and download shipping labels.",
    route: "/delhivery/labels",
    icon: FileText,
  },
  {
    title: "Pickup Requests",
    description: "Schedule and review courier pickups.",
    route: "/delhivery/pickups",
    icon: Clock3,
  },
  {
    title: "Serviceability",
    description: "Check COD and prepaid availability.",
    route: "/delhivery/serviceability",
    icon: MapPin,
  },
  {
    title: "NDR",
    description: "Handle failed delivery attempts.",
    route: "/delhivery/ndr",
    icon: ShieldAlert,
  },
  {
    title: "Logs",
    description: "Review booking and API activity.",
    route: "/delhivery/logs",
    icon: ClipboardList,
  },
  {
    title: "Settings",
    description: "View Delhivery configuration.",
    route: "/delhivery/settings",
    icon: Settings,
  },
];

export default function DelhiveryPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <Truck size={22} />
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-zinc-950">
              Delhivery
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Manage shipment booking, tracking, labels, pickups and delivery
              operations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/delhivery/create")}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Create Shipment
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map(({ title, description, route, icon: Icon }) => (
          <button
            key={route}
            type="button"
            onClick={() => router.push(route)}
            className="group rounded-[24px] border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950">
                <Icon size={20} />
              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 transition group-hover:bg-zinc-950 group-hover:text-white">
                <ArrowUpRight size={15} />
              </span>
            </div>

            <h2 className="mt-5 text-base font-bold text-zinc-950">{title}</h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {description}
            </p>
          </button>
        ))}
      </section>
    </main>
  );
}
