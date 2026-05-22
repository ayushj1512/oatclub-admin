"use client";

import {
  BadgeIndianRupee,
  CreditCard,
  Banknote,
  ReceiptText,
  RefreshCcw,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

const money = (v, currency = "INR") => {
  const n = Number(v || 0);
  return `${currency === "INR" ? "₹" : currency + " "}${n.toLocaleString("en-IN")}`;
};

const pretty = (v) =>
  String(v || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const paymentModeLabel = (method) => {
  const m = String(method || "").toLowerCase();

  if (m === "cod") return "Cash on Delivery";
  if (m === "razorpay") return "Razorpay / Online";
  if (m === "exchange") return "Exchange Order";

  return pretty(method);
};

const statusStyle = (status) => {
  const s = String(status || "").toLowerCase();

  if (s === "paid")
    return "bg-green-50 text-green-700 ring-green-100";
  if (s === "pending" || s === "refund_pending")
    return "bg-yellow-50 text-yellow-800 ring-yellow-100";
  if (s === "failed")
    return "bg-red-50 text-red-700 ring-red-100";
  if (s === "refunded")
    return "bg-blue-50 text-blue-700 ring-blue-100";
  if (s === "not_applicable")
    return "bg-gray-100 text-gray-700 ring-gray-200";

  return "bg-gray-100 text-gray-700 ring-gray-200";
};

const InfoRow = ({ label, value, strong = false }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
    <span className="text-xs font-medium text-gray-500">{label}</span>
    <span
      className={`text-right text-sm ${
        strong ? "font-bold text-gray-950" : "font-semibold text-gray-800"
      }`}
    >
      {value || "-"}
    </span>
  </div>
);

export default function OrderPaymentDetails({ order }) {
  if (!order) return null;

  const currency = order.currency || order.razorpay?.currency || "INR";
  const method = order.paymentMethod || "";
  const paymentStatus = order.paymentStatus || "";
  const razorpay = order.razorpay || {};
  const refund = order.refundSummary || {};

  const isCOD = String(method).toLowerCase() === "cod";
  const isRazorpay = String(method).toLowerCase() === "razorpay";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-950">
            <BadgeIndianRupee size={18} />
            Payment Details
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Complete payment mode, amount, status and refund overview.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
            {isCOD ? <Banknote size={14} /> : <CreditCard size={14} />}
            {paymentModeLabel(method)}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusStyle(
              paymentStatus
            )}`}
          >
            {paymentStatus === "paid" ? (
              <CheckCircle2 size={14} />
            ) : paymentStatus === "failed" ? (
              <XCircle size={14} />
            ) : (
              <Clock size={14} />
            )}
            {pretty(paymentStatus)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoRow label="Subtotal" value={money(order.subtotal, currency)} />
        <InfoRow label="Discount" value={money(order.discount, currency)} />
        <InfoRow label="Shipping Fee" value={money(order.shippingFee, currency)} />
        <InfoRow label="Tax" value={money(order.tax, currency)} />
      </div>

      <div className="mt-4 rounded-2xl bg-gray-950 p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-gray-300">Final Payable</span>
          <span className="text-xl font-bold">
            {money(order.finalPayable, currency)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Payment Mode" value={paymentModeLabel(method)} />
        <InfoRow label="Payment Status" value={pretty(paymentStatus)} />
        <InfoRow label="Total Amount" value={money(order.totalAmount, currency)} />
        <InfoRow label="Currency" value={currency} />

        {isCOD && (
          <>
            <InfoRow label="COD Collectable" value={money(order.finalPayable, currency)} strong />
            <InfoRow label="COD Status" value={pretty(paymentStatus)} />
          </>
        )}

        {isRazorpay && (
          <>
            <InfoRow label="Razorpay Order ID" value={razorpay.orderId} />
            <InfoRow label="Razorpay Payment ID" value={razorpay.paymentId} />
            <InfoRow label="Razorpay Amount" value={money(razorpay.amount, currency)} />
            <InfoRow
              label="Paid At"
              value={
                razorpay.paidAt
                  ? new Date(razorpay.paidAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })
                  : "-"
              }
            />
          </>
        )}
      </div>

    

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
        <ReceiptText size={15} className="mt-0.5 shrink-0" />
        <p>
          For COD orders, amount collectable is final payable. For Razorpay orders,
          payment IDs and paid timestamp will show once payment is captured.
        </p>
      </div>
    </div>
  );
}