"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  PackageCheck,
  Printer,
  Layers3,
  CheckSquare,
  Square,
  FileText,
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
function BulkPrintableDocument({ documents = [], docType = "invoice" }) {
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

  const [selectedIds, setSelectedIds] = useState([]);
  const [docType, setDocType] = useState("invoice");

  useEffect(() => {
    setSelectedIds(normalizedOrders.map((o) => o.id));
  }, [normalizedOrders]);

  const printableRef = useRef(null);

  const selectedDocuments = useMemo(() => {
    return normalizedOrders.filter((o) => selectedIds.includes(o.id));
  }, [normalizedOrders, selectedIds]);

  const selectedCount = selectedDocuments.length;

  const allSelected =
    normalizedOrders.length > 0 &&
    selectedIds.length === normalizedOrders.length;

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
        ? `${docType}-${selectedDocuments[0]?.orderNumber || "order"}`
        : `${docType}-bulk-${selectedCount}-orders`,
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

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/70">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 size={16} className="text-zinc-700" />
                <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {isBulkMode
                  ? `${normalizedOrders.length} orders loaded • ${selectedCount} selected`
                  : `Order #${normalizedOrders[0]?.orderNumber || "-"}`}
              </p>
            </div>

            <button
              onClick={() => handlePrint?.()}
              disabled={!selectedCount}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDocType("invoice")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                docType === "invoice"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FileText size={14} />
                Invoice
              </span>
            </button>

            <button
              onClick={() => setDocType("packing")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                docType === "packing"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <PackageCheck size={14} />
                Packing Slip
              </span>
            </button>

            <button
              onClick={() => setDocType("both")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                docType === "both"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Printer size={14} />
                Both
              </span>
            </button>

            {isBulkMode ? (
              <button
                onClick={toggleAll}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {allSelected ? (
                  <CheckSquare size={14} />
                ) : (
                  <Square size={14} />
                )}
                {allSelected ? "Unselect All" : "Select All"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Orders list only */}
      <div className="p-4">
        {isBulkMode ? (
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
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {doc.orderNumber}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {doc.billing?.fullName || "-"}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {doc.items?.length || 0} item(s)
                      </p>
                    </div>

                    <div
                      className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {active ? "Selected" : "Select"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {normalizedOrders[0]?.orderNumber || "-"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {normalizedOrders[0]?.billing?.fullName || "-"}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {normalizedOrders[0]?.items?.length || 0} item(s)
                </p>
              </div>

              <div className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                Ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden print area */}
      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={printableRef}>
          <BulkPrintableDocument
            documents={selectedDocuments}
            docType={docType}
          />
        </div>
      </div>
    </div>
  );
}