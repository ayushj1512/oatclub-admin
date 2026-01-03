"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ImageIcon,
  Video,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { useHomepageSettingsStore } from "@/store/useHomepageSettingsStore";
import { useCategoryStore } from "@/store/categorystore";

// ✅ IMPORTANT: Only import ENTRY POINT (as per README)
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function TopCategoriesPage() {
  /* ---------------- Stores ---------------- */
  const {
    categoryRow,
    loading: hpLoading,
    saving,
    error: hpError,
    success,
    fetchHomepageSettings,
    setCategoryRowLocal,
    updateCategoryRow,
    clearMessages,
  } = useHomepageSettingsStore();

  const { categories, loading: catLoading, error: catError, fetchCategories } =
    useCategoryStore();

  /* ---------------- Local state for adding ---------------- */
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [customName, setCustomName] = useState("");
  const [tag, setTag] = useState("");

  // ✅ selected media for "Add new" item
  const [selectedMedia, setSelectedMedia] = useState(null);

  /* ---------------- Media modal state ---------------- */
  const [openMediaModal, setOpenMediaModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    fetchHomepageSettings();
    fetchCategories();
  }, [fetchHomepageSettings, fetchCategories]);

  /* ---------------- Helpers ---------------- */
  const categoriesMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(c._id, c));
    return map;
  }, [categories]);

  const sortedRow = useMemo(() => {
    return [...(categoryRow || [])].sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
  }, [categoryRow]);

  const normalizeMediaToItem = (media) => {
    if (!media?.url) return { image: "", video: "", publicId: "" };
    if (media.resourceType === "video") {
      return { video: media.url, image: "", publicId: media.publicId || "" };
    }
    return { image: media.url, video: "", publicId: media.publicId || "" };
  };

  // ✅ Re-number sortOrder cleanly
  const normalizeSortOrders = (row) =>
    row.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));

  /* ---------------- Add Item ---------------- */
  const addItem = () => {
    const selectedCat = categoriesMap.get(selectedCategoryId);

    const name = customName?.trim() || selectedCat?.name?.trim();
    const slug = selectedCat?.slug || "";
    const finalTag = tag.trim();

    if (!name) return alert("Name is required");
    if (!slug && !finalTag) return alert("Select category OR enter a tag");
    if (!selectedMedia)
      return alert("Please select icon/media from Media Library");

    const mediaObj = normalizeMediaToItem(selectedMedia);

    const next = normalizeSortOrders([
      ...sortedRow,
      {
        name,
        slug: slug || "",
        tag: finalTag || "",
        image: mediaObj.image,
        video: mediaObj.video,
        publicId: mediaObj.publicId,
        isActive: true,
        sortOrder: sortedRow.length + 1,
      },
    ]);

    setCategoryRowLocal(next);

    // reset
    setSelectedCategoryId("");
    setCustomName("");
    setTag("");
    setSelectedMedia(null);
  };

  /* ---------------- Remove ---------------- */
  const removeItem = (index) => {
    const next = normalizeSortOrders(sortedRow.filter((_, i) => i !== index));
    setCategoryRowLocal(next);
  };

  /* ---------------- Update Field ---------------- */
  const updateField = (index, key, value) => {
    const next = [...sortedRow];
    next[index] = { ...next[index], [key]: value };
    setCategoryRowLocal(next);
  };

  /* ---------------- Move Up/Down rearrangement ---------------- */
  const moveItem = (from, to) => {
    if (to < 0 || to >= sortedRow.length) return;

    const next = [...sortedRow];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    // ✅ normalize sort orders after move
    setCategoryRowLocal(normalizeSortOrders(next));
  };

  /* ---------------- Media Modal ---------------- */
  const openNewMediaPicker = () => {
    setEditIndex(null);
    setOpenMediaModal(true);
  };

  const openEditMediaPicker = (idx) => {
    setEditIndex(idx);
    setOpenMediaModal(true);
  };

  const handleMediaSelect = (media) => {
    if (!media) return;

    const mediaObj = normalizeMediaToItem(media);

    if (editIndex !== null) {
      const next = [...sortedRow];
      next[editIndex] = {
        ...next[editIndex],
        image: mediaObj.image,
        video: mediaObj.video,
        publicId: mediaObj.publicId,
      };

      setCategoryRowLocal(next);
    } else {
      setSelectedMedia(media);
    }

    setOpenMediaModal(false);
  };

  /* ---------------- Save ---------------- */
  const saveRow = async () => {
    clearMessages();

    // ✅ Always send sorted row so backend reflects arrangement
    await updateCategoryRow(sortedRow);
  };

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">
            Top Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage category row icons + names shown on homepage.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchHomepageSettings();
              fetchCategories();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={saveRow}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="mt-5 space-y-2">
        {(hpLoading || catLoading) && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 text-gray-700">
            Loading...
          </div>
        )}
        {(hpError || catError) && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-red-50 shadow-sm ring-1 ring-red-200 text-red-700">
            {hpError || catError}
          </div>
        )}
        {success && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-green-50 shadow-sm ring-1 ring-green-200 text-green-700">
            {success}
          </div>
        )}
      </div>

      {/* ✅ Media Picker Modal */}
      <MediaPickerModal
        open={openMediaModal}
        onClose={() => setOpenMediaModal(false)}
        folder="miray/categories"
        onSelect={handleMediaSelect}
      />

      {/* Add Item */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-950 text-lg">
              Add Top Category
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Must have: name + (slug/tag) + media
            </p>
          </div>

          <button
            onClick={addItem}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-5">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="">Select Category (optional if using tag)</option>
            {categories?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>

          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Tag (optional) e.g. best-sellers, new-arrivals"
            className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Display Name Override (optional)"
            className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 px-4 py-3">
            <button
              onClick={openNewMediaPicker}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
            >
              <ImageIcon size={16} />
              Select Media
            </button>

            {selectedMedia?.url ? (
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
                  {selectedMedia.resourceType === "video" ? (
                    <video
                      src={selectedMedia.url}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={selectedMedia.url}
                      alt="Selected"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {selectedMedia.resourceType === "video" ? "Video" : "Image"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">No media selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6 overflow-x-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-950 text-lg">
            Current Row{" "}
            <span className="text-gray-400">({sortedRow.length})</span>
          </h2>
        </div>

        {sortedRow.length === 0 ? (
          <p className="text-sm text-gray-500 mt-4">No items added yet.</p>
        ) : (
          <table className="w-full mt-5 border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="py-3 px-2 w-[90px]">Order</th>
                <th className="py-3 px-2 w-[120px]">Media</th>
                <th className="py-3 px-2">Name</th>
                <th className="py-3 px-2">Slug</th>
                <th className="py-3 px-2">Tag</th>
                <th className="py-3 px-2 w-[110px]">Active</th>
                <th className="py-3 px-2 w-[170px]">Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedRow.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b hover:bg-gray-50 transition"
                >
                  {/* Order */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveItem(idx, idx - 1)}
                        className="p-2 rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-100"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveItem(idx, idx + 1)}
                        className="p-2 rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-100"
                      >
                        <ChevronDown size={14} />
                      </button>

                      <input
                        type="number"
                        value={item.sortOrder || 0}
                        onChange={(e) =>
                          updateField(idx, "sortOrder", Number(e.target.value))
                        }
                        className="w-16 px-2 py-2 rounded-xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </td>

                  {/* Media */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white ring-1 ring-black/5">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : item.video ? (
                          <video
                            src={item.video}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[11px] text-gray-400 flex items-center justify-center h-full">
                            No media
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openEditMediaPicker(idx)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-100 text-xs"
                      >
                        {item.video ? <Video size={14} /> : <ImageIcon size={14} />}
                        Change
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {item.publicId ? `publicId: ${item.publicId}` : "publicId: -"}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-2">
                    <input
                      value={item.name || ""}
                      onChange={(e) => updateField(idx, "name", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Slug */}
                  <td className="py-3 px-2">
                    <input
                      value={item.slug || ""}
                      onChange={(e) => updateField(idx, "slug", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Tag */}
                  <td className="py-3 px-2">
                    <input
                      value={item.tag || ""}
                      onChange={(e) => updateField(idx, "tag", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Active */}
                  <td className="py-3 px-2">
                    <label className="text-sm text-gray-700 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.isActive !== false}
                        onChange={(e) =>
                          updateField(idx, "isActive", e.target.checked)
                        }
                        className="accent-blue-600"
                      />
                      Active
                    </label>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-2">
                    <button
                      onClick={() => removeItem(idx)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-red-600 ring-1 ring-black/5 hover:bg-red-50 transition text-sm"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
