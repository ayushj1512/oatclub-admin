"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductInventoryStore } from "@/store/adminproductinventorystore";
import { useInventoryReservationStore } from "@/store/inventoryReservationStore";

import StockCsvUploader from "../../components/inventory/StockCsvUploader.jsx";
import InventoryBulkQuickUpdater from "@/components/inventory/InventoryBulkQuickUpdater.jsx";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

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

const boolToSelect = (v) => {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
};

const selectToBool = (v) => {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
};

export default function ProductionStockUpdate({
  title = "Production / Stock Update",
  hideFootwear = true,
  footwearKeys = ["footwear", "shoes", "sneakers", "slippers", "sandals"],
}) {
  const {
    products,
    product,
    categories,
    total,
    page,
    limit,
    pages,
    filters,
    loading,
    loadingCategories,
    saving,
    fetchProducts,
    fetchCategories,
    updateSimpleStock,
    updateVariantStockBySize,
    applyFiltersAndFetch,
    clearFiltersAndFetch,
    goToPage,
    refresh,
  } = useAdminProductInventoryStore();

  const [qDraft, setQDraft] = useState("");
  const [catDraft, setCatDraft] = useState("");
  const [sortDraft, setSortDraft] = useState("updated_desc");
  const [productTypeDraft, setProductTypeDraft] = useState("");
  const [stockStatusDraft, setStockStatusDraft] = useState("");
  const [hasVariantsDraft, setHasVariantsDraft] = useState("");
  const [isActiveDraft, setIsActiveDraft] = useState("");
  const [isDraftDraft, setIsDraftDraft] = useState("");
  const [bestSellerDraft, setBestSellerDraft] = useState("");
  const [minStockDraft, setMinStockDraft] = useState("");
  const [maxStockDraft, setMaxStockDraft] = useState("");

  const [open, setOpen] = useState({});
  const [imgIdx, setImgIdx] = useState({});
  const [draft, setDraft] = useState({});

  const mountedRef = useRef(true);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const syncDraftsFromFilters = (incomingFilters = {}) => {
    setQDraft(t(incomingFilters?.q));
    setCatDraft(t(incomingFilters?.category));
    setSortDraft(t(incomingFilters?.sort) || "updated_desc");
    setProductTypeDraft(t(incomingFilters?.productType));
    setStockStatusDraft(boolToSelect(incomingFilters?.inStock));
    setHasVariantsDraft(boolToSelect(incomingFilters?.hasVariants));
    setIsActiveDraft(boolToSelect(incomingFilters?.isActive));
    setIsDraftDraft(boolToSelect(incomingFilters?.isDraft));
    setBestSellerDraft(boolToSelect(incomingFilters?.isBestSeller));
    setMinStockDraft(t(incomingFilters?.minStock));
    setMaxStockDraft(t(incomingFilters?.maxStock));
  };

  const loadInitial = async () => {
    syncDraftsFromFilters({
      ...filters,
      hideFootwear,
      footwearKeys,
    });

    await Promise.all([
      fetchProducts({
        page: 1,
        filters: {
          ...filters,
          hideFootwear,
          footwearKeys,
        },
      }),
      fetchCategories(),
    ]);
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy = loading || loadingCategories;

  const categoryOptions = useMemo(() => {
    const list = safeArr(categories)
      .map((x) => t(x))
      .filter((x) => x && !isMongoId(x));

    return ["", ...list];
  }, [categories]);

  const sortOptions = [
    { value: "updated_desc", label: "Latest Updated" },
    { value: "updated_asc", label: "Oldest Updated" },
    { value: "newest", label: "Newest Created" },
    { value: "oldest", label: "Oldest Created" },
    { value: "title_asc", label: "Title A-Z" },
    { value: "title_desc", label: "Title Z-A" },
    { value: "code_asc", label: "Code Asc" },
    { value: "code_desc", label: "Code Desc" },
    { value: "stock_desc", label: "Stock High-Low" },
    { value: "stock_asc", label: "Stock Low-High" },
  ];

  const applySearch = async () => {
    const nextFilters = {
      q: t(qDraft),
      category: !t(catDraft) || isMongoId(catDraft) ? "" : t(catDraft),
      categories: [],
      sort: t(sortDraft) || "updated_desc",
      productType: t(productTypeDraft),
      inStock: selectToBool(stockStatusDraft),
      hasVariants: selectToBool(hasVariantsDraft),
      isActive: selectToBool(isActiveDraft),
      isDraft: selectToBool(isDraftDraft),
      isBestSeller: selectToBool(bestSellerDraft),
      minStock: t(minStockDraft),
      maxStock: t(maxStockDraft),
      hideFootwear,
      footwearKeys,
    };

    await applyFiltersAndFetch(nextFilters);
  };

  const clearFilters = async () => {
    setQDraft("");
    setCatDraft("");
    setSortDraft("updated_desc");
    setProductTypeDraft("");
    setStockStatusDraft("");
    setHasVariantsDraft("");
    setIsActiveDraft("");
    setIsDraftDraft("");
    setBestSellerDraft("");
    setMinStockDraft("");
    setMaxStockDraft("");

    await clearFiltersAndFetch();
    await fetchProducts({
      page: 1,
      filters: {
        q: "",
        category: "",
        categories: [],
        hideFootwear,
        footwearKeys,
        sort: "updated_desc",
        productType: "",
        hasVariants: undefined,
        inStock: undefined,
        isActive: undefined,
        isDraft: undefined,
        isBestSeller: undefined,
        minStock: "",
        maxStock: "",
      },
    });
  };

  const onEnter = (e) => {
    if (e.key === "Enter") applySearch();
  };

  useEffect(() => {
    if (!mountedRef.current) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      const nextQ = t(qDraft);
      const currentQ = t(filters?.q);

      if (nextQ === currentQ) return;

      applyFiltersAndFetch({
        ...filters,
        q: nextQ,
        category: !t(catDraft) || isMongoId(catDraft) ? "" : t(catDraft),
        sort: t(sortDraft) || "updated_desc",
        productType: t(productTypeDraft),
        inStock: selectToBool(stockStatusDraft),
        hasVariants: selectToBool(hasVariantsDraft),
        isActive: selectToBool(isActiveDraft),
        isDraft: selectToBool(isDraftDraft),
        isBestSeller: selectToBool(bestSellerDraft),
        minStock: t(minStockDraft),
        maxStock: t(maxStockDraft),
        hideFootwear,
        footwearKeys,
      });
    }, 350);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  const totalProducts = Number(total || 0);
  const currentPage = Number(page || 1);
  const totalPages = Number(pages || 1);
  const currentLimit = Number(limit || 70);

  const startItem =
    totalProducts > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const endItem =
    totalProducts > 0
      ? Math.min((currentPage - 1) * currentLimit + safeArr(products).length, totalProducts)
      : 0;

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
  const saveSimple = async (p) => {
    const pid = t(p?._id);
    if (!pid) return;

    try {
      const nextStock = toNonNegInt(getSimpleDraft(p), 0);
      const result = await updateSimpleStock(pid, nextStock);
      if (!result) return;

      await triggerReconcile({ productId: pid });

      toast.success("Saved ✅");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  const saveOneVariant = async (p, v) => {
    const pid = t(p?._id);
    if (!pid) return;

    const size = normalizeSize(getVariantSize(v));
    if (!size) {
      toast.error(
        "Variant size missing (please ensure variant has size / attributes.size)"
      );
      return;
    }

    try {
      const nextStock = toNonNegInt(getVariantDraft(pid, size, v?.stock), 0);
      const result = await updateVariantStockBySize(pid, size, nextStock);
      if (!result) return;

      const variantId = t(v?._id);
      if (variantId) await triggerReconcile({ productId: pid, variantId });

      toast.success(`Saved ✅ (${size})`);
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  const saveAllVariants = async (p) => {
    const pid = t(p?._id);
    const variants = safeArr(p?.variants);
    if (!pid || !variants.length) return;

    try {
      for (const v of variants) {
        const size = normalizeSize(getVariantSize(v));
        if (!size) continue;

        const nextStock = toNonNegInt(getVariantDraft(pid, size, v?.stock), 0);
        const result = await updateVariantStockBySize(pid, size, nextStock);
        if (!result) throw new Error(`Failed for size ${size}`);

        const variantId = t(v?._id);
        if (variantId) {
          await triggerReconcile({ productId: pid, variantId });
        }
      }

      toast.success("All sizes saved ✅");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  const calcTotalVariantStock = (p) =>
    safeArr(p?.variants).reduce((sum, v) => sum + Number(v?.stock ?? 0), 0);

  const visibleProducts = safeArr(products);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Controls */}
      <div className="border-b border-black/10 bg-white">
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-[260px]">
                <div className="text-lg font-semibold tracking-tight">{title}</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  {isBusy
                    ? "Loading…"
                    : `Products: ${totalProducts} • Showing: ${startItem}-${endItem} • Page ${currentPage}/${totalPages}${
                        hideFootwear ? " • (Footwear hidden)" : ""
                      }`}
                </div>
              </div>

              <div className="w-full md:w-auto">
                <div className="flex flex-col gap-2">
                  {/* Search row */}
                  <div className="flex flex-col xl:flex-row gap-2">
                    <div className="flex w-full xl:w-[520px]">
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

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none w-full xl:w-56 rounded"
                      value={catDraft}
                      onChange={(e) => setCatDraft(e.target.value)}
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt || "__all"} value={opt}>
                          {opt ? opt : "All categories"}
                        </option>
                      ))}
                    </select>

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none w-full xl:w-48 rounded"
                      value={sortDraft}
                      onChange={(e) => setSortDraft(e.target.value)}
                    >
                      {sortOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
                        onClick={clearFilters}
                        disabled={isBusy}
                      >
                        Clear
                      </button>

                      <button
                        className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 disabled:opacity-50 rounded"
                        onClick={refresh}
                        disabled={isBusy}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Advanced filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      value={productTypeDraft}
                      onChange={(e) => setProductTypeDraft(e.target.value)}
                    >
                      <option value="">All types</option>
                      <option value="simple">Simple</option>
                      <option value="variable">Variable</option>
                    </select>

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      value={stockStatusDraft}
                      onChange={(e) => setStockStatusDraft(e.target.value)}
                    >
                      <option value="">All stock status</option>
                      <option value="true">In stock</option>
                      <option value="false">Out of stock</option>
                    </select>

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      value={hasVariantsDraft}
                      onChange={(e) => setHasVariantsDraft(e.target.value)}
                    >
                      <option value="">All variant types</option>
                      <option value="true">Has variants</option>
                      <option value="false">No variants</option>
                    </select>

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      value={isActiveDraft}
                      onChange={(e) => setIsActiveDraft(e.target.value)}
                    >
                      <option value="">All active status</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      value={isDraftDraft}
                      onChange={(e) => setIsDraftDraft(e.target.value)}
                    >
                      <option value="">All draft status</option>
                      <option value="true">Draft</option>
                      <option value="false">Non-draft</option>
                    </select>

                    <select
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      value={bestSellerDraft}
                      onChange={(e) => setBestSellerDraft(e.target.value)}
                    >
                      <option value="">All best seller status</option>
                      <option value="true">Best seller</option>
                      <option value="false">Not best seller</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                    <input
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      placeholder="Min stock"
                      inputMode="numeric"
                      value={minStockDraft}
                      onChange={(e) => setMinStockDraft(e.target.value)}
                      onKeyDown={onEnter}
                    />
                    <input
                      className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
                      placeholder="Max stock"
                      inputMode="numeric"
                      value={maxStockDraft}
                      onChange={(e) => setMaxStockDraft(e.target.value)}
                      onKeyDown={onEnter}
                    />
                    <button
                      className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 rounded"
                      onClick={applySearch}
                      disabled={isBusy}
                    >
                      Apply Filters
                    </button>
                    <div className="px-3 py-2 text-[11px] text-gray-500 border border-dashed border-black/10 rounded flex items-center">
                      Fast search is now backend based with pagination.
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500">
                    Tip: Variable products save stock by <b>size</b>. Bulk updater supports
                    SKU/Barcode/ProductCode + Excel/CSV.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Quick Updater */}
          <div className="mt-4">
            <InventoryBulkQuickUpdater
              products={visibleProducts}
              saving={saving}
              updateProductStock={async (productId, stock) => {
                return await updateSimpleStock(productId, stock);
              }}
              updateVariantStock={async (productId, size, stock) => {
                return await updateVariantStockBySize(productId, size, stock);
              }}
              loadAll={refresh}
              triggerReconcile={triggerReconcile}
            />
          </div>

          {/* CSV uploader */}
          <div className="mt-4">
            <StockCsvUploader
              products={visibleProducts}
              updateProductStock={async (productId, stock) => {
                return await updateSimpleStock(productId, stock);
              }}
              updateVariantStock={async (productId, size, stock) => {
                return await updateVariantStockBySize(productId, size, stock);
              }}
              loadAll={refresh}
              saving={saving}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-6 space-y-3">
        {isBusy ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : visibleProducts.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No products found</div>
        ) : (
          <>
            {visibleProducts.map((p) => {
              const pid = t(p?._id);
              const variants = safeArr(p?.variants);
              const isVariable = variants.length > 0;
              const opened = !!open[pid];
              const { url, images, idx } = getImage(p);

              const cats = safeArr(p?.categories)
                .map((c) => t(c))
                .filter((c) => c && !isMongoId(c));

              const simpleStock = Number(p?.stock ?? 0);
              const simpleReserved = Number(p?.reservedStock ?? 0);
              const simpleAvailable = Number(p?.availableStock ?? 0);
              const totalVarStock = calcTotalVariantStock(p);

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
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded bg-black text-white">
                              {t(p?.productCode) || "—"}
                            </span>

                            <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                              {isVariable
                                ? `Variable • ${variants.length} sizes`
                                : "Simple"}
                            </span>

                            <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                              {isVariable
                                ? `Total stock: ${totalVarStock}`
                                : `Stock: ${simpleStock}`}
                            </span>

                            <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                              Reserved: {Number(p?.reservedStock ?? 0)}
                            </span>

                            <span className="text-[11px] px-2 py-1 border border-black/10 bg-gray-50 rounded">
                              Available: {Number(p?.availableStock ?? 0)}
                            </span>
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

                      {/* Simple product fields */}
                      {!isVariable && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">SKU</div>
                            <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                              {t(p?.sku) || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">Reserved</div>
                            <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                              {simpleReserved}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] text-gray-500 mb-1">Available</div>
                            <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                              {simpleAvailable}
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
                        <table className="min-w-[1120px] w-full text-sm bg-white border border-black/10 rounded">
                          <thead>
                            <tr className="text-left border-b border-black/10">
                              <th className="p-3 w-[240px] font-semibold">SKU</th>
                              <th className="p-3 w-[200px] font-semibold">Barcode</th>
                              <th className="p-3 w-[120px] font-semibold">Size</th>
                              <th className="p-3 w-[260px] font-semibold">Attributes</th>
                              <th className="p-3 w-[120px] font-semibold">Current</th>
                              <th className="p-3 w-[120px] font-semibold">Reserved</th>
                              <th className="p-3 w-[120px] font-semibold">Available</th>
                              <th className="p-3 w-[170px] font-semibold">New Stock</th>
                              <th className="p-3 w-[130px] font-semibold">Action</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-black/5">
                            {variants.map((v, i) => {
                              const sku = t(v?.sku) || "—";
                              const barcode = t(v?.barcode) || "—";
                              const size = normalizeSize(getVariantSize(v));
                              const current = Number(v?.stock ?? 0);
                              const reserved = Number(v?.reservedStock ?? 0);
                              const available = Number(v?.availableStock ?? 0);

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
                                    <div className="text-xs text-gray-700">{barcode}</div>
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
                                    <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                                      {reserved}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <div className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded">
                                      {available}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <input
                                      className="px-3 py-2 text-sm border bg-gray-50 border-black/10 focus:border-black outline-none w-full rounded"
                                      value={newStock}
                                      onChange={(e) =>
                                        setVariantDraft(pid, size, e.target.value)
                                      }
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
            })}

            {/* Pagination */}
            <div className="pt-2">
              <div className="border border-black/10 rounded-xl bg-white p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  {totalProducts > 0
                    ? `Showing ${startItem}-${endItem} of ${totalProducts} products`
                    : "No products"}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 disabled:opacity-50 rounded"
                    onClick={() => goToPage(1)}
                    disabled={currentPage <= 1 || isBusy}
                  >
                    First
                  </button>

                  <button
                    className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 disabled:opacity-50 rounded"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1 || isBusy}
                  >
                    Prev
                  </button>

                  <div className="px-3 py-2 text-sm border border-black/10 bg-gray-50 rounded">
                    Page {currentPage} / {Math.max(1, totalPages)}
                  </div>

                  <button
                    className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 disabled:opacity-50 rounded"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages || isBusy}
                  >
                    Next
                  </button>

                  <button
                    className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 disabled:opacity-50 rounded"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage >= totalPages || isBusy}
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}