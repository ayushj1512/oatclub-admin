"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  X,
  Search,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Media picker state
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaPages, setMediaPages] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaQ, setMediaQ] = useState("");
  const [mediaType, setMediaType] = useState("image"); // we only need images for category
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    parent: "",
    number: "",
    sortOrder: 0,
    isActive: true,
    isFeatured: false,
    image: "",
    icon: "",
  });

  /* ---------------------------------------------------------
     FETCH ALL CATEGORIES (safe array check)
  --------------------------------------------------------- */
  const fetchCategories = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API}/api/categories`, { cache: "no-store" });
      const data = await res.json();

      console.log("🔥 CATEGORY API RESPONSE:", data);

      if (Array.isArray(data)) setCategories(data);
      else {
        console.error("❌ Expected array but got:", data);
        setCategories([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setCategories([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ---------------------------------------------------------
     BUILD CATEGORY TREE (safe for non-array)
  --------------------------------------------------------- */
  const buildTree = (list) => {
    if (!Array.isArray(list)) return [];

    const map = {};
    const roots = [];

    list.forEach((c) => {
      map[c._id] = { ...c, children: [] };
    });

    list.forEach((c) => {
      const parentId = c.parent?._id ?? null;

      if (parentId && map[parentId]) {
        map[parentId].children.push(map[c._id]);
      } else {
        roots.push(map[c._id]);
      }
    });

    return roots;
  };

  const categoryTree = Array.isArray(categories) ? buildTree(categories) : [];

  /* ---------------------------------------------------------
     FORM HANDLER
  --------------------------------------------------------- */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ---------------------------------------------------------
     MEDIA: FETCH
  --------------------------------------------------------- */
  const fetchMedia = async (page = 1, q = mediaQ, type = mediaType) => {
    try {
      setMediaLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "36");
      if (q) params.set("q", q);
      if (type) params.set("type", type);

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
    await fetchMedia(1, "", "image");
  };

  const selectMedia = (url) => {
    setForm((p) => ({ ...p, image: url || "" }));
    setMediaOpen(false);
  };

  const clearSelectedImage = () => {
    setForm((p) => ({ ...p, image: "" }));
  };

  /* ---------------------------------------------------------
     MEDIA: UPLOAD
     Uses your endpoint: POST /api/media/upload
     Field: files (multiple allowed) but we'll pass just 1 file
  --------------------------------------------------------- */
  const handleUploadImage = async (file) => {
    if (!file) return;

    try {
      setUploading(true);

      const fd = new FormData();
      fd.append("files", file); // must match uploadAny.array("files", 25)
      fd.append("folder", "miray/categories"); // optional, nice to keep categories separate

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
      if (first?.url) {
        setForm((p) => ({ ...p, image: first.url }));
      }

      // refresh media grid so the new upload appears
      await fetchMedia(1, mediaQ, "image");
    } catch (err) {
      console.error("❌ handleUploadImage error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------------------------------------------------
     CREATE / UPDATE CATEGORY
  --------------------------------------------------------- */
  const handleSave = async () => {
    setSaving(true);

    const payload = {
      ...form,
      parent: form.parent === "" ? null : form.parent,
      // number/sortOrder might come as strings from inputs; backend accepts it but we can normalize:
      number: form.number === "" ? null : Number(form.number),
      sortOrder: form.sortOrder === "" ? 0 : Number(form.sortOrder),
    };

    console.log("📦 SAVE PAYLOAD:", payload);

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${API}/api/categories/${editingId}`
      : `${API}/api/categories`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("🟢 SAVE RESPONSE:", data);

      if (!res.ok) return alert(data.message);

      alert(editingId ? "Category Updated!" : "Category Created!");

      resetForm();
      fetchCategories();
    } catch (err) {
      console.error("Save error:", err);
    }

    setSaving(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      parent: "",
      number: "",
      sortOrder: 0,
      isActive: true,
      isFeatured: false,
      image: "",
      icon: "",
    });
  };

  /* ---------------------------------------------------------
     LOAD CATEGORY INTO FORM
  --------------------------------------------------------- */
  const handleEdit = (cat) => {
    setEditingId(cat._id);

    setForm({
      name: cat.name,
      description: cat.description || "",
      parent: cat.parent?._id || "",
      number: cat.number ?? "",
      sortOrder: cat.sortOrder ?? 0,
      isActive: !!cat.isActive,
      isFeatured: !!cat.isFeatured,
      image: cat.image || "",
      icon: cat.icon || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------------------------------------------------
     DELETE CATEGORY
  --------------------------------------------------------- */
  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;

    try {
      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message);

      alert("Category deleted");
      fetchCategories();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  /* ---------------------------------------------------------
     TREE NODE (Recursive)
  --------------------------------------------------------- */
  const TreeNode = ({ node, level = 0 }) => {
    const hasChildren = node.children.length > 0;

    return (
      <div className="mb-1">
        <div
          className="flex items-center justify-between bg-gray-100 p-3 rounded-xl"
          style={{ marginLeft: `${level * 20}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                onClick={() =>
                  setExpanded((p) => ({ ...p, [node._id]: !p[node._id] }))
                }
                className="text-gray-600"
              >
                {expanded[node._id] ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            ) : (
              <span className="w-[18px]" />
            )}

            {/* small thumbnail if available */}
            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center border">
              {node.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={node.image}
                  alt={node.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={18} className="text-gray-400" />
              )}
            </div>

            <div>
              <p className="font-semibold text-gray-900">{node.name}</p>
              <p className="text-xs text-gray-600">
                {node.parent ? "Subcategory" : "Main Category"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(node)}
              className="p-2 bg-blue-600 text-white rounded-lg"
            >
              <Pencil size={16} />
            </button>

            <button
              onClick={() => handleDelete(node._id)}
              className="p-2 bg-red-600 text-white rounded-lg"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {expanded[node._id] &&
          node.children.map((child) => (
            <TreeNode key={child._id} node={child} level={level + 1} />
          ))}
      </div>
    );
  };

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <section className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Manage Categories</h1>

          <button
            onClick={fetchCategories}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* FORM */}
        <div className="bg-white p-6 rounded-2xl shadow space-y-4">
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Category" : "Add New Category"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              className="input"
            />

            <select
              name="parent"
              value={form.parent}
              onChange={handleChange}
              className="input"
            >
              <option value="">No Parent (Main Category)</option>
              {categories
                .filter((cat) => cat._id !== editingId)
                .map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
            </select>

            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description"
              className="input"
            />

            <input
              name="number"
              value={form.number}
              onChange={handleChange}
              placeholder="Category Number"
              className="input"
            />

            <input
              name="sortOrder"
              value={form.sortOrder}
              onChange={handleChange}
              placeholder="Sort Order"
              className="input"
            />

            {/* CATEGORY IMAGE FIELD */}
            <div className="md:col-span-2 bg-gray-50 rounded-2xl p-4 border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white overflow-hidden flex items-center justify-center border">
                    {form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.image}
                        alt="Category"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-400" />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold">Category Image</p>
                    <p className="text-xs text-gray-600">
                      Choose from Media or upload new image.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={openMediaPicker}
                    className="btn-ghost"
                  >
                    <ImageIcon size={16} />
                    Select from Media
                  </button>

                  <label className="btn-ghost cursor-pointer">
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

                  {form.image ? (
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="btn-danger"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              {/* also store raw URL if you want to paste */}
              <div className="mt-3">
                <input
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="Image URL (optional)"
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl"
          >
            <Plus size={18} />
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Category"}
          </button>
        </div>

        {/* TREE */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-xl font-semibold mb-4">Category Tree</h2>

          {loading ? (
            <p>Loading...</p>
          ) : categoryTree.length ? (
            categoryTree.map((node) => <TreeNode key={node._id} node={node} />)
          ) : (
            <p className="text-gray-600">No categories found.</p>
          )}
        </div>
      </div>

      {/* MEDIA PICKER MODAL */}
      {mediaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">Select Category Image</p>
                <p className="text-xs text-gray-600">
                  Pick from your uploaded media or upload a new image.
                </p>
              </div>

              <button
                onClick={() => setMediaOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-full md:w-[420px]">
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
                    className="btn-ghost"
                    onClick={() => fetchMedia(1, mediaQ, "image")}
                    disabled={mediaLoading}
                  >
                    <RefreshCw size={16} />
                    Search
                  </button>

                  <label className="btn-ghost cursor-pointer">
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
                      className="group border rounded-xl overflow-hidden hover:ring-2 hover:ring-black text-left"
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
                        <p className="text-xs font-medium truncate">
                          {m.originalName || m.publicId}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {m.folder || ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No media found.</p>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-600">
                  Page {mediaPage} of {mediaPages}
                </p>

                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    disabled={mediaPage <= 1 || mediaLoading}
                    onClick={() => fetchMedia(mediaPage - 1, mediaQ, "image")}
                  >
                    Prev
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={mediaPage >= mediaPages || mediaLoading}
                    onClick={() => fetchMedia(mediaPage + 1, mediaQ, "image")}
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Current selection preview */}
              <div className="bg-gray-50 border rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center border">
                    {form.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.image}
                        alt="Selected"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Selected</p>
                    <p className="text-xs text-gray-600 truncate max-w-[520px]">
                      {form.image || "None"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn-danger"
                    onClick={clearSelectedImage}
                    disabled={!form.image}
                  >
                    <X size={16} />
                    Clear
                  </button>

                  <button
                    className="btn-primary"
                    onClick={() => setMediaOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          background: #f3f4f6;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          outline: none;
          width: 100%;
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #f3f4f6;
          padding: 0.6rem 0.9rem;
          border-radius: 0.75rem;
        }
        .btn-ghost:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-danger {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #ef4444;
          color: white;
          padding: 0.6rem 0.9rem;
          border-radius: 0.75rem;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #111827;
          color: white;
          padding: 0.6rem 0.9rem;
          border-radius: 0.75rem;
        }
      `}</style>
    </section>
  );
}
