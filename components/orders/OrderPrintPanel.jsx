"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText, PackageCheck, Printer } from "lucide-react";

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
        return {
          sr: idx + 1,
          name: snap.title || it.productId?.title || "Unnamed Product",
          qty: Number(it.quantity || 0),
          priceIncl: Number(it.price || 0),
          gstRate: 5,
        };
      }) || [];

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
        grandTotal: Number(order.finalPayable || 0),
        taxable: Number(order.subtotal || 0),
        tax: Number(order.tax || 0),
      },

      payment: {
        title: order.paymentMethod || "-",
      },
    };
  }, [order, courierName, trackingId]);

  const printPackingSlip = useReactToPrint({
    contentRef: packingRef,
    documentTitle: `PackingSlip-${normalized?.orderNumber || "order"}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${normalized?.orderNumber || "order"}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  if (!order || !normalized) return null;

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
      {/* Tabs */}
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

        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Preview */}
      <div className="p-6 flex justify-center bg-white">
        {previewTab === "invoice" ? (
          <div style={{ transform: "scale(0.55)", width: "210mm" }} className="origin-top">
            <InvoiceTemplate data={normalized} />
          </div>
        ) : (
          <div style={{ transform: "scale(0.75)", width: "210mm" }} className="origin-top">
            <PackingSlipTemplate data={normalized} />
          </div>
        )}
      </div>

      {/* Print Content Offscreen */}
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
