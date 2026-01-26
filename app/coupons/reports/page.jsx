"use client";

import { useEffect, useMemo, useState } from "react";
import { TicketPercent, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useCouponStore } from "@/store/couponStore";

export default function CouponReportsPage() {
  const { coupons, loading, fetchCoupons } = useCouponStore();
  const [filters, setFilters] = useState({ visibility: "", type: "" });

  useEffect(() => {
    fetchCoupons(); // ✅ uses admin cookies + same base API as store
  }, [fetchCoupons]);

  const now = new Date();

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (filters.visibility && c.visibility !== filters.visibility) return false;
      if (filters.type && c.type !== filters.type) return false;
      return true;
    });
  }, [coupons, filters]);

  const totalCoupons = filteredCoupons.length;

  const activeCoupons = filteredCoupons.filter(
    (c) => c.isActive && new Date(c.validTill) > now
  ).length;

  const expiredCoupons = filteredCoupons.filter((c) => new Date(c.validTill) < now).length;

  const topUsed = useMemo(() => {
    return [...filteredCoupons].sort((a, b) => (b.usedCount || 0) - (a.usedCount || 0)).slice(0, 5);
  }, [filteredCoupons]);

  const badge = (text, cls) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${cls}`}>{text}</span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="mx-auto px-5 sm:px-8 py-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-500 text-white shadow-lg shadow-orange-200/40">
              <TicketPercent size={34} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Coupon Usage Reports</h1>
              <p className="text-sm sm:text-base text-gray-500">Track how your coupons are performing.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* FILTERS */}
            <div className="flex gap-2 flex-wrap justify-end">
              <select
                className="input !py-2 !px-3 !rounded-xl !text-sm"
                value={filters.visibility}
                onChange={(e) => setFilters((p) => ({ ...p, visibility: e.target.value }))}
              >
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>

              <select
                className="input !py-2 !px-3 !rounded-xl !text-sm"
                value={filters.type}
                onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="general">General</option>
                <option value="influencer">Influencer</option>
                <option value="system">System</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              Updated: <span className="font-medium text-gray-700">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm hover:shadow-md transition p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <TrendingUp className="text-blue-600" size={26} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Coupons</p>
                <h2 className="text-2xl font-semibold text-gray-900">{loading ? "…" : totalCoupons}</h2>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm hover:shadow-md transition p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle className="text-green-600" size={26} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Coupons</p>
                <h2 className="text-2xl font-semibold text-gray-900">{loading ? "…" : activeCoupons}</h2>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm hover:shadow-md transition p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <AlertTriangle className="text-red-600" size={26} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expired Coupons</p>
                <h2 className="text-2xl font-semibold text-gray-900">{loading ? "…" : expiredCoupons}</h2>
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
            <div className="text-center py-12 text-gray-500">No coupon usage found yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 bg-gray-50/60">
                    <th className="py-4 px-4 font-medium">Code</th>
                    <th className="py-4 px-4 font-medium">Type</th>
                    <th className="py-4 px-4 font-medium">Visibility</th>
                    <th className="py-4 px-4 font-medium">Target</th>
                    <th className="py-4 px-4 font-medium">Discount</th>
                    <th className="py-4 px-4 font-medium">Used</th>
                    <th className="py-4 px-4 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {topUsed.map((c) => {
                    const expired = new Date(c.validTill) < now;
                    const targeted = !!(c.targetEmail || c.targetPhone);

                    return (
                      <tr
                        key={c._id}
                        className="hover:bg-gray-50/60 transition border-b border-gray-100/60 last:border-0"
                      >
                        <td className="py-4 px-4 font-semibold text-gray-900">{c.code}</td>
                        <td className="py-4 px-4 capitalize text-gray-600">{c.type}</td>

                        <td className="py-4 px-4">
                          {c.visibility === "private"
                            ? badge("Private", "bg-gray-200 text-gray-800")
                            : badge("Public", "bg-blue-50 text-blue-700")}
                        </td>

                        <td className="py-4 px-4">
                          {targeted ? badge("Targeted", "bg-yellow-50 text-yellow-800") : badge("Open", "bg-gray-50 text-gray-600")}
                        </td>

                        <td className="py-4 px-4 text-gray-800">
                          {c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        </td>

                        <td className="py-4 px-4 text-gray-700">{c.usedCount || 0}</td>

                        <td className="py-4 px-4">
                          {expired
                            ? badge("Expired", "bg-red-50 text-red-700")
                            : badge("Active", "bg-green-50 text-green-700")}
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
