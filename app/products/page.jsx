"use client";

import { useEffect, useMemo, useState } from "react";
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

const API = process.env.NEXT_PUBLIC_BACKEND_URL

/* ==============================
   debounce helper
============================== */
function debounce(fn, delay = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export default function ProductsPage() {
  const router = useRouter();

  /* ==============================
     STORE CONNECTION
  ============================== */
  const {
    products,
    loading,
    saving,
    fetchProducts,
    deleteProduct,
    bulkDelete,
    togglePublish,
    bulkPublish,
  } = useAdminProductStore();

  /* ==============================
     LOCAL UI STATE
  ============================== */
  const [categories, setCategories] = useState([]);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("");

  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [selectedIds, setSelectedIds] = useState(new Set());

const [published, setPublished] = useState(""); // "", "published", "draft"
const [stockFilter, setStockFilter] = useState(""); // "", "in", "out"
const [typeFilter, setTypeFilter] = useState(""); // "", "simple", "variable"
const [minPrice, setMinPrice] = useState("");
const [maxPrice, setMaxPrice] = useState("");
const [tagFilter, setTagFilter] = useState("");
const [skuFilter, setSkuFilter] = useState("");

  /* ==============================
     Derived states
  ============================== */
  const selectedCount = selectedIds.size;

const getProductStatus = (p) => {
  if (!p.isActive) return "unpublished";
  if (p.isDraft) return "draft";
  return "published";
};

const updateProductStatus = async (id, nextStatus) => {
  if (nextStatus === "published") {
    await togglePublish(id, true);
  } else {
    await togglePublish(id, false);
  }
};



const filteredProducts = useMemo(() => {
  return (products || []).filter((p) => {
    // ✅ status calculate once per product
    const status = getProductStatus(p);

    // ✅ Status filter
    if (published === "published" && status !== "published") return false;
    if (published === "draft" && status !== "draft") return false;
    if (published === "unpublished" && status !== "unpublished") return false;

    // ✅ Stock filter
    if (stockFilter === "in" && Number(p.stock || 0) <= 0) return false;
    if (stockFilter === "out" && Number(p.stock || 0) > 0) return false;

    // ✅ Type filter
    if (typeFilter && p.productType !== typeFilter) return false;

    // ✅ SKU filter
    if (
      skuFilter &&
      !String(p.sku || "").toLowerCase().includes(skuFilter.toLowerCase())
    )
      return false;

    // ✅ Tag filter (array)
    if (tagFilter) {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      if (
        !tags.some((t) =>
          String(t).toLowerCase().includes(tagFilter.toLowerCase())
        )
      )
        return false;
    }

    // ✅ Price range
    const price = Number(p.price || 0);
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;

    return true;
  });
}, [
  products,
  published,
  stockFilter,
  typeFilter,
  minPrice,
  maxPrice,
  tagFilter,
  skuFilter,
]);



const allSelected = useMemo(() => {
  return filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;
}, [filteredProducts, selectedIds]);


 const someSelected = useMemo(() => {
  return selectedIds.size > 0 && selectedIds.size < filteredProducts.length;
}, [filteredProducts, selectedIds]);


  /* ==============================
     Load categories
  ============================== */
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

  /* ==============================
     Fetch products (Admin grid)
     ✅ No pagination UI
     ✅ but backend may still paginate
     => here we set limit huge
  ============================== */
  const loadProducts = async () => {
    await fetchProducts({
      page: 1,
      limit: 9999,
      search,
      sort: `${sortKey}_${sortDir}`,
      ...(category ? { category } : {}),
    });

    setSelectedIds(new Set());
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, category, sortKey, sortDir]);

  /* ==============================
     Debounced Search
  ============================== */
  const debouncedSearch = useMemo(
    () =>
      debounce((v) => {
        setSearch(v);
      }, 400),
    []
  );


  useEffect(() => {
    debouncedSearch(searchDraft);
  }, [searchDraft]);

  /* ==============================
     Sorting
  ============================== */
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* ==============================
     Selection logic
  ============================== */
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

const toggleAll = () => {
  if (allSelected) setSelectedIds(new Set());
  else setSelectedIds(new Set(filteredProducts.map((p) => p._id)));
};


  const clearSelection = () => setSelectedIds(new Set());

  /* ==============================
     BULK ACTIONS
  ============================== */
  const handleBulkPublish = async (value) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!confirm(`${value ? "Publish" : "Unpublish"} ${ids.length} products?`))
      return;

    await bulkPublish(ids, value);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!confirm(`Delete ${ids.length} products? This cannot be undone.`))
      return;

    await bulkDelete(ids);
    clearSelection();
  };

  function PriceInlineEditor({ id, value }) {
  const { updatePriceInline, saving } = useAdminProductStore();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const save = async () => {
    const num = Number(draft);

    if (!num || num <= 0) {
      alert("Enter valid price");
      return;
    }

    await updatePriceInline(id, num);
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
}

function CategoryInlineEditor({ id, value = [], allCategories = [] }) {
  const { updateCategoriesInline, saving } = useAdminProductStore();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(Array.isArray(value) ? value : []);

  useEffect(() => {
    if (!editing) {
      const next = Array.isArray(value) ? value : [];

      setDraft((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
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

  /* ✅ VIEW MODE (comma separated) */
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
  

  /* ✅ EDIT MODE */
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
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
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
}



  /* ==============================
     Render
  ============================== */
  return (
    <section className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
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
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
          </button>

<button
  onClick={() => {
    setPublished("");
    setStockFilter("");
    setTypeFilter("");
    setMinPrice("");
    setMaxPrice("");
    setTagFilter("");
    setSkuFilter("");
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search products…"
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

        {/* Bulk Bar */}
        <BulkBar
          selectedCount={selectedCount}
          saving={saving}
          onPublish={() => handleBulkPublish(true)}
          onUnpublish={() => handleBulkPublish(false)}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      </div>

 <div className="flex flex-wrap items-end gap-4">
  {/* Status */}
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

  {/* Stock */}
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

  {/* Type */}
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

  {/* SKU */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600">SKU</label>
    <input
      className="select"
      value={skuFilter}
      onChange={(e) => setSkuFilter(e.target.value)}
    />
  </div>

  {/* Tag */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600">Tag</label>
    <input
      className="select"
      value={tagFilter}
      onChange={(e) => setTagFilter(e.target.value)}
    />
  </div>

  {/* Min Price */}
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

  {/* Max Price */}
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



      {/* Table */}
    <div className="mt-4 overflow-x-auto bg-white border border-gray-200 rounded-xl">
  <table className="w-full border-collapse text-sm">
    {/* Header */}
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

        <th className="px-4 py-3 border-b border-gray-200">Categories</th>

        <th className="px-4 py-3 border-b border-gray-200 text-green-700">
          <Th onClick={() => toggleSort("stock")} label="Stock" />
        </th>

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

    {/* Body */}
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
            {/* Checkbox */}
            <td className="px-4 py-3">
              <Checkbox
                checked={selectedIds.has(p._id)}
                onChange={() => toggleOne(p._id)}
              />
            </td>

            {/* Title */}
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={p.images?.[0] || "/no-image.png"}
                  className="w-10 h-10 rounded-md border border-gray-200 object-cover"
                  alt=""
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-medium text-gray-900">{p.title}</span>
                  <span className="text-xs text-gray-400">
                    {p.productType || "-"} • {p.sku || "-"}
                  </span>
                </div>
              </div>
            </td>

            {/* Price */}
            <td className="px-4 py-3">
              <PriceInlineEditor id={p._id} value={p.price} />
            </td>

            {/* Categories */}
            <td className="px-4 py-3">
              <CategoryInlineEditor
                id={p._id}
                value={p.categories}
                allCategories={categories}
              />
            </td>

            {/* Stock */}
            <td className="px-4 py-3">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                  p.stock > 0
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {p.stock > 0 ? `In Stock (${p.stock})` : "Out of Stock"}
              </span>
            </td>

            {/* Status */}
           <td className="px-4 py-3">
  <StatusDropdown
    value={getProductStatus(p)}
    loading={saving}
    onChange={(next) => updateProductStatus(p._id, next)}
  />
</td>


            {/* Created */}
            <td className="px-4 py-3 text-gray-500">
              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
            </td>

            {/* Actions */}
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



      {/* Styles */}
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
        }

        .select {
          background: white;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .tableWrap {
          overflow-x: auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 14px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: middle;
        }

        th {
          font-size: 13px;
          text-transform: uppercase;
          color: #6b7280;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }

        .thumb {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #e5e7eb;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .badge.green {
          background: #dcfce7;
          color: #166534;
        }

        .badge.red {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge.gray {
          background: #e5e7eb;
          color: #374151;
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
   COMPONENTS
============================== */

function Th({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1 ${
        onClick ? "cursor-pointer select-none" : ""
      }`}
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

function PublishToggle({ value, onChange, loading }) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={loading}
      className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
        value ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
      }`}
    >
      {value ? <Check size={14} /> : <X size={14} />}
      {value ? "Published" : "Draft"}
    </button>
  );
}

function BulkBar({ selectedCount, saving, onPublish, onUnpublish, onDelete, onClear }) {
  if (!selectedCount) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap ml-auto">
      <span className="text-sm font-semibold text-gray-700">
        {selectedCount} selected
      </span>

      <button disabled={saving} onClick={onPublish} className="btn btn-primary">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        Publish
      </button>

      <button disabled={saving} onClick={onUnpublish} className="btn btn-dark">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        Unpublish
      </button>

      <button disabled={saving} onClick={onDelete} className="btn btn-danger">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        Delete
      </button>

      <button disabled={saving} onClick={onClear} className="btn btn-muted">
        Clear
      </button>

      <style jsx>{`
        .btn {
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
        }
        .btn-dark {
          background: #111827;
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
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
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
