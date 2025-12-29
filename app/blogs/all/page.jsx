"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, Pencil, Trash2, ExternalLink } from "lucide-react";

import { useAdminBlogStore } from "@/store/adminBlogStore";

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export default function BlogsAllPage() {
  /* ================= STORE ================= */
  const {
    blogs: items,
    total,
    pages,
    loading,
    fetchBlogs,
    deleteBlog,
    setFilters,
    filters,
  } = useAdminBlogStore();

  /* ================= LOCAL STATE ================= */
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* ================= LOAD ================= */
  useEffect(() => {
    fetchBlogs({ page, limit });
  }, [page, filters, fetchBlogs]);

  /* ================= SEARCH ================= */
  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);

    setFilters({
      q,
      category,
      published: showPublishedOnly ? "true" : "",
    });
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!confirm("Delete this blog?")) return;

    setDeletingId(id);
    await deleteBlog(id);

    if (items.length === 1 && page > 1) {
      setPage((p) => p - 1);
    } else {
      fetchBlogs({ page, limit });
    }

    setDeletingId(null);
  };

  return (
   <section className="min-h-screen bg-[#f6f7f9]">
  {/* ================= HEADER ================= */}
  <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-black">
          Blogs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage blogs, content & linked products
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/blogs/create"
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium"
        >
          + New Blog
        </Link>

        <button
          onClick={() => fetchBlogs({ page, limit })}
          className="rounded-xl bg-black text-white px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-gray-900"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
    </div>

    {/* ================= FILTERS ================= */}
    <form
      onSubmit={onSearch}
      className="mt-8 bg-white rounded-2xl shadow-sm px-6 py-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SEARCH */}
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blogs"
            className="w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
          />
        </div>

        {/* CATEGORY */}
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
        />

        {/* ACTION */}
        <button className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-900">
          Search
        </button>
      </div>

      <div className="mt-5 flex justify-between items-center text-sm text-gray-500">
        <div>
          Total: <b className="text-black">{total}</b>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPublishedOnly}
            onChange={(e) => {
              setPage(1);
              setShowPublishedOnly(e.target.checked);
              setFilters({
                ...filters,
                published: e.target.checked ? "true" : "",
              });
            }}
          />
          Published only
        </label>
      </div>
    </form>
  </div>

  {/* ================= TABLE ================= */}
  <div className="max-w-7xl mx-auto px-6 pb-12">
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#fafafa] sticky top-0">
          <tr className="text-left text-gray-500">
            <th className="px-6 py-4 w-[36%] font-medium">Blog</th>
            <th className="px-6 py-4 font-medium">Category</th>
            <th className="px-6 py-4 font-medium">Products</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Date</th>
            <th className="px-6 py-4 text-right font-medium">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                Loading blogs…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                No blogs found
              </td>
            </tr>
          ) : (
            items.map((b, i) => (
              <tr
                key={b._id}
                className={`hover:bg-gray-50 ${
                  i !== items.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                {/* BLOG */}
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 line-clamp-1">
                    {b.title}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {b.excerpt || "-"}
                  </div>
                </td>

                {/* CATEGORY */}
                <td className="px-6 py-4 text-gray-700">
                  {b.category || "-"}
                </td>

                {/* PRODUCTS */}
                <td className="px-6 py-4">
                  {b.products?.length ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                      {b.products.length} linked
                    </span>
                  ) : (
                    "-"
                  )}
                </td>

                {/* STATUS */}
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-medium ${
                      b.isPublished
                        ? "text-green-700"
                        : "text-orange-600"
                    }`}
                  >
                    {b.isPublished ? "Published" : "Draft"}
                  </span>
                </td>

                {/* DATE */}
                <td className="px-6 py-4 text-gray-500">
                  {fmtDate(b.date || b.createdAt)}
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/blogs/${b.slug}`}
                      className="text-gray-400 hover:text-black"
                      title="View"
                    >
                      <ExternalLink size={16} />
                    </Link>

                    <Link
                      href={`/blogs/edit/${b._id}`}
                      className="text-gray-400 hover:text-black"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </Link>

                    <button
                      onClick={() => handleDelete(b._id)}
                      disabled={deletingId === b._id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
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

    {/* ================= PAGINATION ================= */}
    <div className="flex justify-between items-center pt-8 text-sm text-gray-500">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => p - 1)}
        className="px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
      >
        Prev
      </button>

      <span>
        Page <b className="text-black">{page}</b> /{" "}
        <b className="text-black">{pages}</b>
      </span>

      <button
        disabled={page >= pages}
        onClick={() => setPage((p) => p + 1)}
        className="px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
</section>

  );
}
