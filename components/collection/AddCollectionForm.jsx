"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";

const toStr = (v) => (v == null ? "" : String(v));

export default function AddCollectionForm() {
  const router = useRouter();

  const { products, fetchProducts, loading: productLoading } =
    useAdminProductStore();

  // ✅ include syncCollectionOnProducts
  const { createCollection, syncCollectionOnProducts, saving } =
    useAdminCollectionStore();

  const [query, setQuery] = useState("");

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

  /* ---------------- filter products (optional, lightweight) ---------------- */
  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter((p) => (p?.title || "").toLowerCase().includes(q));
  }, [products, query]);

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

  // build products payload with productCode
  const selectedProducts = (form.products || []).map((id) => {
    const p = products.find((x) => x._id === id);

    return {
      productId: id,
      productCode: p?.productCode || p?.sku || p?.code || "",
    };
  });

  // validate locally (better error than store throw)
  const missing = selectedProducts.filter((p) => !p.productCode);
  if (missing.length) {
    return alert(
      `productCode missing for ${missing.length} selected product(s). Please add productCode/SKU in product data.`
    );
  }

  const created = await createCollection({
    name: toStr(form.name),
    description: toStr(form.description),
    type: form.type,
    isActive: Boolean(form.isActive),
    products: selectedProducts, // ✅ now includes productCode
  });

  // keep your sync logic same (it needs ids)
  if (created?._id && form.products.length) {
    await syncCollectionOnProducts({
      collectionId: created._id,
      addIds: form.products,
      removeIds: [],
    });
  }

  router.push("/products/collections");
};


  return (
    <section className="min-h-screen bg-[#F6F7FB] px-4 py-7 md:px-10 md:py-10">
      <div className="mx-auto max-w-4xl space-y-7">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/products/collections")}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Create Collection
            </h1>
          </div>

          <div className="text-xs font-medium px-3 py-1 rounded-full bg-gray-900 text-white">
            Selected: {form.products.length}
          </div>
        </div>

        {/* BASIC INFO */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Basic details
            </h2>
            <p className="text-xs text-gray-500">Name, type and visibility</p>
          </div>

          <div className="grid gap-4">
            <input
              placeholder="Collection name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 outline-none transition"
            />

            <textarea
              placeholder="Short description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 outline-none resize-none transition"
            />

            <div className="flex flex-wrap items-center gap-4">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value }))
                }
                className="rounded-xl bg-gray-50 ring-1 ring-gray-200 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
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
                    setForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                  className="accent-blue-600"
                />
                Active
              </label>
            </div>
          </div>
        </div>

        {/* PRODUCT SELECTOR */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Assign products
              </h2>
              <p className="text-xs text-gray-500">
                Select products to include in this collection
              </p>
            </div>

            {/* search */}
            <div className="relative w-64 max-w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {productLoading && (
              <p className="text-sm text-gray-500">Loading products…</p>
            )}

            {!productLoading && filteredProducts.length === 0 && (
              <p className="text-sm text-gray-500">No products available</p>
            )}

            {filteredProducts.map((p) => {
              const img =
                p?.images?.[0] || p?.image || p?.thumbnail || "/placeholder.png";

              const selected = form.products.includes(p._id);

              return (
                <label
                  key={p._id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 cursor-pointer transition
                    ${
                      selected
                        ? "bg-blue-50 ring-1 ring-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleProduct(p._id)}
                    className="accent-blue-600"
                  />

                  {/* image */}
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.png";
                      }}
                    />
                  </div>

                  {/* title */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.title}
                    </p>
                    {(p.sku || p.price) && (
                      <p className="text-xs text-gray-500 truncate">
                        {p.sku ? `SKU: ${p.sku}` : ""}
                        {p.sku && p.price ? " • " : ""}
                        {p.price ? `₹${p.price}` : ""}
                      </p>
                    )}
                  </div>

                  {/* tiny check badge */}
                  {selected && (
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-blue-600 text-white">
                      Added
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="text-xs text-gray-500">
            Selected{" "}
            <b className="text-gray-900">{form.products.length}</b> products
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={() => router.push("/products/collections")}
            className="px-4 py-2 text-sm text-gray-700 hover:text-black rounded-xl hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60 transition"
          >
            <Save size={15} />
            {saving ? "Creating…" : "Create collection"}
          </button>
        </div>
      </div>
    </section>
  );
}
