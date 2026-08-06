"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  PackageSearch,
  Search,
  Truck,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

export default function DelhiveryTrackingPage() {
  const router = useRouter();

  const [waybill, setWaybill] = useState("");
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (event) => {
    event.preventDefault();

    const awb = waybill.trim();

    if (!awb) {
      setError("AWB number is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setTracking(null);

      const response = await fetch(
        `${API_URL}/api/delhivery/tracking/${encodeURIComponent(awb)}`,
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Unable to track shipment.");
      }

      setTracking(result.data);
    } catch (err) {
      setError(err.message || "Tracking failed.");
    } finally {
      setLoading(false);
    }
  };

  const shipment = tracking?.ShipmentData?.[0]?.Shipment || null;
  const scans = shipment?.Scans || [];

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
              <PackageSearch size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Track Shipment
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Enter a Delhivery AWB number to view the latest status.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleTrack}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={waybill}
              onChange={(event) => setWaybill(event.target.value)}
              placeholder="Enter AWB number"
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

              Track
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </section>

        {shipment && (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                label="AWB"
                value={shipment.AWB || shipment.Waybill}
              />

              <InfoCard
                label="Status"
                value={shipment.Status?.Status || shipment.Status}
              />

              <InfoCard
                label="Destination"
                value={shipment.Destination}
              />

              <InfoCard
                label="Reference"
                value={shipment.ReferenceNo}
              />
            </section>

            <section className="mt-5 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Truck size={20} />

                <h2 className="text-lg font-bold text-zinc-950">
                  Tracking Timeline
                </h2>
              </div>

              {scans.length ? (
                <div className="mt-6 space-y-4">
                  {scans.map((item, index) => {
                    const detail = item?.ScanDetail || {};

                    return (
                      <div
                        key={`${detail.ScanDateTime}-${index}`}
                        className="flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-3 w-3 rounded-full bg-zinc-950" />

                          {index !== scans.length - 1 && (
                            <span className="mt-2 h-full min-h-12 w-px bg-zinc-200" />
                          )}
                        </div>

                        <div className="pb-4">
                          <p className="font-semibold text-zinc-950">
                            {detail.Scan || "Shipment Update"}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {detail.Instructions || detail.StatusCode || "—"}
                          </p>

                          <p className="mt-2 text-xs font-medium text-zinc-400">
                            {[detail.ScannedLocation, detail.ScanDateTime]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 text-sm text-zinc-500">
                  No tracking scans available yet.
                </p>
              )}
            </section>
          </>
        )}

        {tracking && !shipment && (
          <section className="mt-5 rounded-[28px] border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-500">
              Tracking response received, but no shipment details were found.
            </p>

            <pre className="mt-4 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs text-white">
              {JSON.stringify(tracking, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-zinc-950">
        {value || "—"}
      </p>
    </div>
  );
}
