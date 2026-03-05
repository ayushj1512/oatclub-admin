"use client";
import OrderRow from "@/components/orders/OrderRow";

/**
 * NOTE:
 * We render OrderRow inside a "grid row container".
 * OrderRow currently returns <tr>.. which won't work inside div list.
 *
 * So for virtualization, you MUST use a div-based row component.
 * Easiest: make a new OrderRowDiv component (recommended).
 *
 * If you want I can convert your current OrderRow into OrderRowDiv fully.
 */

export default function VirtualOrderRow({ order, onUpdated }) {
  // TEMP: just show orderNumber to demonstrate virtualization works
  // Replace with OrderRowDiv (converted version) for full UI.
  return (
    <div className="grid grid-cols-[260px_260px_140px_180px_140px_160px_120px] items-start gap-0">
      <div className="px-5 py-4 font-semibold text-gray-900">{order?.orderNumber}</div>
      <div className="px-5 py-4">{order?.shippingAddressSnapshot?.fullName || "Unknown"}</div>
      <div className="px-5 py-4">{order?.paymentMethod}</div>
      <div className="px-5 py-4">{order?.fulfillmentStatus}</div>
      <div className="px-5 py-4 font-semibold">₹{Number(order?.finalPayable || 0).toLocaleString("en-IN")}</div>
      <div className="px-5 py-4">{new Date(order?.createdAt || 0).toLocaleString()}</div>
      <div className="px-5 py-4 text-right">…</div>
    </div>
  );
}