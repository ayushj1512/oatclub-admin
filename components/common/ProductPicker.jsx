// src/components/common/ProductPicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";
import toast from "react-hot-toast";

const PAD_TO = 5;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

const normalizeProductCode = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (!/^\d+$/.test(raw)) {
    return raw.toUpperCase().replace(/\s+/g, "");
  }

  const digits =
    raw.length > PAD_TO ? raw.slice(-PAD_TO) : raw;

  return digits.padStart(PAD_TO, "0");
};

const isNumericLike = (value) =>
  /^\d+$/.test(String(value ?? "").trim());

const getProductImage = (product) => {
  if (!product) return "";

  const directKeys = [
    product?.thumbnail,
    product?.image,
    product?.mainImage,
    product?.featuredImage,
  ];

  const directImage = directKeys.find(
    (image) => typeof image === "string" && image.trim()
  );

  if (directImage) return directImage;

  const firstImage = safeArray(product?.images)[0];

  if (typeof firstImage === "string") return firstImage;
  if (typeof firstImage?.url === "string") return firstImage.url;
  if (typeof firstImage?.src === "string") return firstImage.src;

  const firstVariant = safeArray(product?.variants)[0];

  if (typeof firstVariant?.image === "string") {
    return firstVariant.image;
  }

  if (typeof firstVariant?.image?.url === "string") {
    return firstVariant.image.url;
  }

  if (typeof firstVariant?.image?.src === "string") {
    return firstVariant.image.src;
  }

  if (typeof firstVariant?.thumbnail === "string") {
    return firstVariant.thumbnail;
  }

  return "";
};

const getProductCode = (product) => {
  const candidates = [
    product?.productCode,
    product?.sku,
    product?.styleCode,
    product?.patternNumber,
    product?.code,
    product?.productDetails?.productCode,
    product?.productDetails?.code,
  ];

  const code = candidates
    .map((value) => String(value ?? "").trim())
    .find(Boolean);

  return normalizeProductCode(code);
};

const mergeUniqueProducts = (previous = [], incoming = []) => {
  const map = new Map();

  [...safeArray(previous), ...safeArray(incoming)].forEach((product) => {
    const id = String(product?._id || "").trim();
    if (id) map.set(id, product);
  });

  return [...map.values()];
};

const extractProducts = (response, fallback = []) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.data?.products)) return response.data.products;

  return safeArray(fallback);
};

export default function ProductPicker({
  title = "Select Products",
  multiple = true,
  required = false,
  value,
  onChange,
  onSelectedProductsChange,
  categoryOptions = [],
  defaultCategory = "",
  lockedCategory = "",
  initialLimit = 20,
}) {
  const {
    loading,
    fetchProducts,
    fetchProductsByCategory,
  } = useAdminProductStore();

  const selectedIds = useMemo(() => {
    if (multiple) {
      return safeArray(value).map(String);
    }

    return value ? [String(value)] : [];
  }, [value, multiple]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(
    lockedCategory || defaultCategory || ""
  );
  const [limit, setLimit] = useState(initialLimit);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const sentinelRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const productCacheRef = useRef(new Map());

  const activeCategory = lockedCategory || category;

  const normalizedSearchCode = useMemo(() => {
    if (!isNumericLike(debouncedSearch)) return "";
    return normalizeProductCode(debouncedSearch);
  }, [debouncedSearch]);

  const queryParams = useMemo(() => {
    const params = { limit };
    const searchValue = String(debouncedSearch || "").trim();

    if (!searchValue) return params;

    if (normalizedSearchCode) {
      return {
        ...params,
        productCode: normalizedSearchCode,
        code: normalizedSearchCode,
        sku: normalizedSearchCode,
      };
    }

    return {
      ...params,
      q: searchValue,
      search: searchValue,
      title: searchValue,
    };
  }, [debouncedSearch, normalizedSearchCode, limit]);

  const cacheProducts = (products = []) => {
    safeArray(products).forEach((product) => {
      const id = String(product?._id || "").trim();

      if (id) {
        productCacheRef.current.set(id, product);
      }
    });
  };

  const emitSelectedProducts = (nextIds = selectedIds) => {
    if (typeof onSelectedProductsChange !== "function") return;

    const selectedProducts = safeArray(nextIds)
      .map((id) => productCacheRef.current.get(String(id)))
      .filter(Boolean);

    onSelectedProductsChange(selectedProducts);
  };

  const getStoreSnapshot = () => {
    const store = useAdminProductStore.getState?.() || {};

    return {
      products: safeArray(store?.products),
      total: Number(store?.total || 0),
      pages: Number(store?.pages || 0),
    };
  };

  const loadPage = async (nextPage, replace = false) => {
    const requestId = ++requestSequenceRef.current;

    setLoadingMore(true);

    try {
      const params = {
        ...queryParams,
        page: nextPage,
      };

      let response;

      if (activeCategory) {
        response = await fetchProductsByCategory(activeCategory, params);
      } else {
        response = await fetchProducts(params);
      }

      if (requestId !== requestSequenceRef.current) return;

      const store = getStoreSnapshot();
      const products = extractProducts(response, store.products);

      cacheProducts(products);

      setItems((previous) =>
        replace ? products : mergeUniqueProducts(previous, products)
      );

      setPage(nextPage);
      setTotal(
        Number(
          response?.total ??
            response?.data?.total ??
            store.total ??
            products.length
        )
      );

      const responsePages = Number(
        response?.pages ??
          response?.data?.pages ??
          store.pages ??
          0
      );

      if (responsePages) {
        setPages(responsePages);
      } else {
        setPages(
          products.length < limit
            ? nextPage
            : nextPage + 1
        );
      }
    } catch (error) {
      if (requestId !== requestSequenceRef.current) return;

      console.error("ProductPicker load error:", error);
      toast.error(error?.message || "Failed to load products");
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setItems([]);
    setPage(1);
    setPages(1);
    setTotal(0);

    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeCategory, limit]);

  useEffect(() => {
    cacheProducts(items);
    emitSelectedProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedIds]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !loadingMore &&
          !loading &&
          page < pages
        ) {
          loadPage(page + 1);
        }
      },
      {
        root: null,
        rootMargin: "220px",
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages, loadingMore, loading]);

  const visibleItems = useMemo(() => {
    if (!normalizedSearchCode) return items;

    return safeArray(items).filter((product) => {
      const productCode = getProductCode(product);

      if (productCode === normalizedSearchCode) {
        return true;
      }

      const productSku = String(product?.sku || "").toUpperCase();

      if (productSku.includes(normalizedSearchCode)) {
        return true;
      }

      return safeArray(product?.variants).some((variant) =>
        String(variant?.sku || "")
          .toUpperCase()
          .includes(normalizedSearchCode)
      );
    });
  }, [items, normalizedSearchCode]);

  const updateSelection = (nextValue) => {
    onChange?.(nextValue);

    const nextIds = multiple
      ? safeArray(nextValue).map(String)
      : nextValue
        ? [String(nextValue)]
        : [];

    emitSelectedProducts(nextIds);
  };

  const toggleProduct = (product) => {
    const id = String(product?._id || "").trim();
    if (!id) return;

    productCacheRef.current.set(id, product);

    if (!multiple) {
      updateSelection(id);
      return;
    }

    const exists = selectedIds.includes(id);

    updateSelection(
      exists
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  };

  const clearSelection = () => {
    updateSelection(multiple ? [] : null);
  };

  const selectAllLoaded = () => {
    if (!multiple) return;

    const loadedIds = visibleItems
      .map((product) => {
        const id = String(product?._id || "").trim();

        if (id) {
          productCacheRef.current.set(id, product);
        }

        return id;
      })
      .filter(Boolean);

    updateSelection([...new Set([...selectedIds, ...loadedIds])]);
  };

  const unselectAllLoaded = () => {
    if (!multiple) return;

    const loadedIds = new Set(
      visibleItems
        .map((product) => String(product?._id || "").trim())
        .filter(Boolean)
    );

    updateSelection(
      selectedIds.filter((id) => !loadedIds.has(id))
    );
  };

  const isValid = !required || selectedIds.length > 0;

  const handleDone = () => {
    if (!isValid) {
      toast.error("Please select at least 1 product");
      return;
    }

    emitSelectedProducts();
    toast.success("Products selected");
  };

  return (
    <div className="w-full rounded-2xl bg-white ring-1 ring-black/5">
      <div className="px-4 pt-4 md:px-5 md:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-black">
              {title}
            </h3>

            <p className="mt-1 text-xs text-black/55">
              Selected{" "}
              <span className="font-medium text-black/80">
                {selectedIds.length}
              </span>
              {" • "}
              Loaded{" "}
              <span className="font-medium text-black/80">
                {items.length}
              </span>
              {" / "}
              <span className="font-medium text-black/80">
                {total}
              </span>
            </p>

            {normalizedSearchCode ? (
              <p className="mt-1 text-[11px] text-black/40">
                Code search:{" "}
                <span className="font-medium text-black/70">
                  {normalizedSearchCode}
                </span>
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
              onClick={handleDone}
              className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or code"
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-black/35 ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-black/20"
          />

          <select
            value={limit}
            onChange={(event) =>
              setLimit(Number(event.target.value) || 20)
            }
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-black ring-1 ring-black/10 outline-none"
          >
            {[10, 20, 50, 100].map((number) => (
              <option key={number} value={number}>
                {number} / batch
              </option>
            ))}
          </select>

          <select
            value={activeCategory}
            disabled={Boolean(lockedCategory)}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm text-black ring-1 ring-black/10 outline-none disabled:opacity-60"
          >
            <option value="">All categories</option>

            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
              Select all loaded
            </button>

            <button
              type="button"
              onClick={unselectAllLoaded}
              className="rounded-xl px-3 py-2 text-xs font-medium text-black/70 ring-1 ring-black/10 hover:bg-black/[0.03]"
            >
              Unselect loaded
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 max-h-[520px] overflow-auto px-3 pb-4">
        {loadingMore && items.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-4 text-sm text-black/60">
            Loading products...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-4 text-sm text-black/60">
            No products found.
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleItems.map((product) => {
              const id = String(product?._id || "");
              const selected = selectedIds.includes(id);
              const image = getProductImage(product);
              const code = getProductCode(product);

              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={product?.title || "Product"}
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
                        {product?.title ||
                          product?.name ||
                          "Untitled Product"}
                      </p>

                      <p className="truncate text-[11px] text-black/45">
                        {code ? `Code: ${code}` : "No product code"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${
                      selected
                        ? "bg-black text-white ring-black"
                        : "text-black/70 ring-black/10 hover:bg-black/[0.03]"
                    }`}
                  >
                    {selected ? "Selected" : "Select"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div ref={sentinelRef} className="h-10" />

        {loadingMore && items.length > 0 ? (
          <div className="rounded-2xl bg-gray-50 p-3 text-xs text-black/55">
            Loading more...
          </div>
        ) : page >= pages && items.length > 0 ? (
          <div className="rounded-2xl bg-gray-50 p-3 text-xs text-black/55">
            You have reached the end.
          </div>
        ) : null}

        {!isValid ? (
          <p className="mt-3 text-xs text-red-600">
            Selection is required.
          </p>
        ) : null}
      </div>
    </div>
  );
}