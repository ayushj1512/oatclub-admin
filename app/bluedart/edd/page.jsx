"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Truck,
  MapPin,
  CalendarClock,
  Search,
  Route,
  PackageCheck,
  CalendarDays,
  Clock3,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const COURIER_OPTIONS = [
  { label: "BlueDart", value: "bluedart" },
  { label: "Delhivery Surface", value: "delhivery_surface" },
  { label: "Delhivery", value: "delhivery" },
];

const safe = (v) => (v == null ? "" : String(v));

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function BlueDartEddPage() {
  const { eddPrediction, eddLoading, fetchEddPrediction } = useBlueDartStore();

  const [form, setForm] = useState({
    originPincode: "110019",
    destinationPincode: "",
    slug: "bluedart",
  });

  const canSubmit = useMemo(() => {
    return (
      safe(form.originPincode).trim().length >= 6 &&
      safe(form.destinationPincode).trim().length >= 6 &&
      safe(form.slug).trim().length > 0
    );
  }, [form]);

  const result = useMemo(() => {
    if (!eddPrediction || typeof eddPrediction !== "object") return null;
    return eddPrediction;
  }, [eddPrediction]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetchEddPrediction({
      originPincode: safe(form.originPincode).trim(),
      destinationPincode: safe(form.destinationPincode).trim(),
      slug: safe(form.slug).trim(),
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                BlueDart / eShipz
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                EDD Prediction
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Origin aur destination pincode ke basis par expected delivery
                date check karo.
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-100 p-3">
              <CalendarClock className="h-5 w-5 text-neutral-700" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Check Prediction
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Courier slug aur pincodes enter karo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field
                label="Origin Pincode"
                value={form.originPincode}
                onChange={(v) => handleChange("originPincode", v)}
                placeholder="110001"
                icon={MapPin}
              />

              <Field
                label="Destination Pincode"
                value={form.destinationPincode}
                onChange={(v) => handleChange("destinationPincode", v)}
                placeholder="400011"
                icon={Route}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Courier Slug
                </label>
                <div className="flex rounded-2xl border border-neutral-200 bg-white px-3">
                  <div className="flex items-center pr-2 text-neutral-400">
                    <Truck className="h-4 w-4" />
                  </div>
                  <select
                    value={form.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    className="w-full bg-transparent py-3 text-sm text-neutral-900 outline-none"
                  >
                    {COURIER_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit || eddLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eddLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Get EDD Prediction
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-neutral-700" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  Prediction Result
                </h2>
              </div>

              {result ? (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <ResultCard
                      icon={Truck}
                      label="Courier"
                      value={result?.courier || safe(form.slug) || "-"}
                    />
                    <ResultCard
                      icon={Route}
                      label="Route"
                      value={`${safe(
                        result?.originPincode || form.originPincode
                      )} → ${safe(
                        result?.destinationPincode || form.destinationPincode
                      )}`}
                    />
                    <ResultCard
                      icon={Clock3}
                      label="Expected Days"
                      value={
                        result?.expectedDeliveryDays
                          ? String(result.expectedDeliveryDays)
                          : result?.slaDays
                          ? String(result.slaDays)
                          : "-"
                      }
                    />
                    <ResultCard
                      icon={CalendarDays}
                      label="Dispatch Date"
                      value={formatDateTime(result?.dispatchDate)}
                    />
                    <ResultCard
                      icon={CalendarClock}
                      label="Expected Delivery"
                      value={formatDateTime(
                        result?.expectedDeliveryDate || result?.eta
                      )}
                    />
                    <ResultCard
                      icon={PackageCheck}
                      label="Service Type"
                      value={result?.serviceType || "-"}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Summary
                    </p>
                    <p className="mt-2 text-sm text-neutral-700">
                      Shipment{" "}
                      <span className="font-semibold text-neutral-900">
                        {safe(result?.originPincode || form.originPincode)}
                      </span>{" "}
                      se{" "}
                      <span className="font-semibold text-neutral-900">
                        {safe(
                          result?.destinationPincode || form.destinationPincode
                        )}
                      </span>{" "}
                      ke liye{" "}
                      <span className="font-semibold text-neutral-900">
                        {result?.expectedDeliveryDays
                          ? `${result.expectedDeliveryDays} day(s)`
                          : result?.slaDays
                          ? `${result.slaDays} day(s)`
                          : "estimated timeline"}
                      </span>{" "}
                      me expected hai, aur predicted delivery{" "}
                      <span className="font-semibold text-neutral-900">
                        {formatDateTime(
                          result?.expectedDeliveryDate || result?.eta
                        )}
                      </span>{" "}
                      hai.
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                  Abhi koi prediction result nahi hai.
                </div>
              )}
            </div>

            {result ? (
              <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Prediction Snapshot
                </h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoRow
                    label="Origin Pincode"
                    value={result?.originPincode || "-"}
                  />
                  <InfoRow
                    label="Destination Pincode"
                    value={result?.destinationPincode || "-"}
                  />
                  <InfoRow
                    label="Dispatch Date"
                    value={formatDateTime(result?.dispatchDate)}
                  />
                  <InfoRow
                    label="Expected Delivery Date"
                    value={formatDateTime(
                      result?.expectedDeliveryDate || result?.eta
                    )}
                  />
                  <InfoRow
                    label="Expected Delivery Days"
                    value={
                      result?.expectedDeliveryDays
                        ? String(result.expectedDeliveryDays)
                        : result?.slaDays
                        ? String(result.slaDays)
                        : "-"
                    }
                  />
                  <InfoRow
                    label="Courier Slug"
                    value={result?.courier || safe(form.slug) || "-"}
                  />
                </div>
              </div>
            ) : null}
          </section>
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
  icon: Icon,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>

      <div className="flex rounded-2xl border border-neutral-200 bg-white px-3">
        {Icon ? (
          <div className="flex items-center pr-2 text-neutral-400">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
    </label>
  );
}

function ResultCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-2 break-all text-base font-semibold text-neutral-900">
            {value}
          </p>
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-white p-2 shadow-sm">
            <Icon className="h-4 w-4 text-neutral-700" />
          </div>
        ) : null}
      </div>
    </div>
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