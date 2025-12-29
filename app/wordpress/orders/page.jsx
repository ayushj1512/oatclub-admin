"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import WordpressInvoiceScreen from "@/components/invoice/WordpressInvoiceScreen";

export default function WordpressOrdersPage() {
  const searchParams = useSearchParams();

  /* ============================================================
     READ QUERY PARAMS
     /wordpress/orders?wcOrderId=1234
     /wordpress/orders?orderNumber=100045
  ============================================================ */
  const wcOrderId = searchParams.get("wcOrderId");
  const orderNumber = searchParams.get("orderNumber");

  /* ============================================================
     LOCAL STATE
  ============================================================ */
  const [type, setType] = useState("invoice"); // "invoice" | "packing"

  /* ============================================================
     DERIVED LABEL (SAFE)
  ============================================================ */
  const orderLabel = useMemo(() => {
    if (orderNumber) return `Order #${orderNumber}`;
    if (wcOrderId) return `WC Order ID: ${wcOrderId}`;
    return "";
  }, [orderNumber, wcOrderId]);

  /* ============================================================
     EMPTY STATE
  ============================================================ */
  if (!wcOrderId && !orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded-lg p-6 text-sm text-gray-600">
          Please select a WooCommerce order to view invoice or packing slip.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ================= HEADER ================= */}
      <div className="bg-white border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            WooCommerce Order Documents
          </h1>
          <p className="text-xs text-gray-500">{orderLabel}</p>
        </div>

        {/* ================= TOGGLE ================= */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("invoice")}
            className={`px-4 py-2 text-sm rounded-md border transition ${
              type === "invoice"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Invoice
          </button>

          <button
            type="button"
            onClick={() => setType("packing")}
            className={`px-4 py-2 text-sm rounded-md border transition ${
              type === "packing"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Packing Slip
          </button>
        </div>
      </div>

      {/* ================= DOCUMENT SCREEN ================= */}
      <div className="flex-1 overflow-auto">
        <WordpressInvoiceScreen
          wcOrderId={wcOrderId || undefined}
          orderNumber={orderNumber || undefined}
          type={type}
          showActions={true}
        />
      </div>
    </div>
  );
}
