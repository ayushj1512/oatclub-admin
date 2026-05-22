"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X, PackageCheck } from "lucide-react";
import { useBlueDartStore } from "@/store/bluedartStore";

const safe = (v) => (v == null ? "" : String(v));

const money = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString("en-IN")
    : "0";

export default function BlueDartBookModal({
  open,
  onClose,
  order = null,
  onBooked,
}) {
  const { creating, createShipmentFromOrder } = useBlueDartStore();

  const totalPieces = useMemo(() => {
    const items = Array.isArray(order?.items) ? order.items : [];

    const qty = items.reduce(
      (sum, item) => sum + Number(item?.quantity || 0),
      0
    );

    return Math.max(1, qty || 1);
  }, [order]);

  const defaultServiceType = useMemo(() => {
    const pm = safe(order?.paymentMethod).toLowerCase();

    return pm === "cod"
      ? "eTailCODAir"
      : "eTailPrePaidAir";
  }, [order]);

  const [form, setForm] = useState({
    weight: "0.5",
    length: "10",
    breadth: "10",
    height: "10",
    pieces: "1",
    notes: "",
    serviceType: "",
  });

  useEffect(() => {
    if (!open || !order) return;

    setForm({
      weight: "0.5",
      length: "10",
      breadth: "10",
      height: "10",
      pieces: String(totalPieces),
      notes: "",
      serviceType: defaultServiceType,
    });
  }, [open, order, totalPieces, defaultServiceType]);

  if (!open || !order) return null;

  const shipping = order?.shippingAddressSnapshot || {};

  const onChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toNumber = (value, fallback) => {
    const num = Number(value);

    return Number.isFinite(num) && num > 0
      ? num
      : fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await createShipmentFromOrder({
      orderNumber: order?.orderNumber,
      weight: toNumber(form.weight, 0.5),
      length: toNumber(form.length, 10),
      breadth: toNumber(form.breadth, 10),
      height: toNumber(form.height, 10),
      pieces: toNumber(form.pieces, totalPieces),
      notes: form.notes?.trim(),
      serviceType:
        form.serviceType || defaultServiceType,
    });

    if (res?.success) {
      onBooked?.(res?.shipment);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 px-3 py-3 sm:items-center sm:px-4">
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="shrink-0 border-b border-neutral-100 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-2xl bg-neutral-100 p-2 text-black">
                <PackageCheck size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-black sm:text-lg">
                  Book BlueDart Shipment
                </h2>

                <p className="mt-0.5 truncate text-sm text-neutral-500">
                  Create shipment for order{" "}
                  {order?.orderNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TOP RIGHT BOOK BUTTON */}
              <button
                type="submit"
                form="bluedart-book-form"
                disabled={creating}
                className="hidden items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              >
                {creating ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : null}

                {creating ? "Booking..." : "Book Shipment"}
              </button>

              {/* CLOSE */}
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="shrink-0 rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-black disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form
          id="bluedart-book-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* BODY */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {/* LEFT */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
                  <h3 className="mb-3 text-sm font-semibold text-black">
                    Order Summary
                  </h3>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <Info
                      label="Order Number"
                      value={safe(order?.orderNumber)}
                    />

                    <Info
                      label="Payment"
                      value={
                        safe(order?.paymentMethod) ||
                        "-"
                      }
                      capitalize
                    />

                    <Info
                      label="Final Payable"
                      value={`₹ ${money(
                        order?.finalPayable
                      )}`}
                    />

                    <Info
                      label="Fulfillment"
                      value={
                        safe(
                          order?.fulfillmentStatus
                        ).replaceAll("_", " ") || "-"
                      }
                      capitalize
                    />

                    <Info
                      label="Total Pieces"
                      value={totalPieces}
                    />

                    <Info
                      label="Service Type"
                      value={defaultServiceType}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
                  <h3 className="mb-3 text-sm font-semibold text-black">
                    Customer / Delivery Address
                  </h3>

                  <div className="space-y-1.5 text-sm text-neutral-700">
                    <p className="font-medium text-black">
                      {safe(shipping?.fullName) || "-"}
                    </p>

                    <p>
                      {safe(shipping?.phone) || "-"}
                    </p>

                    <p>
                      {safe(shipping?.email) || "-"}
                    </p>

                    <p>
                      {safe(shipping?.line1) || "-"}
                    </p>

                    {safe(shipping?.line2) ? (
                      <p>{safe(shipping?.line2)}</p>
                    ) : null}

                    <p>
                      {safe(shipping?.city)}
                      {safe(shipping?.city) &&
                      safe(shipping?.state)
                        ? ", "
                        : ""}
                      {safe(shipping?.state)}{" "}
                      {safe(shipping?.pincode)}
                    </p>

                    <p>
                      {safe(shipping?.country) ||
                        "India"}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
                  <h3 className="mb-4 text-sm font-semibold text-black">
                    Package Details
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Weight (kg)"
                      value={form.weight}
                      onChange={(v) =>
                        onChange("weight", v)
                      }
                    />

                    <Input
                      label="Pieces"
                      value={form.pieces}
                      onChange={(v) =>
                        onChange("pieces", v)
                      }
                    />

                    <Input
                      label="Length (cm)"
                      value={form.length}
                      onChange={(v) =>
                        onChange("length", v)
                      }
                    />

                    <Input
                      label="Breadth (cm)"
                      value={form.breadth}
                      onChange={(v) =>
                        onChange("breadth", v)
                      }
                    />

                    <Input
                      label="Height (cm)"
                      value={form.height}
                      onChange={(v) =>
                        onChange("height", v)
                      }
                      className="sm:col-span-2"
                    />

                    <Input
                      label="Service Type"
                      value={form.serviceType}
                      onChange={(v) =>
                        onChange("serviceType", v)
                      }
                      className="sm:col-span-2"
                    />

                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-sm text-neutral-600">
                        Notes
                      </span>

                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) =>
                          onChange(
                            "notes",
                            e.target.value
                          )
                        }
                        placeholder="Optional notes"
                        className="w-full resize-none rounded-xl bg-white px-3 py-2 text-sm text-black outline-none ring-1 ring-neutral-200 transition focus:ring-black"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="shrink-0 border-t border-neutral-100 bg-white px-4 py-4 sm:px-6">
            <div className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="flex-1 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 sm:flex-none"
              >
                Cancel
              </button>

              {/* BOTTOM BUTTON */}
              <button
                type="submit"
                disabled={creating}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
              >
                {creating ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : null}

                {creating
                  ? "Booking..."
                  : "Confirm Booking"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  capitalize = false,
}) {
  return (
    <div className="min-w-0">
      <p className="text-neutral-500">
        {label}
      </p>

      <p
        className={`truncate font-medium text-black ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  className = "",
}) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-sm text-neutral-600">
        {label}
      </span>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        inputMode="decimal"
        className="w-full rounded-xl bg-white px-3 py-2 text-sm text-black outline-none ring-1 ring-neutral-200 transition focus:ring-black"
      />
    </label>
  );
}