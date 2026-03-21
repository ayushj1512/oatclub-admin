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
  RefreshCw,
  Quote,
  Globe,
  RotateCcw,
  Handshake,
  Footprints,
  Star,
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

const getSubtitle = (id) => {
  if (id === "rma") return "Return / Exchange";
  if (id === "collaboration") return "Influencer tracking";
  if (id === "footwear") return "Catalog & variants";
  if (id === "shiprocket") return "Labels & tracking";
  if (id === "bluedart") return "Shipments & labels";
  if (id === "reviews") return "Ratings moderation";
  return "";
};

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

  const domains = useMemo(() => {
    return DOMAIN_LIST
      .filter((d) => hasPermission(permissions, DOMAIN_PERMISSIONS[d.id]))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [permissions]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white shadow-sm">
              <Sparkles size={16} className="text-blue-700" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Daily Focus</span>
                <span className="inline-flex items-center rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] text-blue-700">
                  <Quote size={10} className="mr-1" />
                  {quote.tag}
                </span>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={quote.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs leading-5 text-gray-700"
                >
                  “{quote.text}”
                </motion.p>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={pickQuote}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm active:scale-95"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {domains.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-600">
            You don’t have access to any modules yet.
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence initial={false}>
              {domains.map(({ id, name, icon: Icon, route }) => {
                const subtitle = getSubtitle(id);

                return (
                  <motion.button
                    key={id}
                    layout
                    type="button"
                    onClick={() => router.push(route)}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="group flex min-h-[148px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.98]"
                  >
                    <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 p-3 text-white shadow-md">
                      <Icon size={22} />
                    </div>

                    <h2 className="mt-3 text-sm font-semibold leading-5 text-gray-900">
                      {name}
                    </h2>

                    {subtitle ? (
                      <p className="mt-1 text-[11px] leading-4 text-gray-500">
                        {subtitle}
                      </p>
                    ) : null}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}