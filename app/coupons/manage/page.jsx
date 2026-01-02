"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TicketPercent,
  Pencil,
  Trash2,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";

// ✅ STORE IMPORT
import { useCouponStore } from "@/store/couponStore";

export default function ManageCouponsPage() {
  const router = useRouter();

  // ✅ STORE STATE + ACTIONS
  const { coupons, loading, fetchCoupons, deleteCoupon } = useCouponStore();

  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      setDeletingId(id);

      // ✅ delete using store
      await deleteCoupon(id);

      // ✅ store already removes coupon from state
    } catch (error) {
      alert(error.message || "Error deleting coupon.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (coupon) => {
    const now = new Date();
    const expiry = new Date(coupon.validTill);

    if (!coupon.isActive)
      return <span className="badge bg-red-100 text-red-700">Inactive</span>;

    if (expiry < now)
      return <span className="badge bg-orange-100 text-orange-700">Expired</span>;

    return <span className="badge bg-green-100 text-green-700">Active</span>;
  };

  return (
   <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
  <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

    {/* HEADER */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200/40">
          <TicketPercent size={34} />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Manage Coupons
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            View, edit and delete all coupons.
          </p>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchCoupons}
        className="
          inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
          bg-gray-900 text-white font-medium shadow-md
          hover:shadow-lg transition active:scale-[0.99]
        "
      >
        <RefreshCcw size={16} /> Refresh
      </button>
    </div>

    {/* TABLE CARD */}
    <div className="rounded-2xl bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition overflow-hidden">
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-14 text-gray-500 flex flex-col items-center gap-3">
          <AlertTriangle size={34} className="text-gray-400" />
          No coupons found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50/60">
                <th className="py-4 px-4 font-medium">Code</th>
                <th className="py-4 px-4 font-medium">Type</th>
                <th className="py-4 px-4 font-medium">Discount</th>
                <th className="py-4 px-4 font-medium">Min Purchase</th>
                <th className="py-4 px-4 font-medium">Valid Till</th>
                <th className="py-4 px-4 font-medium">Used</th>
                <th className="py-4 px-4 font-medium">Status</th>
                <th className="py-4 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {coupons.map((coupon) => (
                <tr
                  key={coupon._id}
                  className="
                    hover:bg-gray-50/60 transition
                    border-b border-gray-100/60 last:border-0
                  "
                >
                  <td className="py-4 px-4 font-semibold text-gray-900">
                    {coupon.code}
                  </td>

                  <td className="py-4 px-4 capitalize text-gray-600">
                    {coupon.type}
                  </td>

                  <td className="py-4 px-4 text-gray-800">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : `₹${coupon.discountValue}`}
                  </td>

                  <td className="py-4 px-4 text-gray-700">
                    ₹{coupon.minPurchase}
                  </td>

                  <td className="py-4 px-4 text-gray-500">
                    {new Date(coupon.validTill).toLocaleDateString()}
                  </td>

                  <td className="py-4 px-4 text-gray-700">
                    {coupon.usedCount || 0}
                  </td>

                  <td className="py-4 px-4">{getStatusBadge(coupon)}</td>

                  <td className="py-4 px-4">
                    <div className="flex gap-2 justify-end">
                      {/* EDIT */}
                      <button
                        onClick={() => router.push(`/coupons/edit/${coupon._id}`)}
                        className="
                          p-2 rounded-xl bg-blue-50 text-blue-700
                          hover:bg-blue-100 transition
                        "
                      >
                        <Pencil size={16} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => handleDelete(coupon._id)}
                        disabled={deletingId === coupon._id}
                        className="
                          p-2 rounded-xl bg-red-50 text-red-700
                          hover:bg-red-100 transition disabled:opacity-60
                        "
                      >
                        {deletingId === coupon._id ? "..." : <Trash2 size={16} />}
                      </button>
                    </div>
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
