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
  RotateCcw, // ✅ Added for RMA
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HomeDashboard() {
  const router = useRouter();

  /* ============================
     Quotes
  ============================ */
  const quotes = useMemo(
    () => [
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
    ],
    []
  );

  const [quote, setQuote] = useState(quotes[0]);
  const lastIndexRef = useRef(-1);

  const pickNewQuote = () => {
    if (!quotes.length) return;
    if (quotes.length === 1) return setQuote(quotes[0]);

    let idx = Math.floor(Math.random() * quotes.length);
    if (idx === lastIndexRef.current) idx = (idx + 1) % quotes.length;

    lastIndexRef.current = idx;
    setQuote(quotes[idx]);
  };

  useEffect(() => {
    pickNewQuote();
    const t = setInterval(pickNewQuote, 9000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================
     Domains (Dashboard Cards)
  ============================ */
  const domains = useMemo(
    () => [
      { id: "designing", name: "Designing", icon: Palette, route: "/designing" },
      { id: "production", name: "Production / Tailoring", icon: Ticket, route: "/production" },
      { id: "accounts", name: "Accounts", icon: Calculator, route: "/accounts" },
      { id: "products", name: "Products", icon: Package, route: "/products" },

      // ✅ Orders Group
      { id: "orders", name: "Orders", icon: ClipboardList, route: "/orders" },

      // ✅ NEW: RMA Requests Page
      { id: "rma", name: "RMA Requests", icon: RotateCcw, route: "/rma" },

      { id: "media", name: "Media", icon: Images, route: "/media" },
      { id: "reels", name: "Reels", icon: Clapperboard, route: "/reels" },
      { id: "blogs", name: "Blogs", icon: FileText, route: "/blogs" },
      { id: "inventory", name: "Inventory", icon: Boxes, route: "/inventory" },
      { id: "operations", name: "Operations", icon: Truck, route: "/operations" },
      { id: "it", name: "IT & Systems", icon: Laptop, route: "/it" },
      { id: "marketing", name: "Marketing", icon: BarChart3, route: "/marketing" },
      { id: "customers", name: "Customers", icon: Users, route: "/customers/dashboard" },
      { id: "support", name: "Customer Support", icon: Headset, route: "/support-tickets" },
      { id: "sales", name: "Sales", icon: ShoppingCart, route: "/sales" },
      { id: "analytics", name: "Data Analytics", icon: LineChart, route: "/analytics" },
      { id: "reports", name: "Reports", icon: FileBarChart, route: "/reports" },
      { id: "tickets", name: "Tickets / Issues", icon: Ticket, route: "/tickets" },
      { id: "coupons", name: "Coupons", icon: TicketPercent, route: "/coupons" },
      { id: "wordpress", name: "WordPress Orders", icon: Globe, route: "/wordpress" },
    ],
    []
  );

  /* ============================
     Sorting
  ============================ */
  const [sortBy, setSortBy] = useState("default");

  const sortedDomains = useMemo(() => {
    const copy = [...domains];
    if (sortBy === "default") return copy;
    if (sortBy === "name_asc") return copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy.sort((a, b) => b.name.localeCompare(a.name));
  }, [domains, sortBy]);

  /* ============================
     UI
  ============================ */
  return (
    <div className="min-h-screen bg-gray-50 px-6 md:px-8 py-10 md:py-12">
      <div className="mx-auto">
        {/* Top Quote bar */}
        <div className="mb-6">
          <div className="w-full rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 sm:px-5 py-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-blue-100 shrink-0 shadow-sm">
                <Sparkles size={18} className="text-blue-700" />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-gray-900">Daily Focus</div>

                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-600 text-white">
                    <Quote size={12} />
                    Quote
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
                    title={quote.text}
                  >
                    <span className="text-blue-700 font-semibold">“</span>
                    {quote.text}
                    <span className="text-blue-700 font-semibold">”</span>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    Changes automatically
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Click refresh for a new one</span>
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={pickNewQuote}
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                title="New quote"
              >
                <RefreshCw size={16} />
              </button>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                  <ArrowUpDown size={14} />
                  Sort
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 rounded-2xl px-3 py-2 text-sm outline-none hover:bg-gray-50 shadow-sm"
                >
                  <option value="default">Default</option>
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Domain cards */}
        <motion.div layout className="w-full flex flex-wrap justify-center gap-6 md:gap-8">
          <AnimatePresence initial={false}>
            {sortedDomains.map((domain) => {
              const Icon = domain.icon;

              return (
                <motion.button
                  layout
                  key={domain.id}
                  type="button"
                  onClick={() => router.push(domain.route)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="cursor-pointer w-64 h-48 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center group"
                >
                  <div className="p-4 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform bg-gradient-to-br from-blue-600 to-blue-500">
                    <Icon size={32} />
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mt-4 transition group-hover:text-blue-700">
                    {domain.name}
                  </h2>

                  {/* ✅ Small label for RMA */}
                  {domain.id === "rma" && (
                    <p className="text-xs text-gray-500 mt-1">
                      View Return / Exchange requests
                    </p>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
