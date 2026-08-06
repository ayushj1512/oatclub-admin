"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

const initialForm = {
  pickupDate: "",
  pickupTime: "14:00",
  packageCount: 1,
};

export default function DelhiveryPickupsPage() {
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

    if (!form.pickupDate) {
      setError("Pickup date is required.");
      return;
    }

    if (!form.pickupTime) {
      setError("Pickup time is required.");
      return;
    }

    if (Number(form.packageCount) < 1) {
      setError("Package count must be at least 1.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch(
        `${API_URL}/api/delhivery/pickup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pickupDate: form.pickupDate,
            pickupTime: form.pickupTime,
            packageCount: Number(form.packageCount),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to create pickup request.",
        );
      }

      setResult(data.data || data);
    } catch (err) {
      setError(err.message || "Pickup request failed.");
    } finally {
      setLoading(false);
    }
  };

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
              <PackageCheck size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Pickup Request
              </h1>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Schedule a Delhivery pickup from the configured warehouse.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pickup Date" icon={CalendarDays}>
                <input
                  type="date"
                  value={form.pickupDate}
                  onChange={(event) =>
                    updateField("pickupDate", event.target.value)
                  }
                  className="w-full bg-transparent text-sm font-semibold text-zinc-950 outline-none"
                />
              </Field>

              <Field label="Pickup Time" icon={Clock3}>
                <input
                  type="time"
                  value={form.pickupTime}
                  onChange={(event) =>
                    updateField("pickupTime", event.target.value)
                  }
                  className="w-full bg-transparent text-sm font-semibold text-zinc-950 outline-none"
                />
              </Field>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-800">
                Expected Package Count
              </label>

              <input
                type="number"
                min="1"
                value={form.packageCount}
                onChange={(event) =>
                  updateField("packageCount", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              />
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
                  Scheduling Pickup
                </>
              ) : (
                <>
                  <PackageCheck size={17} />
                  Create Pickup Request
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
                  Pickup request created
                </h2>

                <p className="mt-1 text-sm text-emerald-700">
                  Delhivery accepted the pickup request.
                </p>
              </div>
            </div>

            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                View API response
              </summary>

              <pre className="mt-3 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs text-white">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <Icon size={15} />
        {label}
      </span>

      <div className="mt-3">{children}</div>
    </label>
  );
}
