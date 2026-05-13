"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Loader2,
  PackagePlus,
  RefreshCcw,
  Truck,
  FileText,
  MapPin,
  Hash,
  RadioTower,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const initialCreateForm = {
  weight: "0.5",
  length: "25",
  breadth: "20",
  height: "5",
  pieces: "1",
  notes: "",
  serviceType: "",
  carrierName: "BlueDart",
  carrierSlug: "bluedart",
};

const safe = (v) => (v == null ? "" : String(v));

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const fmt = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const labelize = (value = "") =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const getAwb = (s = {}) => safe(s?.awb || s?.awbNumber);
const getShipmentId = (s = {}) =>
  safe(s?.shipmentId || s?.shipmentIdExternal || s?.eshipzOrderId);

export default function BlueDartOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = decodeURIComponent(params?.orderNumber || "");

  const {
    shipment,
    orderShipments,
    shipmentLoading,
    creating,
    tracking,
    fetchShipmentByOrderNumber,
    createShipmentFromOrder,
    trackShipment,
  } = useBlueDartStore();

  const [form, setForm] = useState(initialCreateForm);

  useEffect(() => {
    if (orderNumber) fetchShipmentByOrderNumber(orderNumber);
  }, [orderNumber, fetchShipmentByOrderNumber]);

  const latestShipment = useMemo(
    () => orderShipments?.[0] || shipment || null,
    [orderShipments, shipment]
  );

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!orderNumber) {
      toast.error("Order number missing");
      return;
    }

    const payload = {
      orderNumber,
      provider: "eshipz",
      carrierName: form.carrierName.trim() || "BlueDart",
      carrierSlug: form.carrierSlug.trim() || "bluedart",
      weight: safeNum(form.weight, 0.5),
      length: safeNum(form.length, 25),
      breadth: safeNum(form.breadth, 20),
      height: safeNum(form.height, 5),
      pieces: safeNum(form.pieces, 1),
      notes: form.notes.trim(),
      serviceType: form.serviceType.trim(),
    };

    const res = await createShipmentFromOrder(payload);
    if (res?.success) {
      setForm(initialCreateForm);
      await fetchShipmentByOrderNumber(orderNumber);
    }
  };

  const handleTrackLatest = async () => {
    if (!latestShipment?._id) {
      toast.error("No shipment found for tracking");
      return;
    }

    await trackShipment(latestShipment._id);
    await fetchShipmentByOrderNumber(orderNumber);
  };

  if (!orderNumber) {
    return (
      <main className="min-h-screen bg-[#f6f6f6] p-6">
        <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-neutral-100">
          Invalid order number.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f6] p-4 md:p-6">
      <div className="space-y-6">
        <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                Eshipz / BlueDart Order View
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
                Order {orderNumber}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                Is order ke Eshipz shipments, latest tracking status, aur quick
                booking actions yahin se manage karo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fetchShipmentByOrderNumber(orderNumber)}
                disabled={shipmentLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 disabled:opacity-60"
              >
                {shipmentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <Link
                href="/bluedart/shipments"
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                <Box className="h-4 w-4" />
                All Shipments
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={Hash} label="Order Number" value={orderNumber} />
          <StatCard
            icon={RadioTower}
            label="Provider"
            value={latestShipment?.provider || "eshipz"}
          />
          <StatCard
            icon={Truck}
            label="Carrier"
            value={latestShipment?.carrierName || "BlueDart"}
          />
          <StatCard
            icon={FileText}
            label="Latest AWB"
            value={getAwb(latestShipment) || "-"}
          />
          <StatCard
            icon={Box}
            label="Shipment Count"
            value={String(orderShipments?.length || 0)}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Latest Shipment
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Is order ka sabse recent local Eshipz shipment.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {latestShipment?._id ? (
                    <Link
                      href={`/bluedart/${latestShipment._id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200"
                    >
                      Open Detail
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleTrackLatest}
                    disabled={!latestShipment?._id || tracking}
                    className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {tracking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Track Latest
                  </button>
                </div>
              </div>

              {latestShipment?._id ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoRow label="Local Shipment ID" value={latestShipment._id} />
                  <InfoRow label="Eshipz Shipment ID" value={getShipmentId(latestShipment) || "-"} />
                  <InfoRow label="AWB" value={getAwb(latestShipment) || "-"} />
                  <InfoRow label="Status" value={<BlueDartShipmentBadge status={latestShipment.status} />} />
                  <InfoRow label="Provider" value={latestShipment.provider || "eshipz"} />
                  <InfoRow label="Carrier" value={latestShipment.carrierName || "BlueDart"} />
                  <InfoRow label="Payment Mode" value={latestShipment.paymentMode || "-"} />
                  <InfoRow label="Service Type" value={latestShipment.serviceType || "-"} />
                  <InfoRow label="Weight" value={`${latestShipment.weight || 0} kg`} />
                  <InfoRow label="Pieces" value={String(latestShipment.pieces || 0)} />
                  <InfoRow label="Created At" value={fmt(latestShipment.createdAt)} />
                  <InfoRow label="Last Synced" value={fmt(latestShipment.lastSyncedAt)} />

                  {latestShipment.trackingUrl ? (
                    <a
                      href={latestShipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 md:col-span-2"
                    >
                      Open Tracking
                      <ExternalLink size={15} />
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl bg-neutral-50 p-5 text-sm text-neutral-500 ring-1 ring-neutral-100">
                  No shipment exists for this order yet.
                </div>
              )}
            </section>

            <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
              <h2 className="text-lg font-semibold text-neutral-950">
                Shipment History
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Is order ke saare created Eshipz shipments.
              </p>

              <div className="mt-5 space-y-3">
                {shipmentLoading ? (
                  <div className="flex items-center gap-2 rounded-3xl bg-neutral-50 p-4 text-sm text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading shipments...
                  </div>
                ) : orderShipments?.length ? (
                  orderShipments.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <BlueDartShipmentBadge status={item.status} />
                            <span className="text-sm text-neutral-500">
                              {getAwb(item) || "No AWB yet"}
                            </span>
                          </div>

                          <div className="grid gap-1 text-sm text-neutral-600">
                            <p>
                              <span className="font-semibold text-neutral-950">
                                Provider:
                              </span>{" "}
                              {item.provider || "eshipz"} ·{" "}
                              <span className="font-semibold text-neutral-950">
                                Carrier:
                              </span>{" "}
                              {item.carrierName || "BlueDart"}
                            </p>
                            <p>
                              <span className="font-semibold text-neutral-950">
                                Shipment ID:
                              </span>{" "}
                              {getShipmentId(item) || item._id}
                            </p>
                            <p>
                              <span className="font-semibold text-neutral-950">
                                Service:
                              </span>{" "}
                              {item.serviceType || "-"}
                            </p>
                            <p>
                              <span className="font-semibold text-neutral-950">
                                Updated:
                              </span>{" "}
                              {fmt(item.updatedAt)}
                            </p>
                            {item.latestTrackingRemark ? (
                              <p>
                                <span className="font-semibold text-neutral-950">
                                  Remark:
                                </span>{" "}
                                {item.latestTrackingRemark}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/bluedart/${item._id}`}
                            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-100 transition hover:bg-neutral-100"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() => trackShipment(item._id)}
                            disabled={tracking}
                            className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                          >
                            Track
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-neutral-50 p-5 text-sm text-neutral-500 ring-1 ring-neutral-100">
                    No shipment history available.
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-neutral-700" />
                <h2 className="text-lg font-semibold text-neutral-950">
                  Create Eshipz Shipment
                </h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Is order number ke against naya Eshipz shipment create karo.
              </p>

              <form onSubmit={handleCreate} className="mt-5 space-y-4">
                <Field label="Order Number" value={orderNumber} readOnly />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Carrier Name"
                    value={form.carrierName}
                    onChange={(v) => setForm((p) => ({ ...p, carrierName: v }))}
                  />
                  <Field
                    label="Carrier Slug"
                    value={form.carrierSlug}
                    onChange={(v) => setForm((p) => ({ ...p, carrierSlug: v }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Weight (kg)"
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(v) => setForm((p) => ({ ...p, weight: v }))}
                  />
                  <Field
                    label="Pieces"
                    type="number"
                    value={form.pieces}
                    onChange={(v) => setForm((p) => ({ ...p, pieces: v }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Length"
                    type="number"
                    value={form.length}
                    onChange={(v) => setForm((p) => ({ ...p, length: v }))}
                  />
                  <Field
                    label="Breadth"
                    type="number"
                    value={form.breadth}
                    onChange={(v) => setForm((p) => ({ ...p, breadth: v }))}
                  />
                  <Field
                    label="Height"
                    type="number"
                    value={form.height}
                    onChange={(v) => setForm((p) => ({ ...p, height: v }))}
                  />
                </div>

                <Field
                  label="Service Type"
                  value={form.serviceType}
                  onChange={(v) => setForm((p) => ({ ...p, serviceType: v }))}
                  placeholder="Auto / eTailPrePaidAir / eTailCODAir"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    rows={4}
                    placeholder="Any shipment notes..."
                    className="w-full rounded-3xl bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 transition focus:bg-white focus:ring-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PackagePlus className="h-4 w-4" />
                      Create Shipment
                    </>
                  )}
                </button>
              </form>
            </section>

            <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
              <h2 className="text-lg font-semibold text-neutral-950">
                Receiver Snapshot
              </h2>

              {latestShipment?.recipient ? (
                <div className="mt-4 space-y-3">
                  <MiniInfo
                    icon={MapPin}
                    title={latestShipment.recipient.fullName || "Customer"}
                    subtitle={[
                      latestShipment.recipient.phone,
                      latestShipment.recipient.city,
                      latestShipment.recipient.state,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  />

                  <div className="rounded-3xl bg-neutral-50 p-4 text-sm text-neutral-600 ring-1 ring-neutral-100">
                    {[
                      latestShipment.recipient.line1,
                      latestShipment.recipient.line2,
                      latestShipment.recipient.city,
                      latestShipment.recipient.state,
                      latestShipment.recipient.pincode,
                      latestShipment.recipient.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-3xl bg-neutral-50 p-5 text-sm text-neutral-500 ring-1 ring-neutral-100">
                  Receiver info will appear after shipment is created.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-2 break-all text-lg font-semibold text-neutral-950">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  readOnly = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      <input
        type={type}
        step={step}
        readOnly={readOnly}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 transition read-only:bg-neutral-100 focus:bg-white focus:ring-black"
      />
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-100">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="break-all text-right text-sm font-semibold text-neutral-950">
        {value || "-"}
      </span>
    </div>
  );
}

function MiniInfo({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        <Icon className="h-4 w-4 text-neutral-700" />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-950">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{subtitle || "-"}</p>
      </div>
    </div>
  );
}