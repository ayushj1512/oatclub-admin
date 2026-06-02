"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageSearch, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminReviewStore } from "@/store/adminReviewStore";
import ReviewsManagePage from "../manage/page";

export default function OrderReviewsPage() {
  const router = useRouter();
  const { setQuery, fetchAdminReviews } = useAdminReviewStore();
  const [orderNumber, setOrderNumber] = useState("");

  const searchOrder = async (e) => {
    e?.preventDefault?.();

    const num = orderNumber.trim().toUpperCase();
    if (!num) return toast.error("Enter order number");

    setQuery({ orderNumber: num, page: 1 });
    await fetchAdminReviews({ orderNumber: num, page: 1 });

    toast.success("Order reviews loaded");
  };

  return (
    <div>
      <div className="bg-gray-50 px-3 pt-6 sm:px-6 md:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/reviews")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
              </button>

              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <PackageSearch size={18} />
                  Order Reviews
                </div>
                <div className="text-xs text-gray-500">
                  Search reviews by order number
                </div>
              </div>
            </div>

            <form onSubmit={searchOrder} className="flex gap-2">
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="OATCLUB-000123"
                className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
              />

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700"
              >
                <Search size={16} />
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      <ReviewsManagePage />
    </div>
  );
}