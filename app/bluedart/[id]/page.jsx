"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  RefreshCcw,
  Package,
  Hash,
  Truck,
  CreditCard,
  Activity,
  RadioTower,
  ExternalLink,
  User,
  MapPin,
  Phone,
  Mail,
  CalendarClock,
  FileText,
  AlertCircle,
  ArrowLeft,
  IndianRupee,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const safe = (v) => (v == null ? "" : String(v));

const fmt = (v) => {
  if (!v) return "—";

  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return "—";

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

const getAwb = (shipment = {}) => safe(shipment?.awb || shipment?.awbNumber);
const getShipmentId = (shipment = {}) =>
  safe(
    shipment?.shipmentId ||
      shipment?.shipmentIdExternal ||
      shipment?.eshipzOrderId
  );

const InfoItem = ({ icon: Icon, label, value, full = false }) => (
  <div
    className={`rounded-3xl bg-neutral-50 px-4 py-4 ring-1 ring-neutral-100 ${
      full ? "col-span-1 md:col-span-2" : ""
    }`}
  >
    <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
      <Icon size={16} className="text-neutral-400" />
      <span>{label}</span>
    </div>

    <div className="break-words text-sm font-semibold text-neutral-950">
      {value || "—"}
    </div>
  </div>
);

const JsonBlock = ({ title, data }) => {
  if (!data) return null;

  return (
    <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Raw Eshipz response for debugging.
        </p>
      </div>

      <pre className="max-h-[420px] overflow-auto rounded-3xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
};

const TimelineItem = ({ label, value }) => {
  if (!value) return null;

  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-black" />
      <div>
        <p className="text-sm font-semibold text-neutral-950">{label}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{fmt(value)}</p>
      </div>
    </div>
  );
};

export default function BlueDartShipmentDetailPage() {
  const params = useParams();
  const id = params?.id;

  const {
    shipment,
    shipmentLoading,
    tracking,
    fetchShipmentById,
    trackShipment,
  } = useBlueDartStore();

  useEffect(() => {
    if (id) fetchShipmentById(id);
  }, [id, fetchShipmentById]);

  const timeline = useMemo(
    () => [
      { label: "Booking Requested", value: shipment?.bookingRequestedAt },
      { label: "Booked", value: shipment?.bookedAt },
      { label: "Pickup Scheduled", value: shipment?.pickupScheduledAt },
      { label: "Picked Up", value: shipment?.pickedUpAt },
      { label: "Shipped", value: shipment?.shippedAt },
      { label: "Out for Delivery", value: shipment?.outForDeliveryAt },
      { label: "Delivered", value: shipment?.deliveredAt },
      { label: "RTO", value: shipment?.rtoAt },
      { label: "Failed", value: shipment?.failedAt },
      { label: "Cancelled", value: shipment?.cancelledAt },
      { label: "Last Synced", value: shipment?.lastSyncedAt },
    ],
    [shipment]
  );

  if (!shipment) {
    return (
      <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 md:px-6">
        <div className="rounded-[32px] bg-white px-6 py-14 shadow-sm ring-1 ring-neutral-100">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100">
              <Package className="text-neutral-500" size={24} />
            </div>

            <h2 className="text-lg font-semibold text-neutral-950">
              {shipmentLoading ? "Loading shipment" : "Shipment not found"}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {shipmentLoading
                ? "Please wait while we fetch the shipment details."
                : "This shipment may not exist or failed to load."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const awb = getAwb(shipment);
  const shipmentId = getShipmentId(shipment);
  const trackingUrl = safe(shipment?.trackingUrl);

  return (
    <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 md:px-6">
      <div className="space-y-6">
        <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link
                href="/bluedart/shipments"
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-black"
              >
                <ArrowLeft size={16} />
                Back to shipments
              </Link>

              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-black text-white shadow-sm">
                <Package size={20} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  Eshipz / BlueDart Shipment
                </h1>

                <BlueDartShipmentBadge status={shipment.status} />
              </div>

              <p className="mt-2 text-sm text-neutral-500">
                Order{" "}
                <span className="font-semibold text-neutral-900">
                  {shipment.orderNumber || "—"}
                </span>{" "}
                booked through{" "}
                <span className="font-semibold text-neutral-900">Eshipz</span>
                {" "}with carrier{" "}
                <span className="font-semibold text-neutral-900">
                  {shipment.carrierName || "BlueDart"}
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
                >
                  <ExternalLink size={16} />
                  Open Tracking
                </a>
              ) : null}

              <button
                onClick={() => trackShipment(id)}
                disabled={tracking}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={16}
                  className={tracking ? "animate-spin" : ""}
                />
                {tracking ? "Tracking..." : "Track Shipment"}
              </button>
            </div>
          </div>
        </section>

        {shipment?.syncError ? (
          <section className="rounded-[32px] bg-red-50 p-5 text-red-700 ring-1 ring-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold">Sync Error</h2>
                <p className="mt-1 text-sm">{shipment.syncError}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <InfoItem icon={RadioTower} label="Provider" value="eshipz" />
          <InfoItem
            icon={Truck}
            label="Carrier"
            value={shipment.carrierName || "BlueDart"}
          />
          <InfoItem icon={Hash} label="AWB" value={awb} />
          <InfoItem icon={Package} label="Shipment ID" value={shipmentId} />
        </section>

        <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-950">
              Shipment Information
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Basic shipment, payment, package and tracking details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem icon={Hash} label="Order Number" value={shipment.orderNumber} />
            <InfoItem icon={Hash} label="Reference Number" value={shipment.referenceNumber} />

            <InfoItem icon={Package} label="Service Type" value={shipment.serviceType} />
            <InfoItem icon={CreditCard} label="Payment Mode" value={shipment.paymentMode} />

            <InfoItem
              icon={IndianRupee}
              label="Declared Value"
              value={money(shipment.declaredValue, shipment.currency)}
            />

            <InfoItem
              icon={IndianRupee}
              label="COD Amount"
              value={money(shipment.codAmount, shipment.currency)}
            />

            <InfoItem
              icon={Package}
              label="Package"
              value={`${shipment.weight || 0} kg · ${shipment.pieces || 1} piece(s)`}
            />

            <InfoItem
              icon={Package}
              label="Dimensions"
              value={`${shipment?.dimensions?.length || 0} × ${
                shipment?.dimensions?.breadth || 0
              } × ${shipment?.dimensions?.height || 0} cm`}
            />

            <InfoItem icon={CalendarClock} label="Expected Delivery" value={fmt(shipment.expectedDelivery)} />
            <InfoItem icon={CalendarClock} label="Last Synced" value={fmt(shipment.lastSyncedAt)} />

            <div className="rounded-3xl bg-neutral-50 px-4 py-4 ring-1 ring-neutral-100 md:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                <Activity size={16} className="text-neutral-400" />
                <span>Status</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <BlueDartShipmentBadge status={shipment.status} />
                {shipment.rawStatus ? (
                  <span className="text-sm text-neutral-500">
                    Raw: {shipment.rawStatus}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-neutral-950">
                Recipient
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Customer shipping address snapshot.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <InfoItem icon={User} label="Name" value={shipment?.recipient?.fullName} />
              <InfoItem icon={Phone} label="Phone" value={shipment?.recipient?.phone} />
              <InfoItem icon={Mail} label="Email" value={shipment?.recipient?.email} />
              <InfoItem
                icon={MapPin}
                label="Address"
                value={[
                  shipment?.recipient?.line1,
                  shipment?.recipient?.line2,
                  shipment?.recipient?.city,
                  shipment?.recipient?.state,
                  shipment?.recipient?.pincode,
                ]
                  .map(safe)
                  .filter(Boolean)
                  .join(", ")}
              />
            </div>
          </section>

          <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-neutral-950">
                Timeline
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Local shipment timeline from booking and sync data.
              </p>
            </div>

            <div className="space-y-5">
              {timeline.some((item) => item.value) ? (
                timeline.map((item) => (
                  <TimelineItem
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))
              ) : (
                <p className="text-sm text-neutral-500">
                  No timeline events available yet.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <FileText size={18} className="text-neutral-400" />
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Tracking Events
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Latest Eshipz tracking scans.
              </p>
            </div>
          </div>

          {Array.isArray(shipment.trackingEvents) &&
          shipment.trackingEvents.length ? (
            <div className="overflow-hidden rounded-3xl ring-1 ring-neutral-100">
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Location</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100">
                    {shipment.trackingEvents.map((event, index) => (
                      <tr key={`${event?.eventTime || "event"}-${index}`}>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {fmt(event?.eventTime)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-950">
                          {event?.eventName || event?.eventCode || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {event?.eventDescription || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {event?.eventLocation || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500 ring-1 ring-neutral-100">
              No tracking events yet. Click Track Shipment to sync latest scans.
            </div>
          )}
        </section>

        <JsonBlock title="Raw Create Response" data={shipment.rawCreateResponse} />
        <JsonBlock title="Raw Tracking Response" data={shipment.rawTrackingResponse} />
      </div>
    </main>
  );
}