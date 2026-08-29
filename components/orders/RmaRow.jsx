"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Loader2,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";

import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";
import {
  formatCurrency,
  formatOrderNumber,
  formatRmaNumber,
} from "@/utils/formatters";

const str = (v) => (v == null ? "" : String(v));
const norm = (v) => str(v).trim().toLowerCase();
const pick = (...values) => values.find((v) => str(v).trim()) || "";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN");
};

const statusBadge = (status) => {
  const value = norm(status);

  if (value === "requested")
    return "bg-purple-50 text-purple-700 ring-purple-100";

  if (value === "approved")
    return "bg-green-50 text-green-700 ring-green-100";

  if (value === "rejected")
    return "bg-red-50 text-red-700 ring-red-100";

  if (value === "picked")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";

  if (value === "pickup_scheduled")
    return "bg-blue-50 text-blue-700 ring-blue-100";

  return "bg-gray-100 text-gray-700 ring-gray-200";
};

const typeBadge = (type) =>
  norm(type) === "exchange"
    ? "bg-amber-50 text-amber-800 ring-amber-100"
    : "bg-sky-50 text-sky-700 ring-sky-100";

const fulfilledBadge = (value) =>
  value
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-orange-50 text-orange-700 ring-orange-200";

export default function RmaRow({
  rma,
  rowKey,

  locked = false,
  isApproved = false,

  approving = [],
  approveRma,

  isOpen,
  selected,
  toggleSelected,
  toggleExpand,

  updating,
  syncingReverse,

  syncReversePickup,
  updateFulfilled,

  openRefundModal,

  fetchAllRmas,

  creditAmount,
  setCreditAmount,
  creditNote,
  setCreditNote,
  creditLoading,
  addRefundCredit,
}) {
  const address = rma?.shippingAddressSnapshot || {};
  const customer = rma?.customer || {};
  const orderItems = rma?.orderItems || [];
  const reverseShipment = rma?.reverseShipment || {};

  const orderNumber = formatOrderNumber(rma?.orderNumber);
  const rmaNumber = formatRmaNumber(rma?.rmaNumber);

  const [previewImage, setPreviewImage] = useState(null);

  const customerName = pick(
    address?.fullName,
    customer?.name,
    "-"
  );

  const customerPhone = pick(
    address?.phone,
    customer?.phone
  );

  const customerEmail = pick(
    address?.email,
    customer?.email
  );

  const isUpdating = updating?.includes(rowKey);
  const isApproving = approving?.includes(rowKey);
  const isSyncingReverse = syncingReverse?.includes(rowKey);

  const isExchange = norm(rma?.type) === "exchange";

  const hasExchangeOrder =
    rma?.hasExchangeOrder === true ||
    rma?.isExchangeOrderCreated === true;

  const isExchangeOrder =
    rma?.isExchangeOrder === true;

  const hasReturnPickup = Boolean(
    reverseShipment?.orderId ||
    reverseShipment?.shipmentId ||
    reverseShipment?.awb
  );

  const reverseAwb = str(reverseShipment?.awb).trim();
  const reverseCourier = str(reverseShipment?.courierName).trim();

  const isRefunded =
    rma?.isRefunded === true ||
    rma?.refund?.status === "completed";

  return (
    <>
      {/* MAIN ROW */}
      <tr className={locked ? "bg-gray-50 opacity-70" : "hover:bg-gray-50"}>
        <td className="p-4">
          <input
            type="checkbox"
            checked={selected.includes(rowKey)}
            disabled={locked}
            onChange={() => toggleSelected(rma)}
            className={locked ? "cursor-not-allowed" : ""}
          />
        </td>

        <td
          className={
            locked
              ? "cursor-not-allowed p-4 text-gray-300"
              : "cursor-pointer p-4"
          }
          onClick={() => toggleExpand(rowKey, rma)}
        >
          <ChevronDown
            size={18}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </td>

        <td className="p-4 font-medium">{orderNumber}</td>
        <td className="p-4">{rmaNumber}</td>

        <td className="p-4">
          <span
            className={`rounded-full px-2.5 py-1 text-xs capitalize ring-1 ${typeBadge(
              rma?.type
            )}`}
          >
            {rma?.type || "-"}
          </span>
        </td>

        <td className="p-4">
          <span
            className={`rounded-full px-2.5 py-1 text-xs capitalize ring-1 ${statusBadge(
              rma?.status
            )}`}
          >
            {rma?.status || "-"}
          </span>
        </td>

        <td className="p-4">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${fulfilledBadge(
              rma?.isFulfilled
            )}`}
          >
            {rma?.isFulfilled ? "Fulfilled" : "Pending"}
          </span>
        </td>

        {/* PICKUP */}
        <td className="p-4">
          {rma?.returnPickupCompleted ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              ✓ Completed
            </span>
          ) : hasReturnPickup ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Pickup Created
            </span>
          ) : (
            <span className="text-xs text-gray-400">Pending</span>
          )}
        </td>

        {/* REVERSE SHIPMENT */}
        <td className="p-4">
          {hasReturnPickup ? (
            <div className="min-w-[170px] space-y-1">
              <p className="text-xs font-medium text-gray-900">
                {reverseCourier || "Courier pending"}
              </p>

              <p className="font-mono text-[11px] text-gray-500">
                {reverseAwb || "AWB pending"}
              </p>

              <button
                type="button"
                disabled={locked || !isApproved || isSyncingReverse}
                onClick={() => {
                  if (!locked && isApproved) syncReversePickup(rma);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isSyncingReverse ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}

                {isSyncingReverse ? "Syncing..." : "Sync"}
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Not created</span>
          )}
        </td>

        {/* REFUND ELIGIBLE */}
        <td className="p-4">
          {rma?.eligibleForRefund ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              ✓ Eligible
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* REFUNDED */}
        <td className="p-4">
          {isRefunded ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              ✓ Refunded
            </span>
          ) : rma?.eligibleForRefund ? (
            <button
              type="button"
              disabled={locked || !isApproved}
              onClick={() => !locked && isApproved && openRefundModal?.(rma)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Refund
            </button>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        <td className="p-4">{customerName}</td>
        <td className="p-4">{customerPhone || "-"}</td>

        <td className="p-4 text-gray-500">
          {formatDate(rma?.createdAt)}
        </td>

        {/* ACTIONS */}
        <td className="p-4">
          <div className="flex justify-end gap-2">
            {locked ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
                <LockKeyhole size={14} />
                Fulfilled · Locked
              </span>
            ) : !isApproved ? (
              <button
                type="button"
                disabled={isApproving}
                onClick={() => approveRma?.(rma)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {isApproving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}

                {isApproving ? "Approving..." : "Approve"}
              </button>
            ) : (
              <>
                {isExchange &&
                  (hasExchangeOrder || isExchangeOrder ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      <Check size={14} />
                      Exchange Order Created
                    </span>
                  ) : (
                    <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                      Exchange Order Processing
                    </span>
                  ))}

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateFulfilled(rma, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}

                  {isUpdating ? "Updating..." : "Mark Fulfilled"}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* EXPANDED ROW */}
      {isOpen && !locked && (
        <tr>
          <td colSpan={15} className="px-6 py-5">
            <div className="space-y-5">
              {/* INFO */}
              <div className="grid gap-4 text-xs lg:grid-cols-5">
                <InfoCard title="Order">
                  <p>
                    <b>Order #:</b> {orderNumber}
                  </p>
                  <p>
                    <b>Fulfillment:</b> {rma?.fulfillmentStatus || "-"}
                  </p>
                  <p>
                    <b>Payment:</b> {rma?.paymentMethod || "-"}
                  </p>
                  <p>
                    <b>Total:</b>{" "}
                    {formatCurrency(
                      rma?.finalPayable ?? rma?.totalAmount ?? 0
                    )}
                  </p>
                </InfoCard>

                <InfoCard title="Update Order">
                  <OrderStatusDropdown
                    orderId={rma?.orderId}
                    currentStatus={rma?.fulfillmentStatus}
                    onUpdated={fetchAllRmas}
                  />
                </InfoCard>

                <InfoCard title="Shipping">
                  <p className="font-medium">{customerName}</p>
                  <p>{customerPhone || "-"}</p>
                  <p>{customerEmail || "-"}</p>

                  <p>
                    {[
                      address?.line1,
                      address?.city,
                      address?.state,
                      address?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </InfoCard>

                <InfoCard title="RMA">
                  <p>
                    <b>RMA #:</b> {rmaNumber}
                  </p>
                  <p>
                    <b>Reason:</b> {rma?.reason || "-"}
                  </p>
                  <p>
                    <b>Note:</b> {rma?.customerNote || "-"}
                  </p>
                  <p>
                    <b>Approved:</b> {isApproved ? "Yes" : "No"}
                  </p>
                  <p>
                    <b>Fulfilled:</b>{" "}
                    {rma?.isFulfilled ? "Yes" : "No"}
                  </p>
                </InfoCard>

                <InfoCard title="Reverse Shipment">
                  <p>
                    <b>Courier:</b> {reverseCourier || "-"}
                  </p>
                  <p>
                    <b>AWB:</b> {reverseAwb || "-"}
                  </p>
                  <p>
                    <b>Status:</b> {reverseShipment?.status || "-"}
                  </p>
                  <p>
                    <b>Shipment ID:</b>{" "}
                    {reverseShipment?.shipmentId || "-"}
                  </p>
                </InfoCard>
              </div>

              {/* ITEMS */}
              <div className="grid gap-4 md:grid-cols-2">
                <ItemsCard
                  title="Order Items"
                  items={orderItems}
                />

                <ItemsCard
                  title="RMA Items"
                  items={rma?.items || []}
                  orderItems={orderItems}
                  isRma
                />
              </div>

              {/* QC */}
              <QcImagesCard
                media={rma?.media}
                onPreview={setPreviewImage}
              />

              {/* REFUND */}
              <div className="grid gap-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold">Refund Details</p>

                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>
                      <b>Eligible:</b>{" "}
                      {rma?.eligibleForRefund ? "Yes" : "No"}
                    </p>

                    <p>
                      <b>Refunded:</b> {isRefunded ? "Yes" : "No"}
                    </p>

                    <p>
                      <b>Amount:</b>{" "}
                      {formatCurrency(
                        rma?.refundEligibleAmount ||
                        rma?.refund?.amount ||
                        0
                      )}
                    </p>

                    <p>
                      <b>UPI:</b>{" "}
                      {customer?.payoutDetails?.upi?.upiId || "-"}
                    </p>

                    <p>
                      <b>Bank:</b>{" "}
                      {customer?.payoutDetails?.bank?.accountNumber || "-"}
                    </p>

                    <p>
                      <b>IFSC:</b>{" "}
                      {customer?.payoutDetails?.bank?.ifscCode || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Add Customer Credit
                  </p>

                  <div className="mt-2 space-y-2">
                    <input
                      type="number"
                      value={creditAmount[rowKey] || ""}
                      disabled={!isApproved}
                      onChange={(e) =>
                        setCreditAmount((s) => ({
                          ...s,
                          [rowKey]: e.target.value,
                        }))
                      }
                      placeholder="Amount"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                    />

                    <input
                      value={creditNote[rowKey] || ""}
                      disabled={!isApproved}
                      onChange={(e) =>
                        setCreditNote((s) => ({
                          ...s,
                          [rowKey]: e.target.value,
                        }))
                      }
                      placeholder="Note / reason"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                    />

                    <button
                      type="button"
                      disabled={
                        !isApproved ||
                        creditLoading.includes(rowKey) ||
                        isRefunded
                      }
                      onClick={() => addRefundCredit(rma)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {creditLoading.includes(rowKey)
                        ? "Adding..."
                        : "Add Credit"}
                    </button>

                    <p className="text-[11px] text-gray-500">
                      Current Credit:{" "}
                      {formatCurrency(customer?.credits?.balance || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* LIGHTBOX — PORTAL, NOT INSIDE TBODY */}
      {previewImage &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-black shadow-lg"
              >
                ×
              </button>

              <img
                src={previewImage.url}
                alt={previewImage.evidenceType || "QC Image"}
                className="max-h-[75vh] max-w-[90vw] rounded-xl object-contain shadow-2xl sm:max-w-[650px]"
              />

              <p className="mt-2 text-center text-xs font-semibold capitalize text-white">
                {previewImage.evidenceType || "QC"} Image
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
      <p className="mb-2 text-gray-500">
        {title}
      </p>

      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function ItemsCard({
  title,
  items,
  orderItems = [],
  isRma = false,
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
      <p className="mb-3 text-xs font-semibold">
        {title}
      </p>

      {!items?.length ? (
        <p className="text-xs text-gray-500">
          No items.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const matchedItem = isRma
              ? orderItems.find(
                (x) =>
                  String(x?.lineId) ===
                  String(item?.orderLineId)
              ) ||
              orderItems[item?.orderItemIndex]
              : item;

            const image =
              matchedItem?.productSnapshot
                ?.thumbnail ||
              matchedItem?.productSnapshot
                ?.images?.[0] ||
              "";

            const itemTitle =
              item?.title ||
              matchedItem?.productSnapshot
                ?.title ||
              "Item";

            return (
              <div
                key={
                  item?.lineId ||
                  item?.orderLineId ||
                  i
                }
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  {image ? (
                    <img
                      src={image}
                      alt={itemTitle}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-200" />
                  )}

                  <div>
                    <p className="font-medium">
                      {itemTitle}
                    </p>

                    <p className="text-xs text-gray-500">
                      Qty: {item?.quantity || 1}

                      {!isRma &&
                        matchedItem?.selectedSize &&
                        ` · ${matchedItem.selectedSize}`}
                    </p>
                  </div>
                </div>

                <p className="text-xs font-semibold">
                  {isRma
                    ? item?.variantSku || "-"
                    : formatCurrency(
                      matchedItem?.subtotal ??
                      matchedItem?.price ??
                      0
                    )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QcImagesCard({ media = [], onPreview }) {
  const list = Array.isArray(media)
    ? media.filter((m) => m?.url)
    : [];

  const types = ["front", "back", "tag"];

  const images = types
    .map((type, index) => {
      const matched = list.find(
        (m) => norm(m?.evidenceType) === type
      );

      const image = matched || list[index];

      return image
        ? {
          ...image,
          evidenceType: image.evidenceType || type,
        }
        : null;
    })
    .filter(Boolean);

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold text-gray-900">
          QC Images
        </p>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${images.length === 3
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
            }`}
        >
          {images.length}/3
        </span>
      </div>

      {images.length ? (
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((image) => (
            <button
              key={image.evidenceType}
              type="button"
              onClick={() => onPreview?.(image)}
              className="group text-left"
            >
              <div className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 sm:h-24 sm:w-24">
                <img
                  src={image.url}
                  alt={image.evidenceType}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                />
              </div>

              <p className="mt-1 text-center text-[10px] font-medium capitalize text-gray-500">
                {image.evidenceType}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-400">
          No QC images uploaded.
        </p>
      )}
    </div>
  );
}
