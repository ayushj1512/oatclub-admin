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
  XCircle,
} from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderInvoiceStore } from "@/store/orderInvoiceStore";
import { normalizeOrderNumberInput } from "@/utils/formatters";

const safe = (v) => String(v ?? "").trim();

const formatCurrency = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
};

const compactAddress = (addr) => {
  if (!addr) return "";
  return [
    safe(addr?.line1),
    safe(addr?.line2),
    safe(addr?.city),
    safe(addr?.state),
    safe(addr?.pincode),
    safe(addr?.country),
  ]
    .filter(Boolean)
    .join(", ");
};

const normalizeInvoiceForTemplate = (item) => {
  if (!item || typeof item !== "object") return item;

  const shipping = item?.shipping || item?.shippingAddressSnapshot || {};
  const billing = item?.billing || item?.billingAddressSnapshot || {};
  const totals = item?.totals || {};
  const payment = item?.payment || {};
  const seller = item?.seller || {};
  const raw = item?.raw || {};

  return {
    ...item,

    seller: {
      ...seller,
      address:
        safe(seller?.address) ||
        compactAddress({
          line1: seller?.address,
          city: seller?.city,
          state: seller?.state,
          pincode: seller?.pincode,
          country: seller?.country,
        }),
    },

    billing,
    shipping,

    billingAddressSnapshot: {
      fullName: safe(billing?.fullName),
      phone: safe(billing?.phone),
      email: safe(billing?.email),
      line1: safe(billing?.line1),
      line2: safe(billing?.line2),
      city: safe(billing?.city),
      state: safe(billing?.state),
      country: safe(billing?.country || "India"),
      pincode: safe(billing?.pincode),
    },

    shippingAddressSnapshot: {
      fullName: safe(shipping?.fullName),
      phone: safe(shipping?.phone),
      email: safe(shipping?.email),
      line1: safe(shipping?.line1),
      line2: safe(shipping?.line2),
      city: safe(shipping?.city),
      state: safe(shipping?.state),
      country: safe(shipping?.country || "India"),
      pincode: safe(shipping?.pincode),
    },

    customerName:
      safe(item?.customerName) ||
      safe(shipping?.fullName) ||
      safe(billing?.fullName),

    orderDate: item?.orderDate || item?.createdAt || item?.updatedAt || "",
    createdAt: item?.createdAt || item?.orderDate || item?.updatedAt || "",

    grandTotal:
      totals?.grandTotal ?? totals?.finalPayable ?? item?.grandTotal ?? null,
    totalAmount:
      totals?.grandTotal ?? totals?.finalPayable ?? item?.totalAmount ?? null,
    finalAmount:
      totals?.finalPayable ?? totals?.grandTotal ?? item?.finalAmount ?? null,
    amount:
      totals?.grandTotal ?? totals?.finalPayable ?? item?.amount ?? null,

    status:
      safe(item?.status) ||
      safe(raw?.fulfillmentStatus) ||
      safe(payment?.status) ||
      "Ready",

    orderStatus:
      safe(item?.orderStatus) || safe(raw?.fulfillmentStatus) || "",

    paymentStatus: safe(item?.paymentStatus) || safe(payment?.status) || "",
    paymentMethod: safe(item?.paymentMethod) || safe(payment?.method) || "",
    paymentTitle: safe(item?.paymentTitle) || safe(payment?.title) || "",

    courierName: safe(item?.courierName) || safe(item?.courier?.name) || "-",
    awb: safe(item?.awb) || safe(item?.courier?.awb) || "-",
  };
};

const getInvoiceAmount = (item) => {
  const candidates = [
    item?.grandTotal,
    item?.totalAmount,
    item?.finalAmount,
    item?.amount,
    item?.totals?.grandTotal,
    item?.totals?.finalPayable,
    item?.summary?.grandTotal,
  ];

  for (const val of candidates) {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }

  return null;
};

const getInvoiceCustomerName = (item) => {
  return (
    safe(item?.customerName) ||
    safe(item?.shipping?.fullName) ||
    safe(item?.billing?.fullName) ||
    safe(item?.shippingAddressSnapshot?.fullName) ||
    safe(item?.billingAddressSnapshot?.fullName) ||
    safe(item?.customer?.name) ||
    safe(item?.user?.name) ||
    "Customer"
  );
};

const getInvoiceDate = (item) => {
  return item?.orderDate || item?.createdAt || item?.updatedAt || "";
};

const getInvoiceStatus = (item) => {
  return (
    safe(item?.status) ||
    safe(item?.orderStatus) ||
    safe(item?.raw?.fulfillmentStatus) ||
    safe(item?.payment?.status) ||
    "Ready"
  );
};

const getInvoiceAddress = (item) => {
  return (
    compactAddress(item?.shipping) ||
    compactAddress(item?.shippingAddressSnapshot) ||
    compactAddress(item?.billing) ||
    compactAddress(item?.billingAddressSnapshot) ||
    ""
  );
};

const normalizeOrderNumber = (value = "") => {
  return normalizeOrderNumberInput(value);
};

const tokenizeInput = (input = "") =>
  String(input)
    .split(/[\n,\s]+/)
    .map((x) => safe(x))
    .filter(Boolean);

const analyzeOrderInput = (input = "") => {
  const tokens = tokenizeInput(input);

  const valid = [];
  const invalid = [];
  const seen = new Set();
  const duplicateValues = [];

  tokens.forEach((token) => {
    const normalized = normalizeOrderNumber(token);

    if (!normalized) {
      invalid.push(token);
      return;
    }

    if (seen.has(normalized)) {
      duplicateValues.push(normalized);
      return;
    }

    seen.add(normalized);
    valid.push(normalized);
  });

  return {
    rawCount: tokens.length,
    valid,
    invalid,
    duplicateValues: [...new Set(duplicateValues)],
  };
};

const SAMPLE_INPUT = `1100
12
123
1201`;

function StatCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function Chip({ children, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-zinc-200 bg-white text-zinc-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

function Banner({ type = "info", children }) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : type === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-800";

  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "warning"
      ? AlertCircle
      : type === "error"
      ? XCircle
      : AlertCircle;

  return (
    <div className={`rounded-2xl border p-3 ${styles}`}>
      <div className="flex items-start gap-2">
        <Icon size={16} className="mt-0.5 shrink-0" />
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="space-y-3 p-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
        <div className="h-32 w-full animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}

export default function OrdersInvoicePage() {
  const printRef = useRef(null);

  const [input, setInput] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");
  const [collapsedMap, setCollapsedMap] = useState({});
  const [isPasting, setIsPasting] = useState(false);

  const {
    invoices,
    invoice,
    loading,
    error,
    fetchInvoiceByOrderNumber,
    fetchInvoicesByOrderNumbers,
    clearInvoice,
    clearInvoices,
  } = useOrderInvoiceStore();

  const parsed = useMemo(() => analyzeOrderInput(input), [input]);
  const orderNumbers = parsed.valid;

  const visibleInvoices = useMemo(() => {
    const base = Array.isArray(invoices) && invoices.length
      ? invoices
      : invoice
      ? [invoice]
      : [];

    return base.map(normalizeInvoiceForTemplate);
  }, [invoices, invoice]);

  const loadedOrderNumbers = useMemo(() => {
    return new Set(
      visibleInvoices
        .map((item) => safe(item?.orderNumber).toUpperCase())
        .filter(Boolean)
    );
  }, [visibleInvoices]);

  const missingOrderNumbers = useMemo(() => {
    if (!orderNumbers.length || !visibleInvoices.length) return [];
    return orderNumbers.filter((num) => !loadedOrderNumbers.has(num));
  }, [orderNumbers, visibleInvoices, loadedOrderNumbers]);

  const filteredInvoices = useMemo(() => {
    const q = safe(previewSearch).toLowerCase();
    if (!q) return visibleInvoices;

    return visibleInvoices.filter((item) => {
      const haystack = [
        item?.orderNumber,
        getInvoiceCustomerName(item),
        getInvoiceStatus(item),
        getInvoiceAddress(item),
        item?.shipping?.phone,
        item?.shipping?.email,
        item?.billing?.phone,
        item?.billing?.email,
      ]
        .map((x) => safe(x).toLowerCase())
        .join(" ");

      return haystack.includes(q);
    });
  }, [previewSearch, visibleInvoices]);

  useEffect(() => {
    const next = {};
    visibleInvoices.forEach((item, index) => {
      const key = item?.orderNumber || `invoice-${index}`;
      next[key] = collapsedMap[key] ?? false;
    });
    setCollapsedMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleInvoices.length]);

  const printInvoices = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoices-${visibleInvoices.length || 0}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        html, body {
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

  const resetMessages = () => {
    setPageError("");
    setSuccessMessage("");
    setWarningMessage("");
  };

  const fetchData = async () => {
    resetMessages();

    if (!orderNumbers.length) {
      setPageError("Please enter at least one valid order number.");
      return [];
    }

    try {
      clearInvoice?.();
      clearInvoices?.();

      if (orderNumbers.length === 1) {
        const one = await fetchInvoiceByOrderNumber(orderNumbers[0]);
        const list = one ? [normalizeInvoiceForTemplate(one)] : [];

        if (!list.length) {
          setPageError("No invoice found for the given order number.");
          return [];
        }

        setSuccessMessage("1 invoice loaded successfully.");
        return list;
      }

      const many = await fetchInvoicesByOrderNumbers(orderNumbers);
      const list = Array.isArray(many)
        ? many.map(normalizeInvoiceForTemplate)
        : [];

      if (!list.length) {
        setPageError("No invoices found for the given order numbers.");
        return [];
      }

      const fetchedSet = new Set(
        list.map((x) => safe(x?.orderNumber).toUpperCase()).filter(Boolean)
      );

      const missing = orderNumbers.filter((num) => !fetchedSet.has(num));

      setSuccessMessage(
        `${list.length} invoice${list.length === 1 ? "" : "s"} loaded successfully.`
      );

      if (missing.length) {
        setWarningMessage(
          `${missing.length} order number${
            missing.length === 1 ? "" : "s"
          } did not return an invoice.`
        );
      }

      return list;
    } catch (err) {
      const msg =
        err?.message ||
        "Failed to load invoice. Please check the order number and try again.";

      setPageError(msg);
      return [];
    }
  };

  const handleFetch = async () => {
    await fetchData();
  };

  const handlePrint = async () => {
    let list = visibleInvoices;

    if (!list.length) {
      list = await fetchData();
    }

    if (!Array.isArray(list) || !list.length) return;

    setTimeout(() => {
      printInvoices?.();
    }, 80);
  };

  const handleReset = () => {
    setInput("");
    setPreviewSearch("");
    setCollapsedMap({});
    resetMessages();
    clearInvoice?.();
    clearInvoices?.();
  };

  const handlePaste = async () => {
    try {
      setIsPasting(true);
      const text = await navigator.clipboard.readText();
      setInput((prev) => {
        const current = safe(prev);
        if (!current) return text;
        return `${current}\n${text}`;
      });
    } catch {
      setPageError("Clipboard access failed. Please paste manually.");
    } finally {
      setIsPasting(false);
    }
  };

  const handleSample = () => {
    setInput(SAMPLE_INPUT);
    resetMessages();
  };

  const expandAll = () => {
    const next = {};
    visibleInvoices.forEach((item, index) => {
      const key = item?.orderNumber || `invoice-${index}`;
      next[key] = false;
    });
    setCollapsedMap(next);
  };

  const collapseAll = () => {
    const next = {};
    visibleInvoices.forEach((item, index) => {
      const key = item?.orderNumber || `invoice-${index}`;
      next[key] = true;
    });
    setCollapsedMap(next);
  };

  const toggleCard = (key) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const isEnter = e.key === "Enter";
      const withCommand = e.ctrlKey || e.metaKey;
      if (isEnter && withCommand) {
        e.preventDefault();
        if (!loading) handleFetch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const printButtonLabel = visibleInvoices.length
    ? `Print Loaded (${visibleInvoices.length})`
    : orderNumbers.length
    ? `Load & Print (${orderNumbers.length})`
    : "Print";

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Invoice Panel
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Enter one or more backend order numbers exactly as shown on orders.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading || isPasting}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPasting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ClipboardPaste size={16} />
                )}
                Paste
              </button>

              <button
                type="button"
                onClick={handleSample}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sample
              </button>

              <button
                type="button"
                onClick={() => setInput("")}
                disabled={loading || !input}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Input
              </button>

              <div className="ml-auto text-xs text-zinc-500">
                Tip: Press <span className="font-semibold">Ctrl/Cmd + Enter</span>{" "}
                to load invoices
              </div>
            </div>

            <textarea
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Examples:
000110
000012
000123, 001201`}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Pasted" value={parsed.rawCount} />
              <StatCard label="Valid" value={parsed.valid.length} tone="green" />
              <StatCard
                label="Invalid"
                value={parsed.invalid.length}
                tone={parsed.invalid.length ? "red" : "default"}
              />
              <StatCard
                label="Duplicates"
                value={parsed.duplicateValues.length}
                tone={parsed.duplicateValues.length ? "amber" : "default"}
              />
            </div>

            {!!parsed.valid.length && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Normalized Order Numbers ({parsed.valid.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsed.valid.map((num) => (
                    <Chip key={num}>{num}</Chip>
                  ))}
                </div>
              </div>
            )}

            {!!parsed.invalid.length && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                  Invalid Entries ({parsed.invalid.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsed.invalid.map((item, index) => (
                    <Chip key={`${item}-${index}`} tone="red">
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {!!parsed.duplicateValues.length && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Removed Duplicates ({parsed.duplicateValues.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsed.duplicateValues.map((item) => (
                    <Chip key={item} tone="amber">
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFetch}
                disabled={loading}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  loading
                    ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                    : "bg-blue-600 text-white hover:bg-blue-700",
                ].join(" ")}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {orderNumbers.length
                  ? `Load Invoices (${orderNumbers.length})`
                  : "Load Invoices"}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={loading}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  loading
                    ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                    : "bg-zinc-900 text-white hover:bg-black",
                ].join(" ")}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                {printButtonLabel}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} />
                Reset
              </button>
            </div>

            {successMessage ? <Banner type="success">{successMessage}</Banner> : null}

            {warningMessage ? (
              <Banner type="warning">
                <div className="space-y-2">
                  <div>{warningMessage}</div>
                  {!!missingOrderNumbers.length && (
                    <div className="flex flex-wrap gap-2">
                      {missingOrderNumbers.map((num) => (
                        <Chip key={num} tone="amber">
                          {num}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
              </Banner>
            ) : null}

            {(pageError || error) && (
              <Banner type="error">{pageError || error}</Banner>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Invoice Preview</h2>
              <p className="text-sm text-zinc-600">
                {visibleInvoices.length} invoice
                {visibleInvoices.length === 1 ? "" : "s"} loaded
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[240px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="Search loaded invoices"
                  className="w-full rounded-xl border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
                />
              </div>

              <button
                type="button"
                onClick={expandAll}
                disabled={!filteredInvoices.length}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronDown size={16} />
                Expand All
              </button>

              <button
                type="button"
                onClick={collapseAll}
                disabled={!filteredInvoices.length}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronUp size={16} />
                Collapse All
              </button>
            </div>
          </div>

          {!loading && !visibleInvoices.length ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Eye size={20} className="text-zinc-500" />
              </div>
              <div className="text-sm font-semibold text-zinc-800">
                No invoices loaded yet
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                Enter order numbers above and click{" "}
                <span className="font-semibold">Load Invoices</span>.
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </div>
          ) : null}

          {!loading && visibleInvoices.length > 0 && !filteredInvoices.length ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
              No loaded invoices match your search.
            </div>
          ) : null}

          {!loading && filteredInvoices.length > 0 ? (
            <div className="space-y-4">
              {filteredInvoices.map((item, index) => {
                const key = item?.orderNumber || `invoice-${index}`;
                const isCollapsed = !!collapsedMap[key];
                const customerName = getInvoiceCustomerName(item);
                const invoiceDate = formatDate(getInvoiceDate(item));
                const amount = formatCurrency(getInvoiceAmount(item));
                const status = getInvoiceStatus(item);
                const address = getInvoiceAddress(item);

                return (
                  <div
                    key={`${item?.orderNumber || "invoice"}-${index}`}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCard(key)}
                      className="w-full bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-zinc-900">
                              {item?.orderNumber || `Invoice ${index + 1}`}
                            </span>
                            <Chip>{status}</Chip>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                            <span>
                              <span className="font-medium text-zinc-800">
                                Customer:
                              </span>{" "}
                              {customerName}
                            </span>
                            <span>
                              <span className="font-medium text-zinc-800">
                                Date:
                              </span>{" "}
                              {invoiceDate}
                            </span>
                            <span>
                              <span className="font-medium text-zinc-800">
                                Amount:
                              </span>{" "}
                              {amount}
                            </span>
                          </div>

                          {!!address && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-zinc-600">
                              <MapPin size={15} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{address}</span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-zinc-500">
                          {isCollapsed ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronUp size={18} />
                          )}
                        </div>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="border-t border-zinc-200 bg-white p-3 md:p-4">
                        <InvoiceTemplate data={item} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={printRef}>
          {visibleInvoices.map((item, index) => (
            <div
              key={`print-${item?.orderNumber || "invoice"}-${index}`}
              className="invoice-print-page"
            >
              <InvoiceTemplate data={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
