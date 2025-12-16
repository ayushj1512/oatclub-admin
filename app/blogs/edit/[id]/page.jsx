// app/blogs/edit/[id]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  Sparkles,
  Image as ImageIcon,
  Upload,
  X,
  RefreshCw,
  Search,
  ArrowLeft,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/--+/g, "-");

export default function BlogEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Media picker state (same as create)
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaPages, setMediaPages] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaQ, setMediaQ] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    date: "", // yyyy-mm-dd
    category: "Fashion",
    tags: [],
    image: "",
    content: "",
    isPublished: true,
  });

  const [tagsInput, setTagsInput] = useState("");

  const previewSlug = useMemo(
    () => (form.slug ? slugify(form.slug) : slugify(form.title)),
    [form.slug, form.title]
  );

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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

  const useAutoSlug = () => set("slug", previewSlug);

  const toDateInput = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    // yyyy-mm-dd for <input type="date">
    return dt.toISOString().slice(0, 10);
  };

  /* ---------------------------------------------------------
     LOAD BLOG BY ID
  --------------------------------------------------------- */
  const loadBlog = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/blogs/${id}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to load blog");

      setForm({
        title: d.title || "",
        slug: d.slug || "",
        excerpt: d.excerpt || "",
        date: toDateInput(d.date || d.createdAt || ""),
        category: d.category || "Fashion",
        tags: Array.isArray(d.tags) ? d.tags : [],
        image: d.image || "",
        content: d.content || "",
        isPublished: d.isPublished ?? true,
      });
      setTagsInput("");
    } catch (e) {
      console.error("❌ load blog:", e);
      alert(e.message || "Failed to load blog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ---------------------------------------------------------
     MEDIA: FETCH (GET /api/media)
  --------------------------------------------------------- */
  const fetchMedia = async (page = 1, q = mediaQ) => {
    try {
      setMediaLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "36");
      params.set("type", "image");
      if (q) params.set("q", q);

      const res = await fetch(`${API}/api/media?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("❌ getMedia failed:", data);
        setMediaItems([]);
        setMediaPages(1);
        setMediaPage(1);
        return;
      }

      setMediaItems(Array.isArray(data.items) ? data.items : []);
      setMediaPages(Number(data.pages) || 1);
      setMediaPage(Number(data.page) || page);
    } catch (err) {
      console.error("❌ fetchMedia error:", err);
      setMediaItems([]);
      setMediaPages(1);
      setMediaPage(1);
    } finally {
      setMediaLoading(false);
    }
  };

  const openMediaPicker = async () => {
    setMediaOpen(true);
    setMediaQ("");
    setMediaPage(1);
    await fetchMedia(1, "");
  };

  const selectMedia = (url) => {
    set("image", url || "");
    setMediaOpen(false);
  };

  const clearSelectedImage = () => set("image", "");

  /* ---------------------------------------------------------
     MEDIA: UPLOAD (POST /api/media/upload)
     field name: files
  --------------------------------------------------------- */
  const handleUploadImage = async (file) => {
    if (!file) return;

    try {
      setUploading(true);

      const fd = new FormData();
      fd.append("files", file);
      fd.append("folder", "miray/blogs");

      const res = await fetch(`${API}/api/media/upload`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ upload failed:", data);
        alert(data?.message || "Upload failed");
        return;
      }

      const first = data?.media?.[0];
      if (first?.url) set("image", first.url);

      await fetchMedia(1, mediaQ);
    } catch (err) {
      console.error("❌ handleUploadImage error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------------------------------------------------
     UPDATE BLOG
  --------------------------------------------------------- */
  const save = async () => {
    if (!form.title.trim()) return alert("Title required");
    if (!form.excerpt.trim()) return alert("Excerpt required");
    if (!form.category.trim()) return alert("Category required");

    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: previewSlug,
        tags: form.tags || [],
        // date is optional; keep it if provided
      };

      const r = await fetch(`${API}/api/blogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Update failed");

      alert("Blog updated ✅");
      router.push("/blogs/all");
    } catch (e) {
      console.error("❌ update blog:", e);
      alert(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-gray-600">Loading...</div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/blogs/all")}
              className="inline-flex items-center gap-2 px-3 py-2 border bg-white hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Blog</h1>
              <p className="text-xs text-gray-500">Update fields and click Save.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadBlog}
              className="inline-flex items-center gap-2 px-3 py-2 border bg-white hover:bg-gray-50"
              title="Reload"
            >
              <RefreshCw size={18} />
              Reload
            </button>

            <button
              onClick={save}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white ${
                saving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
              }`}
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="bg-white border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
                placeholder="Gen-Z Western Outfits Taking Over 2025"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-1">Slug *</label>
              <div className="flex gap-2">
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  className="flex-1 bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
                  placeholder="genz-western-outfits-2025"
                />
                <button
                  type="button"
                  onClick={useAutoSlug}
                  className="px-3 py-2 border bg-white hover:bg-gray-50 inline-flex items-center gap-2"
                  title="Generate from title"
                >
                  <Sparkles size={16} />
                  Auto
                </button>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Preview: <b>{previewSlug || "-"}</b>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-1">Category *</label>
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
                placeholder="Fashion / Lifestyle / Trends / Guides"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-800 block mb-1">Published</label>
                <select
                  value={String(form.isPublished)}
                  onChange={(e) => set("isPublished", e.target.value === "true")}
                  className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
                >
                  <option value="true">Yes</option>
                  <option value="false">No (Draft)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1">Excerpt *</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
              rows={3}
              placeholder="Short summary shown on listing cards..."
            />
          </div>

          {/* COVER IMAGE: MEDIA PICKER + UPLOAD */}
          <div className="border bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white border overflow-hidden flex items-center justify-center">
                  {!!form.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">Cover Image</div>
                  <div className="text-xs text-gray-600">Choose from Media or upload new (Cloudinary).</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={openMediaPicker}
                  className="px-3 py-2 border bg-white hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <ImageIcon size={16} />
                  Select from Media
                </button>

                <label className="px-3 py-2 border bg-white hover:bg-gray-50 inline-flex items-center gap-2 cursor-pointer">
                  <Upload size={16} />
                  {uploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleUploadImage(e.target.files?.[0])}
                  />
                </label>

                {!!form.image && (
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
                  >
                    <X size={16} />
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-semibold text-gray-800 block mb-1">Cover Image URL</label>
              <input
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
                placeholder="https://...jpg"
              />
            </div>

            {!!form.image && (
              <div className="mt-3 border bg-white p-3">
                <div className="text-xs text-gray-600 mb-2">Preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="cover preview" className="w-full max-h-64 object-contain bg-white" />
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1">Tags (comma separated)</label>
            <div className="flex gap-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="flex-1 bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
                placeholder="Western, GenZ, Streetwear"
              />
              <button type="button" onClick={addTags} className="px-4 bg-blue-600 hover:bg-blue-700 text-white">
                Add
              </button>
            </div>

            {!!form.tags?.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-xs px-3 py-1 bg-gray-100 border hover:bg-gray-200"
                    title="Remove"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 px-3 py-2 outline-none"
              rows={12}
              placeholder={`Supports markdown-like text.\n\nExample:\n✨ **What’s Trending?**\n• Oversized jackets...`}
            />
          </div>
        </div>
      </div>

      {/* MEDIA PICKER MODAL */}
      {mediaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Select Cover Image</div>
                <div className="text-xs text-gray-600">From /api/media (Cloudinary-backed)</div>
              </div>
              <button onClick={() => setMediaOpen(false)} className="p-2 hover:bg-gray-100">
                <X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-2 w-full md:w-[420px]">
                  <Search size={16} className="text-gray-500" />
                  <input
                    value={mediaQ}
                    onChange={(e) => setMediaQ(e.target.value)}
                    placeholder="Search media by name / folder..."
                    className="bg-transparent outline-none w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 border bg-white hover:bg-gray-50 inline-flex items-center gap-2"
                    onClick={() => fetchMedia(1, mediaQ)}
                    disabled={mediaLoading}
                  >
                    <RefreshCw size={16} />
                    Search
                  </button>

                  <label className="px-3 py-2 border bg-white hover:bg-gray-50 inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e.target.files?.[0])}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {mediaLoading ? (
                <p className="text-gray-600">Loading media...</p>
              ) : mediaItems.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaItems.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => selectMedia(m.url)}
                      className="group border border-gray-200 overflow-hidden hover:border-black text-left"
                      title={m.originalName || m.publicId}
                    >
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt={m.originalName || "media"}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{m.originalName || m.publicId}</p>
                        <p className="text-[10px] text-gray-500 truncate">{m.folder || ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No media found.</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-600">
                  Page {mediaPage} of {mediaPages}
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 border bg-white hover:bg-gray-50"
                    disabled={mediaPage <= 1 || mediaLoading}
                    onClick={() => fetchMedia(mediaPage - 1, mediaQ)}
                  >
                    Prev
                  </button>
                  <button
                    className="px-3 py-2 border bg-white hover:bg-gray-50"
                    disabled={mediaPage >= mediaPages || mediaLoading}
                    onClick={() => fetchMedia(mediaPage + 1, mediaQ)}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="border bg-gray-50 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white border overflow-hidden flex items-center justify-center">
                    {!!form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.image} alt="selected" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Selected</div>
                    <div className="text-xs text-gray-600 truncate max-w-[520px]">
                      {form.image || "None"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
                    onClick={clearSelectedImage}
                    disabled={!form.image}
                  >
                    <X size={16} />
                    Clear
                  </button>
                  <button className="px-3 py-2 bg-black hover:bg-gray-900 text-white" onClick={() => setMediaOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
