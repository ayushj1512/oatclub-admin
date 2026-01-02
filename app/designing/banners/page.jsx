"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  RefreshCw,
  ImageIcon,
  Link as LinkIcon,
  GripVertical,
} from "lucide-react";

import { useHomepageSettingsStore } from "../../../store/useHomepageSettingsStore";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/* ✅ Drag & Drop (dnd-kit) */
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* =========================================================
   Sortable Banner Item
========================================================= */
function SortableBannerCard({
  banner,
  index,
  isDirty,
  updating,
  onChangeMedia,
  onUpdateField,
  onRemove,
  onUpdateOne,
}) {
  const id = banner._id || banner.tempId;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-manipulation">
      <div className="flex flex-col md:flex-row gap-5 rounded-3xl bg-gray-50 ring-1 ring-black/5 p-5 hover:bg-gray-100 transition">
        {/* Preview (16:9) */}
        <div className="relative w-full md:w-[340px] aspect-video rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
          {banner.image ? (
            <Image
              src={banner.image}
              alt={banner.title || `Banner ${index + 1}`}
              fill
              className="object-cover"
            />
          ) : null}

          {/* Drag Handle */}
          <button
            type="button"
            className="absolute top-3 left-3 inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-white transition"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
            <span className="text-xs font-medium">Drag</span>
          </button>

          {/* 16:9 badge */}
          <div className="absolute bottom-3 right-3 text-[11px] px-3 py-1 rounded-full bg-gray-950/90 text-white">
            16:9
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 grid gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => onChangeMedia(index)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
            >
              <ImageIcon size={16} />
              Change Banner Image
            </button>

            <div className="text-[11px] text-gray-400">
              {banner.publicId ? `publicId: ${banner.publicId}` : "publicId: -"}
            </div>
          </div>

          <input
            value={banner.link || ""}
            onChange={(e) => onUpdateField(index, "link", e.target.value)}
            className="px-4 py-3 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Link (optional) e.g. /category/dress"
          />

          <input
            value={banner.title || ""}
            onChange={(e) => onUpdateField(index, "title", e.target.value)}
            className="px-4 py-3 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Title (optional - internal)"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={banner.isActive !== false}
                onChange={(e) =>
                  onUpdateField(index, "isActive", e.target.checked)
                }
                className="accent-blue-600"
              />
              Active
            </label>

            <button
              onClick={() => onRemove(index)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-red-600 shadow-sm ring-1 ring-black/5 hover:bg-red-50 transition"
            >
              <Trash2 size={16} />
              Delete
            </button>

            {/* ✅ Update button only when dirty */}
            {isDirty && (
              <button
                onClick={() => onUpdateOne()}
                disabled={updating}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white shadow-sm transition ${
                  updating ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {updating ? "Updating..." : "Update"}
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Order is managed using drag & drop (sortOrder auto updates).
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Page
========================================================= */
export default function BannersManagerPage() {
  const {
    heroBanners,
    loading,
    saving,
    error,
    success,
    fetchHomepageSettings,
    setHeroBannersLocal,
    updateHeroBanners,
    clearMessages,
  } = useHomepageSettingsStore();

  /* ---------------------------
     Media modal state
  ---------------------------- */
  const [openMediaModal, setOpenMediaModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  /* ---------------------------
     New banner state
  ---------------------------- */
  const [newBanner, setNewBanner] = useState({
    image: "",
    publicId: "",
    link: "",
    title: "",
    isActive: true,
    sortOrder: 0,
  });

  /* ✅ Track initial snapshot for dirty detection */
  const snapshotRef = useRef([]);
  const [updatingOne, setUpdatingOne] = useState(false);

  useEffect(() => {
    fetchHomepageSettings();
  }, [fetchHomepageSettings]);

  /* ✅ Update snapshot when banners load first time */
  useEffect(() => {
    if (!loading && heroBanners?.length) {
      snapshotRef.current = JSON.parse(JSON.stringify(heroBanners));
    }
  }, [loading, heroBanners]);

  /* ✅ local sorted view + stable drag id */
  const sortedBanners = useMemo(() => {
    return [...(heroBanners || [])]
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((b, idx) => ({
        ...b,
        tempId: b.tempId || b._id || `temp-${idx}-${Math.random()}`,
      }));
  }, [heroBanners]);

  /* ---------------------------
     DnD sensors
  ---------------------------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  /* ---------------------------
     Helpers
  ---------------------------- */
  const openNewMediaPicker = () => {
    setEditIndex(null);
    setOpenMediaModal(true);
  };

  const openEditMediaPicker = (idx) => {
    setEditIndex(idx);
    setOpenMediaModal(true);
  };

  const normalizeBanner = (b) => ({
    image: b.image || "",
    publicId: b.publicId || "",
    link: b.link || "",
    title: b.title || "",
    isActive: b.isActive !== false,
    sortOrder: b.sortOrder || 0,
    _id: b._id || "",
    tempId: b.tempId || "",
  });

  const isBannerDirty = (banner) => {
    const snapshot = snapshotRef.current || [];
    const original =
      snapshot.find((x) => x._id && x._id === banner._id) ||
      snapshot.find((x) => x.tempId && x.tempId === banner.tempId);

    if (!original) return true; // new item not in snapshot

    const a = normalizeBanner(original);
    const b = normalizeBanner(banner);
    return JSON.stringify(a) !== JSON.stringify(b);
  };

  const handleMediaSelect = (media) => {
    if (!media?.url) return;

    if (editIndex !== null) {
      const next = [...sortedBanners];
      next[editIndex] = {
        ...next[editIndex],
        image: media.url,
        publicId: media.publicId || "",
      };

      const withOrder = next.map((x, i) => ({ ...x, sortOrder: i + 1 }));
      setHeroBannersLocal(withOrder);
    } else {
      setNewBanner((p) => ({
        ...p,
        image: media.url,
        publicId: media.publicId || "",
      }));
    }

    setOpenMediaModal(false);
  };

  /* ✅ Add banner and auto-update backend */
  const addBanner = async () => {
    if (!newBanner.image?.trim())
      return alert("Please select banner image (recommended size 16:9)");

    clearMessages();

    const next = [
      ...sortedBanners,
      {
        ...newBanner,
        image: newBanner.image.trim(),
        publicId: newBanner.publicId || "",
        link: String(newBanner.link || "").trim(),
        title: String(newBanner.title || "").trim(),
        sortOrder: sortedBanners.length + 1,
        tempId: `temp-${Date.now()}`,
      },
    ].map((x, i) => ({ ...x, sortOrder: i + 1 }));

    setHeroBannersLocal(next);

    setNewBanner({
      image: "",
      publicId: "",
      link: "",
      title: "",
      isActive: true,
      sortOrder: 0,
    });

    // ✅ Auto save immediately
    await updateHeroBanners(next);
    snapshotRef.current = JSON.parse(JSON.stringify(next));
  };

  const updateField = (index, key, value) => {
    const next = [...sortedBanners];
    next[index] = { ...next[index], [key]: value };
    setHeroBannersLocal(next.map((x, i) => ({ ...x, sortOrder: i + 1 })));
  };

  const removeBanner = async (index) => {
    clearMessages();
    const next = sortedBanners.filter((_, i) => i !== index);
    const withOrder = next.map((x, i) => ({ ...x, sortOrder: i + 1 }));
    setHeroBannersLocal(withOrder);

    // ✅ Auto save after delete too
    await updateHeroBanners(withOrder);
    snapshotRef.current = JSON.parse(JSON.stringify(withOrder));
  };

  /* ✅ Update when dirty (per banner) */
  const updateAllBanners = async () => {
    clearMessages();
    setUpdatingOne(true);
    try {
      const withOrder = sortedBanners.map((x, i) => ({ ...x, sortOrder: i + 1 }));
      await updateHeroBanners(withOrder);
      snapshotRef.current = JSON.parse(JSON.stringify(withOrder));
    } finally {
      setUpdatingOne(false);
    }
  };

  /* ✅ Drag End */
  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedBanners.findIndex(
      (b) => (b._id || b.tempId) === active.id
    );
    const newIndex = sortedBanners.findIndex(
      (b) => (b._id || b.tempId) === over.id
    );

    const moved = arrayMove(sortedBanners, oldIndex, newIndex);
    const withOrder = moved.map((x, i) => ({ ...x, sortOrder: i + 1 }));
    setHeroBannersLocal(withOrder);
  };

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">
            Banners Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage hero slider banners shown on homepage •{" "}
            <span className="font-semibold text-blue-600">Banner Size: 16:9</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchHomepageSettings()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {/* ✅ Show "Update All" only when ANY banner dirty */}
          {sortedBanners.some(isBannerDirty) && (
            <button
              onClick={updateAllBanners}
              disabled={saving || updatingOne}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-600 text-white shadow-sm hover:bg-green-700 transition disabled:opacity-60"
            >
              {saving || updatingOne ? "Updating..." : "Update Changes"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="mt-5 space-y-2">
        {loading && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 text-gray-700">
            Loading banners...
          </div>
        )}
        {error && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-red-50 shadow-sm ring-1 ring-red-200 text-red-700">
            {error}
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
        folder="miray/banners"
        onSelect={handleMediaSelect}
      />

      {/* Add New Banner */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-950 text-lg">Add New Banner</h2>
            <p className="text-xs text-gray-500 mt-1">
              Recommended banner size: <span className="font-semibold">16:9</span>
            </p>
          </div>

          <button
            onClick={addBanner}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            <Plus size={16} />
            {saving ? "Adding..." : "Add Banner"}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Media Selector */}
          <div className="rounded-3xl bg-gray-50 ring-1 ring-black/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => openNewMediaPicker()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
              >
                <ImageIcon size={16} />
                Select Banner Image
              </button>

              {newBanner.image ? (
                <span className="text-xs text-gray-600">Image selected ✅</span>
              ) : (
                <span className="text-xs text-gray-400">No media selected</span>
              )}
            </div>

            {newBanner.image ? (
              <div className="mt-4 relative w-full aspect-video rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
                <Image
                  src={newBanner.image}
                  alt="New banner preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-3 right-3 text-[11px] px-3 py-1 rounded-full bg-gray-950/90 text-white">
                  16:9
                </div>
              </div>
            ) : (
              <div className="mt-4 w-full aspect-video rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-black/5 flex items-center justify-center text-gray-400 text-sm">
                16:9 Preview will appear here
              </div>
            )}

            <div className="mt-3 text-[11px] text-gray-400">
              {newBanner.publicId ? `publicId: ${newBanner.publicId}` : "publicId: -"}
            </div>
          </div>

          {/* Fields */}
          <div className="rounded-3xl bg-gray-50 ring-1 ring-black/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <LinkIcon size={14} />
              Link + internal title (optional)
            </div>

            <input
              value={newBanner.link}
              onChange={(e) =>
                setNewBanner((p) => ({ ...p, link: e.target.value }))
              }
              placeholder="Link (optional) e.g. /category/dress"
              className="px-4 py-3 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
            />

            <input
              value={newBanner.title}
              onChange={(e) =>
                setNewBanner((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Title (optional - internal)"
              className="px-4 py-3 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
            />

            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={newBanner.isActive}
                onChange={(e) =>
                  setNewBanner((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="accent-blue-600"
              />
              Active
            </label>

            <div className="text-xs text-gray-500 leading-relaxed">
              Tip: Reorder banners using{" "}
              <span className="font-semibold text-gray-950">Drag & Drop</span> below.
            </div>
          </div>
        </div>
      </div>

      {/* Banner List */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-950 text-lg">
            Existing Banners{" "}
            <span className="text-gray-400">({sortedBanners.length})</span>
          </h2>
          <p className="text-xs text-gray-500">
            Drag banners to reorder •{" "}
            <span className="font-semibold text-gray-950">16:9</span>
          </p>
        </div>

        {sortedBanners.length === 0 ? (
          <p className="text-sm text-gray-500 mt-4">No banners added yet.</p>
        ) : (
          <div className="mt-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sortedBanners.map((b) => b._id || b.tempId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {sortedBanners.map((b, idx) => {
                    const dirty = isBannerDirty(b);

                    return (
                      <SortableBannerCard
                        key={b._id || b.tempId}
                        banner={b}
                        index={idx}
                        isDirty={dirty}
                        updating={saving || updatingOne}
                        onChangeMedia={openEditMediaPicker}
                        onUpdateField={updateField}
                        onRemove={removeBanner}
                        onUpdateOne={updateAllBanners}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
