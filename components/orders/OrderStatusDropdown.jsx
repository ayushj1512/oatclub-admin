// components/orders/OrderStatusDropdown.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { useCancelOrderFlow } from "@/hooks/useCancelOrderFlow";
import CancelOrderModal from "@/components/orders/CancelOrderModal";

const STATUS_OPTIONS = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivery_failed", label: "Delivery Failed" },
  { value: "delivered", label: "Delivered" },

  { value: "return_requested", label: "Return Requested" },
  { value: "exchange_requested", label: "Exchange Requested" },
  { value: "pickup_initiated", label: "Pickup Initiated" },
  { value: "return_pickup_completed", label: "Pickup Completed" },

  { value: "returned", label: "Returned" },
  { value: "refunded", label: "Refunded" },
  { value: "exchanged", label: "Exchanged" },

  { value: "rto", label: "RTO" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

const STATUS_STYLE = {
  processing: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  packed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  picked: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  shipped: "bg-blue-50 text-blue-700 ring-blue-200",
  out_for_delivery: "bg-purple-50 text-purple-700 ring-purple-200",
  delivery_failed: "bg-rose-50 text-rose-700 ring-rose-200",
  delivered: "bg-green-50 text-green-700 ring-green-200",

  return_requested: "bg-orange-50 text-orange-700 ring-orange-200",
  exchange_requested: "bg-pink-50 text-pink-700 ring-pink-200",
  pickup_initiated: "bg-amber-50 text-amber-700 ring-amber-200",
  return_pickup_completed: "bg-teal-50 text-teal-700 ring-teal-200",
  returned: "bg-orange-100 text-orange-800 ring-orange-200",
  refunded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  exchanged: "bg-pink-50 text-pink-700 ring-pink-200",

  rto: "bg-gray-200 text-gray-800 ring-gray-300",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-300",
};

const statusStyle = (status) =>
  `${STATUS_STYLE[status] || "bg-gray-100 text-gray-700 ring-gray-200"} ring-1`;

export default function OrderStatusDropdown({
  orderId,
  currentStatus,
  order,
  onUpdated,
}) {
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);

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
    [currentStatus],
  );

  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(normalizedPropStatus);

  const lastAppliedRef = useRef({
    orderId: null,
    status: null,
  });

  useEffect(() => {
    if (lastAppliedRef.current.orderId !== orderId) {
      lastAppliedRef.current = {
        orderId,
        status: normalizedPropStatus,
      };

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
      return {
        fulfillmentStatus: "refunded",
        paymentStatus: "refunded",
      };
    }

    if (newStatus === "failed") {
      return {
        fulfillmentStatus: "failed",
        paymentStatus: "failed",
      };
    }

    return {
      fulfillmentStatus: newStatus,
    };
  }, []);

  const handleChange = async (e) => {
    const newStatus = String(e.target.value || "").toLowerCase();

    if (!newStatus || newStatus === value) return;

    if (newStatus === "cancelled") {
      openCancelModal(
        order || {
          _id: orderId,
          orderNumber: "",
          fulfillmentStatus: value,
        },
      );

      return;
    }

    setValue(newStatus);
    setLoading(true);

    try {
      const updatedOrder = await updateOrderStatus(
        orderId,
        buildPayload(newStatus),
      );

      const serverStatus = String(
        updatedOrder?.fulfillmentStatus || newStatus,
      ).toLowerCase();

      lastAppliedRef.current = {
        orderId,
        status: serverStatus,
      };

      setValue(serverStatus);
      onUpdated?.(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to update status");

      lastAppliedRef.current = {
        orderId,
        status: normalizedPropStatus,
      };

      setValue(normalizedPropStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async (reason = "") => {
    try {
      const updatedOrder = await confirmCancel(reason);

      lastAppliedRef.current = {
        orderId,
        status: "cancelled",
      };

      setValue("cancelled");
      onUpdated?.(updatedOrder);
    } catch (err) {
      alert(err?.message || "Failed to cancel order");

      lastAppliedRef.current = {
        orderId,
        status: normalizedPropStatus,
      };

      setValue(normalizedPropStatus);
    }
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
            value,
          )}`}
        >
          {value.replaceAll("_", " ")}

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
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
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
