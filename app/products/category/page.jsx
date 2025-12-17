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
  X,
} from "lucide-react";
// Import your new component
import Media from "@/components/common/media"; 

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Media Modal state
  const [mediaOpen, setMediaOpen] = useState(false);

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
      FETCH ALL CATEGORIES
  --------------------------------------------------------- */
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/categories`, { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) setCategories(data);
      else setCategories([]);
    } catch (err) {
      console.error("Fetch error:", err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ---------------------------------------------------------
      BUILD CATEGORY TREE
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

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  /* ---------------------------------------------------------
      HANDLERS
  --------------------------------------------------------- */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleMediaSelect = (item) => {
    // If 'multiple' is false in Media component, 'item' is a single object
    if (item?.url) {
      setForm((p) => ({ ...p, image: item.url }));
    }
  };

  const clearSelectedImage = () => {
    setForm((p) => ({ ...p, image: "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      parent: form.parent === "" ? null : form.parent,
      number: form.number === "" ? null : Number(form.number),
      sortOrder: form.sortOrder === "" ? 0 : Number(form.sortOrder),
    };

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
      if (!res.ok) return alert(data.message);

      alert(editingId ? "Category Updated!" : "Category Created!");
      resetForm();
      fetchCategories();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
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

  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`${API}/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        return alert(data.message);
      }
      alert("Category deleted");
      fetchCategories();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  /* ---------------------------------------------------------
      TREE NODE COMPONENT
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
                onClick={() => setExpanded((p) => ({ ...p, [node._id]: !p[node._id] }))}
                className="text-gray-600"
              >
                {expanded[node._id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            ) : (
              <span className="w-[18px]" />
            )}

            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center border">
              {node.image ? (
                <img src={node.image} alt={node.name} className="w-full h-full object-cover" />
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
            <button onClick={() => handleEdit(node)} className="p-2 bg-blue-600 text-white rounded-lg">
              <Pencil size={16} />
            </button>
            <button onClick={() => handleDelete(node._id)} className="p-2 bg-red-600 text-white rounded-lg">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {expanded[node._id] &&
          node.children.map((child) => <TreeNode key={child._id} node={child} level={level + 1} />)}
      </div>
    );
  };

  return (
    <section className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Manage Categories</h1>
          <button onClick={fetchCategories} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg">
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        {/* FORM */}
        <div className="bg-white p-6 rounded-2xl shadow space-y-4">
          <h2 className="text-xl font-semibold">{editingId ? "Edit Category" : "Add New Category"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="input" />
            <select name="parent" value={form.parent} onChange={handleChange} className="input">
              <option value="">No Parent (Main Category)</option>
              {categories
                .filter((cat) => cat._id !== editingId)
                .map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
            </select>
            <input name="description" value={form.description} onChange={handleChange} placeholder="Description" className="input" />
            <input name="number" value={form.number} onChange={handleChange} placeholder="Category Number" className="input" />
            <input name="sortOrder" value={form.sortOrder} onChange={handleChange} placeholder="Sort Order" className="input" />

            <div className="md:col-span-2 bg-gray-50 rounded-2xl p-4 border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white overflow-hidden flex items-center justify-center border">
                    {form.image ? (
                      <img src={form.image} alt="Category" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">Category Image</p>
                    <p className="text-xs text-gray-600">Select an image for this category.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMediaOpen(true)} className="btn-ghost">
                    <ImageIcon size={16} /> Select / Upload Media
                  </button>
                  {form.image && (
                    <button type="button" onClick={clearSelectedImage} className="btn-danger">
                      <X size={16} /> Remove
                    </button>
                  )}
                </div>
              </div>
              <input name="image" value={form.image} onChange={handleChange} placeholder="Or paste Image URL" className="input mt-3" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl">
            <Plus size={18} /> {saving ? "Saving..." : editingId ? "Save Changes" : "Add Category"}
          </button>
        </div>

        {/* TREE LIST */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-xl font-semibold mb-4">Category Tree</h2>
          {loading ? <p>Loading...</p> : categoryTree.length ? (
            categoryTree.map((node) => <TreeNode key={node._id} node={node} />)
          ) : <p className="text-gray-600">No categories found.</p>}
        </div>
      </div>

      {/* NEW MEDIA PICKER MODAL */}
      {mediaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Media Library</h3>
              <button onClick={() => setMediaOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <Media 
                onSelect={(item) => {
                    handleMediaSelect(item);
                    // We don't close automatically so user can see the 'Check' mark, 
                    // or you can setMediaOpen(false) here if you want instant close.
                }} 
                multiple={false} 
              />
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
               <button onClick={() => setMediaOpen(false)} className="btn-primary">
                 Done
               </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input { background: #f3f4f6; padding: 0.75rem 1rem; border-radius: 0.75rem; outline: none; width: 100%; }
        .btn-ghost { display: inline-flex; align-items: center; gap: 0.5rem; background: #f3f4f6; padding: 0.6rem 0.9rem; border-radius: 0.75rem; font-size: 14px; }
        .btn-danger { display: inline-flex; align-items: center; gap: 0.5rem; background: #ef4444; color: white; padding: 0.6rem 0.9rem; border-radius: 0.75rem; font-size: 14px; }
        .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: #111827; color: white; padding: 0.6rem 0.9rem; border-radius: 0.75rem; }
      `}</style>
    </section>
  );
}