"use client";

import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();

const toInt = (v) => {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

const normalizeSize = (v) => String(v || "").trim().toUpperCase();

const getVariantSize = (variant) => {
  if (!variant) return "";
  if (variant.size) return String(variant.size);

  const attrs = Array.isArray(variant.attributes) ? variant.attributes : [];
  const hit = attrs.find((a) => {
    const k = String(a?.key || "").trim().toLowerCase();
    return k === "size" || k === "sizes" || k === "shirt_size";
  });

  return hit?.value ? String(hit.value) : "";
};

const getProductImages = (product) => {
  const imgs = [
    ...safeArr(product?.images).filter(Boolean),
    ...(product?.thumbnail ? [product.thumbnail] : []),
  ];
  return [...new Set(imgs)];
};

const triggerReconcile = async ({ productId, variantId = null }) => {
  try {
    const res = await fetch(`${BACKEND}/api/inventory-reservations/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, variantId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Reconcile failed");
    return data;
  } catch (e) {
    console.log("[RECONCILE_FAIL]", e?.message || e);
    return null;
  }
};

export default function OnDemandInventoryPage() {
  const {
    products,
    loading,
    saving,
    fetchAllProducts,
    updateProductStock,
    updateVariantStock,
  } = useAdminProductStore();

  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [draft, setDraft] = useState({});
  const [searching, setSearching] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const product = useMemo(() => {
    const q = t(searched).toLowerCase();
    if (!q) return null;

    return safeArr(products).find((p) => {
      const code = t(p?.productCode).toLowerCase();
      const sku = t(p?.sku).toLowerCase();
      const id = t(p?._id).toLowerCase();
      const title = t(p?.title).toLowerCase();

      const variants = safeArr(p?.variants);
      const variantHit = variants.some((v) => {
        const vsku = t(v?.sku).toLowerCase();
        const barcode = t(v?.barcode).toLowerCase();
        const size = normalizeSize(getVariantSize(v)).toLowerCase();

        return (
          vsku === q ||
          barcode === q ||
          size === q ||
          vsku.includes(q) ||
          barcode.includes(q)
        );
      });

      return (
        id === q ||
        code === q ||
        sku === q ||
        code.includes(q) ||
        sku.includes(q) ||
        title.includes(q) ||
        variantHit
      );
    });
  }, [products, searched]);

  const variants = safeArr(product?.variants);
  const productImages = useMemo(() => getProductImages(product), [product]);
  const productImage = productImages[0] || "";

  // add-on draft for simple product
  const getSimpleAddOn = () => {
    return draft.simpleAddOn != null ? draft.simpleAddOn : 0;
  };

  const setSimpleAddOn = (val) => {
    setDraft((prev) => ({ ...prev, simpleAddOn: val }));
  };

  // add-on draft for variants
  const getVariantAddOn = (size) => {
    const key = normalizeSize(size);
    const v = draft[key];
    return v != null ? v : 0;
  };

  const setVariantAddOn = (size, val) => {
    const key = normalizeSize(size);
    setDraft((prev) => ({ ...prev, [key]: val }));
  };

  const totalCurrentInventory = useMemo(() => {
    if (!product) return 0;
    if (!variants.length) return Number(product?.stock ?? 0);

    return variants.reduce((sum, v) => sum + Number(v?.stock ?? 0), 0);
  }, [product, variants]);

  const totalAddOnInventory = useMemo(() => {
    if (!product) return 0;
    if (!variants.length) return toInt(getSimpleAddOn());

    return variants.reduce((sum, v) => {
      const size = normalizeSize(getVariantSize(v));
      return sum + toInt(getVariantAddOn(size));
    }, 0);
  }, [product, variants, draft]);

  const totalFinalInventory = useMemo(() => {
    return totalCurrentInventory + totalAddOnInventory;
  }, [totalCurrentInventory, totalAddOnInventory]);

  const runSearch = async () => {
    const q = t(search);
    if (!q) {
      toast.error("Enter productId / productCode / SKU / barcode");
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setSearched(q);
    setDraft({});

    try {
      await fetchAllProducts({
        search: q,
        q,
        code: q,
        productCode: q,
        sku: q,
        limit: 20,
        page: 1,
      });
    } catch (e) {
      toast.error(e?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter") runSearch();
  };

  const saveSimple = async () => {
    try {
      if (!product?._id) {
        toast.error("Product not found");
        return;
      }

      const currentStock = Number(product?.stock ?? 0);
      const addOn = toInt(getSimpleAddOn());
      const finalStock = currentStock + addOn;

      await updateProductStock(product._id, finalStock);
      await triggerReconcile({ productId: product._id });

      toast.success(`Stock updated: ${currentStock} + ${addOn} = ${finalStock}`);
      setDraft({});
      await runSearch();
    } catch (e) {
      toast.error(e?.message || "Failed to update stock");
    }
  };

  const saveVariant = async (v) => {
    try {
      if (!product?._id) {
        toast.error("Product not found");
        return;
      }

      const size = normalizeSize(getVariantSize(v));
      if (!size) {
        toast.error("Variant size missing");
        return;
      }

      const currentStock = Number(v?.stock ?? 0);
      const addOn = toInt(getVariantAddOn(size));
      const finalStock = currentStock + addOn;

      await updateVariantStock(product._id, size, finalStock);
      await triggerReconcile({
        productId: product._id,
        variantId: v?._id,
      });

      toast.success(`Stock updated for ${size}: ${currentStock} + ${addOn} = ${finalStock}`);
      setDraft((prev) => ({ ...prev, [size]: 0 }));
      await runSearch();
    } catch (e) {
      toast.error(e?.message || "Failed to update variant stock");
    }
  };

  const saveAllVariants = async () => {
    if (!product?._id || !variants.length) return;

    try {
      setSavingAll(true);

      for (const v of variants) {
        const size = normalizeSize(getVariantSize(v));
        if (!size) continue;

        const currentStock = Number(v?.stock ?? 0);
        const addOn = toInt(getVariantAddOn(size));
        const finalStock = currentStock + addOn;

        await updateVariantStock(product._id, size, finalStock);
        await triggerReconcile({
          productId: product._id,
          variantId: v?._id,
        });
      }

      toast.success("All variant stocks updated");
      setDraft({});
      await runSearch();
    } catch (e) {
      toast.error(e?.message || "Failed to update all variant stock");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-black">
      <div className="mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            On Demand Inventory Update
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Search product on demand, view image and inventory, add stock on top
            of current stock, and reconcile reservations.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-11 w-full rounded-2xl bg-[#f7f7f7] px-4 text-sm outline-none ring-1 ring-black/5 transition focus:bg-white focus:ring-black/10"
              placeholder="Enter productId / productCode / SKU / barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onEnter}
            />

            <button
              onClick={runSearch}
              disabled={searching || loading}
              className="h-11 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
            >
              {searching || loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {(searching || loading) && (
          <div className="mt-6 rounded-3xl bg-white p-5 text-sm text-gray-600 shadow-sm ring-1 ring-black/5">
            Loading...
          </div>
        )}

        {!loading && hasSearched && searched && !product && (
          <div className="mt-6 rounded-3xl bg-white p-5 text-sm text-red-500 shadow-sm ring-1 ring-black/5">
            Product not found
          </div>
        )}

        {product && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-[#f7f7f7] ring-1 ring-black/5">
                {productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={productImage}
                    alt={t(product?.title) || "product"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold leading-tight">
                  {t(product?.title) || "—"}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="rounded-full bg-[#f6f6f6] px-3 py-1 ring-1 ring-black/5">
                    {t(product?.productCode) || "—"}
                  </span>

                  {t(product?.sku) ? (
                    <span className="rounded-full bg-[#f6f6f6] px-3 py-1 ring-1 ring-black/5">
                      {t(product?.sku)}
                    </span>
                  ) : null}

                  <span className="rounded-full bg-[#f6f6f6] px-3 py-1 ring-1 ring-black/5">
                    {variants.length ? `${variants.length} sizes` : "Simple product"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-black/5">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Current Inventory
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {totalCurrentInventory}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-black/5">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Add On Inventory
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {totalAddOnInventory}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-black/5">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Final Inventory
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {totalFinalInventory}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!variants.length ? (
              <div className="mt-6 max-w-sm">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Add Stock
                </div>

                <div className="flex gap-2">
                  <input
                    className="h-11 w-full rounded-2xl bg-[#f7f7f7] px-4 text-sm outline-none ring-1 ring-black/5 transition focus:bg-white focus:ring-black/10"
                    value={getSimpleAddOn()}
                    onChange={(e) => setSimpleAddOn(e.target.value)}
                    inputMode="numeric"
                    placeholder="Enter stock to add"
                  />

                  <button
                    onClick={saveSimple}
                    disabled={saving}
                    className="h-11 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Final stock will be: {Number(product?.stock ?? 0)} + {toInt(getSimpleAddOn())} ={" "}
                  {Number(product?.stock ?? 0) + toInt(getSimpleAddOn())}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 flex items-center justify-end">
                  <button
                    onClick={saveAllVariants}
                    disabled={saving || savingAll}
                    className="h-11 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
                  >
                    {savingAll ? "Saving All..." : "Save All"}
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-3 font-medium">SKU</th>
                        <th className="px-3 py-3 font-medium">Barcode</th>
                        <th className="px-3 py-3 font-medium">Size</th>
                        <th className="px-3 py-3 font-medium">Current</th>
                        <th className="px-3 py-3 font-medium">Add On</th>
                        <th className="px-3 py-3 font-medium">Final</th>
                        <th className="px-3 py-3 font-medium">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {variants.map((v) => {
                        const size = normalizeSize(getVariantSize(v));
                        const current = Number(v?.stock ?? 0);
                        const addOn = toInt(getVariantAddOn(size));
                        const final = current + addOn;

                        return (
                          <tr key={v?._id} className="border-t border-black/5">
                            <td className="px-3 py-3 text-gray-900">
                              {t(v?.sku) || "—"}
                            </td>

                            <td className="px-3 py-3 text-gray-600">
                              {t(v?.barcode) || "—"}
                            </td>

                            <td className="px-3 py-3">
                              <span className="inline-flex rounded-full bg-[#f6f6f6] px-2.5 py-1 text-xs text-gray-700 ring-1 ring-black/5">
                                {size || "MISSING"}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-gray-900">{current}</td>

                            <td className="px-3 py-3">
                              <input
                                className="h-10 w-28 rounded-2xl bg-[#f7f7f7] px-3 text-sm outline-none ring-1 ring-black/5 transition focus:bg-white focus:ring-black/10"
                                value={getVariantAddOn(size)}
                                onChange={(e) => setVariantAddOn(size, e.target.value)}
                                inputMode="numeric"
                                disabled={!size}
                                placeholder="0"
                              />
                            </td>

                            <td className="px-3 py-3 text-gray-900 font-medium">
                              {final}
                            </td>

                            <td className="px-3 py-3">
                              <button
                                onClick={() => saveVariant(v)}
                                disabled={saving || !size}
                                className="h-10 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Add-on mode enabled: current stock ke upar jitna input doge, utna add hoga.
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}