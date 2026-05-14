"use client";

import { BadgePercent, Ticket, IndianRupee } from "lucide-react";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const Card = ({ children }) => (
  <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm">
    {children}
  </div>
);

const Row = ({ label, value, strong = false }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={strong ? "font-bold text-gray-950" : "font-semibold text-gray-800"}>
      {value || "-"}
    </span>
  </div>
);

export default function OrderCouponDetails({ order }) {
  const coupon = order?.coupon || {};
  const hasCoupon =
    coupon?.code ||
    Number(coupon?.discount || 0) > 0 ||
    Number(order?.discount || 0) > 0 ||
    order?.analytics?.couponApplied;

  if (!hasCoupon) {
    return (
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
          <Ticket size={18} /> Coupon Details
        </h2>

        <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
          No coupon applied on this order.
        </div>
      </Card>
    );
  }

  const discount = Number(coupon?.discount || order?.discount || 0);
  const finalTotal = Number(coupon?.finalTotal || order?.finalPayable || 0);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <BadgePercent size={18} /> Coupon Details
        </h2>

        {coupon?.code && (
          <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {coupon.code}
          </span>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl bg-gray-50 p-4">
        <Row label="Coupon Code" value={coupon?.code || "-"} />
        <Row label="Coupon Discount" value={money(discount)} />
        <Row label="Order Discount" value={money(order?.discount)} />

        {coupon?.identity && (
          <Row label="Applied By" value={coupon.identity} />
        )}

        {order?.analytics?.couponIdentity && (
          <Row label="Coupon Identity" value={order.analytics.couponIdentity} />
        )}

        <div className="my-1 border-t border-gray-200" />

        <Row label="Subtotal" value={money(order?.subtotal)} />
        <Row label="Shipping Fee" value={money(order?.shippingFee)} />
        <Row label="Tax" value={money(order?.tax)} />

        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <IndianRupee size={15} /> Final Payable
          </span>
          <span className="text-lg font-bold text-gray-950">
            {money(finalTotal)}
          </span>
        </div>
      </div>
    </Card>
  );
}