"use client";

import { useState } from "react";
import {
  Barcode,
  Loader2,
  PackagePlus,
  X,
} from "lucide-react";

import BarcodePrintGrid from "@/components/barcode/BarcodePrintGrid";
import { useBarcodeStore } from "@/store/barcodeStore";

const SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "FREE",
];

const INITIAL_FORM = {
  productId: "",
  size: "XS",
  price: "",
  quantity: 1,
};

export default function GenerateBarcodePage() {
  const {
    creating,
    batchCreating,
    error,
    successMessage,
    createBarcodeItem,
    createBarcodeBatch,
    clearMessages,
  } = useBarcodeStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [generatedItems, setGeneratedItems] = useState([]);

  const submitting = creating || batchCreating;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const productId = String(form.productId || "")
      .trim()
      .toUpperCase();

    const size = String(form.size || "").trim().toUpperCase();
    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!productId) {
      throw new Error("Product ID is required");
    }

    if (productId.includes("-")) {
      throw new Error("Product ID must not contain '-'");
    }

    if (!SIZES.includes(size)) {
      throw new Error("Select a valid size");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Enter a valid price");
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 5000
    ) {
      throw new Error("Quantity must be between 1 and 5000");
    }

    return {
      productId,
      size,
      price,
      quantity,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearMessages();

    try {
      const payload = validateForm();

      if (payload.quantity === 1) {
        const item = await createBarcodeItem(payload);
        setGeneratedItems([item]);
      } else {
        const items = await createBarcodeBatch(payload);
        setGeneratedItems(items);
      }
    } catch (submitError) {
      console.error(submitError);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            Barcode Generation
          </span>

          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-neutral-950 md:text-5xl">
            Generate Product Tags
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
            Every physical unit receives a globally unique
            serial number and Code 128 barcode.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white">
              <PackagePlus size={19} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Product Information
              </h2>

              <p className="mt-1 text-xs leading-6 text-neutral-500">
                Enter variant information and the number of
                physical units being produced.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <Field label="Product ID">
              <input
                type="text"
                value={form.productId}
                onChange={(event) =>
                  updateField("productId", event.target.value)
                }
                placeholder="Example: 1081"
                className="field-control"
              />
            </Field>

            <Field label="Size">
              <select
                value={form.size}
                onChange={(event) =>
                  updateField("size", event.target.value)
                }
                className="field-control"
              >
                {SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="MRP">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(event) =>
                    updateField("price", event.target.value)
                  }
                  placeholder="1499"
                  className="field-control pl-8"
                />
              </div>
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="1"
                max="5000"
                value={form.quantity}
                onChange={(event) =>
                  updateField("quantity", event.target.value)
                }
                className="field-control"
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 xl:col-span-4"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Barcode size={18} />
              )}

              {submitting
                ? "Generating..."
                : Number(form.quantity) > 1
                  ? `Generate ${form.quantity} Barcodes`
                  : "Generate Barcode"}
            </button>
          </form>
        </section>

        {(error || successMessage) && (
          <div
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>{error || successMessage}</span>

            <button type="button" onClick={clearMessages}>
              <X size={16} />
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
          <BarcodePrintGrid
            items={generatedItems}
            title="Generated Barcode Tags"
            emptyMessage="Generate barcodes to preview and print product tags."
          />
        </section>
      </div>

      <style jsx global>{`
        .field-control {
          width: 100%;
          min-height: 46px;
          border: 1px solid #dedede;
          border-radius: 11px;
          background: #ffffff;
          padding: 0 12px;
          color: #111111;
          font-size: 12px;
          outline: none;
        }

        .field-control:focus {
          border-color: #111111;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
        {label}
      </span>

      {children}
    </label>
  );
}