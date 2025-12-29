"use client";

import { useEffect } from "react";
import { useAddressStore } from "@/store/addressStore";
import { MapPin, Star, Loader2, Trash2 } from "lucide-react";

export default function AddressSection({ firebaseUID, customerId }) {
  const {
    addresses,
    loading,
    error,
    fetchAddressesByFirebaseUID,
    deleteAddress,
  } = useAddressStore();

  useEffect(() => {
    if (firebaseUID) {
      fetchAddressesByFirebaseUID(firebaseUID);
    }
  }, [firebaseUID, fetchAddressesByFirebaseUID]);

  const card =
    "bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all";

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Addresses
        </h2>
      </div>

      {/* ERROR */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">
          {error}
        </p>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin h-4 w-4" />
          Loading addresses...
        </div>
      ) : addresses.length === 0 ? (
        <p className="text-gray-600">No addresses available.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition relative"
            >
              {/* DEFAULT BADGES */}
              <div className="absolute top-3 right-3 flex gap-1">
                {addr.isDefaultShipping && (
                  <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={12} /> Shipping
                  </span>
                )}
                {addr.isDefaultBilling && (
                  <span className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={12} /> Billing
                  </span>
                )}
              </div>

              <p className="font-semibold text-gray-900">
                {addr.fullName}
              </p>
              <p className="text-sm text-gray-700">{addr.phone}</p>

              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                {addr.addressLine1}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                {addr.landmark ? `, ${addr.landmark}` : ""}
                <br />
                {addr.city}, {addr.state} – {addr.postalCode}
                <br />
                {addr.country}
              </p>

              <p className="text-xs text-gray-500 mt-2 capitalize">
                Type: {addr.addressType}
              </p>

              {/* ACTIONS */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() =>
                    deleteAddress(addr._id, firebaseUID)
                  }
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
