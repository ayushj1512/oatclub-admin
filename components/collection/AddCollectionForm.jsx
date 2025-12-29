"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";

const toStr = (v) => (v == null ? "" : String(v));

export default function AddCollectionForm() {
  const router = useRouter();

  const { products, fetchProducts, loading: productLoading } =
    useAdminProductStore();

  const { createCollection, saving } = useAdminCollectionStore();

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "seasonal",
    isActive: true,
    products: [],
  });

  /* ---------------- load products ---------------- */
  useEffect(() => {
    fetchProducts({ limit: 1000 });
  }, []);

  /* ---------------- handlers ---------------- */
  const toggleProduct = (id) => {
    setForm((p) => ({
      ...p,
      products: p.products.includes(id)
        ? p.products.filter((x) => x !== id)
        : [...p.products, id],
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) return alert("Collection name is required");

    await createCollection({
      name: toStr(form.name),
      description: toStr(form.description),
      type: form.type,
      isActive: Boolean(form.isActive),
      products: form.products,
    });

    router.push("/products/collections");
  };

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-6 md:px-10 md:py-10">
  <div className="mx-auto max-w-4xl space-y-6">
    {/* HEADER */}
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push("/products/collections")}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-black"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-xl font-semibold text-gray-900">
        Create Collection
      </h1>
    </div>

    {/* BASIC INFO */}
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">
          Basic details
        </h2>
        <p className="text-xs text-gray-500">
          Name, type and visibility
        </p>
      </div>

      <input
        placeholder="Collection name *"
        value={form.name}
        onChange={(e) =>
          setForm((p) => ({ ...p, name: e.target.value }))
        }
        className="input w-full"
      />

      <textarea
        placeholder="Short description (optional)"
        value={form.description}
        onChange={(e) =>
          setForm((p) => ({ ...p, description: e.target.value }))
        }
        rows={3}
        className="input w-full resize-none"
      />

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={form.type}
          onChange={(e) =>
            setForm((p) => ({ ...p, type: e.target.value }))
          }
          className="input w-44"
        >
          <option value="seasonal">Seasonal</option>
          <option value="influencer">Influencer</option>
          <option value="brand">Brand</option>
          <option value="custom">Custom</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700">
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
          Active
        </label>
      </div>
    </div>

    {/* PRODUCT SELECTOR */}
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">
          Assign products
        </h2>
        <p className="text-xs text-gray-500">
          Select products to include in this collection
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border p-3 space-y-2">
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
            className="flex items-center gap-2 text-sm text-gray-700"
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

      <div className="text-xs text-gray-500">
        Selected <b>{form.products.length}</b> products
      </div>
    </div>

    {/* ACTIONS */}
    <div className="flex justify-end gap-3 pt-2">
      <button
        onClick={() => router.push("/products/collections")}
        className="px-4 py-2 text-sm text-gray-700 hover:text-black"
      >
        Cancel
      </button>

      <button
        onClick={submit}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
      >
        <Save size={15} />
        {saving ? "Creating…" : "Create collection"}
      </button>
    </div>
  </div>
</section>

  );
}
