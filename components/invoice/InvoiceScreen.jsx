"use client";

import { useEffect, useMemo } from "react";
import { useOrderStore } from "@/store/order.store";
import { buildInvoiceData } from "./invoice.utils";
import { buildPackingSlipData } from "./packingSlip.utils";
import InvoiceTemplate from "./InvoiceTemplate";
import PackingSlipTemplate from "./PackingSlipTemplate";

export default function InvoiceScreen({
  orderId,
  orderNumber,
  type = "invoice", // "invoice" | "packing"
  showActions = true,
}) {
  const {
    order,
    loading,
    error,
    fetchOrderById,
    fetchOrderByNumber,
  } = useOrderStore();

  /* ======================================
     FETCH ORDER
  ====================================== */
  useEffect(() => {
    if (orderId) fetchOrderById(orderId);
    else if (orderNumber) fetchOrderByNumber(orderNumber);
  }, [orderId, orderNumber]);

  /* ======================================
     BUILD DATA (MEMOIZED)
  ====================================== */
  const data = useMemo(() => {
    if (!order) return null;
    return type === "invoice"
      ? buildInvoiceData(order)
      : buildPackingSlipData(order);
  }, [order, type]);

  /* ======================================
     STATES
  ====================================== */
  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading order…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!order || !data) {
    return (
      <div className="p-6 text-sm text-gray-500">
        No order found
      </div>
    );
  }

  /* ======================================
     RENDER
  ====================================== */
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ACTION BAR */}
      {showActions && (
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">
              Order #{order.orderNumber}
            </p>
            <h2 className="font-semibold">
              {type === "invoice" ? "Invoice" : "Packing Slip"}
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm bg-black text-white rounded"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENT */}
      <div className="max-w-5xl mx-auto p-6">
        {type === "invoice" ? (
          <InvoiceTemplate data={data} />
        ) : (
          <PackingSlipTemplate data={data} />
        )}
      </div>
    </div>
  );
}
