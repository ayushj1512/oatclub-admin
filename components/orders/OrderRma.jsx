"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Undo2,
  RefreshCcw,
  ImageIcon,
  Package,
  Calendar,
  User,
  Phone,
  MapPin,
  BadgeIndianRupee,
} from "lucide-react";
import { useRmaStore } from "@/store/useRmaStore";

const badgeStyle = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "requested") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (s === "approved") return "bg-green-50 text-green-700 ring-green-100";
  if (s === "rejected") return "bg-red-50 text-red-700 ring-red-100";
  if (s === "closed") return "bg-gray-900 text-white ring-gray-900";
  return "bg-gray-100 text-gray-700 ring-gray-200";
};

const small = (v) => (v === null || v === undefined || v === "" ? "-" : v);

export default function OrderRmaDetailsFull({
  orderId,
  order,
  showIfNone = false,
  rmaPanelHref = "/rma",
}) {
  const { rmas, fetchAllRmas, loading } = useRmaStore();
  const [expanded, setExpanded] = useState(true);

  // ✅ Ensure RMAs are loaded
  useEffect(() => {
    if (!Array.isArray(rmas) || rmas.length === 0) fetchAllRmas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Find latest RMA for this order (if multiple exist)
  const rma = useMemo(() => {
    if (!orderId || !Array.isArray(rmas)) return null;
    const list = rmas
      .filter((x) => String(x?.orderId) === String(orderId))
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    return list[0] || null;
  }, [rmas, orderId]);

  if (loading) return null;

  // ✅ No RMA found
  if (!rma) {
    if (!showIfNone) return null;
    return (
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm text-gray-600">No RMA raised for this order.</p>
      </div>
    );
  }

  const customerName =
    order?.shippingAddressSnapshot?.fullName ||
    order?.customerId?.name ||
    rma?.customer?.name ||
    "-";

  const customerPhone =
    order?.shippingAddressSnapshot?.phone ||
    order?.customerId?.phone ||
    rma?.customer?.phone ||
    "-";

  const shipping = order?.shippingAddressSnapshot || {};

  const createdAt = rma?.createdAt ? new Date(rma.createdAt).toLocaleString() : "-";
  const updatedAt = rma?.updatedAt ? new Date(rma.updatedAt).toLocaleString() : "-";

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Undo2 size={18} /> RMA Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Full customer-submitted RMA information for this order.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 capitalize ${badgeStyle(
              rma?.status
            )}`}
          >
            {small(rma?.status)}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAllRmas()}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCcw size={14} /> Refresh
            </button>

            <Link
              href={rmaPanelHref}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View in RMA Panel →
            </Link>
          </div>
        </div>
      </div>

      {/* Collapse */}
      <div className="px-5 pb-5">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-xs font-semibold text-gray-700 hover:text-black"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-6 space-y-5">
          {/* Top Summary */}
          <div className="grid md:grid-cols-3 gap-4 text-xs">
            {/* RMA Meta */}
            <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
              <p className="text-gray-500 flex items-center gap-2">
                <Package size={14} /> RMA
              </p>
              <p className="mt-2 text-gray-900">
                <b>RMA #:</b> {small(rma?.rmaNumber)}
              </p>
              <p className="text-gray-700">
                <b>Type:</b> {small(rma?.type)}
              </p>
              <p className="text-gray-700">
                <b>Reference Code:</b> {small(rma?.referenceCode)}
              </p>
              <p className="text-gray-700">
                <b>Order ID:</b> {small(rma?.orderId)}
              </p>
            </div>

            {/* Customer Inputs */}
            <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
              <p className="text-gray-500 flex items-center gap-2">
                <User size={14} /> Customer
              </p>
              <p className="mt-2 text-gray-900 font-medium">{small(customerName)}</p>
              <p className="text-gray-700 flex items-center gap-2 mt-1">
                <Phone size={14} /> {small(customerPhone)}
              </p>
              <p className="text-gray-700 mt-2">
                <b>Reason:</b> {small(rma?.reason)}
              </p>
              <p className="text-gray-700 mt-1">
                <b>Customer Note:</b> {small(rma?.customerNote)}
              </p>
            </div>

            {/* Dates & Fee */}
            <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
              <p className="text-gray-500 flex items-center gap-2">
                <Calendar size={14} /> Timeline
              </p>
              <p className="mt-2 text-gray-900">
                <b>Created:</b> {createdAt}
              </p>
              <p className="text-gray-700">
                <b>Updated:</b> {updatedAt}
              </p>

              <div className="mt-3">
                <p className="text-gray-500 flex items-center gap-2">
                  <BadgeIndianRupee size={14} /> Fee
                </p>

                {rma?.fee?.amount > 0 ? (
                  <p className="mt-1 text-blue-700 font-medium">
                    Exchange Fee: ₹{rma.fee.amount} ({small(rma.fee.status)})
                  </p>
                ) : (
                  <p className="mt-1 text-gray-700">No extra fee</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Snapshot (from order) */}
          <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={16} /> Shipping (Order Snapshot)
            </p>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-gray-700">
              <p>
                <b>Name:</b> {small(shipping?.fullName)}
              </p>
              <p>
                <b>Phone:</b> {small(shipping?.phone)}
              </p>
              <p>
                <b>Line 1:</b> {small(shipping?.line1)}
              </p>
              <p>
                <b>Line 2:</b> {small(shipping?.line2)}
              </p>
              <p>
                <b>City:</b> {small(shipping?.city)}
              </p>
              <p>
                <b>State:</b> {small(shipping?.state)}
              </p>
              <p>
                <b>Pincode:</b> {small(shipping?.pincode)}
              </p>
            </div>
          </div>

          {/* RMA Items */}
          <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={16} /> RMA Items
            </p>

            {!Array.isArray(rma?.items) || rma.items.length === 0 ? (
              <p className="text-xs text-gray-500">No RMA items attached.</p>
            ) : (
              <div className="space-y-2">
                {rma.items.map((it, idx) => (
                  <div
                    key={`${rma._id}-rma-item-${idx}`}
                    className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-3"
                  >
                    <div>
                      <p className="text-gray-900 font-medium">{small(it?.title) || "Item"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Qty: {small(it?.quantity || 1)}
                      </p>
                      {it?.variantSku && (
                        <p className="text-xs text-gray-500">SKU: {it.variantSku}</p>
                      )}
                      {it?.productId && (
                        <p className="text-xs text-gray-500">Product ID: {it.productId}</p>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 text-right">
                      {it?.selectedSize && <p>Size: {it.selectedSize}</p>}
                      {it?.selectedColor && <p>Color: {it.selectedColor}</p>}
                      {it?.variantId && <p>Variant: {it.variantId}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Images */}
          <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> Customer Proof Images
            </p>

            {!Array.isArray(rma?.images) || rma.images.length === 0 ? (
              <p className="text-xs text-gray-500">No images uploaded by customer.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {rma.images.map((img, idx) => (
                  <a
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    key={`${rma._id}-img-${idx}`}
                    className="group relative block overflow-hidden rounded-xl border border-gray-100"
                  >
                    <img
                      src={img}
                      alt="RMA Proof"
                      className="h-28 w-full object-cover group-hover:scale-105 transition"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Pickup details (if exists on rma) */}
          {(rma?.pickupCourier || rma?.pickupAwb || rma?.pickupDate) && (
            <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Pickup / Logistics</p>
              <div className="grid md:grid-cols-3 gap-3 text-xs text-gray-700">
                <p>
                  <b>Pickup Date:</b> {small(rma?.pickupDate)}
                </p>
                <p>
                  <b>Courier:</b> {small(rma?.pickupCourier)}
                </p>
                <p>
                  <b>Pickup AWB:</b> {small(rma?.pickupAwb)}
                </p>
              </div>
            </div>
          )}

          {/* Admin/QC/Notes (if exists on rma) */}
          {(rma?.qcResult || rma?.adminNote || rma?.adminRemarks) && (
            <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Internal Notes</p>
              <div className="space-y-2 text-xs text-gray-700">
                {rma?.qcResult && (
                  <p>
                    <b>QC Result:</b> {rma.qcResult}
                  </p>
                )}
                {rma?.adminNote && (
                  <p>
                    <b>Admin Note:</b> {rma.adminNote}
                  </p>
                )}
                {rma?.adminRemarks && (
                  <p>
                    <b>Admin Remarks:</b> {rma.adminRemarks}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Raw fallback for debugging */}
          {/*
          <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto">{JSON.stringify(rma, null, 2)}</pre>
          */}
        </div>
      )}
    </div>
  );
}
