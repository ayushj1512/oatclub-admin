"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Palette,
  Calculator,
  Boxes,
  BadgeDollarSign,
  BarChart3,
  Users,
  FileBarChart,
  Ticket,
  TicketPercent,
  Package,
  ClipboardList,
  Images,
  FileText,
  Headset,
  Clapperboard,
  RotateCcw,
  Handshake,
  Star,
  Scissors,
  Sparkles,
  CreditCard,
  MessageCircle,
  Mail,
  Barcode,
  Factory,
  KeyRound,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import useLoginStore from "@/store/useLoginStore";
import {
  ROLE_DEFAULT_PERMS,
  DOMAIN_PERMISSIONS,
  hasPermission,
} from "@/config/loginConfig";
import LiveClock from "@/components/dashboard/LiveClock";

const DOMAIN_LIST = [
  {
    id: "designing",
    name: "Designing",
    icon: Palette,
    route: "/designing",
  },
  {
    id: "design_lab",
    name: "Design Lab",
    icon: Sparkles,
    route: "/design-lab",
  },
  {
    id: "production",
    name: "Production / Tailoring",
    icon: Ticket,
    route: "/production",
  },
  {
    id: "vendors",
    name: "Vendors",
    icon: Factory,
    route: "/vendors",
  },
  {
    id: "accounts",
    name: "Accounts",
    icon: Calculator,
    route: "/accounts",
  },
  {
    id: "products",
    name: "Products",
    icon: Package,
    route: "/products",
  },
  {
    id: "barcode",
    name: "Barcode",
    icon: Barcode,
    route: "/barcodes",
  },
  {
    id: "orders",
    name: "Orders",
    icon: ClipboardList,
    route: "/orders",
  },
  {
    id: "refunds",
    name: "Refunds",
    icon: CreditCard,
    route: "/refunds",
  },
  {
    id: "otp",
    name: "OTP & Verification",
    icon: KeyRound,
    route: "/otp",
  },
  {
    id: "fast2sms",
    name: "Fast2SMS",
    icon: MessageCircle,
    route: "/fast2sms",
  },
  {
    id: "shiprocket",
    name: "Shiprocket",
    icon: Package,
    route: "/shiprocket",
  },
  {
    id: "reviews",
    name: "Reviews",
    icon: Star,
    route: "/reviews",
  },
  {
    id: "rma",
    name: "RMA Requests",
    icon: RotateCcw,
    route: "/rma",
  },
  {
    id: "media",
    name: "Media",
    icon: Images,
    route: "/media",
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    route: "/email",
  },
  {
    id: "reels",
    name: "Reels",
    icon: Clapperboard,
    route: "/reels",
  },
  {
    id: "blogs",
    name: "Blogs",
    icon: FileText,
    route: "/blogs",
  },
  {
    id: "inventory",
    name: "Inventory",
    icon: Boxes,
    route: "/inventory",
  },
  {
    id: "fabrics",
    name: "Fabrics",
    icon: Scissors,
    route: "/fabrics",
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: BarChart3,
    route: "/marketing",
  },
  {
    id: "customers",
    name: "Customers",
    icon: Users,
    route: "/customers/dashboard",
  },
  {
    id: "support",
    name: "Customer Support",
    icon: Headset,
    route: "/customer-support",
  },
  {
    id: "reports",
    name: "Reports",
    icon: FileBarChart,
    route: "/reports",
  },
  {
    id: "coupons",
    name: "Coupons",
    icon: TicketPercent,
    route: "/coupons",
  },
  {
    id: "collaboration",
    name: "Influencer Collaborations",
    icon: Handshake,
    route: "/influencer-collaboration-program",
  },
  {
    id: "affiliate",
    name: "Affiliate",
    icon: BadgeDollarSign,
    route: "/affiliate",
  },
];

const CARD_HINTS = {
  design_lab: "Creative apparel design workspace",
  vendors: "Create vendors and assign product codes and modules",
  barcode: "Generate, print and manage unique product barcodes",
  refunds: "Manage Razorpay refunds and manual refund proofs",
  otp: "Send OTPs, inspect verification logs and monitor delivery",
  fast2sms: "View WhatsApp confirmation logs and message status",
  rma: "View return and exchange requests",
  collaboration: "Track ongoing influencer collaborations",
  shiprocket: "Manage Shiprocket sync, labels and tracking",
  reviews: "Moderate product reviews and ratings",
  fabrics: "Manage fabric records and mappings",
  email: "Preview all brand emails, subjects and template states",
  affiliate: "Manage affiliates, referrals, commissions and payouts",
};

const FOCUS_QUOTES = [
  "Move the cleanest work first, then let the dashboard catch up.",
  "Small operational wins compound into a calmer brand.",
  "Ship with clarity. Review with patience. Repeat.",
  "The best admin day is quiet, focused, and already moving.",
];

const ALWAYS_VISIBLE_MODULES = ["barcode", "vendors", "otp"];

const isFeaturedCard = (id) => id === "design_lab";

export default function HomeDashboard() {
  const router = useRouter();

  const admin = useLoginStore((state) => state.admin);
  const role = admin?.role || "viewer";

  const permissions = useMemo(() => {
    if (admin?.permissions?.length) {
      return admin.permissions;
    }

    return ROLE_DEFAULT_PERMS[role] || [];
  }, [admin?.permissions, role]);

  const allowedDomains = useMemo(
    () =>
      DOMAIN_LIST.filter((item) => {
        const requiredPermission = DOMAIN_PERMISSIONS[item.id];

        if (
          ALWAYS_VISIBLE_MODULES.includes(item.id) &&
          !requiredPermission
        ) {
          return true;
        }

        return hasPermission(permissions, requiredPermission);
      }),
    [permissions]
  );

  const sortedDomains = useMemo(
    () =>
      [...allowedDomains].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [allowedDomains]
  );

  const focusQuote = useMemo(() => {
    const index = new Date().getDate() % FOCUS_QUOTES.length;
    return FOCUS_QUOTES[index];
  }, []);

  const adminName =
    admin?.fullName ||
    admin?.name ||
    admin?.username ||
    "OATCLUB team";

  return (
    <div className="min-h-screen bg-oat-bg px-3 py-5 sm:px-6 sm:py-7 md:px-8">
      <section className="mb-6 overflow-hidden rounded-[30px] border border-zinc-100 bg-white px-5 py-6 shadow-[0_24px_70px_rgba(9,9,11,0.035)] sm:px-7 sm:py-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-100 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                OATCLUB Admin
              </span>

              <span className="rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {role}
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-oat-text sm:text-5xl lg:text-6xl">
              Welcome back, {adminName}.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              OATCLUB admin control room for orders, products, customers,
              OTPs, barcodes, vendors and growth.
            </p>
          </div>

          <LiveClock />
        </div>

        <div className="mt-7 grid gap-3 border-t border-zinc-100 pt-5 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="rounded-2xl bg-zinc-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Today&apos;s focus
            </p>

            <p className="mt-2 text-sm font-medium leading-6 text-zinc-800">
              {focusQuote}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Modules
            </p>

            <p className="mt-2 text-3xl font-black text-zinc-950">
              {sortedDomains.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Workspace
            </p>

            <p className="mt-2 text-3xl font-black text-zinc-950">
              Live
            </p>
          </div>
        </div>
      </section>

      {sortedDomains.length === 0 ? (
        <div className="rounded-[28px] border border-zinc-100 bg-white p-6 text-center text-gray-600 shadow-sm">
          You do not have access to any modules yet.
        </div>
      ) : (
        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-950">
                OATCLUB workspaces
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Choose where you want to work.
              </p>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {sortedDomains.length} available
            </p>
          </div>

          <motion.div
            layout
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            <AnimatePresence initial={false}>
              {sortedDomains.map(
                ({ id, name, icon: Icon, route }, index) => {
                  const featured = isFeaturedCard(id);

                  return (
                    <motion.button
                      key={id}
                      layout
                      type="button"
                      onClick={() => router.push(route)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 36,
                      }}
                      className={[
                        "group flex min-h-[116px] items-start gap-4 rounded-3xl border bg-white p-4 text-left transition-all duration-300",
                        featured
                          ? "border-zinc-200 shadow-[0_16px_44px_rgba(9,9,11,0.055)] hover:-translate-y-1"
                          : "border-zinc-100 shadow-sm hover:-translate-y-1 hover:border-zinc-200 hover:shadow-[0_12px_30px_rgba(9,9,11,0.04)]",
                      ].join(" ")}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-sm">
                        <Icon size={20} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          {featured && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-700">
                              Featured
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 text-sm font-bold leading-snug text-zinc-950 sm:text-base">
                          {name}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                          {CARD_HINTS[id] || "Open this workspace."}
                        </p>
                      </div>

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 transition group-hover:bg-zinc-950 group-hover:text-white">
                        <ArrowUpRight size={15} />
                      </span>
                    </motion.button>
                  );
                }
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      )}
    </div>
  );
}