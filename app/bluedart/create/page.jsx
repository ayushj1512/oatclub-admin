"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  PackagePlus,
  Truck,
  Box,
  StickyNote,
  RadioTower,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const initialForm = {
  orderNumber: "",
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

const normalizeOrderNumber = (value) => {
  const raw = safe(value).toUpperCase().trim();
  if (!raw) return "";

  if (raw.startsWith("MIRAY-")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  return `MIRAY-${digits.slice(-6).padStart(6, "0")}`;
};

const getAwb = (shipment = {}) => safe(shipment?.awb || shipment?.awbNumber);
const getShipmentId = (shipment = {}) =>
  safe(
    shipment?.shipmentId ||
      shipment?.shipmentIdExternal ||
      shipment?.eshipzOrderId
  );

export default function BlueDartCreatePage() {
  const { createShipmentFromOrder, creating, shipment, lastUpdatedOrder } =
    useBlueDartStore();

  const [form, setForm] = useState(initialForm);

  const computedPieces = useMemo(
    () => Math.max(1, safeNum(form.pieces, 1)),
    [form.pieces]
  );

  const payloadPreview = useMemo(
    () => ({
      orderNumber: normalizeOrderNumber(form.orderNumber),
      provider: "eshipz",
      carrierName: form.carrierName.trim() || "BlueDart",
      carrierSlug: form.carrierSlug.trim() || "bluedart",
      weight: safeNum(form.weight, 0.5),
      length: safeNum(form.length, 25),
      breadth: safeNum(form.breadth, 20),
      height: safeNum(form.height, 5),
      pieces: computedPieces,
      notes: form.notes.trim(),
      serviceType: form.serviceType.trim(),
    }),
    [form, computedPieces]
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const orderNumber = normalizeOrderNumber(form.orderNumber);

    if (!orderNumber) {
      toast.error("Order number is required");
      return;
    }

    const payload = {
      ...payloadPreview,
      orderNumber,
    };

    const res = await createShipmentFromOrder(payload);

    if (res?.success) {
      setForm(initialForm);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f6f6] p-4 md:p-6">
      <div className="space-y-6">
        <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-black text-white shadow-sm">
                <PackagePlus size={21} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Logistics
                  <ChevronRight size={12} />
                  Eshipz
                  <ChevronRight size={12} />
                  Booking
                </div>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
                  Eshipz Booking Console
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                  Existing confirmed order ke against shipment create karo.
                  Backend order model me{" "}
                  <span className="font-semibold text-neutral-900">
                    shipment.provider = eshipz
                  </span>{" "}
                  save hoga, aur carrier{" "}
                  <span className="font-semibold text-neutral-900">
                    BlueDart
                  </span>{" "}
                  rahega.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/bluedart/shipments"
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
              >
                Shipments
                <ArrowRight size={15} />
              </Link>

              <Link
                href="/bluedart"
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Booking Queue
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                Shipment Details
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Order number, carrier and parcel dimensions fill karo.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Order Number"
                value={form.orderNumber}
                onChange={(v) => handleChange("orderNumber", v)}
                  placeholder="OATCLUB-000123 or 123"
              <Field
                label="Service Type"
                value={form.serviceType}
                onChange={(v) => handleChange("serviceType", v)}
                placeholder="Auto by payment / eTailPrePaidAir"
                icon={RadioTower}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Carrier Name"
                value={form.carrierName}
                onChange={(v) => handleChange("carrierName", v)}
                placeholder="BlueDart"
                icon={Truck}
              />

              <Field
                label="Carrier Slug"
                value={form.carrierSlug}
                onChange={(v) => handleChange("carrierSlug", v)}
                placeholder="bluedart"
                icon={RadioTower}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Weight (kg)"
                value={form.weight}
                onChange={(v) => handleChange("weight", v)}
                type="number"
                step="0.1"
                icon={Truck}
              />

              <Field
                label="Length (cm)"
                value={form.length}
                onChange={(v) => handleChange("length", v)}
                type="number"
                icon={Box}
              />

              <Field
                label="Breadth (cm)"
                value={form.breadth}
                onChange={(v) => handleChange("breadth", v)}
                type="number"
                icon={Box}
              />

              <Field
                label="Height (cm)"
                value={form.height}
                onChange={(v) => handleChange("height", v)}
                type="number"
                icon={Box}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Pieces"
                value={form.pieces}
                onChange={(v) => handleChange("pieces", v)}
                type="number"
                icon={PackagePlus}
              />

              <div className="rounded-3xl bg-neutral-50 px-4 py-4 ring-1 ring-neutral-100">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Effective Pieces
                </p>
                <p className="mt-1 text-2xl font-semibold text-neutral-950">
                  {computedPieces}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Minimum 1 piece. Backend order items se actual payload build
                  karega.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Notes
              </label>

              <div className="flex rounded-3xl bg-neutral-50 px-3 ring-1 ring-neutral-200 transition focus-within:bg-white focus-within:ring-black">
                <div className="flex items-start pr-2 pt-3.5 text-neutral-400">
                  <StickyNote className="h-4 w-4" />
                </div>

                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Any shipment notes..."
                  rows={4}
                  className="w-full resize-none bg-transparent py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
              <div className="flex items-start gap-3">
                <RadioTower className="mt-0.5 h-5 w-5 text-neutral-500" />
                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    Booking Rule
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Order must be confirmed before shipment booking. After
                    success, local shipment ledger and main Order shipment block
                    both update honge.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-4 w-4" />
                    Create Eshipz Shipment
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setForm(initialForm)}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
              <h2 className="text-lg font-semibold text-neutral-950">
                Payload Preview
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Frontend se backend ko ye payload jayega.
              </p>

              <pre className="mt-4 max-h-[420px] overflow-auto rounded-3xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
                {JSON.stringify(payloadPreview, null, 2)}
              </pre>
            </section>

            <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Latest Created Shipment
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Last successful Eshipz booking result.
                  </p>
                </div>

                {shipment?._id ? (
                  <BlueDartShipmentBadge status={shipment.status} />
                ) : null}
              </div>

              {shipment?._id ? (
                <div className="mt-4 space-y-3 text-sm text-neutral-700">
                  <InfoRow label="Local ID" value={shipment._id} />
                  <InfoRow label="Order Number" value={shipment.orderNumber} />
                  <InfoRow label="Provider" value={shipment.provider || "eshipz"} />
                  <InfoRow label="Carrier" value={shipment.carrierName || "BlueDart"} />
                  <InfoRow label="AWB" value={getAwb(shipment) || "-"} />
                  <InfoRow label="Shipment ID" value={getShipmentId(shipment) || "-"} />
                  <InfoRow label="Status" value={shipment.status || "-"} />
                  <InfoRow label="Service Type" value={shipment.serviceType || "-"} />
                  <InfoRow label="Payment Mode" value={shipment.paymentMode || "-"} />

                  {shipment.trackingUrl ? (
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
                    >
                      Open Tracking
                      <ExternalLink size={15} />
                    </a>
                  ) : null}

                  <Link
                    href={`/bluedart/${shipment._id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    View Detail
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <p className="mt-4 rounded-3xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500 ring-1 ring-neutral-100">
                  No shipment created yet.
                </p>
              )}
            </section>

            {lastUpdatedOrder ? (
              <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-neutral-100 md:p-6">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Order Sync
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Main order shipment block updated.
                </p>

                <div className="mt-4 space-y-3 text-sm text-neutral-700">
                  <InfoRow
                    label="Order"
                    value={lastUpdatedOrder?.orderNumber || "-"}
                  />
                  <InfoRow
                    label="Provider"
                    value={lastUpdatedOrder?.shipment?.provider || "eshipz"}
                  />
                  <InfoRow
                    label="Carrier"
                    value={lastUpdatedOrder?.shipment?.courierName || "BlueDart"}
                  />
                  <InfoRow
                    label="Order Status"
                    value={lastUpdatedOrder?.fulfillmentStatus || "-"}
                  />
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required = false,
  icon: Icon,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>

      <div className="flex rounded-2xl bg-neutral-50 px-3 ring-1 ring-neutral-200 transition focus-within:bg-white focus-within:ring-black">
        {Icon ? (
          <div className="flex items-center pr-2 text-neutral-400">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-100">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-semibold text-neutral-950">
        {value || "-"}
      </span>
    </div>
  );
}