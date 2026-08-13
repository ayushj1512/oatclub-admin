"use client";

import { useRouter } from "next/navigation";
import {
  Boxes,
  Factory,
  PackageCheck,
  Truck,
  ArrowUpRight,
  PackageOpen,
  ReceiptText,
} from "lucide-react";

const DISPATCHING_PAGES = [
  {
    title: "On Demand Inventory",
    description: "Check products that require production or stock preparation.",
    href: "/dispatching/on-demand-inventory",
    icon: Boxes,
  },
  {
    title: "Production",
    description: "View production status and manage production workflow.",
    href: "/dispatching/production",
    icon: Factory,
  },
  {
    title: "Ready to Ship",
    description: "View orders that are ready for packing and dispatch.",
    href: "/dispatching/ready-to-ship",
    icon: PackageOpen,
  },
  {
    title: "Packed Orders",
    description: "View packed orders ready for shipment processing.",
    href: "/dispatching/packed",
    icon: PackageCheck,
  },
  {
    title: "Shipped Orders",
    description: "Track orders that have already been dispatched.",
    href: "/dispatching/shipped",
    icon: Truck,
  },
  {
    title: "Invoices",
    description: "View, search and manage invoices for dispatching orders.",
    href: "/dispatching/invoices",
    icon: ReceiptText,
  },
];

export default function DispatchingDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            OATCLUB Operations
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            Dispatching
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Manage inventory, production, ready-to-ship orders, packing,
            shipments and invoices from one workspace.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISPATCHING_PAGES.map(
            ({ title, description, href, icon: Icon }) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className="group flex min-h-[180px] flex-col rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon size={21} />
                  </span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-zinc-950 group-hover:text-white">
                    <ArrowUpRight size={17} />
                  </span>
                </div>

                <div className="mt-auto pt-6">
                  <h2 className="text-lg font-black text-zinc-950">
                    {title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {description}
                  </p>
                </div>
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
