"use client";

import { useMemo } from "react";
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
  Globe,
  RotateCcw,
  Handshake,
  Footprints,
  Star,
  Scissors,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import useLoginStore from "@/store/useLoginStore";
import {
  ROLE_DEFAULT_PERMS,
  DOMAIN_PERMISSIONS,
  hasPermission,
} from "@/config/loginConfig";
import LiveClock from "@/components/dashboard/LiveClock";

const DOMAIN_LIST = [
  { id: "designing", name: "Designing", icon: Palette, route: "/designing" },
  { id: "design_lab", name: "Design Lab", icon: Sparkles, route: "/design-lab" },
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
  {
    id: "collaboration",
    name: "Influencer Collaborations",
    icon: Handshake,
    route: "/influencer-collaboration-program",
  },
];

const CARD_HINTS = {
  design_lab: "Creative apparel design workspace",
  rma: "View Return / Exchange requests",
  collaboration: "Track ongoing influencer collaborations",
  footwear: "Manage footwear catalog & variants",
  shiprocket: "Manage Shiprocket sync, labels & tracking",
  bluedart: "Manage Blue Dart shipments, labels & tracking",
  reviews: "Moderate product reviews & ratings",
  fabrics: "Manage fabric records & mappings",
};

const isFeaturedCard = (id) => id === "design_lab";

export default function HomeDashboard() {
  const router = useRouter();
  const admin = useLoginStore((s) => s.admin);
  const role = admin?.role || "viewer";

  // Resolve permissions
  const permissions = useMemo(() => {
    if (admin?.permissions?.length) return admin.permissions;
    return ROLE_DEFAULT_PERMS[role] || [];
  }, [admin?.permissions, role]);

  // Allowed cards only
  const allowedDomains = useMemo(() => {
    return DOMAIN_LIST.filter((item) =>
      hasPermission(permissions, DOMAIN_PERMISSIONS[item.id])
    );
  }, [permissions]);

  // Sort by name
  const sortedDomains = useMemo(() => {
    return [...allowedDomains].sort((a, b) => a.name.localeCompare(b.name));
  }, [allowedDomains]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-8 md:px-8">
      {/* Single merged top card */}
      <div className="mb-6">
        <LiveClock />
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
            {sortedDomains.map(({ id, name, icon: Icon, route }) => {
              const featured = isFeaturedCard(id);

              return (
                <motion.button
                  key={id}
                  layout
                  type="button"
                  onClick={() => router.push(route)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className={[
                    "group relative flex min-h-[150px] flex-col items-center justify-center overflow-hidden rounded-2xl px-3 py-5 shadow-sm transition-all duration-300 sm:min-h-[170px] sm:px-4 sm:py-6",
                    featured
                      ? "border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 ring-1 ring-fuchsia-100 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(217,70,239,0.18)]"
                      : "border border-gray-200 bg-white hover:-translate-y-1 hover:shadow-md",
                  ].join(" ")}
                >
                  {featured && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.16),_transparent_45%)]" />
                  )}

                  <div
                    className={[
                      "relative rounded-xl p-3 text-white shadow-md transition-transform group-hover:scale-110 sm:p-4",
                      featured
                        ? "bg-gradient-to-br from-fuchsia-600 via-pink-500 to-rose-500 shadow-[0_12px_24px_rgba(217,70,239,0.28)]"
                        : "bg-gradient-to-br from-blue-600 to-blue-500",
                    ].join(" ")}
                  >
                    <Icon size={24} className="sm:hidden" />
                    <Icon size={30} className="hidden sm:block" />
                  </div>

                  <h2
                    className={[
                      "relative mt-3 text-center font-semibold sm:mt-4",
                      featured
                        ? "text-base text-fuchsia-700 sm:text-xl"
                        : "text-sm text-gray-900 group-hover:text-blue-700 sm:text-lg",
                    ].join(" ")}
                  >
                    {name}
                  </h2>

                  {CARD_HINTS[id] && (
                    <p
                      className={[
                        "relative mt-1 text-center text-[11px]",
                        featured
                          ? "max-w-[220px] text-fuchsia-700/80"
                          : "text-gray-500",
                      ].join(" ")}
                    >
                      {CARD_HINTS[id]}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}