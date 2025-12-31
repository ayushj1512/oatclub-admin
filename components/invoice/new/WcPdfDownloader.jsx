"use client";

import { useEffect, useMemo, useState } from "react";
import html2pdf from "html2pdf.js";

import { useWordpressStore } from "@/store/wordpress.store";
import { buildInvoiceDataFromWC } from "./buildInvoiceDataFromWC";
import { buildPackingDataFromWC } from "./buildPackingDataFromWC";

import InvoiceTemplate from "../InvoiceTemplate";
import PackingSlipTemplate from "../PackingSlipTemplate";

export default function WcPdfDownloader({
  wcOrderId,
  orderNumber,
  type = "invoice", // invoice | packing
}) {
  const { order, loading, error, fetchOrderById, fetchOrderByNumber, clearOrder } =
    useWordpressStore();

  const [pdfLoading, setPdfLoading] = useState(false);

  // ✅ Courier optional (you can add modal later)
  const courier = { name: "", awb: "" };

  /* ============================================================
     FETCH ORDER
  ============================================================ */
  useEffect(() => {
    clearOrder();

    if (wcOrderId) fetchOrderById(wcOrderId);
    if (!wcOrderId && orderNumber) fetchOrderByNumber(orderNumber);
  }, [wcOrderId, orderNumber]);

  /* ============================================================
     BUILD DATA
  ============================================================ */
  const data = useMemo(() => {
    if (!order) return null;
    if (type === "invoice") return { ...buildInvoiceDataFromWC(order), courier };
    return { ...buildPackingDataFromWC(order), courier };
  }, [order, type]);

  /* ============================================================
     ✅ CLEAN HTML2PDF DOWNLOAD
  ============================================================ */
  const downloadPDF = async () => {
    if (!data) return;
    setPdfLoading(true);

    try {
      const element = document.getElementById("pdf-root");
      if (!element) throw new Error("PDF root not found");

      const fileName = `${type}-${wcOrderId || orderNumber || order?.number || order?.id}.pdf`;

      const opt = {
        margin: 8,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert("PDF generate failed: " + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="p-4">
      {/* Loader */}
      {pdfLoading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="bg-white px-6 py-4 rounded-xl shadow flex gap-3 items-center">
            <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Generating PDF…</p>
          </div>
        </div>
      )}

      {/* Status */}
      {loading && (
        <div className="text-sm text-gray-600">Loading WooCommerce order…</div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Button */}
      <button
        onClick={downloadPDF}
        disabled={loading || !data || pdfLoading}
        className={`mt-3 px-4 py-2 text-sm rounded text-white
          ${loading || !data || pdfLoading ? "bg-gray-400" : "bg-black hover:bg-gray-800"}
        `}
      >
        {pdfLoading ? "Downloading..." : "Download PDF"}
      </button>

      {/* ============================================================
         ✅ HIDDEN RENDER AREA (PURE HTML FOR PDF)
         IMPORTANT: Avoid Tailwind lab()/oklch() by forcing basic CSS
      ============================================================ */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div
          id="pdf-root"
          style={{
            background: "#fff",
            color: "#000",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {/* ✅ Force safe CSS to override Tailwind special colors */}
          <style>{`
            * {
              color: #000 !important;
              background: transparent !important;
              border-color: #000 !important;
            }
            body {
              background: #fff !important;
            }
          `}</style>

          {type === "invoice" ? (
            <InvoiceTemplate data={data} />
          ) : (
            <PackingSlipTemplate data={data} />
          )}
        </div>
      </div>
    </div>
  );
}
