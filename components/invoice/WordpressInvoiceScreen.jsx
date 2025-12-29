"use client";

import { useEffect, useMemo, useState } from "react";
import { useWordpressStore } from "@/store/wordpress.store";

import { buildInvoiceDataFromWC } from "./buildInvoiceDataFromWC";
import { buildPackingSlipData } from "./packingSlip.utils";

import InvoiceTemplate from "./InvoiceTemplate";
import PackingSlipTemplate from "./PackingSlipTemplate";
import CourierDetailsModal from "./CourierDetailsModal";

/**
 * Props:
 * - wcOrderId (number | string)
 * - orderNumber (string) [optional]
 * - type: "invoice" | "packing"
 * - showActions: boolean
 */
export default function WordpressInvoiceScreen({
  wcOrderId,
  orderNumber,
  type = "invoice",
  showActions = true,
}) {
  const {
    order,
    loading,
    error,
    fetchOrderById,
    fetchOrderByNumber,
    clearOrder,
  } = useWordpressStore();

  /* ============================================================
     COURIER STATE (MANUAL ENTRY FOR NOW)
  ============================================================ */
  const [courier, setCourier] = useState({
    name: "",
    awb: "",
  });

  const [showCourierModal, setShowCourierModal] = useState(false);

  /* ============================================================
     🔥 FETCH WORDPRESS ORDER (SAFE, NO DOUBLE CALLS)
  ============================================================ */
  useEffect(() => {
    clearOrder(); // prevent stale data flash

    if (wcOrderId) {
      fetchOrderById(wcOrderId);
      return;
    }

    if (orderNumber) {
      fetchOrderByNumber(orderNumber);
    }
  }, [wcOrderId, orderNumber]); // ❗ do NOT add functions here

  /* ============================================================
     BUILD DOCUMENT DATA (WC → TEMPLATE SHAPE)
  ============================================================ */
  const data = useMemo(() => {
    if (!order) return null;

    if (type === "invoice") {
      const invoiceData = buildInvoiceDataFromWC(order);

      // 🔗 inject courier details
      return {
        ...invoiceData,
        courier,
      };
    }

    return buildPackingSlipData(order);
  }, [order, type, courier]);

  /* ============================================================
     STATES
  ============================================================ */
  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-sm text-gray-500">
        Loading WooCommerce order…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!order || !data) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-sm text-gray-500">
        No WooCommerce order found
      </div>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ================= ACTION BAR ================= */}
    {showActions && (
  <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-between items-center">
    {/* LEFT INFO */}
    <div>
      <p className="text-xs text-gray-500">
        Woo Order #{order.number || order.id}
      </p>
      <h2 className="font-semibold text-sm">
        {type === "invoice"
          ? "WooCommerce Invoice"
          : "WooCommerce Packing Slip"}
      </h2>
    </div>

    {/* ACTION BUTTONS */}
    <div className="flex gap-2">
      {type === "invoice" && (
        <button
          type="button"
          onClick={() => setShowCourierModal(true)}
          className="px-3 py-1.5 text-xs border rounded hover:bg-gray-100"
        >
          {courier?.name || courier?.awb
            ? "Edit Courier"
            : "Add Courier"}
        </button>
      )}

      <button
  type="button"
  onClick={() => {
    document.title = `Invoice-${data?.invoiceNumber || order.number || order.id}`;
    window.print();
  }}
  className="px-4 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800"
>
  Print / Save as PDF
</button>

    </div>
  </div>
)}



      {/* ================= DOCUMENT ================= */}
      <div className="max-w-5xl mx-auto p-6">
        {type === "invoice" ? (
          <InvoiceTemplate data={data} />
        ) : (
          <PackingSlipTemplate data={data} />
        )}
      </div>

      {/* ================= COURIER MODAL ================= */}
      <CourierDetailsModal
        open={showCourierModal}
        onClose={() => setShowCourierModal(false)}
        initialData={courier}
        onSave={(data) => setCourier(data)}
      />
    </div>
  );
}
