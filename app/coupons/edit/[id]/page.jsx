"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TicketPercent, CheckCircle, ArrowLeft } from "lucide-react";
import { useCouponStore } from "@/store/couponStore";

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const {
    coupons,
    fetchCoupons,
    updateCoupon,
    getCouponById,
    loading,
    error,
    success,
    clearMessages,
  } = useCouponStore();

  const [form, setForm] = useState({
    code: "",
    type: "general",
    discountType: "percentage",
    discountValue: "",
    minPurchase: 0,
    maxDiscount: 0,
    validFrom: "",
    validTill: "",
    usageLimit: 0,
    usageLimitPerCustomer: 1,
    isActive: true,
  });

  // ✅ helper: convert date to YYYY-MM-DD for <input type="date">
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  // ✅ Load coupon on first render
  useEffect(() => {
    if (!id) return;

    const couponFromStore = getCouponById(id);

    if (couponFromStore) {
      setForm({
        ...couponFromStore,
        validFrom: formatDate(couponFromStore.validFrom),
        validTill: formatDate(couponFromStore.validTill),
      });
    } else {
      // ✅ if not in store, fetch all coupons & then set
      (async () => {
        await fetchCoupons();
        const afterFetch = getCouponById(id);
        if (afterFetch) {
          setForm({
            ...afterFetch,
            validFrom: formatDate(afterFetch.validFrom),
            validTill: formatDate(afterFetch.validTill),
          });
        }
      })();
    }
  }, [id]);

  // ✅ Auto uppercase code
  const handleChange = (e) => {
    let value = e.target.value;

    if (e.target.name === "code") {
      value = value.toUpperCase();
    }

    setForm({ ...form, [e.target.name]: value });

    if (error || success) clearMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      await updateCoupon(id, form);

      setTimeout(() => {
        router.push("/coupons/manage");
      }, 1200);
    } catch (err) {
      console.log("Update error:", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-10">
      {/* HEADER */}
      <div className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md">
            <TicketPercent size={42} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800">Edit Coupon</h1>
        <p className="text-gray-500 mt-2">
          Update coupon rules, discount settings and validity.
        </p>

        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* FORM CARD */}
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* COUPON CODE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Coupon Code</label>
            <input
              type="text"
              name="code"
              value={form.code}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          {/* TYPE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Coupon Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="input"
            >
              <option value="general">General</option>
              <option value="influencer">Influencer</option>
              <option value="system">System</option>
              <option value="company">Company</option>
            </select>
          </div>

          {/* DISCOUNT TYPE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Discount Type</label>
            <select
              name="discountType"
              value={form.discountType}
              onChange={handleChange}
              className="input"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>

          {/* DISCOUNT VALUE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Discount Value</label>
            <input
              type="number"
              name="discountValue"
              value={form.discountValue}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          {/* MIN PURCHASE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Minimum Purchase (₹)</label>
            <input
              type="number"
              name="minPurchase"
              value={form.minPurchase}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* MAX DISCOUNT */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Max Discount (₹)</label>
            <input
              type="number"
              name="maxDiscount"
              value={form.maxDiscount}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* VALID FROM */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Valid From</label>
            <input
              type="date"
              name="validFrom"
              value={form.validFrom}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* VALID TILL */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Valid Till</label>
            <input
              type="date"
              name="validTill"
              value={form.validTill}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          {/* USAGE LIMIT */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Total Usage Limit</label>
            <input
              type="number"
              name="usageLimit"
              value={form.usageLimit}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* PER CUSTOMER */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              Usage Limit Per Customer
            </label>
            <input
              type="number"
              name="usageLimitPerCustomer"
              value={form.usageLimitPerCustomer}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* ACTIVE? */}
          <div className="flex items-center gap-2 col-span-2">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            <label className="text-sm font-medium">Coupon Active</label>
          </div>

          {/* SUBMIT */}
          <div className="col-span-2 flex justify-center mt-4">
            <button
              type="submit"
              disabled={loading}
              className="
                bg-gradient-to-br from-blue-600 to-blue-500
                text-white px-10 py-3 rounded-xl shadow hover:shadow-md
                transition-all duration-300 font-medium
              "
            >
              {loading ? "Updating..." : "Update Coupon"}
            </button>
          </div>

          {/* MESSAGE */}
          {(success || error) && (
            <div
              className={`col-span-2 text-center text-sm mt-2 flex justify-center gap-2 ${
                error ? "text-red-600" : "text-green-700"
              }`}
            >
              <CheckCircle size={18} />
              {error || success}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
