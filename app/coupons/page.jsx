"use client";

import { useRouter } from "next/navigation";
import {
  TicketPercent,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useMemo } from "react";

// ✅ IMPORT STORE
import { useCouponStore } from "@/store/couponStore";

export default function CouponDashboard() {
  const router = useRouter();

  // ✅ STORE STATE
  const { coupons, loading, fetchCoupons } = useCouponStore();

  const cards = [
    {
      id: "create",
      title: "Create New Coupon",
      desc: "Add a new coupon code with discount rules and expiry.",
      icon: PlusCircle,
      route: "/coupons/create",
      color: "from-green-500 to-emerald-500",
    },
    {
      id: "manage",
      title: "Manage Coupons",
      desc: "View, edit, activate or deactivate existing coupons.",
      icon: Settings,
      route: "/coupons/manage",
      color: "from-blue-500 to-indigo-500",
    },
    {
      id: "reports",
      title: "Coupon Usage Reports",
      desc: "Track coupon performance, usage statistics & customer activity.",
      icon: FileSpreadsheet,
      route: "/coupons/reports",
      color: "from-orange-500 to-amber-500",
    },
  ];

  useEffect(() => {
    // ✅ store se fetch
    fetchCoupons();
  }, [fetchCoupons]);

  const now = new Date();

  // ✅ Stats computed via useMemo for performance
  const totalCoupons = coupons.length;

  const activeCoupons = useMemo(() => {
    return coupons.filter((c) => c.isActive && new Date(c.validTill) > now).length;
  }, [coupons]);

  const expiredCoupons = useMemo(() => {
    return coupons.filter((c) => new Date(c.validTill) < now).length;
  }, [coupons]);

  const recentCoupons = useMemo(() => {
    return [...coupons]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [coupons]);

  return (
<div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
  <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

    {/* HEADER */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-200/40">
          <TicketPercent size={34} />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Coupons Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Overview of coupon performance, recent activity & quick actions.
          </p>
        </div>
      </div>

      <button
        onClick={() => router.push("/coupons/create")}
        className="
          w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium
          shadow-md hover:shadow-lg transition active:scale-[0.99]
        "
      >
        + Create Coupon
      </button>
    </div>

    {/* ANALYTICS */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total */}
      <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <TrendingUp className="text-blue-600" size={26} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Coupons</p>
            <h2 className="text-2xl font-semibold text-gray-900">
              {loading ? "…" : totalCoupons}
            </h2>
          </div>
        </div>
      </div>

      {/* Active */}
      <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <CheckCircle className="text-green-600" size={26} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Coupons</p>
            <h2 className="text-2xl font-semibold text-gray-900">
              {loading ? "…" : activeCoupons}
            </h2>
          </div>
        </div>
      </div>

      {/* Expired */}
      <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm hover:shadow-md transition p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <AlertTriangle className="text-red-600" size={26} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Expired Coupons</p>
            <h2 className="text-2xl font-semibold text-gray-900">
              {loading ? "…" : expiredCoupons}
            </h2>
          </div>
        </div>
      </div>
    </div>

    {/* QUICK ACTIONS */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => router.push(card.route)}
            className="
              text-left p-5 rounded-2xl bg-white/70 backdrop-blur shadow-sm
              hover:shadow-md hover:-translate-y-0.5 transition-all duration-300
              hover:ring-1 hover:ring-gray-200/70
              group
            "
          >
            <div
              className={`w-fit p-3 rounded-xl mb-3 bg-gradient-to-br ${card.color} text-white shadow group-hover:scale-105 transition-transform`}
            >
              <Icon size={22} />
            </div>

            <h2 className="text-base font-semibold text-gray-900">
              {card.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {card.desc}
            </p>
          </button>
        );
      })}
    </div>

    {/* RECENT COUPONS */}
    <div className="rounded-2xl bg-white/80 backdrop-blur shadow-sm p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Recent Coupons</h2>

        <button
          onClick={() => router.push("/coupons/manage")}
          className="text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          View All →
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading coupons…</div>
      ) : recentCoupons.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No coupons found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-3 px-2">Code</th>
                <th className="py-3 px-2">Type</th>
                <th className="py-3 px-2">Discount</th>
                <th className="py-3 px-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentCoupons.map((c) => (
                <tr
                  key={c._id}
                  className="hover:bg-gray-50/60 transition rounded-xl"
                >
                  <td className="py-3 px-2 font-semibold text-gray-900">
                    {c.code}
                  </td>
                  <td className="py-3 px-2 capitalize text-gray-600">{c.type}</td>
                  <td className="py-3 px-2 text-gray-700">
                    {c.discountType === "percentage"
                      ? `${c.discountValue}%`
                      : `₹${c.discountValue}`}
                  </td>
                  <td className="py-3 px-2 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

  </div>
</div>




  );
}
