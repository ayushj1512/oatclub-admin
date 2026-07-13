"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  ExternalLink,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";

import { useAdminBlogStore } from "@/store/adminBlogStore";

const fmtDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export default function BlogsAllPage() {
  const {
    blogs = [],
    total = 0,
    pages = 1,
    loading,
    filters = {},
    fetchBlogs,
    deleteBlog,
    setFilters,
  } = useAdminBlogStore();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const limit = 12;

  useEffect(() => {
    fetchBlogs({ page, limit });
  }, [page, filters, fetchBlogs]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLightboxIndex(null);

      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) =>
          current === 0 ? blogs.length - 1 : current - 1
        );
      }

      if (event.key === "ArrowRight") {
        setLightboxIndex((current) =>
          current === blogs.length - 1 ? 0 : current + 1
        );
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, blogs.length]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);

    setFilters({
      q: q.trim(),
      category: category.trim(),
      published: publishedOnly ? "true" : "",
    });
  };

  const handleReset = () => {
    setQ("");
    setCategory("");
    setPublishedOnly(false);
    setPage(1);

    setFilters({
      q: "",
      category: "",
      published: "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this blog?")) return;

    try {
      setDeletingId(id);
      await deleteBlog(id);

      if (blogs.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchBlogs({ page, limit });
      }
    } finally {
      setDeletingId("");
    }
  };

  const openLightbox = (index) => {
    if (blogs[index]?.image) {
      setLightboxIndex(index);
    }
  };

  const previousImage = () => {
    setLightboxIndex((current) =>
      current === 0 ? blogs.length - 1 : current - 1
    );
  };

  const nextImage = () => {
    setLightboxIndex((current) =>
      current === blogs.length - 1 ? 0 : current + 1
    );
  };

  const activeBlog =
    lightboxIndex !== null ? blogs[lightboxIndex] : null;

  return (
    <>
      <section className="min-h-screen bg-[#f6f7f9]">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
          {/* HEADER */}

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                Blogs
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage blogs, cover images and linked products
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/blogs/create"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                New Blog
              </Link>

              <button
                type="button"
                onClick={() => fetchBlogs({ page, limit })}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* FILTERS */}

          <form
            onSubmit={handleSearch}
            className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_240px_auto] md:items-end">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Search
                </label>

                <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-black">
                  <Search size={17} className="text-gray-400" />

                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Search blogs"
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Category
                </label>

                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Fashion"
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-900"
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5 text-sm">
              <span className="text-gray-500">
                Total: <b className="text-black">{total}</b>
              </span>

              <label className="flex cursor-pointer items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  checked={publishedOnly}
                  onChange={(event) => {
                    const checked = event.target.checked;

                    setPage(1);
                    setPublishedOnly(checked);

                    setFilters({
                      ...filters,
                      published: checked ? "true" : "",
                    });
                  }}
                  className="h-4 w-4 accent-black"
                />

                Published only
              </label>
            </div>
          </form>
        </div>

        {/* CONTENT */}

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* DESKTOP */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-[#fafafa]">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="w-[42%] px-6 py-4 font-medium">Blog</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Products</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <MessageRow text="Loading blogs..." />
                  ) : blogs.length === 0 ? (
                    <MessageRow text="No blogs found" />
                  ) : (
                    blogs.map((blog, index) => (
                      <tr
                        key={blog._id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <BlogImage
                              src={blog.image}
                              alt={blog.title}
                              onClick={() => openLightbox(index)}
                            />

                            <div className="min-w-0">
                              <h2 className="line-clamp-2 font-medium leading-5 text-gray-900">
                                {blog.title || "Untitled blog"}
                              </h2>

                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                {blog.excerpt || "No excerpt available"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          {blog.category || "-"}
                        </td>

                        <td className="px-6 py-4">
                          {blog.products?.length ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                              {blog.products.length} linked
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge published={blog.isPublished} />
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                          {fmtDate(blog.date || blog.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <BlogActions
                            blog={blog}
                            deleting={deletingId === blog._id}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}

            <div className="divide-y divide-gray-100 lg:hidden">
              {loading ? (
                <Message text="Loading blogs..." />
              ) : blogs.length === 0 ? (
                <Message text="No blogs found" />
              ) : (
                blogs.map((blog, index) => (
                  <article key={blog._id} className="p-4">
                    <button
                      type="button"
                      onClick={() => openLightbox(index)}
                      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100"
                    >
                      {blog.image ? (
                        <Image
                          src={blog.image}
                          alt={blog.title || "Blog cover"}
                          fill
                          sizes="100vw"
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-gray-400">
                          No image
                        </span>
                      )}

                      {blog.image && (
                        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                          <ZoomIn size={15} />
                        </span>
                      )}
                    </button>

                    <div className="mt-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-black">
                          {blog.title || "Untitled blog"}
                        </h2>

                        <StatusBadge published={blog.isPublished} />
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                        {blog.excerpt || "No excerpt available"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>{blog.category || "No category"}</span>
                        <span>•</span>
                        <span>{blog.products?.length || 0} products</span>
                        <span>•</span>
                        <span>{fmtDate(blog.date || blog.createdAt)}</span>
                      </div>

                      <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                        <BlogActions
                          blog={blog}
                          deleting={deletingId === blog._id}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* PAGINATION */}

          <div className="flex items-center justify-between pt-7 text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 disabled:opacity-40"
            >
              Prev
            </button>

            <span className="text-gray-500">
              Page <b className="text-black">{page}</b> of{" "}
              <b className="text-black">{Math.max(pages, 1)}</b>
            </span>

            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* LIGHTBOX */}

      {activeBlog?.image && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={22} />
          </button>

          {blogs.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  previousImage();
                }}
                className="absolute left-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
                className="absolute right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div
            className="w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <Image
                src={activeBlog.image}
                alt={activeBlog.title || "Blog cover"}
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <div className="mx-auto mt-4 max-w-3xl text-center">
              <h3 className="line-clamp-2 text-sm font-medium text-white sm:text-base">
                {activeBlog.title}
              </h3>

              <p className="mt-1 text-xs text-white/60">
                {lightboxIndex + 1} / {blogs.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BlogImage({ src, alt, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!src}
      className="group relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100 disabled:cursor-default"
    >
      {src ? (
        <>
          <Image
            src={src}
            alt={alt || "Blog cover"}
            fill
            sizes="128px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />

          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
            <ZoomIn size={18} />
          </span>
        </>
      ) : (
        <span className="flex h-full items-center justify-center text-[10px] text-gray-400">
          No image
        </span>
      )}
    </button>
  );
}

function StatusBadge({ published }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        published
          ? "bg-green-50 text-green-700"
          : "bg-orange-50 text-orange-700"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

function BlogActions({ blog, deleting, onDelete }) {
  return (
    <div className="flex justify-end gap-2">
      <Link
        href={`/blogs/${blog.slug}`}
        title="View"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-black hover:text-white"
      >
        <ExternalLink size={15} />
      </Link>

      <Link
        href={`/blogs/edit/${blog._id}`}
        title="Edit"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-black hover:text-white"
      >
        <Pencil size={15} />
      </Link>

      <button
        type="button"
        onClick={() => onDelete(blog._id)}
        disabled={deleting}
        title="Delete"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-600 hover:text-white disabled:opacity-40"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function MessageRow({ text }) {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
        {text}
      </td>
    </tr>
  );
}

function Message({ text }) {
  return <div className="p-12 text-center text-sm text-gray-500">{text}</div>;
}