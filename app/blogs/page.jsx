// app/blogs/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const LIMIT = 20;

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const getBlogImage = (blog) =>
  blog?.image ||
  blog?.featuredImage ||
  blog?.coverImage ||
  blog?.thumbnail ||
  "";

export default function BlogsAdminPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [published, setPublished] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / LIMIT)),
    [total]
  );

  const imageBlogs = useMemo(
    () => items.filter((blog) => Boolean(getBlogImage(blog))),
    [items]
  );

  const activeImageBlog =
    lightboxIndex !== null ? imageBlogs[lightboxIndex] : null;

  const loadBlogs = useCallback(
    async ({ targetPage = page } = {}) => {
      setLoading(true);

      try {
        const url = new URL(`${API}/api/blogs`);

        url.searchParams.set("page", String(targetPage));
        url.searchParams.set("limit", String(LIMIT));
        url.searchParams.set("sort", "newest");

        if (q.trim()) {
          url.searchParams.set("q", q.trim());
        }

        if (published) {
          url.searchParams.set("published", published);
        }

        if (category.trim()) {
          url.searchParams.set("category", category.trim());
        }

        const response = await fetch(url.toString(), {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load blogs");
        }

        if (Array.isArray(data)) {
          setItems(data);
          setTotal(data.length);
          return;
        }

        setItems(data?.items || data?.blogs || []);
        setTotal(Number(data?.total || 0));
      } catch (error) {
        console.error("Blogs load error:", error);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [category, page, published, q]
  );

  useEffect(() => {
    loadBlogs();
  }, [page, published]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const showPreviousImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || imageBlogs.length <= 1) return current;

      return current === 0 ? imageBlogs.length - 1 : current - 1;
    });
  }, [imageBlogs.length]);

  const showNextImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || imageBlogs.length <= 1) return current;

      return current === imageBlogs.length - 1 ? 0 : current + 1;
    });
  }, [imageBlogs.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    closeLightbox,
    lightboxIndex,
    showNextImage,
    showPreviousImage,
  ]);

  const openLightbox = (blog) => {
    const index = imageBlogs.findIndex(
      (item) => (item._id || item.slug) === (blog._id || blog.slug)
    );

    if (index >= 0) {
      setLightboxIndex(index);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();

    if (page === 1) {
      loadBlogs({ targetPage: 1 });
    } else {
      setPage(1);
    }
  };

  const handleRefresh = () => {
    loadBlogs({ targetPage: page });
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm("Delete this blog permanently?")) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`${API}/api/blogs/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Delete failed");
      }

      const nextPage =
        items.length === 1 && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadBlogs({ targetPage: nextPage });
      }
    } catch (error) {
      console.error("Delete blog error:", error);
      window.alert(error?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <section className="min-h-screen bg-neutral-50 p-4 sm:p-6">
        <div className="mx-auto space-y-5">
          {/* Header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                Blogs
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Create, manage and publish blog posts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                onClick={() => router.push("/blogs/create")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                <Plus size={17} />
                New Blog
              </button>
            </div>
          </header>

          {/* Filters */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <form
                onSubmit={handleSearch}
                className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
              >
                <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 focus-within:border-neutral-400">
                  <Search size={16} className="shrink-0 text-neutral-400" />

                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Search blogs..."
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                  />
                </div>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Search
                </button>
              </form>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={published}
                  onChange={(event) => {
                    setPage(1);
                    setPublished(event.target.value);
                  }}
                  className="h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                >
                  <option value="">All statuses</option>
                  <option value="true">Published</option>
                  <option value="false">Draft</option>
                </select>

                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch(event);
                    }
                  }}
                  placeholder="Category"
                  className="h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />

                <div className="flex h-10 items-center rounded-xl bg-neutral-100 px-4 text-sm text-neutral-600">
                  Total:&nbsp;
                  <strong className="text-neutral-950">{total}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Blog list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center"
                >
                  <div className="aspect-video w-full rounded-xl bg-neutral-200 sm:w-48" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-neutral-200" />
                    <div className="h-3 w-3/4 rounded bg-neutral-100" />
                    <div className="h-6 w-1/3 rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-neutral-900">
                No blogs found
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((blog) => {
                const id = blog._id || blog.slug;
                const image = getBlogImage(blog);
                const tags = blog.tags || blog.hashtags || [];

                return (
                  <article
                    key={id}
                    className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:shadow-sm lg:flex-row lg:items-center"
                  >
                    {/* 16:9 clickable image */}
                    <button
                      type="button"
                      onClick={() => image && openLightbox(blog)}
                      disabled={!image}
                      aria-label={
                        image
                          ? `Open ${blog.title || "blog"} image`
                          : "No image available"
                      }
                      className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-neutral-100 text-left lg:w-52 xl:w-60"
                    >
                      {image ? (
                        <>
                          <img
                            src={image}
                            alt={blog.title || "Blog cover"}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />

                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                            <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/95 text-neutral-950 shadow-lg">
                              <Eye size={17} />
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                          No image
                        </span>
                      )}
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-base font-semibold text-neutral-950">
                        {blog.title || "Untitled blog"}
                      </h2>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                        /{blog.slug || id}
                        {blog.excerpt ? ` • ${blog.excerpt}` : ""}
                      </p>

                      {(blog.category || tags.length > 0) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {blog.category && (
                            <span className="rounded-lg bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-white">
                              {blog.category}
                            </span>
                          )}

                          {tags.slice(0, 4).map((tag, index) => (
                            <span
                              key={`${tag}-${index}`}
                              className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Meta and actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3 lg:flex-nowrap lg:justify-end lg:border-0 lg:pt-0">
                      <span className="whitespace-nowrap text-xs text-neutral-500">
                        {formatDate(blog.date || blog.createdAt)}
                      </span>

                      <span
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
                          blog.isPublished
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {blog.isPublished ? (
                          <Eye size={13} />
                        ) : (
                          <EyeOff size={13} />
                        )}

                        {blog.isPublished ? "Published" : "Draft"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/blogs/${blog.slug || blog._id}`)
                          }
                          title="View blog"
                          className="inline-flex size-9 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/blogs/edit/${blog._id}`)
                          }
                          title="Edit blog"
                          className="inline-flex size-9 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(blog._id)}
                          disabled={deletingId === blog._id}
                          title="Delete blog"
                          className="inline-flex size-9 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && items.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <p className="text-sm text-neutral-500">
                Page{" "}
                <strong className="text-neutral-950">{page}</strong> of{" "}
                <strong className="text-neutral-950">{pages}</strong>
              </p>

              <button
                type="button"
                disabled={page >= pages}
                onClick={() =>
                  setPage((current) => Math.min(pages, current + 1))
                }
                className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Full-screen lightbox */}
      {activeImageBlog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Blog image preview"
          onClick={closeLightbox}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
        >
          <button
            type="button"
            onClick={closeLightbox}
            title="Close"
            className="absolute right-4 top-4 z-20 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X size={22} />
          </button>

          {imageBlogs.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousImage();
                }}
                title="Previous image"
                className="absolute left-3 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextImage();
                }}
                title="Next image"
                className="absolute right-3 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-neutral-950 shadow-2xl"
          >
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
              <img
                src={getBlogImage(activeImageBlog)}
                alt={activeImageBlog.title || "Blog image preview"}
                className="max-h-[78vh] w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 text-white sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {activeImageBlog.title || "Untitled blog"}
                </p>

                <p className="mt-0.5 truncate text-xs text-white/50">
                  /{activeImageBlog.slug || activeImageBlog._id}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                {lightboxIndex + 1} / {imageBlogs.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}