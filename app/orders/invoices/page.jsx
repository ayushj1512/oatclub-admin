"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Eye,
  FileText,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
} from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderStore } from "@/store/orderStore";
import { normalizeOrderNumberInput } from "@/utils/formatters";

const safe = (value) => String(value ?? "").trim();

const unique = (values = []) =>
  [...new Set(values.map(safe).filter(Boolean))];

const parseInput = (input = "") => {
  const tokens = String(input)
    .split(/[\n,\s]+/)
    .map(safe)
    .filter(Boolean);

  const valid = [];
  const invalid = [];
  const duplicates = [];
  const seen = new Set();

  tokens.forEach((token) => {
    const normalized = normalizeOrderNumberInput(token);

    if (!normalized) {
      invalid.push(token);
      return;
    }

    if (seen.has(normalized)) {
      duplicates.push(normalized);
      return;
    }

    seen.add(normalized);
    valid.push(normalized);
  });

  return {
    total: tokens.length,
    valid,
    invalid,
    duplicates: unique(duplicates),
  };
};

const formatCurrency = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(number);
};

const formatDate = (value) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const addressText = (address = {}) =>
  [
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.pincode,
    address?.country,
  ]
    .map(safe)
    .filter(Boolean)
    .join(", ");

const getAmount = (invoice = {}) =>
  Number(
    invoice?.totals?.finalPayable ??
      invoice?.totals?.grandTotal ??
      invoice?.finalPayable ??
      invoice?.totalAmount ??
      0
  );

const getStatus = (invoice = {}) =>
  safe(
    invoice?.status?.fulfillment ||
      invoice?.raw?.fulfillmentStatus ||
      invoice?.payment?.status ||
      invoice?.status
  ) || "Ready";

const getCustomerName = (invoice = {}) =>
  safe(
    invoice?.shipping?.fullName ||
      invoice?.billing?.fullName ||
      invoice?.customer?.name
  ) || "Customer";

const getAddress = (invoice = {}) =>
  addressText(invoice?.shipping) ||
  addressText(invoice?.billing);

const SAMPLE_INPUT = `000001
000002
000003`;

export default function OrdersInvoicePage() {
  const printRef = useRef(null);

  const {
    invoices,
    invoiceLoading,
    invoiceError,
    invoiceMissingOrderNumbers,
    fetchInvoicesByOrderNumbers,
    clearInvoices,
  } = useOrderStore();

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [pasting, setPasting] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);

  const parsed = useMemo(() => parseInput(input), [input]);

  const loadedInvoices = useMemo(
    () => (Array.isArray(invoices) ? invoices : []),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    const query = safe(search).toLowerCase();

    if (!query) return loadedInvoices;

    return loadedInvoices.filter((invoice) => {
      const haystack = [
        invoice?.orderNumber,
        invoice?.invoiceNumber,
        getCustomerName(invoice),
        getStatus(invoice),
        getAddress(invoice),
        invoice?.shipping?.phone,
        invoice?.shipping?.email,
        invoice?.billing?.phone,
        invoice?.billing?.email,
        invoice?.courier?.awb,
      ]
        .map((value) => safe(value).toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [loadedInvoices, search]);

  const printInvoices = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoices-${loadedInvoices.length}`,

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

        .invoice-print-page {
          break-after: page;
          page-break-after: always;
        }

        .invoice-print-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
      }
    `,
  });

  useEffect(() => {
    if (!pendingPrint || !loadedInvoices.length) return undefined;

    const timer = window.setTimeout(() => {
      printInvoices?.();
      setPendingPrint(false);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [pendingPrint, loadedInvoices, printInvoices]);

  useEffect(() => {
    setCollapsed((previous) => {
      const next = {};

      loadedInvoices.forEach((invoice, index) => {
        const key =
          safe(invoice?.orderNumber) || `invoice-${index}`;

        next[key] = previous[key] ?? false;
      });

      return next;
    });
  }, [loadedInvoices]);

  const resetMessages = () => {
    setMessage("");
    setPageError("");
  };

  const loadInvoices = async () => {
    resetMessages();

    if (!parsed.valid.length) {
      setPageError("Enter at least one valid order number.");
      return [];
    }

    try {
      const result = await fetchInvoicesByOrderNumbers(
        parsed.valid
      );

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.invoices)
          ? result.invoices
          : [];

      if (!list.length) {
        setPageError("No invoices found.");
        return [];
      }

      const missing = Array.isArray(
        result?.missingOrderNumbers
      )
        ? result.missingOrderNumbers
        : [];

      setMessage(
        `${list.length} invoice${
          list.length === 1 ? "" : "s"
        } loaded${missing.length ? `, ${missing.length} missing` : ""}.`
      );

      return list;
    } catch (error) {
      setPageError(
        error?.message || "Failed to load invoices."
      );

      return [];
    }
  };

  const handlePrint = async () => {
    let list = loadedInvoices;

    if (!list.length) {
      list = await loadInvoices();
    }

    if (!list.length) return;

    setPendingPrint(true);
  };

  const handlePaste = async () => {
    try {
      setPasting(true);

      const text = await navigator.clipboard.readText();

      setInput((current) =>
        safe(current) ? `${current}\n${text}` : text
      );
    } catch {
      setPageError("Clipboard access failed.");
    } finally {
      setPasting(false);
    }
  };

  const handleReset = () => {
    setInput("");
    setSearch("");
    setCollapsed({});
    resetMessages();
    clearInvoices();
  };

  const setAllCollapsed = (value) => {
    const next = {};

    loadedInvoices.forEach((invoice, index) => {
      const key =
        safe(invoice?.orderNumber) || `invoice-${index}`;

      next[key] = value;
    });

    setCollapsed(next);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <h1 className="text-2xl font-bold text-zinc-950">
            Invoice Panel
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Enter one or more order numbers to fetch invoices
            from the backend.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={handlePaste}
              disabled={invoiceLoading || pasting}
            >
              {pasting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ClipboardPaste size={16} />
              )}
              Paste
            </Button>

            <Button
              onClick={() => setInput(SAMPLE_INPUT)}
              disabled={invoiceLoading}
            >
              Sample
            </Button>

            <Button
              onClick={() => setInput("")}
              disabled={invoiceLoading || !input}
            >
              Clear Input
            </Button>
          </div>

          <textarea
            rows={6}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`000001
000002
000003`}
            className="mt-3 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Pasted" value={parsed.total} />
            <Stat label="Valid" value={parsed.valid.length} tone="green" />
            <Stat label="Invalid" value={parsed.invalid.length} tone="red" />
            <Stat
              label="Duplicates"
              value={parsed.duplicates.length}
              tone="amber"
            />
          </div>

          {!!parsed.valid.length && (
            <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-zinc-50 p-3">
              {parsed.valid.map((number) => (
                <Chip key={number}>{number}</Chip>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={loadInvoices}
              disabled={invoiceLoading || !parsed.valid.length}
            >
              {invoiceLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}

              Load Invoices ({parsed.valid.length})
            </Button>

            <Button
              variant="dark"
              onClick={handlePrint}
              disabled={
                invoiceLoading ||
                (!parsed.valid.length && !loadedInvoices.length)
              }
            >
              <FileText size={16} />

              {loadedInvoices.length
                ? `Print Loaded (${loadedInvoices.length})`
                : `Load & Print (${parsed.valid.length})`}
            </Button>

            <Button
              onClick={handleReset}
              disabled={invoiceLoading}
            >
              <RefreshCcw size={16} />
              Reset
            </Button>
          </div>

          {message && (
            <Banner tone="success">
              <CheckCircle2 size={16} />
              {message}
            </Banner>
          )}

          {(pageError || invoiceError) && (
            <Banner tone="error">
              <AlertCircle size={16} />
              {pageError || invoiceError}
            </Banner>
          )}

          {!!invoiceMissingOrderNumbers.length && (
            <Banner tone="warning">
              <AlertCircle size={16} />

              <div>
                <div className="font-semibold">
                  Missing invoices
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {invoiceMissingOrderNumbers.map((number) => (
                    <Chip key={number}>{number}</Chip>
                  ))}
                </div>
              </div>
            </Banner>
          )}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-950">
                Invoice Preview
              </h2>

              <p className="text-sm text-zinc-500">
                {loadedInvoices.length} invoice
                {loadedInvoices.length === 1 ? "" : "s"} loaded
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search invoices"
                  className="rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none"
                />
              </div>

              <Button
                onClick={() => setAllCollapsed(false)}
                disabled={!filteredInvoices.length}
              >
                <ChevronDown size={16} />
                Expand
              </Button>

              <Button
                onClick={() => setAllCollapsed(true)}
                disabled={!filteredInvoices.length}
              >
                <ChevronUp size={16} />
                Collapse
              </Button>
            </div>
          </div>

          {invoiceLoading && (
            <div className="mt-4 flex items-center justify-center rounded-2xl border border-zinc-200 p-10 text-sm text-zinc-500">
              <Loader2 size={18} className="mr-2 animate-spin" />
              Loading invoices...
            </div>
          )}

          {!invoiceLoading && !loadedInvoices.length && (
            <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center">
              <Eye
                size={22}
                className="mx-auto text-zinc-400"
              />

              <div className="mt-2 text-sm font-semibold">
                No invoices loaded
              </div>
            </div>
          )}

          {!invoiceLoading && filteredInvoices.length > 0 && (
            <div className="mt-4 space-y-3">
              {filteredInvoices.map((invoice, index) => {
                const key =
                  safe(invoice?.orderNumber) ||
                  `invoice-${index}`;

                const isCollapsed = Boolean(collapsed[key]);

                return (
                  <article
                    key={key}
                    className="overflow-hidden rounded-2xl border border-zinc-200"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((current) => ({
                          ...current,
                          [key]: !current[key],
                        }))
                      }
                      className="w-full bg-zinc-50 p-4 text-left hover:bg-zinc-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-zinc-950">
                              {invoice?.orderNumber}
                            </span>

                            <Chip>{getStatus(invoice)}</Chip>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                            <span>
                              {getCustomerName(invoice)}
                            </span>

                            <span>
                              {formatDate(
                                invoice?.orderDate ||
                                  invoice?.createdAt
                              )}
                            </span>

                            <span>
                              {formatCurrency(getAmount(invoice))}
                            </span>
                          </div>

                          {!!getAddress(invoice) && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-zinc-500">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0"
                              />

                              <span>{getAddress(invoice)}</span>
                            </div>
                          )}
                        </div>

                        {isCollapsed ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronUp size={18} />
                        )}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="border-t border-zinc-200 p-3">
                        <InvoiceTemplate data={invoice} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-200vw",
          top: 0,
          width: "210mm",
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div ref={printRef}>
          {loadedInvoices.map((invoice, index) => (
            <div
              key={`print-${
                invoice?.invoiceNumber ||
                invoice?.orderNumber ||
                index
              }`}
              className="invoice-print-page"
            >
              <InvoiceTemplate data={invoice} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }) {
  const tones = {
    default: "border-zinc-200 bg-zinc-50 text-zinc-800",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${
        tones[tone] || tones.default
      }`}
    >
      <div className="text-xs font-semibold uppercase">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

function Banner({ children, tone }) {
  const tones = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-2xl border p-3 text-sm ${
        tones[tone]
      }`}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "default",
}) {
  const variants = {
    default: disabled
      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",

    primary: disabled
      ? "cursor-not-allowed border-blue-200 bg-blue-300 text-white"
      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",

    dark: disabled
      ? "cursor-not-allowed border-zinc-300 bg-zinc-300 text-white"
      : "border-zinc-900 bg-zinc-900 text-white hover:bg-black",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        variants[variant]
      }`}
    >
      {children}
    </button>
  );
}