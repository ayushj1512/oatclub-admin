"use client";

import { useState } from "react";
import Link from "next/link";
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
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#800020]/10 bg-white shadow-[8px_0_30px_rgba(128,0,32,0.04)] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "w-20" : "w-64"}`}
    >
      <div
        className={`flex h-16 items-center border-b border-[#800020]/10 px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-[#800020] transition hover:opacity-80"
          >
            Miray Admin
          </Link>
        )}

        <button
          type="button"
          onClick={toggleCollapse}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#800020]/5 hover:text-[#800020]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {currentMenu.map(({ label, href }, i) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");

            return (
              <li key={`${href}-${i}`}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#800020]/8 text-[#800020] shadow-[0_8px_22px_rgba(128,0,32,0.08)]"
                      : "text-gray-700 hover:bg-[#800020]/5 hover:text-[#800020]"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {!collapsed && <span className="truncate">{label}</span>}
                  {collapsed && (
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
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