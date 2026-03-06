"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminProductStore } from "@/store/adminProductStore";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

/* ==============================
   small helpers
============================== */
const s = (v) => String(v ?? "");
const lower = (v) => s(v).trim().toLowerCase();
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function matchesCategory(productCategories = [], selectedCategory = "") {
  if (!selectedCategory) return true;

  const selected = lower(selectedCategory);
  const cats = Array.isArray(productCategories) ? productCategories : [];

  return cats.some((c) => lower(c) === selected);
}

function getProductStatus(p) {
  if (!p?.isActive) return "unpublished";
  if (p?.isDraft) return "draft";
  return "published";
}

function sortProducts(list, sortKey, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let av;
    let bv;

    switch (sortKey) {
      case "title":
        av = lower(a?.title);
        bv = lower(b?.title);
        break;

      case "price":
        av = num(a?.price);
        bv = num(b?.price);
        break;

      case "compareAtPrice":
        av = num(a?.compareAtPrice);
        bv = num(b?.compareAtPrice);
        break;

      case "createdAt":
      default:
        av = new Date(a?.createdAt || 0).getTime();
        bv = new Date(b?.createdAt || 0).getTime();
        break;
    }

    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/* ==============================
   INLINE EDITORS
============================== */

const PriceInlineEditor = memo(function PriceInlineEditor({ id, value }) {
  const { updatePriceInline, saving } = useAdminProductStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const save = async () => {
    const next = Number(draft);
    if (!next || next <= 0) {
      alert("Enter valid price");
      return;
    }
    await updatePriceInline(id, next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">₹{value ?? "-"}</span>
        <button
          className="icon blue"
          title="Edit Price"
          onClick={() => setEditing(true)}
          style={{ width: 30, height: 30 }}
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="px-2 py-1 border rounded-md w-[90px] text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        type="number"
      />

      <button
        onClick={save}
        disabled={saving}
        className="icon blue"
        style={{ width: 30, height: 30 }}
        title="Save"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>

      <button
        onClick={() => {
          setDraft(value ?? "");
          setEditing(false);
        }}
        className="icon red"
        style={{ width: 30, height: 30 }}
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );
});

const TitleInlineEditor = memo(function TitleInlineEditor({ id, value }) {
  const { updateTitleInline, saving } = useAdminProductStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const save = async () => {
    const next = String(draft || "").trim();
    if (!next) {
      alert("Enter valid title");
      return;
    }
    await updateTitleInline(id, next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{value ?? "-"}</span>
        <button
          className="icon blue"
          title="Edit Title"
          onClick={() => setEditing(true)}
          style={{ width: 30, height: 30 }}
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="px-2 py-1 border rounded-md w-[260px] text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
      />

      <button
        onClick={save}
        disabled={saving}
        className="icon blue"
        style={{ width: 30, height: 30 }}
        title="Save"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>

      <button
        onClick={cancel}
        className="icon red"
        style={{ width: 30, height: 30 }}
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );
});

const ComparePriceInlineEditor = memo(function ComparePriceInlineEditor({
  id,
  value,
}) {
  const { updateComparePriceInline, saving } = useAdminProductStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const save = async () => {
    const next = draft === "" ? null : Number(draft);
    if (next !== null && (Number.isNaN(next) || next < 0)) {
      alert("Enter valid compare price");
      return;
    }
    await updateComparePriceInline(id, next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {value === null || value === undefined || value === "" ? "-" : `₹${value}`}
        </span>
        <button
          className="icon blue"
          title="Edit Compare Price"
          onClick={() => setEditing(true)}
          style={{ width: 30, height: 30 }}
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="px-2 py-1 border rounded-md w-[90px] text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        type="number"
        min="0"
      />

      <button
        onClick={save}
        disabled={saving}
        className="icon blue"
        style={{ width: 30, height: 30 }}
        title="Save"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>

      <button
        onClick={() => {
          setDraft(value ?? "");
          setEditing(false);
        }}
        className="icon red"
        style={{ width: 30, height: 30 }}
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );
});

const CategoryInlineEditor = memo(function CategoryInlineEditor({
  id,
  value = [],
  allCategories = [],
}) {
  const { updateCategoriesInline, saving } = useAdminProductStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(Array.isArray(value) ? value : []);

  useEffect(() => {
    if (!editing) {
      setDraft(Array.isArray(value) ? value : []);
    }
  }, [value, editing]);

  const toggleCategory = (cat) => {
    setDraft((prev) => {
      if (prev.includes(cat)) return prev.filter((x) => x !== cat);
      return [...prev, cat];
    });
  };

  const save = async () => {
    await updateCategoriesInline(id, draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {draft.length ? (
          <span className="text-sm text-gray-700 truncate max-w-[240px]">
            {draft.join(", ")}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}

        <button
          className="icon blue"
          title="Edit Categories"
          onClick={() => setEditing(true)}
          style={{ width: 30, height: 30 }}
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-xl bg-gray-50 max-w-[320px]">
        {allCategories.map((c) => {
          const key = c.slug || c.name;
          const label = c.name;
          const checked = draft.includes(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCategory(key)}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                checked
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="icon blue"
          style={{ width: 32, height: 32 }}
          title="Save"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>

        <button
          onClick={() => {
            setDraft(Array.isArray(value) ? value : []);
            setEditing(false);
          }}
          className="icon red"
          style={{ width: 32, height: 32 }}
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
});

/* ==============================
   PAGE
============================== */

export default function ProductsPage() {
  const router = useRouter();
  const firstLoadRef = useRef(false);

  const {
    products,
    loading,
    saving,
    fetchProducts,
    deleteProduct,
    bulkDelete,
    togglePublish,
    bulkPublish,
    bulkStatus, // ✅ make sure store me ho
  } = useAdminProductStore();

  const [categories, setCategories] = useState([]);

  const [searchDraft, setSearchDraft] = useState("");
  const search = useDebouncedValue(searchDraft, 400);

  const [category, setCategory] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [published, setPublished] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [skuFilter, setSkuFilter] = useState("");

  const selectedCount = selectedIds.size;

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API}/api/categories`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setCategories([]);
    }
  };

  const loadProducts = async () => {
    await fetchProducts({
      page: 1,
      limit: 9999,
    });
  };

  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;

    loadCategories();
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = lower(search);

    const list = (products || []).filter((p) => {
      const status = getProductStatus(p);

      if (q) {
        const hay = [
          p.title,
          p.slug,
          p.sku,
          p.productCode,
          ...(Array.isArray(p.variants) ? p.variants.map((v) => v?.sku) : []),
        ]
          .map(lower)
          .join(" ");

        if (!hay.includes(q)) return false;
      }

      // ✅ category filter FIX
      if (!matchesCategory(p.categories, category)) return false;

      if (published === "published" && status !== "published") return false;
      if (published === "draft" && status !== "draft") return false;
      if (published === "unpublished" && status !== "unpublished") return false;

      // ✅ stock filter better for variable products too
      const productStock = Number(p.stock || 0);
      const hasVariantStock = Array.isArray(p.variants)
        ? p.variants.some((v) => Number(v?.stock || 0) > 0)
        : false;
      const inStock = Boolean(p.isInStock) || productStock > 0 || hasVariantStock;

      if (stockFilter === "in" && !inStock) return false;
      if (stockFilter === "out" && inStock) return false;

      if (typeFilter && p.productType !== typeFilter) return false;

      if (skuFilter) {
        const skuHay = [p.sku, ...(Array.isArray(p.variants) ? p.variants.map((v) => v?.sku) : [])]
          .map(lower)
          .join(" ");
        if (!skuHay.includes(lower(skuFilter))) return false;
      }

      if (tagFilter) {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        if (!tags.some((t) => lower(t).includes(lower(tagFilter)))) return false;
      }

      const price = Number(p.price || 0);
      if (minPrice !== "" && price < Number(minPrice)) return false;
      if (maxPrice !== "" && price > Number(maxPrice)) return false;

      return true;
    });

    return sortProducts(list, sortKey, sortDir);
  }, [
    products,
    search,
    category,
    published,
    stockFilter,
    typeFilter,
    minPrice,
    maxPrice,
    tagFilter,
    skuFilter,
    sortKey,
    sortDir,
  ]);

  const productsWithMissingVariantIds = useMemo(() => {
    return (filteredProducts || []).filter((p) => {
      if (p.productType !== "variable") return false;
      const variants = Array.isArray(p.variants) ? p.variants : [];
      if (!variants.length) return false;
      return variants.some((v) => !v?._id);
    });
  }, [filteredProducts]);

  const allVisibleIds = useMemo(
    () => filteredProducts.map((p) => p._id),
    [filteredProducts]
  );

  const allSelected = useMemo(() => {
    return allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  }, [allVisibleIds, selectedIds]);

  const someSelected = useMemo(() => {
    return allVisibleIds.some((id) => selectedIds.has(id)) && !allSelected;
  }, [allVisibleIds, selectedIds, allSelected]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const updateProductStatus = async (id, nextStatus) => {
    if (nextStatus === "published") {
      await togglePublish(id, true);
    } else if (nextStatus === "draft") {
      if (bulkStatus) await bulkStatus([id], "draft");
    } else {
      await togglePublish(id, false);
    }
  };

  const handleBulkStatusChange = async (nextStatus) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!confirm(`Change status of ${ids.length} products to "${nextStatus}"?`)) return;

    if (nextStatus === "published") {
      await bulkPublish(ids, true);
    } else if (nextStatus === "unpublished") {
      await bulkPublish(ids, false);
    } else if (nextStatus === "draft" && bulkStatus) {
      await bulkStatus(ids, "draft");
    }

    clearSelection();
  };

  const handleBulkPublish = async (value) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!confirm(`${value ? "Publish" : "Unpublish"} ${ids.length} products?`)) return;

    await bulkPublish(ids, value);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!confirm(`Delete ${ids.length} products? This cannot be undone.`)) return;

    await bulkDelete(ids);
    clearSelection();
  };

  return (
    <section className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600">
            Manage, publish, bulk edit & update products •{" "}
            <span className="font-semibold text-gray-900">
              {loading ? "…" : filteredProducts.length} Products
            </span>
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={loadProducts} className="btn btn-dark">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          </button>

          <button
            onClick={() => {
              setSearchDraft("");
              setCategory("");
              setPublished("");
              setStockFilter("");
              setTypeFilter("");
              setMinPrice("");
              setMaxPrice("");
              setTagFilter("");
              setSkuFilter("");
              setSortKey("createdAt");
              setSortDir("desc");
            }}
            className="btn btn-dark"
          >
            Clear Filters
          </button>

          <button
            onClick={() => router.push("/products/add")}
            className="btn btn-primary"
          >
            + Add Product
          </button>
        </div>
      </div>

      {!loading &&
        (productsWithMissingVariantIds.length > 0 ? (
          <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700">
            <p className="font-bold">
              ⚠️ {productsWithMissingVariantIds.length} products have variants without Variant IDs:
            </p>

            <ul className="list-disc ml-6 text-sm mt-2 space-y-1">
              {productsWithMissingVariantIds.slice(0, 10).map((p) => (
                <li key={p._id}>
                  {p.title} ({p.sku || "No SKU"})
                </li>
              ))}
            </ul>

            {productsWithMissingVariantIds.length > 10 && (
              <p className="text-xs mt-2 opacity-70">
                + {productsWithMissingVariantIds.length - 10} more…
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 p-4 rounded-xl border border-green-300 bg-green-50 text-green-700">
            <p className="font-bold">All variant IDs are available.</p>
          </div>
        ))}

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search title / SKU / Product Code…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.slug || c.name} value={c.slug || c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <BulkBar
          selectedCount={selectedCount}
          saving={saving}
          onPublish={() => handleBulkPublish(true)}
          onUnpublish={() => handleBulkPublish(false)}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
          onChangeStatus={handleBulkStatusChange}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Status</label>
          <select
            value={published}
            onChange={(e) => setPublished(e.target.value)}
            className="select"
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Stock</label>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="select"
          >
            <option value="">All</option>
            <option value="in">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select"
          >
            <option value="">All</option>
            <option value="simple">Simple</option>
            <option value="variable">Variable</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">SKU</label>
          <input
            className="select"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Tag</label>
          <input
            className="select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Min Price</label>
          <input
            className="select"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{ width: 120 }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Max Price</label>
          <input
            className="select"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-500 uppercase tracking-wide">
              <th className="w-[48px] px-4 py-3 border-b border-gray-200">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                />
              </th>

              <th className="px-4 py-3 border-b border-gray-200">
                <Th onClick={() => toggleSort("title")} label="Title" />
              </th>

              <th className="px-4 py-3 border-b border-gray-200">
                <Th onClick={() => toggleSort("price")} label="Price" />
              </th>

              <th className="px-4 py-3 border-b border-gray-200">
                <Th onClick={() => toggleSort("compareAtPrice")} label="Compare" />
              </th>

              <th className="px-4 py-3 border-b border-gray-200">Categories</th>

              <th className="px-4 py-3 border-b border-gray-200 text-blue-700">
                Status
              </th>

              <th className="px-4 py-3 border-b border-gray-200">
                <Th onClick={() => toggleSort("createdAt")} label="Created" />
              </th>

              <th className="w-[120px] px-4 py-3 border-b border-gray-200 text-right text-gray-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">
                  Loading products…
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedIds.has(p._id)}
                      onChange={() => toggleOne(p._id)}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images?.[0] || "/no-image.png"}
                        className="w-10 h-10 rounded-md border border-gray-200 object-cover"
                        alt=""
                        loading="lazy"
                      />
                      <div className="flex flex-col leading-tight">
                        <TitleInlineEditor id={p._id} value={p.title} />
                        <span className="text-xs text-gray-400">
                          {p.productType || "-"} • {p.sku || "-"} •{" "}
                          <span className="font-semibold text-gray-600">
                            {p.productCode || "-"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <PriceInlineEditor id={p._id} value={p.price} />
                  </td>

                  <td className="px-4 py-3">
                    <ComparePriceInlineEditor id={p._id} value={p.compareAtPrice} />
                  </td>

                  <td className="px-4 py-3">
                    <CategoryInlineEditor
                      id={p._id}
                      value={p.categories}
                      allCategories={categories}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <StatusDropdown
                      value={getProductStatus(p)}
                      loading={saving}
                      onChange={(next) => updateProductStatus(p._id, next)}
                    />
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/products/${p._id}`)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteProduct(p._id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .btn {
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-dark {
          background: #111827;
          color: white;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
        }
        .btn-danger {
          background: #dc2626;
          color: white;
        }
        .btn-muted {
          background: #e5e7eb;
          color: #111827;
        }

        .search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          min-width: 260px;
        }
        .search input {
          outline: none;
          border: none;
          width: 100%;
          background: transparent;
        }

        .select {
          background: white;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border: none;
          outline: none;
        }

        .icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .icon.blue {
          background: #2563eb;
        }

        .icon.red {
          background: #dc2626;
        }
      `}</style>
    </section>
  );
}

/* ==============================
   small components
============================== */

function Th({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1 ${onClick ? "cursor-pointer select-none" : ""}`}
    >
      {label}
      {onClick && <ArrowUpDown size={14} />}
    </div>
  );
}

function Checkbox({ checked, indeterminate, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate;
      }}
      onChange={onChange}
      className="h-4 w-4 accent-blue-600 cursor-pointer"
    />
  );
}

function BulkBar({
  selectedCount,
  saving,
  onPublish,
  onUnpublish,
  onDelete,
  onClear,
  onChangeStatus,
}) {
  if (!selectedCount) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap ml-auto">
      <span className="text-sm font-semibold text-gray-700">
        {selectedCount} selected
      </span>

      <select
        disabled={saving}
        defaultValue=""
        onChange={(e) => {
          const val = e.target.value;
          if (!val) return;
          onChangeStatus(val);
          e.target.value = "";
        }}
        className="select text-sm font-semibold"
        title="Change status"
      >
        <option value="">Change Status…</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="unpublished">Unpublished</option>
      </select>

      <button disabled={saving} onClick={onPublish} className="btn btn-primary">
        Publish
      </button>

      <button disabled={saving} onClick={onUnpublish} className="btn btn-dark">
        Unpublish
      </button>

      <button disabled={saving} onClick={onDelete} className="btn btn-danger">
        Delete
      </button>

      <button disabled={saving} onClick={onClear} className="btn btn-muted">
        Clear
      </button>
    </div>
  );
}

function StatusDropdown({ value, onChange, loading }) {
  const styles = {
    published: "bg-green-50 text-green-700 border-green-200",
    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
    unpublished: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <select
      value={value}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs font-semibold px-2 py-1 rounded-full border ${styles[value]} bg-white`}
    >
      <option value="published">Published</option>
      <option value="draft">Draft</option>
      <option value="unpublished">Unpublished</option>
    </select>
  );
}