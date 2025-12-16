// app/blogs/all/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, Pencil, Trash2, ExternalLink } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

export default function BlogsAllPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [loading, setLoading] = useState(true);

  // Admin toggles
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const load = async (opts = {}) => {
    const p = opts.page ?? page;
    setLoading(true);
    try {
      const url = new URL(`${API}/api/blogs`);
      url.searchParams.set("page", String(p));
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("sort", "newest");

      // If your API supports `published=true`, we keep it optional via UI toggle
      if (showPublishedOnly) url.searchParams.set("published", "true");

      if (q.trim()) url.searchParams.set("q", q.trim());
      if (category.trim()) url.searchParams.set("category", category.trim());
      if (tag.trim()) url.searchParams.set("tag", tag.trim());

      const r = await fetch(url.toString(), { cache: "no-store" });
      const d = await r.json();

      // supports { items, total } style
      setItems(Array.isArray(d.items) ? d.items : []);
      setTotal(Number(d.total) || 0);
    } catch (e) {
      console.error("❌ blogs/all load:", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, showPublishedOnly]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load({ page: 1 });
  };

  const deleteBlog = async (id) => {
    if (!confirm("Delete this blog?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`${API}/api/blogs/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Delete failed");

      alert("Deleted ✅");
      // reload same page; if it becomes empty, go back 1 page
      const nextItemsCount = Math.max(0, (items?.length || 0) - 1);
      if (nextItemsCount === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load({ page });
      }
    } catch (e) {
      console.error("❌ delete blog:", e);
      alert(e.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50">
      {/* Top */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blogs</h1>
            <p className="text-sm text-gray-600 mt-1">Latest reads, styling guides & trends.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/blogs/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              title="Create new blog"
            >
              + New
            </Link>

            <button
              onClick={() => load({ page })}
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search row */}
        <form onSubmit={onSearch} className="mt-6 bg-white border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-2">
              <Search size={16} className="text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title / excerpt / tags..."
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>

            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              className="bg-gray-100 border border-gray-200 px-3 py-2 outline-none text-sm"
            />

            <div className="flex gap-2">
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag (optional)"
                className="flex-1 bg-gray-100 border border-gray-200 px-3 py-2 outline-none text-sm"
              />
              <button className="px-4 py-2 bg-black text-white">Search</button>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
            <div>
              Total: <b>{total}</b>
            </div>

            <label className="inline-flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={showPublishedOnly}
                onChange={(e) => {
                  setPage(1);
                  setShowPublishedOnly(e.target.checked);
                }}
              />
              Show published only
            </label>
          </div>
        </form>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No blogs found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((b) => (
              <div
                key={b._id}
                className="group bg-white border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="relative h-52 bg-gray-100 overflow-hidden">
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                      No image
                    </div>
                  )}

                  {/* Admin actions */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Link
                      href={`/blogs/edit/${b._id}`}
                      className="p-2 bg-white/95 border hover:bg-white"
                      title="Edit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil size={16} />
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlog(b._id);
                      }}
                      disabled={deletingId === b._id}
                      className={`p-2 border ${
                        deletingId === b._id ? "bg-gray-100 text-gray-400" : "bg-white/95 hover:bg-white"
                      }`}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{fmtDate(b.date || b.createdAt)}</span>
                    <span className="px-2 py-0.5 bg-gray-100 border">{b.category || "Blog"}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{b.title}</h3>

                    {/* View */}
                    <Link
                      href={`/blogs/${b.slug}`}
                      className="shrink-0 p-2 border bg-white hover:bg-gray-50"
                      title="Open"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3">{b.excerpt || ""}</p>

                  {!!(b.tags?.length) && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {b.tags.slice(0, 4).map((t, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-100 border text-gray-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Status:{" "}
                      <b className={b.isPublished ? "text-green-700" : "text-orange-700"}>
                        {b.isPublished ? "Published" : "Draft"}
                      </b>
                    </span>
                    <Link href={`/blogs/edit/${b._id}`} className="text-blue-700 hover:underline">
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`px-4 py-2 border ${
              page <= 1 ? "text-gray-400 bg-gray-100" : "bg-white hover:bg-gray-50"
            }`}
          >
            Prev
          </button>

          <div className="text-sm text-gray-600">
            Page <b>{page}</b> / <b>{pages}</b>
          </div>

          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className={`px-4 py-2 border ${
              page >= pages ? "text-gray-400 bg-gray-100" : "bg-white hover:bg-gray-50"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
