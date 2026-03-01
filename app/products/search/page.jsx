// app/products/search/page.jsx
"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCcw,
  ExternalLink,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  Palette,
  Package,
  Boxes,
  BadgeCheck,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";
import ProductImagesEditor from "@/components/product/ProductImagesEditor";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/products`;

/* ---------------- tiny helpers ---------------- */
const s = (v) => (v == null ? "" : String(v));
const money = (n) => {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const toNonNegInt = (v, fallback = 0) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
};
const normalizeSize = (v) => String(v || "").trim().toUpperCase();

async function searchByProductCode(codeRaw) {
  const code = s(codeRaw).trim();
  if (!code) return [];

  // Try a few common patterns (your backend may support any one of these)
  const tries = [
    { productCode: code, limit: "10", page: "1" },
    { code, limit: "10", page: "1" },
    { search: code, limit: "10", page: "1" },
    { q: code, limit: "10", page: "1" },
    { slug: code.toLowerCase(), limit: "10", page: "1" },
  ];

  for (const params of tries) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API}?${qs}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const list = Array.isArray(data?.products) ? data.products : [];
      if (list.length) return list;
      if (data?.product) return [data.product];
    }
  }

  return [];
}

export default function ProductSearchPage() {
  const store = useAdminProductStore();

  const [code, setCode] = useState("");
  const [results, setResults] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  // inline drafts
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftCompare, setDraftCompare] = useState("");
  const [draftCategories, setDraftCategories] = useState("");
  const [draftColors, setDraftColors] = useState("");

  // stock drafts
  const [draftStock, setDraftStock] = useState("");
  const [variantStocks, setVariantStocks] = useState({}); // { [size]: stockString }

  // images draft (keep local so editor is smooth; save via updateProduct)
  const [draftImages, setDraftImages] = useState([]);
  const [draftThumb, setDraftThumb] = useState("");

  const active = useMemo(() => {
    const id = s(activeId);
    if (!id) return null;

    const sp = store.product;
    if (sp && s(sp?._id) === id) return sp;

    return (results || []).find((p) => s(p?._id) === id) || null;
  }, [activeId, results, store.product]);

  const hydrateDraftsFromProduct = useCallback((p) => {
    if (!p) return;

    setDraftTitle(s(p.title));
    setDraftPrice(String(money(p.price)));
    setDraftCompare(
      p.compareAtPrice == null ? "" : String(money(p.compareAtPrice)),
    );
    setDraftCategories(Array.isArray(p.categories) ? p.categories.join(", ") : "");
    setDraftColors(Array.isArray(p.colors) ? p.colors.join(", ") : "");

    setDraftStock(String(toNonNegInt(p.stock, 0)));

    const vs = {};
    (p.variants || []).forEach((v) => {
      const size =
        normalizeSize(v?.size) ||
        normalizeSize(
          (Array.isArray(v?.attributes) ? v.attributes : []).find(
            (a) =>
              s(a?.key).trim().toLowerCase() === "size" ||
              s(a?.key).trim().toLowerCase() === "sizes",
          )?.value,
        );

      if (!size) return;
      vs[size] = String(toNonNegInt(v?.stock, 0));
    });
    setVariantStocks(vs);

    // images
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean).map(String) : [];
    setDraftImages(imgs);
    setDraftThumb(s(p.thumbnail) || imgs[0] || "");
  }, []);

  const doSearch = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const q = s(code).trim();
      if (!q) return toast.error("Product code daal do");

      try {
        setLoadingSearch(true);
        setResults([]);
        setActiveId("");

        const list = await searchByProductCode(q);

        if (!list.length) {
          toast.error("No product found");
          return;
        }

        setResults(list);

        const first = list[0];
        const id = s(first?._id);
        if (id) {
          setActiveId(id);
          await store.fetchProductById(id);

          // hydrate using store.product if possible (freshest)
          const fresh =
            store.product && s(store.product?._id) === id ? store.product : first;

          hydrateDraftsFromProduct(fresh);
          toast.success(`Found ${list.length} product(s) ✅`);
        }
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Search failed");
      } finally {
        setLoadingSearch(false);
      }
    },
    [code, store, hydrateDraftsFromProduct],
  );

  const selectResult = useCallback(
    async (p) => {
      const id = s(p?._id);
      if (!id) return;

      setActiveId(id);
      try {
        await store.fetchProductById(id);
        const fresh =
          store.product && s(store.product?._id) === id ? store.product : p;
        hydrateDraftsFromProduct(fresh);
      } catch (e) {
        console.error(e);
      }
    },
    [store, hydrateDraftsFromProduct],
  );

  const refreshActive = useCallback(async () => {
    const id = s(activeId);
    if (!id) return;

    await store.fetchProductById(id);
    const fresh =
      store.product && s(store.product?._id) === id ? store.product : active;

    hydrateDraftsFromProduct(fresh);
    toast.success("Refreshed ✅");
  }, [activeId, store, active, hydrateDraftsFromProduct]);

  const copyText = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(s(text));
      toast.success("Copied ✅");
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  /* ---------------- actions (store) ---------------- */
  const doUpdateTitle = useCallback(async () => {
    if (!active?._id) return;
    await store.updateTitleInline(active._id, draftTitle);
  }, [active, store, draftTitle]);

  const doUpdatePrice = useCallback(async () => {
    if (!active?._id) return;
    await store.updatePriceInline(active._id, money(draftPrice));
  }, [active, store, draftPrice]);

  const doUpdateCompare = useCallback(async () => {
    if (!active?._id) return;
    const next = s(draftCompare).trim();
    await store.updateComparePriceInline(active._id, next === "" ? null : money(next));
  }, [active, store, draftCompare]);

  const doUpdateCategories = useCallback(async () => {
    if (!active?._id) return;
    const list = s(draftCategories)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    await store.updateCategoriesInline(active._id, list);
  }, [active, store, draftCategories]);

  const doUpdateColors = useCallback(async () => {
    if (!active?._id) return;
    await store.updateProductColorsOnly(active._id, draftColors);
  }, [active, store, draftColors]);

  const doToggleBestSeller = useCallback(async () => {
    if (!active?._id) return;
    await store.toggleBestSeller(active._id);
  }, [active, store]);

  const doMarkPatternReady = useCallback(async () => {
    if (!active?._id) return;
    await store.markPatternReady(active._id);
  }, [active, store]);

  const doTogglePublish = useCallback(
    async (nextActive) => {
      if (!active?._id) return;
      await store.togglePublish(active._id, !!nextActive);
    },
    [active, store],
  );

  const doDelete = useCallback(async () => {
    if (!active?._id) return;
    const ok = window.confirm("Delete this product? This cannot be undone.");
    if (!ok) return;
    await store.deleteProduct(active._id);
    setResults((prev) => (prev || []).filter((p) => s(p?._id) !== s(active._id)));
    setActiveId("");
  }, [active, store]);

  const doUpdateStock = useCallback(async () => {
    if (!active?._id) return;
    await store.updateProductStock(active._id, toNonNegInt(draftStock, 0));
  }, [active, store, draftStock]);

  const doUpdateVariantStock = useCallback(
    async (size) => {
      if (!active?._id) return;
      const sz = normalizeSize(size);
      const val = variantStocks?.[sz];
      await store.updateVariantStock(active._id, sz, toNonNegInt(val, 0));
    },
    [active, store, variantStocks],
  );

  // ✅ Images save (uses store.updateProduct, keeps future-proof)
  const doSaveImages = useCallback(async () => {
    if (!active?._id) return;

    // Ensure thumb is first image (nice UX) but keep `thumbnail` field also
    const cleanThumb = s(draftThumb).trim();
    const imgs = Array.isArray(draftImages) ? draftImages.filter(Boolean).map(String) : [];
    const uniq = Array.from(new Set(imgs));
    const nextImages = cleanThumb
      ? [cleanThumb, ...uniq.filter((u) => u !== cleanThumb)]
      : uniq;

    await store.updateProduct(active._id, {
      images: nextImages,
      thumbnail: cleanThumb || nextImages[0] || "",
    });

    // refresh local drafts from store.product (fresh)
    await store.fetchProductById(active._id);
    const fresh = store.product && s(store.product?._id) === s(active._id) ? store.product : null;
    if (fresh) hydrateDraftsFromProduct(fresh);

    toast.success("Images saved ✅");
  }, [active, store, draftImages, draftThumb, hydrateDraftsFromProduct]);

  const isVariable = useMemo(
    () => Array.isArray(active?.variants) && active.variants.length > 0,
    [active],
  );

  // ✅ Top preview image
  const topPreview = useMemo(() => {
    const thumb = s(draftThumb).trim();
    if (thumb) return thumb;
    const first = Array.isArray(draftImages) ? draftImages[0] : "";
    return s(first).trim();
  }, [draftThumb, draftImages]);

  return (
    <div className="w-full min-h-screen bg-white text-zinc-900">
      {/* Sticky Header */}
      <div className="w-full border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="w-full px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                <Search size={18} />
              </div>
              <div>
                <div className="text-lg font-semibold leading-tight">Product Search</div>
                <div className="text-xs text-zinc-500 -mt-0.5">
                  Search by productCode and manage instantly
                </div>
              </div>
            </div>

            <button
              onClick={refreshActive}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
              disabled={!activeId || store.loading}
              title="Refresh selected product"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={doSearch} className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter product code (e.g. 00045)"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              disabled={loadingSearch}
            >
              <Search size={16} />
              {loadingSearch ? "Searching..." : "Search"}
            </button>
          </form>
        </div>
      </div>

      {/* ✅ ONE COLUMN LAYOUT */}
      <div className="w-full px-4 py-4 space-y-4">
        {/* Results (top) */}
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
            <div className="text-sm font-semibold">Results</div>
            <div className="text-xs text-zinc-500">{results?.length ? `${results.length}` : "—"}</div>
          </div>

          {!results?.length ? (
            <div className="p-4 text-sm text-zinc-500">No results yet. Search with product code.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {results.map((p) => {
                const id = s(p?._id);
                const selected = id && id === s(activeId);
                return (
                  <button
                    key={id || Math.random()}
                    onClick={() => selectResult(p)}
                    className={[
                      "w-full text-left px-4 py-3 hover:bg-zinc-50",
                      selected ? "bg-zinc-50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{s(p?.title) || "Untitled"}</div>
                        <div className="text-xs text-zinc-500 truncate">
                          Code: <span className="font-mono">{s(p?.productCode)}</span> • SKU:{" "}
                          <span className="font-mono">{s(p?.sku) || "—"}</span>
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          ₹{money(p?.price)} {p?.compareAtPrice != null ? ` • ₹${money(p?.compareAtPrice)}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {p?.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={14} /> Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-zinc-50 text-zinc-600 border border-zinc-200">
                            <XCircle size={14} /> Off
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Details */}
        {!active ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Select a product from results to manage it.
          </div>
        ) : (
          <div className="space-y-4">
            

            {/* ✅ IMAGES EDITOR (your component) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold">Images Manager</div>
                <div className="text-xs text-zinc-500">
                  Save images after changes (button above)
                </div>
              </div>

              <ProductImagesEditor
                value={draftImages}
                onChange={(nextUrls) => {
                  const clean = Array.isArray(nextUrls)
                    ? nextUrls.filter(Boolean).map(String)
                    : [];
                  setDraftImages(clean);

                  // if thumb empty, keep first image as preview
                  if (!s(draftThumb).trim() && clean[0]) setDraftThumb(clean[0]);
                }}
                folder="miray/products"
                max={12}
              />
            </div>

            {/* Summary / Actions */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{s(active.title) || "Untitled"}</div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-50 border border-zinc-200">
                        <Tag size={14} />
                        Code: <span className="font-mono">{s(active.productCode)}</span>
                        <button
                          type="button"
                          onClick={() => copyText(active.productCode)}
                          className="ml-1 text-zinc-700 hover:text-zinc-900"
                          title="Copy productCode"
                        >
                          <Copy size={14} />
                        </button>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-50 border border-zinc-200">
                        <Package size={14} />
                        Stock: <span className="font-mono">{toNonNegInt(active.stock, 0)}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-50 border border-zinc-200">
                        <Boxes size={14} />
                        Type:{" "}
                        <span className="font-mono">
                          {s(active.productType) || (isVariable ? "variable" : "simple")}
                        </span>
                      </span>

                      {active.isBestSeller ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Sparkles size={14} /> Best Seller
                        </span>
                      ) : null}

                      {active.isPatternReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <BadgeCheck size={14} /> Pattern Ready
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/products/${s(active.slug)}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                      title="Open product edit page"
                    >
                      <ExternalLink size={16} />
                      Open Edit
                    </Link>

                    <button
                      onClick={() => doTogglePublish(!active.isActive)}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                        active.isActive
                          ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-700",
                      ].join(" ")}
                    >
                      {active.isActive ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={doDelete}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 text-white px-3 py-2 text-sm font-medium hover:bg-rose-700"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick edits */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold mb-3">Quick Edit</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Title */}
                <div className="rounded-2xl border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500 mb-1">Title</div>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="Product title"
                  />
                  <button
                    onClick={doUpdateTitle}
                    className="mt-2 w-full rounded-xl bg-zinc-900 text-white py-2 text-sm hover:bg-zinc-800"
                  >
                    Save Title
                  </button>
                </div>

                {/* Price */}
                <div className="rounded-2xl border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500 mb-1">Price (₹)</div>
                  <input
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="e.g. 999"
                    inputMode="numeric"
                  />
                  <button
                    onClick={doUpdatePrice}
                    className="mt-2 w-full rounded-xl bg-zinc-900 text-white py-2 text-sm hover:bg-zinc-800"
                  >
                    Save Price
                  </button>
                </div>

                {/* Compare */}
                <div className="rounded-2xl border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500 mb-1">Compare At Price (₹)</div>
                  <input
                    value={draftCompare}
                    onChange={(e) => setDraftCompare(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="leave empty to clear"
                    inputMode="numeric"
                  />
                  <button
                    onClick={doUpdateCompare}
                    className="mt-2 w-full rounded-xl bg-zinc-900 text-white py-2 text-sm hover:bg-zinc-800"
                  >
                    Save Compare Price
                  </button>
                </div>

                {/* Categories */}
                <div className="rounded-2xl border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500 mb-1">Categories (comma separated)</div>
                  <input
                    value={draftCategories}
                    onChange={(e) => setDraftCategories(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="e.g. dresses, party-wear"
                  />
                  <button
                    onClick={doUpdateCategories}
                    className="mt-2 w-full rounded-xl bg-zinc-900 text-white py-2 text-sm hover:bg-zinc-800"
                  >
                    Save Categories
                  </button>
                </div>

                {/* Colors */}
                <div className="rounded-2xl border border-zinc-200 p-3 md:col-span-2">
                  <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2">
                    <Palette size={14} /> Colors (comma separated)
                  </div>
                  <input
                    value={draftColors}
                    onChange={(e) => setDraftColors(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="e.g. black, beige, red"
                  />
                  <button
                    onClick={doUpdateColors}
                    className="mt-2 w-full rounded-xl bg-zinc-900 text-white py-2 text-sm hover:bg-zinc-800"
                  >
                    Save Colors
                  </button>
                </div>
              </div>
            </div>

            {/* Stock manager */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold mb-3">Stock</div>

              {!isVariable ? (
                <div className="rounded-2xl border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500 mb-1">Product Stock</div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      value={draftStock}
                      onChange={(e) => setDraftStock(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="e.g. 12"
                      inputMode="numeric"
                    />
                    <button
                      onClick={doUpdateStock}
                      className="rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm hover:bg-zinc-800"
                    >
                      Save Stock
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    isInStock is computed automatically by backend hooks.
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500 mb-3">
                    Variant Stock (size-based) — uses{" "}
                    <span className="font-mono">
                      updateVariantStock(productId, size, stock)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.keys(variantStocks || {})
                      .sort()
                      .map((sizeKey) => (
                        <div key={sizeKey} className="rounded-2xl border border-zinc-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold">Size: {sizeKey}</div>
                            <button
                              onClick={() => doUpdateVariantStock(sizeKey)}
                              className="rounded-xl bg-zinc-900 text-white px-3 py-1.5 text-xs hover:bg-zinc-800"
                            >
                              Save
                            </button>
                          </div>
                          <input
                            value={variantStocks[sizeKey]}
                            onChange={(e) =>
                              setVariantStocks((prev) => ({
                                ...(prev || {}),
                                [sizeKey]: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                            inputMode="numeric"
                            placeholder="0"
                          />
                        </div>
                      ))}
                  </div>

                  {!Object.keys(variantStocks || {}).length ? (
                    <div className="text-sm text-zinc-500">No size variants detected.</div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Flags */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold mb-3">Flags</div>

              <div className="flex flex-col md:flex-row gap-2">
                <button
                  onClick={doToggleBestSeller}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50"
                >
                  <Sparkles size={16} />
                  {active.isBestSeller ? "Remove Best Seller" : "Mark Best Seller"}
                </button>

                <button
                  onClick={doMarkPatternReady}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50"
                >
                  <Wand2 size={16} />
                  Mark Pattern Ready
                </button>

                <button
                  onClick={() => doTogglePublish(!active.isActive)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50"
                >
                  <BadgeCheck size={16} />
                  {active.isActive ? "Unpublish" : "Publish"}
                </button>
              </div>

              <div className="mt-3 text-xs text-zinc-500">
                Note: <span className="font-mono">isPatternReady</span> also auto-derived from variants’{" "}
                <span className="font-mono">patternNumber</span>.
              </div>
            </div>
          </div>
        )}

        {/* Footer-ish status */}
        <div className="w-full pb-6 text-xs text-zinc-500">
          Store status: {store.loading ? "loading…" : "idle"} • {store.saving ? "saving…" : "ready"}
        </div>
      </div>
    </div>
  );
}