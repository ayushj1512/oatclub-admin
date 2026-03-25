"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ImageIcon,
  GripVertical,
  Link2,
  FolderOpen,
  Shapes,
  Sparkles,
} from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useHomepageSettingsStore } from "@/store/useHomepageSettingsStore";
import { useCategoryStore } from "@/store/categorystore";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/* ===============================
   HELPERS
================================ */
const typeStyles = {
  category: "bg-blue-50 text-blue-700 border-blue-200",
  collection: "bg-violet-50 text-violet-700 border-violet-200",
  custom: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const normalizeOrder = (row = []) =>
  row.map((item, index) => ({ ...item, sortOrder: index + 1 }));

const mediaToItem = (m) =>
  m?.resourceType === "video"
    ? { video: m.url, image: "", publicId: m.publicId || "" }
    : { image: m.url, video: "", publicId: m.publicId || "" };

/* ===============================
   SORTABLE CARD
================================ */
function SortableCard({ item, onToggle, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.sortOrder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const routeValue =
    item.navigationType === "custom" ? item.customRoute : item.slug;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-3 cursor-grab rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-500 hover:bg-zinc-100"
        >
          <GripVertical size={16} />
        </button>

        <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-zinc-100 shrink-0">
          {item.image ? (
            <Image src={item.image} alt={item.name || ""} fill className="object-cover" />
          ) : item.video ? (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
              VIDEO
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {item.name}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
                typeStyles[item.navigationType] || typeStyles.category
              }`}
            >
              {item.navigationType}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
              #{item.sortOrder}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-zinc-500">
            {routeValue || "No route"}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={item.isActive !== false}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Active
            </label>

            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   MAIN PAGE
================================ */
export default function TopCategoriesPage() {
  const {
    categoryRow,
    loading,
    saving,
    error,
    success,
    fetchHomepageSettings,
    setCategoryRowLocal,
    updateCategoryRow,
    clearMessages,
  } = useHomepageSettingsStore();

  const { categories, fetchCategories } = useCategoryStore();
  const { collections, fetchCollections } = useAdminCollectionStore();

  const [navigationType, setNavigationType] = useState("category");
  const [categoryId, setCategoryId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRoute, setCustomRoute] = useState("");
  const [media, setMedia] = useState(null);
  const [openMedia, setOpenMedia] = useState(false);

  useEffect(() => {
    fetchHomepageSettings();
    fetchCategories();
    fetchCollections();
  }, [fetchHomepageSettings, fetchCategories, fetchCollections]);

  const categoryMap = useMemo(
    () => new Map((categories || []).map((c) => [c._id, c])),
    [categories]
  );

  const collectionMap = useMemo(
    () => new Map((collections || []).map((c) => [c._id, c])),
    [collections]
  );

  const sortedRow = useMemo(
    () =>
      [...(categoryRow || [])].sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      ),
    [categoryRow]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = sortedRow.findIndex((i) => i.sortOrder === active.id);
    const newIndex = sortedRow.findIndex((i) => i.sortOrder === over.id);

    setCategoryRowLocal(normalizeOrder(arrayMove(sortedRow, oldIndex, newIndex)));
  };

  const resetForm = () => {
    setNavigationType("category");
    setCategoryId("");
    setCollectionId("");
    setCustomName("");
    setCustomRoute("");
    setMedia(null);
  };

  const addItem = () => {
    let name = customName.trim();
    let slug = "";
    let route = "";

    if (navigationType === "category") {
      const c = categoryMap.get(categoryId);
      name = name || c?.name || "";
      slug = c?.slug || "";
      if (!slug) return alert("Please select category");
    }

    if (navigationType === "collection") {
      const c = collectionMap.get(collectionId);
      name = name || c?.name || "";
      slug = c?.slug || "";
      if (!slug) return alert("Please select collection");
    }

    if (navigationType === "custom") {
      route = customRoute.trim();
      if (!name) return alert("Please enter display name");
      if (!route) return alert("Please enter custom route");
    }

    if (!media) return alert("Please select media");
    if (!name) return alert("Name is required");

    setCategoryRowLocal(
      normalizeOrder([
        ...sortedRow,
        {
          name,
          slug: navigationType === "custom" ? "" : slug,
          customRoute: navigationType === "custom" ? route : "",
          navigationType,
          ...mediaToItem(media),
          isActive: true,
        },
      ])
    );

    resetForm();
  };

  const save = async () => {
    clearMessages();
    await updateCategoryRow(sortedRow);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-blue-50 px-4 py-6 md:px-6">
      <MediaPickerModal
        open={openMedia}
        onClose={() => setOpenMedia(false)}
        folder="miray/categories"
        onSelect={setMedia}
      />

      <div className="mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Sparkles size={14} />
              Homepage Manager
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
              Top Categories
            </h1>
            <p className="text-sm text-zinc-500">
              Add, reorder and manage homepage category tiles
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchHomepageSettings}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(loading || saving) && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {saving ? "Saving changes..." : "Loading data..."}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Add Card */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-2xl bg-violet-100 p-2 text-violet-700">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Add New Item</h2>
              <p className="text-xs text-zinc-500">
                Category, collection or direct custom route
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
              <div className="grid grid-cols-3 gap-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setNavigationType("category")}
                  className={`rounded-xl px-3 py-2 ${
                    navigationType === "category"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  Category
                </button>
                <button
                  type="button"
                  onClick={() => setNavigationType("collection")}
                  className={`rounded-xl px-3 py-2 ${
                    navigationType === "collection"
                      ? "bg-violet-600 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  Collection
                </button>
                <button
                  type="button"
                  onClick={() => setNavigationType("custom")}
                  className={`rounded-xl px-3 py-2 ${
                    navigationType === "custom"
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-600"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {navigationType === "category" && (
              <div className="relative">
                <Shapes className="pointer-events-none absolute left-3 top-3.5 text-zinc-400" size={16} />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">Select category</option>
                  {(categories || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {navigationType === "collection" && (
              <div className="relative">
                <FolderOpen className="pointer-events-none absolute left-3 top-3.5 text-zinc-400" size={16} />
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-400"
                >
                  <option value="">Select collection</option>
                  {(collections || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {navigationType === "custom" && (
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-3.5 text-zinc-400" size={16} />
                <input
                  value={customRoute}
                  onChange={(e) => setCustomRoute(e.target.value)}
                  placeholder="/sale or /categories/tops"
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-400"
                />
              </div>
            )}

            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
            />

            <button
              type="button"
              onClick={() => setOpenMedia(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <ImageIcon size={16} />
              {media ? "Media Selected" : "Select Media"}
            </button>
          </div>

          {media?.url && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white">
                {media.resourceType === "video" ? (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
                    VIDEO
                  </div>
                ) : (
                  <Image src={media.url} alt="" fill className="object-cover" />
                )}
              </div>
              <p className="truncate text-xs text-zinc-500">{media.url}</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <Plus size={16} />
              Add Item
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Current Items</h2>
              <p className="text-xs text-zinc-500">
                Drag and drop to reorder
              </p>
            </div>
            <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              {sortedRow.length} items
            </div>
          </div>

          {sortedRow.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
              No items added yet
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sortedRow.map((i) => i.sortOrder)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedRow.map((item) => (
                    <SortableCard
                      key={item.sortOrder}
                      item={item}
                      onToggle={(value) =>
                        setCategoryRowLocal(
                          normalizeOrder(
                            sortedRow.map((i) =>
                              i.sortOrder === item.sortOrder
                                ? { ...i, isActive: value }
                                : i
                            )
                          )
                        )
                      }
                      onRemove={() =>
                        setCategoryRowLocal(
                          normalizeOrder(
                            sortedRow.filter(
                              (i) => i.sortOrder !== item.sortOrder
                            )
                          )
                        )
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}