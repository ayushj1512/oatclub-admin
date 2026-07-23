
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  AlertCircle,
  FileText,
  Loader2,
  Printer,
} from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderStore } from "@/store/orderStore";

const safe = (value) => String(value ?? "").trim();

const uniq = (values = []) =>
  [...new Set(values.map(safe).filter(Boolean))];

export default function PackedBulkInvoicePrint({
  orders = [],
  selectedIds = {},
  disabled = false,
}) {
  const printRef = useRef(null);

  const fetchInvoicesByOrderNumbers = useOrderStore(
    (state) => state.fetchInvoicesByOrderNumbers
  );

  const storeInvoiceLoading = useOrderStore(
    (state) => state.invoiceLoading
  );

  const storeInvoiceError = useOrderStore(
    (state) => state.invoiceError
  );

  const [printMode, setPrintMode] = useState("selected");
  const [invoicesToRender, setInvoicesToRender] = useState([]);
  const [missingOrderNumbers, setMissingOrderNumbers] = useState([]);
  const [pendingPrint, setPendingPrint] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const filteredOrders = useMemo(() => {
    return Array.isArray(orders)
      ? orders.filter(
          (order) => order && safe(order?.orderNumber)
        )
      : [];
  }, [orders]);

  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((order) => {
      const id = safe(order?._id || order?.id);
      return id && Boolean(selectedIds?.[id]);
    });
  }, [filteredOrders, selectedIds]);

  const selectedOrderNumbers = useMemo(() => {
    return uniq(
      selectedOrders.map((order) => order?.orderNumber)
    );
  }, [selectedOrders]);

  const allOrderNumbers = useMemo(() => {
    return uniq(
      filteredOrders.map((order) => order?.orderNumber)
    );
  }, [filteredOrders]);

  const loading = localLoading || storeInvoiceLoading;

  const reactToPrint = useReactToPrint({
    contentRef: printRef,

    documentTitle:
      printMode === "selected"
        ? `Invoices-Selected-${invoicesToRender.length}`
        : `Invoices-All-Filtered-${invoicesToRender.length}`,

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

        .bulk-invoice-page {
          width: 100%;
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

  /*
   * Print only after React has rendered all fetched invoices
   * inside the offscreen print container.
   */
  useEffect(() => {
    if (!pendingPrint || invoicesToRender.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      reactToPrint?.();
      setPendingPrint(false);
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pendingPrint, invoicesToRender, reactToPrint]);

  const printInvoices = async (
    orderNumbers = [],
    mode = "selected"
  ) => {
    const cleanedOrderNumbers = uniq(
      Array.isArray(orderNumbers) ? orderNumbers : []
    );

    if (!cleanedOrderNumbers.length) {
      alert(
        mode === "selected"
          ? "Please select at least one order to print."
          : "No filtered packed orders are available."
      );

      return;
    }

    setPrintMode(mode);
    setLocalLoading(true);
    setLocalError("");
    setMissingOrderNumbers([]);
    setPendingPrint(false);

    try {
      const result = await fetchInvoicesByOrderNumbers(
        cleanedOrderNumbers,
        { silent: true }
      );

      /*
       * Supports both possible store return formats:
       * 1. { invoices: [...] }
       * 2. [...]
       */
      const invoices = Array.isArray(result)
        ? result
        : Array.isArray(result?.invoices)
          ? result.invoices
          : [];

      const missing = Array.isArray(
        result?.missingOrderNumbers
      )
        ? result.missingOrderNumbers
        : [];

      if (!invoices.length) {
        throw new Error(
          "Backend did not return any invoices for these orders."
        );
      }

      setInvoicesToRender(invoices);
      setMissingOrderNumbers(missing);
      setPendingPrint(true);
    } catch (error) {
      console.error("PackedBulkInvoicePrint error:", error);

      setInvoicesToRender([]);
      setPendingPrint(false);

      const message =
        error?.message || "Failed to load invoices from backend.";

      setLocalError(message);
      alert(message);
    } finally {
      setLocalLoading(false);
    }
  };

  const printSelectedInvoices = () =>
    printInvoices(selectedOrderNumbers, "selected");

  const printAllFilteredInvoices = () =>
    printInvoices(allOrderNumbers, "all");

  const error = localError || storeInvoiceError;

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={printSelectedInvoices}
            disabled={
              disabled ||
              loading ||
              selectedOrderNumbers.length === 0
            }
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              disabled ||
              loading ||
              selectedOrderNumbers.length === 0
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-blue-600 text-white hover:bg-blue-700",
            ].join(" ")}
          >
            {loading && printMode === "selected" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}

            {loading && printMode === "selected"
              ? "Preparing Selected..."
              : `Print Selected Invoices (${selectedOrderNumbers.length})`}
          </button>

          <button
            type="button"
            onClick={printAllFilteredInvoices}
            disabled={
              disabled ||
              loading ||
              allOrderNumbers.length === 0
            }
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              disabled ||
              loading ||
              allOrderNumbers.length === 0
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-zinc-900 text-white hover:bg-black",
            ].join(" ")}
          >
            {loading && printMode === "all" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Printer size={16} />
            )}

            {loading && printMode === "all"
              ? "Preparing All..."
              : `Print All Filtered Invoices (${allOrderNumbers.length})`}
          </button>

          <div className="text-xs text-zinc-500">
            Seller, GST, address, items and courier data are fetched
            from the backend invoice API.
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle
              size={15}
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        {missingOrderNumbers.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <b>Invoice not found for:</b>{" "}
            {missingOrderNumbers.join(", ")}
          </div>
        )}

        {invoicesToRender.length > 0 && !loading && (
          <div className="mt-3 text-xs font-semibold text-emerald-700">
            {invoicesToRender.length} invoice(s) prepared successfully.
          </div>
        )}
      </div>

      {/* Printable invoice collection */}
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
        <div ref={printRef}>
          {invoicesToRender.map((invoice, index) => (
            <div
              key={`${
                invoice?.invoiceNumber ||
                invoice?.orderNumber ||
                "invoice"
              }-${index}`}
              className="bulk-invoice-page"
            >
              <InvoiceTemplate data={invoice} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

