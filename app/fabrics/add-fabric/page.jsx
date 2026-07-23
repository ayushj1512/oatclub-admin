"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";

import ProductPicker from "@/components/common/ProductPicker";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useAdminProductStore } from "@/store/adminProductStore";
import useFabricStore from "@/store/fabricStore";

const initialForm = {
  name: "",
  category: "",
  unit: "meter",
  imageLink: "",
  imagePublicId: "",
  gsm: "",
  width: "",
  currentStock: 0,
  status: "active",
  movementStatus: "idle",
  notes: "",
};

const normalizeCode = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  return digits.slice(-5).padStart(5, "0");
};

const getProductCode = (product) =>
  normalizeCode(
    product?.productCode ||
      product?.styleCode ||
      product?.patternNumber ||
      product?.code ||
      product?.sku
  );

export default function AddFabricPage() {
  const router = useRouter();

  const { createFabric, formLoading, error } = useFabricStore();
  const adminProducts = useAdminProductStore((state) => state.products || []);

  const [form, setForm] = useState(initialForm);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [mediaOpen, setMediaOpen] = useState(false);

  const selectedProductCodes = useMemo(() => {
    const selectedSet = new Set(selectedProductIds.map(String));

    return Array.from(
      new Set(
        adminProducts
          .filter((product) => selectedSet.has(String(product?._id)))
          .map(getProductCode)
          .filter(Boolean)
      )
    );
  }, [adminProducts, selectedProductIds]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleMediaSelect = (media) => {
    if (!media) return;

    setForm((prev) => ({
      ...prev,
      imageLink: media.url || "",
      imagePublicId: media.publicId || "",
    }));

    setMediaOpen(false);
  };

  const removeImage = () => {
    setForm((prev) => ({
      ...prev,
      imageLink: "",
      imagePublicId: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      unit: form.unit,
      imageLink: form.imageLink,
      imagePublicId: form.imagePublicId,
      gsm: form.gsm ? Number(form.gsm) : null,
      width: form.width.trim() || null,
      currentStock: Number(form.currentStock || 0),
      associatedProductCodes: selectedProductCodes,
      status: form.status,
      movementStatus: form.movementStatus,
      notes: form.notes.trim(),
      isActive: true,
    };

    const response = await createFabric(payload);

    if (response?.success) {
      router.push("/fabrics");
    }
  };

  return (
    <>
      <main className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <header>
            <Link
              href="/fabrics"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-950"
            >
              <ArrowLeft size={16} />
              Back to fabrics
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Add Fabric
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Create a fabric master with stock and product mapping.
            </p>
          </header>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fabric Name" required>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="Cotton Lycra"
                  className="input"
                />
              </Field>

              <Field label="Category" required>
                <input
                  required
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  placeholder="Cotton / Rayon / Denim"
                  className="input"
                />
              </Field>

              <Field label="Unit" required>
                <select
                  value={form.unit}
                  onChange={(event) =>
                    updateField("unit", event.target.value)
                  }
                  className="input"
                >
                  <option value="meter">Meter</option>
                  <option value="kg">Kilogram</option>
                </select>
              </Field>

              <Field label="Opening Stock">
                <input
                  type="number"
                  min="0"
                  value={form.currentStock}
                  onChange={(event) =>
                    updateField("currentStock", event.target.value)
                  }
                  className="input"
                />
              </Field>

              <Field label="GSM">
                <input
                  type="number"
                  min="1"
                  value={form.gsm}
                  onChange={(event) =>
                    updateField("gsm", event.target.value)
                  }
                  placeholder="180"
                  className="input"
                />
              </Field>

              <Field label="Width">
                <input
                  value={form.width}
                  onChange={(event) =>
                    updateField("width", event.target.value)
                  }
                  placeholder={'58" / 44"'}
                  className="input"
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </Field>

              <Field label="Movement Status">
                <select
                  value={form.movementStatus}
                  onChange={(event) =>
                    updateField("movementStatus", event.target.value)
                  }
                  className="input"
                >
                  <option value="idle">Idle</option>
                  <option value="incoming">Incoming</option>
                  <option value="in_use">In Use</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </Field>

              <Field label="Fabric Image" className="md:col-span-2">
                {form.imageLink ? (
                  <div className="flex items-center gap-4 rounded-xl border border-neutral-200 p-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      <Image
                        src={form.imageLink}
                        alt={form.name || "Fabric"}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Fabric image selected
                      </p>

                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {form.imageLink}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMediaOpen(true)}
                          className="small-button"
                        >
                          <ImagePlus size={15} />
                          Replace
                        </button>

                        <button
                          type="button"
                          onClick={removeImage}
                          className="small-button text-red-600"
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMediaOpen(true)}
                    className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-950 hover:text-neutral-950"
                  >
                    <ImagePlus size={22} />
                    <span className="mt-2 text-sm font-medium">
                      Select fabric image
                    </span>
                  </button>
                )}
              </Field>

              <div className="md:col-span-2">
                <ProductPicker
                  value={selectedProductIds}
                  onChange={setSelectedProductIds}
                  multiple
                  title="Associated Products"
                  initialLimit={20}
                />

                {selectedProductCodes.length ? (
                  <p className="mt-2 text-xs text-neutral-500">
                    Product codes: {selectedProductCodes.join(", ")}
                  </p>
                ) : null}
              </div>

              <Field label="Notes" className="md:col-span-2">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  placeholder="Internal notes..."
                  rows={4}
                  className="input min-h-28 resize-none py-3"
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/fabrics"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-medium hover:bg-neutral-100"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={formLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {formLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}

                Save Fabric
              </button>
            </div>
          </form>
        </div>

        <style jsx>{`
          .input {
            min-height: 44px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid #e5e5e5;
            background: white;
            padding: 0 12px;
            font-size: 14px;
            outline: none;
          }

          .input:focus {
            border-color: #171717;
          }

          .small-button {
            display: inline-flex;
            height: 36px;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border-radius: 10px;
            border: 1px solid #e5e5e5;
            padding: 0 12px;
            font-size: 12px;
            font-weight: 500;
          }

          .small-button:hover {
            background: #f5f5f5;
          }
        `}</style>
      </main>

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={handleMediaSelect}
        folder="miray/fabrics"
      />
    </>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      {children}
    </label>
  );
}