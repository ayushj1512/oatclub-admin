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
  label = "Download PDF",
  courier = { name: "", awb: "" },
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const data = useMemo(() => {
    if (!order) return null;
    if (type === "invoice") return { ...buildInvoiceDataFromWC(order), courier };
    return { ...buildPackingDataFromWC(order), courier };
  }, [order, type, courier]);

  const handleDownload = async () => {
    if (!data) return;

    try {
      setPdfLoading(true);

      const rootId = `pdf-root-${type}-${order?.id || order?.number}`;
      const element = document.getElementById(rootId);
      if (!element) throw new Error("PDF root missing");

      const fileName = `${type}-${order?.number || order?.id}.pdf`;

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

  const rootId = `pdf-root-${type}-${order?.id || order?.number}`;

  return (
    <>
      {/* Loader Overlay */}
      {pdfLoading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="bg-white px-6 py-4 rounded-xl shadow flex gap-3 items-center">
            <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Generating PDF…</p>
          </div>
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={!data || pdfLoading}
        className={`px-3 py-1.5 text-xs rounded text-white ${
          pdfLoading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"
        }`}
      >
        {pdfLoading ? "Downloading..." : label}
      </button>

      {/* Hidden Render for PDF */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div
          id={rootId}
          style={{
            background: "#fff",
            color: "#000",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {/* IMPORTANT: Avoid lab()/oklch() by forcing safe CSS */}
          <style>{`
            * {
              color: #000 !important;
              background: transparent !important;
              border-color: #000 !important;
            }
            body { background: #fff !important; }
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
