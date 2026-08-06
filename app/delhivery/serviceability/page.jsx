"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  XCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

export default function DelhiveryServiceabilityPage() {
  const router = useRouter();

  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async (event) => {
    event.preventDefault();

    const pin = pincode.replace(/\D/g, "").slice(0, 6);

    if (!/^\d{6}$/.test(pin)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch(
        `${API_URL}/api/delhivery/serviceability/${pin}`,
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to check serviceability.",
        );
      }

      const postalCode = data?.data?.delivery_codes?.[0]?.postal_code;

      if (!postalCode) {
        throw new Error("Pincode is not serviceable.");
      }

      setResult(postalCode);
    } catch (err) {
      setError(err.message || "Serviceability check failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.push("/delhivery")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Delhivery
        </button>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <MapPin size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Pincode Serviceability
              </h1>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Check COD, prepaid and pickup availability for a pincode.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCheck}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(event) =>
                setPincode(
                  event.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              placeholder="Enter 6-digit pincode"
              className="min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}

              Check Pincode
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="mt-5 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Pincode
                </p>

                <h2 className="mt-1 text-2xl font-black text-zinc-950">
                  {result.pin}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {[result.city, result.district, result.state_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={15} />
                Serviceable
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AvailabilityCard
                label="COD"
                available={result.cod === "Y"}
              />

              <AvailabilityCard
                label="Prepaid"
                available={result.pre_paid === "Y"}
              />

              <AvailabilityCard
                label="Pickup"
                available={result.pickup === "Y"}
              />

              <AvailabilityCard
                label="ODA"
                available={result.is_oda === "Y"}
                reverse
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Sort Code" value={result.sort_code} />
              <InfoCard label="Service Weight" value={result.srv_wt_th} />
              <InfoCard label="Facility" value={result.inc} />
              <InfoCard label="Remarks" value={result.remarks} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function AvailabilityCard({ label, available, reverse = false }) {
  const positive = reverse ? !available : available;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-700">{label}</p>

        {positive ? (
          <CheckCircle2 size={18} className="text-emerald-600" />
        ) : (
          <XCircle size={18} className="text-red-500" />
        )}
      </div>

      <p className="mt-2 text-xs font-medium text-zinc-500">
        {reverse
          ? available
            ? "Out of delivery area"
            : "Normal delivery area"
          : available
            ? "Available"
            : "Unavailable"}
      </p>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-zinc-950">
        {value || "—"}
      </p>
    </div>
  );
}
