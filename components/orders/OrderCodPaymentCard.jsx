"use client";

import { useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";

export default function OrderCodPaymentCard({
  order,
  onRefresh,
}) {
  const markCodOrderAsPaid = useOrderStore(
    (state) => state.markCodOrderAsPaid,
  );

  const [loading, setLoading] = useState(false);

  const paymentMethod = String(
    order?.paymentMethod || "",
  )
    .trim()
    .toLowerCase();

  const paymentStatus = String(
    order?.paymentStatus || "",
  )
    .trim()
    .toLowerCase();

  const isCod = paymentMethod === "cod";
  const isManualPrepaid =
    paymentMethod === "manual_prepaid";

  const isPaid = paymentStatus === "paid";
  const isPending = paymentStatus === "pending";

  const isEligible =
    isCod || isManualPrepaid;

  const hasShiprocketShipment = Boolean(
    order?.shipment?.shiprocket?.orderId ||
      order?.shipment?.shiprocket?.shipmentId ||
      order?.shipment?.shiprocket?.awb,
  );

  if (!isEligible) return null;

  const handleMarkPaid = async () => {
    if (
      !order?._id ||
      loading ||
      isPaid ||
      !isCod ||
      !isPending
    ) {
      return;
    }

    setLoading(true);

    try {
      await markCodOrderAsPaid(order._id);

      toast.success(
        "Order marked as manually prepaid.",
      );

      await onRefresh?.();
    } catch (error) {
      toast.error(
        error?.message ||
          "Unable to mark payment as received.",
      );
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodLabel = isManualPrepaid
    ? "Manual Prepaid"
    : "COD";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <BadgeIndianRupee size={18} />
            COD Payment
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Confirm payment received and convert
            this order to manual prepaid.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            isPaid
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isPaid ? "Paid" : "Pending"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
        <div>
          <p className="text-gray-500">
            Payment Method
          </p>

          <p className="mt-1 font-semibold">
            {paymentMethodLabel}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            Amount Received
          </p>

          <p className="mt-1 font-semibold">
            ₹
            {Number(
              order?.finalPayable || 0,
            ).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {hasShiprocketShipment && isCod && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <TriangleAlert
            size={16}
            className="mt-0.5 shrink-0"
          />

          <p>
            This shipment is already created on
            Shiprocket as COD. Marking it paid only
            updates the local order; the existing
            Shiprocket shipment may still remain COD.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleMarkPaid}
        disabled={
          loading ||
          isPaid ||
          !isPending ||
          !isCod
        }
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {loading ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />
            Updating...
          </>
        ) : isPaid ? (
          <>
            <CheckCircle2 size={18} />
            Payment Received
          </>
        ) : (
          <>
            <BadgeIndianRupee size={18} />
            Mark Paid & Convert to Prepaid
          </>
        )}
      </button>
    </div>
  );
}
