"use client";

import { useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

// ✅ UPDATED STATUS LIST (as per new enum)
const STATUS_OPTIONS = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },

  { value: "return_requested", label: "Return Requested" },
  { value: "exchange_requested", label: "Exchange Requested" },

  { value: "returned", label: "Returned" },
  { value: "rto", label: "RTO" },
  { value: "cancelled", label: "Cancelled" },
];

// ✅ STATUS BADGE COLORS
const statusStyle = (status) => {
  switch (status) {
    case "processing":
      return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200";
    case "packed":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
    case "picked":
      return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200";
    case "shipped":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "out_for_delivery":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
    case "delivered":
      return "bg-green-50 text-green-700 ring-1 ring-green-200";

    case "return_requested":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    case "exchange_requested":
      return "bg-pink-50 text-pink-700 ring-1 ring-pink-200";

    case "returned":
      return "bg-orange-100 text-orange-800 ring-1 ring-orange-200";
    case "rto":
      return "bg-gray-200 text-gray-800 ring-1 ring-gray-300";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";

    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  }
};

export default function OrderStatusDropdown({ orderId, currentStatus, onUpdated }) {
  const { updateOrderStatus } = useOrderStore();

  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(currentStatus);

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    setValue(newStatus);

    try {
      setLoading(true);

      const payload =
        newStatus === "cancelled"
          ? {
              fulfillmentStatus: "cancelled",
              reason: "cancelled_by_admin",
              cancelledBy: "admin",
              adminRemarks: "cancelled_by_admin",
              customerMessage: "",
            }
          : { fulfillmentStatus: newStatus };

      const updatedOrder = await updateOrderStatus(orderId, payload);

      if (onUpdated) onUpdated(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to update status");
      setValue(currentStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Badge */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-2 ${statusStyle(
          value
        )}`}
      >
        {String(value || "").replace(/_/g, " ")}

        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ChevronDown size={14} className="opacity-60" />
        )}
      </div>

      {/* Invisible Select */}
      <select
        value={value}
        disabled={loading}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
