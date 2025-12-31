"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";

import { useWordpressStore } from "@/store/wordpress.store";

// ✅ Use YOUR templates (no edits)
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import PackingSlipTemplate from "@/components/invoice/PackingSlipTemplate";

// ✅ Seller constant (if your InvoiceTemplate expects `seller` in data)
import { SELLER } from "@/components/invoice/invoice.constants";

export default function WordpressOrderDetailsPage() {
  const { id } = useParams();

  const { order, loading, error, fetchOrderById, clearOrder } =
    useWordpressStore();

  // ✅ Print Refs
  const packingRef = useRef(null);
  const invoiceRef = useRef(null);

  // ✅ Inputs for courier + awb
  const [courierName, setCourierName] = useState("");
  const [awb, setAwb] = useState("");

  // ✅ Preview Tabs (Invoice first)
  const [previewTab, setPreviewTab] = useState("invoice"); // invoice | packing

  useEffect(() => {
    if (!id) return;
    fetchOrderById(id);
    return () => clearOrder();
  }, [id, fetchOrderById, clearOrder]);

  // ✅ Pre-fill input from meta once order loads
  useEffect(() => {
    if (!order) return;

    const metaCourier =
      order.meta_data?.find((m) => m.key === "courier_name")?.value || "";

    const metaAwb =
      order.meta_data?.find((m) => m.key === "awb")?.value ||
      order.meta_data?.find((m) => m.key === "_tracking_number")?.value ||
      "";

    if (!courierName) setCourierName(metaCourier);
    if (!awb) setAwb(metaAwb);
  }, [order]);

  /* ============================================================
     ✅ NORMALIZE ORDER FOR YOUR TEMPLATES
  ============================================================ */
  const normalized = useMemo(() => {
    if (!order) return null;

    const metaCourier =
      order.meta_data?.find((m) => m.key === "courier_name")?.value || "";

    const metaAwb =
      order.meta_data?.find((m) => m.key === "awb")?.value ||
      order.meta_data?.find((m) => m.key === "_tracking_number")?.value ||
      "";

    const finalCourierName =
      courierName ||
      metaCourier ||
      order.shipping_lines?.[0]?.method_title ||
      "-";

    const finalAwb = awb || metaAwb || "";

    const billing = {
      fullName: `${order.billing?.first_name || ""} ${
        order.billing?.last_name || ""
      }`.trim(),
      line1: order.billing?.address_1 || "-",
      line2: order.billing?.address_2 || "",
      city: order.billing?.city || "",
      pincode: order.billing?.postcode || "",
      state: order.billing?.state || "",
      phone: order.billing?.phone || "",
      email: order.billing?.email || "",
    };

    const shipping = {
      fullName: `${order.shipping?.first_name || ""} ${
        order.shipping?.last_name || ""
      }`.trim(),
      line1: order.shipping?.address_1 || order.billing?.address_1 || "-",
      line2: order.shipping?.address_2 || order.billing?.address_2 || "",
      city: order.shipping?.city || order.billing?.city || "",
      pincode: order.shipping?.postcode || order.billing?.postcode || "",
      state: order.shipping?.state || order.billing?.state || "",
    };

    const items =
      order.line_items?.map((it, idx) => {
        const qty = Number(it.quantity || 0);
        const lineTotal = Number(it.total || 0);

        const priceIncl =
          qty > 0 ? +(lineTotal / qty).toFixed(2) : Number(it.price || 0);

        return {
          sr: idx + 1,
          name: it.name || "-",
          qty,
          priceIncl,
          gstRate: 5,
        };
      }) || [];

    const grandTotal = Number(order.total || 0);
    const tax = Number(order.total_tax || 0);
    const taxable = tax > 0 ? +(grandTotal - tax).toFixed(2) : grandTotal;

    return {
      seller: SELLER,
      orderNumber: order.number,
      orderDate: order.date_created,
      invoiceNumber: order.number,

      billing,
      shipping,

      courier: {
        name: finalCourierName,
        awb: finalAwb,
      },

      items,

      totals: {
        grandTotal,
        taxable,
        tax,
      },

      payment: {
        title: order.payment_method_title || "-",
      },
    };
  }, [order, courierName, awb]);

  /* ============================================================
     ✅ PRINT HANDLERS (FIXED)
  ============================================================ */
  const printPackingSlip = useReactToPrint({
    contentRef: packingRef,
    documentTitle: `PackingSlip-${normalized?.orderNumber || id}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${normalized?.orderNumber || id}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  /* ============================================================
     UI STATES
  ============================================================ */
  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-600">Loading order details...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm ring-1 ring-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!order || !normalized) {
    return <div className="p-6 text-sm text-gray-500">No order found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Order #{order.number}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(order.date_created).toLocaleString()}
          </p>

          <span className="inline-block mt-2 px-3 py-1 text-[11px] rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 font-semibold uppercase">
            {order.status}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => printPackingSlip?.()}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition"
          >
            Print Packing Slip
          </button>

          <button
            onClick={() => printInvoice?.()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            Print Invoice
          </button>
        </div>
      </div>

      {/* ✅ Courier Inputs */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-200">
        <p className="font-semibold text-gray-900 text-sm mb-4">
          Courier Details (for preview + printing)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">
              Courier Name
            </label>
            <input
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              placeholder="Enter courier name..."
              className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">
              AWB Number
            </label>
            <input
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="Enter AWB number..."
              className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ✅ PREVIEW TABS (Invoice first) */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
        {/* Tabs Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
          {/* Tabs */}
          <div className="flex gap-2">
            {/* ✅ Invoice First */}
            <button
              onClick={() => setPreviewTab("invoice")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                previewTab === "invoice"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Invoice
            </button>

            <button
              onClick={() => setPreviewTab("packing")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                previewTab === "packing"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Packing Slip
            </button>
          </div>

          {/* Print Button based on tab */}
          {previewTab === "invoice" ? (
            <button
              onClick={() => printInvoice?.()}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Print Invoice
            </button>
          ) : (
            <button
              onClick={() => printPackingSlip?.()}
              className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition"
            >
              Print Packing Slip
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4 flex justify-center bg-white">
          {previewTab === "invoice" ? (
            <div
              className="origin-top"
              style={{
                transform: "scale(0.55)",
                width: "210mm",
              }}
            >
              <InvoiceTemplate data={normalized} />
            </div>
          ) : (
            <div
              className="origin-top"
              style={{
                transform: "scale(0.75)",
                width: "210mm",
              }}
            >
              <PackingSlipTemplate data={normalized} />
            </div>
          )}
        </div>
      </div>

      {/* ✅ PRINT CONTENT (OFFSCREEN, NOT HIDDEN) */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
        }}
      >
        <div ref={packingRef}>
          <PackingSlipTemplate data={normalized} />
        </div>

        <div ref={invoiceRef}>
          <InvoiceTemplate data={normalized} />
        </div>
      </div>
    </div>
  );
}
