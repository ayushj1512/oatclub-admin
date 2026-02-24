"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MoreVertical, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { SELLER } from "@/components/invoice/invoice.constants";

export default function OrderRowActions({
  order,
  courierName = "",
  trackingId = "",
}) {
  const wrapRef = useRef(null);
  const invoiceRef = useRef(null);

  const [open, setOpen] = useState(false);

  const orderNumber = order?.orderNumber || order?._id || "order";

  const normalized = useMemo(() => {
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
      fullName: order.shippingAddressSnapshot?.fullName || "-",
      line1: order.shippingAddressSnapshot?.line1 || "-",
      line2: order.shippingAddressSnapshot?.line2 || "",
      city: order.shippingAddressSnapshot?.city || "",
      pincode: order.shippingAddressSnapshot?.pincode || "",
      state: order.shippingAddressSnapshot?.state || "",
    };

    const items = (Array.isArray(order.items) ? order.items : []).map(
      (it, idx) => {
        const snap = it?.productSnapshot || {};
        const size = it?.selectedSize || it?.size || it?.variant?.size || "-";
        return {
          sr: idx + 1,
          name: snap.title || it?.productId?.title || "Unnamed Product",
          qty: Number(it?.quantity || 0),
          priceIncl: Number(it?.price || 0),
          gstRate: 5,
          size,
          selectedSize: size,
        };
      }
    );

    const couponCode = order?.coupon?.code || "";
    const discount = Number(order?.discount || order?.coupon?.discount || 0);

    return {
      seller: SELLER,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      invoiceNumber: order.orderNumber,
      billing,
      shipping,
      courier: { name: courierName || "-", awb: trackingId || "-" },
      items,
      totals: {
        taxable: Number(order.subtotal || 0),
        tax: Number(order.tax || 0),
        grandTotal: Number(order.finalPayable || 0),
        discount,
        couponCode,
        finalPayable: Number(order.finalPayable || 0),
      },
      payment: { title: order.paymentMethod || "-" },
    };
  }, [order, courierName, trackingId]);

  // ✅ Print (react-to-print) — contentRef version (reliable)
  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${orderNumber}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const safePrint = useCallback(() => {
    setOpen(false);
    if (!invoiceRef.current) return;
    if (typeof printInvoice !== "function") return;
    requestAnimationFrame(() => printInvoice());
  }, [printInvoice]);

  // ✅ Close on outside click + ESC
  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  if (!order || !normalized) return null;

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-black/[0.05] transition"
          type="button"
          title="Invoice Options"
        >
          <MoreVertical size={18} />
        </button>

        {open ? (
          <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-2xl shadow-lg z-40 overflow-hidden text-xs font-semibold">
            <button
              onClick={safePrint}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
              type="button"
            >
              <Printer size={14} />
              Print Invoice
            </button>
          </div>
        ) : null}
      </div>

      {/* Hidden printable invoice */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={invoiceRef} style={{ width: "210mm", background: "white" }}>
          <InvoiceTemplate data={normalized} />
        </div>
      </div>
    </>
  );
}