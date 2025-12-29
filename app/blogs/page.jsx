// app/blogs/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

export default function BlogsAdminPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [published, setPublished] = useState(""); // "" | "true" | "false"
  const [category, setCategory] = useState(""); // optional
  const [page, setPage] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(true);
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
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (published) url.searchParams.set("published", published);
      if (category.trim()) url.searchParams.set("category", category.trim());

      const r = await fetch(url.toString(), { cache: "no-store" });
      const d = await r.json();

      // supports BOTH styles:
      // 1) { items, total, page, pages }
      // 2) [ ...blogs ]
      if (Array.isArray(d)) {
        setItems(d);
        setTotal(d.length);
      } else {
        setItems(d.items || []);
        setTotal(d.total || 0);
      }
    } catch (e) {
      console.error("❌ blogs load:", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, published]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load({ page: 1 });
  };

  const deleteBlog = async (id) => {
    if (!confirm("Delete this blog permanently?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`${API}/api/blogs/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Delete failed");
      await load({ page: 1 });
      setPage(1);
    } catch (e) {
      console.error("❌ delete blog:", e);
      alert(e.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
  <section className="min-h-screen bg-gray-50 p-6">
  <div className=" mx-auto space-y-6">
    {/* ================= HEADER ================= */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Blogs</h1>
        <p className="text-sm text-gray-500">
          Create, manage, publish and delete blog posts
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={load}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-sm hover:bg-gray-100 text-gray-600"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>

        <button
          onClick={() => router.push("/blogs/create")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm"
        >
          <Plus size={16} />
          New Blog
        </button>
      </div>
    </div>

    {/* ================= FILTERS ================= */}
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <form onSubmit={onSearch} className="flex gap-2 flex-1">
          <div className="flex items-center gap-2 flex-1 rounded-lg bg-gray-100 px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search blogs…"
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
          <button className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select
            value={published}
            onChange={(e) => {
              setPage(1);
              setPublished(e.target.value);
            }}
            className="rounded-lg bg-gray-100 px-3 py-2 outline-none"
          >
            <option value="">All</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>

          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="rounded-lg bg-gray-100 px-3 py-2 outline-none w-[160px]"
          />

          <span className="text-gray-600">
            Total: <b>{total}</b>
          </span>
        </div>
      </div>
    </div>

    {/* ================= LIST ================= */}
    {loading ? (
      <div className="text-gray-600">Loading blogs…</div>
    ) : items.length === 0 ? (
      <div className="text-gray-600">No blogs found.</div>
    ) : (
      <div className="space-y-3">
        {items.map((b) => (
          <div
            key={b._id || b.slug}
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4 md:items-center"
          >
            {/* Image */}
            <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              {b.image ? (
                <img
                  src={b.image}
                  alt={b.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  No image
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {b.title}
              </div>
              <div className="text-xs text-gray-500 truncate">
                /{b.slug} {b.excerpt ? `• ${b.excerpt}` : ""}
              </div>

              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600">
                {b.category && (
                  <span className="px-2 py-0.5 rounded bg-gray-100">
                    {b.category}
                  </span>
                )}
                {(b.tags || b.hashtags || []).slice(0, 4).map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-gray-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {fmtDate(b.date || b.createdAt)}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  b.isPublished
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {b.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                {b.isPublished ? "Published" : "Draft"}
              </span>

              {/* ================= ACTIONS (COMPACT) ================= */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/blogs/${b.slug || b._id}`)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
                  title="View"
                >
                  <Eye size={15} />
                </button>

                <button
                  onClick={() => router.push(`/blogs/edit/${b._id}`)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>

                <button
                  onClick={() => deleteBlog(b._id)}
                  disabled={deletingId === b._id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-600 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* ================= PAGINATION ================= */}
    <div className="flex items-center justify-between pt-4">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Prev
      </button>

      <div className="text-sm text-gray-600">
        Page <b>{page}</b> of <b>{pages}</b>
      </div>

      <button
        disabled={page >= pages}
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
        className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
</section>

  );
}
