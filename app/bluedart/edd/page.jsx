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
  Copy,
  X,
  Zap,
  ArrowRight,
  FileJson,
  AlertCircle,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const COURIER_OPTIONS = [
  { label: "BlueDart", value: "bluedart" },
  { label: "Delhivery Surface", value: "delhivery_surface" },
  { label: "Delhivery", value: "delhivery" },
];

const QUICK_ROUTES = [
  {
    label: "Delhi → Mumbai",
    originPincode: "110019",
    destinationPincode: "400001",
    slug: "bluedart",
  },
  {
    label: "Delhi → Bengaluru",
    originPincode: "110019",
    destinationPincode: "560001",
    slug: "bluedart",
  },
  {
    label: "Delhi → Kolkata",
    originPincode: "110019",
    destinationPincode: "700001",
    slug: "bluedart",
  },
  {
    label: "Delhi → Chennai",
    originPincode: "110019",
    destinationPincode: "600001",
    slug: "bluedart",
  },
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
  const {
    eddPrediction,
    eddLoading,
    fetchEddPrediction,
    externalResponse,
    error,
  } = useBlueDartStore();

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

  const rawJson = useMemo(
    () => JSON.stringify(result?.raw || externalResponse || {}, null, 2),
    [result, externalResponse]
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        key === "originPincode" || key === "destinationPincode"
          ? onlyDigits(value)
          : value,
    }));
  };

  const applyQuickRoute = (route) => {
    setForm({
      originPincode: route.originPincode,
      destinationPincode: route.destinationPincode,
      slug: route.slug,
    });
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

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(rawJson || "{}");
    } catch {
      // ignore clipboard issue
    }
  };

  const clearDestination = () => {
    setForm((prev) => ({
      ...prev,
      destinationPincode: "",
    }));
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
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

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                  Origin aur destination pincode ke basis par expected delivery
                  date, courier SLA aur route estimate check karo.
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

        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-5">
            <Card title="Check Prediction" icon={Search}>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    Courier Slug
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

                {!canSubmit ? (
                  <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                    {validationMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit || eddLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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
            </Card>

            <Card title="Quick Routes" icon={Zap}>
              <div className="grid gap-2">
                {QUICK_ROUTES.map((route) => (
                  <button
                    key={route.label}
                    type="button"
                    onClick={() => applyQuickRoute(route)}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        {route.label}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {route.originPincode} → {route.destinationPincode}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            </Card>
          </section>

          <section className="space-y-5">
            <Card title="Prediction Result" icon={PackageCheck}>
              {eddLoading ? (
                <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-5 text-sm font-medium text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching EDD prediction...
                </div>
              ) : result ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

                  <div className="mt-5 rounded-3xl bg-neutral-50 p-5 ring-1 ring-neutral-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      Summary
                    </p>

                    <p className="mt-2 text-sm leading-6 text-neutral-700">
                      Shipment{" "}
                      <span className="font-semibold text-neutral-950">
                        {safe(result?.originPincode || form.originPincode)}
                      </span>{" "}
                      se{" "}
                      <span className="font-semibold text-neutral-950">
                        {safe(
                          result?.destinationPincode || form.destinationPincode
                        )}
                      </span>{" "}
                      ke liye expected timeline{" "}
                      <span className="font-semibold text-neutral-950">
                        {getDaysText(result)}
                      </span>{" "}
                      hai. Predicted delivery{" "}
                      <span className="font-semibold text-neutral-950">
                        {formatDateTime(
                          result?.expectedDeliveryDate || result?.eta
                        )}
                      </span>{" "}
                      show ho rahi hai.
                    </p>
                  </div>
                </>
              ) : (
                <EmptyBlock text="Abhi koi prediction result nahi hai. Pincode enter karke EDD check karo." />
              )}
            </Card>

            {result ? (
              <Card title="Prediction Snapshot" icon={CalendarClock}>
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
                    value={getDaysText(result)}
                  />
                  <InfoRow
                    label="Courier Slug"
                    value={result?.courier || form.slug || "-"}
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
              </Card>
            ) : null}

            {result || externalResponse ? (
              <Card
                title="Raw Response"
                icon={FileJson}
                action={
                  <button
                    type="button"
                    onClick={copyRaw}
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                }
              >
                <pre className="max-h-[420px] overflow-auto rounded-3xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
                  {rawJson}
                </pre>
              </Card>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-neutral-100 p-2">
            <Icon className="h-4 w-4 text-neutral-700" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
        </div>

        {action || null}
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
          <p className="mt-2 break-all text-base font-semibold text-neutral-950">
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
      <span className="break-all text-right text-sm font-semibold text-neutral-950">
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