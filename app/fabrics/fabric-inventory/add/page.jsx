"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  ImagePlus,
  IndianRupee,
  Loader2,
  PackagePlus,
  Save,
  StickyNote,
  Warehouse,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const inputClass =
  "h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black";
const readOnlyClass =
  "h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-700 outline-none";

export default function AddFabricInventoryPage() {
  const router = useRouter();

  const [fabricOptions, setFabricOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fabricId: "",
    quantity: "",
    unit: "",
    price: "",
    notes: "",
    source: "manual",
    image: null,
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const res = await fetch(`${BASE_URL}/api/fabrics/options`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Failed to fetch fabrics");

        setFabricOptions(data.data || []);
      } catch (err) {
        setError(err.message || "Failed to fetch fabrics");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const selectedFabric = useMemo(() => {
    return fabricOptions.find((item) => item._id === form.fabricId) || null;
  }, [fabricOptions, form.fabricId]);

  useEffect(() => {
    if (!selectedFabric) return;

    setForm((prev) => ({
      ...prev,
      unit: selectedFabric.unit || "",
      price:
        prev.price !== "" && prev.price !== null
          ? prev.price
          : selectedFabric.price || "",
      image:
        prev.image ||
        (selectedFabric.imageLink
          ? {
              url: selectedFabric.imageLink,
              publicId: selectedFabric.publicId || "",
              resourceType: "image",
            }
          : null),
    }));
  }, [selectedFabric]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!form.fabricId) throw new Error("Please select a fabric");
      if (!form.quantity || Number(form.quantity) <= 0) {
        throw new Error("Please enter valid quantity");
      }

      const payload = {
        fabricId: form.fabricId,
        quantity: Number(form.quantity),
        unit: form.unit,
        price: form.price === "" ? 0 : Number(form.price),
        notes: form.notes,
        source: form.source,
        imageLink: form.image?.url || "",
        imagePublicId: form.image?.publicId || "",
      };

      const res = await fetch(`${BASE_URL}/api/fabric-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to add inventory");

      setSuccess("Inventory added successfully");

      setTimeout(() => {
        router.push("/inventory/fabric-inventory");
      }, 600);
    } catch (err) {
      setError(err.message || "Failed to add inventory");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 p-5 text-white md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15">
                    <PackagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold md:text-2xl">
                      Add Fabric Inventory
                    </h1>
                    <p className="mt-1 text-sm text-neutral-300">
                      Add fresh stock entry for any existing fabric in inventory.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/inventory/fabric-inventory"
                className="inline-flex items-center gap-2 self-start rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inventory
              </Link>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-neutral-100 p-2.5">
                  <Warehouse className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Inventory Details
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Select fabric and enter quantity details.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Select Fabric
                  </label>
                  <select
                    value={form.fabricId}
                    onChange={(e) => handleChange("fabricId", e.target.value)}
                    className={inputClass}
                    disabled={loadingOptions || submitting}
                  >
                    <option value="">
                      {loadingOptions ? "Loading fabrics..." : "Select fabric"}
                    </option>
                    {fabricOptions.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.code}) - {item.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                    placeholder="Enter quantity"
                    className={inputClass}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    readOnly
                    className={readOnlyClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Price
                  </label>
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => handleChange("price", e.target.value)}
                      placeholder="Enter price"
                      className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Source
                  </label>
                  <select
                    value={form.source}
                    onChange={(e) => handleChange("source", e.target.value)}
                    className={inputClass}
                    disabled={submitting}
                  >
                    <option value="manual">Manual</option>
                    <option value="purchase">Purchase</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="opening_stock">Opening Stock</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Notes
                  </label>
                  <div className="relative">
                    <StickyNote className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-neutral-400" />
                    <textarea
                      rows={5}
                      value={form.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      placeholder="Optional notes"
                      className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-neutral-100 p-2.5">
                  <ImagePlus className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Fabric Image
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Use the centralized media library for image selection.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-3xl border border-dashed border-neutral-300 bg-neutral-50">
                  <div className="relative aspect-square w-full">
                    {form.image?.url ? (
                      <Image
                        src={form.image.url}
                        alt="Selected fabric"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="rounded-2xl bg-white p-3 shadow-sm">
                          <ImagePlus className="h-5 w-5 text-neutral-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-700">
                          No image selected
                        </p>
                        <p className="text-xs text-neutral-500">
                          Pick from media library
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm font-medium text-neutral-800">
                      Recommended
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Store only media reference like
                      <span className="mx-1 font-medium text-neutral-700">
                        url
                      </span>
                      and
                      <span className="ml-1 font-medium text-neutral-700">
                        publicId
                      </span>
                      .
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      <ImagePlus className="h-4 w-4" />
                      {form.image ? "Change Image" : "Select Image"}
                    </button>

                    {form.image ? (
                      <button
                        type="button"
                        onClick={() => handleChange("image", null)}
                        className="rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {form.image?.url ? (
                    <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-500 break-all">
                      {form.image.url}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting || loadingOptions}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Inventory
              </button>

              <Link
                href="/inventory/fabric-inventory"
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
              >
                Cancel
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-neutral-100 p-2.5">
                  <Boxes className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Selected Fabric
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Quick preview and auto-filled details.
                  </p>
                </div>
              </div>

              {selectedFabric ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
                    <div className="relative aspect-[4/3] w-full">
                      {form.image?.url ? (
                        <Image
                          src={form.image.url}
                          alt={selectedFabric.name || "fabric"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                          No preview image
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <InfoRow label="Name" value={selectedFabric.name} />
                    <InfoRow label="Code" value={selectedFabric.code} />
                    <InfoRow label="Category" value={selectedFabric.category} />
                    <InfoRow label="Unit" value={selectedFabric.unit} />
                    <InfoRow
                      label="Default Price"
                      value={
                        selectedFabric.price !== undefined &&
                        selectedFabric.price !== null
                          ? `₹${selectedFabric.price}`
                          : "—"
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                  Select a fabric to preview details here.
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        folder="miray/fabric-inventory"
        onSelect={(media) => {
          handleChange("image", media);
          setMediaOpen(false);
        }}
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900 text-right">
        {value || "—"}
      </span>
    </div>
  );
}