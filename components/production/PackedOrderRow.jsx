
// components/production/PackedOrderRow.jsx
"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Edit3,
  PackageCheck,
  Save,
  Truck,
  X,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";

const safe = (value) => String(value ?? "").trim();

const getAwb = (order = {}) =>
  safe(
    order?.shipment?.awb ||
      order?.shipment?.shiprocket?.awb ||
      order?.trackingDetails?.awb ||
      order?.trackingDetails?.trackingId
  );

const getCourier = (order = {}) =>
  safe(
    order?.shipment?.courierName ||
      order?.shipment?.shiprocket?.courierName ||
      order?.trackingDetails?.courierName
  );

const getItemsText = (order = {}) => {
  const items = Array.isArray(order?.items) ? order.items : [];

  if (!items.length) return "No items";

  const totalQty = items.reduce(
    (sum, item) => sum + Number(item?.quantity || 0),
    0
  );

  const firstTitle =
    safe(items?.[0]?.productSnapshot?.title) ||
    safe(items?.[0]?.title) ||
    "Item";

  if (items.length === 1) {
    return `${firstTitle} × ${totalQty || 1}`;
  }

  return `${firstTitle} + ${items.length - 1} more · Qty ${totalQty}`;
};

export default function PackedOrderRow({
  order,
  variant = "mobile",
  loading = false,

  edit = {},
  onBeginEdit,
  onSetField,
  onCancelEdit,
  onSaveShiprocket,

  onMarkPicked,
  onMarkShipped,

  selected = false,
  showSelection = false,
  onToggleSelect,
}) {
  const updateTracking = useOrderStore(
    (state) => state.updateTracking
  );

  const [localSaving, setLocalSaving] = useState(false);

  const orderId = safe(order?._id);
  const idKey = orderId || safe(order?.orderNumber) || "order";

  const currentEdit = edit?.[idKey];

  const courier = getCourier(order);
  const awb = getAwb(order);
  const trackingMissing = !courier || !awb;

  const paymentMethod =
    safe(order?.paymentMethod).toUpperCase() || "-";

  const paymentStatus =
    safe(order?.paymentStatus) || "-";

  const fulfillmentStatus =
    safe(order?.fulfillmentStatus) || "-";

  const shipmentStatus =
    safe(order?.shipment?.status) || "-";

  const itemsText = useMemo(
    () => getItemsText(order),
    [order]
  );

  const saving =
    loading ||
    localSaving ||
    Boolean(currentEdit?.saving);

  const copyText = async (value) => {
    const text = safe(value);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
    }
  };

  const startEditing = () => {
    onBeginEdit?.(order);
  };

  const cancelEditing = () => {
    onCancelEdit?.(idKey);
  };

  const saveTracking = async () => {
    if (!orderId) {
      alert("Order ID is missing.");
      return;
    }

    const nextCourier = safe(currentEdit?.courier);
    const nextAwb = safe(currentEdit?.awb);

    if (!nextCourier || !nextAwb) {
      alert("Courier and AWB both required.");
      return;
    }

    setLocalSaving(true);
    onSetField?.(idKey, "saving", true);

    try {
      await updateTracking(orderId, {
        shipment: {
          provider: "shiprocket",

          courierName: nextCourier,
          awb: nextAwb,

          shiprocket: {
            courierName: nextCourier,
            awb: nextAwb,
          },
        },

        trackingDetails: {
          provider: "shiprocket",
          courierName: nextCourier,
          trackingId: nextAwb,
          awb: nextAwb,
        },
      });

      onCancelEdit?.(idKey);
      await onSaveShiprocket?.(order);
    } catch (error) {
      console.error("saveTracking error:", error);
      alert(error?.message || "Failed to save tracking.");
    } finally {
      setLocalSaving(false);
      onSetField?.(idKey, "saving", false);
    }
  };

  const TrackingView = () => {
    if (currentEdit || trackingMissing) {
      return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={currentEdit?.courier ?? ""}
              onChange={(event) =>
                onSetField?.(
                  idKey,
                  "courier",
                  event.target.value
                )
              }
              placeholder="Courier name"
              disabled={saving}
            />

            <Input
              value={currentEdit?.awb ?? ""}
              onChange={(event) =>
                onSetField?.(
                  idKey,
                  "awb",
                  event.target.value
                )
              }
              placeholder="AWB / Tracking ID"
              disabled={saving}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              onClick={cancelEditing}
              disabled={saving}
            >
              <X size={13} />
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={saveTracking}
              disabled={saving}
            >
              <Save size={13} />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-zinc-900">
            {courier}
          </div>

          <button
            type="button"
            onClick={() => copyText(awb)}
            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-blue-700 hover:underline"
            title="Copy AWB"
          >
            {awb}
            <Copy size={11} />
          </button>
        </div>

        <button
          type="button"
          onClick={startEditing}
          disabled={loading}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Edit3 size={12} />
          Edit
        </button>
      </div>
    );
  };

  if (variant === "mobile") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => copyText(order?.orderNumber)}
              className="inline-flex max-w-full items-center gap-1 truncate text-sm font-extrabold text-zinc-950 hover:text-blue-700"
              title="Copy order number"
            >
              {safe(order?.orderNumber) || "-"}
              <Copy size={12} />
            </button>

            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip tone={order?.isConfirmed ? "success" : "warning"}>
                {order?.isConfirmed
                  ? "Confirmed"
                  : "Unconfirmed"}
              </Chip>

              <Chip>{paymentMethod}</Chip>
            </div>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <Button
              onClick={() =>
                onMarkPicked?.(orderId || idKey)
              }
              disabled={loading}
            >
              <PackageCheck size={13} />
              Picked
            </Button>

            <Button
              variant="primary"
              onClick={() =>
                onMarkShipped?.(orderId || idKey)
              }
              disabled={loading}
            >
              <Truck size={13} />
              Shipped
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <MobileRow
            label="Items"
            value={itemsText}
          />

          <MobileRow
            label="Payment"
            value={`${paymentMethod} · ${paymentStatus}`}
          />

          <div>
            <div className="mb-1 text-[11px] font-semibold text-zinc-500">
              Courier / AWB
            </div>

            <TrackingView />
          </div>

          <MobileRow
            label="Status"
            value={
              <div className="flex flex-wrap justify-end gap-1.5">
                <Chip tone="accent">
                  {fulfillmentStatus}
                </Chip>

                <Chip>
                  shipment: {shipmentStatus}
                </Chip>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  /*
   * Desktop mode returns its own <tr>.
   * Do not wrap this component inside another <tr>.
   */
  return (
    <tr className="bg-white transition hover:bg-zinc-50/70">
      {showSelection && (
        <Td className="w-[56px]">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            disabled={loading}
            className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
            aria-label={`Select order ${
              order?.orderNumber || ""
            }`}
          />
        </Td>
      )}

      <Td>
        <button
          type="button"
          onClick={() => copyText(order?.orderNumber)}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-zinc-950 hover:text-blue-700"
          title="Copy order number"
        >
          {safe(order?.orderNumber) || "-"}
          <Copy size={11} />
        </button>

        <div className="mt-1.5 flex flex-wrap gap-1">
          <Chip tone={order?.isConfirmed ? "success" : "warning"}>
            {order?.isConfirmed
              ? "Confirmed"
              : "Unconfirmed"}
          </Chip>

          <Chip>{paymentMethod}</Chip>
        </div>
      </Td>

      <Td>
        <div
          className="max-w-[340px] truncate text-xs text-zinc-900"
          title={itemsText}
        >
          {itemsText}
        </div>
      </Td>

      <Td>
        <div className="text-xs font-semibold text-zinc-900">
          {paymentMethod}
        </div>

        <div className="mt-0.5 text-[11px] text-zinc-500">
          {paymentStatus}
        </div>
      </Td>

      <Td className="min-w-[280px]">
        <TrackingView />
      </Td>

      <Td>
        <div className="flex flex-col items-start gap-1">
          <Chip tone="accent">
            {fulfillmentStatus}
          </Chip>

          <span className="text-[11px] text-zinc-500">
            shipment: {shipmentStatus}
          </span>
        </div>
      </Td>

      <Td className="text-right">
        <div className="flex justify-end gap-1.5">
          <Button
            onClick={() =>
              onMarkPicked?.(orderId || idKey)
            }
            disabled={loading}
          >
            <PackageCheck size={13} />
            Picked
          </Button>

          <Button
            variant="primary"
            onClick={() =>
              onMarkShipped?.(orderId || idKey)
            }
            disabled={loading}
          >
            <Truck size={13} />
            Shipped
          </Button>
        </div>
      </Td>
    </tr>
  );
}

function Chip({ children, tone = "neutral" }) {
  const tones = {
    neutral:
      "border-zinc-200 bg-zinc-100 text-zinc-800",

    accent:
      "border-blue-200 bg-blue-50 text-blue-800",

    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800",

    warning:
      "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        tones[tone] || tones.neutral,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "secondary",
}) {
  const variants = {
    secondary: disabled
      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
      : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100",

    primary: disabled
      ? "cursor-not-allowed border-blue-200 bg-blue-300 text-white"
      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition",
        variants[variant] || variants.secondary,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      className={[
        "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none",
        "placeholder:text-zinc-400 focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-zinc-100",
        className,
      ].join(" ")}
    />
  );
}

function MobileRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0">
      <div className="shrink-0 text-[11px] font-semibold text-zinc-500">
        {label}
      </div>

      <div className="min-w-0 text-right text-xs text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function Td({
  children,
  colSpan,
  className = "",
}) {
  return (
    <td
      colSpan={colSpan}
      className={[
        "whitespace-nowrap px-3 py-2 align-top",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}
