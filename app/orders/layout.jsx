"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileSearch,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldAlert,
  Truck,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/orders", icon: LayoutDashboard },
  { label: "All Orders", href: "/orders/all", icon: FileSearch },
  { label: "Search", href: "/orders/search", icon: Search },
  { label: "Processing", href: "/orders/processing", icon: PackageCheck },
  { label: "Shipped", href: "/orders/shipped", icon: Truck },
  { label: "Returns", href: "/orders/return_requested", icon: RotateCcw },
  { label: "RMA", href: "/orders/rma", icon: ShieldAlert },
  { label: "Invoices", href: "/orders/invoices", icon: ReceiptText },
  { label: "Reports", href: "/orders/report", icon: BarChart3 },
];

const isActivePath = (pathname, href) => {
  if (href === "/orders") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function OrdersLayout({ children }) {
  const pathname = usePathname();

  return (
    <section className="min-h-full bg-[#f8f8f8] text-gray-950">
      <div className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-3 py-3 sm:px-4 lg:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              OATCLUB Operations
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-gray-950">
              Orders Command Center
            </h1>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-black/[0.06] bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 md:flex">
            <span className="h-2 w-2 rounded-full bg-gray-950" />
            Admin order module
          </div>
        </div>

        <div className="overflow-x-auto px-3 pb-3 sm:px-4 lg:px-5">
          <nav className="flex min-w-max gap-2">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = isActivePath(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-gray-950 text-white"
                      : "border border-black/[0.06] bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="orders-module-surface">{children}</div>
    </section>
  );
}
