// components/production/packed/PackedOrderRow.jsx
"use client";

import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { MoreVertical, Printer } from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { SELLER } from "@/components/invoice/invoice.constants";

/**
 * ✅ FIXES INCLUDED
 * 1) <tbody> hydration error: no <div> inside <tbody>
 *    -> Hidden invoice is rendered via Portal (document.body)
 *
 * 2) Tracking/AWB input disappearing:
 *    -> use stable string key idKey for edit map access
 *
 * 3) ✅ USE updateTracking() from store for saving courier/AWB:
 *    -> calls PATCH /api/orders/:id/tracking
 *
 * ✅ Compact height + Invoice: ONLY PRINT
 */
export default function PackedOrderRow({
  order: o,
  loading = false,
  edit = {},
  onBeginEdit,
  onSetField,
  onCancelEdit,
  // onSaveShiprocket is kept optional, but we now SAVE via updateTracking by default
  onSaveShiprocket,
  onMarkPicked,
  onMarkShipped,
  variant = "mobile", // "mobile" | "desktop"
}) {
  const { updateTracking } = useOrderStore();

  const safe = (v) => String(v ?? "").trim();

  // ✅ stable key for edit map (fixes input reset)
  const idKey = safe(o?._id) || safe(o?.orderNumber) || "order";
  const ed = edit?.[idKey];

  const orderId = safe(o?._id); // ✅ real id for API

  // Shiprocket ONLY
  const shipAwb = safe(o?.shipment?.shiprocket?.awb);
  const shipCourier = safe(o?.shipment?.shiprocket?.courierName);
  const missing = !shipCourier || !shipAwb;

  const paymentMethod = safe(o?.paymentMethod).toUpperCase() || "-";
  const paymentStatus = safe(o?.paymentStatus) || "-";

  const status = safe(o?.fulfillmentStatus) || "-";
  const shipmentStatus = safe(o?.shipment?.status) || "-";

  const itemsText = useMemo(() => {
    const items = Array.isArray(o?.items) ? o.items : [];
    const totalQty = items.reduce((sum, it) => sum + Number(it?.quantity || 0), 0);
    const firstTitle =
      items?.[0]?.productSnapshot?.title || items?.[0]?.title || "Item";
    if (items.length <= 1) return `${firstTitle} × ${totalQty || 1}`;
    return `${firstTitle} + ${items.length - 1} more (qty: ${totalQty})`;
  }, [o]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text ?? ""));
    } catch {}
  };

  /* =========================================================
     ✅ SAVE Shiprocket tracking using store.updateTracking()
  ========================================================= */
  const setSavingFlag = (val) => {
    if (typeof onSetField === "function") onSetField(idKey, "saving", val);
  };

  const saveTrackingViaStore = useCallback(async () => {
    if (!o) return;
    if (!orderId) return;

    const courier = safe(ed?.courier);
    const awb = safe(ed?.awb);

    if (!courier || !awb) {
      alert("Courier and AWB both required.");
      return;
    }

    setSavingFlag(true);
    try {
      // ✅ REQUIRED: use tracking API (your store strips undefined deeply)
      await updateTracking(orderId, {
        shipment: {
          provider: "shiprocket",
          shiprocket: {
            courierName: courier,
            awb,
          },
        },
        // keep trackingDetails in sync (billing-safe fallback)
        trackingDetails: {
          courierName: courier,
          trackingId: awb,
        },
      });

      // optional callback if you still want refresh logic at page-level
      if (typeof onSaveShiprocket === "function") {
        await onSaveShiprocket(o);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save tracking");
    } finally {
      setSavingFlag(false);
    }
  }, [o, orderId, ed?.courier, ed?.awb, updateTracking, onSaveShiprocket]);

  /* =========================================================
     INVOICE: PRINT ONLY (PORTAL)
  ========================================================= */
  const invoiceWrapRef = useRef(null);
  const invoiceRef = useRef(null);
  const [invoiceMenuOpen, setInvoiceMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const orderNumber = safe(o?.orderNumber) || idKey || "order";

  const normalizedInvoice = useMemo(() => {
    if (!o) return null;

    const billing = {
      fullName: o.billingAddressSnapshot?.fullName || o.customerId?.name || "-",
      line1: o.billingAddressSnapshot?.line1 || "-",
      line2: o.billingAddressSnapshot?.line2 || "",
      city: o.billingAddressSnapshot?.city || "",
      pincode: o.billingAddressSnapshot?.pincode || "",
      state: o.billingAddressSnapshot?.state || "",
      phone: o.customerId?.phone || "",
      email: o.customerId?.email || "",
    };

    const shipping = {
      fullName: o.shippingAddressSnapshot?.fullName || "-",
      line1: o.shippingAddressSnapshot?.line1 || "-",
      line2: o.shippingAddressSnapshot?.line2 || "",
      city: o.shippingAddressSnapshot?.city || "",
      pincode: o.shippingAddressSnapshot?.pincode || "",
      state: o.shippingAddressSnapshot?.state || "",
    };

    const items = (Array.isArray(o.items) ? o.items : []).map((it, idx) => {
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
    });

    const couponCode = o?.coupon?.code || "";
    const discount = Number(o?.discount || o?.coupon?.discount || 0);

    return {
      seller: SELLER,
      orderNumber: o.orderNumber,
      orderDate: o.createdAt,
      invoiceNumber: o.orderNumber,
      billing,
      shipping,
      courier: { name: shipCourier || "-", awb: shipAwb || "-" },
      items,
      totals: {
        taxable: Number(o.subtotal || 0),
        tax: Number(o.tax || 0),
        grandTotal: Number(o.finalPayable || 0),
        discount,
        couponCode,
        finalPayable: Number(o.finalPayable || 0),
      },
      payment: { title: o.paymentMethod || "-" },
    };
  }, [o, shipCourier, shipAwb]);

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

  const onPrintInvoice = useCallback(() => {
    setInvoiceMenuOpen(false);
    if (!invoiceRef.current) return;
    if (typeof printInvoice !== "function") return;
    requestAnimationFrame(() => printInvoice());
  }, [printInvoice]);

  useEffect(() => {
    const onDown = (e) => {
      if (!invoiceMenuOpen) return;
      if (!invoiceWrapRef.current) return;
      if (!invoiceWrapRef.current.contains(e.target)) setInvoiceMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setInvoiceMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [invoiceMenuOpen]);

  /* =========================
     UI ATOMS (COMPACT)
  ========================= */
  const Chip = ({ children, tone = "neutral" }) => {
    const base =
      "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none";
    const map = {
      neutral: "border-zinc-200 bg-zinc-100 text-zinc-900",
      accent: "border-blue-200 bg-blue-50 text-blue-900",
      ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
      warn: "border-amber-200 bg-amber-50 text-amber-800",
    };
    return <span className={`${base} ${map[tone] || map.neutral}`}>{children}</span>;
  };

  const Btn = ({ children, onClick, disabled, variant = "ghost", title }) => {
    const base =
      "rounded-lg px-2 py-1.5 text-xs font-extrabold transition active:scale-[0.99] leading-none";
    const styles = {
      ghost: disabled
        ? "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-500"
        : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
      primary: disabled
        ? "cursor-not-allowed bg-blue-300 text-white"
        : "bg-blue-600 text-white hover:bg-blue-700",
    };
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${styles[variant]}`}
      >
        {children}
      </button>
    );
  };

  const Input = (props) => (
    <input
      {...props}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      className={[
        "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none",
        "placeholder:text-zinc-400 focus:border-blue-300",
        props.className || "",
      ].join(" ")}
    />
  );

  const InvoiceActions = ({ align = "right" }) => (
    <div className="relative" ref={invoiceWrapRef}>
      <button
        type="button"
        onClick={() => setInvoiceMenuOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-900 hover:bg-zinc-50 transition"
        title="Invoice actions"
        disabled={!normalizedInvoice}
      >
        <MoreVertical size={16} />
      </button>

      {invoiceMenuOpen ? (
        <div
          className={`absolute mt-1.5 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg z-50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <button
            type="button"
            onClick={onPrintInvoice}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-extrabold hover:bg-zinc-50"
          >
            <Printer size={14} />
            Print Invoice
          </button>
        </div>
      ) : null}
    </div>
  );

  // ✅ hidden print DOM -> portal to body (no tbody nesting)
  const HiddenInvoicePortal =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <div ref={invoiceRef} style={{ width: "210mm", background: "white" }}>
              {normalizedInvoice ? <InvoiceTemplate data={normalizedInvoice} /> : null}
            </div>
          </div>,
          document.body
        )
      : null;

  /* =========================
     MOBILE CARD
  ========================= */
  if (variant === "mobile") {
    return (
      <>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => copy(o?.orderNumber)}
                className="truncate text-sm font-extrabold underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500"
                title="Copy order number"
              >
                {o?.orderNumber || "-"}
              </button>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {o?.isConfirmed ? <Chip tone="ok">Confirmed</Chip> : <Chip tone="warn">Unconfirmed</Chip>}
                <Chip tone="neutral">{paymentMethod}</Chip>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <InvoiceActions align="right" />
              <Btn variant="ghost" disabled={loading} onClick={() => onMarkPicked?.(orderId || idKey)}>
                Picked
              </Btn>
              <Btn variant="primary" disabled={loading} onClick={() => onMarkShipped?.(orderId || idKey)}>
                Shipped
              </Btn>
            </div>
          </div>

          <div className="mt-2 grid gap-1.5 text-xs">
            <Row label="Items" value={itemsText} />
            <Row
              label="Pay"
              value={<span className="text-[11px] text-zinc-500">{paymentStatus}</span>}
            />

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-[11px] font-extrabold text-zinc-700">Shiprocket</div>
                {missing ? <Chip tone="warn">Missing</Chip> : null}
              </div>

              {!missing && !ed ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-zinc-900">{shipCourier}</div>

                  <button
                    type="button"
                    onClick={() => copy(shipAwb)}
                    className="font-mono text-[11px] font-bold underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500"
                    title="Copy AWB"
                  >
                    {shipAwb}
                  </button>

                  <button
                    type="button"
                    onClick={() => onBeginEdit?.(o)}
                    className="ml-auto text-[11px] font-bold text-blue-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      value={ed?.courier ?? ""}
                      onChange={(e) => onSetField?.(idKey, "courier", e.target.value)}
                      placeholder="Courier"
                    />
                    <Input
                      value={ed?.awb ?? ""}
                      onChange={(e) => onSetField?.(idKey, "awb", e.target.value)}
                      placeholder="AWB / Tracking"
                    />
                  </div>

                  <div className="flex justify-end gap-1.5">
                    <Btn
                      variant="ghost"
                      disabled={loading || ed?.saving}
                      onClick={() => onCancelEdit?.(idKey)}
                    >
                      Cancel
                    </Btn>
                    <Btn
                      variant="primary"
                      disabled={loading || ed?.saving}
                      onClick={saveTrackingViaStore}
                    >
                      {ed?.saving ? "Saving…" : "Save"}
                    </Btn>
                  </div>

                  <div className="text-[10px] text-zinc-500">
                    Saves into <b>shipment.shiprocket</b> + <b>trackingDetails</b>.
                  </div>
                </div>
              )}
            </div>

            <Row
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Chip tone="accent">{status}</Chip>
                  <span className="text-[11px] text-zinc-500">shipment: {shipmentStatus}</span>
                </span>
              }
            />
          </div>
        </div>

        {HiddenInvoicePortal}
      </>
    );
  }

  /* =========================
     DESKTOP TABLE ROW
  ========================= */
  return (
    <>
      <tr className="bg-white hover:bg-zinc-50/60">
        <Td className="py-2">
          <button
            type="button"
            onClick={() => copy(o?.orderNumber)}
            className="text-xs font-extrabold underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500"
            title="Copy order number"
          >
            {o?.orderNumber || "-"}
          </button>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {o?.isConfirmed ? <Chip tone="ok">Confirmed</Chip> : <Chip tone="warn">Unconfirmed</Chip>}
            <Chip tone="neutral">{paymentMethod}</Chip>
          </div>
        </Td>

        <Td className="py-2">
          <div className="max-w-[420px] truncate text-xs text-zinc-900">{itemsText}</div>
        </Td>

        <Td className="py-2">
          <div className="text-xs font-semibold text-zinc-900">{paymentMethod}</div>
          <div className="text-[11px] text-zinc-500">{paymentStatus}</div>
        </Td>

        <Td className="py-2">
          {!missing && !ed ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-zinc-900">{shipCourier}</div>

              <button
                type="button"
                onClick={() => copy(shipAwb)}
                className="font-mono text-[11px] font-bold underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500"
                title="Copy AWB"
              >
                {shipAwb}
              </button>

              <button
                type="button"
                onClick={() => onBeginEdit?.(o)}
                className="ml-auto text-[11px] font-bold text-blue-700 hover:underline"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-[11px] font-extrabold text-zinc-700">
                  {missing ? "Missing Shiprocket" : "Edit Shiprocket"}
                </div>
                {missing ? <Chip tone="warn">Req</Chip> : null}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={ed?.courier ?? ""}
                  onChange={(e) => onSetField?.(idKey, "courier", e.target.value)}
                  placeholder="Courier"
                />
                <Input
                  value={ed?.awb ?? ""}
                  onChange={(e) => onSetField?.(idKey, "awb", e.target.value)}
                  placeholder="AWB / Tracking"
                />
              </div>

              <div className="mt-1.5 flex justify-end gap-1.5">
                <Btn
                  variant="ghost"
                  disabled={loading || ed?.saving}
                  onClick={() => onCancelEdit?.(idKey)}
                >
                  Cancel
                </Btn>
                <Btn
                  variant="primary"
                  disabled={loading || ed?.saving}
                  onClick={saveTrackingViaStore}
                >
                  {ed?.saving ? "Saving…" : "Save"}
                </Btn>
              </div>
            </div>
          )}
        </Td>

        <Td className="py-2">
          <div className="flex flex-col gap-1">
            <Chip tone="accent">{status}</Chip>
            <div className="text-[11px] text-zinc-500">shipment: {shipmentStatus}</div>
          </div>
        </Td>

        <Td className="py-2 text-right">
          <div className="flex justify-end items-center gap-1.5">
            <InvoiceActions align="right" />
            <Btn variant="ghost" disabled={loading} onClick={() => onMarkPicked?.(orderId || idKey)}>
              Picked
            </Btn>
            <Btn variant="primary" disabled={loading} onClick={() => onMarkShipped?.(orderId || idKey)}>
              Shipped
            </Btn>
          </div>
        </Td>
      </tr>

      {HiddenInvoicePortal}
    </>
  );
}

/* -------- small helpers -------- */

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="shrink-0 text-[11px] font-semibold text-zinc-500">{label}</div>
      <div className="min-w-0 text-right text-xs text-zinc-900">{value}</div>
    </div>
  );
}

function Td({ children, colSpan, className = "" }) {
  return (
    <td colSpan={colSpan} className={`px-3 py-2 align-top whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}