"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProductsPage() {
  const router = useRouter();

  /* ---------------- state ---------------- */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(""); // string category

  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  /* ---------------- fetch products ---------------- */
  const loadProducts = async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams({
        page,
        search,
        sort: `${sortKey}_${sortDir}`,
      });

      if (category) qs.set("category", category);

      const res = await fetch(`${API}/api/products?${qs.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      setProducts(data.products || []);
      setPages(data.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- fetch categories ---------------- */
  const loadCategories = async () => {
    try {
      const res = await fetch(`${API}/api/categories`, { cache: "no-store" });
      const data = await res.json();

      /**
       * Expecting categories like:
       * [{ name: "dresses", slug: "dresses" }]
       */
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, search, category, sortKey, sortDir]);

  /* ---------------- actions ---------------- */
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`${API}/api/products/${id}`, { method: "DELETE" });
    loadProducts();
  };

  /* ---------------- render ---------------- */
  return (
    <section className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600">
            Manage, search, filter & sort products
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={loadProducts} className="btn btn-dark">
            <RefreshCw size={18} />
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
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search products…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="select"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.slug || c.name} value={c.slug || c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <Th onClick={() => toggleSort("title")} label="Title" />
              <Th onClick={() => toggleSort("price")} label="Price" />
              <Th label="Categories" />
              <Th onClick={() => toggleSort("stock")} label="Stock" />
              <Th onClick={() => toggleSort("createdAt")} label="Created" />
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  Loading products…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images?.[0] || "/no-image.png"}
                        className="thumb"
                        alt=""
                      />
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </td>

                  <td>₹{p.price}</td>

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
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(p._id)}
                        className="icon red"
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="pager"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-medium">
            Page {page} / {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="pager"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .btn {
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 600;
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
        }
        .search input {
          outline: none;
          border: none;
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
        }

        th {
          font-size: 13px;
          text-transform: uppercase;
          color: #6b7280;
          cursor: pointer;
        }

        .thumb {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
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

        .pager {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: white;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </section>
  );
}

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
