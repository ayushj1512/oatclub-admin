"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  Truck,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

const initialForm = {
  orderId: "",
  weight: 500,
  length: 25,
  width: 20,
  height: 5,
};

export default function CreateDelhiveryShipmentPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const orderId = form.orderId.trim();

    if (!orderId) {
      setError("Order ID is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch(
        `${API_URL}/api/orders/${orderId}/delhivery/book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weight: Number(form.weight),
            length: Number(form.length),
            width: Number(form.width),
            height: Number(form.height),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Shipment booking failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to create shipment.");
    } finally {
      setLoading(false);
    }
  };

  const booking = result?.data || result || {};

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
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
              <Truck size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Create Shipment
              </h1>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Book a confirmed and packed order with Delhivery.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-zinc-800">
                MongoDB Order ID
              </label>

              <input
                type="text"
                value={form.orderId}
                onChange={(event) =>
                  updateField("orderId", event.target.value)
                }
                placeholder="Enter order _id"
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-800">
                Package Details
              </p>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Weight"
                  suffix="grams"
                  value={form.weight}
                  onChange={(value) => updateField("weight", value)}
                />

                <NumberField
                  label="Length"
                  suffix="cm"
                  value={form.length}
                  onChange={(value) => updateField("length", value)}
                />

                <NumberField
                  label="Width"
                  suffix="cm"
                  value={form.width}
                  onChange={(value) => updateField("width", value)}
                />

                <NumberField
                  label="Height"
                  suffix="cm"
                  value={form.height}
                  onChange={(value) => updateField("height", value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Booking Shipment
                </>
              ) : (
                <>
                  <Package size={17} />
                  Book with Delhivery
                </>
              )}
            </button>
          </form>
        </section>

        {result && (
          <section className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-700" size={24} />

              <div>
                <h2 className="font-bold text-emerald-950">
                  Shipment booked successfully
                </h2>

                <p className="mt-1 text-sm text-emerald-700">
                  Delhivery AWB has been saved with the order.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ResultItem
                label="Order Number"
                value={booking.orderNumber}
              />

              <ResultItem
                label="AWB / Waybill"
                value={booking.waybill || booking.awb}
              />

              <ResultItem
                label="Provider"
                value={booking.provider || "delhivery"}
              />

              <ResultItem
                label="Tracking URL"
                value={booking.trackingUrl}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function NumberField({ label, suffix, value, onChange }) {
  return (
    <label className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-lg font-bold text-zinc-950 outline-none"
        />

        <span className="text-xs font-medium text-zinc-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function ResultItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-zinc-900">
        {value || "—"}
      </p>
    </div>
  );
}
