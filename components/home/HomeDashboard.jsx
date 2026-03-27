"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Palette,
  Calculator,
  Boxes,
  Truck,
  Laptop,
  BarChart3,
  Users,
  ShoppingCart,
  LineChart,
  FileBarChart,
  Ticket,
  TicketPercent,
  Package,
  ClipboardList,
  Images,
  FileText,
  Headset,
  Clapperboard,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Quote,
  Globe,
  RotateCcw,
  Handshake,
  Footprints,
  Star,
  Scissors,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import useLoginStore from "@/store/useLoginStore";
import {
  ROLE_DEFAULT_PERMS,
  DOMAIN_PERMISSIONS,
  hasPermission,
} from "@/config/loginConfig";

const QUOTES = [
  { text: "Small progress every day beats big plans someday.", tag: "Consistency" },
  { text: "Discipline turns goals into results — show up today.", tag: "Discipline" },
  { text: "Consistency is the real shortcut. Do the work daily.", tag: "Daily Work" },
  { text: "Today’s effort is tomorrow’s advantage.", tag: "Momentum" },
  { text: "Win the day. Repeat.", tag: "Execution" },
  { text: "Focus on what you can do today — momentum will follow.", tag: "Focus" },
  { text: "Action creates clarity. Start now.", tag: "Action" },
  { text: "Work the plan. Trust the process.", tag: "Process" },
  { text: "Done today is better than perfect tomorrow.", tag: "Progress" },
  { text: "One focused hour beats a whole day distracted.", tag: "Deep Work" },
];

const DOMAIN_LIST = [
  { id: "designing", name: "Designing", icon: Palette, route: "/designing" },
  { id: "production", name: "Production / Tailoring", icon: Ticket, route: "/production" },
  { id: "accounts", name: "Accounts", icon: Calculator, route: "/accounts" },
  { id: "products", name: "Products", icon: Package, route: "/products" },
  { id: "footwear", name: "Footwear", icon: Footprints, route: "/footwear" },
  { id: "orders", name: "Orders", icon: ClipboardList, route: "/orders" },
  { id: "shiprocket", name: "Shiprocket", icon: Package, route: "/shiprocket" },
  { id: "bluedart", name: "Blue Dart", icon: Truck, route: "/bluedart" },
  { id: "reviews", name: "Reviews", icon: Star, route: "/reviews" },
  { id: "rma", name: "RMA Requests", icon: RotateCcw, route: "/rma" },
  { id: "media", name: "Media", icon: Images, route: "/media" },
  { id: "reels", name: "Reels", icon: Clapperboard, route: "/reels" },
  { id: "blogs", name: "Blogs", icon: FileText, route: "/blogs" },
  { id: "inventory", name: "Inventory", icon: Boxes, route: "/inventory" },
  { id: "fabrics", name: "Fabrics", icon: Scissors, route: "/fabrics" },
  { id: "operations", name: "Operations", icon: Truck, route: "/operations" },
  { id: "it", name: "IT & Systems", icon: Laptop, route: "/it" },
  { id: "marketing", name: "Marketing", icon: BarChart3, route: "/marketing" },
  { id: "customers", name: "Customers", icon: Users, route: "/customers/dashboard" },
  { id: "support", name: "Customer Support", icon: Headset, route: "/customer-support" },
  { id: "sales", name: "Sales", icon: ShoppingCart, route: "/sales" },
  { id: "analytics", name: "Data Analytics", icon: LineChart, route: "/analytics" },
  { id: "reports", name: "Reports", icon: FileBarChart, route: "/reports" },
  { id: "tickets", name: "Tickets / Issues", icon: Ticket, route: "/tickets" },
  { id: "coupons", name: "Coupons", icon: TicketPercent, route: "/coupons" },
  { id: "wordpress", name: "WordPress Orders", icon: Globe, route: "/wordpress" },
  { id: "collaboration", name: "Influencer Collaborations", icon: Handshake, route: "/collaboration" },
];

export default function HomeDashboard() {
  const router = useRouter();

  const admin = useLoginStore((s) => s.admin);
  const role = admin?.role || "viewer";
  const permissions =
    (admin?.permissions?.length ? admin.permissions : ROLE_DEFAULT_PERMS[role]) || [];

  const [quote, setQuote] = useState(QUOTES[0]);
  const [sortBy, setSortBy] = useState("name_asc");
  const lastIdx = useRef(-1);

  const pickQuote = () => {
    const n = QUOTES.length;
    if (!n) return;
    let i = Math.floor(Math.random() * n);
    if (i === lastIdx.current) i = (i + 1) % n;
    lastIdx.current = i;
    setQuote(QUOTES[i]);
  };

  useEffect(() => {
    pickQuote();
    const t = setInterval(pickQuote, 9000);
    return () => clearInterval(t);
  }, []);

  const allowedDomains = useMemo(() => {
    return DOMAIN_LIST.filter((d) =>
      hasPermission(permissions, DOMAIN_PERMISSIONS[d.id])
    );
  }, [permissions]);

  const sortedDomains = useMemo(() => {
    const arr = [...allowedDomains];
    if (sortBy === "name_desc") {
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    }
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }, [allowedDomains, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-10 md:px-8">
      <div className="mb-6">
        <div className="w-full rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
                <Sparkles size={18} className="text-blue-700" />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-gray-900">Daily Focus</div>
                  <span className="hidden items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[11px] text-white sm:inline-flex">
                    <Quote size={12} /> Quote
                  </span>
                  <span className="inline-flex items-center rounded-full border border-blue-100 bg-white px-2 py-1 text-[11px] text-blue-700">
                    {quote.tag}
                  </span>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={quote.text}
                    initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
                    transition={{ duration: 0.28 }}
                    className="mt-1 break-words text-sm leading-snug text-gray-700 sm:text-[15px]"
                  >
                    <span className="font-semibold text-blue-700">“</span>
                    {quote.text}
                    <span className="font-semibold text-blue-700">”</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 md:w-auto">
              <button
                type="button"
                onClick={pickQuote}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
              >
                <RefreshCw size={16} />
              </button>

              <div className="flex w-full items-center gap-2 md:w-auto">
                <div className="hidden items-center gap-2 text-xs text-gray-500 md:flex">
                  <ArrowUpDown size={14} /> Sort
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none shadow-sm hover:bg-gray-50 md:w-auto"
                >
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {sortedDomains.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          You don’t have access to any modules yet.
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 gap-3 sm:gap-6 sm:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]"
        >
          <AnimatePresence initial={false}>
            {sortedDomains.map(({ id, name, icon: Icon, route }) => (
              <motion.button
                layout
                key={id}
                type="button"
                onClick={() => router.push(route)}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="group flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:min-h-[170px] sm:px-4 sm:py-6"
              >
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 p-3 text-white shadow-md transition-transform group-hover:scale-110 sm:p-4">
                  <Icon size={24} className="sm:hidden" />
                  <Icon size={30} className="hidden sm:block" />
                </div>

                <h2 className="mt-3 text-center text-sm font-semibold text-gray-900 group-hover:text-blue-700 sm:mt-4 sm:text-lg">
                  {name}
                </h2>

                {id === "rma" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    View Return / Exchange requests
                  </p>
                )}

                {id === "collaboration" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    Track ongoing influencer collaborations
                  </p>
                )}

                {id === "footwear" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    Manage footwear catalog & variants
                  </p>
                )}

                {id === "shiprocket" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    Manage Shiprocket sync, labels & tracking
                  </p>
                )}

                {id === "bluedart" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    Manage Blue Dart shipments, labels & tracking
                  </p>
                )}

                {id === "reviews" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    Moderate product reviews & ratings
                  </p>
                )}

                {id === "fabrics" && (
                  <p className="mt-1 text-center text-[11px] text-gray-500 sm:text-xs">
                    Manage fabric records & mappings
                  </p>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}