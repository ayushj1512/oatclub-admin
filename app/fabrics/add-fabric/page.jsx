"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Package2,
  Save,
  Scissors,
  Tags,
  X,
} from "lucide-react";
import { useFabricStore } from "@/store/fabricStore";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import ProductPicker from "@/components/common/ProductPicker";

const UNIT_OPTIONS = [
  { label: "Meter", value: "meter" },
  { label: "Kg", value: "kg" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Discontinued", value: "discontinued" },
];

const MOVEMENT_OPTIONS = [
  { label: "Idle", value: "idle" },
  { label: "Incoming", value: "incoming" },
  { label: "In Use", value: "in_use" },
  { label: "Outgoing", value: "outgoing" },
];

const initialForm = {
  name: "",
  category: "",
  unit: "meter",
  price: "",
  gsm: "",
  width: "",
  status: "active",
  movementStatus: "idle",
  notes: "",
  isActive: true,
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

function Card({ children, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function Label({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {children} {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100",
        props.className
      )}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100",
        props.className
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition",
        "focus:border-violet-300 focus:ring-4 focus:ring-violet-100",
        props.className
      )}
    />
  );
}

function normalizeProductCode(code) {
  const str = String(code || "").trim();
  if (!str) return "";
  return /^\d+$/.test(str) ? str.padStart(6, "0") : str;
}

function getProductCode(product) {
  return normalizeProductCode(
    product?.productCode ||
      product?.sku ||
      product?.styleCode ||
      product?.patternNumber ||
      product?.code ||
      ""
  );
}

export default function AddFabricPage() {
  const router = useRouter();
  const { createFabric, formLoading } = useFabricStore();

  const [form, setForm] = useState(initialForm);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const associatedProductCodes = useMemo(
    () => [...new Set(selectedProducts.map(getProductCode).filter(Boolean))],
    [selectedProducts]
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedMedia(null);
    setSelectedProducts([]);
  };

  const validate = () => {
    if (!form.name.trim()) return "Fabric name is required";
    if (!form.category.trim()) return "Category is required";
    if (!form.unit) return "Unit is required";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "Valid price is required";

    if (form.gsm !== "") {
      const gsm = Number(form.gsm);
      if (!Number.isFinite(gsm) || gsm <= 0) return "GSM must be greater than 0";
    }

    return null;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    category: form.category.trim(),
    unit: form.unit,
    price: Number(form.price) || 0,
    imageLink: selectedMedia?.url || "",
    imagePublicId: selectedMedia?.publicId || "",
    gsm: form.gsm === "" ? null : Number(form.gsm),
    width: form.width.trim() || null,
    associatedProductCodes,
    status: form.status,
    movementStatus: form.movementStatus,
    notes: form.notes.trim(),
    isActive: !!form.isActive,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) return toast.error(error);

    try {
      await createFabric(buildPayload());
      toast.success("Fabric added successfully");
      router.push("/inventory/fabrics");
    } catch (err) {
      toast.error(err?.message || "Failed to add fabric");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 px-4 py-5 md:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Add Fabric
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new fabric using <span className="font-medium text-violet-700">/api/fabrics</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={formLoading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>

          <button
            type="submit"
            form="add-fabric-form"
            disabled={formLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {formLoading ? "Saving..." : "Save Fabric"}
          </button>
        </div>
      </div>

      <form id="add-fabric-form" onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
              <Scissors size={18} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Basic Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label required>Fabric Name</Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Cotton Flex, Rayon Slub..."
              />
            </div>

            <div>
              <Label required>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Cotton, Rayon, Linen..."
              />
            </div>

            <div>
              <Label required>Unit</Label>
              <Select
                value={form.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
              >
                {UNIT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label required>Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>GSM</Label>
              <Input
                type="number"
                min="1"
                value={form.gsm}
                onChange={(e) => handleChange("gsm", e.target.value)}
                placeholder="180"
              />
            </div>

            <div>
              <Label>Width</Label>
              <Input
                value={form.width}
                onChange={(e) => handleChange("width", e.target.value)}
                placeholder='44", 56", 60"...'
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Movement Status</Label>
              <Select
                value={form.movementStatus}
                onChange={(e) => handleChange("movementStatus", e.target.value)}
              >
                {MOVEMENT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
              <ImageIcon size={18} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Fabric Image</h2>
          </div>

          {!selectedMedia ? (
            <button
              type="button"
              onClick={() => setMediaOpen(true)}
              className="flex min-h-[190px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/60 p-6 text-center transition hover:bg-sky-50"
            >
              <div className="mb-3 rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
                <ImageIcon size={28} />
              </div>
              <div className="text-sm font-semibold text-slate-800">Select Fabric Image</div>
              <div className="mt-1 text-xs text-slate-500">
                Open media library and choose image
              </div>
            </button>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              <div className="relative aspect-[16/7] w-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.originalName || "Fabric"}
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {selectedMedia.originalName || "Selected Media"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedMedia.format || "—"} • {selectedMedia.resourceType || "image"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMediaOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Change Image
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Tags size={18} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Product Mapping</h2>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
            <ProductPicker
              title="Select products for this fabric"
              multiple
              value={selectedProducts}
              onChange={setSelectedProducts}
            />
          </div>

          {associatedProductCodes.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected Product Codes
              </div>
              <div className="flex flex-wrap gap-2">
                {associatedProductCodes.map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No products selected yet.</p>
          )}
        </Card>

        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Package2 size={18} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Extra Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Optional notes about sourcing, usage, vendor..."
              />
            </div>

            <div className="space-y-4">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-emerald-50 px-3 py-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Keep this fabric active
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-violet-50 p-3">
                  <div className="text-xs text-slate-500">Name</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {form.name.trim() || "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-sky-50 p-3">
                  <div className="text-xs text-slate-500">Category</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {form.category.trim() || "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-50 p-3">
                  <div className="text-xs text-slate-500">Mapped Products</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {associatedProductCodes.length}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={14} />
                  Route: /api/fabrics
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Status: {form.status}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Movement: {form.movementStatus}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </form>

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        folder="miray/fabrics"
        onSelect={(media) => {
          setSelectedMedia(media);
          setMediaOpen(false);
        }}
      />
    </div>
  );
}