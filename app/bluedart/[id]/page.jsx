"use client";

import { useEffect, useMemo, useCallback } from "react";
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
  Clock3,
  CheckCircle2,
  Route,
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

const getTrackingUrl = (shipment = {}) => {
  const awb = getAwb(shipment);

  return (
    shipment?.trackingUrl ||
    shipment?.tracking_url ||
    shipment?.trackingURL ||
    (awb ? `https://track.eshipz.com/track?awb=${encodeURIComponent(awb)}` : "")
  );
};

const addressText = (address = {}) =>
  [
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.pincode,
    address?.country,
  ]
    .map(safe)
    .filter(Boolean)
    .join(", ");

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

  const handleTrack = useCallback(async () => {
    if (!id) return;

    const res = await trackShipment(id);

    if (res?.success) {
      await fetchShipmentById(id);

      const url =
        res?.trackingUrl ||
        res?.shipment?.trackingUrl ||
        getTrackingUrl(shipment);

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  }, [id, trackShipment, fetchShipmentById, shipment]);

  const awb = getAwb(shipment);
  const shipmentId = getShipmentId(shipment);
  const trackingUrl = getTrackingUrl(shipment);

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
      { label: "Last Track", value: shipment?.lastTrackAt },
    ],
    [shipment]
  );

  const trackingEvents = Array.isArray(shipment?.trackingEvents)
    ? shipment.trackingEvents
    : [];

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

  return (
    <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 md:px-6">
      <div className="space-y-6">
        <HeaderCard
          shipment={shipment}
          tracking={tracking}
          trackingUrl={trackingUrl}
          onTrack={handleTrack}
        />

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

        <Card title="Shipment Overview" icon={Activity}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem
              icon={Hash}
              label="Order Number"
              value={shipment.orderNumber}
            />
            <InfoItem
              icon={Hash}
              label="Reference Number"
              value={shipment.referenceNumber}
            />

            <InfoItem
              icon={Package}
              label="Service Type"
              value={shipment.serviceType}
            />
            <InfoItem
              icon={CreditCard}
              label="Payment Mode"
              value={shipment.paymentMode}
            />

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
              value={`${shipment.weight || 0} kg · ${
                shipment.pieces || 1
              } piece(s)`}
            />

            <InfoItem
              icon={Route}
              label="Dimensions"
              value={`${shipment?.dimensions?.length || 0} × ${
                shipment?.dimensions?.breadth || 0
              } × ${shipment?.dimensions?.height || 0} cm`}
            />

            <InfoItem
              icon={CalendarClock}
              label="Expected Delivery"
              value={fmt(shipment.expectedDelivery)}
            />
            <InfoItem
              icon={Clock3}
              label="Last Synced"
              value={fmt(shipment.lastSyncedAt)}
            />

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
        </Card>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Recipient" icon={User}>
            <div className="grid grid-cols-1 gap-4">
              <InfoItem
                icon={User}
                label="Name"
                value={shipment?.recipient?.fullName}
              />
              <InfoItem
                icon={Phone}
                label="Phone"
                value={shipment?.recipient?.phone}
              />
              <InfoItem
                icon={Mail}
                label="Email"
                value={shipment?.recipient?.email}
              />
              <InfoItem
                icon={MapPin}
                label="Address"
                value={addressText(shipment?.recipient)}
              />
            </div>
          </Card>

          <Card title="Timeline" icon={CalendarClock}>
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
                <EmptyBlock text="No timeline events available yet." />
              )}
            </div>
          </Card>
        </section>

        <Card title="Tracking History" icon={FileText}>
          {trackingEvents.length ? (
            <div className="space-y-3">
              {trackingEvents.map((event, index) => (
                <TrackingHistoryItem
                  key={`${event?.eventTime || event?.date || "event"}-${index}`}
                  event={event}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-neutral-50 px-4 py-10 text-center ring-1 ring-neutral-100">
              <p className="text-sm font-medium text-neutral-700">
                No tracking history available yet.
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Click Track Shipment to open Eshipz tracking page.
              </p>

              <button
                onClick={handleTrack}
                disabled={tracking}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={16}
                  className={tracking ? "animate-spin" : ""}
                />
                {tracking ? "Tracking..." : "Track Shipment"}
              </button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function HeaderCard({ shipment, tracking, trackingUrl, onTrack }) {
  return (
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
            <span className="font-semibold text-neutral-900">Eshipz</span> with
            carrier{" "}
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
            onClick={onTrack}
            disabled={tracking}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={tracking ? "animate-spin" : ""} />
            {tracking ? "Tracking..." : "Track Shipment"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-2xl bg-neutral-100 p-2">
          <Icon size={17} className="text-neutral-700" />
        </div>
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-neutral-50 px-4 py-4 ring-1 ring-neutral-100">
      <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
        <Icon size={16} className="text-neutral-400" />
        <span>{label}</span>
      </div>

      <div className="break-words text-sm font-semibold text-neutral-950">
        {value || "—"}
      </div>
    </div>
  );
}

function TimelineItem({ label, value }) {
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
}

function TrackingHistoryItem({ event }) {
  const title =
    event?.eventName ||
    event?.eventCode ||
    event?.status ||
    event?.activity ||
    "Tracking Update";

  const description =
    event?.eventDescription ||
    event?.description ||
    event?.message ||
    event?.remarks ||
    "—";

  const location =
    event?.eventLocation ||
    event?.location ||
    event?.city ||
    event?.scan_location ||
    "—";

  const time = event?.eventTime || event?.date || event?.time || null;

  return (
    <div className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
            <CheckCircle2 size={14} />
            {title}
          </div>

          <p className="break-words text-sm text-neutral-700">{description}</p>

          <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin size={14} />
            {location}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-neutral-600 shadow-sm">
          {fmt(time)}
        </div>
      </div>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-5 text-sm font-medium text-neutral-500 ring-1 ring-neutral-100">
      {text}
    </div>
  );
}