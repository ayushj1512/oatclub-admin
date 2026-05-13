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
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const COURIER_OPTIONS = [
  { label: "BlueDart", value: "bluedart" },
  { label: "Delhivery Surface", value: "delhivery_surface" },
  { label: "Delhivery", value: "delhivery" },
];

const safe = (v) => (v == null ? "" : String(v));

const onlyDigits = (value = "") => safe(value).replace(/\D/g, "").slice(0, 6);

const labelize = (value = "") =>
  safe(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return safe(value);

  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getDaysText = (result = {}) => {
  const days =
    Number(result?.expectedDeliveryDays || 0) ||
    Number(result?.slaDays || 0) ||
    Number(result?.maxDays || 0) ||
    0;

  if (!days) return "-";
  return `${days} day${days > 1 ? "s" : ""}`;
};

export default function BlueDartEddPage() {
  const { eddPrediction, eddLoading, fetchEddPrediction, error } =
    useBlueDartStore();

  const [form, setForm] = useState({
    originPincode: "110019",
    destinationPincode: "",
    slug: "bluedart",
  });

  const result = useMemo(() => {
    if (!eddPrediction || typeof eddPrediction !== "object") return null;
    return eddPrediction;
  }, [eddPrediction]);

  const canSubmit = useMemo(() => {
    return (
      safe(form.originPincode).trim().length === 6 &&
      safe(form.destinationPincode).trim().length === 6 &&
      safe(form.slug).trim().length > 0
    );
  }, [form]);

  const validationMessage = useMemo(() => {
    if (safe(form.originPincode).trim().length !== 6) {
      return "Origin pincode must be 6 digits.";
    }

    if (safe(form.destinationPincode).trim().length !== 6) {
      return "Destination pincode must be 6 digits.";
    }

    if (!safe(form.slug).trim()) {
      return "Courier slug is required.";
    }

    return "";
  }, [form]);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        key === "originPincode" || key === "destinationPincode"
          ? onlyDigits(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit || eddLoading) return;

    await fetchEddPrediction({
      originPincode: safe(form.originPincode).trim(),
      destinationPincode: safe(form.destinationPincode).trim(),
      slug: safe(form.slug).trim(),
    });
  };

  const clearDestination = () => {
    setForm((prev) => ({
      ...prev,
      destinationPincode: "",
    }));
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-neutral-950 md:p-6">
      <div className="w-full space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="relative p-5 md:p-7">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-neutral-100/80" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  <CalendarClock className="h-3.5 w-3.5" />
                  BlueDart / Eshipz
                </div>

                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                  EDD Prediction
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                  Check estimated delivery timeline using origin and destination
                  pincodes.
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-100 p-3">
                <PackageCheck className="h-5 w-5 text-neutral-700" />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="flex items-start gap-3 rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </section>
        ) : null}

        <Card title="Check Delivery Estimate" icon={Search}>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <Field
              label="Origin Pincode"
              value={form.originPincode}
              onChange={(v) => handleChange("originPincode", v)}
              placeholder="110019"
              icon={MapPin}
              inputMode="numeric"
            />

            <Field
              label="Destination Pincode"
              value={form.destinationPincode}
              onChange={(v) => handleChange("destinationPincode", v)}
              placeholder="400001"
              icon={Route}
              inputMode="numeric"
              action={
                form.destinationPincode ? (
                  <button
                    type="button"
                    onClick={clearDestination}
                    className="rounded-xl p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null
              }
            />

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-neutral-700">
                Courier Partner
              </span>

              <div className="flex rounded-2xl bg-neutral-50 px-3 ring-1 ring-neutral-100 transition focus-within:bg-white focus-within:ring-neutral-200">
                <div className="flex items-center pr-2 text-neutral-400">
                  <Truck className="h-4 w-4" />
                </div>

                <select
                  value={form.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  className="w-full bg-transparent py-3 text-sm font-medium text-neutral-900 outline-none"
                >
                  {COURIER_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="md:col-span-3">
              {!canSubmit ? (
                <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                  {validationMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit || eddLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {eddLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking Estimate...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Get EDD Prediction
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Prediction Result" icon={PackageCheck}>
          {eddLoading ? (
            <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-5 text-sm font-medium text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching estimated delivery timeline...
            </div>
          ) : result ? (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] bg-neutral-950 p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Estimate Available
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                      {formatDateTime(
                        result?.expectedDeliveryDate || result?.eta
                      )}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Expected delivery for{" "}
                      {safe(result?.originPincode || form.originPincode)} to{" "}
                      {safe(
                        result?.destinationPincode || form.destinationPincode
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
                      Timeline
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {getDaysText(result)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ResultCard
                  icon={Truck}
                  label="Courier"
                  value={labelize(result?.courier || form.slug || "-")}
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
                  value={getDaysText(result)}
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
                  value={labelize(result?.serviceType || "-")}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow
                  label="Origin Pincode"
                  value={result?.originPincode || form.originPincode || "-"}
                />
                <InfoRow
                  label="Destination Pincode"
                  value={
                    result?.destinationPincode ||
                    form.destinationPincode ||
                    "-"
                  }
                />
                <InfoRow
                  label="Min Days"
                  value={result?.minDays ? String(result.minDays) : "-"}
                />
                <InfoRow
                  label="Max Days"
                  value={result?.maxDays ? String(result.maxDays) : "-"}
                />
              </div>
            </div>
          ) : (
            <EmptyBlock text="Enter destination pincode and check delivery estimate." />
          )}
        </Card>
      </div>
    </main>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-2xl bg-neutral-100 p-2">
          <Icon className="h-4 w-4 text-neutral-700" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
  inputMode,
  action,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-700">
        {label}
      </span>

      <div className="flex rounded-2xl bg-neutral-50 px-3 ring-1 ring-neutral-100 transition focus-within:bg-white focus-within:ring-neutral-200">
        {Icon ? (
          <div className="flex items-center pr-2 text-neutral-400">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400"
        />

        {action ? <div className="flex items-center pl-2">{action}</div> : null}
      </div>
    </label>
  );
}

function ResultCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {label}
          </p>
          <p className="mt-2 break-words text-base font-semibold text-neutral-950">
            {value || "-"}
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
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-100">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="break-words text-right text-sm font-semibold text-neutral-950">
        {value || "-"}
      </span>
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