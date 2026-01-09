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
  Check,
  GripVertical,
  Search,
} from "lucide-react";

import Media from "@/components/common/media";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [inlineForm, setInlineForm] = useState(null);

  // Inline add subcategory state (per node)
  const [addChildOpenId, setAddChildOpenId] = useState(null);
  const [childForm, setChildForm] = useState({
    name: "",
    description: "",
    image: "",
    sortOrder: 0,
    number: "",
    icon: "",
    isActive: true,
    isFeatured: false,
  });

  const [expanded, setExpanded] = useState({});

  // Media Modal
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState("inline"); // inline | create | child

  // Drag & drop state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Create form (for root category only)
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
      const parentId = c.parent?._id ?? c.parent ?? null;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[c._id]);
      } else {
        roots.push(map[c._id]);
      }
    });

    // sort children by sortOrder
    const sortTree = (nodes) => {
      nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      nodes.forEach((n) => sortTree(n.children));
    };

    sortTree(roots);
    return roots;
  };

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  /* ---------------------------------------------------------
      SEARCH FILTER TREE
      - Keep node if it matches OR any child matches
  --------------------------------------------------------- */
  const filterTree = (nodes, term) => {
    if (!term) return nodes;
    const t = term.toLowerCase().trim();
    const deepFilter = (arr) => {
      return arr
        .map((node) => {
          const matches = node.name?.toLowerCase().includes(t);
          const kids = deepFilter(node.children || []);
          if (matches || kids.length) return { ...node, children: kids };
          return null;
        })
        .filter(Boolean);
    };
    return deepFilter(nodes);
  };

  const filteredTree = useMemo(
    () => filterTree(categoryTree, search),
    [categoryTree, search]
  );

  /* ---------------------------------------------------------
      CREATE HANDLERS (ROOT)
  --------------------------------------------------------- */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
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

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Name required");
    setSaving(true);

    const payload = {
      ...form,
      parent: form.parent === "" ? null : form.parent,
      number: form.number === "" ? null : Number(form.number),
      sortOrder: form.sortOrder === "" ? 0 : Number(form.sortOrder),
    };

    try {
      const res = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message);

      resetForm();
      fetchCategories();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------
      INLINE EDIT HANDLERS
  --------------------------------------------------------- */
  const startInlineEdit = (cat) => {
    setEditingId(cat._id);
    setInlineForm({
      name: cat.name,
      description: cat.description || "",
      parent: cat.parent?._id || cat.parent || "",
      number: cat.number ?? "",
      sortOrder: cat.sortOrder ?? 0,
      isActive: !!cat.isActive,
      isFeatured: !!cat.isFeatured,
      image: cat.image || "",
      icon: cat.icon || "",
    });

    // close child form if open
    setAddChildOpenId(null);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setInlineForm(null);
  };

  const updateInline = (field, value) => {
    setInlineForm((p) => ({ ...p, [field]: value }));
  };

  const saveInlineEdit = async () => {
    if (!editingId || !inlineForm) return;
    if (!inlineForm.name.trim()) return alert("Name required");

    setSaving(true);
    const payload = {
      ...inlineForm,
      parent: inlineForm.parent === "" ? null : inlineForm.parent,
      number: inlineForm.number === "" ? null : Number(inlineForm.number),
      sortOrder: inlineForm.sortOrder === "" ? 0 : Number(inlineForm.sortOrder),
    };

    try {
      const res = await fetch(`${API}/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message);

      cancelInlineEdit();
      fetchCategories();
    } catch (err) {
      console.error("Inline Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------
      INLINE ADD SUBCATEGORY
  --------------------------------------------------------- */
  const openAddChild = (parentId) => {
    setAddChildOpenId(parentId);
    setChildForm({
      name: "",
      description: "",
      image: "",
      sortOrder: 0,
      number: "",
      icon: "",
      isActive: true,
      isFeatured: false,
    });

    setEditingId(null);
    setInlineForm(null);

    // auto expand parent
    setExpanded((p) => ({ ...p, [parentId]: true }));
  };

  const saveChild = async (parentId) => {
    if (!childForm.name.trim()) return alert("Name required");
    setSaving(true);

    const payload = {
      ...childForm,
      parent: parentId,
      number: childForm.number === "" ? null : Number(childForm.number),
      sortOrder: childForm.sortOrder === "" ? 0 : Number(childForm.sortOrder),
    };

    try {
      const res = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message);

      setAddChildOpenId(null);
      fetchCategories();
    } catch (err) {
      console.error("Child save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------
      DELETE
  --------------------------------------------------------- */
  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        return alert(data.message);
      }
      fetchCategories();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  /* ---------------------------------------------------------
      MEDIA SELECTION
  --------------------------------------------------------- */
  const handleMediaSelect = (item) => {
    if (!item?.url) return;

    if (mediaTarget === "create") {
      setForm((p) => ({ ...p, image: item.url }));
    } else if (mediaTarget === "child") {
      setChildForm((p) => ({ ...p, image: item.url }));
    } else {
      setInlineForm((p) => ({ ...p, image: item.url }));
    }
  };

  const clearSelectedImage = () => {
    if (mediaTarget === "create") setForm((p) => ({ ...p, image: "" }));
    else if (mediaTarget === "child") setChildForm((p) => ({ ...p, image: "" }));
    else setInlineForm((p) => ({ ...p, image: "" }));
  };

  /* ---------------------------------------------------------
      DRAG & DROP REORDER
      - Works within same parent / same level
      - Updates sortOrder for siblings and saves to backend
  --------------------------------------------------------- */
  const getParentIdOf = (node) => node.parent?._id || node.parent || null;

  const reorderSiblings = async (parentId, fromId, toId) => {
    const siblings = categories
      .filter((c) => (c.parent?._id || c.parent || null) === parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const fromIndex = siblings.findIndex((x) => x._id === fromId);
    const toIndex = siblings.findIndex((x) => x._id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const updated = [...siblings];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // assign new sortOrder in steps of 10
    const newOrders = updated.map((item, idx) => ({
      _id: item._id,
      sortOrder: (idx + 1) * 10,
    }));

    // optimistic update UI
    setCategories((prev) =>
      prev.map((c) => {
        const found = newOrders.find((x) => x._id === c._id);
        return found ? { ...c, sortOrder: found.sortOrder } : c;
      })
    );

    // save to backend
    setSaving(true);
    try {
      await Promise.all(
        newOrders.map((x) =>
          fetch(`${API}/api/categories/${x._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: x.sortOrder }),
          })
        )
      );
    } catch (err) {
      console.error("Reorder save error:", err);
      alert("Reorder failed. Please refresh.");
    } finally {
      setSaving(false);
      fetchCategories();
    }
  };

  /* ---------------------------------------------------------
      TREE NODE
  --------------------------------------------------------- */
  const TreeNode = ({ node, level = 0 }) => {
    const hasChildren = node.children.length > 0;
    const isEditing = editingId === node._id;
    const isAddingChild = addChildOpenId === node._id;

    const parentId = getParentIdOf(node);

    return (
      <div className="mb-2">
        {/* Row */}
        <div
          draggable
          onDragStart={() => setDraggingId(node._id)}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId(node._id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!draggingId || draggingId === node._id) return;

            // only reorder if same parent
            const draggingNode = categories.find((x) => x._id === draggingId);
            if (!draggingNode) return;

            const dragParent = getParentIdOf(draggingNode);
            if (dragParent !== parentId) {
              alert("Reorder only works within same parent level.");
              return;
            }

            reorderSiblings(parentId, draggingId, node._id);
          }}
          className={`group flex items-center justify-between rounded-2xl px-3 py-3 transition bg-white ${
            dragOverId === node._id ? "outline outline-1 outline-black" : ""
          }`}
          style={{ marginLeft: `${level * 18}px` }}
        >
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <div className="cursor-grab text-gray-300 group-hover:text-black transition">
              <GripVertical size={18} />
            </div>

            {/* Expand */}
            {hasChildren ? (
              <button
                onClick={() =>
                  setExpanded((p) => ({ ...p, [node._id]: !p[node._id] }))
                }
                className="text-gray-400 hover:text-black transition"
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

            {/* Image */}
            <div className="w-11 h-11 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center">
              {node.image ? (
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
              <p className="font-semibold text-black">{node.name}</p>
              <p className="text-[11px] text-gray-500">
                {node.parent ? "Subcategory" : "Main Category"} • sortOrder:{" "}
                {node.sortOrder ?? 0}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add Subcategory */}
            {!isEditing && (
              <button
                onClick={() => openAddChild(node._id)}
                className="px-3 py-2 rounded-xl text-xs bg-black text-white hover:opacity-90 transition"
              >
                <span className="inline-flex items-center gap-1">
                  <Plus size={14} /> Add Sub
                </span>
              </button>
            )}

            {!isEditing ? (
              <>
                <button
                  onClick={() => startInlineEdit(node)}
                  className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(node._id)}
                  className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={saving}
                  onClick={saveInlineEdit}
                  className="p-2 rounded-xl bg-black text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={cancelInlineEdit}
                  className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition"
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Edit */}
        {isEditing && inlineForm && (
          <div
            className="mt-2 rounded-2xl bg-white p-4"
            style={{ marginLeft: `${level * 18}px` }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={inlineForm.name}
                onChange={(e) => updateInline("name", e.target.value)}
                placeholder="Name"
                className="input"
              />

              <select
                value={inlineForm.parent}
                onChange={(e) => updateInline("parent", e.target.value)}
                className="input"
              >
                <option value="">No Parent</option>
                {categories
                  .filter((cat) => cat._id !== editingId)
                  .map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
              </select>

              <input
                value={inlineForm.description}
                onChange={(e) => updateInline("description", e.target.value)}
                placeholder="Description"
                className="input"
              />

              <input
                value={inlineForm.sortOrder}
                onChange={(e) => updateInline("sortOrder", e.target.value)}
                placeholder="Sort Order"
                className="input"
              />
            </div>

            {/* Image */}
            <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center">
                  {inlineForm.image ? (
                    <img
                      src={inlineForm.image}
                      alt="Category"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-black">Image</p>
                  <p className="text-xs text-gray-500">Pick from media or URL</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaTarget("inline");
                    setMediaOpen(true);
                  }}
                  className="btn"
                >
                  Select Media
                </button>

                {inlineForm.image && (
                  <button
                    type="button"
                    onClick={() => {
                      setMediaTarget("inline");
                      clearSelectedImage();
                    }}
                    className="btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <input
              value={inlineForm.image}
              onChange={(e) => updateInline("image", e.target.value)}
              placeholder="Paste Image URL"
              className="input mt-3"
            />
          </div>
        )}

        {/* Inline Add Child */}
        {isAddingChild && (
          <div
            className="mt-2 rounded-2xl bg-white p-4"
            style={{ marginLeft: `${(level + 1) * 18}px` }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-black">Add Subcategory</p>
              <button
                className="p-2 rounded-xl bg-black/5 hover:bg-black/10"
                onClick={() => setAddChildOpenId(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={childForm.name}
                onChange={(e) =>
                  setChildForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Name"
                className="input"
              />

              <input
                value={childForm.sortOrder}
                onChange={(e) =>
                  setChildForm((p) => ({ ...p, sortOrder: e.target.value }))
                }
                placeholder="Sort Order"
                className="input"
              />

              <input
                value={childForm.description}
                onChange={(e) =>
                  setChildForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Description"
                className="input md:col-span-2"
              />
            </div>

            <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center">
                  {childForm.image ? (
                    <img
                      src={childForm.image}
                      alt="Child"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-black">Image</p>
                  <p className="text-xs text-gray-500">Pick from media or URL</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaTarget("child");
                    setMediaOpen(true);
                  }}
                  className="btn"
                >
                  Select Media
                </button>

                {childForm.image && (
                  <button
                    type="button"
                    onClick={() => {
                      setMediaTarget("child");
                      clearSelectedImage();
                    }}
                    className="btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <input
              value={childForm.image}
              onChange={(e) =>
                setChildForm((p) => ({ ...p, image: e.target.value }))
              }
              placeholder="Paste Image URL"
              className="input mt-3"
            />

            <div className="mt-4 flex gap-2">
              <button
                disabled={saving}
                onClick={() => saveChild(node._id)}
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Subcategory"}
              </button>
              <button
                onClick={() => setAddChildOpenId(null)}
                className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Children */}
        {expanded[node._id] &&
          node.children.map((child) => (
            <TreeNode key={child._id} node={child} level={level + 1} />
          ))}
      </div>
    );
  };

  return (
    <section className="min-h-screen bg-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-black">Categories</h1>
            <p className="text-sm text-gray-500 mt-1">
              Minimal category manager — inline edit, add subcategory & drag reorder.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCategories}
              className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 transition flex items-center gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-4 py-3">
          <Search size={18} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-transparent outline-none text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="p-2 rounded-xl hover:bg-black/10"
              title="Clear"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* CREATE ROOT CATEGORY */}
        <div className="rounded-2xl bg-black/5 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">Add New Category</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              {categories.map((cat) => (
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
              name="sortOrder"
              value={form.sortOrder}
              onChange={handleChange}
              placeholder="Sort Order"
              className="input"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} /> {saving ? "Saving..." : "Add Category"}
            </button>
          </div>
        </div>

        {/* TREE LIST */}
        <div className="rounded-2xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">Category Tree</h2>
            {saving && (
              <p className="text-xs text-gray-500">
                Saving changes...
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : filteredTree.length ? (
            filteredTree.map((node) => <TreeNode key={node._id} node={node} />)
          ) : (
            <p className="text-gray-500">No categories found.</p>
          )}
        </div>
      </div>

      {/* MEDIA PICKER MODAL */}
      {mediaOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Media Library</h3>
              <button
                onClick={() => setMediaOpen(false)}
                className="p-2 rounded-xl hover:bg-black/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <Media
                onSelect={(item) => {
                  handleMediaSelect(item);
                }}
                multiple={false}
              />
            </div>

            <div className="p-4 bg-black/5 flex justify-end">
              <button
                onClick={() => setMediaOpen(false)}
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          padding: 0.8rem 1rem;
          background: rgba(0, 0, 0, 0.05);
          outline: none;
          font-size: 14px;
        }
        .input:focus {
          background: rgba(0, 0, 0, 0.03);
          box-shadow: inset 0 0 0 1px black;
        }
        .btn {
          padding: 0.65rem 0.9rem;
          border-radius: 0.9rem;
          background: rgba(0, 0, 0, 0.05);
          transition: 0.2s;
          font-size: 13px;
        }
        .btn:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </section>
  );
}
