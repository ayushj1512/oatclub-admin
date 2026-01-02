"use client";

import { useEffect, useState } from "react";
import {
  TicketPercent,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function CouponReportsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/coupons`);
      const data = await res.json();

      setCoupons(data.data || []);
    } catch (error) {
      console.log("Error fetching coupon reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const now = new Date();

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(
    (c) => c.isActive && new Date(c.validTill) > now
  ).length;
  const expiredCoupons = coupons.filter(
    (c) => new Date(c.validTill) < now
  ).length;

  // Top Used Coupons
  const topUsed = [...coupons]
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 5);

  return (
<div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
  <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

    {/* HEADER */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-500 text-white shadow-lg shadow-orange-200/40">
          <TicketPercent size={34} />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Coupon Usage Reports
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Track how your coupons are performing.
          </p>
        </div>
      </div>

      {/* Optional (premium hint) */}
      <div className="text-sm text-gray-500">
        Updated: <span className="font-medium text-gray-700">{new Date().toLocaleDateString()}</span>
      </div>
    </div>

    {/* ANALYTICS */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* TOTAL */}
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

      {/* ACTIVE */}
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

      {/* EXPIRED */}
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

    {/* TOP USED COUPONS */}
    <div className="rounded-2xl bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Top Used Coupons</h2>
        <p className="text-sm text-gray-500">Top 5 by usage count</p>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading analytics...</div>
      ) : topUsed.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No coupon usage found yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50/60">
                <th className="py-4 px-4 font-medium">Code</th>
                <th className="py-4 px-4 font-medium">Type</th>
                <th className="py-4 px-4 font-medium">Discount</th>
                <th className="py-4 px-4 font-medium">Used Count</th>
                <th className="py-4 px-4 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {topUsed.map((c) => {
                const expired = new Date(c.validTill) < now;

                return (
                  <tr
                    key={c._id}
                    className="hover:bg-gray-50/60 transition border-b border-gray-100/60 last:border-0"
                  >
                    <td className="py-4 px-4 font-semibold text-gray-900">
                      {c.code}
                    </td>

                    <td className="py-4 px-4 capitalize text-gray-600">{c.type}</td>

                    <td className="py-4 px-4 text-gray-800">
                      {c.discountType === "percentage"
                        ? `${c.discountValue}%`
                        : `₹${c.discountValue}`}
                    </td>

                    <td className="py-4 px-4 text-gray-700">{c.usedCount}</td>

                    <td className="py-4 px-4">
                      {expired ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

  </div>
</div>

  );
}
