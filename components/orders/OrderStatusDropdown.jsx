"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

/**
 * ✅ UPDATED fulfillmentStatus (forward + terminal only)
 */
const STATUS_OPTIONS = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },

  { value: "exchanged", label: "Exchanged" }, // ✅ NEW TERMINAL

  { value: "rto", label: "RTO" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * ✅ Badge colors
 */
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

    case "exchanged":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

    case "rto":
      return "bg-gray-200 text-gray-800 ring-1 ring-gray-300";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";

    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  }
};

const pretty = (v) => String(v || "").replace(/_/g, " ").trim();

export default function OrderStatusDropdown({
  orderId,
  currentStatus,
  onUpdated,
}) {
  const { updateOrderStatus } = useOrderStore();
  const [loading, setLoading] = useState(false);

  const safeInitial = useMemo(() => {
    const v = String(currentStatus || "processing").trim();
    const exists = STATUS_OPTIONS.some((s) => s.value === v);
    return exists ? v : "processing";
  }, [currentStatus]);

  const [value, setValue] = useState(safeInitial);

  useEffect(() => {
    setValue(safeInitial);
  }, [safeInitial]);

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    setValue(newStatus);

    try {
      setLoading(true);

      let payload = { fulfillmentStatus: newStatus };

      // ✅ Cancel logic
      if (newStatus === "cancelled") {
        payload = {
          fulfillmentStatus: "cancelled",
          reason: "cancelled_by_admin",
          cancelledBy: "admin",
          adminRemarks: "cancelled_by_admin",
          customerMessage: "",
        };
      }

      // ✅ Exchanged = final state (no payment mutation here)
      if (newStatus === "exchanged") {
        payload = { fulfillmentStatus: "exchanged" };
      }

      const updatedOrder = await updateOrderStatus(orderId, payload);
      onUpdated?.(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to update status");
      setValue(safeInitial);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-2 ${statusStyle(
          value
        )}`}
      >
        {pretty(value)}
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ChevronDown size={14} className="opacity-60" />
        )}
      </div>

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