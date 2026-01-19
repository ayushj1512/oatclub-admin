"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, RefreshCcw, Search, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean).map(String)));

const getCode = (p) => (p?.productCode || p?.code || p?.sku || "").toString().trim();
const getImg = (p) => p?.images?.[0] || p?.image || p?.thumbnail || "/placeholder.png";

/**
 * ✅ UPDATED for new Collection.products schema:
 * products: [{ product: ObjectId, productCode: String }]
 *
 * UI keeps productIds[] only
 * submit/update sends products[] in new format
 */

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

  const { products, fetchProducts, loading: productLoading } = useAdminProductStore();

  const [query, setQuery] = useState("");
  const [originalIds, setOriginalIds] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "seasonal",
    isActive: true,
    productIds: [],
  });

  /* ---------------- load ---------------- */
  useEffect(() => {
    fetchCollectionById(id);
    fetchProducts({ limit: 1000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const productMap = useMemo(
    () => new Map((products || []).map((p) => [String(p._id), p])),
    [products]
  );

  const extractIdsFromCollection = (col) => {
    if (!Array.isArray(col?.products)) return [];
    return col.products
      .map((it) => {
        // new shape { product, productCode }
        if (it && typeof it === "object" && "product" in it) {
          return typeof it.product === "object" ? it.product?._id : it.product;
        }
        // old shape
        return typeof it === "string" ? it : it?._id;
      })
      .filter(Boolean)
      .map(String);
  };

  /* ---------------- hydrate ---------------- */
  useEffect(() => {
    if (!collection) return;

    const ids = uniq(extractIdsFromCollection(collection));
    setOriginalIds(ids);

    setForm({
      name: collection?.name || "",
      description: collection?.description || "",
      type: collection?.type || "seasonal",
      isActive: Boolean(collection?.isActive),
      productIds: ids,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  /* ---------------- derived lists ---------------- */
  const assignedProducts = useMemo(
    () => uniq(form.productIds).map((pid) => productMap.get(String(pid))).filter(Boolean),
    [form.productIds, productMap]
  );

  const unassignedProducts = useMemo(() => {
    const assignedSet = new Set(uniq(form.productIds));
    let list = (products || []).filter((p) => !assignedSet.has(String(p._id)));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => {
        const title = (p?.title || "").toLowerCase();
        const sku = (p?.sku || "").toLowerCase();
        const code = (p?.productCode || p?.code || "").toLowerCase();
        return title.includes(q) || sku.includes(q) || code.includes(q);
      });
    }
    return list;
  }, [products, form.productIds, query]);

  /* ---------------- sync status ---------------- */
  const missingOnProductCollections = useMemo(() => {
    if (!collection?._id) return [];
    const colId = String(collection._id);

    const missing = [];
    for (const pid of uniq(form.productIds)) {
      const p = productMap.get(String(pid));
      const pCols = Array.isArray(p?.collections)
        ? p.collections.map((x) => String(x?._id ?? x))
        : [];
      if (!pCols.includes(colId)) missing.push(String(pid));
    }
    return missing;
  }, [collection?._id, form.productIds, productMap]);

  const isSynced = missingOnProductCollections.length === 0;

  const diff = useMemo(() => {
    const prev = new Set(uniq(originalIds));
    const next = new Set(uniq(form.productIds));

    const addIds = Array.from(next).filter((x) => !prev.has(x));
    const removeIds = Array.from(prev).filter((x) => !next.has(x));

    return { addIds, removeIds };
  }, [originalIds, form.productIds]);

  /* ---------------- actions ---------------- */
  const removeAssigned = (pid) =>
    setForm((p) => ({ ...p, productIds: p.productIds.filter((x) => String(x) !== String(pid)) }));

  const addToAssigned = (pid) =>
    setForm((p) => ({ ...p, productIds: uniq([...(p.productIds || []), pid]) }));

  const syncNow = async () => {
    if (!collection?._id) return;

    const mustAdd = uniq([...diff.addIds, ...missingOnProductCollections]);

    await syncCollectionOnProducts({
      collectionId: collection._id,
      addIds: mustAdd,
      removeIds: diff.removeIds,
    });

    await fetchProducts({ limit: 1000 });
    setOriginalIds(uniq(form.productIds));
  };

  const buildProductsPayloadForUpdate = () => {
    const ids = uniq(form.productIds);
    return ids.map((pid) => {
      const p = productMap.get(String(pid));
      return { product: pid, productCode: getCode(p) };
    });
  };

  const submit = async () => {
    if (!form.name.trim()) return alert("Collection name is required");

    const productsPayload = buildProductsPayloadForUpdate();
    const missingCode = productsPayload.find((x) => !x.productCode);
    if (missingCode) {
      const p = productMap.get(String(missingCode.product));
      return alert(
        `productCode/SKU missing for: "${p?.title || missingCode.product}".\nPlease add SKU/productCode in product before saving.`
      );
    }

    if (!isSynced) {
      alert("Please click 'Sync Products' first, then save.");
      return;
    }

    await updateCollection(id, {
      name: form.name,
      description: form.description,
      type: form.type,
      isActive: form.isActive,
      products: productsPayload, // ✅ NEW schema format
    });

    setOriginalIds(uniq(form.productIds));
    router.push("/products/collections");
  };

  if (!collection) return <p className="p-10">Loading…</p>;

  return (
    <section className="min-h-screen bg-[#F6F7FB] px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Edit Collection
            </h1>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ring-1 ${
                isSynced
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : "bg-amber-50 text-amber-800 ring-amber-200"
              }`}
            >
              {isSynced ? "Synced" : "Not synced"}
            </span>
          </div>

          <button
            type="button"
            onClick={syncNow}
            disabled={saving || productLoading || !collection?._id}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition"
            title="Sync Product.collections for all assigned products"
          >
            <RefreshCcw size={16} />
            Sync Products
          </button>
        </div>

        {!isSynced && (
          <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
            <div className="text-sm font-semibold text-amber-900">
              Products are not synced with this collection
            </div>
            <div className="text-xs text-amber-800 mt-1">
              Click <b>Sync Products</b> to update <b>Product.collections</b>.
            </div>
          </div>
        )}

        {/* DETAILS */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Winter Essentials"
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="seasonal">Seasonal</option>
                  <option value="influencer">Influencer</option>
                  <option value="brand">Brand</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-blue-600"
                />
                Active
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Optional short description"
            />
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ASSIGNED */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Assigned</h2>
                <p className="text-xs text-gray-500">Products in this collection</p>
              </div>
              <span className="text-xs text-gray-500">{assignedProducts.length} items</span>
            </div>

            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {productLoading && <p className="text-sm text-gray-500">Loading products…</p>}

              {!productLoading && assignedProducts.length === 0 && (
                <p className="text-sm text-gray-500">No products assigned yet.</p>
              )}

              {assignedProducts.map((p) => {
                const needsSync = missingOnProductCollections.includes(String(p._id));
                const code = getCode(p);

                return (
                  <div
                    key={p._id}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 ring-1 transition ${
                      needsSync
                        ? "bg-amber-50 ring-amber-200"
                        : "bg-gray-50/60 ring-gray-100"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImg(p)}
                        alt={p.title}
                        className="h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.title}
                        {code ? (
                          <span className="text-xs text-gray-500 ml-2">({code})</span>
                        ) : null}
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

          {/* ADD */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Add Products</h2>
                <p className="text-xs text-gray-500">Search & add more products</p>
              </div>

              <div className="relative w-72 max-w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {productLoading && <p className="text-sm text-gray-500">Loading products…</p>}

              {!productLoading && unassignedProducts.length === 0 && (
                <p className="text-sm text-gray-500">No more products to add.</p>
              )}

              {unassignedProducts.map((p) => {
                const code = getCode(p);

                return (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-gray-50 transition"
                  >
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImg(p)}
                        alt={p.title}
                        className="h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.title}
                        {code ? (
                          <span className="text-xs text-gray-500 ml-2">({code})</span>
                        ) : null}
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
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60"
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
