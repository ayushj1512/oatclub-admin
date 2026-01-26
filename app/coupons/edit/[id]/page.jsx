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
    visibility: "public", // ✅ NEW
    targetEmail: "", // ✅ NEW
    targetPhone: "", // ✅ NEW

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

    const hydrate = async () => {
      const couponFromStore = getCouponById(id);

      if (couponFromStore) {
        setForm({
          ...couponFromStore,
          visibility: couponFromStore.visibility || "public",
          targetEmail: couponFromStore.targetEmail || "",
          targetPhone: couponFromStore.targetPhone || "",
          validFrom: formatDate(couponFromStore.validFrom),
          validTill: formatDate(couponFromStore.validTill),
        });
        return;
      }

      await fetchCoupons();
      const afterFetch = getCouponById(id);

      if (afterFetch) {
        setForm({
          ...afterFetch,
          visibility: afterFetch.visibility || "public",
          targetEmail: afterFetch.targetEmail || "",
          targetPhone: afterFetch.targetPhone || "",
          validFrom: formatDate(afterFetch.validFrom),
          validTill: formatDate(afterFetch.validTill),
        });
      }
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    let nextValue = type === "checkbox" ? checked : value;

    // ✅ Auto uppercase code
    if (name === "code") nextValue = String(nextValue).toUpperCase();

    // ✅ Digits only for phone (UX); backend/store will normalize too
    if (name === "targetPhone") nextValue = String(nextValue).replace(/\D/g, "");

    setForm((prev) => ({ ...prev, [name]: nextValue }));

    if (error || success) clearMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      // ✅ empty strings -> null for optional fields
      const payload = {
        ...form,
        targetEmail: form.targetEmail?.trim() ? form.targetEmail.trim() : null,
        targetPhone: form.targetPhone?.trim() ? form.targetPhone.trim() : null,
      };

      await updateCoupon(id, payload);

      setTimeout(() => {
        router.push("/coupons/manage");
      }, 1200);
    } catch (err) {
      console.log("Update error:", err?.message);
    }
  };

  const isTargeted = Boolean(form.targetEmail?.trim() || form.targetPhone?.trim());

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
        <p className="text-gray-500 mt-2">Update coupon rules, discount settings and validity.</p>

        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* FORM CARD */}
      <div className="mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COUPON CODE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Coupon Code</label>
            <input
              type="text"
              name="code"
              value={form.code || ""}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          {/* TYPE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Coupon Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="input">
              <option value="general">General</option>
              <option value="influencer">Influencer</option>
              <option value="system">System</option>
              <option value="company">Company</option>
            </select>
          </div>

          {/* ✅ VISIBILITY */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Visibility</label>
            <select name="visibility" value={form.visibility} onChange={handleChange} className="input">
              <option value="public">Public (visible to all)</option>
              <option value="private">Private (hidden, code-only)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Private coupons won’t appear in public listings; they can still be applied using the code.
            </p>
          </div>

          {/* ✅ TARGET EMAIL */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Target Email (optional)</label>
            <input
              type="email"
              name="targetEmail"
              value={form.targetEmail || ""}
              onChange={handleChange}
              placeholder="e.g., user@gmail.com"
              className="input"
            />
          </div>

          {/* ✅ TARGET PHONE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Target Phone (optional)</label>
            <input
              type="text"
              name="targetPhone"
              value={form.targetPhone || ""}
              onChange={handleChange}
              placeholder="e.g., 919876543210"
              className="input"
              inputMode="numeric"
            />
            <p className="text-xs text-gray-500 mt-1">Digits only (country code included if needed).</p>
          </div>

          {/* DISCOUNT TYPE */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Discount Type</label>
            <select name="discountType" value={form.discountType} onChange={handleChange} className="input">
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
            <input type="number" name="minPurchase" value={form.minPurchase} onChange={handleChange} className="input" />
          </div>

          {/* MAX DISCOUNT */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Max Discount (₹)</label>
            <input type="number" name="maxDiscount" value={form.maxDiscount} onChange={handleChange} className="input" />
          </div>

          {/* VALID FROM */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Valid From</label>
            <input type="date" name="validFrom" value={form.validFrom} onChange={handleChange} className="input" />
          </div>

          {/* VALID TILL */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Valid Till</label>
            <input type="date" name="validTill" value={form.validTill} onChange={handleChange} className="input" required />
          </div>

          {/* USAGE LIMIT */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Total Usage Limit</label>
            <input type="number" name="usageLimit" value={form.usageLimit} onChange={handleChange} className="input" />
          </div>

          {/* PER CUSTOMER */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Usage Limit Per Customer</label>
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
            <input type="checkbox" name="isActive" checked={!!form.isActive} onChange={handleChange} />
            <label className="text-sm font-medium">Coupon Active</label>

            {isTargeted && (
              <span className="ml-3 text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                Targeted coupon
              </span>
            )}
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
