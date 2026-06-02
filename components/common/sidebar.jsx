"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { sidebarMenus, routeSidebarMap } from "../common/sidebarConfig";

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  if (pathname === "/") return null;

  const matchedEntry = routeSidebarMap.find((entry) =>
    pathname.startsWith(entry.prefix)
  );

  const activeKey = matchedEntry?.key || "dashboard";
  const currentMenu = sidebarMenus[activeKey] || [];

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* Header */}
      <div
        className={`flex h-20 items-center border-b border-zinc-200 px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <Link
            href="/"
            className="flex flex-col items-start transition-opacity hover:opacity-80"
          >
            <Image
              src="https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png"
              alt="OATCLUB"
              width={130}
              height={40}
              priority
              className="h-auto w-[130px] object-contain"
            />

            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
              Own All Trends
            </span>
          </Link>
        )}

        {collapsed && (
          <Link
            href="/"
            className="absolute left-1/2 top-4 -translate-x-1/2"
          >
            <Image
              src="https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png"
              alt="OATCLUB"
              width={34}
              height={34}
              priority
              className="h-8 w-8 object-contain"
            />
          </Link>
        )}

        <button
          type="button"
          onClick={toggleCollapse}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 ${
            collapsed ? "mt-10" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {currentMenu.map(({ label, href }, i) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={`${href}-${i}`}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-black text-white"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-black"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {!collapsed && <span className="truncate">{label}</span>}

                  {collapsed && (
                    <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}