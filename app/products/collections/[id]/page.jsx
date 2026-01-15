"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, RefreshCcw, Search, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

export default function EditCollectionPage() {
  const router = useRouter();
  const { id } = useParams();

  const {
    fetchCollectionById,
    updateCollection,
    collection,
    saving,
    syncCollectionOnProducts,
  } = useAdminCollectionStore();

  const { products, fetchProducts, loading: productLoading } =
    useAdminProductStore();

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "seasonal",
    isActive: true,
    products: [],
  });

  // ✅ snapshot of original collection products (for diff + unsynced check)
  const [originalProductIds, setOriginalProductIds] = useState([]);

  // ✅ search for "add new products" list
  const [query, setQuery] = useState("");

  /* ---------------- load data ---------------- */
  useEffect(() => {
    fetchCollectionById(id);
    fetchProducts({ limit: 1000 });
  }, [id]);

  /* ---------------- hydrate form ---------------- */
  useEffect(() => {
    if (!collection) return;

    const colProductIds = Array.isArray(collection.products)
      ? collection.products.map((p) => (typeof p === "string" ? p : p._id))
      : [];

    setOriginalProductIds(colProductIds);

    setForm({
      name: collection.name || "",
      description: collection.description || "",
      type: collection.type || "seasonal",
      isActive: Boolean(collection.isActive),
      products: colProductIds,
    });
  }, [collection]);

  /* ---------------- helpers ---------------- */
  const productMap = useMemo(
    () => new Map(products.map((p) => [String(p._id), p])),
    [products]
  );

  // ✅ Assigned products (from form.products)
  const assignedProducts = useMemo(() => {
    return uniq(form.products)
      .map((id) => productMap.get(String(id)))
      .filter(Boolean);
  }, [form.products, productMap]);

  // ✅ Unassigned products list for "Add new products" section
  const unassignedProducts = useMemo(() => {
    const assignedSet = new Set(uniq(form.products).map(String));
    let list = products.filter((p) => !assignedSet.has(String(p._id)));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => (p?.title || "").toLowerCase().includes(q));
    }

    return list;
  }, [products, form.products, query]);

  const removeAssigned = (pid) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((x) => String(x) !== String(pid)),
    }));
  };

  const addToAssigned = (pid) => {
    setForm((prev) => ({
      ...prev,
      products: uniq([...(prev.products || []), pid]),
    }));
  };

  /**
   * ✅ Unsynced logic (only checks assigned products)
   * If any assigned product is missing this collection id in Product.collections => not synced.
   */
  const assignedProductsMissingLink = useMemo(() => {
    if (!collection?._id) return [];
    const colId = String(collection._id);

    const missing = [];
    for (const pid of uniq(form.products)) {
      const p = productMap.get(String(pid));
      const pCollections = Array.isArray(p?.collections)
        ? p.collections.map((x) => String(x?._id ?? x))
        : [];

      if (!pCollections.includes(colId)) missing.push(String(pid));
    }
    return missing;
  }, [collection?._id, form.products, productMap]);

  const isSynced = useMemo(
    () => assignedProductsMissingLink.length === 0,
    [assignedProductsMissingLink]
  );

  const buildDiff = () => {
    const prev = uniq(originalProductIds).map(String);
    const next = uniq(form.products).map(String);

    const prevSet = new Set(prev);
    const nextSet = new Set(next);

    const addIds = next.filter((x) => !prevSet.has(x));
    const removeIds = prev.filter((x) => !nextSet.has(x));

    return { addIds, removeIds };
  };

  const syncNow = async () => {
    if (!collection?._id) return;

    const { addIds, removeIds } = buildDiff();

    // Also include assigned products that are missing the link (out-of-sync fix)
    const mustAdd = uniq([...addIds, ...assignedProductsMissingLink]);

    // If nothing to do, still allow quick "sync all" to be a no-op
    await syncCollectionOnProducts({
      collectionId: collection._id,
      addIds: mustAdd,
      removeIds,
    });

    // Refresh products so Product.collections reflect latest
    await fetchProducts({ limit: 1000 });

    // Reset baseline after successful sync
    setOriginalProductIds(uniq(form.products));
  };

  const submit = async () => {
    if (!isSynced) {
      alert(
        "Products are not synced with this collection yet.\n\nPlease click 'Sync Products' to update Product.collections, then save again."
      );
      return;
    }

    await updateCollection(id, form);
    setOriginalProductIds(uniq(form.products));
    router.push("/products/collections");
  };

  if (!collection) return <p className="p-10">Loading…</p>;

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-6 md:px-10 md:py-8">
      <div className=" mx-auto space-y-8">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between gap-4">
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

          {/* ✅ Sync Status + Button */}
          <div className="flex items-center gap-2">
            {!isSynced ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                Not synced
              </span>
            ) : (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                Synced
              </span>
            )}

            <button
              type="button"
              onClick={syncNow}
              disabled={saving || productLoading || !collection?._id}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition"
              title="Sync Product.collections for all assigned products"
            >
              <RefreshCcw size={16} />
              Sync Products
            </button>
          </div>
        </div>

        {/* ✅ UNSYNCED ALERT BOX */}
        {!isSynced && (
          <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
            <div className="text-sm font-semibold text-amber-900">
              Products are not synced with this collection
            </div>
            <div className="text-xs text-amber-800 mt-1">
              Some assigned products are missing this collection inside{" "}
              <b>Product.collections</b>. Click <b>Sync Products</b> to fix in
              one go.
            </div>
          </div>
        )}

        {/* ================= BASIC INFO ================= */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
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
                className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
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
                  className="rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                    setForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                  className="accent-blue-600"
                />
                Active (visible on site)
              </label>
            </div>
          </div>
        </div>

        {/* ================= ASSIGNED PRODUCTS (separate) ================= */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Assigned Products
              </h2>
              <p className="text-sm text-gray-500">
                Currently included in this collection
              </p>
            </div>

            <span className="text-xs text-gray-500">
              Assigned: {assignedProducts.length}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {productLoading && (
              <p className="text-sm text-gray-500">Loading products…</p>
            )}

            {!productLoading && assignedProducts.length === 0 && (
              <p className="text-sm text-gray-500">
                No products assigned yet.
              </p>
            )}

            {assignedProducts.map((p) => {
              const img =
                p?.images?.[0] ||
                p?.image ||
                p?.thumbnail ||
                "/placeholder.png";

              const needsSync = assignedProductsMissingLink.includes(String(p._id));

              return (
                <div
                  key={p._id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                    needsSync
                      ? "bg-amber-50 ring-1 ring-amber-200"
                      : "bg-gray-50/60 ring-1 ring-gray-100"
                  }`}
                >
                  {/* Image */}
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

                  {/* Title */}
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

                  {needsSync && (
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-600 text-white">
                      Needs sync
                    </span>
                  )}

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeAssigned(p._id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-100 transition"
                    title="Remove from collection"
                  >
                    <X size={14} />
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= ADD NEW PRODUCTS (separate) ================= */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Add Products
              </h2>
              <p className="text-sm text-gray-500">
                Search and add more products to this collection
              </p>
            </div>

            <div className="relative w-72 max-w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {productLoading && (
              <p className="text-sm text-gray-500">Loading products…</p>
            )}

            {!productLoading && unassignedProducts.length === 0 && (
              <p className="text-sm text-gray-500">
                No more products to add.
              </p>
            )}

            {unassignedProducts.map((p) => {
              const img =
                p?.images?.[0] ||
                p?.image ||
                p?.thumbnail ||
                "/placeholder.png";

              return (
                <div
                  key={p._id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 cursor-pointer transition hover:bg-gray-50"
                >
                  {/* Image */}
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

                  {/* Title */}
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

                  <button
                    type="button"
                    onClick={() => addToAssigned(p._id)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= ACTIONS ================= */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60"
            title={!isSynced ? "Please sync products before saving" : ""}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Update Collection"}
          </button>
        </div>
      </div>
    </section>
  );
}
