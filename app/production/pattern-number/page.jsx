"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/products`;

/* ---------------- Helpers ---------------- */
const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
const isMongoId = (v) => /^[a-f\d]{24}$/i.test(String(v || "").trim());

const getImages = (p) => {
  const imgs = [
    ...safeArr(p?.images).filter(Boolean),
    ...(p?.thumbnail ? [p.thumbnail] : []),
  ];
  return [...new Set(imgs)];
};

const csvEscape = (v) => {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCSV = (rows, filename = "production-styles.csv") => {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function ProductionStylesPage() {
  const { products, total, loading, saving, updateProduct, fetchAllProducts } =
    useAdminProductStore();

  const [qDraft, setQDraft] = useState("");
  const [catDraft, setCatDraft] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const [open, setOpen] = useState({});
  const [imgIdx, setImgIdx] = useState({});
  const [edits, setEdits] = useState({});
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

    return safeArr(products).filter((p) => {
      const pc = t(p?.productCode).toLowerCase();
      const title = t(p?.title).toLowerCase();
      const sku = t(p?.sku).toLowerCase();
      const pat = t(p?.patternNumber).toLowerCase();

      const variants = safeArr(p?.variants);
      const vSkuHit = variants.some((v) => t(v?.sku).toLowerCase().includes(s));
      const vPatHit = variants.some((v) =>
        t(v?.patternNumber).toLowerCase().includes(s)
      );

      const matchSearch =
        !s ||
        pc.includes(s) ||
        title.includes(s) ||
        sku.includes(s) ||
        pat.includes(s) ||
        vSkuHit ||
        vPatHit;

      const cats = safeArr(p?.categories)
        .map((x) => t(x).toLowerCase())
        .filter((x) => x && !isMongoId(x));

      const matchCat = !c || cats.some((x) => x === c || x.includes(c));

      return matchSearch && matchCat;
    });
  }, [products, q, cat]);

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

  // ---- edits helpers ----
  const getProductPattern = (p) => {
    const pid = t(p?._id);
    const v = edits[pid]?.productPattern;
    return v != null ? v : t(p?.patternNumber);
  };

  const setProductPattern = (pid, val) =>
    setEdits((prev) => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), productPattern: val },
    }));

  const getVariantPattern = (pid, vid, fallback) => {
    const v = edits[pid]?.variantPatterns?.[vid];
    return v != null ? v : t(fallback);
  };

  const setVariantPattern = (pid, vid, val) =>
    setEdits((prev) => ({
      ...prev,
      [pid]: {
        ...(prev[pid] || {}),
        variantPatterns: {
          ...((prev[pid] || {}).variantPatterns || {}),
          [vid]: val,
        },
      },
    }));

  // ---- missing pattern badge helpers ----
  const productMissingCount = (p) => {
    const variants = safeArr(p?.variants);
    if (!variants.length) return t(p?.patternNumber) ? 0 : 1;

    const pid = t(p?._id);
    let miss = 0;
    variants.forEach((v) => {
      const vid = t(v?._id);
      const pn = getVariantPattern(pid, vid, v?.patternNumber);
      if (!t(pn)) miss += 1;
    });
    return miss;
  };

  // ---- save ----
  const saveSimple = async (p) => {
    const pid = t(p?._id);
    if (!pid) return;
    try {
      await updateProduct(pid, { patternNumber: t(getProductPattern(p)) });
      toast.success("Saved ✅");
      await loadAll();
    } catch {}
  };

  const saveVariantPattern = async (productId, variantId, patternNumber) => {
    const res = await fetch(`${API}/${productId}/variant-pattern`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ variantId, patternNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Variant pattern update failed");
    return data?.product;
  };

  const saveOneVariant = async (p, vid) => {
    const pid = t(p?._id);
    if (!pid || !vid) return;
    try {
      await saveVariantPattern(pid, vid, t(getVariantPattern(pid, vid, "")));
      toast.success("Saved ✅");
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveAllVariants = async (p) => {
    const pid = t(p?._id);
    const variants = safeArr(p?.variants);
    if (!pid || !variants.length) return;

    try {
      for (const v of variants) {
        const vid = t(v?._id);
        if (!vid) continue;
        await saveVariantPattern(
          pid,
          vid,
          t(getVariantPattern(pid, vid, v?.patternNumber))
        );
      }
      toast.success("All SKUs saved ✅");
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ---- export ----
  const exportCSV = (onlyMissing = false) => {
    // ✅ removed: slug, product type, variant id, product sku
    const header = [
      "Product Code",
      "Product Name",
      "Categories",
      "SKU",
      "Pattern Number",
      "Missing Pattern",
    ];

    const rows = [];
    safeArr(filteredProducts).forEach((p) => {
      const pid = t(p?._id);
      const pc = t(p?.productCode);
      const title = t(p?.title);

      const cats = safeArr(p?.categories)
        .map((c) => t(c))
        .filter((c) => c && !isMongoId(c))
        .join(" | ");

      const variants = safeArr(p?.variants);

      // SIMPLE
      if (!variants.length) {
        const sku = t(p?.sku);
        const pn = t(getProductPattern(p));
        const missing = pn ? "NO" : "YES";
        if (!onlyMissing || missing === "YES") {
          rows.push([pc, title, cats, sku, pn, missing]);
        }
        return;
      }

      // VARIABLE (one row per SKU)
      variants.forEach((v) => {
        const sku = t(v?.sku);
        const pn = t(getVariantPattern(pid, t(v?._id), v?.patternNumber));
        const missing = pn ? "NO" : "YES";
        if (!onlyMissing || missing === "YES") {
          rows.push([pc, title, cats, sku, pn, missing]);
        }
      });
    });

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV([header, ...rows], `production-styles_${stamp}.csv`);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Controls */}
      <div className="border-b border-black/10">
        <div className="p-4 md:p-5 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="min-w-[260px]">
              <div className="text-lg font-semibold tracking-tight">
                Production / Styles
              </div>
              <div className="text-[11px] text-gray-600 mt-1">
                {isBusy
                  ? "Loading…"
                  : `Products: ${totalProducts} • Showing: ${filteredProducts.length}`}
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex w-full md:w-[520px]">
                  <input
                    className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none w-full rounded-l"
                    placeholder="Type… then click Search"
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    onKeyDown={onEnter}
                  />
                  <button
                    className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 rounded-r"
                    onClick={applySearch}
                    disabled={isBusy}
                  >
                    Search
                  </button>
                </div>

                <select
                  className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none w-full md:w-64 rounded"
                  value={catDraft}
                  onChange={(e) => setCatDraft(e.target.value)}
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt || "__all"} value={opt}>
                      {opt ? opt : "All categories"}
                    </option>
                  ))}
                </select>

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

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  className="px-3 py-2 text-sm bg-gray-50 border border-black/10 hover:bg-gray-100 rounded"
                  onClick={() => exportCSV(false)}
                  disabled={isBusy}
                  title="Exports current filtered list"
                >
                  Download CSV (All)
                </button>
                <button
                  className="px-3 py-2 text-sm bg-gray-50 border border-black/10 hover:bg-gray-100 rounded"
                  onClick={() => exportCSV(true)}
                  disabled={isBusy}
                  title="Exports only missing pattern rows"
                >
                  Download CSV (Missing Only)
                </button>
                <div className="text-[11px] text-gray-500 self-center">
                  Excel: open CSV directly.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-6 space-y-2">
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

            const missingCount = productMissingCount(p);
            const hasMissing = missingCount > 0;

            return (
              <div
                key={pid}
                className={[
                  "border rounded-lg overflow-hidden",
                  hasMissing ? "border-red-300" : "border-black/10",
                ].join(" ")}
              >
                <div className="p-3 md:p-4 flex gap-3 items-start">
                  {/* Image */}
                  <div className="w-[140px] shrink-0">
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded bg-black text-white">
                            {t(p?.productCode) || "—"}
                          </span>

                          <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                            {isVariable
                              ? `Variable • ${variants.length} SKUs`
                              : "Simple"}
                          </span>

                          {hasMissing && (
                            <span className="text-[11px] px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700">
                              Missing patterns: {missingCount}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 font-medium truncate">
                          {t(p?.title) || "—"}
                        </div>

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

                      <div className="flex gap-2 shrink-0">
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

                    {!isVariable && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-[11px] text-gray-500 mb-1">
                            SKU
                          </div>
                          <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                            {t(p?.sku) || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-gray-500 mb-1">
                            Pattern Number
                          </div>
                          <input
                            className={[
                              "px-3 py-2 text-sm border focus:border-black outline-none w-full rounded",
                              t(getProductPattern(p))
                                ? "bg-gray-50 border-black/10"
                                : "bg-red-50 border-red-200",
                            ].join(" ")}
                            value={getProductPattern(p)}
                            onChange={(e) =>
                              setProductPattern(pid, e.target.value)
                            }
                            placeholder="Pattern number"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Variants */}
                {opened && isVariable && (
                  <div className="border-t border-black/10 bg-gray-50">
                    <div className="p-3 md:p-4 overflow-x-auto">
                      <table className="min-w-[820px] w-full text-sm bg-white border border-black/10 rounded">
                        <thead>
                          <tr className="text-left border-b border-black/10">
                            <th className="p-3 w-[320px] font-semibold">SKU</th>
                            <th className="p-3 w-[320px] font-semibold">
                              Attributes
                            </th>
                            <th className="p-3 w-[260px] font-semibold">
                              Pattern Number
                            </th>
                            <th className="p-3 w-[140px] font-semibold">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {variants.map((v, i) => {
                            const vid = t(v?._id);

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

                            const pn = getVariantPattern(
                              pid,
                              vid,
                              v?.patternNumber
                            );
                            const missing = !t(pn);

                            return (
                              <tr
                                key={vid || `${pid}-v-${i}`}
                                className={
                                  missing ? "bg-red-50/40" : "hover:bg-gray-50"
                                }
                              >
                                <td className="p-3">
                                  <div className="font-medium">
                                    {t(v?.sku) || "—"}
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="text-xs text-gray-600">
                                    {attrs || "—"}
                                  </div>
                                </td>

                                <td className="p-3">
                                  <input
                                    className={[
                                      "px-3 py-2 text-sm border focus:border-black outline-none w-full rounded",
                                      missing
                                        ? "bg-red-50 border-red-200"
                                        : "bg-gray-50 border-black/10",
                                    ].join(" ")}
                                    value={pn}
                                    onChange={(e) =>
                                      setVariantPattern(
                                        pid,
                                        vid,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Pattern number"
                                  />
                                </td>

                                <td className="p-3">
                                  <button
                                    className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 w-full disabled:opacity-50 rounded"
                                    onClick={() => saveOneVariant(p, vid)}
                                    disabled={saving}
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
                        Red highlight = missing pattern number.
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
