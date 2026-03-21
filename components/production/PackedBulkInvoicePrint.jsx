"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText, Loader2 } from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderInvoiceStore } from "@/store/orderInvoiceStore";

const uniq = (arr = []) => [...new Set(arr.filter(Boolean))];

export default function PackedBulkInvoicePrint({
  orders = [],
  selectedIds = {},
  disabled = false,
}) {
  const printRef = useRef(null);
  const [printMode, setPrintMode] = useState("selected");

  const { loading, fetchInvoicesByOrderNumbers } = useOrderInvoiceStore();

  const filteredOrders = useMemo(
    () => (Array.isArray(orders) ? orders.filter(Boolean) : []),
    [orders]
  );

  const selectedOrders = useMemo(
    () => filteredOrders.filter((o) => !!selectedIds?.[String(o?._id)]),
    [filteredOrders, selectedIds]
  );

  const selectedOrderNumbers = useMemo(
    () =>
      uniq(
        selectedOrders
          .map((o) => String(o?.orderNumber || "").trim())
          .filter(Boolean)
      ),
    [selectedOrders]
  );

  const allOrderNumbers = useMemo(
    () =>
      uniq(
        filteredOrders
          .map((o) => String(o?.orderNumber || "").trim())
          .filter(Boolean)
      ),
    [filteredOrders]
  );

  const [invoicesToRender, setInvoicesToRender] = useState([]);

  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle:
      printMode === "selected"
        ? `Invoices-Selected-${invoicesToRender.length}`
        : `Invoices-All-${invoicesToRender.length}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        html, body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .bulk-invoice-page {
          break-after: page;
          page-break-after: always;
        }
        .bulk-invoice-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
      }
    `,
  });

  const printInvoices = async (orderNumbers = [], mode = "selected") => {
    const cleaned = uniq(
      (Array.isArray(orderNumbers) ? orderNumbers : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    );

    if (!cleaned.length) {
      alert(
        mode === "selected"
          ? "Please select at least one order to print invoices."
          : "No orders available to print invoices."
      );
      return;
    }

    try {
      setPrintMode(mode);

      const invoices = await fetchInvoicesByOrderNumbers(cleaned);

      if (!Array.isArray(invoices) || !invoices.length) {
        alert("No invoices found for selected orders.");
        return;
      }

      setInvoicesToRender(invoices);

      setTimeout(() => {
        reactToPrint?.();
      }, 80);
    } catch (err) {
      alert(err?.message || "Failed to load invoices.");
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printInvoices(selectedOrderNumbers, "selected")}
            disabled={disabled || loading || selectedOrderNumbers.length === 0}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              disabled || loading || selectedOrderNumbers.length === 0
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-blue-600 text-white hover:bg-blue-700",
            ].join(" ")}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Print Selected Invoices ({selectedOrderNumbers.length})
          </button>

          <button
            type="button"
            onClick={() => printInvoices(allOrderNumbers, "all")}
            disabled={disabled || loading || allOrderNumbers.length === 0}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              disabled || loading || allOrderNumbers.length === 0
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-zinc-900 text-white hover:bg-black",
            ].join(" ")}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Print All Filtered Invoices ({allOrderNumbers.length})
          </button>

          <div className="text-xs text-zinc-500">
            Invoices are fetched from backend invoice API before printing.
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={printRef}>
          {invoicesToRender.map((data, index) => (
            <div
              key={`${data?.orderNumber || "invoice"}-${index}`}
              className="bulk-invoice-page"
            >
              <InvoiceTemplate data={data} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}