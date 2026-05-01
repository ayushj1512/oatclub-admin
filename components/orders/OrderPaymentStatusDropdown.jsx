"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refund_pending", label: "Refund Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "not_applicable", label: "Not Applicable" },
];

const paymentStatusStyle = (status) => {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 ring-1 ring-green-200";
    case "pending":
      return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200";
    case "failed":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "refund_pending":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    case "refunded":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "not_applicable":
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  }
};

const formatStatus = (status) => {
  if (status === "not_applicable") return "N/A";
  return String(status || "pending").replace(/_/g, " ");
};

export default function OrderPaymentStatusDropdown({
  orderId,
  currentStatus,
  onUpdated,
}) {
  const { updateOrderPaymentStatus } = useOrderStore();

  const normalizedPropStatus = useMemo(
    () => String(currentStatus || "pending").toLowerCase(),
    [currentStatus]
  );

  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(normalizedPropStatus);

  const lastAppliedRef = useRef({ orderId: null, status: null });

  useEffect(() => {
    if (lastAppliedRef.current.orderId !== orderId) {
      lastAppliedRef.current = { orderId, status: normalizedPropStatus };
      setValue(normalizedPropStatus);
      return;
    }

    if (loading) return;

    if (lastAppliedRef.current.status !== normalizedPropStatus) {
      lastAppliedRef.current.status = normalizedPropStatus;
      setValue(normalizedPropStatus);
    }
  }, [orderId, normalizedPropStatus, loading]);

  const handleChange = async (e) => {
    const newStatus = String(e.target.value || "").toLowerCase();
    if (!orderId || newStatus === value) return;

    setValue(newStatus);

    try {
      setLoading(true);

      const updatedOrder = await updateOrderPaymentStatus(orderId, newStatus);

      const serverStatus = String(
        updatedOrder?.order?.paymentStatus ??
          updatedOrder?.paymentStatus ??
          newStatus
      ).toLowerCase();

      lastAppliedRef.current = { orderId, status: serverStatus };
      setValue(serverStatus);

      onUpdated?.(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to update payment status");
      lastAppliedRef.current = { orderId, status: normalizedPropStatus };
      setValue(normalizedPropStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentStatusStyle(
          value
        )}`}
      >
        {formatStatus(value)}
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
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        {PAYMENT_STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}