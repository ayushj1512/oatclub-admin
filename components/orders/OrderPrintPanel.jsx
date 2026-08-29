"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  AlertCircle,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
} from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import PackingSlipTemplate from "@/components/invoice/PackingSlipTemplate";
import { useOrderStore } from "@/store/orderStore";

const safe = (value) => String(value ?? "").trim();

export default function OrderPrintPanel({
  order,
  invoice: suppliedInvoice = null,
  courierName = "",
  trackingId = "",
}) {
  const invoiceRef = useRef(null);
  const packingRef = useRef(null);

  const fetchInvoiceByOrderNumber = useOrderStore(
    (state) => state.fetchInvoiceByOrderNumber
  );

  const fetchInvoiceByOrderId = useOrderStore(
    (state) => state.fetchInvoiceByOrderId
  );

  const [previewTab, setPreviewTab] = useState("invoice");
  const [invoice, setInvoice] = useState(suppliedInvoice);
  const [loading, setLoading] = useState(!suppliedInvoice);
  const [error, setError] = useState("");

  const orderId = safe(order?._id || order?.id);
  const orderNumber = safe(
    suppliedInvoice?.orderNumber || order?.orderNumber
  );

  const loadInvoice = useCallback(async () => {
    if (suppliedInvoice) {
      setInvoice(suppliedInvoice);
      setLoading(false);
      setError("");
      return suppliedInvoice;
    }

    if (!orderNumber && !orderId) {
      setInvoice(null);
      setLoading(false);
      setError("Order number or order ID is missing.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      let result = null;

      if (orderNumber) {
        result = await fetchInvoiceByOrderNumber(orderNumber, {
          silent: true,
        });
      } else {
        result = await fetchInvoiceByOrderId(orderId, {
          silent: true,
        });
      }

      if (!result) {
        throw new Error("Invoice was not returned by the backend.");
      }

      /*
       * Backend courier data is preferred.
       * Props remain as a fallback for old packed-order records.
       */
      const normalizedInvoice = {
        ...result,

        totals: {
          ...(result?.totals || {}),
          shippingFee: Number(
            result?.totals?.shippingFee ??
            result?.totals?.shipping ??
            order?.shippingFee ??
            0
          ),
        },

        payment: {
          ...(result?.payment || {}),

          status: order?.paymentStatus || result?.payment?.status || "",

          title:
            order?.paymentMethod === "partial_cod"
              ? "PARTIAL COD"
              : order?.paymentMethod === "razorpay"
                ? "PREPAID"
                : order?.paymentMethod === "cod"
                  ? "CASH ON DELIVERY"
                  : result?.payment?.title || order?.paymentMethod || "-",

          isPartial: order?.paymentMethod === "partial_cod",

          paidAmount:
            order?.paymentMethod === "partial_cod"
              ? Number(order?.partialPayment?.upfrontAmount || 0)
              : order?.paymentStatus === "paid"
                ? Number(order?.finalPayable || 0)
                : 0,

          remainingAmount:
            order?.paymentMethod === "partial_cod"
              ? Number(order?.partialPayment?.remainingCodAmount || 0)
              : 0,

          upfrontPercent: Number(order?.partialPayment?.upfrontPercent || 0),
        },

        courier: {
          // existing courier code same
        },
      };

      setInvoice(normalizedInvoice);
      return normalizedInvoice;
    } catch (fetchError) {
      console.error("OrderPrintPanel loadInvoice error:", fetchError);

      setInvoice(null);
      setError(
        fetchError?.message || "Failed to load invoice from backend."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, [
    suppliedInvoice,
    orderNumber,
    orderId,
    courierName,
    trackingId,
    order,
    fetchInvoiceByOrderNumber,
    fetchInvoiceByOrderId,
  ]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const printPackingSlip = useReactToPrint({
    contentRef: packingRef,

    documentTitle: `PackingSlip-${
      invoice?.orderNumber || orderNumber || "order"
    }`,

    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }

      @media print {
        html,
        body {
          margin: 0;
          padding: 0;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,

    documentTitle: `Invoice-${
      invoice?.orderNumber || orderNumber || "order"
    }`,

    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }

      @media print {
        html,
        body {
          margin: 0;
          padding: 0;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  if (!order && !suppliedInvoice) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
          <Loader2 size={18} className="animate-spin" />
          Loading invoice from backend...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-red-900">
              Invoice could not be loaded
            </div>

            <div className="mt-1 text-xs text-red-700">
              {error || "Backend did not return invoice data."}
            </div>

            <button
              type="button"
              onClick={loadInvoice}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const printingDisabled = loading || !invoice;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
      {/* Header and tabs */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewTab("invoice")}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              previewTab === "invoice"
                ? "bg-blue-600 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100",
            ].join(" ")}
          >
            Invoice Preview
          </button>

          <button
            type="button"
            onClick={() => setPreviewTab("packing")}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              previewTab === "packing"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100",
            ].join(" ")}
          >
            Packing Slip Preview
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printPackingSlip?.()}
            disabled={printingDisabled}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <PackageCheck size={14} />
            Packing Slip
          </button>

          <button
            type="button"
            onClick={() => printInvoice?.()}
            disabled={printingDisabled}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <FileText size={14} />
            Invoice
          </button>

          <button
            type="button"
            disabled={printingDisabled}
            onClick={() => {
              if (previewTab === "invoice") {
                printInvoice?.();
              } else {
                printPackingSlip?.();
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Backend status */}
      <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-[11px] font-semibold text-emerald-800">
        Backend invoice loaded • {invoice?.invoiceNumber || orderNumber}
      </div>

      {/* Preview */}
      <div className="overflow-auto bg-white p-4 sm:p-6">
        <div className="flex min-w-[760px] justify-center">
          {previewTab === "invoice" ? (
            <div
              className="origin-top"
              style={{
                width: "210mm",
                transform: "scale(0.58)",
                transformOrigin: "top center",
              }}
            >
              <InvoiceTemplate data={invoice} />
            </div>
          ) : (
            <div
              className="origin-top"
              style={{
                width: "210mm",
                transform: "scale(0.72)",
                transformOrigin: "top center",
              }}
            >
              <PackingSlipTemplate data={invoice} />
            </div>
          )}
        </div>
      </div>

      {/* Offscreen printable content */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: "210mm",
          background: "#ffffff",
        }}
      >
        <div ref={invoiceRef}>
          <InvoiceTemplate data={invoice} />
        </div>

        <div ref={packingRef}>
          <PackingSlipTemplate data={invoice} />
        </div>
      </div>
    </div>
  );
}

