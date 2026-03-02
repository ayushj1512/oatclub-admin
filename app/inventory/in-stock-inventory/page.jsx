// app/inventory/in-stock-inventory/page.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ---------------- helpers (same vibe as StockUpdate.jsx) ---------------- */
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

/* ---------- Variant size helpers (same idea) ---------- */
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

/* ---------- Stock / availability helpers ---------- */
const toNonNegNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const availableSimple = (p) => {
  const stock = toNonNegNum(p?.stock);
  const reserved = toNonNegNum(p?.reservedStock);
  return Math.max(0, stock - reserved);
};

const availableVariant = (v) => {
  const stock = toNonNegNum(v?.stock);
  const reserved = toNonNegNum(v?.reservedStock);
  return Math.max(0, stock - reserved);
};

const sumVariantAvailable = (p) =>
  safeArr(p?.variants).reduce((sum, v) => sum + availableVariant(v), 0);

const isInStockComputed = (p) => {
  const variants = safeArr(p?.variants);
  if (!variants.length) return availableSimple(p) > 0;
  return sumVariantAvailable(p) > 0;
};

export default function InStockInventoryPage() {
  const { products, loading, fetchAllProducts } = useAdminProductStore();

  const [qDraft, setQDraft] = useState("");
  const [catDraft, setCatDraft] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const [open, setOpen] = useState({});
  const [imgIdx, setImgIdx] = useState({});
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

  const filteredInStock = useMemo(() => {
    const s = t(q).toLowerCase();
    const c = t(cat).toLowerCase();

    return safeArr(products)
      .filter((p) => isInStockComputed(p) || !!p?.isInStock) // trust backend + safe compute
      .filter((p) => {
        const pc = t(p?.productCode).toLowerCase();
        const title = t(p?.title).toLowerCase();
        const sku = t(p?.sku).toLowerCase();

        const variants = safeArr(p?.variants);

        const vSkuHit = variants.some((v) => t(v?.sku).toLowerCase().includes(s));
        const vBarHit = variants.some((v) => t(v?.barcode).toLowerCase().includes(s));
        const vSizeHit = variants.some((v) =>
          normalizeSize(getVariantSize(v)).toLowerCase().includes(s)
        );

        const matchSearch =
          !s || pc.includes(s) || title.includes(s) || sku.includes(s) || vSkuHit || vBarHit || vSizeHit;

        const cats = safeArr(p?.categories)
          .map((x) => t(x).toLowerCase())
          .filter((x) => x && !isMongoId(x));

        const matchCat = !c || cats.some((x) => x === c || x.includes(c));
        return matchSearch && matchCat;
      });
  }, [products, q, cat]);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top Controls */}
      <div className="border-b border-black/10 bg-white">
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {/* Left: Title */}
            <div className="min-w-[260px]">
              <div className="text-lg font-semibold tracking-tight">In-Stock Inventory</div>
              <div className="text-[11px] text-gray-600 mt-1">
                {isBusy ? "Loading…" : `Showing: ${filteredInStock.length} products`}
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
                      placeholder="Search by productCode / title / SKU / barcode / size…"
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
                  Showing products where <b>available stock &gt; 0</b> (stock - reservedStock). Variable products sum
                  size-wise availability.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-6 space-y-3">
        {isBusy ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : filteredInStock.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No in-stock products found</div>
        ) : (
          filteredInStock.map((p) => {
            const pid = t(p?._id);
            const variants = safeArr(p?.variants);
            const isVariable = variants.length > 0;
            const opened = !!open[pid];
            const { url, images, idx } = getImage(p);

            const cats = safeArr(p?.categories)
              .map((c) => t(c))
              .filter((c) => c && !isMongoId(c));

            const simpleAvail = availableSimple(p);
            const varAvail = sumVariantAvailable(p);
            const avail = isVariable ? varAvail : simpleAvail;

            return (
              <div
                key={pid}
                className="border border-black/10 rounded-lg overflow-hidden bg-white"
              >
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
                      {/* Left */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded bg-black text-white">
                            {t(p?.productCode) || "—"}
                          </span>

                          <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                            {isVariable ? `Variable • ${variants.length} sizes` : "Simple"}
                          </span>

                          <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                            Available: <b>{avail}</b>
                          </span>
                        </div>

                        <div className="mt-1 font-medium truncate">{t(p?.title) || "—"}</div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {cats.length ? (
                            cats.slice(0, 10).map((c, i) => (
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

                        {!isVariable && (
                          <div className="mt-2 text-[11px] text-gray-600">
                            Stock: <b>{toNonNegNum(p?.stock)}</b> • Reserved:{" "}
                            <b>{toNonNegNum(p?.reservedStock)}</b>
                          </div>
                        )}
                      </div>

                      {/* Right */}
                      <div className="flex gap-2 lg:justify-end shrink-0">
                        {isVariable && (
                          <button
                            className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
                            onClick={() => toggleOpen(pid)}
                          >
                            {opened ? "Hide sizes" : "View sizes"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variants table (read-only) */}
                {opened && isVariable && (
                  <div className="border-t border-black/10 bg-gray-50">
                    <div className="p-3 md:p-4 overflow-x-auto">
                      <table className="min-w-[980px] w-full text-sm bg-white border border-black/10 rounded">
                        <thead>
                          <tr className="text-left border-b border-black/10">
                            <th className="p-3 w-[240px] font-semibold">SKU</th>
                            <th className="p-3 w-[220px] font-semibold">Barcode</th>
                            <th className="p-3 w-[140px] font-semibold">Size</th>
                            <th className="p-3 w-[320px] font-semibold">Attributes</th>
                            <th className="p-3 w-[140px] font-semibold">Stock</th>
                            <th className="p-3 w-[140px] font-semibold">Reserved</th>
                            <th className="p-3 w-[160px] font-semibold">Available</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-black/5">
                          {variants
                            .map((v, i) => {
                              const sku = t(v?.sku) || "—";
                              const barcode = t(v?.barcode) || "—";
                              const size = normalizeSize(getVariantSize(v));
                              const stock = toNonNegNum(v?.stock);
                              const reserved = toNonNegNum(v?.reservedStock);
                              const availV = Math.max(0, stock - reserved);

                              const attrs = safeArr(v?.attributes)
                                .map((a) => {
                                  const key = t(a?.key);
                                  const val = t(a?.value);
                                  if (!key && !val) return "";
                                  return key && val ? `${key}: ${val}` : key || val;
                                })
                                .filter(Boolean)
                                .slice(0, 5)
                                .join(" • ");

                              return { v, i, sku, barcode, size, stock, reserved, availV, attrs };
                            })
                            .filter((row) => row.availV > 0) // only show in-stock sizes
                            .map((row) => (
                              <tr key={`${pid}-v-${row.size || row.i}`} className="hover:bg-gray-50">
                                <td className="p-3">
                                  <div className="font-medium">{row.sku}</div>
                                </td>

                                <td className="p-3">
                                  <div className="text-xs text-gray-700">{row.barcode}</div>
                                </td>

                                <td className="p-3">
                                  <span className="inline-flex px-2 py-1 text-xs rounded border bg-gray-50 border-black/10">
                                    {row.size || "—"}
                                  </span>
                                </td>

                                <td className="p-3">
                                  <div className="text-xs text-gray-600">{row.attrs || "—"}</div>
                                </td>

                                <td className="p-3">
                                  <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                                    {row.stock}
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                                    {row.reserved}
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                                    <b>{row.availV}</b>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      <div className="text-[11px] text-gray-500 mt-2">
                        Only sizes with <b>available &gt; 0</b> are shown.
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