// app/blogs/edit/[id]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Sparkles, ArrowLeft } from "lucide-react";
import { useAdminBlogStore } from "@/store/adminBlogStore";
import { useAdminProductStore } from "@/store/adminProductStore";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/* ---------------- utils ---------------- */
const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/--+/g, "-");

const toDateInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

const normalizeProductIds = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (!x) return null;
      if (typeof x === "string") return x;
      if (typeof x === "object") return x._id || x.id || null;
      return null;
    })
    .filter(Boolean)
    .map(String);
};

/* ============================================================
  ✅ Universal Product Linker (inline component for this page)
  - controlled by value/onChange
  - loads all products using store.fetchAllProducts()
  - hydrates selected product objects with store.fetchProductsByIds()
============================================================ */
function ProductLinker({
  value = [],
  onChange,
  label = "Linked products",
  placeholder = "Search products by name, SKU, pattern number…",
  disabled = false,
  max,
}) {
  const { fetchAllProducts, fetchProductsByIds } = useAdminProductStore();

  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedIds = useMemo(() => Array.from(new Set(value || [])), [value]);

  // Adjust label fields to your schema safely
  const labelFn = (p) =>
    p?.title || p?.name || p?.productName || p?.slug || p?._id || "Untitled";

  const categoryFn = (p) =>
    (Array.isArray(p?.categories) && p.categories[0]?.name) ||
    (Array.isArray(p?.categories) && p.categories[0]) ||
    p?.category ||
    "Uncategorized";

  const priceFn = (p) => p?.price ?? "";

  const getProductImage = (p) => {
    return (
      p?.image ||
      p?.thumbnail ||
      p?.images?.[0] ||
      p?.media?.[0]?.url ||
      p?.gallery?.[0]?.url ||
      ""
    );
  };

  // 1) Load all products once (best UX for fast search)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchAllProducts();
        if (!mounted) return;
        setAllProducts(Array.isArray(list) ? list : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchAllProducts]);

  // 2) Hydrate selected product objects (for chips preview)
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!selectedIds.length) {
        setSelectedProducts([]);
        return;
      }

      const map = new Map((allProducts || []).map((p) => [String(p._id), p]));
      const resolved = selectedIds.map((id) => map.get(String(id))).filter(Boolean);

      const missing = selectedIds.filter((id) => !map.has(String(id)));
      if (missing.length) {
        const fetched = await fetchProductsByIds(missing);
        const merged = [...resolved, ...(Array.isArray(fetched) ? fetched : [])];

        if (!mounted) return;

        const uniq = [];
        const seen = new Set();
        for (const p of merged) {
          const id = String(p?._id || "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          uniq.push(p);
        }
        setSelectedProducts(uniq);
      } else {
        if (!mounted) return;
        setSelectedProducts(resolved);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedIds, allProducts, fetchProductsByIds]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return (allProducts || []).slice(0, 50);

    return (allProducts || [])
      .filter((p) => {
        const hay = [
          p?.title,
          p?.name,
          p?.sku,
          p?.patternNumber,
          p?.slug,
          p?._id,
          categoryFn(p),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(query);
      })
      .slice(0, 80);
  }, [allProducts, q]);

  const canAddMore = typeof max === "number" ? selectedIds.length < max : true;

  const add = (product) => {
    if (disabled) return;
    if (!product?._id) return;

    const id = String(product._id);
    if (selectedIds.includes(id)) return;
    if (!canAddMore) return;

    const nextIds = [...selectedIds, id];
    onChange?.(nextIds);

    setSelectedProducts((prev) => {
      const seen = new Set(prev.map((x) => String(x._id)));
      if (seen.has(id)) return prev;
      return [product, ...prev];
    });
  };

  const remove = (id) => {
    if (disabled) return;
    const nextIds = selectedIds.filter((x) => String(x) !== String(id));
    onChange?.(nextIds);
    setSelectedProducts((prev) => prev.filter((p) => String(p._id) !== String(id)));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange?.([]);
    setSelectedProducts([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {label}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Select products that will appear inside this blog
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Selected: <b className="text-black">{selectedIds.length}</b>
            {typeof max === "number" ? ` / ${max}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || !selectedIds.length}
          className="text-xs px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm disabled:opacity-50"
      />

      {/* Results */}
      <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
        {loading && allProducts.length === 0 ? (
          <p className="text-sm text-gray-500">Loading products…</p>
        ) : filtered.length ? (
          filtered.map((p) => {
            const id = String(p?._id || "");
            const checked = selectedIds.includes(id);
            const img = getProductImage(p);

            return (
              <button
                key={id}
                type="button"
                onClick={() => add(p)}
                disabled={disabled || checked || !canAddMore}
                className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition ${
                  checked ? "bg-blue-50" : "hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                    {img ? (
                      <img
                        src={img}
                        alt={labelFn(p)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {labelFn(p)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {priceFn(p) !== "" ? `₹${priceFn(p)} · ` : ""}
                      {categoryFn(p)}
                      {p?.patternNumber ? ` · Pattern: ${p.patternNumber}` : ""}
                      {p?.sku ? ` · SKU: ${p.sku}` : ""}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-medium">
                  {checked ? (
                    <span className="text-blue-600">Selected</span>
                  ) : !canAddMore ? (
                    <span className="text-gray-400">Max</span>
                  ) : (
                    <span className="text-gray-600">Add</span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 px-2 py-6 text-center">
            No matching products
          </p>
        )}
      </div>

      {/* Selected chips */}
      {!!selectedProducts.length && (
        <div className="pt-2">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Linked Products
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((p) => {
              const id = String(p?._id || "");
              return (
                <span
                  key={id}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 inline-flex items-center gap-2"
                  title={labelFn(p)}
                >
                  <span className="max-w-[220px] truncate">{labelFn(p)}</span>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="text-gray-400 hover:text-black"
                    disabled={disabled}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const { blog, fetchBlogById, updateBlog, loading, saving } =
    useAdminBlogStore();

  /* ---------------- form state ---------------- */
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    date: "",
    category: "Fashion",
    tags: [],
    products: [], // ✅ linked product ids
    image: "",
    content: "",
    isPublished: true,
  });

  const [tagsInput, setTagsInput] = useState("");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  // ✅ helper: set("field", value) OR set("field", prev => next)
  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  };

  const previewSlug = useMemo(
    () => (form.slug ? slugify(form.slug) : slugify(form.title)),
    [form.slug, form.title]
  );

  /* ---------------- load blog ---------------- */
  useEffect(() => {
    if (id) fetchBlogById(id);
  }, [id, fetchBlogById]);

  useEffect(() => {
    if (!blog) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      title: blog.title || "",
      slug: blog.slug || "",
      excerpt: blog.excerpt || "",
      date: toDateInput(blog.date || blog.createdAt),
      category: blog.category || "Fashion",
      tags: Array.isArray(blog.tags) ? blog.tags : [],
      products: normalizeProductIds(blog.products), // ✅ normalize to ID array
      image: blog.image || "",
      content: blog.content || "",
      isPublished: blog.isPublished ?? true,
    });

    setTagsInput("");
  }, [blog]);

  /* ---------------- tags ---------------- */
  const addTags = () => {
    const parts = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!parts.length) return;

    set("tags", Array.from(new Set([...(form.tags || []), ...parts])));
    setTagsInput("");
  };

  const removeTag = (t) => set("tags", (form.tags || []).filter((x) => x !== t));

  /* ---------------- submit ---------------- */
  const handleSubmit = async () => {
    if (!form.title.trim()) return alert("Title is required");
    if (!form.excerpt.trim()) return alert("Excerpt is required");

    await updateBlog(id, {
      ...form,
      slug: previewSlug,
      tags: form.tags || [],
      products: (form.products || []).map(String),
    });

    router.push("/blogs/all");
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-[#f6f7f9] flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading blog…</p>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f6f7f9]">
      <div className="mx-auto px-6 py-12 space-y-10">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/blogs/all"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
            >
              <ArrowLeft size={16} />
              Back to blogs
            </Link>

            <h1 className="text-3xl font-semibold text-black mt-3">Edit Blog</h1>

            <p className="text-sm text-gray-500 mt-1">
              Update content and save changes
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* ================= BASIC INFO ================= */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Basic information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500">Title *</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Slug</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  className="flex-1 bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => set("slug", previewSlug)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                  title="Generate from title"
                >
                  <Sparkles size={14} />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Preview: <b>{previewSlug || "-"}</b>
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Excerpt *</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              rows={3}
              className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm resize-none"
            />
          </div>
        </div>

        {/* ================= BLOG COVER IMAGE ================= */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Blog cover image
          </h2>

          <p className="text-sm text-gray-500">
            This image appears on blog listing cards and at the top of the blog page
          </p>

          {form.image ? (
            <div className="relative w-full max-w-md">
              <img
                src={form.image}
                alt="Blog cover"
                className="w-full h-[220px] object-contain rounded-xl border border-gray-200"
              />

              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setImagePickerOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white shadow text-xs font-medium hover:bg-gray-100"
                >
                  Replace
                </button>

                <button
                  type="button"
                  onClick={() => set("image", "")}
                  className="px-3 py-1.5 rounded-lg bg-white shadow text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setImagePickerOpen(true)}
              className="flex items-center justify-center w-full max-w-md h-[220px] rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-black hover:text-black transition"
            >
              Click to select cover image
            </button>
          )}

          <MediaPickerModal
            open={imagePickerOpen}
            onClose={() => setImagePickerOpen(false)}
            folder="miray/blogs"
            onSelect={(media) => {
              set("image", media.url);
              setImagePickerOpen(false);
            }}
          />
        </div>

        {/* ================= META ================= */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Meta & visibility
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500">
                Publish date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Category</label>
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Status</label>
              <select
                value={String(form.isPublished)}
                onChange={(e) => set("isPublished", e.target.value === "true")}
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              >
                <option value="true">Published</option>
                <option value="false">Draft</option>
              </select>
            </div>
          </div>

          {/* TAGS */}
          <div>
            <label className="text-xs font-medium text-gray-500">Tags</label>
            <div className="flex gap-2 mt-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="flex-1 bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              />
              <button
                type="button"
                onClick={addTags}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-xs font-medium hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {!!(form.tags || []).length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(form.tags || []).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="ml-2 text-gray-400 hover:text-black"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= PRODUCTS (UPDATED) ================= */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <ProductLinker
            value={form.products}
            onChange={(ids) => set("products", ids)}
            label="Linked products"
            max={24}
          />
        </div>

        {/* ================= CONTENT ================= */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Blog content
          </h2>

          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            rows={18}
            className="w-full bg-transparent border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-black"
          />

          <p className="text-xs text-gray-400">Supports markdown-style formatting</p>
        </div>
      </div>
    </section>
  );
}
