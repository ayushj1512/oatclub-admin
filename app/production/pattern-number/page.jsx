"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ---------------- Helpers ---------------- */
const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();

const flatVariants = (p) => {
  const productId = t(p?._id);
  const productCode = t(p?.productCode);
  const title = t(p?.title);
  const slug = t(p?.slug);

  const categories = safeArr(p?.categories).map((c) => t(c)).filter(Boolean);

  const images = [
    ...safeArr(p?.images).filter(Boolean),
    ...(p?.thumbnail ? [p.thumbnail] : []),
  ];
  const uniqImages = [...new Set(images)];

  const variants = safeArr(p?.variants);

  // If no variants, we still return one row (simple product)
  if (!variants.length) {
    return [
      {
        rowId: `${productId}__simple`,
        productId,
        productCode,
        title,
        slug,
        categories,
        images: uniqImages,
        variantId: "",
        sku: t(p?.sku),
        patternNumber: t(p?.patternNumber), // backward compatible only
        isSimple: true,
      },
    ];
  }

  // Variable product: one row per variant
  return variants.map((v) => ({
    rowId: `${productId}__${t(v?._id)}`,
    productId,
    productCode,
    title,
    slug,
    categories,
    images: uniqImages,
    variantId: t(v?._id),
    sku: t(v?.sku),
    patternNumber: t(v?.patternNumber),
    isSimple: false,
  }));
};

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

/* ---------------- Component ---------------- */
export default function ProductionStylesPage() {
  const { products, loading, saving, fetchProducts, updateProduct } =
    useAdminProductStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // productId -> image index (so all variant rows for same product share image nav)
  const [imgIdx, setImgIdx] = useState({});

  // edits: rowId -> { patternNumber }
  const [edits, setEdits] = useState({});

  useEffect(() => {
    fetchProducts({ page: 1, limit: 50 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allRows = useMemo(() => safeArr(products).flatMap(flatVariants), [products]);

  const filteredRows = useMemo(() => {
    const s = t(search).toLowerCase();
    const c = t(category).toLowerCase();

    return safeArr(allRows).filter((r) => {
      const matchSearch =
        !s ||
        r.productCode.toLowerCase().includes(s) ||
        r.title.toLowerCase().includes(s) ||
        r.slug.toLowerCase().includes(s) ||
        r.sku.toLowerCase().includes(s) ||
        r.patternNumber.toLowerCase().includes(s);

      const cats = safeArr(r.categories).map((x) => x.toLowerCase());
      const matchCat = !c || cats.some((x) => x.includes(c));

      return matchSearch && matchCat;
    });
  }, [allRows, search, category]);

  const getRowPattern = (r) => {
    const v = edits[r.rowId]?.patternNumber;
    return v != null ? v : r.patternNumber;
  };

  const patchRowPattern = (rowId, patternNumber) =>
    setEdits((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), patternNumber },
    }));

  const getImageUrl = (row) => {
    const pid = row.productId;
    const images = safeArr(row.images);
    const idx = clamp(imgIdx[pid] ?? 0, 0, Math.max(0, images.length - 1));
    return { images, idx, url: images[idx] || "" };
  };

  const prevImg = (row) => {
    const pid = row.productId;
    const images = safeArr(row.images);
    if (!pid || !images.length) return;
    setImgIdx((m) => ({
      ...m,
      [pid]: (m[pid] ?? 0) - 1 < 0 ? images.length - 1 : (m[pid] ?? 0) - 1,
    }));
  };

  const nextImg = (row) => {
    const pid = row.productId;
    const images = safeArr(row.images);
    if (!pid || !images.length) return;
    setImgIdx((m) => ({
      ...m,
      [pid]: (m[pid] ?? 0) + 1 >= images.length ? 0 : (m[pid] ?? 0) + 1,
    }));
  };

  const saveRow = async (row) => {
    const productId = row.productId;
    if (!productId) return;

    const patternNumber = t(getRowPattern(row));
    // if mandatory:
    // if (!patternNumber) return toast.error("Pattern number is required");

    try {
      if (row.isSimple) {
        // simple product safety fallback
        await updateProduct(productId, { patternNumber });
      } else {
        await updateProduct(productId, {
          variantPatterns: { [row.variantId]: patternNumber },
        });
      }
      toast.success("Saved ✅");
    } catch {
      // keep silent like your current behavior
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/10">
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="min-w-[240px]">
            <div className="text-lg font-semibold tracking-tight">
              Production / Styles
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              {loading ? "Loading…" : `${filteredRows.length} rows`}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full md:w-96"
              placeholder="Search product code / product name / slug / sku / pattern…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full md:w-56"
              placeholder="Category…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <button
              className="px-3 py-2 bg-black text-white hover:bg-black/90 disabled:opacity-50"
              onClick={() => fetchProducts({ page: 1, limit: 50 })}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 md:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10">
                <th className="p-3 w-[140px] font-semibold">Product Code</th>
                <th className="p-3 w-[320px] font-semibold">Product Name</th>
                <th className="p-3 w-[260px] font-semibold">SKU</th>
                <th className="p-3 w-[210px] font-semibold">Image</th>
                <th className="p-3 w-[260px] font-semibold">Category</th>
                <th className="p-3 w-[260px] font-semibold">Pattern Number</th>
                <th className="p-3 w-[130px] font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td className="p-6 text-gray-600" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="p-6 text-gray-600" colSpan={7}>
                    No rows found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const { url, images, idx } = getImageUrl(row);

                  return (
                    <tr key={row.rowId} className="align-top hover:bg-gray-50">
                      {/* Product Code */}
                      <td className="p-3">
                        <div className="font-medium">
                          {row.productCode || "—"}
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="p-3">
                        <div className="font-medium">{row.title || "—"}</div>
                        <div className="text-xs text-gray-500">{row.slug}</div>
                      </td>

                      {/* SKU */}
                      <td className="p-3">
                        <div className="font-medium">{row.sku || "—"}</div>
                        {!row.isSimple && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            Variant: {row.variantId}
                          </div>
                        )}
                      </td>

                      {/* Image */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 border border-black/10 disabled:opacity-50"
                            onClick={() => prevImg(row)}
                            disabled={!images.length}
                            aria-label="Previous image"
                            title="Previous image"
                          >
                            ←
                          </button>

                          <div className="w-[132px] h-[84px] bg-gray-50 border border-black/10 overflow-hidden flex items-center justify-center">
                            {url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={url}
                                alt={row.title || "product"}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs text-gray-500">
                                No image
                              </span>
                            )}
                          </div>

                          <button
                            className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 border border-black/10 disabled:opacity-50"
                            onClick={() => nextImg(row)}
                            disabled={!images.length}
                            aria-label="Next image"
                            title="Next image"
                          >
                            →
                          </button>
                        </div>

                        {!!images.length && (
                          <div className="text-xs text-gray-500 mt-1">
                            {idx + 1}/{images.length}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {safeArr(row.categories).length ? (
                            safeArr(row.categories)
                              .slice(0, 4)
                              .map((c, i) => (
                                <span
                                  key={`${row.rowId}-cat-${i}`}
                                  className="px-2 py-1 text-xs bg-gray-50 text-black border border-black/10"
                                >
                                  {c}
                                </span>
                              ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Pattern Number */}
                      <td className="p-3">
                        <input
                          className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full"
                          placeholder="Pattern number"
                          value={getRowPattern(row)}
                          onChange={(e) =>
                            patchRowPattern(row.rowId, e.target.value)
                          }
                        />
                      </td>

                      {/* Action */}
                      <td className="p-3">
                        <button
                          className="px-3 py-2 bg-black text-white hover:bg-black/90 w-full disabled:opacity-50"
                          onClick={() => saveRow(row)}
                          disabled={saving}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 mt-3">
          Variable products save via{" "}
          <code className="px-1 py-0.5 bg-gray-50 border border-black/10">
            {"{ variantPatterns: { [variantId]: patternNumber } }"}
          </code>
          .
        </div>
      </div>
    </div>
  );
}
