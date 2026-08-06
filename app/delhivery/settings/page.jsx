"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  Settings,
} from "lucide-react";

const initialSettings = {
  baseUrl: "https://track.delhivery.com",
  pickupLocation: "OATCLUB",
  defaultWeight: 500,
  defaultLength: 25,
  defaultWidth: 20,
  defaultHeight: 5,
};

export default function DelhiverySettingsPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialSettings);
  const [saved, setSaved] = useState(false);

  const updateField = (field, value) => {
    setSaved(false);

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = (event) => {
    event.preventDefault();

    // UI-only for now. Backend config.js remains source of truth.
    setSaved(true);
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
              <Settings size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Delhivery Settings
              </h1>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Review default shipment and pickup configuration.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-semibold text-zinc-800">
                Base URL
              </label>

              <input
                type="text"
                value={form.baseUrl}
                onChange={(event) =>
                  updateField("baseUrl", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-800">
                Pickup Location
              </label>

              <input
                type="text"
                value={form.pickupLocation}
                onChange={(event) =>
                  updateField("pickupLocation", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-800">
                Default Package Details
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Weight"
                  suffix="grams"
                  value={form.defaultWeight}
                  onChange={(value) =>
                    updateField("defaultWeight", value)
                  }
                />

                <NumberField
                  label="Length"
                  suffix="cm"
                  value={form.defaultLength}
                  onChange={(value) =>
                    updateField("defaultLength", value)
                  }
                />

                <NumberField
                  label="Width"
                  suffix="cm"
                  value={form.defaultWidth}
                  onChange={(value) =>
                    updateField("defaultWidth", value)
                  }
                />

                <NumberField
                  label="Height"
                  suffix="cm"
                  value={form.defaultHeight}
                  onChange={(value) =>
                    updateField("defaultHeight", value)
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              API token is intentionally not shown in the admin panel. Keep it
              only inside the backend Delhivery configuration.
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={17} />
                Settings saved locally.
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Save size={17} />
              Save Settings
            </button>
          </form>
        </section>
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
