"use client";

import { useMemo, useState } from "react";
import BlueDartOrderRow from "@/components/bluedart/BlueDartOrderRow";
import BlueDartBookModal from "@/components/bluedart/BlueDartBookModal";

const safe = (v) => (v == null ? "" : String(v)).toLowerCase();

const toTime = (v) => {
  const t = new Date(v || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getShipmentScore = (shipment = {}) => {
  const status = safe(shipment?.status);
  const hasAwb = Boolean(String(shipment?.awbNumber || "").trim());

  let score = 0;

  if (hasAwb) score += 100;

  if (
    [
      "created",
      "pickup_pending",
      "picked",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "order_pushed",
    ].includes(status)
  ) {
    score += 50;
  }

  if (["cancelled", "failed"].includes(status)) {
    score -= 100;
  }

  score += toTime(shipment?.updatedAt) / 1e13;
  score += toTime(shipment?.createdAt) / 1e13;

  return score;
};

export default function BlueDartBookingTable({
  orders = [],
  shipments = [],
  loading = false,
}) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const shipmentMap = useMemo(() => {
    const map = new Map();

    for (const shipment of shipments || []) {
      const orderNumber = shipment?.orderNumber;
      if (!orderNumber) continue;

      const existing = map.get(orderNumber);

      if (!existing) {
        map.set(orderNumber, shipment);
        continue;
      }

      const existingScore = getShipmentScore(existing);
      const currentScore = getShipmentScore(shipment);

      if (currentScore >= existingScore) {
        map.set(orderNumber, shipment);
      }
    }

    return map;
  }, [shipments]);

  const eligibleOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      const isConfirmed = Boolean(order?.isConfirmed);
      const status = safe(order?.fulfillmentStatus);
      const blocked = ["cancelled", "delivered", "failed", "rto"].includes(status);

      return isConfirmed && !blocked;
    });
  }, [orders]);

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            BlueDart Booking Orders
          </h2>
          <p className="text-sm text-neutral-500">
            Select orders and book BlueDart shipments directly.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-neutral-50">
              <tr className="text-left text-sm text-neutral-600">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Order Status</th>
                <th className="px-4 py-3 font-semibold">BlueDart</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-14 text-center text-sm text-neutral-500"
                  >
                    Loading orders...
                  </td>
                </tr>
              ) : eligibleOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-14 text-center text-sm text-neutral-500"
                  >
                    No eligible orders found for BlueDart booking.
                  </td>
                </tr>
              ) : (
                eligibleOrders.map((order) => (
                  <BlueDartOrderRow
                    key={order?._id || order?.orderNumber}
                    order={order}
                    shipment={shipmentMap.get(order?.orderNumber) || null}
                    onBook={setSelectedOrder}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BlueDartBookModal
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onBooked={() => setSelectedOrder(null)}
      />
    </>
  );
}
