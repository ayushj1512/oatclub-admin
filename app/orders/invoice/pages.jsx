"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import InvoiceScreen from "@/components/invoice/InvoiceScreen";

export default function InvoicePage() {
  const searchParams = useSearchParams();

  // You can pass either orderId or orderNumber in URL
  // /orders/invoice?orderId=xxxx
  // /orders/invoice?orderNumber=MIRAY-000123
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  const [type, setType] = useState("invoice"); // "invoice" | "packing"

  if (!orderId && !orderNumber) {
    return (
      <div className="p-6 text-sm text-red-600">
        Missing orderId or orderNumber in URL
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ================= HEADER ================= */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">
            Order Documents
          </h1>
          <p className="text-xs text-gray-500">
            {orderNumber ? `Order #${orderNumber}` : `Order ID: ${orderId}`}
          </p>
        </div>

        {/* TOGGLE */}
        <div className="flex gap-2">
          <button
            onClick={() => setType("invoice")}
            className={`px-4 py-2 text-sm rounded ${
              type === "invoice"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Invoice
          </button>

          <button
            onClick={() => setType("packing")}
            className={`px-4 py-2 text-sm rounded ${
              type === "packing"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Packing Slip
          </button>
        </div>
      </div>

      {/* ================= DOCUMENT SCREEN ================= */}
      <InvoiceScreen
        orderId={orderId || undefined}
        orderNumber={orderNumber || undefined}
        type={type}
        showActions={true}
      />
    </div>
  );
}
