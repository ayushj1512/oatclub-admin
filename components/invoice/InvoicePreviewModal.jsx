"use client";

import { useInvoiceStore } from "@/store/invoice.store";
import InvoiceTemplate from "./InvoiceTemplate";
import PackingSlipTemplate from "./PackingSlipTemplate";

export default function InvoicePreviewModal() {
  const {
    isOpen,
    type,            // "invoice" | "packing"
    invoiceData,
    packingData,
    closeInvoice,
  } = useInvoiceStore();

  if (!isOpen) return null;

  /* =====================================================
     🔥 BULLETPROOF PRINT (NEW WINDOW)
  ===================================================== */
  const printInNewWindow = () => {
    const content = document.getElementById("print-content");
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>${type === "invoice" ? "Invoice" : "Packing Slip"}</title>

          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
              width: 210mm;
              min-height: 297mm;
              font-family: Poppins, Arial, sans-serif;
              background: #fff;
              color: #000;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              border: 1px solid #000;
            }

            svg {
              display: block;
              max-width: 100%;
              height: auto;
            }

            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>

        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // ⏱ allow SVG / barcode to render
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-white w-[900px] max-h-[90vh] overflow-auto p-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">
            {type === "invoice"
              ? "Invoice Preview"
              : "Packing Slip Preview"}
          </h3>

          <button
            onClick={closeInvoice}
            className="text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* 👇 CONTENT THAT WILL BE PRINTED */}
        <div id="print-content">
          {type === "invoice" ? (
            <InvoiceTemplate data={invoiceData} />
          ) : (
            <PackingSlipTemplate data={packingData} />
          )}
        </div>

        {/* ACTIONS */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={printInNewWindow}
            className="px-4 py-2 bg-black text-white text-sm rounded"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
