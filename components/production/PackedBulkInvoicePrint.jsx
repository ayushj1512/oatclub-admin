"use client";

import { useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText } from "lucide-react";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { SELLER } from "@/components/invoice/invoice.constants";

const safe = (v) => String(v ?? "").trim();

const getShiprocketAwb = (o) => safe(o?.shipment?.shiprocket?.awb);
const getShiprocketCourier = (o) => safe(o?.shipment?.shiprocket?.courierName);

const normalizeOrderForInvoice = (order) => {
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
        size: it.selectedSize || it.size || it.variant?.size || "-",
        selectedSize: it.selectedSize || it.size || it.variant?.size || "-",
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
      name: getShiprocketCourier(order) || "-",
      awb: getShiprocketAwb(order) || "-",
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
};

export default function PackedBulkInvoicePrint({
  orders = [],
  selectedIds = {},
  disabled = false,
}) {
  const printRef = useRef(null);

  const filteredOrders = useMemo(() => {
    return Array.isArray(orders) ? orders.filter(Boolean) : [];
  }, [orders]);

  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((o) => !!selectedIds?.[String(o?._id)]);
  }, [filteredOrders, selectedIds]);

  const selectedInvoices = useMemo(() => {
    return selectedOrders.map(normalizeOrderForInvoice).filter(Boolean);
  }, [selectedOrders]);

  const allInvoices = useMemo(() => {
    return filteredOrders.map(normalizeOrderForInvoice).filter(Boolean);
  }, [filteredOrders]);

  const printSelectedInvoices = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoices-Selected-${selectedInvoices.length}`,
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

  const printAllInvoices = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoices-All-${allInvoices.length}`,
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

  const handlePrintSelected = () => {
    if (!selectedInvoices.length) {
      alert("Please select at least one order to print invoices.");
      return;
    }
    setTimeout(() => {
      printSelectedInvoices?.();
    }, 50);
  };

  const handlePrintAll = () => {
    if (!allInvoices.length) {
      alert("No orders available to print invoices.");
      return;
    }
    setTimeout(() => {
      printAllInvoices?.();
    }, 50);
  };

  const invoicesToRender =
    selectedInvoices.length > 0 ? selectedInvoices : allInvoices;

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintSelected}
            disabled={disabled || selectedOrders.length === 0}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              disabled || selectedOrders.length === 0
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-blue-600 text-white hover:bg-blue-700",
            ].join(" ")}
          >
            <FileText size={16} />
            Print Selected Invoices ({selectedOrders.length})
          </button>

          <button
            type="button"
            onClick={handlePrintAll}
            disabled={disabled || filteredOrders.length === 0}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              disabled || filteredOrders.length === 0
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-zinc-900 text-white hover:bg-black",
            ].join(" ")}
          >
            <FileText size={16} />
            Print All Filtered Invoices ({filteredOrders.length})
          </button>

          <div className="text-xs text-zinc-500">
            Selected orders print first. If nothing is selected, you can print all
            filtered invoices together.
          </div>
        </div>
      </div>

      {/* Hidden print content */}
      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={printRef}>
          {invoicesToRender.map((data, index) => (
            <div key={`${data.orderNumber}-${index}`} className="bulk-invoice-page">
              <InvoiceTemplate data={data} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}