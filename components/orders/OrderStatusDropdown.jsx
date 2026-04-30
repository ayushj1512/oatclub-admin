// components/orders/OrderStatusDropdown.jsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { useCancelOrderFlow } from "@/hooks/useCancelOrderFlow";
import CancelOrderModal from "@/components/orders/CancelOrderModal";

const STATUS_OPTIONS = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "return_requested", label: "Return Requested" },
  { value: "exchange_requested", label: "Exchange Requested" },
  { value: "pickup_initiated", label: "Pickup Initiated" },
  { value: "returned", label: "Returned" },
  { value: "refunded", label: "Refunded" },
  { value: "rto", label: "RTO" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

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
    case "pickup_initiated":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "returned":
      return "bg-orange-100 text-orange-800 ring-1 ring-orange-200";
    case "refunded":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "rto":
      return "bg-gray-200 text-gray-800 ring-1 ring-gray-300";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "failed":
      return "bg-rose-100 text-rose-800 ring-1 ring-rose-300";
    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  }
};

export default function OrderStatusDropdown({
  orderId,
  currentStatus,
  order,
  onUpdated,
}) {
  const { updateOrderStatus } = useOrderStore();

  const {
    cancelModalOpen,
    cancelTargetOrder,
    cancelLoading,
    openCancelModal,
    closeCancelModal,
    confirmCancel,
  } = useCancelOrderFlow();

  const normalizedPropStatus = useMemo(
    () => String(currentStatus || "processing").toLowerCase(),
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

    if (loading || cancelLoading) return;

    if (lastAppliedRef.current.status !== normalizedPropStatus) {
      lastAppliedRef.current.status = normalizedPropStatus;
      setValue(normalizedPropStatus);
    }
  }, [orderId, normalizedPropStatus, loading, cancelLoading]);

  const buildPayload = useCallback((newStatus) => {
    if (newStatus === "refunded") {
      return { fulfillmentStatus: "refunded", paymentStatus: "refunded" };
    }

    if (newStatus === "failed") {
      return { fulfillmentStatus: "failed", paymentStatus: "failed" };
    }

    return { fulfillmentStatus: newStatus };
  }, []);

  const handleChange = async (e) => {
    const newStatus = String(e.target.value || "").toLowerCase();
    if (newStatus === value) return;

    if (newStatus === "cancelled") {
      const modalOrder = order || {
        _id: orderId,
        orderNumber: "",
        fulfillmentStatus: value,
      };

      openCancelModal(modalOrder);
      return;
    }

    setValue(newStatus);

    try {
      setLoading(true);

      const updatedOrder = await updateOrderStatus(
        orderId,
        buildPayload(newStatus)
      );

      const serverStatus = String(
        updatedOrder?.order?.fulfillmentStatus ??
          updatedOrder?.fulfillmentStatus ??
          newStatus
      ).toLowerCase();

      lastAppliedRef.current = { orderId, status: serverStatus };
      setValue(serverStatus);

      onUpdated?.(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to update status");
      lastAppliedRef.current = { orderId, status: normalizedPropStatus };
      setValue(normalizedPropStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async (reason = "") => {
    try {
      const updatedOrder = await confirmCancel(reason);

      lastAppliedRef.current = { orderId, status: "cancelled" };
      setValue("cancelled");

      onUpdated?.(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to cancel order");
      lastAppliedRef.current = { orderId, status: normalizedPropStatus };
      setValue(normalizedPropStatus);
    }
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
            value
          )}`}
        >
          {String(value || "").replace(/_/g, " ")}
          {loading || cancelLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ChevronDown size={14} className="opacity-60" />
          )}
        </div>

        <select
          value={value}
          disabled={loading || cancelLoading}
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <CancelOrderModal
        open={cancelModalOpen}
        order={cancelTargetOrder}
        loading={cancelLoading}
        onClose={closeCancelModal}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}