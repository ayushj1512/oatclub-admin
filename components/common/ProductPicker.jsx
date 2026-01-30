// src/components/common/ProductPicker.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";
import toast from "react-hot-toast";

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

/**
 * ✅ IMPORTANT FIX:
 * Your productCode in API response is "00336" (5 digits), not 6.
 * So we normalize to 5 digits.
 *
 * Also if someone types 000336, we take last 5 digits => 00336.
 */
const PAD_TO = 5;

const normalizeProductCode = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const digits = s.replace(/[^\d]/g, ""); // keep digits only
  if (!digits) return "";

  // if more than PAD_TO digits (e.g. 000336), keep last PAD_TO
  const tail = digits.length > PAD_TO ? digits.slice(-PAD_TO) : digits;

  if (tail.length >= PAD_TO) return tail;
  return tail.padStart(PAD_TO, "0");
};

const isNumericLike = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  return /^\d+$/.test(s);
};

// tries common image keys used in product schema
const getProductImage = (p) => {
  if (!p) return "";
  if (typeof p.thumbnail === "string" && p.thumbnail) return p.thumbnail;
  if (typeof p.image === "string" && p.image) return p.image;
  if (typeof p.mainImage === "string" && p.mainImage) return p.mainImage;
  if (typeof p.featuredImage === "string" && p.featuredImage) return p.featuredImage;

  if (Array.isArray(p.images) && p.images.length) {
    const first = p.images[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }

  if (Array.isArray(p.variants) && p.variants.length) {
    const v0 = p.variants[0];
    if (typeof v0?.image === "string" && v0.image) return v0.image;
    if (typeof v0?.thumbnail === "string" && v0.thumbnail) return v0.thumbnail;
  }

  return "";
};

// product code helper (prefer productCode / sku / styleCode / patternNumber / code)
const getProductCodeRaw = (p) => {
  if (!p) return "";
  const candidates = [p.productCode, p.sku, p.styleCode, p.patternNumber, p.code]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
  return candidates[0] || "";
};

const getProductCodeNormalized = (p) => {
  const raw = getProductCodeRaw(p);
  const normalized = normalizeProductCode(raw);
  return normalized || raw;
};

// merge & de-dupe by _id
const mergeUniqueById = (prev, next) => {
  const out = Array.isArray(prev) ? [...prev] : [];
  const seen = new Set(out.map((p) => String(p?._id || "")));
  (Array.isArray(next) ? next : []).forEach((p) => {
    const id = String(p?._id || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(p);
  });
  return out;
};

export default function ProductPicker({
  value, // string[] (ids) or string (id)
  onChange, // (next) => void
  multiple = true,
  required = false,

  categoryOptions = [], // [{label,value}]
  defaultCategory = "",
  lockedCategory = "",

  initialLimit = 20,
  title = "Select Products",
}) {
  const { loading, fetchProducts, fetchProductsByCategory } = useAdminProductStore();

  const selectedIds = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return value ? [value] : [];
  }, [value, multiple]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [category, setCategory] = useState(lockedCategory || defaultCategory || "");
  const activeCategory = lockedCategory || category;

  const [limit, setLimit] = useState(initialLimit);

  // local list for infinite mode
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef(null);

  // ✅ ignore stale results (typing fast / category switches)
  const requestSeqRef = useRef(0);

  // numeric search => code search
  const normalizedSearchCode = useMemo(() => {
    if (!isNumericLike(debouncedSearch)) return "";
    return normalizeProductCode(debouncedSearch);
  }, [debouncedSearch]);

  const queryParams = useMemo(() => {
    const params = { limit };
    const s = String(debouncedSearch || "").trim();
    if (!s) return params;

    // ✅ numeric => ONLY code params (avoid backend mixing title search)
    if (normalizedSearchCode) {
      params.productCode = normalizedSearchCode;
      params.code = normalizedSearchCode;
      params.sku = normalizedSearchCode;
      return params;
    }

    // ✅ text => send multiple common keys (backend might support any)
    params.q = s;
    params.search = s;
    params.title = s;
    return params;
  }, [debouncedSearch, normalizedSearchCode, limit]);

  const resetPaginationState = () => {
    setItems([]);
    setPage(1);
    setPages(1);
    setTotal(0);
  };

  const getListFromStoreFallback = () => {
    const store = useAdminProductStore.getState?.();
    const fromStore = Array.isArray(store?.products) ? store.products : [];
    return { store, fromStore };
  };

  const resetAndLoadFirst = async () => {
    const seq = ++requestSeqRef.current;

    resetPaginationState();
    setLoadingMore(true);

    try {
      const params = { ...queryParams, page: 1 };

      let list = null;

      // IMPORTANT: support both cases (function returns array OR only updates store)
      if (activeCategory) {
        list = await fetchProductsByCategory(activeCategory, params);
      } else {
        const res = await fetchProducts(params);
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.products)) list = res.products;
      }

      if (seq !== requestSeqRef.current) return;

      const { store, fromStore } = getListFromStoreFallback();
      const initial = Array.isArray(list) ? list : fromStore;

      setItems(initial);

      // prefer store meta if available
      const nextTotal = typeof store?.total === "number" ? store.total : initial.length;
      const nextPages =
        typeof store?.pages === "number"
          ? store.pages
          : initial.length < limit
          ? 1
          : 2;

      setPage(1);
      setPages(nextPages);
      setTotal(nextTotal);
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      toast.error(e?.message || "Failed to load products");
    } finally {
      if (seq === requestSeqRef.current) setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || loading) return;
    if (page >= pages) return;

    const nextPage = page + 1;
    const seq = ++requestSeqRef.current;

    setLoadingMore(true);

    try {
      const params = { ...queryParams, page: nextPage };

      let list = null;
      if (activeCategory) {
        list = await fetchProductsByCategory(activeCategory, params);
      } else {
        const res = await fetchProducts(params);
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.products)) list = res.products;
      }

      if (seq !== requestSeqRef.current) return;

      const { store, fromStore } = getListFromStoreFallback();
      const next = Array.isArray(list) ? list : fromStore;

      setItems((prev) => mergeUniqueById(prev, next));
      setPage(nextPage);

      // prefer store paging; else infer end by batch size
      if (typeof store?.pages === "number") setPages(store.pages);
      if (typeof store?.total === "number") setTotal(store.total);

      if (typeof store?.pages !== "number" && (next?.length || 0) < limit) {
        setPages(nextPage); // end
      }
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      toast.error(e?.message || "Failed to load more products");
      setPages(page); // stop further loads
    } finally {
      if (seq === requestSeqRef.current) setLoadingMore(false);
    }
  };

  useEffect(() => {
    resetAndLoadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeCategory, limit]);

  // intersection observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "220px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages, loadingMore, loading, debouncedSearch, activeCategory, limit]);

  /**
   * ✅ Better client-side fallback:
   * If backend code search doesn’t work, we still try matching in:
   * - productCode (normalized)
   * - SKU contains "-00336-" (variants sku like DRE-00336-XS)
   */
  const visibleItems = useMemo(() => {
    if (!normalizedSearchCode) return items;

    const needle = normalizedSearchCode; // e.g. "00336"

    return (items || []).filter((p) => {
      const codeNorm = getProductCodeNormalized(p); // "00336"
      if (normalizeProductCode(codeNorm) === needle) return true;

      // SKU contains fallback (variant sku has code)
      const skuTop = String(p?.sku || "").toUpperCase();
      if (skuTop.includes(needle)) return true;

      const v0Sku = String(p?.variants?.[0]?.sku || "").toUpperCase();
      if (v0Sku.includes(needle)) return true;

      return false;
    });
  }, [items, normalizedSearchCode]);

  const toggleId = (id) => {
    if (!id) return;

    if (!multiple) {
      onChange?.(id);
      return;
    }

    const exists = selectedIds.includes(id);
    const next = exists ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange?.(next);
  };

  const clearSelection = () => onChange?.(multiple ? [] : null);

  const selectAllLoaded = () => {
    if (!multiple) return;
    const loadedIds = (visibleItems || []).map((p) => p?._id).filter(Boolean);
    onChange?.(Array.from(new Set([...selectedIds, ...loadedIds])));
  };

  const unselectAllLoaded = () => {
    if (!multiple) return;
    const loadedSet = new Set((visibleItems || []).map((p) => p?._id).filter(Boolean));
    onChange?.(selectedIds.filter((id) => !loadedSet.has(id)));
  };

  const isValid = () => {
    if (!required) return true;
    if (multiple) return selectedIds.length > 0;
    return Boolean(value);
  };

  const onDone = () => {
    if (!isValid()) return toast.error("Please select at least 1 product");
    toast.success("Products selected ✅");
  };

  return (
    <div className="w-full rounded-2xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5">
      <div className="px-4 pt-4 md:px-5 md:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-black">{title}</h3>
            <p className="mt-1 text-xs text-black/55">
              Selected{" "}
              <span className="font-medium text-black/80">{selectedIds.length}</span>
              {typeof total === "number" ? (
                <>
                  {" "}
                  • Loaded{" "}
                  <span className="font-medium text-black/80">{items.length}</span> /{" "}
                  <span className="font-medium text-black/80">{total}</span>
                </>
              ) : null}
            </p>
            {normalizedSearchCode ? (
              <p className="mt-1 text-[11px] text-black/40">
                Code search:{" "}
                <span className="font-medium text-black/70">{normalizedSearchCode}</span>
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl px-3 py-2 text-xs font-medium text-black/70 ring-1 ring-black/10 hover:bg-black/[0.03]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or code (e.g. 336 / 00336)…"
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-black/35 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
          />

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 20)}
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-black ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / batch
              </option>
            ))}
          </select>

          <select
            disabled={!!lockedCategory}
            value={activeCategory}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-black ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-60"
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {multiple ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllLoaded}
              className="rounded-xl px-3 py-2 text-xs font-medium text-black/70 ring-1 ring-black/10 hover:bg-black/[0.03]"
            >
              Select all (loaded)
            </button>
            <button
              type="button"
              onClick={unselectAllLoaded}
              className="rounded-xl px-3 py-2 text-xs font-medium text-black/70 ring-1 ring-black/10 hover:bg-black/[0.03]"
            >
              Unselect all (loaded)
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="max-h-[520px] overflow-auto px-2 pb-3 md:px-3">
          {loadingMore && items.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-black/60 ring-1 ring-black/5">
              Loading…
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-black/60 ring-1 ring-black/5">
              No products found.
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {visibleItems.map((p) => {
                  const id = p?._id;
                  const checked = id ? selectedIds.includes(id) : false;
                  const img = getProductImage(p);
                  const code = getProductCodeNormalized(p);
                  const subtitle = code ? `Code: ${code}` : "No code";

                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5 hover:bg-black/[0.015]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={p?.title || "Product"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-black/35">
                              NO IMG
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-black">
                            {p?.title || "Untitled"}
                          </p>

                          <p className="truncate text-[11px] text-black/45">{subtitle}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleId(id)}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${
                          checked
                            ? "bg-black text-white ring-black"
                            : "text-black/70 ring-black/10 hover:bg-black/[0.03]"
                        }`}
                      >
                        {checked ? "Selected" : "Select"}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div ref={sentinelRef} className="h-10" />

              {loadingMore ? (
                <div className="mt-2 rounded-2xl bg-gray-50 p-3 text-xs text-black/55 ring-1 ring-black/5">
                  Loading more…
                </div>
              ) : page >= pages ? (
                <div className="mt-2 rounded-2xl bg-gray-50 p-3 text-xs text-black/55 ring-1 ring-black/5">
                  You’ve reached the end.
                </div>
              ) : null}
            </>
          )}

          {!isValid() ? (
            <p className="mt-3 px-2 text-xs text-red-600">Selection is required.</p>
          ) : null}
        </div>

        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <p className="text-[11px] text-black/40">
            Infinite scroll enabled — keep scrolling to load more.
          </p>
        </div>
      </div>
    </div>
  );
}
