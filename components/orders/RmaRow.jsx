"use client";

import React from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  PackagePlus,
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
const pick = (...values) =>
  values.find((v) => str(v).trim()) || "";

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

  return "bg-gray-100 text-gray-700 ring-gray-200";
};

const typeBadge = (type) => {
  if (norm(type) === "exchange")
    return "bg-amber-50 text-amber-800 ring-amber-100";

  return "bg-sky-50 text-sky-700 ring-sky-100";
};

const fulfilledBadge = (value) =>
  value
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-orange-50 text-orange-700 ring-orange-200";

export default function RmaRow({
  rma,
  rowKey,
  isOpen,
  selected,
  toggleSelected,
  toggleExpand,

  updating,
  creatingPickup,
  creatingExchange,

  createReturnPickup,
  createExchangeOrder,
  updateFulfilled,

  fetchAllRmas,

  creditAmount,
  setCreditAmount,
  creditNote,
  setCreditNote,
  creditLoading,
  addRefundCredit,
}) {
  const address =
    rma?.shippingAddressSnapshot || {};

  const customer =
    rma?.customer || {};

  const orderItems =
    rma?.orderItems || [];

  const reverseShipment =
    rma?.reverseShipment || {};

  const orderNumber =
    formatOrderNumber(rma?.orderNumber);

  const rmaNumber =
    formatRmaNumber(rma?.rmaNumber);

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

  const isUpdating =
    updating.includes(rowKey);

  const isCreatingPickup =
    creatingPickup.includes(rowKey);

  const isCreatingExchange =
    creatingExchange.includes(rowKey);

  const isExchange =
    norm(rma?.type) === "exchange";

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

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="p-4">
          <input
            type="checkbox"
            checked={selected.includes(rowKey)}
            onChange={() => toggleSelected(rma)}
          />
        </td>

        <td
          className="cursor-pointer p-4"
          onClick={() => toggleExpand(rowKey)}
        >
          <ChevronDown
            size={18}
            className={`transition-transform ${isOpen ? "rotate-180" : ""
              }`}
          />
        </td>

        <td className="p-4 font-medium">
          {orderNumber}
        </td>

        <td className="p-4">
          {rmaNumber}
        </td>

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
            {rma?.isFulfilled
              ? "Fulfilled"
              : "Pending"}
          </span>
        </td>

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
            <span className="text-xs text-gray-400">
              Pending
            </span>
          )}
        </td>

        <td className="p-4">
          {rma?.eligibleForRefund ? (
            <span className="font-semibold text-amber-600">
              ✓
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        <td className="p-4">
          {rma?.isRefunded ? (
            <span className="font-semibold text-emerald-600">
              ✓
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        <td className="p-4">
          {customerName}
        </td>

        <td className="p-4">
          {customerPhone || "-"}
        </td>

        <td className="p-4 text-gray-500">
          {formatDate(rma?.createdAt)}
        </td>

        <td className="p-4">
          <div className="flex justify-end gap-2">
            <button
              disabled={
                hasReturnPickup ||
                isCreatingPickup
              }
              onClick={() =>
                createReturnPickup(rma)
              }
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${hasReturnPickup
                  ? "cursor-not-allowed bg-blue-50 text-blue-700"
                  : "bg-black text-white hover:bg-gray-800"
                }`}
            >
              {isCreatingPickup ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <RotateCcw size={14} />
              )}

              {hasReturnPickup
                ? "Pickup Created"
                : isCreatingPickup
                  ? "Creating..."
                  : "Create Pickup"}
            </button>

            {isExchange &&
              (hasExchangeOrder ||
                isExchangeOrder ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                  <Check size={14} />
                  Exchange Order Created
                </span>
              ) : (
                <button
                  disabled={
                    isCreatingExchange ||
                    !rma?.returnPickupCompleted
                  }
                  onClick={() =>
                    createExchangeOrder(rma)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isCreatingExchange ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <PackagePlus size={14} />
                  )}

                  {!rma?.returnPickupCompleted
                    ? "Waiting Pickup"
                    : isCreatingExchange
                      ? "Creating..."
                      : "Create Exchange Order"}
                </button>
              ))}

            <button
              disabled={isUpdating}
              onClick={() =>
                updateFulfilled(
                  rma,
                  !rma?.isFulfilled
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${rma?.isFulfilled
                  ? "bg-gray-100 text-gray-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
            >
              {isUpdating ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Check size={14} />
              )}

              {rma?.isFulfilled
                ? "Mark Pending"
                : "Mark Fulfilled"}
            </button>
          </div>
        </td>
      </tr>

      {isOpen && (
        <tr>
          <td
            colSpan={14}
            className="px-6 py-5"
          >
            <div className="space-y-5">
              <div className="grid gap-4 text-xs lg:grid-cols-4">
                <InfoCard title="Order">
                  <p>
                    <b>Order #:</b> {orderNumber}
                  </p>
                  <p>
                    <b>Fulfillment:</b>{" "}
                    {rma?.fulfillmentStatus || "-"}
                  </p>
                  <p>
                    <b>Payment:</b>{" "}
                    {rma?.paymentMethod || "-"}
                  </p>
                  <p>
                    <b>Total:</b>{" "}
                    {formatCurrency(
                      rma?.finalPayable ??
                      rma?.totalAmount ??
                      0
                    )}
                  </p>
                </InfoCard>

                <InfoCard title="Update Order">
                  <OrderStatusDropdown
                    orderId={rma?.orderId}
                    currentStatus={
                      rma?.fulfillmentStatus
                    }
                    onUpdated={fetchAllRmas}
                  />
                </InfoCard>

                <InfoCard title="Shipping">
                  <p className="font-medium">
                    {customerName}
                  </p>
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
                    <b>Reason:</b>{" "}
                    {rma?.reason || "-"}
                  </p>
                  <p>
                    <b>Note:</b>{" "}
                    {rma?.customerNote || "-"}
                  </p>
                  <p>
                    <b>Fulfilled:</b>{" "}
                    {rma?.isFulfilled
                      ? "Yes"
                      : "No"}
                  </p>
                </InfoCard>
              </div>

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

              <div className="grid gap-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    Refund Details
                  </p>

                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>
                      <b>Eligible:</b>{" "}
                      {rma?.eligibleForRefund
                        ? "Yes"
                        : "No"}
                    </p>

                    <p>
                      <b>Refunded:</b>{" "}
                      {rma?.isRefunded
                        ? "Yes"
                        : "No"}
                    </p>

                    <p>
                      <b>Amount:</b>{" "}
                      {formatCurrency(
                        rma?.refundEligibleAmount ||
                        0
                      )}
                    </p>

                    <p>
                      <b>UPI:</b>{" "}
                      {customer?.payoutDetails?.upi
                        ?.upiId || "-"}
                    </p>

                    <p>
                      <b>Bank:</b>{" "}
                      {customer?.payoutDetails?.bank
                        ?.accountNumber || "-"}
                    </p>

                    <p>
                      <b>IFSC:</b>{" "}
                      {customer?.payoutDetails?.bank
                        ?.ifscCode || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    Add Customer Credit
                  </p>

                  <div className="mt-2 space-y-2">
                    <input
                      type="number"
                      value={
                        creditAmount[rowKey] || ""
                      }
                      onChange={(e) =>
                        setCreditAmount((s) => ({
                          ...s,
                          [rowKey]:
                            e.target.value,
                        }))
                      }
                      placeholder="Amount"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                    />

                    <input
                      type="text"
                      value={
                        creditNote[rowKey] || ""
                      }
                      onChange={(e) =>
                        setCreditNote((s) => ({
                          ...s,
                          [rowKey]:
                            e.target.value,
                        }))
                      }
                      placeholder="Note / reason"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
                    />

                    <button
                      disabled={
                        creditLoading.includes(
                          rowKey
                        ) ||
                        rma?.isRefunded
                      }
                      onClick={() =>
                        addRefundCredit(rma)
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {creditLoading.includes(
                        rowKey
                      )
                        ? "Adding..."
                        : "Add Credit"}
                    </button>

                    <p className="text-[11px] text-gray-500">
                      Current Credit:{" "}
                      {formatCurrency(
                        customer?.credits
                          ?.balance || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
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
              orderItems[
              item?.orderItemIndex
              ]
              : item;

            const image =
              matchedItem?.productSnapshot
                ?.thumbnail ||
              matchedItem?.productSnapshot
                ?.images?.[0] ||
              "";

            const title =
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
                      alt={title}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-200" />
                  )}

                  <div>
                    <p className="font-medium">
                      {title}
                    </p>

                    <p className="text-xs text-gray-500">
                      Qty:{" "}
                      {item?.quantity || 1}

                      {!isRma &&
                        matchedItem
                          ?.selectedSize &&
                        ` · ${matchedItem.selectedSize}`}
                    </p>
                  </div>
                </div>

                <p className="text-xs font-semibold">
                  {isRma
                    ? item?.variantSku || "-"
                    : formatCurrency(
                      matchedItem
                        ?.subtotal ??
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
