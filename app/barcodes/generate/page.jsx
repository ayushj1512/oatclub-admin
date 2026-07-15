"use client";

import { useEffect, useState } from "react";
import {
  Barcode,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Search,
  X,
} from "lucide-react";

import BarcodePrintGrid from "@/components/barcode/BarcodePrintGrid";
import { useBarcodeStore } from "@/store/barcodeStore";
import { useAdminProductStore } from "@/store/adminProductStore";

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

const normalizeProductCode = (value = "") => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");

  if (/^\d+$/.test(raw) && digits) {
    return digits.padStart(5, "0");
  }

  return raw.toUpperCase().replace(/\s+/g, "");
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

  const { searchProductForBarcode } = useAdminProductStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [generatedItems, setGeneratedItems] = useState([]);
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [productError, setProductError] = useState("");

  const submitting = creating || batchCreating;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const findProduct = async (value) => {
    const normalizedCode = normalizeProductCode(value);

    if (!normalizedCode) {
      setMatchedProduct(null);
      setProductError("");
      return;
    }

    try {
      setSearchingProduct(true);
      setProductError("");
      setMatchedProduct(null);

      const product = await searchProductForBarcode(normalizedCode);

      if (!product) {
        setProductError("No product found with this code");
        return;
      }

      setMatchedProduct(product);

      setForm((current) => ({
        ...current,
        productId: String(product.productCode || normalizedCode),
        price:
          product.price !== undefined && product.price !== null
            ? String(product.price)
            : current.price,
      }));
    } catch (searchError) {
      console.error(searchError);
      setProductError(searchError.message || "Failed to search product");
    } finally {
      setSearchingProduct(false);
    }
  };

  useEffect(() => {
    const rawCode = String(form.productId || "").trim();

    if (!rawCode) {
      setMatchedProduct(null);
      setProductError("");
      return;
    }

    const timer = setTimeout(() => {
      findProduct(rawCode);
    }, 450);

    return () => clearTimeout(timer);
  }, [form.productId]);

  const handleProductCodeBlur = () => {
    const normalizedCode = normalizeProductCode(form.productId);

    if (!normalizedCode) return;

    setForm((current) => ({
      ...current,
      productId: normalizedCode,
    }));
  };

  const validateForm = () => {
    const productId = normalizeProductCode(form.productId);
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
        return;
      }

      const items = await createBarcodeBatch(payload);
      setGeneratedItems(items);
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
            Enter the product code and its MRP will be fetched automatically.
            Every physical unit receives a unique Code 128 barcode.
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
                Product code is normalized automatically. For example, 336
                becomes 00336.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <Field label="Product Code">
              <div className="relative">
                <input
                  type="text"
                  value={form.productId}
                  onChange={(event) => {
                    updateField("productId", event.target.value);
                    setMatchedProduct(null);
                    setProductError("");
                  }}
                  onBlur={handleProductCodeBlur}
                  placeholder="Example: 336"
                  autoComplete="off"
                  className="field-control pr-10"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  {searchingProduct ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : matchedProduct ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <Search size={16} />
                  )}
                </span>
              </div>

              {matchedProduct && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="truncate text-xs font-semibold text-emerald-900">
                    {matchedProduct.title}
                  </p>

                  <p className="mt-0.5 text-[10px] text-emerald-700">
                    Code: {matchedProduct.productCode} · MRP: ₹
                    {Number(matchedProduct.price || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              {productError && (
                <p className="mt-2 text-[11px] text-red-600">
                  {productError}
                </p>
              )}
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
                  placeholder="Auto-filled"
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
              disabled={submitting || searchingProduct}
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