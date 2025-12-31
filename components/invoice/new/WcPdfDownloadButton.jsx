"use client";

import { useMemo, useState } from "react";
import html2pdf from "html2pdf.js";

import { buildInvoiceDataFromWC } from "../buildInvoiceDataFromWC";
import { buildPackingDataFromWC } from "../buildPackingDataFromWC";

import InvoiceTemplate from "../InvoiceTemplate";
import PackingSlipTemplate from "../PackingSlipTemplate";

export default function WcPdfDownloadButton({
  order,
  type = "invoice", // invoice | packing
  label,
  courier = { name: "", awb: "" },
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  // ✅ fallback labels
  const btnLabel =
    label || (type === "invoice" ? "Invoice PDF" : "Packing PDF");

  const data = useMemo(() => {
    if (!order) return null;
    if (type === "invoice")
      return { ...buildInvoiceDataFromWC(order), courier };
    return { ...buildPackingDataFromWC(order), courier };
  }, [order, type, courier]);

  const rootId = `pdf-root-${type}-${order?.id || order?.number || "x"}`;

  const handleDownload = async () => {
    // ✅ prevent double click + missing data
    if (!data || pdfLoading) return;

    try {
      setPdfLoading(true);

      const element = document.getElementById(rootId);
      if (!element) throw new Error("PDF root missing");

      const orderRef = order?.number || order?.id || "order";
      const fileName =
        type === "invoice"
          ? `Invoice-${orderRef}.pdf`
          : `Packing-${orderRef}.pdf`;

      // ✅ html2pdf options (stable A4)
      const opt = {
        margin: 10,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert("PDF generate failed: " + (err?.message || "Unknown error"));
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      {/* ✅ LOADER OVERLAY */}
      {pdfLoading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="bg-white px-6 py-4 rounded-xl shadow flex gap-3 items-center">
            <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">
              Generating {type === "invoice" ? "Invoice" : "Packing"} PDF…
            </p>
          </div>
        </div>
      )}

      {/* ✅ BUTTON */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!data || pdfLoading}
        className={`px-3 py-1.5 text-xs rounded text-white transition
          ${pdfLoading || !data
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black hover:bg-gray-800"}
        `}
      >
        {pdfLoading ? "Downloading..." : btnLabel}
      </button>

      {/* ✅ HIDDEN RENDER (FOR PDF ONLY) */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
          minHeight: "297mm",
          background: "#fff",
        }}
      >
        <div
          id={rootId}
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#fff",
            color: "#000",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {/* ✅ IMPORTANT: Avoid Tailwind lab()/oklch() by forcing safe CSS */}
          <style>{`
            * {
              color: #000 !important;
              background: transparent !important;
              border-color: #000 !important;
              box-shadow: none !important;
              filter: none !important;
              text-shadow: none !important;
            }

            body {
              background: #fff !important;
            }

            /* prevent tailwind color functions */
            :root {
              color-scheme: light !important;
            }
          `}</style>

          {type === "invoice" ? (
            <InvoiceTemplate data={data} />
          ) : (
            <PackingSlipTemplate data={data} />
          )}
        </div>
      </div>
    </>
  );
}
