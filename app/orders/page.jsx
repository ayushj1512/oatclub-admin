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
  XCircle,
  Wallet,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString("en-IN") : "0";
};

const isoDate = (d) => {
  const dt = d ? new Date(d) : null;
  return dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : "";
};

const fmtShort = (d) => {
  const dt = d ? new Date(d) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const lower = (v) => String(v || "").toLowerCase().trim();

const isRazorpayPaid = (o) => {
  const method = lower(o?.paymentMethod || o?.paymentGateway);
  const status = lower(o?.paymentStatus || o?.paymentState);

  const looksRazorpay =
    method === "razorpay" ||
    method.includes("razorpay") ||
    Boolean(o?.razorpay?.orderId || o?.razorpay?.paymentId || o?.razorpayOrderId);

  const paidLike =
    status === "paid" || status === "captured" || status === "success" || Boolean(o?.razorpay?.paidAt);

  return looksRazorpay && paidLike;
};

const isCodConfirmed = (o) => lower(o?.paymentMethod) === "cod" && o?.isConfirmed === true;

const isExchangeOrder = (o) => lower(o?.paymentMethod) === "exchange" || lower(o?.paymentStatus) === "not_applicable";

/** ✅ Orders to count in dashboard stats */
const isCountableOrder = (o) => isRazorpayPaid(o) || isCodConfirmed(o) || isExchangeOrder(o);

/** ✅ Date basis for "today" */
const activityDate = (o) => {
  if (isRazorpayPaid(o)) return o?.razorpay?.paidAt || o?.paidAt || o?.updatedAt || o?.createdAt || o?.orderDate;
  if (isCodConfirmed(o)) return o?.confirmedAt || o?.updatedAt || o?.createdAt || o?.orderDate;
  return o?.updatedAt || o?.createdAt || o?.orderDate;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const withinLastDays = (d, days) => {
  const dt = d ? new Date(d) : null;
  if (!dt || Number.isNaN(dt.getTime())) return false;
  const now = new Date();
  const from = startOfDay(now);
  from.setDate(from.getDate() - (days - 1));
  return dt.getTime() >= from.getTime() && dt.getTime() <= now.getTime();
};

const normalizeStatus = (s) => lower(s).replace(/\s+/g, "_");

const StatCard = ({ title, value, icon: Icon, onClick, badge, tone, sub }) => {
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
      className="group w-full text-left rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 hover:-translate-y-[2px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="text-3xl font-bold text-gray-900 truncate">{value}</div>
          {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
          {badge ? <span className="inline-flex mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 text-gray-700">{badge}</span> : null}
        </div>
        <div className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ${toneMap[tone] || toneMap.gray} group-hover:scale-105 transition`}>
          <Icon size={22} />
        </div>
      </div>
    </button>
  );
};

export default function OrdersDashboard() {
  const router = useRouter();
  const { orders, loading, error, fetchAllOrders } = useOrderStore();

  useEffect(() => {
    fetchAllOrders({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countableOrders = useMemo(() => {
    const data = Array.isArray(orders) ? orders : [];
    return data.filter(isCountableOrder);
  }, [orders]);

  const stats = useMemo(() => {
    const data = countableOrders;
    const today = isoDate(new Date());

    const todayOrders = data.filter((o) => isoDate(activityDate(o)) === today);
    const todayRevenue = todayOrders.reduce((acc, o) => acc + (Number(o?.finalPayable) || 0), 0);

    const last7 = data.filter((o) => withinLastDays(activityDate(o), 7));
    const last7Revenue = last7.reduce((acc, o) => acc + (Number(o?.finalPayable) || 0), 0);
    const aov7 = last7.length ? last7Revenue / last7.length : 0;

    const countBy = (status) => data.filter((o) => normalizeStatus(o?.fulfillmentStatus) === status).length;

    const delivered = countBy("delivered");
    const shipped = countBy("shipped");
    const outForDelivery = countBy("out_for_delivery");
    const packed = countBy("packed");
    const processing = countBy("processing");
    const picked = countBy("picked");

    const cancelled = countBy("cancelled");
    const returned = countBy("returned");
    const rto = countBy("rto");
    const refunded = countBy("refunded");

    const problem = cancelled + returned + rto + refunded;

    const pendingToShip = processing + packed; // pre-shipping work queue
    const inTransit = picked + shipped + outForDelivery; // moving

    const fulfillmentReady = data.filter((o) => normalizeStatus(o?.fulfillmentStatus) === "processing" && o?.isConfirmed === true).length;
    const unconfirmed = data.filter((o) => o?.isConfirmed !== true).length;

    const successBase = data.length || 1;
    const deliveryRate = (delivered / successBase) * 100;
    const problemRate = (problem / successBase) * 100;

    return {
      totalOrders: data.length,
      todayOrders: todayOrders.length,
      todayRevenue,

      last7Orders: last7.length,
      last7Revenue,
      aov7,

      processing,
      packed,
      picked,
      shipped,
      outForDelivery,
      delivered,

      refunded,
      cancelled,
      returned,
      rto,

      pendingToShip,
      inTransit,
      problem,

      fulfillmentReady,
      unconfirmed,

      deliveryRate,
      problemRate,
    };
  }, [countableOrders]);

  const recentOrders = useMemo(() => {
    return [...countableOrders]
      .sort((a, b) => new Date(activityDate(b)).getTime() - new Date(activityDate(a)).getTime())
      .slice(0, 8);
  }, [countableOrders]);

  const mainCards = [
    { title: "Counted Orders", value: stats.totalOrders, icon: ClipboardList, route: "/orders/all?confirmed=true", tone: "blue", badge: "Razorpay paid + COD confirmed + Exchange" },
    { title: "Pending to Ship", value: stats.pendingToShip, icon: Clock, route: "/orders/all?confirmed=true&fulfillmentStatus=processing,packed", tone: "yellow", badge: "Processing + Packed" },
    { title: "In Transit", value: stats.inTransit, icon: Truck, route: "/orders/all?confirmed=true&fulfillmentStatus=picked,shipped,out_for_delivery", tone: "indigo", badge: "Picked + Shipped + OFD" },
    { title: "Delivered", value: stats.delivered, icon: CheckCircle, route: "/orders/all?confirmed=true&fulfillmentStatus=delivered", tone: "green", badge: `Delivery rate: ${stats.deliveryRate.toFixed(1)}%` },
    { title: "Refunded", value: stats.refunded, icon: Wallet, route: "/orders/all?confirmed=true&fulfillmentStatus=refunded", tone: "purple" },
    { title: "Issues", value: stats.problem, icon: XCircle, route: "/orders/all?confirmed=true&fulfillmentStatus=cancelled,returned,rto,refunded", tone: "red", badge: `Problem rate: ${stats.problemRate.toFixed(1)}%` },
  ];

  if (loading) {
    return (
      <section className="min-h-screen bg-[#F7F7FA] px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse" />
          <div className="grid md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return <section className="min-h-screen bg-[#F7F7FA] p-10 text-center text-red-500">{error}</section>;
  }

  return (
    <section className="min-h-screen bg-[#F7F7FA] px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Orders Dashboard</h1>
            <p className="text-gray-500 mt-2 max-w-xl">Counts: <b>Razorpay Paid</b> + <b>COD Confirmed</b> + <b>Exchange</b></p>
          </div>
          <button onClick={() => router.push("/orders/all?confirmed=true")} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90 transition active:scale-[0.98]">
            View Orders <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <StatCard title="Today's Orders" value={stats.todayOrders} icon={CalendarDays} tone="blue" badge="Razorpay paid today + COD confirmed today" onClick={() => router.push("/orders/all?confirmed=true")} />
          <StatCard title="Today's Revenue" value={`₹${money(stats.todayRevenue)}`} icon={IndianRupee} tone="green" badge="Sum of payable for today’s counted orders" onClick={() => router.push("/orders/all?confirmed=true")} />
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <StatCard title="Last 7 Days Orders" value={stats.last7Orders} icon={TrendingUp} tone="blue" badge="Counted orders in last 7 days" onClick={() => router.push("/orders/all?confirmed=true")} />
          <StatCard title="Last 7 Days Revenue" value={`₹${money(stats.last7Revenue)}`} icon={IndianRupee} tone="green" badge={`AOV: ₹${money(stats.aov7)}`} onClick={() => router.push("/orders/all?confirmed=true")} />
          <StatCard title="Unconfirmed Orders" value={stats.unconfirmed} icon={Clock} tone="gray" badge="Need confirmation before shipping stages" onClick={() => router.push("/orders/all")} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mainCards.map((c) => (
            <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} tone={c.tone} badge={c.badge} onClick={() => router.push(c.route)} />
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders (Counted)</h2>
              <p className="text-sm text-gray-500">Latest 8 (by paidAt/confirmedAt/updatedAt).</p>
            </div>
            <button onClick={() => router.push("/orders/all?confirmed=true")} className="text-sm font-semibold text-black hover:opacity-70 transition">
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
                    <td colSpan={5} className="py-10 text-center text-gray-500">No orders found.</td>
                  </tr>
                ) : (
                  recentOrders.map((o, idx) => {
                    const rowKey = o?._id || o?.id || o?.orderNumber || `recent-${idx}`;
                    const customerName = o?.customerId?.name || o?.shippingAddressSnapshot?.fullName || "Unknown";
                    const status = String(o?.fulfillmentStatus || "").replace(/_/g, " ").trim();
                    const dt = activityDate(o);

                    return (
                      <tr key={String(rowKey)} className="hover:bg-black/[0.02] cursor-pointer" onClick={() => router.push(`/orders/${o?._id || o?.id}`)}>
                        <td className="py-4 px-6 font-semibold text-gray-900">{o?.orderNumber || "-"}</td>
                        <td className="py-4 px-6 text-gray-700">{customerName}</td>
                        <td className="py-4 px-6 capitalize text-gray-700">{status}</td>
                        <td className="py-4 px-6 font-semibold text-gray-900">₹{money(o?.finalPayable)}</td>
                        <td className="py-4 px-6 text-gray-600">{dt ? fmtShort(dt) : ""}</td>
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
