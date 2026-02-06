"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { GripVertical, Pencil, Plus, Save, Trash2, X, ImageIcon } from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useHomeCollectionsStore } from "@/store/useHomeCollectionsStore";

/**
 * app/designing/collection/page.jsx
 *
 * ✅ Uses Collection store ONLY for: name + slug
 * ✅ Uses MediaPickerModal for image
 * ✅ Manages Home Collections (homepage collections) with full admin controls:
 *    - create (pick collection + image)
 *    - edit (change collection, image)
 *    - toggle active
 *    - delete
 *    - drag & drop reorder (no extra deps)
 */

export default function DesigningCollectionPage() {
  const {
    collections,
    loading: collectionsLoading,
    fetchCollections,
  } = useAdminCollectionStore();

  const {
    items,
    loading,
    saving,
    deleting,
    reordering,
    fetchAll,
    createOne,
    updateOne,
    deleteOne,
    toggleActive,
    reorder,
  } = useHomeCollectionsStore();

  const [pickerOpen, setPickerOpen] = useState(false);

  // create form
  const [selectedSlug, setSelectedSlug] = useState("");
  const selectedCollection = useMemo(() => {
    const s = String(selectedSlug || "");
    return collections?.find((c) => String(c?.slug) === s) || null;
  }, [collections, selectedSlug]);

  const [draftImage, setDraftImage] = useState(null); // Media object

  // edit mode
  const [editingId, setEditingId] = useState(null);
  const editingItem = useMemo(
    () => items?.find((x) => String(x?._id) === String(editingId)) || null,
    [items, editingId]
  );

  const [editSlug, setEditSlug] = useState("");
  const editCollection = useMemo(() => {
    const s = String(editSlug || "");
    return collections?.find((c) => String(c?.slug) === s) || null;
  }, [collections, editSlug]);

  const [editImage, setEditImage] = useState(null);

  // drag reorder
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    fetchCollections();
    fetchAll({ sort: "position" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));
    return arr;
  }, [items]);

  const resetCreate = () => {
    setSelectedSlug("");
    setDraftImage(null);
  };

  const startEdit = (it) => {
    setEditingId(it?._id || null);
    setEditSlug(String(it?.slug || ""));
    setEditImage(null);
  };

  const stopEdit = () => {
    setEditingId(null);
    setEditSlug("");
    setEditImage(null);
  };

  const onCreate = async () => {
    if (!selectedCollection) return toast.error("Select a collection");
    if (!draftImage?.url) return toast.error("Select an image");

    const position = sorted.length; // append at end

    await createOne({
      imageUrl: draftImage.url,
      name: selectedCollection.name,
      slug: selectedCollection.slug,
      position,
      isActive: true,
    });

    resetCreate();
    await fetchAll({ sort: "position" });
  };

  const onSaveEdit = async () => {
    if (!editingItem) return;

    const nextName = (editCollection?.name || editingItem?.name || "").trim();
    const nextSlug = (editCollection?.slug || editingItem?.slug || "").trim();

    if (!nextSlug) return toast.error("Slug missing");
    if (!nextName) return toast.error("Name missing");

    const patch = {
      name: nextName,
      slug: nextSlug,
      ...(editImage?.url ? { imageUrl: editImage.url } : {}),
    };

    await updateOne(editingItem._id, patch);
    stopEdit();
    await fetchAll({ sort: "position" });
  };

  // ---------- Drag & Drop (HTML5, no deps) ----------
  const commitReorder = async (nextSorted) => {
    const payload = nextSorted.map((x, idx) => ({ id: x._id, position: idx }));
    await reorder(payload);
    await fetchAll({ sort: "position" });
  };

  const onDropOn = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const arr = [...sorted];
    const from = arr.findIndex((x) => String(x._id) === String(dragId));
    const to = arr.findIndex((x) => String(x._id) === String(targetId));
    if (from < 0 || to < 0) return;

    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);

    setDragId(null);
    await commitReorder(arr);
  };

  return (
    <div className="p-4 md:p-6 bg-[#f6f7f9] min-h-[calc(100vh-60px)]">
      <div className="mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold">Designing • Homepage Collections</h1>
          <div className="text-xs text-black/60">
            {loading || collectionsLoading ? "Loading…" : `${sorted.length} items`}
          </div>
        </div>

        {/* CREATE CARD */}
        <div className="bg-white rounded-2xl border border-black/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4" />
            <h2 className="font-semibold">Add to Homepage</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-black/70">Collection</label>
              <select
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
              >
                <option value="">Select collection…</option>
                {(collections || [])
                  .filter((c) => c?.slug && c?.name)
                  .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                  .map((c) => (
                    <option key={c._id} value={c.slug}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
              </select>
              {selectedCollection ? (
                <p className="mt-1 text-xs text-black/60">
                  Will save: <span className="font-medium">{selectedCollection.name}</span> •{" "}
                  <span className="font-mono">{selectedCollection.slug}</span>
                </p>
              ) : null}
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-medium text-black/70">Image</label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm bg-white hover:bg-black/5"
                  onClick={() => setPickerOpen(true)}
                >
                  <ImageIcon className="w-4 h-4" />
                  Select Image
                </button>

                {draftImage?.url ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/10 bg-black/5">
                    <Image
                      src={draftImage.url}
                      alt="selected"
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <button
                      className="absolute top-1 right-1 bg-white/90 rounded-full p-1 border border-black/10"
                      onClick={() => setDraftImage(null)}
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-black/50">No image selected</div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-black/50">
                Uses Media Library only (no direct upload here).
              </p>
            </div>

            <div className="md:col-span-1 flex md:justify-end md:items-end">
              <button
                onClick={onCreate}
                disabled={!selectedCollection || !draftImage?.url || saving}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between">
            <div className="font-semibold">Homepage Items</div>
            <div className="text-xs text-black/60">
              Drag to reorder • {reordering ? "Updating order…" : " "}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-black/70">
                <tr>
                  <th className="px-3 py-2 w-12 text-left">#</th>
                  <th className="px-3 py-2 w-12 text-left"></th>
                  <th className="px-3 py-2 text-left">Preview</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Slug</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-black/50" colSpan={7}>
                      No homepage collections yet.
                    </td>
                  </tr>
                ) : (
                  sorted.map((it, idx) => {
                    const isEdit = String(editingId) === String(it?._id);

                    return (
                      <tr
                        key={it._id}
                        className="border-t border-black/5 hover:bg-black/[0.02]"
                        draggable
                        onDragStart={() => setDragId(it._id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropOn(it._id)}
                      >
                        <td className="px-3 py-3 text-black/60">{idx + 1}</td>

                        <td className="px-3 py-3">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-black/10 bg-white">
                            <GripVertical className="w-4 h-4 text-black/60" />
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/10 bg-black/5">
                            {it?.imageUrl ? (
                              <Image
                                src={it.imageUrl}
                                alt={it?.name || "collection"}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>

                          {isEdit ? (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs bg-white hover:bg-black/5"
                                onClick={() => setPickerOpen(true)}
                                title="Change image"
                              >
                                <ImageIcon className="w-3 h-3" />
                                Change
                              </button>

                              {editImage?.url ? (
                                <span className="text-xs text-black/60">Selected ✓</span>
                              ) : (
                                <span className="text-xs text-black/40">No new image</span>
                              )}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          {isEdit ? (
                            <select
                              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                              value={editSlug}
                              onChange={(e) => setEditSlug(e.target.value)}
                            >
                              <option value="">Select collection…</option>
                              {(collections || [])
                                .filter((c) => c?.slug && c?.name)
                                .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                                .map((c) => (
                                  <option key={c._id} value={c.slug}>
                                    {c.name} ({c.slug})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <div className="font-medium">{it?.name || "-"}</div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {isEdit ? (
                            <div className="text-xs text-black/60">
                              Saving as:
                              <div className="mt-1 font-mono text-[12px]">
                                {editCollection?.slug || it?.slug || "-"}
                              </div>
                              <div className="mt-1 text-black/70">
                                {editCollection?.name || it?.name || "-"}
                              </div>
                            </div>
                          ) : (
                            <div className="font-mono text-xs">{it?.slug || "-"}</div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleActive(it._id)}
                            className={`rounded-xl px-3 py-1.5 text-xs border ${
                              it?.isActive
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-gray-50 text-gray-700 border-gray-100"
                            }`}
                          >
                            {it?.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {isEdit ? (
                              <>
                                <button
                                  onClick={onSaveEdit}
                                  disabled={saving || !editSlug}
                                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-black text-white disabled:opacity-50"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  Save
                                </button>
                                <button
                                  onClick={stopEdit}
                                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs border border-black/10 bg-white hover:bg-black/5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(it)}
                                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs border border-black/10 bg-white hover:bg-black/5"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit
                                </button>

                                <button
                                  onClick={async () => {
                                    const ok = confirm("Delete this homepage item?");
                                    if (!ok) return;
                                    await deleteOne(it._id);
                                    await fetchAll({ sort: "position" });
                                  }}
                                  disabled={deleting}
                                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-black/10 text-xs text-black/60">
            Tip: Drag any row to change homepage order. (Order is saved to <span className="font-mono">position</span>)
          </div>
        </div>
      </div>

      {/* MEDIA PICKER (single image) */}
      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="miray/collections/home"
        onSelect={(media) => {
          // if editing -> set editImage, else set draftImage
          if (editingId) setEditImage(media);
          else setDraftImage(media);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
