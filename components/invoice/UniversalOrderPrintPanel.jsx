"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  FileText,
  PackageCheck,
  Printer,
  Layers3,
  CheckSquare,
  Square,
} from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import PackingSlipTemplate from "@/components/invoice/PackingSlipTemplate";
import { SELLER } from "@/components/invoice/invoice.constants";

/* -------------------------------------------------------
   helpers
------------------------------------------------------- */
function normalizeOrder(order, courierName = "", trackingId = "") {
  if (!order) return null;

  const billing = {
    fullName:
      order.billingAddressSnapshot?.fullName || order.customerId?.name || "-",
    line1: order.billingAddressSnapshot?.line1 || "-",
    line2: order.billingAddressSnapshot?.line2 || "",
    city: order.billingAddressSnapshot?.city || "",
    pincode: order.billingAddressSnapshot?.pincode || "",
    state: order.billingAddressSnapshot?.state || "",
    phone: order.customerId?.phone || "",
    email: order.customerId?.email || "",
  };

  const shipping = {
    fullName:
      order.shippingAddressSnapshot?.fullName ||
      order.billingAddressSnapshot?.fullName ||
      "-",
    line1:
      order.shippingAddressSnapshot?.line1 ||
      order.billingAddressSnapshot?.line1 ||
      "-",
    line2:
      order.shippingAddressSnapshot?.line2 ||
      order.billingAddressSnapshot?.line2 ||
      "",
    city:
      order.shippingAddressSnapshot?.city ||
      order.billingAddressSnapshot?.city ||
      "",
    pincode:
      order.shippingAddressSnapshot?.pincode ||
      order.billingAddressSnapshot?.pincode ||
      "",
    state:
      order.shippingAddressSnapshot?.state ||
      order.billingAddressSnapshot?.state ||
      "",
  };

  const items = (order.items || []).map((it, idx) => {
    const snap = it.productSnapshot || {};
    return {
      sr: idx + 1,
      name: snap.title || it.productId?.title || "Unnamed Product",
      qty: Number(it.quantity || 0),
      priceIncl: Number(it.price || 0),
      gstRate: Number(it.gstRate || 5),

      size: it.selectedSize || it.size || it.variant?.size || "-",
      selectedSize: it.selectedSize || it.size || it.variant?.size || "-",

      hsnCode:
        it.hsnCode ||
        snap.hsnCode ||
        it.productId?.hsnCode ||
        it.product?.hsnCode ||
        "62105000",
    };
  });

  const couponCode = order.coupon?.code || "";
  const discount = Number(order.discount || order.coupon?.discount || 0);

  return {
    id: String(order._id || order.id || order.orderNumber || Math.random()),
    seller: SELLER,
    rawOrder: order,

    orderNumber: order.orderNumber || "-",
    orderDate: order.createdAt,
    invoiceNumber: order.invoiceNumber || order.orderNumber || "-",

    billing,
    shipping,

    courier: {
      name:
        courierName ||
        order.shipment?.courierName ||
        order.awbData?.courierName ||
        "-",
      awb:
        trackingId ||
        order.shipment?.trackingId ||
        order.shipment?.awb ||
        order.awbData?.awb ||
        "-",
    },

    items,

    totals: {
      taxable: Number(order.subtotal || 0),
      tax: Number(order.tax || 0),
      grandTotal: Number(order.finalPayable || order.total || 0),
      discount,
      couponCode,
      finalPayable: Number(order.finalPayable || order.total || 0),
    },

    payment: {
      title: order.paymentMethod || "-",
    },
  };
}

/* -------------------------------------------------------
   document block
------------------------------------------------------- */
function DocumentBlock({ data, type = "invoice" }) {
  if (!data) return null;

  return (
    <div className="print-doc-page">
      {type === "invoice" ? (
        <InvoiceTemplate data={data} />
      ) : (
        <PackingSlipTemplate data={data} />
      )}
    </div>
  );
}

/* -------------------------------------------------------
   bulk printable content
------------------------------------------------------- */
function BulkPrintableDocument({
  documents = [],
  docType = "invoice", // invoice | packing | both
}) {
  return (
    <div className="bg-white">
      <style>{`
        @media print {
          .print-doc-page {
            page-break-after: always;
            break-after: page;
          }
          .print-doc-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {documents.map((doc, index) => (
        <div key={`${doc.id}-${doc.orderNumber}-${index}`}>
          {(docType === "invoice" || docType === "both") && (
            <DocumentBlock data={doc} type="invoice" />
          )}

          {docType === "both" && (
            <div
              style={{
                pageBreakAfter:
                  index === documents.length - 1 ? "auto" : "always",
              }}
            />
          )}

          {(docType === "packing" || docType === "both") && (
            <DocumentBlock data={doc} type="packing" />
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------
   main component
------------------------------------------------------- */
export default function UniversalOrderPrintPanel({
  order,
  orders = [],
  courierName = "",
  trackingId = "",
  title = "Order Documents",
}) {
  const isBulkMode = Array.isArray(orders) && orders.length > 0;
  const inputOrders = isBulkMode ? orders : order ? [order] : [];

  const normalizedOrders = useMemo(() => {
    return inputOrders
      .map((o) => normalizeOrder(o, courierName, trackingId))
      .filter(Boolean);
  }, [inputOrders, courierName, trackingId]);

  const [selectedIds, setSelectedIds] = useState(() =>
    normalizedOrders.map((o) => o.id)
  );
  const [previewType, setPreviewType] = useState("invoice"); // invoice | packing | both

  const printableRef = useRef(null);

  const selectedDocuments = useMemo(() => {
    return normalizedOrders.filter((o) => selectedIds.includes(o.id));
  }, [normalizedOrders, selectedIds]);

  const selectedCount = selectedDocuments.length;

  const allSelected =
    normalizedOrders.length > 0 && selectedIds.length === normalizedOrders.length;

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === normalizedOrders.length
        ? []
        : normalizedOrders.map((o) => o.id)
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: printableRef,
    documentTitle:
      selectedCount === 1
        ? `${previewType}-${selectedDocuments[0]?.orderNumber || "order"}`
        : `${previewType}-bulk-${selectedCount}-orders`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        html, body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: white;
        }
      }
    `,
  });

  if (!normalizedOrders.length) return null;

  const previewDoc = selectedDocuments[0] || normalizedOrders[0];

  return (
    <div className="overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers3 size={16} className="text-gray-700" />
              <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {isBulkMode
                ? `${normalizedOrders.length} orders loaded • ${selectedCount} selected`
                : `Order #${previewDoc?.orderNumber || "-"}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPreviewType("invoice")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                previewType === "invoice"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Invoice
            </button>

            <button
              onClick={() => setPreviewType("packing")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                previewType === "packing"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Packing Slip
            </button>

            <button
              onClick={() => setPreviewType("both")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                previewType === "both"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Both
            </button>

            <button
              onClick={() => handlePrint?.()}
              disabled={!selectedCount}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Sidebar */}
        <div className="border-b border-gray-200 bg-white xl:border-b-0 xl:border-r">
          <div className="border-b border-gray-100 p-4">
            <button
              onClick={toggleAll}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? "Unselect All" : "Select All"}
            </button>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-3">
            <div className="space-y-2">
              {normalizedOrders.map((doc) => {
                const active = selectedIds.includes(doc.id);

                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleOne(doc.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {doc.orderNumber}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {doc.billing?.fullName || "-"}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {doc.items?.length || 0} item(s)
                        </p>
                      </div>

                      <div
                        className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {active ? "Selected" : "Select"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white p-6">
          {!selectedCount ? (
            <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
              Select at least one order to preview / print.
            </div>
          ) : previewType === "both" ? (
            <div className="space-y-10">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <FileText size={16} />
                  Invoice Preview
                </div>
                <div className="overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div
                    className="origin-top"
                    style={{ transform: "scale(0.58)", width: "210mm" }}
                  >
                    <InvoiceTemplate data={previewDoc} />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <PackageCheck size={16} />
                  Packing Slip Preview
                </div>
                <div className="overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div
                    className="origin-top"
                    style={{ transform: "scale(0.72)", width: "210mm" }}
                  >
                    <PackingSlipTemplate data={previewDoc} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
              {previewType === "invoice" ? (
                <div
                  className="origin-top"
                  style={{ transform: "scale(0.58)", width: "210mm" }}
                >
                  <InvoiceTemplate data={previewDoc} />
                </div>
              ) : (
                <div
                  className="origin-top"
                  style={{ transform: "scale(0.72)", width: "210mm" }}
                >
                  <PackingSlipTemplate data={previewDoc} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden print area */}
      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={printableRef}>
          <BulkPrintableDocument
            documents={selectedDocuments}
            docType={previewType}
          />
        </div>
      </div>
    </div>
  );
}