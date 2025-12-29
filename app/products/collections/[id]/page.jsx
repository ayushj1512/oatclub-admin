"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function EditCollectionPage() {
  const router = useRouter();
  const { id } = useParams();

  const {
    fetchCollectionById,
    updateCollection,
    collection,
    saving,
  } = useAdminCollectionStore();

  const {
    products,
    fetchProducts,
    loading: productLoading,
  } = useAdminProductStore();

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "seasonal",
    isActive: true,
    products: [],
  });

  /* ---------------- load data ---------------- */
  useEffect(() => {
    fetchCollectionById(id);
    fetchProducts({ limit: 1000 });
  }, [id]);

  /* ---------------- hydrate form ---------------- */
  useEffect(() => {
    if (!collection) return;

    setForm({
      name: collection.name || "",
      description: collection.description || "",
      type: collection.type || "seasonal",
      isActive: Boolean(collection.isActive),
      products: Array.isArray(collection.products)
        ? collection.products.map((p) =>
            typeof p === "string" ? p : p._id
          )
        : [],
    });
  }, [collection]);

  const toggleProduct = (pid) => {
    setForm((p) => ({
      ...p,
      products: p.products.includes(pid)
        ? p.products.filter((x) => x !== pid)
        : [...p.products, pid],
    }));
  };

  const submit = async () => {
    await updateCollection(id, form);
    router.push("/products/collections");
  };

  if (!collection) return <p className="p-10">Loading…</p>;

  return (
  <section className="min-h-screen bg-gray-50 px-4 py-6 md:px-10 md:py-8">
  <div className="max-w-5xl mx-auto space-y-8">

    {/* ================= HEADER ================= */}
    <div className="flex items-center justify-between">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
        Edit Collection
      </h1>
    </div>

    {/* ================= BASIC INFO ================= */}
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Collection Details
        </h2>
        <p className="text-sm text-gray-500">
          Basic information about this collection
        </p>
      </div>

      <div className="space-y-4">
        {/* NAME */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Collection Name
          </label>
          <input
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="e.g. Winter Essentials"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Optional short description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* TYPE + STATUS */}
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Collection Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((p) => ({ ...p, type: e.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none"
            >
              <option value="seasonal">Seasonal</option>
              <option value="influencer">Influencer</option>
              <option value="brand">Brand</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 pt-5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  isActive: e.target.checked,
                }))
              }
            />
            Active (visible on site)
          </label>
        </div>
      </div>
    </div>

    {/* ================= PRODUCTS ================= */}
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Assign Products
          </h2>
          <p className="text-sm text-gray-500">
            Select products to include in this collection
          </p>
        </div>

        <span className="text-xs text-gray-500">
          Selected: {form.products.length}
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto p-3 space-y-2">
        {productLoading && (
          <p className="text-sm text-gray-500">
            Loading products…
          </p>
        )}

        {!productLoading && products.length === 0 && (
          <p className="text-sm text-gray-500">
            No products available
          </p>
        )}

        {products.map((p) => (
          <label
            key={p._id}
            className="flex items-center gap-2 text-sm text-gray-800 hover:bg-gray-50 px-2 py-1 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={form.products.includes(p._id)}
              onChange={() => toggleProduct(p._id)}
            />
            <span className="truncate">{p.title}</span>
          </label>
        ))}
      </div>
    </div>

    {/* ================= ACTIONS ================= */}
    <div className="flex justify-end gap-3 pt-2">
      <button
        onClick={() => router.back()}
        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        Cancel
      </button>

      <button
        onClick={submit}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
      >
        <Save size={16} />
        {saving ? "Saving…" : "Update Collection"}
      </button>
    </div>

  </div>
</section>

  );
}
