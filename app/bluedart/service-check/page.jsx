"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Hash,
  Loader2,
  MapPin,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { useBlueDartStore } from "@/store/bluedartStore";

const normalizeMirayOrderNumber = (value = "") => {
  const raw = String(value).trim().toUpperCase();

  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");

  if (!digits) return raw.startsWith("MIRAY-") ? raw : `MIRAY-${raw}`;

  return `MIRAY-${digits.padStart(6, "0")}`;
};

export default function BlueDartServiceCheckPage() {
  const { checkServiceability, serviceability, serviceabilityLoading } =
    useBlueDartStore();

  const [mode, setMode] = useState("order");

  const [form, setForm] = useState({
    orderNumber: "",
    pickupPincode: "110019",
    deliveryPincode: "",
    weight: "0.5",
    cod: true,
  });

  const normalizedOrderNumber = useMemo(
    () => normalizeMirayOrderNumber(form.orderNumber),
    [form.orderNumber]
  );

  const available =
    serviceability?.serviceable || serviceability?.blueDartAvailable;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "order") {
      await checkServiceability({
        orderNumber: normalizedOrderNumber,
      });

      return;
    }

    await checkServiceability({
      pickupPincode: form.pickupPincode.trim(),
      deliveryPincode: form.deliveryPincode.trim(),
      weight: Number(form.weight) || 0.5,
      cod: form.cod,
    });
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--text)] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Hero */}
        <div className="rounded-[2rem] bg-[#111111] p-7 text-white shadow-sm sm:p-9">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Truck size={22} />
            </div>

            <div>
              <p className="text-sm text-white/50">
                BlueDart · eShipz
              </p>

              <h1 className="text-3xl font-semibold tracking-[-0.04em]">
                Serviceability Checker
              </h1>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm sm:p-7"
          >
            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => setMode("order")}
                className={`h-12 rounded-[1rem] text-sm font-semibold transition ${
                  mode === "order"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                Check by Order
              </button>

              <button
                type="button"
                onClick={() => setMode("pincode")}
                className={`h-12 rounded-[1rem] text-sm font-semibold transition ${
                  mode === "pincode"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                Check by Pincode
              </button>
            </div>

            <div className="mt-7 grid gap-5">
              {mode === "order" ? (
                <>
                  <Input
                    icon={<Hash size={16} />}
                    label="Order Number"
                    placeholder="2142 or MIRAY-002142"
                    value={form.orderNumber}
                    onChange={(e) =>
                      updateField("orderNumber", e.target.value)
                    }
                  />

                  <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                    <p className="text-xs text-neutral-500">
                      Normalized Order Number
                    </p>

                    <p className="mt-1 font-semibold">
                      {normalizedOrderNumber || "MIRAY-000000"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      icon={<MapPin size={16} />}
                      label="Pickup Pincode"
                      placeholder="110019"
                      value={form.pickupPincode}
                      onChange={(e) =>
                        updateField("pickupPincode", e.target.value)
                      }
                    />

                    <Input
                      icon={<MapPin size={16} />}
                      label="Delivery Pincode"
                      placeholder="400018"
                      value={form.deliveryPincode}
                      onChange={(e) =>
                        updateField("deliveryPincode", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Weight (KG)"
                      placeholder="0.5"
                      value={form.weight}
                      onChange={(e) =>
                        updateField("weight", e.target.value)
                      }
                    />

                    <div>
                      <span className="mb-2 block text-sm font-medium text-neutral-700">
                        Payment Mode
                      </span>

                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
                        <button
                          type="button"
                          onClick={() => updateField("cod", true)}
                          className={`h-11 rounded-[1rem] text-sm font-semibold transition ${
                            form.cod
                              ? "bg-[#111111] text-white"
                              : "text-neutral-500"
                          }`}
                        >
                          COD
                        </button>

                        <button
                          type="button"
                          onClick={() => updateField("cod", false)}
                          className={`h-11 rounded-[1rem] text-sm font-semibold transition ${
                            !form.cod
                              ? "bg-[#111111] text-white"
                              : "text-neutral-500"
                          }`}
                        >
                          Prepaid
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={serviceabilityLoading}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-[1.2rem] bg-[#111111] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {serviceabilityLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}

                {mode === "order"
                  ? "Check Order Serviceability"
                  : "Check Pincode Serviceability"}

                {!serviceabilityLoading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          {/* Result */}
          <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
            {!serviceability ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.5rem] bg-neutral-50 text-center">
                <Truck size={34} className="text-neutral-300" />

                <h2 className="mt-4 text-lg font-semibold">
                  No Serviceability Check Yet
                </h2>

                <p className="mt-2 max-w-xs text-sm text-neutral-500">
                  Select a mode and run a serviceability check to view BlueDart
                  availability.
                </p>
              </div>
            ) : (
              <div>
                <div
                  className={`rounded-[1.5rem] p-5 ${
                    available ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {available ? (
                      <CheckCircle2 />
                    ) : (
                      <XCircle />
                    )}
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                    {available
                      ? "Service Available"
                      : "Service Not Available"}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-600">
                    {available
                      ? "BlueDart can service this shipment lane."
                      : "BlueDart is currently unavailable for this shipment lane."}
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  <Result
                    label="Check Mode"
                    value={
                      mode === "order"
                        ? "Order Based"
                        : "Pincode Based"
                    }
                  />

                  <Result
                    label="Order Number"
                    value={
                      serviceability?.order?.orderNumber ||
                      normalizedOrderNumber ||
                      "-"
                    }
                  />

                  <Result
                    label="Pickup Pincode"
                    value={
                      serviceability?.request?.pickupPincode || "-"
                    }
                  />

                  <Result
                    label="Delivery Pincode"
                    value={
                      serviceability?.request?.deliveryPincode || "-"
                    }
                  />

                  <Result
                    label="Courier"
                    value={
                      serviceability?.courier?.courier_name ||
                      serviceability?.courier?.carrier_name ||
                      "BlueDart"
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Input({ label, icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>

      <div className="flex h-13 items-center gap-2 rounded-[1.1rem] border border-neutral-200 bg-neutral-50 px-4 transition focus-within:border-neutral-900 focus-within:bg-white">
        {icon && <span className="text-neutral-400">{icon}</span>}

        <input
          {...props}
          className="h-full w-full bg-transparent text-sm outline-none"
        />
      </div>
    </label>
  );
}

function Result({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-[1.2rem] bg-neutral-50 px-4 py-3">
      <span className="text-sm text-neutral-500">
        {label}
      </span>

      <span className="text-sm font-semibold">
        {value}
      </span>
    </div>
  );
}