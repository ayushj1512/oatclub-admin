"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Tag,
  Truck,
  XCircle,
} from "lucide-react";

import { toast } from "react-hot-toast";

import OrderRowActions from "@/components/orders/OrderRowActions";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const safe = (value) => String(value ?? "").trim();

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  if (!value) {
    return {
      time: "—",
      date: "—",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      time: "—",
      date: "—",
    };
  }

  return {
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),

    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
};

const getOrderId = (order = {}) =>
  safe(order?._id || order?.id);

const getCustomerName = (order = {}) =>
  safe(
    order?.customerId?.name ||
    order?.customerName ||
    order?.shippingAddressSnapshot?.fullName
  ) || "Customer";

const getCustomerPhone = (order = {}) =>
  safe(
    order?.customerId?.phone ||
    order?.customerPhone ||
    order?.shippingAddressSnapshot?.phone
  );

const getCustomerLocation = (order = {}) => {
  const address = order?.shippingAddressSnapshot || {};

  return [address?.city, address?.state]
    .map(safe)
    .filter(Boolean)
    .join(", ");
};

const getItems = (order = {}) =>
  Array.isArray(order?.items) ? order.items : [];

const getTotalQuantity = (order = {}) =>
  getItems(order).reduce(
    (total, item) =>
      total + Math.max(1, Number(item?.quantity || 1)),
    0
  );

const getItemTitle = (item = {}) =>
  safe(
    item?.productSnapshot?.title ||
    item?.productId?.title ||
    item?.title
  ) || "Product";

const getItemSize = (item = {}) =>
  safe(
    item?.selectedSize ||
    item?.variant?.size ||
    item?.variant?.attributes?.find(
      (attribute) =>
        safe(attribute?.key).toLowerCase() === "size"
    )?.value
  );

export const getPackedShippingMeta = (order = {}) => {
  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};
  const serviceability = shipment?.serviceability || {};

  const awb = safe(
    shipment?.awb ||
    shiprocket?.awb ||
    order?.trackingId ||
    order?.trackingDetails?.trackingId ||
    order?.trackingDetails?.awb
  );

  const courierName = safe(
    shipment?.courierName ||
    shiprocket?.courierName ||
    order?.courierName ||
    order?.trackingDetails?.courierName
  );

  const shipmentStatus = safe(shipment?.status).toLowerCase();

  const serviceabilityStatus = safe(
    serviceability?.status
  ).toLowerCase();

  if (serviceabilityStatus === "unserviceable") {
    return {
      key: "unserviceable",
      label: "Unserviceable",
      description:
        serviceability?.message ||
        "Courier serviceability unavailable",
      awb,
      courierName,
    };
  }

  if (
    shipmentStatus === "failed" ||
    serviceabilityStatus === "error"
  ) {
    return {
      key: "failed",
      label: "Booking Failed",
      description:
        serviceability?.message ||
        shipment?.rawStatus ||
        "Shipment booking failed",
      awb,
      courierName,
    };
  }

  if (awb) {
    return {
      key: "serviceable",
      label: "Ready",
      description: "AWB assigned",
      awb,
      courierName,
    };
  }

  return {
    key: "missing_awb",
    label: "Missing AWB",
    description:
      "Tracking / courier assignment needs attention",
    awb: "",
    courierName,
  };
};

const shippingStyles = {
  serviceable: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },

  unserviceable: {
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-900",
    icon: AlertTriangle,
  },

  missing_awb: {
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-900",
    icon: AlertTriangle,
  },

  failed: {
    className:
      "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
};

function PackedOrderRow({
  order,
  selectable = false,
  selected = false,
  onSelect,
  onUpdated,
  openActionsUp = false,
}) {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncTracking = useShiprocketStore(
    (state) => state.syncTracking
  );

  const orderId = getOrderId(order);

  const shippingMeta = useMemo(
    () => getPackedShippingMeta(order),
    [order]
  );

  const shippingStyle =
    shippingStyles[shippingMeta.key] ||
    shippingStyles.missing_awb;

  const ShippingIcon = shippingStyle.icon;

  const packedDate = useMemo(
    () =>
      formatDateTime(
        order?.fulfillmentDates?.packedAt ||
        order?.updatedAt ||
        order?.createdAt
      ),
    [
      order?.fulfillmentDates?.packedAt,
      order?.updatedAt,
      order?.createdAt,
    ]
  );

  const items = useMemo(() => getItems(order), [order]);
  const totalQuantity = useMemo(
    () => getTotalQuantity(order),
    [order]
  );

  const handleSync = useCallback(async () => {
    if (!orderId || syncing) return;

    try {
      setSyncing(true);

      const result = await syncTracking({
        orderId,
        orderNumber: order?.orderNumber,
      });

      const updatedOrder =
        result?.order ||
        result?.data?.order ||
        result?.updatedOrder ||
        result?.data;

      if (updatedOrder?._id || updatedOrder?.id) {
        onUpdated?.(updatedOrder);
      }

      toast.success(
        `Tracking synced for ${order?.orderNumber || "order"
        }`
      );
    } catch (error) {
      toast.error(
        error?.message || "Tracking sync failed"
      );
    } finally {
      setSyncing(false);
    }
  }, [
    orderId,
    syncing,
    syncTracking,
    order?.orderNumber,
    onUpdated,
  ]);

  const goToOrder = useCallback(() => {
    if (!orderId || typeof window === "undefined") return;

    window.open(
      `/orders/${orderId}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [orderId]);

  return (
    <>
      <tr
        className={[
          "border-b border-black/[0.06] bg-white transition hover:bg-gray-50/80",
          shippingMeta.key === "unserviceable" ||
            shippingMeta.key === "missing_awb"
            ? "bg-yellow-50/20"
            : "",
        ].join(" ")}
      >
        {selectable ? (
          <td className="w-12 px-4 py-4 align-top">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) =>
                onSelect?.(
                  orderId,
                  event.target.checked
                )
              }
              aria-label={`Select ${order?.orderNumber || "order"
                }`}
              className="h-4 w-4 rounded border-gray-300 accent-black"
            />
          </td>
        ) : null}

        <td className="px-5 py-4 align-top">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() =>
                setOpen((current) => !current)
              }
              className="mt-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-gray-700 transition hover:bg-gray-100"
            >
              {open ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            <div>
              <button
                type="button"
                onClick={goToOrder}
                className="inline-flex items-center gap-1 font-mono text-sm font-black text-gray-950 underline decoration-black/20 underline-offset-2"
              >
                {order?.orderNumber || "—"}
                <ExternalLink size={13} />
              </button>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <PackageCheck size={13} />
                {totalQuantity} item
                {totalQuantity === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </td>

        <td className="px-5 py-4 align-top">
          <div className="font-semibold text-gray-900">
            {getCustomerName(order)}
          </div>

          {getCustomerPhone(order) ? (
            <div className="mt-0.5 text-xs text-gray-500">
              {getCustomerPhone(order)}
            </div>
          ) : null}

          {getCustomerLocation(order) ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={12} />
              {getCustomerLocation(order)}
            </div>
          ) : null}
        </td>

        <td className="px-5 py-4 align-top">
          <div className="space-y-1.5">
            {items.slice(0, 2).map((item, index) => {
              const size = getItemSize(item);

              return (
                <div
                  key={item?.lineId || index}
                  className="max-w-[260px]"
                >
                  <div className="truncate text-xs font-semibold text-gray-900">
                    {getItemTitle(item)}
                  </div>

                  <div className="text-[11px] text-gray-500">
                    {size ? `Size ${size}` : ""}
                    {size ? " • " : ""}
                    Qty {Math.max(
                      1,
                      Number(item?.quantity || 1)
                    )}
                  </div>
                </div>
              );
            })}

            {items.length > 2 ? (
              <div className="text-[11px] font-semibold text-gray-500">
                +{items.length - 2} more
              </div>
            ) : null}
          </div>
        </td>

        <td className="px-5 py-4 align-top">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold uppercase text-gray-800">
            {safe(order?.paymentMethod) || "COD"}
          </div>

          <div className="mt-2 font-mono text-sm font-black text-gray-950">
            ₹{money(order?.finalPayable)}
          </div>
        </td>

        <td className="px-5 py-4 align-top">
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${shippingStyle.className}`}
          >
            <ShippingIcon size={15} />

            {shippingMeta.label}
          </div>

          <div className="mt-1.5 max-w-[190px] text-[11px] leading-4 text-gray-500">
            {shippingMeta.description}
          </div>

          {shippingMeta.courierName ? (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-700">
              <Truck size={12} />
              {shippingMeta.courierName}
            </div>
          ) : null}
        </td>

        <td className="px-5 py-4 align-top">
          {shippingMeta.awb ? (
            <div>
              <div className="font-mono text-xs font-black text-gray-950">
                {shippingMeta.awb}
              </div>

              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Assigned
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-1.5 text-xs font-black text-yellow-900">
              <AlertTriangle size={14} />
              No AWB
            </div>
          )}
        </td>

        <td className="px-5 py-4 align-top">
          <div className="text-sm font-semibold text-gray-900">
            {packedDate.time}
          </div>

          <div className="mt-0.5 text-[11px] text-gray-500">
            {packedDate.date}
          </div>
        </td>

        <td className="px-5 py-4 align-top">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              title="Sync tracking"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  syncing ? "animate-spin" : ""
                }
              />
            </button>

            <OrderRowActions
              order={order}
              courierName={shippingMeta.courierName}
              trackingId={shippingMeta.awb}
              openUp={openActionsUp}
              onUpdated={onUpdated}
            />
          </div>
        </td>
      </tr>

      {open ? (
        <tr className="border-b border-black/[0.06] bg-gray-50">
          <td
            colSpan={selectable ? 9 : 8}
            className="px-5 pb-5"
          >
            <div className="mt-3 grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                  Shipping Status
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <ShippingIcon
                    size={17}
                    className={
                      shippingMeta.key ===
                        "unserviceable" ||
                        shippingMeta.key ===
                        "missing_awb"
                        ? "text-yellow-600"
                        : shippingMeta.key ===
                          "serviceable"
                          ? "text-emerald-600"
                          : "text-red-600"
                    }
                  />

                  <span className="font-bold text-gray-950">
                    {shippingMeta.label}
                  </span>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {shippingMeta.description}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                  Shipment
                </div>

                <div className="mt-2 text-sm font-semibold text-gray-900">
                  Courier:{" "}
                  {shippingMeta.courierName || "—"}
                </div>

                <div className="mt-1 text-sm text-gray-600">
                  AWB: {shippingMeta.awb || "—"}
                </div>

                <div className="mt-1 text-sm text-gray-600">
                  Provider:{" "}
                  {safe(order?.shipment?.provider) ||
                    "unassigned"}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                  Dispatch Notes
                </div>

                <div className="mt-2 text-sm text-gray-700">
                  {safe(order?.adminRemarks) ||
                    safe(
                      order?.customerSupportRemark
                    ) ||
                    "No dispatch remarks"}
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-gray-400">
                  <Tag size={13} />
                  Packed Items
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {items.map((item, index) => (
                    <div
                      key={item?.lineId || index}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="text-sm font-bold text-gray-900">
                        {getItemTitle(item)}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {safe(
                          item?.productSnapshot
                            ?.productCode
                        ) || "No product code"}
                        {" • "}
                        {getItemSize(item)
                          ? `Size ${getItemSize(item)}`
                          : "No size"}
                        {" • "}
                        Qty{" "}
                        {Math.max(
                          1,
                          Number(
                            item?.quantity || 1
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default memo(PackedOrderRow);
