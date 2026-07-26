"use client";

import { useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  Loader2,
  Percent,
  TicketPercent,
  WalletCards,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-60";

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export default function OrderPayableAdjustmentCard({
  order,
  onRefresh,
}) {
  const {
    applyCouponAfterOrderPlaced,
    adjustOrderFinalPayable,
  } = useOrderStore();

  const [couponCode, setCouponCode] = useState("");
  const [additionalDiscount, setAdditionalDiscount] =
    useState("");
  const [finalPayable, setFinalPayable] = useState("");

  const [couponLoading, setCouponLoading] =
    useState(false);
  const [discountLoading, setDiscountLoading] =
    useState(false);
  const [payableLoading, setPayableLoading] =
    useState(false);
  const [removeCouponLoading, setRemoveCouponLoading] =
    useState(false);

  const orderId = order?._id;

  const paymentMethod = String(
    order?.paymentMethod || "",
  ).toLowerCase();

  const paymentStatus = String(
    order?.paymentStatus || "",
  ).toLowerCase();

  const fulfillmentStatus = String(
    order?.fulfillmentStatus || "",
  ).toLowerCase();

  const blockedStatuses = [
    "shipped",
    "delivered",
    "cancelled",
    "rto",
    "returned",
  ];

  const isPaidOnlineOrder =
    paymentMethod === "razorpay" &&
    paymentStatus === "paid";

  const isBlocked =
    blockedStatuses.includes(fulfillmentStatus) ||
    paymentMethod === "exchange" ||
    isPaidOnlineOrder;

  const blockedReason = useMemo(() => {
    if (paymentMethod === "exchange") {
      return "Exchange orders cannot be adjusted.";
    }

    if (isPaidOnlineOrder) {
      return "Paid Razorpay orders need a partial refund instead of payable adjustment.";
    }

    if (blockedStatuses.includes(fulfillmentStatus)) {
      return `This order is already ${fulfillmentStatus.replace(
        /_/g,
        " ",
      )}.`;
    }

    return "";
  }, [
    paymentMethod,
    fulfillmentStatus,
    isPaidOnlineOrder,
  ]);

  const refreshOrder = async () => {
    if (typeof onRefresh === "function") {
      await onRefresh();
    }
  };

  const handleApplyCoupon = async () => {
    if (!orderId) return;

    const code = String(couponCode || "")
      .trim()
      .toUpperCase();

    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }

    setCouponLoading(true);

    try {
      await applyCouponAfterOrderPlaced(orderId, code);
      toast.success("Coupon applied successfully");
      setCouponCode("");
      await refreshOrder();
    } catch (error) {
      toast.error(
        error?.message || "Failed to apply coupon",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleAdditionalDiscount = async () => {
    if (!orderId) return;

    const amount = Number(additionalDiscount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid discount amount");
      return;
    }

    setDiscountLoading(true);

    try {
      await adjustOrderFinalPayable(orderId, {
        additionalDiscount: amount,
      });

      toast.success(
        `Additional ${money(amount)} discount added`,
      );

      setAdditionalDiscount("");
      await refreshOrder();
    } catch (error) {
      toast.error(
        error?.message || "Failed to add discount",
      );
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleSetFinalPayable = async () => {
    if (!orderId) return;

    const amount = Number(finalPayable);

    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid final payable amount");
      return;
    }

    setPayableLoading(true);

    try {
      await adjustOrderFinalPayable(orderId, {
        finalPayable: amount,
      });

      toast.success(
        `Final payable updated to ${money(amount)}`,
      );

      setFinalPayable("");
      await refreshOrder();
    } catch (error) {
      toast.error(
        error?.message ||
          "Failed to update final payable",
      );
    } finally {
      setPayableLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!orderId || !order?.coupon?.code) return;

    const confirmed = window.confirm(
      `Remove coupon ${order.coupon.code} from this order?`,
    );

    if (!confirmed) return;

    setRemoveCouponLoading(true);

    try {
      /*
       * Remove the existing coupon discount from total discount,
       * while preserving any other discount already present.
       */
      const currentDiscount = Number(
        order?.discount || 0,
      );

      const couponDiscount = Number(
        order?.coupon?.discount || 0,
      );

      const discountWithoutCoupon = Math.max(
        0,
        currentDiscount - couponDiscount,
      );

      await adjustOrderFinalPayable(orderId, {
        discountAmount: discountWithoutCoupon,
        removeCoupon: true,
      });

      toast.success("Coupon removed successfully");
      await refreshOrder();
    } catch (error) {
      toast.error(
        error?.message || "Failed to remove coupon",
      );
    } finally {
      setRemoveCouponLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <BadgeIndianRupee size={18} />
            Coupon & Payable Adjustment
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Apply a coupon or manually adjust the amount
            payable before dispatch.
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 px-4 py-2 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Final Payable
          </p>

          <p className="text-lg font-bold text-gray-950">
            {money(order?.finalPayable)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-medium uppercase text-gray-500">
            Subtotal
          </p>
          <p className="mt-1 font-semibold text-gray-900">
            {money(order?.subtotal)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-medium uppercase text-gray-500">
            Total Amount
          </p>
          <p className="mt-1 font-semibold text-gray-900">
            {money(order?.totalAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-medium uppercase text-gray-500">
            Total Discount
          </p>
          <p className="mt-1 font-semibold text-green-700">
            -{money(order?.discount)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-medium uppercase text-gray-500">
            Wallet Used
          </p>
          <p className="mt-1 font-semibold text-gray-900">
            {money(
              order?.walletCredit?.amount ||
                order?.paymentBreakdown?.walletAmount,
            )}
          </p>
        </div>
      </div>

      {order?.coupon?.code && (
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
              <TicketPercent size={17} />
              {order.coupon.code}
            </p>

            <p className="mt-1 text-xs text-green-700">
              Coupon discount:{" "}
              {money(order.coupon.discount)}
            </p>
          </div>

          <button
            type="button"
            disabled={
              isBlocked || removeCouponLoading
            }
            onClick={handleRemoveCoupon}
            className={`${buttonClass} border border-red-200 bg-white text-red-600 hover:bg-red-50`}
          >
            {removeCouponLoading && (
              <Loader2
                size={15}
                className="animate-spin"
              />
            )}
            Remove Coupon
          </button>
        </div>
      )}

      {isBlocked && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {blockedReason}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <TicketPercent size={15} />
            Apply Coupon
          </label>

          <input
            value={couponCode}
            disabled={isBlocked || couponLoading}
            onChange={(event) =>
              setCouponCode(
                event.target.value.toUpperCase(),
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleApplyCoupon();
              }
            }}
            placeholder="WELCOME10"
            className={`${inputClass} mt-2 uppercase`}
          />

          <button
            type="button"
            disabled={isBlocked || couponLoading}
            onClick={handleApplyCoupon}
            className={`${buttonClass} mt-3 w-full bg-black text-white hover:opacity-90`}
          >
            {couponLoading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <TicketPercent size={16} />
            )}

            Apply Coupon
          </button>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Percent size={15} />
            Additional Discount
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={additionalDiscount}
            disabled={isBlocked || discountLoading}
            onChange={(event) =>
              setAdditionalDiscount(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAdditionalDiscount();
              }
            }}
            placeholder="e.g. 200"
            className={`${inputClass} mt-2`}
          />

          <button
            type="button"
            disabled={isBlocked || discountLoading}
            onClick={handleAdditionalDiscount}
            className={`${buttonClass} mt-3 w-full border border-gray-200 bg-white text-black hover:bg-gray-50`}
          >
            {discountLoading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Percent size={16} />
            )}

            Add Discount
          </button>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <WalletCards size={15} />
            Set Final Payable
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={finalPayable}
            disabled={isBlocked || payableLoading}
            onChange={(event) =>
              setFinalPayable(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSetFinalPayable();
              }
            }}
            placeholder={String(
              Number(order?.finalPayable || 0),
            )}
            className={`${inputClass} mt-2`}
          />

          <button
            type="button"
            disabled={isBlocked || payableLoading}
            onClick={handleSetFinalPayable}
            className={`${buttonClass} mt-3 w-full border border-gray-200 bg-white text-black hover:bg-gray-50`}
          >
            {payableLoading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <WalletCards size={16} />
            )}

            Update Payable
          </button>
        </div>
      </div>
    </div>
  );
}