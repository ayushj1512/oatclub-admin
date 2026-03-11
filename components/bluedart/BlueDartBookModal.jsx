"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X, PackageCheck } from "lucide-react";
import { useBlueDartStore } from "@/store/bluedartStore";

const safe = (v) => (v == null ? "" : String(v));
const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

export default function BlueDartBookModal({
  open,
  onClose,
  order = null,
  onBooked,
}) {
  const { creating, createShipmentFromOrder } = useBlueDartStore();

  const totalPieces = useMemo(() => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const qty = items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
    return Math.max(1, qty || 1);
  }, [order]);

  const defaultServiceType = useMemo(() => {
    const pm = safe(order?.paymentMethod).toLowerCase();
    return pm === "cod" ? "eTailCODAir" : "eTailPrePaidAir";
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
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await createShipmentFromOrder({
      orderNumber: order?.orderNumber,
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 10,
      pieces: totalPieces,
      notes: form.notes,
      serviceType: defaultServiceType,
    });

    if (res?.success) {
      onBooked?.(res?.shipment);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-neutral-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2 text-black">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black">
                Book BlueDart Shipment
              </h2>
              <p className="text-sm text-neutral-500">
                Create shipment for order {order?.orderNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-black">
                Order Summary
              </h3>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-neutral-500">Order Number</p>
                  <p className="font-medium text-black">
                    {safe(order?.orderNumber)}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500">Payment</p>
                  <p className="font-medium capitalize text-black">
                    {safe(order?.paymentMethod) || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500">Final Payable</p>
                  <p className="font-medium text-black">
                    ₹ {money(order?.finalPayable)}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500">Fulfillment</p>
                  <p className="font-medium capitalize text-black">
                    {safe(order?.fulfillmentStatus).replaceAll("_", " ") || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500">Total Products / Pieces</p>
                  <p className="font-medium text-black">{totalPieces}</p>
                </div>

                <div>
                  <p className="text-neutral-500">Service Type</p>
                  <p className="font-medium text-black">{defaultServiceType}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-black">
                Customer / Delivery Address
              </h3>

              <div className="space-y-2 text-sm text-neutral-700">
                <p className="font-medium text-black">
                  {safe(shipping?.fullName) || "-"}
                </p>
                <p>{safe(shipping?.phone) || "-"}</p>
                <p>{safe(shipping?.email) || "-"}</p>
                <p>{safe(shipping?.line1) || "-"}</p>
                {safe(shipping?.line2) ? <p>{safe(shipping?.line2)}</p> : null}
                <p>
                  {safe(shipping?.city)}
                  {safe(shipping?.city) && safe(shipping?.state) ? ", " : ""}
                  {safe(shipping?.state)} {safe(shipping?.pincode)}
                </p>
                <p>{safe(shipping?.country) || "India"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h3 className="mb-4 text-sm font-semibold text-black">
                Package Details
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm text-neutral-600">Weight (kg)</span>
                  <input
                    value={form.weight}
                    onChange={(e) => onChange("weight", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-neutral-600">Pieces</span>
                  <input
                    value={form.pieces}
                    onChange={(e) => onChange("pieces", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-neutral-600">Length (cm)</span>
                  <input
                    value={form.length}
                    onChange={(e) => onChange("length", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-neutral-600">Breadth (cm)</span>
                  <input
                    value={form.breadth}
                    onChange={(e) => onChange("breadth", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="text-sm text-neutral-600">Height (cm)</span>
                  <input
                    value={form.height}
                    onChange={(e) => onChange("height", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="text-sm text-neutral-600">Service Type</span>
                  <input
                    value={form.serviceType}
                    onChange={(e) => onChange("serviceType", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="text-sm text-neutral-600">Notes</span>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => onChange("notes", e.target.value)}
                    placeholder="Optional notes"
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-black outline-none transition focus:border-black"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                Fixed booking values:
                <span className="ml-1 font-medium text-black">
                  Weight 0.5 kg, Length 10 cm, Breadth 10 cm, Height 10 cm
                </span>
                . Pieces are taken from total order product quantity. Razorpay =
                Prepaid, COD = COD Air.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                {creating ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}