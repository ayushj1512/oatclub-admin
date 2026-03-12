"use client";

import { useMemo, useState } from "react";
import { Loader2, PackagePlus, Truck, Box, StickyNote } from "lucide-react";
import toast from "react-hot-toast";

import ProductPicker from "@/components/common/ProductPicker";
import { useBlueDartStore } from "@/store/bluedartStore";

const initialForm = {
  orderNumber: "",
  weight: "0.5",
  length: "10",
  breadth: "10",
  height: "10",
  pieces: "1",
  notes: "",
  serviceType: "",
};

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export default function BlueDartCreatePage() {
  const { createShipmentFromOrder, creating, shipment } = useBlueDartStore();

  const [form, setForm] = useState(initialForm);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const selectedCount = Array.isArray(selectedProducts)
    ? selectedProducts.length
    : 0;

  const computedPieces = useMemo(() => {
    const formPieces = safeNum(form.pieces, 1);
    return Math.max(formPieces, selectedCount || 1);
  }, [form.pieces, selectedCount]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.orderNumber.trim()) {
      toast.error("Order number is required");
      return;
    }

    const payload = {
      orderNumber: form.orderNumber.trim(),
      weight: safeNum(form.weight, 0.5),
      length: safeNum(form.length, 10),
      breadth: safeNum(form.breadth, 10),
      height: safeNum(form.height, 10),
      pieces: computedPieces,
      notes: form.notes.trim(),
      serviceType: form.serviceType.trim(),
      products: selectedProducts, // backend must support this if you want to actually use it
    };

    const res = await createShipmentFromOrder(payload);

    if (res?.success) {
      toast.success("Shipment created successfully");
      setForm(initialForm);
      setSelectedProducts([]);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                BlueDart
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                Manual Shipment Creation
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Existing order number ke against shipment create karo. Product
                selection bhi payload me bhej rahe hain, lekin backend ko usko
                handle karna padega agar usse actual shipment/order payload me
                use karna hai.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-neutral-100 p-3 md:block">
              <PackagePlus className="h-5 w-5 text-neutral-700" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-3xl bg-white p-5 shadow-sm md:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Shipment Details
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Order number aur package information fill karo.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Order Number"
                value={form.orderNumber}
                onChange={(v) => handleChange("orderNumber", v)}
                placeholder="ORD12345"
                required
              />

              <Field
                label="Service Type"
                value={form.serviceType}
                onChange={(v) => handleChange("serviceType", v)}
                placeholder="eTailPrePaidAir / eTailCODAir"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Weight (kg)"
                value={form.weight}
                onChange={(v) => handleChange("weight", v)}
                type="number"
                step="0.1"
                icon={Truck}
              />
              <Field
                label="Length (cm)"
                value={form.length}
                onChange={(v) => handleChange("length", v)}
                type="number"
                icon={Box}
              />
              <Field
                label="Breadth (cm)"
                value={form.breadth}
                onChange={(v) => handleChange("breadth", v)}
                type="number"
                icon={Box}
              />
              <Field
                label="Height (cm)"
                value={form.height}
                onChange={(v) => handleChange("height", v)}
                type="number"
                icon={Box}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Pieces"
                value={form.pieces}
                onChange={(v) => handleChange("pieces", v)}
                type="number"
              />

              <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Effective Pieces
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">
                  {computedPieces}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Form pieces aur selected product count me jo bada hoga woh use
                  hoga.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Notes
              </label>
              <div className="flex rounded-2xl border border-neutral-200 bg-white px-3">
                <div className="flex items-center pr-2 text-neutral-400">
                  <StickyNote className="h-4 w-4" />
                </div>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Any shipment notes..."
                  rows={4}
                  className="w-full resize-none bg-transparent py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Product Selection
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Selected products payload me bheje jayenge. Backend ko
                    support chahiye agar inhe create request me use karna hai.
                  </p>
                </div>

                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
                  {selectedCount} selected
                </div>
              </div>

              <div className="mt-4">
                <ProductPicker
                  title="Select products"
                  multiple
                  value={selectedProducts}
                  onChange={setSelectedProducts}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-4 w-4" />
                    Create Shipment
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setSelectedProducts([]);
                }}
                className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Reset
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Payload Preview
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Ye frontend se bhejne wala structure hai.
              </p>

              <pre className="mt-4 overflow-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
{JSON.stringify(
  {
    orderNumber: form.orderNumber.trim(),
    weight: safeNum(form.weight, 0.5),
    length: safeNum(form.length, 10),
    breadth: safeNum(form.breadth, 10),
    height: safeNum(form.height, 10),
    pieces: computedPieces,
    notes: form.notes.trim(),
    serviceType: form.serviceType.trim(),
    products: selectedProducts,
  },
  null,
  2
)}
              </pre>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Latest Created Shipment
              </h2>

              {shipment?._id ? (
                <div className="mt-4 space-y-3 text-sm text-neutral-700">
                  <InfoRow label="Shipment ID" value={shipment._id} />
                  <InfoRow label="Order Number" value={shipment.orderNumber} />
                  <InfoRow label="AWB" value={shipment.awbNumber || "-"} />
                  <InfoRow label="Status" value={shipment.status || "-"} />
                  <InfoRow
                    label="Service Type"
                    value={shipment.serviceType || "-"}
                  />
                  <InfoRow
                    label="Payment Mode"
                    value={shipment.paymentMode || "-"}
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-500">
                  No shipment created yet.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required = false,
  icon: Icon,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>

      <div className="flex rounded-2xl border border-neutral-200 bg-white px-3">
        {Icon ? (
          <div className="flex items-center pr-2 text-neutral-400">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-900">{value}</span>
    </div>
  );
}