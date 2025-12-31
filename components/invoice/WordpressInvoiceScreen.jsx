"use client";

import { useEffect, useMemo, useState } from "react";
import { useWordpressStore } from "@/store/wordpress.store";

import { buildInvoiceDataFromWC } from "./buildInvoiceDataFromWC";
import { buildPackingDataFromWC } from "./buildPackingDataFromWC";

import InvoiceTemplate from "./InvoiceTemplate";
import PackingSlipTemplate from "./PackingSlipTemplate";
import CourierDetailsModal from "./CourierDetailsModal";

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

  const [courier, setCourier] = useState({ name: "", awb: "" });
  const [showCourierModal, setShowCourierModal] = useState(false);

  // ✅ NEW: PDF download loading state
  const [pdfLoading, setPdfLoading] = useState(false);

  /* ============================================================
     FETCH ORDER
  ============================================================ */
  useEffect(() => {
    clearOrder();

    if (wcOrderId) {
      fetchOrderById(wcOrderId);
      return;
    }

    if (orderNumber) {
      fetchOrderByNumber(orderNumber);
    }
  }, [wcOrderId, orderNumber]);

  /* ============================================================
     BUILD DATA
  ============================================================ */
  const data = useMemo(() => {
    if (!order) return null;

    if (type === "invoice") {
      return { ...buildInvoiceDataFromWC(order), courier };
    }

    return { ...buildPackingDataFromWC(order), courier };
  }, [order, type, courier]);

  /* ============================================================
     ✅ DIRECT PDF DOWNLOAD (SERVER GENERATED)
  ============================================================ */
  const handleDownloadPDF = async () => {
    if (pdfLoading) return; // prevent double clicks

    try {
      setPdfLoading(true);

      const params = new URLSearchParams();
      if (wcOrderId) params.set("wcOrderId", wcOrderId);
      if (orderNumber) params.set("orderNumber", orderNumber);
      params.set("type", type);

      const res = await fetch(`/api/pdf?${params.toString()}`);

      // ✅ If failed, show error details (JSON)
      if (!res.ok) {
        let msg = "PDF download failed";

        try {
          const errData = await res.json();
          msg = errData?.details || errData?.error || msg;
        } catch (e) {
          // ignore JSON parse error
        }

        alert(msg);
        setPdfLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-${wcOrderId || orderNumber || order?.number || order?.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      setPdfLoading(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while downloading PDF");
      setPdfLoading(false);
    }
  };

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

  return (
    <div className="bg-gray-50 min-h-screen relative">
      {/* ✅ FULLSCREEN LOADER OVERLAY */}
      {pdfLoading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">
              Generating PDF… please wait
            </p>
          </div>
        </div>
      )}

      {showActions && (
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-between items-center">
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCourierModal(true)}
              className="px-3 py-1.5 text-xs border rounded hover:bg-gray-100"
              disabled={pdfLoading}
            >
              {courier?.name || courier?.awb ? "Edit Courier" : "Add Courier"}
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className={`px-4 py-1.5 text-xs rounded text-white 
                ${pdfLoading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}
              `}
            >
              {pdfLoading ? "Downloading..." : "Download PDF"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6">
        {type === "invoice" ? (
          <InvoiceTemplate data={data} />
        ) : (
          <PackingSlipTemplate data={data} />
        )}
      </div>

      <CourierDetailsModal
        open={showCourierModal}
        onClose={() => setShowCourierModal(false)}
        initialData={courier}
        onSave={(data) => setCourier(data)}
      />
    </div>
  );
}
