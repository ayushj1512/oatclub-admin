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
  Star, // ✅ NEW for Reviews
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

  // ✅ Shiprocket
  { id: "shiprocket", name: "Shiprocket", icon: Package, route: "/shiprocket" },

  // ✅ NEW: Reviews
  // NOTE: route ko apne actual admin reviews page se match kar dena
  { id: "reviews", name: "Reviews", icon: Star, route: "/reviews" },

  { id: "rma", name: "RMA Requests", icon: RotateCcw, route: "/rma" },
  { id: "media", name: "Media", icon: Images, route: "/media" },
  { id: "reels", name: "Reels", icon: Clapperboard, route: "/reels" },
  { id: "blogs", name: "Blogs", icon: FileText, route: "/blogs" },
  { id: "inventory", name: "Inventory", icon: Boxes, route: "/inventory" },
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
    return DOMAIN_LIST.filter((d) => hasPermission(permissions, DOMAIN_PERMISSIONS[d.id]));
  }, [permissions]);

  const [sortBy, setSortBy] = useState("name_asc");

  const sortedDomains = useMemo(() => {
    const arr = [...allowedDomains];
    if (sortBy === "default" || sortBy === "name_asc")
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "name_desc")
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    return arr;
  }, [allowedDomains, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-6 md:px-8 py-6 sm:py-10">
      <div className="mx-auto ">
        {/* Quote Bar */}
        <div className="mb-6">
          <div className="w-full rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 sm:px-5 py-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-blue-100 shrink-0 shadow-sm">
                  <Sparkles size={18} className="text-blue-700" />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-gray-900">Daily Focus</div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-600 text-white">
                      <Quote size={12} /> Quote
                    </span>
                    <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full border border-blue-100 bg-white text-blue-700">
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
                      className="mt-1 text-gray-700 leading-snug text-sm sm:text-[15px] break-words"
                    >
                      <span className="text-blue-700 font-semibold">“</span>
                      {quote.text}
                      <span className="text-blue-700 font-semibold">”</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex w-full md:w-auto items-center gap-2">
                <button
                  type="button"
                  onClick={pickQuote}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                >
                  <RefreshCw size={16} />
                </button>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                    <ArrowUpDown size={14} /> Sort
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full md:w-auto bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none hover:bg-gray-50 shadow-sm"
                  >
                    <option value="default">Default (A → Z)</option>
                    <option value="name_asc">Name (A → Z)</option>
                    <option value="name_desc">Name (Z → A)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domains */}
        {sortedDomains.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-600">
            You don’t have access to any modules yet.
          </div>
        ) : (
          <motion.div
            layout
            className="grid gap-4 sm:gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]"
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
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center group px-4 py-6 min-h-[170px]"
                >
                  <div className="p-4 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform bg-gradient-to-br from-blue-600 to-blue-500">
                    <Icon size={30} />
                  </div>

                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mt-4 group-hover:text-blue-700 text-center">
                    {name}
                  </h2>

                  {id === "rma" && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      View Return / Exchange requests
                    </p>
                  )}

                  {id === "collaboration" && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Track ongoing influencer collaborations
                    </p>
                  )}

                  {id === "footwear" && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Manage footwear catalog & variants
                    </p>
                  )}

                  {id === "shiprocket" && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Manage Shiprocket sync, labels & tracking
                    </p>
                  )}

                  {/* ✅ Reviews hint */}
                  {id === "reviews" && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Moderate product reviews & ratings
                    </p>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
