"use client";

import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();

const toInt = (v) => {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const clampStock = (v) => Math.max(0, toInt(v));

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

const getAvailable = (stock, reserved) =>
  Math.max(0, Number(stock || 0) - Number(reserved || 0));

export default function ModifyInventoryPage() {
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
  const [searching, setSearching] = useState(false);

  const [simpleDraft, setSimpleDraft] = useState({
    mode: "set",
    qty: "",
  });

  const [variantDraft, setVariantDraft] = useState({});
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

  const getVariantRowDraft = (size) => {
    const key = normalizeSize(size);
    return (
      variantDraft[key] || {
        mode: "set",
        qty: "",
      }
    );
  };

  const setVariantRowDraft = (size, patch) => {
    const key = normalizeSize(size);
    setVariantDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { mode: "set", qty: "" }),
        ...patch,
      },
    }));
  };

  const calcNextStock = (current, mode, qty) => {
    const base = clampStock(current);
    const value = clampStock(qty);

    if (mode === "add") return base + value;
    if (mode === "subtract") return Math.max(0, base - value);
    return value;
  };

  const totalCurrentInventory = useMemo(() => {
    if (!product) return 0;
    if (!variants.length) return Number(product?.stock ?? 0);

    return variants.reduce((sum, v) => sum + Number(v?.stock ?? 0), 0);
  }, [product, variants]);

  const totalReservedInventory = useMemo(() => {
    if (!product) return 0;
    if (!variants.length) return Number(product?.reservedStock ?? 0);

    return variants.reduce((sum, v) => sum + Number(v?.reservedStock ?? 0), 0);
  }, [product, variants]);

  const totalAvailableInventory = useMemo(() => {
    return getAvailable(totalCurrentInventory, totalReservedInventory);
  }, [totalCurrentInventory, totalReservedInventory]);

  const totalProjectedInventory = useMemo(() => {
    if (!product) return 0;

    if (!variants.length) {
      return calcNextStock(
        Number(product?.stock ?? 0),
        simpleDraft.mode,
        simpleDraft.qty
      );
    }

    return variants.reduce((sum, v) => {
      const size = normalizeSize(getVariantSize(v));
      const row = getVariantRowDraft(size);
      return sum + calcNextStock(Number(v?.stock ?? 0), row.mode, row.qty);
    }, 0);
  }, [product, variants, simpleDraft, variantDraft]);

  const totalProjectedAvailable = useMemo(() => {
    return getAvailable(totalProjectedInventory, totalReservedInventory);
  }, [totalProjectedInventory, totalReservedInventory]);

  const changedVariantCount = useMemo(() => {
    if (!variants.length) return 0;

    return variants.reduce((count, v) => {
      const size = normalizeSize(getVariantSize(v));
      const row = getVariantRowDraft(size);
      const current = Number(v?.stock ?? 0);
      const next = calcNextStock(current, row.mode, row.qty);
      return next !== current ? count + 1 : count;
    }, 0);
  }, [variants, variantDraft]);

  const resetDrafts = () => {
    setSimpleDraft({ mode: "set", qty: "" });
    setVariantDraft({});
  };

  const runSearch = async () => {
    const q = t(search);
    if (!q) {
      toast.error("Enter productId / productCode / SKU / barcode");
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setSearched(q);
    resetDrafts();

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

      const current = Number(product?.stock ?? 0);
      const nextStock = calcNextStock(current, simpleDraft.mode, simpleDraft.qty);

      await updateProductStock(product._id, nextStock);

      toast.success(`Stock updated: ${current} → ${nextStock}`);
      resetDrafts();
      await runSearch();
    } catch (e) {
      toast.error(e?.message || "Failed to update stock");
    }
  };

  const saveVariant = async (variant) => {
    try {
      if (!product?._id) {
        toast.error("Product not found");
        return;
      }

      const size = normalizeSize(getVariantSize(variant));
      if (!size) {
        toast.error("Variant size missing");
        return;
      }

      const row = getVariantRowDraft(size);
      const current = Number(variant?.stock ?? 0);
      const nextStock = calcNextStock(current, row.mode, row.qty);

      await updateVariantStock(product._id, size, nextStock);

      toast.success(`Stock updated for ${size}: ${current} → ${nextStock}`);

      setVariantDraft((prev) => ({
        ...prev,
        [size]: { mode: "set", qty: "" },
      }));

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

        const row = getVariantRowDraft(size);
        const current = Number(v?.stock ?? 0);
        const nextStock = calcNextStock(current, row.mode, row.qty);

        if (nextStock === current) continue;

        await updateVariantStock(product._id, size, nextStock);
      }

      toast.success("All modified variant stocks updated");
      resetDrafts();
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
            Modify Inventory
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Search product, review stock, reserved stock, available stock, and
            directly set, add, or subtract inventory.
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

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <div className="rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-black/5">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Current Stock
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {totalCurrentInventory}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#fff9e8] px-4 py-3 ring-1 ring-yellow-200">
                    <div className="text-[11px] uppercase tracking-wide text-yellow-700">
                      Reserved
                    </div>
                    <div className="mt-1 text-lg font-semibold text-yellow-700">
                      {totalReservedInventory}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#eefbf3] px-4 py-3 ring-1 ring-emerald-200">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-700">
                      Available
                    </div>
                    <div className="mt-1 text-lg font-semibold text-emerald-700">
                      {totalAvailableInventory}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-black/5">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Projected Stock
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {totalProjectedInventory}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3f8ff] px-4 py-3 ring-1 ring-blue-200">
                    <div className="text-[11px] uppercase tracking-wide text-blue-700">
                      Projected Available
                    </div>
                    <div className="mt-1 text-lg font-semibold text-blue-700">
                      {totalProjectedAvailable}
                    </div>
                  </div>
                </div>

                {variants.length ? (
                  <div className="mt-3">
                    <span className="inline-flex rounded-full bg-[#f6f6f6] px-3 py-1 text-xs text-gray-700 ring-1 ring-black/5">
                      Changed Sizes: {changedVariantCount}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {!variants.length ? (
              <div className="mt-6 max-w-xl">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Modify Stock
                </div>

                <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <select
                    className="h-11 rounded-2xl bg-[#f7f7f7] px-4 text-sm outline-none ring-1 ring-black/5 focus:bg-white focus:ring-black/10"
                    value={simpleDraft.mode}
                    onChange={(e) =>
                      setSimpleDraft((prev) => ({ ...prev, mode: e.target.value }))
                    }
                  >
                    <option value="set">Set Final Stock</option>
                    <option value="add">Add Stock</option>
                    <option value="subtract">Subtract Stock</option>
                  </select>

                  <input
                    className="h-11 w-full rounded-2xl bg-[#f7f7f7] px-4 text-sm outline-none ring-1 ring-black/5 transition focus:bg-white focus:ring-black/10"
                    value={simpleDraft.qty}
                    onChange={(e) =>
                      setSimpleDraft((prev) => ({ ...prev, qty: e.target.value }))
                    }
                    inputMode="numeric"
                    placeholder="Enter quantity"
                  />

                  <button
                    onClick={saveSimple}
                    disabled={saving}
                    className="h-11 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl bg-[#fafafa] px-3 py-2 ring-1 ring-black/5">
                    <div className="text-gray-500">Current</div>
                    <div className="mt-1 font-semibold">
                      {Number(product?.stock ?? 0)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#fff9e8] px-3 py-2 ring-1 ring-yellow-200">
                    <div className="text-yellow-700">Reserved</div>
                    <div className="mt-1 font-semibold text-yellow-700">
                      {Number(product?.reservedStock ?? 0)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#eefbf3] px-3 py-2 ring-1 ring-emerald-200">
                    <div className="text-emerald-700">Available After Update</div>
                    <div className="mt-1 font-semibold text-emerald-700">
                      {getAvailable(
                        calcNextStock(
                          Number(product?.stock ?? 0),
                          simpleDraft.mode,
                          simpleDraft.qty
                        ),
                        Number(product?.reservedStock ?? 0)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 flex items-center justify-end">
                  <button
                    onClick={saveAllVariants}
                    disabled={saving || savingAll || changedVariantCount === 0}
                    className="h-11 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
                  >
                    {savingAll ? "Saving All..." : "Save All Changed"}
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[1300px] text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-3 font-medium">SKU</th>
                        <th className="px-3 py-3 font-medium">Barcode</th>
                        <th className="px-3 py-3 font-medium">Size</th>
                        <th className="px-3 py-3 font-medium">Current</th>
                        <th className="px-3 py-3 font-medium">Reserved</th>
                        <th className="px-3 py-3 font-medium">Available</th>
                        <th className="px-3 py-3 font-medium">Mode</th>
                        <th className="px-3 py-3 font-medium">Qty</th>
                        <th className="px-3 py-3 font-medium">Final Stock</th>
                        <th className="px-3 py-3 font-medium">Final Available</th>
                        <th className="px-3 py-3 font-medium">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {variants.map((v) => {
                        const size = normalizeSize(getVariantSize(v));
                        const current = Number(v?.stock ?? 0);
                        const reserved = Number(v?.reservedStock ?? 0);
                        const available = getAvailable(current, reserved);
                        const row = getVariantRowDraft(size);
                        const final = calcNextStock(current, row.mode, row.qty);
                        const finalAvailable = getAvailable(final, reserved);
                        const changed = final !== current;

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
                              <span className="inline-flex rounded-full bg-[#fff9e8] px-2.5 py-1 text-xs font-medium text-yellow-700 ring-1 ring-yellow-200">
                                {reserved}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <span className="inline-flex rounded-full bg-[#eefbf3] px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                                {available}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <select
                                className="h-10 min-w-[150px] rounded-2xl bg-[#f7f7f7] px-3 text-sm outline-none ring-1 ring-black/5 focus:bg-white focus:ring-black/10"
                                value={row.mode}
                                onChange={(e) =>
                                  setVariantRowDraft(size, { mode: e.target.value })
                                }
                                disabled={!size}
                              >
                                <option value="set">Set Final Stock</option>
                                <option value="add">Add Stock</option>
                                <option value="subtract">Subtract Stock</option>
                              </select>
                            </td>

                            <td className="px-3 py-3">
                              <input
                                className="h-10 w-28 rounded-2xl bg-[#f7f7f7] px-3 text-sm outline-none ring-1 ring-black/5 transition focus:bg-white focus:ring-black/10"
                                value={row.qty}
                                onChange={(e) =>
                                  setVariantRowDraft(size, { qty: e.target.value })
                                }
                                inputMode="numeric"
                                disabled={!size}
                                placeholder="0"
                              />
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`font-medium ${
                                  changed ? "text-black" : "text-gray-500"
                                }`}
                              >
                                {final}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                                  changed
                                    ? "bg-[#f3f8ff] text-blue-700 ring-blue-200"
                                    : "bg-[#f6f6f6] text-gray-600 ring-black/5"
                                }`}
                              >
                                {finalAvailable}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <button
                                onClick={() => saveVariant(v)}
                                disabled={saving || !size || !changed}
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
                  Set = final stock exact value, Add = current ke upar add hoga,
                  Subtract = current se minus hoga, Available = Stock - Reserved.
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}