"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useInventoryReservationStore } from "@/store/inventoryReservationStore";
import StockCsvUploader from "../../components/inventory/StockCsvUploader.jsx";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

const triggerReconcile = async ({ productId, variantId = null }) => {
  try {
    // If you add a zustand action later, use it. Otherwise direct API:
    const res = await fetch(`${BACKEND}/api/inventory-reservations/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, variantId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Reconcile failed");

    // optional: show summary
    console.log("[RECONCILE_OK]", data);
    return data;
  } catch (e) {
    console.log("[RECONCILE_FAIL]", e?.message || e);
    // don't toast error always (can be noisy). Uncomment if you want.
    // toast.error(e?.message || "Reconcile failed");
    return null;
  }
};
const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
const isMongoId = (v) => /^[a-f\d]{24}$/i.test(String(v || "").trim());

/* ---------- Product image helpers ---------- */
const getImages = (p) => {
  const imgs = [
    ...safeArr(p?.images).filter(Boolean),
    ...(p?.thumbnail ? [p.thumbnail] : []),
  ];
  return [...new Set(imgs)];
};

/* ---------- Stock helpers ---------- */
const toNonNegInt = (v, fallback = 0) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
};

// API is size based now
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

const isFootwearProduct = (p, footwearKeys) => {
  const cats = safeArr(p?.categories)
    .map((x) => t(x).toLowerCase())
    .filter((x) => x && !isMongoId(x));

  return cats.some((c) => footwearKeys.some((k) => c.includes(k)));
};

export default function ProductionStockUpdate({
  title = "Production / Stock Update",
  hideFootwear = true,
  footwearKeys = ["footwear", "shoes", "sneakers", "slippers", "sandals"],
}) {
  const {
    products,
    total,
    loading,
    saving,
    fetchAllProducts,
    updateProductStock,
    updateVariantStock,
  } = useAdminProductStore();

  const [qDraft, setQDraft] = useState("");
  const [catDraft, setCatDraft] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const [open, setOpen] = useState({});
  const [imgIdx, setImgIdx] = useState({});
  const [draft, setDraft] = useState({}); // { [productId]: { simpleStock?, variantStocks: { [size]: number|string } } }
  const [loadingAll, setLoadingAll] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const loadAll = async () => {
    if (typeof fetchAllProducts !== "function") {
      toast.error("fetchAllProducts() missing in adminProductStore");
      return;
    }
    setLoadingAll(true);
    try {
      await fetchAllProducts();
    } finally {
      if (mountedRef.current) setLoadingAll(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy = loading || loadingAll;

  const categoryOptions = useMemo(() => {
    const set = new Set();
    safeArr(products).forEach((p) =>
      safeArr(p?.categories).forEach((c) => {
        const v = t(c);
        if (!v || isMongoId(v)) return;
        set.add(v);
      })
    );
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const applySearch = () => {
    setQ(t(qDraft));
    const c = t(catDraft);
    setCat(!c || isMongoId(c) ? "" : c);
  };

  const clearFilters = () => {
    setQDraft("");
    setCatDraft("");
    setQ("");
    setCat("");
  };

  const onEnter = (e) => e.key === "Enter" && applySearch();

  const filteredProducts = useMemo(() => {
    const s = t(q).toLowerCase();
    const c = t(cat).toLowerCase();

    return safeArr(products)
      .filter((p) => (hideFootwear ? !isFootwearProduct(p, footwearKeys) : true))
      .filter((p) => {
        const pc = t(p?.productCode).toLowerCase();
        const title = t(p?.title).toLowerCase();
        const sku = t(p?.sku).toLowerCase();

        const variants = safeArr(p?.variants);
        const vSkuHit = variants.some((v) => t(v?.sku).toLowerCase().includes(s));
        const vSizeHit = variants.some((v) =>
          normalizeSize(getVariantSize(v)).toLowerCase().includes(s)
        );

        const matchSearch =
          !s || pc.includes(s) || title.includes(s) || sku.includes(s) || vSkuHit || vSizeHit;

        const cats = safeArr(p?.categories)
          .map((x) => t(x).toLowerCase())
          .filter((x) => x && !isMongoId(x));

        const matchCat = !c || cats.some((x) => x === c || x.includes(c));
        return matchSearch && matchCat;
      });
  }, [products, q, cat, hideFootwear, footwearKeys]);

  const totalProducts = useMemo(() => {
    const apiTotal = Number(total || 0);
    return apiTotal > 0 ? apiTotal : safeArr(products).length;
  }, [total, products]);

  const toggleOpen = (pid) => setOpen((m) => ({ ...m, [pid]: !m[pid] }));

  const getImage = (p) => {
    const pid = t(p?._id);
    const images = getImages(p);
    const idx = clamp(imgIdx[pid] ?? 0, 0, Math.max(0, images.length - 1));
    return { images, idx, url: images[idx] || "" };
  };

  const prevImg = (p) => {
    const pid = t(p?._id);
    const images = getImages(p);
    if (!pid || !images.length) return;
    setImgIdx((m) => ({
      ...m,
      [pid]: (m[pid] ?? 0) - 1 < 0 ? images.length - 1 : (m[pid] ?? 0) - 1,
    }));
  };

  const nextImg = (p) => {
    const pid = t(p?._id);
    const images = getImages(p);
    if (!pid || !images.length) return;
    setImgIdx((m) => ({
      ...m,
      [pid]: (m[pid] ?? 0) + 1 >= images.length ? 0 : (m[pid] ?? 0) + 1,
    }));
  };

  /* ---------- Draft getters/setters ---------- */
  const getSimpleDraft = (p) => {
    const pid = t(p?._id);
    const v = draft?.[pid]?.simpleStock;
    return v != null ? v : Number(p?.stock ?? 0);
  };

  const setSimpleDraft = (pid, val) =>
    setDraft((prev) => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), simpleStock: val },
    }));

  const getVariantDraft = (pid, size, fallbackStock) => {
    const key = normalizeSize(size);
    const v = draft?.[pid]?.variantStocks?.[key];
    return v != null ? v : Number(fallbackStock ?? 0);
  };

  const setVariantDraft = (pid, size, val) => {
    const key = normalizeSize(size);
    setDraft((prev) => ({
      ...prev,
      [pid]: {
        ...(prev[pid] || {}),
        variantStocks: {
          ...((prev[pid] || {}).variantStocks || {}),
          [key]: val,
        },
      },
    }));
  };

  /* ---------- Save ---------- */
// ✅ assumes you already have: triggerReconcile({ productId, variantId? })
// and helpers: t, safeArr, normalizeSize, getVariantSize, toNonNegInt, etc.

const saveSimple = async (p) => {
  const pid = t(p?._id);
  if (!pid) return;

  try {
    const nextStock = toNonNegInt(getSimpleDraft(p), 0);

    if (typeof updateProductStock !== "function") {
      toast.error("updateProductStock() missing in adminProductStore");
      return;
    }

    await updateProductStock(pid, nextStock);

    // ✅ NEW: auto reserve backorders for this product
    await triggerReconcile({ productId: pid });

    toast.success("Saved ✅");
    await loadAll();
  } catch (e) {
    toast.error(e?.message || "Failed");
  }
};

const saveOneVariant = async (p, v) => {
  const pid = t(p?._id);
  if (!pid) return;

  const size = normalizeSize(getVariantSize(v));
  if (!size) {
    toast.error("Variant size missing (please ensure variant has size / attributes.size)");
    return;
  }

  try {
    const nextStock = toNonNegInt(getVariantDraft(pid, size, v?.stock), 0);

    if (typeof updateVariantStock !== "function") {
      toast.error("updateVariantStock() missing in adminProductStore");
      return;
    }

    await updateVariantStock(pid, size, nextStock);

    // ✅ NEW: reconcile only this variant (needs variantId, not size)
    const variantId = t(v?._id);
    if (variantId) await triggerReconcile({ productId: pid, variantId });

    toast.success(`Saved ✅ (${size})`);
    await loadAll();
  } catch (e) {
    toast.error(e?.message || "Failed");
  }
};

const saveAllVariants = async (p) => {
  const pid = t(p?._id);
  const variants = safeArr(p?.variants);
  if (!pid || !variants.length) return;

  if (typeof updateVariantStock !== "function") {
    toast.error("updateVariantStock() missing in adminProductStore");
    return;
  }

  try {
    for (const v of variants) {
      const size = normalizeSize(getVariantSize(v));
      if (!size) continue;

      const nextStock = toNonNegInt(getVariantDraft(pid, size, v?.stock), 0);
      await updateVariantStock(pid, size, nextStock);

      // ✅ NEW: reconcile each updated variant
      const variantId = t(v?._id);
      if (variantId) await triggerReconcile({ productId: pid, variantId });
    }

    toast.success("All sizes saved ✅");
    await loadAll();
  } catch (e) {
    toast.error(e?.message || "Failed");
  }
};

  const calcTotalVariantStock = (p) =>
    safeArr(p?.variants).reduce((s, v) => s + Number(v?.stock ?? 0), 0);

  return (
    <div className="min-h-screen bg-white text-black">
 {/* Controls */}
<div className="border-b border-black/10 bg-white">
  <div className="p-4 md:p-5">
    {/* Top row: title + filters */}
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      {/* Left: Title */}
      <div className="min-w-[260px]">
        <div className="text-lg font-semibold tracking-tight">{title}</div>
        <div className="text-[11px] text-gray-600 mt-1">
          {isBusy
            ? "Loading…"
            : `Products: ${totalProducts} • Showing: ${filteredProducts.length}${
                hideFootwear ? " • (Footwear hidden)" : ""
              }`}
        </div>
      </div>

      {/* Right: Filters */}
      <div className="w-full md:w-auto">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="flex w-full sm:w-[520px]">
              <input
                className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none w-full rounded-l"
                placeholder="Search by productCode / title / SKU / size…"
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                onKeyDown={onEnter}
              />
              <button
                className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 rounded-r shrink-0"
                onClick={applySearch}
                disabled={isBusy}
              >
                Search
              </button>
            </div>

            {/* Category */}
            <select
              className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none w-full sm:w-64 rounded"
              value={catDraft}
              onChange={(e) => setCatDraft(e.target.value)}
            >
              {categoryOptions.map((opt) => (
                <option key={opt || "__all"} value={opt}>
                  {opt ? opt : "All categories"}
                </option>
              ))}
            </select>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
                onClick={clearFilters}
              >
                Clear
              </button>

              <button
                className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 disabled:opacity-50 rounded"
                onClick={loadAll}
                disabled={isBusy}
              >
                {loadingAll ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-gray-500">
            Tip: Variable products save stock by <b>size</b> (not variantId).
          </div>
        </div>
      </div>
    </div>

    {/* CSV uploader: separate row, full width */}
    <div className="mt-4">
      <StockCsvUploader
        products={products}
        updateProductStock={updateProductStock}
        updateVariantStock={updateVariantStock}
        loadAll={loadAll}
        saving={saving}
      />
    </div>
  </div>
</div>


     {/* Body */}
<div className="p-4 md:p-6 space-y-3">
  {isBusy ? (
    <div className="p-4 text-sm text-gray-600">Loading…</div>
  ) : filteredProducts.length === 0 ? (
    <div className="p-4 text-sm text-gray-600">No products found</div>
  ) : (
    filteredProducts.map((p) => {
      const pid = t(p?._id);
      const variants = safeArr(p?.variants);
      const isVariable = variants.length > 0;
      const opened = !!open[pid];
      const { url, images, idx } = getImage(p);

      const cats = safeArr(p?.categories)
        .map((c) => t(c))
        .filter((c) => c && !isMongoId(c));

      const simpleStock = Number(p?.stock ?? 0);
      const totalVarStock = calcTotalVariantStock(p);

      return (
        <div key={pid} className="border border-black/10 rounded-lg overflow-hidden bg-white">
          {/* Header Row */}
          <div className="p-3 md:p-4 flex flex-col md:flex-row gap-3 md:gap-4 md:items-start">
            {/* Image */}
            <div className="w-full md:w-[150px] shrink-0">
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 border border-black/10 disabled:opacity-50 rounded"
                  onClick={() => prevImg(p)}
                  disabled={!images.length}
                >
                  ←
                </button>

                <div className="w-[92px] h-[68px] bg-gray-50 border border-black/10 overflow-hidden flex items-center justify-center rounded">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={t(p?.title) || "product"}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">No image</span>
                  )}
                </div>

                <button
                  className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 border border-black/10 disabled:opacity-50 rounded"
                  onClick={() => nextImg(p)}
                  disabled={!images.length}
                >
                  →
                </button>
              </div>

              {!!images.length && (
                <div className="text-[11px] text-gray-500 mt-1">
                  {idx + 1}/{images.length}
                </div>
              )}
            </div>

            {/* Info + Actions */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                {/* Left: badges + title + cats */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded bg-black text-white">
                      {t(p?.productCode) || "—"}
                    </span>

                    <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                      {isVariable ? `Variable • ${variants.length} sizes` : "Simple"}
                    </span>

                    <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                      {isVariable ? `Total stock: ${totalVarStock}` : `Stock: ${simpleStock}`}
                    </span>
                  </div>

                  <div className="mt-1 font-medium truncate">{t(p?.title) || "—"}</div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {cats.length ? (
                      cats.slice(0, 8).map((c, i) => (
                        <span
                          key={`${pid}-cat-${i}`}
                          className="px-2 py-1 text-[11px] rounded bg-gray-50 text-black border border-black/10"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </div>
                </div>

                {/* Right: buttons aligned */}
                <div className="flex gap-2 lg:justify-end shrink-0">
                  <button
                    className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
                    onClick={() => toggleOpen(pid)}
                  >
                    {opened ? "Hide" : "Expand"}
                  </button>

                  {isVariable ? (
                    <button
                      className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 rounded"
                      onClick={() => saveAllVariants(p)}
                      disabled={saving}
                    >
                      Save All
                    </button>
                  ) : (
                    <button
                      className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 rounded"
                      onClick={() => saveSimple(p)}
                      disabled={saving}
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>

              {/* Simple product extra fields */}
              {!isVariable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">SKU</div>
                    <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                      {t(p?.sku) || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">Stock</div>
                    <input
                      className="px-3 py-2 text-sm border bg-gray-50 border-black/10 focus:border-black outline-none w-full rounded"
                      value={getSimpleDraft(p)}
                      onChange={(e) => setSimpleDraft(pid, e.target.value)}
                      inputMode="numeric"
                      placeholder="0"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">
                      Saved as integer (negative not allowed).
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variants */}
          {opened && isVariable && (
            <div className="border-t border-black/10 bg-gray-50">
              <div className="p-3 md:p-4 overflow-x-auto">
                <table className="min-w-[920px] w-full text-sm bg-white border border-black/10 rounded">
                  <thead>
                    <tr className="text-left border-b border-black/10">
                      <th className="p-3 w-[300px] font-semibold">SKU</th>
                      <th className="p-3 w-[140px] font-semibold">Size</th>
                      <th className="p-3 w-[280px] font-semibold">Attributes</th>
                      <th className="p-3 w-[140px] font-semibold">Current</th>
                      <th className="p-3 w-[180px] font-semibold">New Stock</th>
                      <th className="p-3 w-[140px] font-semibold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/5">
                    {variants.map((v, i) => {
                      const sku = t(v?.sku) || "—";
                      const size = normalizeSize(getVariantSize(v));
                      const current = Number(v?.stock ?? 0);

                      const attrs = safeArr(v?.attributes)
                        .map((a) => {
                          const key = t(a?.key);
                          const val = t(a?.value);
                          if (!key && !val) return "";
                          return key && val ? `${key}: ${val}` : key || val;
                        })
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(" • ");

                      const newStock = getVariantDraft(pid, size, current);

                      return (
                        <tr key={`${pid}-v-${size || i}`} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{sku}</div>
                          </td>

                          <td className="p-3">
                            <span
                              className={[
                                "inline-flex px-2 py-1 text-xs rounded border",
                                size
                                  ? "bg-gray-50 border-black/10"
                                  : "bg-red-50 border-red-200 text-red-700",
                              ].join(" ")}
                              title={size ? "" : "Missing size mapping"}
                            >
                              {size || "MISSING"}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="text-xs text-gray-600">{attrs || "—"}</div>
                          </td>

                          <td className="p-3">
                            <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                              {current}
                            </div>
                          </td>

                          <td className="p-3">
                            <input
                              className="px-3 py-2 text-sm border bg-gray-50 border-black/10 focus:border-black outline-none w-full rounded"
                              value={newStock}
                              onChange={(e) => setVariantDraft(pid, size, e.target.value)}
                              inputMode="numeric"
                              placeholder="0"
                              disabled={!size}
                            />
                          </td>

                          <td className="p-3">
                            <button
                              className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 w-full disabled:opacity-50 rounded"
                              onClick={() => saveOneVariant(p, v)}
                              disabled={saving || !size}
                              title={!size ? "Cannot update without size" : ""}
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="text-[11px] text-gray-500 mt-2">
                  ⚠️ If any row shows <b>MISSING</b> size, please ensure variant has{" "}
                  <code>size</code> field or attributes include <code>size</code>.
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })
  )}
</div>

    </div>
  );
}
