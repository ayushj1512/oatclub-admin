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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminProductStore } from "@/store/adminProductStore";
import ExportFilteredProductsButton from "@/components/product/ExportFilteredProductsButton";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const PAGE_SIZE = 100;

const str = (v) => String(v ?? "");

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function getProductStatus(product) {
  if (!product?.isActive) return "unpublished";
  if (product?.isDraft) return "draft";
  return "published";
}

function getVisiblePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const PriceInlineEditor = memo(function PriceInlineEditor({ id, value }) {
  const { updatePriceInline, saving } = useAdminProductStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => setDraft(value ?? ""), [value]);

  const save = async () => {
    const next = Number(draft);
    if (!next || next <= 0) return alert("Enter valid price");
    await updatePriceInline(id, next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">₹{value ?? "-"}</span>
        <button onClick={() => setEditing(true)} className="icon blue" title="Edit Price">
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-24 rounded-md border px-2 py-1 text-sm"
      />
      <button onClick={save} disabled={saving} className="icon blue" title="Save">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      <button
        onClick={() => {
          setDraft(value ?? "");
          setEditing(false);
        }}
        className="icon red"
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

  useEffect(() => setDraft(value ?? ""), [value]);

  const save = async () => {
    const next = str(draft).trim();
    if (!next) return alert("Enter valid title");
    await updateTitleInline(id, next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{value ?? "-"}</span>
        <button onClick={() => setEditing(true)} className="icon blue" title="Edit Title">
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        className="w-64 rounded-md border px-2 py-1 text-sm"
      />
      <button onClick={save} disabled={saving} className="icon blue" title="Save">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      <button onClick={cancel} className="icon red" title="Cancel">
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

  useEffect(() => setDraft(value ?? ""), [value]);

  const save = async () => {
    const next = draft === "" ? null : Number(draft);
    if (next !== null && (Number.isNaN(next) || next < 0)) {
      return alert("Enter valid compare price");
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
          onClick={() => setEditing(true)}
          className="icon blue"
          title="Edit Compare Price"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-24 rounded-md border px-2 py-1 text-sm"
      />
      <button onClick={save} disabled={saving} className="icon blue" title="Save">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      <button
        onClick={() => {
          setDraft(value ?? "");
          setEditing(false);
        }}
        className="icon red"
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
    if (!editing) setDraft(Array.isArray(value) ? value : []);
  }, [value, editing]);

  const toggleCategory = (cat) => {
    setDraft((prev) =>
      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]
    );
  };

  const save = async () => {
    await updateCategoriesInline(id, draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {draft.length ? (
          <span className="max-w-60 truncate text-sm text-gray-700">
            {draft.join(", ")}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
        <button onClick={() => setEditing(true)} className="icon blue" title="Edit Categories">
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-80 flex-col gap-2">
      <div className="flex flex-wrap gap-2 rounded-xl border bg-gray-50 p-2">
        {allCategories.map((c) => {
          const key = c.slug || c.name;
          const checked = draft.includes(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCategory(key)}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                checked
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="icon blue" title="Save">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button
          onClick={() => {
            setDraft(Array.isArray(value) ? value : []);
            setEditing(false);
          }}
          className="icon red"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
});

export default function ProductsPage() {
  const router = useRouter();
  const firstLoadRef = useRef(false);

  const {
    products,
    loading,
    saving,
    page,
    pages,
    total,
    fetchProducts,
    deleteProduct,
    bulkDelete,
    togglePublish,
    bulkPublish,
    bulkStatus,
  } = useAdminProductStore();

  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [searchDraft, setSearchDraft] = useState("");
  const debouncedSearch = useDebouncedValue(searchDraft, 400);

  const [category, setCategory] = useState("");
  const [published, setPublished] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [skuFilter, setSkuFilter] = useState("");

  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    category: "",
    published: "",
    stock: "",
    type: "",
    minPrice: "",
    maxPrice: "",
    tags: "",
    sku: "",
    sortKey: "createdAt",
    sortDir: "desc",
  });

  const visiblePages = useMemo(
    () => getVisiblePages(page || 1, pages || 1),
    [page, pages]
  );

  const productsWithMissingVariantIds = useMemo(() => {
    return (products || []).filter((p) => {
      if (p.productType !== "variable") return false;
      const variants = Array.isArray(p.variants) ? p.variants : [];
      return variants.length > 0 && variants.some((v) => !v?._id);
    });
  }, [products]);

  const allVisibleIds = useMemo(() => (products || []).map((p) => p._id), [products]);
  const selectedCount = selectedIds.size;

  const allSelected = useMemo(() => {
    return allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  }, [allVisibleIds, selectedIds]);

  const someSelected = useMemo(() => {
    return allVisibleIds.some((id) => selectedIds.has(id)) && !allSelected;
  }, [allVisibleIds, selectedIds, allSelected]);

  const clearSelection = () => setSelectedIds(new Set());

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API}/api/categories`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  };

  const buildQuery = (nextPage = 1) => {
    const f = appliedFilters;

    const query = {
      page: nextPage,
      limit: PAGE_SIZE,
      search: f.search,
      category: f.category,
      sku: f.sku,
      tags: f.tags,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      productType: f.type,
      sortKey: f.sortKey,
      sortDir: f.sortDir,
    };

    if (f.published === "published") {
      query.isActive = true;
      query.isDraft = false;
    } else if (f.published === "draft") {
      query.isActive = true;
      query.isDraft = true;
    } else if (f.published === "unpublished") {
      query.isActive = false;
    }

    if (f.stock === "in") query.isInStock = true;
    if (f.stock === "out") query.isInStock = false;

    return query;
  };

  const loadProducts = async (nextPage = 1) => {
    clearSelection();
    await fetchProducts(buildQuery(nextPage));
  };

  const applyFilters = async () => {
    const next = {
      search: debouncedSearch,
      category,
      published,
      stock: stockFilter,
      type: typeFilter,
      minPrice,
      maxPrice,
      tags: tagFilter,
      sku: skuFilter,
      sortKey,
      sortDir,
    };

    clearSelection();
    setAppliedFilters(next);
    await fetchProducts({
      page: 1,
      limit: PAGE_SIZE,
      search: next.search,
      category: next.category,
      sku: next.sku,
      tags: next.tags,
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
      productType: next.type,
      sortKey: next.sortKey,
      sortDir: next.sortDir,
      ...(next.published === "published"
        ? { isActive: true, isDraft: false }
        : next.published === "draft"
          ? { isActive: true, isDraft: true }
          : next.published === "unpublished"
            ? { isActive: false }
            : {}),
      ...(next.stock === "in"
        ? { isInStock: true }
        : next.stock === "out"
          ? { isInStock: false }
          : {}),
    });
  };

  const resetFilters = async () => {
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
    clearSelection();

    const next = {
      search: "",
      category: "",
      published: "",
      stock: "",
      type: "",
      minPrice: "",
      maxPrice: "",
      tags: "",
      sku: "",
      sortKey: "createdAt",
      sortDir: "desc",
    };

    setAppliedFilters(next);
    await fetchProducts({
      page: 1,
      limit: PAGE_SIZE,
      sortKey: "createdAt",
      sortDir: "desc",
    });
  };

  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;
    loadCategories();
    fetchProducts({
      page: 1,
      limit: PAGE_SIZE,
      sortKey: "createdAt",
      sortDir: "desc",
    });
  }, [fetchProducts]);

  const toggleSort = async (key) => {
    const nextDir =
      sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : key === "createdAt" ? "desc" : "asc";

    setSortKey(key);
    setSortDir(nextDir);

    const next = {
      ...appliedFilters,
      sortKey: key,
      sortDir: nextDir,
    };

    setAppliedFilters(next);
    clearSelection();

    await fetchProducts({
      page: 1,
      limit: PAGE_SIZE,
      search: next.search,
      category: next.category,
      sku: next.sku,
      tags: next.tags,
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
      productType: next.type,
      sortKey: next.sortKey,
      sortDir: next.sortDir,
      ...(next.published === "published"
        ? { isActive: true, isDraft: false }
        : next.published === "draft"
          ? { isActive: true, isDraft: true }
          : next.published === "unpublished"
            ? { isActive: false }
            : {}),
      ...(next.stock === "in"
        ? { isInStock: true }
        : next.stock === "out"
          ? { isInStock: false }
          : {}),
    });
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) allVisibleIds.forEach((id) => next.delete(id));
      else allVisibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const updateProductStatus = async (id, nextStatus) => {
    if (nextStatus === "published") return togglePublish(id, true);
    if (nextStatus === "draft") return bulkStatus?.([id], "draft");
    return togglePublish(id, false);
  };

  const handleBulkStatusChange = async (nextStatus) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`Change status of ${ids.length} products to "${nextStatus}"?`)) return;

    if (nextStatus === "published") await bulkPublish(ids, true);
    else if (nextStatus === "unpublished") await bulkPublish(ids, false);
    else if (nextStatus === "draft") await bulkStatus?.(ids, "draft");

    clearSelection();
  };

  const handleBulkPublish = async (value) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`${value ? "Publish" : "Unpublish"} ${ids.length} products?`)) return;
    await bulkPublish(ids, value);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} products? This cannot be undone.`)) return;
    await bulkDelete(ids);
    clearSelection();
  };

  return (
    <section className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600">
            Manage products •{" "}
            <span className="font-semibold text-gray-900">{loading ? "…" : `${products.length} shown`}</span>
            {" • "}
            <span className="font-semibold text-gray-900">{total || 0} total</span>
          </p>
        </div>

      <div className="flex flex-wrap items-center gap-2">
  <button onClick={() => loadProducts(page || 1)} className="btn btn-dark">
    {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
  </button>

  <button onClick={resetFilters} className="btn btn-dark">
    Clear Filters
  </button>

  <ExportFilteredProductsButton
    buildQuery={buildQuery}
    fileName="products-filtered-export"
  />

  <button onClick={() => router.push("/products/add")} className="btn btn-primary">
    + Add Product
  </button>
</div>
      </div>

      {!loading && (
        productsWithMissingVariantIds.length > 0 ? (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            <p className="font-bold">
              ⚠️ {productsWithMissingVariantIds.length} products have variants without Variant IDs
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">
            <p className="font-bold">All variant IDs are available.</p>
          </div>
        )
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search title / SKU / Product Code…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
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

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Status">
          <select value={published} onChange={(e) => setPublished(e.target.value)} className="select">
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </Field>

        <Field label="Stock">
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="select">
            <option value="">All</option>
            <option value="in">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </Field>

        <Field label="Type">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="select">
            <option value="">All</option>
            <option value="simple">Simple</option>
            <option value="variable">Variable</option>
          </select>
        </Field>

        <Field label="SKU">
          <input
            className="select"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </Field>

        <Field label="Tag">
          <input
            className="select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </Field>

        <Field label="Min Price">
          <input
            type="number"
            className="select w-28"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </Field>

        <Field label="Max Price">
          <input
            type="number"
            className="select w-28"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </Field>

        <button onClick={applyFilters} className="btn btn-primary">
          Apply Filters
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs uppercase tracking-wide text-gray-500">
              <th className="w-12 border-b border-gray-200 px-4 py-3">
                <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
              </th>
              <th className="border-b border-gray-200 px-4 py-3">
                <Th label="Title" onClick={() => toggleSort("title")} />
              </th>
              <th className="border-b border-gray-200 px-4 py-3">
                <Th label="Price" onClick={() => toggleSort("price")} />
              </th>
              <th className="border-b border-gray-200 px-4 py-3">
                <Th label="Compare" onClick={() => toggleSort("compareAtPrice")} />
              </th>
              <th className="border-b border-gray-200 px-4 py-3">Categories</th>
              <th className="border-b border-gray-200 px-4 py-3 text-blue-700">Status</th>
              <th className="border-b border-gray-200 px-4 py-3">
                <Th label="Created" onClick={() => toggleSort("createdAt")} />
              </th>
              <th className="w-28 border-b border-gray-200 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">
                  Loading products…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p._id} className="border-b border-gray-100 transition hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Checkbox checked={selectedIds.has(p._id)} onChange={() => toggleOne(p._id)} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images?.[0] || "/no-image.png"}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 rounded-md border border-gray-200 object-cover"
                      />
                      <div className="flex flex-col leading-tight">
                        <TitleInlineEditor id={p._id} value={p.title} />
                        <span className="text-xs text-gray-400">
                          {p.productType || "-"} • {p.sku || "-"} •{" "}
                          <span className="font-semibold text-gray-600">{p.productCode || "-"}</span>
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
                    <CategoryInlineEditor id={p._id} value={p.categories} allCategories={categories} />
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
                        className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(p._id)}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
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

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600">
          Page <span className="font-semibold text-gray-900">{page || 1}</span> of{" "}
          <span className="font-semibold text-gray-900">{pages || 1}</span>
          {" • "}
          <span className="font-semibold text-gray-900">{PAGE_SIZE}</span> per page
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadProducts((page || 1) - 1)}
            disabled={loading || (page || 1) <= 1}
            className="btn btn-muted"
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {visiblePages.map((item, index) =>
              item === "..." ? (
                <span
                  key={`${item}-${index}`}
                  className="flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => loadProducts(item)}
                  disabled={loading || item === page}
                  className={`page-btn ${item === page ? "page-btn-active" : ""}`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => loadProducts((page || 1) + 1)}
            disabled={loading || (page || 1) >= (pages || 1)}
            className="btn btn-dark"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 700;
        }
        .btn-dark {
          background: #111827;
          color: #fff;
        }
        .btn-primary {
          background: #2563eb;
          color: #fff;
        }
        .btn-danger {
          background: #dc2626;
          color: #fff;
        }
        .btn-muted {
          background: #e5e7eb;
          color: #111827;
        }
        .page-btn {
          min-width: 40px;
          height: 40px;
          border-radius: 12px;
          background: white;
          color: #111827;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
          padding: 0 12px;
        }
        .page-btn-active {
          background: #2563eb;
          color: white;
        }
        .search {
          display: flex;
          min-width: 260px;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          background: #fff;
          padding: 10px 12px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }
        .search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
        }
        .select {
          border: none;
          outline: none;
          border-radius: 12px;
          background: #fff;
          padding: 10px 12px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }
        .icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #fff;
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

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Th({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex select-none items-center gap-1 ${onClick ? "cursor-pointer" : ""}`}
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
      className="h-4 w-4 cursor-pointer accent-blue-600"
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
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-700">{selectedCount} selected</span>

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
      className={`rounded-full border bg-white px-2 py-1 text-xs font-semibold ${styles[value]}`}
    >
      <option value="published">Published</option>
      <option value="draft">Draft</option>
      <option value="unpublished">Unpublished</option>
    </select>
  );
}