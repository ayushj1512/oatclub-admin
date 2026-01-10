"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Clock,
  Truck,
  CheckCircle,
  RotateCcw,
  TrendingUp,
  IndianRupee,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString("en-IN") : "0";
};

const StatCard = ({ title, value, icon: Icon, onClick, badge, tone }) => {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <button
      onClick={onClick}
      className="
        group w-full text-left
        rounded-2xl bg-white
        border border-gray-100
        shadow-sm hover:shadow-md
        transition-all duration-200
        p-5
        hover:-translate-y-[2px]
      "
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="text-3xl font-bold text-gray-900">{value}</div>

          {badge ? (
            <span className="inline-flex mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 text-gray-700">
              {badge}
            </span>
          ) : null}
        </div>

        <div
          className={`
            h-12 w-12 rounded-2xl flex items-center justify-center
            ${toneMap[tone] || toneMap.gray}
            group-hover:scale-105 transition
          `}
        >
          <Icon size={22} />
        </div>
      </div>
    </button>
  );
};

export default function OrdersDashboard() {
  const router = useRouter();

  const { orders, loading, error, fetchAllOrders } = useOrderStore();

  // ✅ Load orders from store
  useEffect(() => {
    fetchAllOrders({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     ✅ ONLY CONFIRMED ORDERS
  ============================================================ */
  const confirmedOrders = useMemo(() => {
    const data = Array.isArray(orders) ? orders : [];
    return data.filter((o) => o?.isConfirmed === true);
  }, [orders]);

  // ✅ Compute stats (ONLY confirmed)
  const stats = useMemo(() => {
    const data = confirmedOrders;

    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10);

    const todayOrders = data.filter((o) =>
      new Date(o.createdAt || o.orderDate).toISOString().startsWith(todayDate)
    );

    const sumTodayRevenue = todayOrders.reduce(
      (acc, o) => acc + (Number(o.finalPayable) || 0),
      0
    );

    const countBy = (status) =>
      data.filter((o) => o.fulfillmentStatus === status).length;

    return {
      totalOrders: data.length, // ✅ confirmed total
      processing: countBy("processing"),
      packed: countBy("packed"),
      shipped: countBy("shipped"),
      outForDelivery: countBy("out_for_delivery"),
      delivered: countBy("delivered"),
      returned: data.filter((o) =>
        ["returned", "cancelled"].includes(o.fulfillmentStatus)
      ).length,
      todayOrders: todayOrders.length,
      todayRevenue: sumTodayRevenue,
    };
  }, [confirmedOrders]);

  // ✅ Recent Orders (ONLY confirmed)
  const recentOrders = useMemo(() => {
    const data = confirmedOrders;
    return [...data]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.orderDate).getTime() -
          new Date(a.createdAt || a.orderDate).getTime()
      )
      .slice(0, 6);
  }, [confirmedOrders]);

  const mainCards = [
    {
      title: "Confirmed Orders",
      value: stats.totalOrders,
      icon: ClipboardList,
      route: "/orders/all?confirmed=true",
      tone: "blue",
    },
    {
      title: "Processing",
      value: stats.processing,
      icon: Clock,
      route: "/orders/all?confirmed=true&fulfillmentStatus=processing",
      tone: "yellow",
    },
    {
      title: "Packed",
      value: stats.packed,
      icon: TrendingUp,
      route: "/orders/all?confirmed=true&fulfillmentStatus=packed",
      tone: "purple",
    },
    {
      title: "Shipped",
      value: stats.shipped,
      icon: Truck,
      route: "/orders/all?confirmed=true&fulfillmentStatus=shipped",
      tone: "indigo",
    },
    {
      title: "Out for Delivery",
      value: stats.outForDelivery,
      icon: Truck,
      route: "/orders/all?confirmed=true&fulfillmentStatus=out_for_delivery",
      tone: "gray",
    },
    {
      title: "Delivered",
      value: stats.delivered,
      icon: CheckCircle,
      route: "/orders/all?confirmed=true&fulfillmentStatus=delivered",
      tone: "green",
    },
    {
      title: "Returned / Cancelled",
      value: stats.returned,
      icon: RotateCcw,
      route: "/orders/all?confirmed=true&fulfillmentStatus=returned",
      tone: "red",
    },
  ];

  // ✅ Loading state
  if (loading) {
    return (
      <section className="min-h-screen bg-[#F7F7FA] px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse" />
          <div className="grid md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse"
              />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-[#F7F7FA] p-10 text-center text-red-500">
        {error}
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#F7F7FA] px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Orders Dashboard
            </h1>
            <p className="text-gray-500 mt-2 max-w-xl">
              Dashboard shows <b>ONLY CONFIRMED</b> orders.
            </p>
          </div>

          <button
            onClick={() => router.push("/orders/all?confirmed=true")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90 transition active:scale-[0.98]"
          >
            View Confirmed Orders <ArrowRight size={18} />
          </button>
        </div>

        {/* TODAY STATS (confirmed only) */}
        <div className="grid md:grid-cols-2 gap-5">
          <StatCard
            title="Today's Confirmed Orders"
            value={stats.todayOrders}
            icon={CalendarDays}
            tone="blue"
            badge="Confirmed orders placed today"
            onClick={() => router.push("/orders/all?confirmed=true")}
          />
          <StatCard
            title="Today's Revenue (Confirmed)"
            value={`₹${money(stats.todayRevenue)}`}
            icon={IndianRupee}
            tone="green"
            badge="Net payable (confirmed orders)"
            onClick={() => router.push("/orders/all?confirmed=true")}
          />
        </div>

        {/* STATUS CARDS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mainCards.map((c) => (
            <StatCard
              key={c.title}
              title={c.title}
              value={c.value}
              icon={c.icon}
              tone={c.tone}
              onClick={() => router.push(c.route)}
            />
          ))}
        </div>

        {/* RECENT CONFIRMED ORDERS */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Confirmed Orders
              </h2>
              <p className="text-sm text-gray-500">
                Latest 6 orders (confirmed only).
              </p>
            </div>

            <button
              onClick={() => router.push("/orders/all?confirmed=true")}
              className="text-sm font-semibold text-black hover:opacity-70 transition"
            >
              See all →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="py-3 px-6 text-left font-semibold">Order #</th>
                  <th className="py-3 px-6 text-left font-semibold">Customer</th>
                  <th className="py-3 px-6 text-left font-semibold">Status</th>
                  <th className="py-3 px-6 text-left font-semibold">Payable</th>
                  <th className="py-3 px-6 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      No confirmed recent orders found.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o, idx) => {
                    const rowKey =
                      o?._id || o?.id || o?.orderNumber || `recent-${idx}`;

                    return (
                      <tr
                        key={String(rowKey)}
                        className="hover:bg-black/[0.02] cursor-pointer"
                        onClick={() => router.push(`/orders/${o?._id || o?.id}`)}
                      >
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          {o.orderNumber || "-"}
                        </td>
                        <td className="py-4 px-6 text-gray-700">
                          {o.customerId?.name ||
                            o.shippingAddressSnapshot?.fullName ||
                            "Unknown"}
                        </td>
                        <td className="py-4 px-6 capitalize text-gray-700">
                          {String(o.fulfillmentStatus || "")
                            .replace(/_/g, " ")
                            .trim()}
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          ₹{money(o.finalPayable)}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString()
                            : ""}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
