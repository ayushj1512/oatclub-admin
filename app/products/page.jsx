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

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

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

  /* ==============================
     Derived states
  ============================== */
  const selectedCount = selectedIds.size;

  const allSelected = useMemo(() => {
    return products.length > 0 && selectedIds.size === products.length;
  }, [products, selectedIds]);

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < products.length;
  }, [products, selectedIds]);

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
    else setSelectedIds(new Set(products.map((p) => p._id)));
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
    {loading ? "…" : products.length} Products
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

      {/* Table */}
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th className="w-[48px]">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                />
              </th>

              <Th onClick={() => toggleSort("title")} label="Title" />
              <Th onClick={() => toggleSort("price")} label="Price" />
              <Th label="Categories" />
              <Th onClick={() => toggleSort("stock")} label="Stock" />
              <Th label="Published" />
              <Th onClick={() => toggleSort("createdAt")} label="Created" />
              <th className="w-[140px]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-500">
                  Loading products…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <Checkbox
                      checked={selectedIds.has(p._id)}
                      onChange={() => toggleOne(p._id)}
                    />
                  </td>

                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images?.[0] || "/no-image.png"}
                        className="thumb"
                        alt=""
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{p.title}</span>
                        <span className="text-xs text-gray-500">
                          {p.productType || "-"} • SKU: {p.sku || "-"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="font-medium">₹{p.price ?? "-"}</td>

                  <td>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(p.categories) && p.categories.length ? (
                        p.categories.map((c) => (
                          <span key={c} className="badge gray">
                            {c}
                          </span>
                        ))
                      ) : (
                        "-"
                      )}
                    </div>
                  </td>

                  <td>
                    {p.stock > 0 ? (
                      <span className="badge green">
                        In Stock ({p.stock})
                      </span>
                    ) : (
                      <span className="badge red">Out of Stock</span>
                    )}
                  </td>

                  {/* ✅ Publish Toggle */}
                  <td>
                    <PublishToggle
                      value={!!p.isPublished}
                      loading={saving}
                      onChange={(next) => togglePublish(p._id, next)}
                    />
                  </td>

                  <td>
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/products/${p._id}`)}
                        className="icon blue"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteProduct(p._id)}
                        className="icon red"
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
    <th onClick={onClick}>
      <div className="flex items-center gap-1">
        {label}
        {onClick && <ArrowUpDown size={14} />}
      </div>
    </th>
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
