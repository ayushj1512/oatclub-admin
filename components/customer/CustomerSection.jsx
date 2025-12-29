"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCustomerStore } from "@/store/customerStore";

const safe = (v) => String(v ?? "").trim();

function InfoItem({ label, value }) {
  return (
    <p className="flex justify-between text-sm text-gray-700 gap-3">
      <span className="font-medium text-gray-900 shrink-0">{label}:</span>
      <span className="text-right break-all">{value || "—"}</span>
    </p>
  );
}

export default function CustomerSection({ customerId }) {
  const router = useRouter();

  const {
    customer,
    loadingSingle,
    error,
    fetchCustomerById,
    clearCustomer,
  } = useCustomerStore();

  useEffect(() => {
    if (customerId) fetchCustomerById(customerId);
    return () => clearCustomer();
  }, [customerId]);

  const card =
    "bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all";

  /* ---------------- LOADING ---------------- */
  if (loadingSingle) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-gray-600" size={32} />
      </div>
    );
  }

  /* ---------------- ERROR ---------------- */
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          onClick={() => router.push("/customers")}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-10">
      {/* BACK */}
      <button
        onClick={() => router.push("/customers")}
        className="text-gray-600 hover:text-black transition flex items-center gap-2"
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* HEADER */}
      <div className={`${card} flex items-center gap-6`}>
        <img
          src={customer.profileImage || "/profile/user-avatar.jpg"}
          className="w-24 h-24 rounded-full border object-cover"
          alt="Customer"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold truncate">
            {customer.name || "Unnamed User"}
          </h1>
          <p className="text-gray-600 break-all">{customer.email}</p>
          <p className="text-xs mt-2 px-2 py-1 bg-gray-100 inline-block rounded text-gray-500 break-all">
            UID: {customer.firebaseUID}
          </p>
        </div>
      </div>

      {/* INFO GRID */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* BASIC INFO */}
        <div className={card}>
          <h2 className="text-xl font-semibold mb-4">
            Customer Information
          </h2>
          <InfoItem label="Phone" value={customer.phone} />
          <InfoItem label="Gender" value={customer.gender} />
          <InfoItem label="Age Group" value={customer.ageGroup} />
          <InfoItem
            label="Joined"
            value={
              customer.joinedAt
                ? new Date(customer.joinedAt).toLocaleDateString()
                : "—"
            }
          />
        </div>

        {/* LOCATION */}
        <div className={card}>
          <h2 className="text-xl font-semibold mb-4">Location</h2>
          <InfoItem label="Country" value={customer.country} />
          <InfoItem label="State" value={customer.state} />
          <InfoItem label="City" value={customer.city} />
        </div>

        {/* ANALYTICS */}
        <div className={card}>
          <h2 className="text-xl font-semibold mb-4">Analytics</h2>
          <InfoItem
            label="Total Orders"
            value={customer?.analytics?.totalOrders}
          />
          <InfoItem
            label="Total Spend"
            value={
              customer?.analytics?.totalSpend != null
                ? `₹${customer.analytics.totalSpend}`
                : "—"
            }
          />
          <InfoItem
            label="Wishlist Count"
            value={customer?.analytics?.wishlistCount}
          />
        </div>

        {/* PREFERENCES */}
        <div className={card}>
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>
          <p className="font-medium text-gray-700 mb-2">
            Favorite Brands:
          </p>
          {customer?.preferences?.favoriteBrands?.length ? (
            <ul className="list-disc ml-6 text-gray-700">
              {customer.preferences.favoriteBrands.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No favorite brands.</p>
          )}
        </div>
      </div>
    </div>
  );
}
