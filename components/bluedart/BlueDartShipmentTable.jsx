"use client";

import Link from "next/link";
import {
  RefreshCcw,
  Eye,
  ExternalLink,
  Package,
  Truck,
  AlertCircle,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const fmt = (v) => {
  if (!v) return "-";

  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (v, currency = "INR") => {
  const amount = Number(v || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getAwb = (s = {}) => safe(s?.awb || s?.awbNumber);
const getShipmentId = (s = {}) =>
  safe(s?.shipmentId || s?.shipmentIdExternal || s?.eshipzOrderId);
const getCarrier = (s = {}) => safe(s?.carrierName || "BlueDart");
const getProvider = (s = {}) => safe(s?.provider || "eshipz");
const getTrackUrl = (s = {}) => safe(s?.trackingUrl);

const Pill = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
    {children}
  </span>
);

export default function BlueDartShipmentTable({
  shipments = [],
  loading = false,
}) {
  const { tracking, trackShipment } = useBlueDartStore();

  return (
    <div className="overflow-hidden rounded-[28px] bg-white">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            Eshipz / BlueDart Shipments
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Provider is Eshipz. Carrier/courier can be BlueDart.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>Provider: eshipz</Pill>
          <Pill>{shipments.length} records</Pill>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1150px] w-full">
          <thead className="bg-neutral-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Sync</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {loading && shipments.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-14 text-center text-sm text-neutral-500"
                >
                  Loading Eshipz shipments...
                </td>
              </tr>
            ) : shipments.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-14 text-center text-sm text-neutral-500"
                >
                  No Eshipz / BlueDart shipments found.
                </td>
              </tr>
            ) : (
              shipments.map((s) => {
                const awb = getAwb(s);
                const shipmentId = getShipmentId(s);
                const trackingUrl = getTrackUrl(s);
                const disabled = tracking || !s?._id;

                return (
                  <tr
                    key={s?._id}
                    className="bg-white transition hover:bg-neutral-50/70"
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-neutral-950">
                        {safe(s?.orderNumber) || "-"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Ref: {safe(s?.referenceNumber) || "-"}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Package size={15} className="text-neutral-400" />
                        <span className="font-medium text-neutral-900">
                          {awb || "AWB pending"}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        Shipment ID: {shipmentId || "-"}
                      </div>

                      {trackingUrl ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 underline-offset-4 hover:underline"
                        >
                          Track URL
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Truck size={15} className="text-neutral-400" />
                        <span className="font-medium text-neutral-900">
                          {getCarrier(s)}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        Provider: {getProvider(s)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-neutral-900">
                        {safe(s?.recipient?.fullName) || "-"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {safe(s?.recipient?.phone) || "-"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {[s?.recipient?.city, s?.recipient?.pincode]
                          .map(safe)
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-neutral-900">
                        {safe(s?.paymentMode) || "-"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {money(s?.declaredValue, s?.currency)}
                      </div>
                      {lower(s?.paymentMode) === "cod" ? (
                        <div className="mt-1 text-xs text-neutral-500">
                          COD: {money(s?.codAmount, s?.currency)}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <BlueDartShipmentBadge status={s?.status} />

                      {safe(s?.rawStatus) ? (
                        <div className="mt-2 max-w-[170px] truncate text-xs text-neutral-500">
                          {safe(s?.rawStatus)}
                        </div>
                      ) : null}

                      {safe(s?.syncError) ? (
                        <div className="mt-2 flex max-w-[190px] items-start gap-1.5 rounded-2xl bg-red-50 px-2.5 py-2 text-xs text-red-700">
                          <AlertCircle size={13} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{s.syncError}</span>
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-neutral-700">
                      <div>{fmt(s?.lastSyncedAt)}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Created: {fmt(s?.createdAt)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => trackShipment(s?._id)}
                          disabled={disabled}
                          className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCcw
                            size={14}
                            className={tracking ? "animate-spin" : ""}
                          />
                          Track
                        </button>

                        <Link
                          href={`/bluedart/${s?._id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}