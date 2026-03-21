"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText, Loader2, RefreshCcw, Search } from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderInvoiceStore } from "@/store/orderInvoiceStore";

const PREFIX = "MIRAY-";
const DIGITS = 6;

const normalizeOrderNumber = (value = "") => {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";

  if (/^MIRAY-\d{6}$/.test(raw)) return raw;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  return `${PREFIX}${digits.slice(-DIGITS).padStart(DIGITS, "0")}`;
};

const parseOrderNumbers = (input = "") =>
  [...new Set(input.split(/[\n,\s]+/).map(normalizeOrderNumber).filter(Boolean))];

export default function OrdersInvoicePage() {
  const printRef = useRef(null);
  const [input, setInput] = useState("");
  const [pageError, setPageError] = useState("");

  const {
    invoices,
    loading,
    fetchInvoiceByOrderNumber,
    fetchInvoicesByOrderNumbers,
    clearInvoices,
  } = useOrderInvoiceStore();

  const orderNumbers = useMemo(() => parseOrderNumbers(input), [input]);

  const printInvoices = useReactToPrint({
    contentRef: printRef,
  });

  const handleFetch = async () => {
    setPageError("");

    if (!orderNumbers.length) {
      setPageError("Enter at least one order number");
      return;
    }

    try {
      clearInvoices();

      // 🔥 IMPORTANT LOGIC
      if (orderNumbers.length === 1) {
        const single = await fetchInvoiceByOrderNumber(orderNumbers[0]);
        if (!single) {
          setPageError("Invoice not found");
        }
      } else {
        const many = await fetchInvoicesByOrderNumbers(orderNumbers);
        if (!many?.length) {
          setPageError("No invoices found");
        }
      }
    } catch (err) {
      console.error(err);
      setPageError(err?.message || "Failed to fetch invoice");
    }
  };

  const handlePrint = async () => {
    if (!invoices?.length) {
      await handleFetch();
    }

    if (!invoices?.length) return;

    setTimeout(() => {
      printInvoices?.();
    }, 80);
  };

  const handleReset = () => {
    setInput("");
    setPageError("");
    clearInvoices();
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="bg-white p-4 rounded-xl border">
        <h1 className="font-bold text-lg">Invoice Panel</h1>

        <textarea
          className="w-full border p-3 rounded mt-3"
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1056 or MIRAY-001056"
        />

        <div className="flex gap-2 mt-3">
          <button onClick={handleFetch} className="btn">
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Fetch
          </button>

          <button onClick={handlePrint} className="btn-dark">
            <FileText /> Print
          </button>

          <button onClick={handleReset} className="btn-outline">
            <RefreshCcw /> Reset
          </button>
        </div>

        {pageError && (
          <div className="text-red-500 mt-2 text-sm">{pageError}</div>
        )}
      </div>

      {/* Preview */}
      <div>
        {!invoices?.length ? (
          <div className="text-center text-gray-500 py-10">
            No invoices loaded
          </div>
        ) : (
          invoices.map((inv, i) => (
            <div key={i} className="border rounded mb-4 p-2">
              <InvoiceTemplate data={inv} />
            </div>
          ))
        )}
      </div>

      {/* Print hidden */}
      <div style={{ position: "absolute", left: "-99999px" }}>
        <div ref={printRef}>
          {invoices?.map((inv, i) => (
            <div key={i}>
              <InvoiceTemplate data={inv} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}