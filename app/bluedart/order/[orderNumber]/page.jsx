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
} from "lucide-react";
import toast from "react-hot-toast";

import { useBlueDartStore } from "@/store/bluedartStore";

const initialCreateForm = {
  weight: "0.5",
  length: "10",
  breadth: "10",
  height: "10",
  pieces: "1",
  notes: "",
  serviceType: "",
};

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const formatDateTime = (value) => {
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
    if (orderNumber) {
      fetchShipmentByOrderNumber(orderNumber);
    }
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
      weight: safeNum(form.weight, 0.5),
      length: safeNum(form.length, 10),
      breadth: safeNum(form.breadth, 10),
      height: safeNum(form.height, 10),
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
      <main className="p-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          Invalid order number.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                BlueDart Order View
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                Order {orderNumber}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Is order ke saare BlueDart shipments, latest status, aur quick
                actions yahin se manage karo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fetchShipmentByOrderNumber(orderNumber)}
                disabled={shipmentLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
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
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                <Box className="h-4 w-4" />
                All Shipments
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Hash}
                label="Order Number"
                value={orderNumber}
              />
              <StatCard
                icon={Truck}
                label="Latest Status"
                value={latestShipment?.status ? labelize(latestShipment.status) : "-"}
              />
              <StatCard
                icon={FileText}
                label="Latest AWB"
                value={latestShipment?.awbNumber || "-"}
              />
              <StatCard
                icon={Box}
                label="Shipment Count"
                value={String(orderShipments?.length || 0)}
              />
            </div>

            <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Latest Shipment
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Is order ka sabse recent shipment.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {latestShipment?._id ? (
                    <Link
                      href={`/bluedart/${latestShipment._id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Open Detail
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleTrackLatest}
                    disabled={!latestShipment?._id || tracking}
                    className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
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
                  <InfoRow label="Shipment ID" value={latestShipment._id} />
                  <InfoRow
                    label="AWB Number"
                    value={latestShipment.awbNumber || "-"}
                  />
                  <InfoRow
                    label="Status"
                    value={labelize(latestShipment.status || "-")}
                  />
                  <InfoRow
                    label="Payment Mode"
                    value={latestShipment.paymentMode || "-"}
                  />
                  <InfoRow
                    label="Service Type"
                    value={latestShipment.serviceType || "-"}
                  />
                  <InfoRow
                    label="Declared Value"
                    value={`${latestShipment.currency || "INR"} ${
                      latestShipment.declaredValue || 0
                    }`}
                  />
                  <InfoRow
                    label="Weight"
                    value={`${latestShipment.weight || 0} kg`}
                  />
                  <InfoRow
                    label="Pieces"
                    value={String(latestShipment.pieces || 0)}
                  />
                  <InfoRow
                    label="Created At"
                    value={formatDateTime(latestShipment.createdAt)}
                  />
                  <InfoRow
                    label="Last Synced"
                    value={formatDateTime(latestShipment.lastSyncedAt)}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                  No shipment exists for this order yet.
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Shipment History
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Is order ke saare created shipments.
              </p>

              <div className="mt-5 space-y-3">
                {shipmentLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading shipments...
                  </div>
                ) : orderShipments?.length ? (
                  orderShipments.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-2xl border border-neutral-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                              {labelize(item.status || "unknown")}
                            </span>
                            <span className="text-sm text-neutral-500">
                              {item.awbNumber || "No AWB yet"}
                            </span>
                          </div>

                          <div className="grid gap-1 text-sm text-neutral-600">
                            <p>
                              <span className="font-medium text-neutral-900">
                                Shipment ID:
                              </span>{" "}
                              {item._id}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-900">
                                Service:
                              </span>{" "}
                              {item.serviceType || "-"}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-900">
                                Updated:
                              </span>{" "}
                              {formatDateTime(item.updatedAt)}
                            </p>
                            {item.latestTrackingRemark ? (
                              <p>
                                <span className="font-medium text-neutral-900">
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
                            className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() => trackShipment(item._id)}
                            disabled={tracking}
                            className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                          >
                            Track
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                    No shipment history available.
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-neutral-700" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  Create Shipment
                </h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Is order number ke against naya BlueDart shipment create karo.
              </p>

              <form onSubmit={handleCreate} className="mt-5 space-y-4">
                <Field
                  label="Order Number"
                  value={orderNumber}
                  readOnly
                />

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
                  placeholder="eTailPrePaidAir / eTailCODAir"
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
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
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

            <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
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
                  <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
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
                <p className="mt-4 text-sm text-neutral-500">
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
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-900 break-all">
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
        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 read-only:bg-neutral-50"
      />
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium text-neutral-900 break-all">
        {value}
      </span>
    </div>
  );
}

function MiniInfo({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        <Icon className="h-4 w-4 text-neutral-700" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{subtitle || "-"}</p>
      </div>
    </div>
  );
}