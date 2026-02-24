"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText, PackageCheck, Printer, Download } from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import PackingSlipTemplate from "@/components/invoice/PackingSlipTemplate";
import { SELLER } from "@/components/invoice/invoice.constants";

export default function OrderPrintPanel({
  order,
  courierName = "",
  trackingId = "",
}) {
  const invoiceRef = useRef(null);
  const packingRef = useRef(null);

  const [previewTab, setPreviewTab] = useState("invoice");

  const pageStyle = `
    @page { size: A4; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const normalized = useMemo(() => {
    if (!order) return null;

    const billing = {
      fullName:
        order.billingAddressSnapshot?.fullName ||
        order.customerId?.name ||
        "-",
      line1: order.billingAddressSnapshot?.line1 || "-",
      line2: order.billingAddressSnapshot?.line2 || "",
      city: order.billingAddressSnapshot?.city || "",
      pincode: order.billingAddressSnapshot?.pincode || "",
      state: order.billingAddressSnapshot?.state || "",
      phone: order.customerId?.phone || "",
      email: order.customerId?.email || "",
    };

    const shipping = {
      fullName: order.shippingAddressSnapshot?.fullName || "-",
      line1: order.shippingAddressSnapshot?.line1 || "-",
      line2: order.shippingAddressSnapshot?.line2 || "",
      city: order.shippingAddressSnapshot?.city || "",
      pincode: order.shippingAddressSnapshot?.pincode || "",
      state: order.shippingAddressSnapshot?.state || "",
    };

    const items =
      (order.items || []).map((it, idx) => {
        const snap = it.productSnapshot || {};
        const size = it.selectedSize || it.size || it.variant?.size || "-";
        return {
          sr: idx + 1,
          name: snap.title || it.productId?.title || "Unnamed Product",
          qty: Number(it.quantity || 0),
          priceIncl: Number(it.price || 0),
          gstRate: 5,
          size,
          selectedSize: size,
        };
      }) || [];

    const couponCode = order.coupon?.code || "";
    const discount = Number(order.discount || order.coupon?.discount || 0);

    return {
      seller: SELLER,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      invoiceNumber: order.orderNumber,

      billing,
      shipping,

      courier: {
        name: courierName || "-",
        awb: trackingId || "-",
      },

      items,

      totals: {
        taxable: Number(order.subtotal || 0),
        tax: Number(order.tax || 0),
        grandTotal: Number(order.finalPayable || 0),

        discount,
        couponCode,
        finalPayable: Number(order.finalPayable || 0),
      },

      payment: {
        title: order.paymentMethod || "-",
      },
    };
  }, [order, courierName, trackingId]);

  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${normalized?.orderNumber || "order"}`,
    pageStyle,
  });

  const printPackingSlip = useReactToPrint({
    contentRef: packingRef,
    documentTitle: `PackingSlip-${normalized?.orderNumber || "order"}`,
    pageStyle,
  });

  // ✅ Download as PDF via "print to pdf" in a new window
  const downloadPdfFromRef = useCallback(
    (ref, title) => {
      const el = ref?.current;
      if (!el) return;

      const w = window.open(
        "",
        "_blank",
        "noopener,noreferrer,width=900,height=650"
      );

      if (!w) {
        alert("Popup blocked. Please allow popups to download/print.");
        return;
      }

      w.document.open();
      w.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${String(title || "document")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#039;")}</title>
            <style>${pageStyle}</style>
          </head>
          <body>
            ${el.outerHTML}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.focus();
                  window.print();
                  setTimeout(() => window.close(), 300);
                }, 60);
              };
            </script>
          </body>
        </html>
      `);
      w.document.close();
    },
    [pageStyle]
  );

  const downloadInvoice = useCallback(() => {
    downloadPdfFromRef(
      invoiceRef,
      `Invoice-${normalized?.orderNumber || "order"}`
    );
  }, [downloadPdfFromRef, normalized?.orderNumber]);

  const downloadPackingSlip = useCallback(() => {
    downloadPdfFromRef(
      packingRef,
      `PackingSlip-${normalized?.orderNumber || "order"}`
    );
  }, [downloadPdfFromRef, normalized?.orderNumber]);

  if (!order || !normalized) return null;

  const activeRef = previewTab === "invoice" ? invoiceRef : packingRef;
  const activeTitle =
    previewTab === "invoice"
      ? `Invoice-${normalized?.orderNumber || "order"}`
      : `PackingSlip-${normalized?.orderNumber || "order"}`;

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
      {/* Tabs + Actions */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewTab("invoice")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              previewTab === "invoice"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
            }`}
          >
            Invoice Preview
          </button>

          <button
            onClick={() => setPreviewTab("packing")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              previewTab === "packing"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
            }`}
          >
            Packing Slip Preview
          </button>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {/* Download buttons */}
          <button
            onClick={downloadPackingSlip}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition"
          >
            <Download size={14} />
            Packing PDF
          </button>

          <button
            onClick={downloadInvoice}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download size={14} />
            Invoice PDF
          </button>

          {/* Print buttons */}
          <button
            onClick={() => printPackingSlip?.()}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition"
          >
            <PackageCheck size={14} />
            Packing Slip
          </button>

          <button
            onClick={() => printInvoice?.()}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FileText size={14} />
            Invoice
          </button>

          {/* Print current tab */}
          <button
            onClick={() =>
              previewTab === "invoice"
                ? printInvoice?.()
                : printPackingSlip?.()
            }
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 transition"
          >
            <Printer size={14} />
            Print
          </button>

          {/* Download current tab */}
          <button
            onClick={() => downloadPdfFromRef(activeRef, activeTitle)}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-white text-gray-900 rounded-lg ring-1 ring-gray-200 hover:bg-gray-100 transition"
            title="Download current preview as PDF"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="p-6 flex justify-center bg-white">
        {previewTab === "invoice" ? (
          <div
            style={{ transform: "scale(0.55)", width: "210mm" }}
            className="origin-top"
          >
            <InvoiceTemplate data={normalized} />
          </div>
        ) : (
          <div
            style={{ transform: "scale(0.75)", width: "210mm" }}
            className="origin-top"
          >
            <PackingSlipTemplate data={normalized} />
          </div>
        )}
      </div>

      {/* Print/Download Content Offscreen */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={invoiceRef}>
          <InvoiceTemplate data={normalized} />
        </div>

        <div ref={packingRef}>
          <PackingSlipTemplate data={normalized} />
        </div>
      </div>
    </div>
  );
}