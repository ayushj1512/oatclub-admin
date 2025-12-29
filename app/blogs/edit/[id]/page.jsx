"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Sparkles, ArrowLeft } from "lucide-react";
import { useAdminBlogStore } from "@/store/adminBlogStore";
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

export default function BlogEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const {
    blog,
    fetchBlogById,
    updateBlog,
    loading,
    saving,
  } = useAdminBlogStore();

  /* ---------------- form state ---------------- */
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    date: "",
    category: "Fashion",
    tags: [],
    image: "",
    content: "",
    isPublished: true,
  });
const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  /* ---------------- derived ---------------- */
  const previewSlug = useMemo(
    () => (form.slug ? slugify(form.slug) : slugify(form.title)),
    [form.slug, form.title]
  );

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  /* ---------------- load blog ---------------- */
  useEffect(() => {
    if (id) fetchBlogById(id);
  }, [id, fetchBlogById]);

  useEffect(() => {
    if (!blog) return;

    setForm({
      title: blog.title || "",
      slug: blog.slug || "",
      excerpt: blog.excerpt || "",
      date: toDateInput(blog.date || blog.createdAt),
      category: blog.category || "Fashion",
      tags: Array.isArray(blog.tags) ? blog.tags : [],
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

    set("tags", Array.from(new Set([...form.tags, ...parts])));
    setTagsInput("");
  };

  const removeTag = (t) =>
    set("tags", form.tags.filter((x) => x !== t));

  /* ---------------- submit ---------------- */
  const handleSubmit = async () => {
    if (!form.title.trim()) return alert("Title is required");
    if (!form.excerpt.trim()) return alert("Excerpt is required");

    await updateBlog(id, {
      ...form,
      slug: previewSlug,
      tags: form.tags || [],
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
      <div className=" mx-auto px-6 py-12 space-y-10">

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

            <h1 className="text-3xl font-semibold text-black mt-3">
              Edit Blog
            </h1>

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
            {/* TITLE */}
            <div>
              <label className="text-xs font-medium text-gray-500">
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              />
            </div>

            {/* SLUG */}
            <div>
              <label className="text-xs font-medium text-gray-500">
                Slug
              </label>
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

          {/* EXCERPT */}
          <div>
            <label className="text-xs font-medium text-gray-500">
              Excerpt *
            </label>
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
            {/* DATE */}
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

            {/* CATEGORY */}
            <div>
              <label className="text-xs font-medium text-gray-500">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              />
            </div>

            {/* STATUS */}
            <div>
              <label className="text-xs font-medium text-gray-500">
                Status
              </label>
              <select
                value={String(form.isPublished)}
                onChange={(e) =>
                  set("isPublished", e.target.value === "true")
                }
                className="mt-2 w-full bg-transparent border-b border-gray-200 focus:border-black outline-none py-2 text-sm"
              >
                <option value="true">Published</option>
                <option value="false">Draft</option>
              </select>
            </div>
          </div>

          {/* TAGS */}
          <div>
            <label className="text-xs font-medium text-gray-500">
              Tags
            </label>
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

            {!!form.tags.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700"
                  >
                    {t}
                    <button
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

          <p className="text-xs text-gray-400">
            Supports markdown-style formatting
          </p>
        </div>
      </div>
    </section>
  );
}
