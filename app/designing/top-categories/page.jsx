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
   SORTABLE ROW
================================ */
function SortableRow({ item, onToggle, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.sortOrder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-t border-gray-100 bg-white"
    >
      <td className="py-3 pl-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-black"
        >
          <GripVertical size={16} />
        </span>
      </td>

      <td className="py-3">
        {item.image && (
          <Image
            src={item.image}
            alt=""
            width={44}
            height={44}
            className="rounded-xl object-cover"
          />
        )}
      </td>

      <td className="py-3 font-medium">{item.name}</td>
      <td className="py-3 text-gray-500">{item.slug}</td>
      <td className="py-3 capitalize">{item.navigationType}</td>

      <td className="py-3">
        <input
          type="checkbox"
          checked={item.isActive !== false}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </td>

      <td className="py-3">
        <Trash2
          size={16}
          onClick={onRemove}
          className="cursor-pointer text-gray-400 hover:text-red-600"
        />
      </td>
    </tr>
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
  const [media, setMedia] = useState(null);
  const [openMedia, setOpenMedia] = useState(false);

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    fetchHomepageSettings();
    fetchCategories();
    fetchCollections();
  }, [fetchHomepageSettings, fetchCategories, fetchCollections]);

  /* ---------------- Maps ---------------- */
  const categoryMap = useMemo(
    () => new Map(categories?.map((c) => [c._id, c])),
    [categories]
  );

  const collectionMap = useMemo(
    () => new Map(collections?.map((c) => [c._id, c])),
    [collections]
  );

  const sortedRow = useMemo(
    () =>
      [...(categoryRow || [])].sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      ),
    [categoryRow]
  );

  const normalizeOrder = (row) =>
    row.map((i, idx) => ({ ...i, sortOrder: idx + 1 }));

  const mediaToItem = (m) =>
    m?.resourceType === "video"
      ? { video: m.url, image: "", publicId: m.publicId }
      : { image: m.url, video: "", publicId: m.publicId };

  /* ---------------- Drag & Drop ---------------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = sortedRow.findIndex(
      (i) => i.sortOrder === active.id
    );
    const newIndex = sortedRow.findIndex(
      (i) => i.sortOrder === over.id
    );

    const reordered = arrayMove(sortedRow, oldIndex, newIndex);
    setCategoryRowLocal(normalizeOrder(reordered));
  };

  /* ---------------- Add ---------------- */
  const addItem = () => {
    let name = customName;
    let slug = "";

    if (navigationType === "category") {
      const c = categoryMap.get(categoryId);
      name = name || c?.name;
      slug = c?.slug;
    } else {
      const c = collectionMap.get(collectionId);
      name = name || c?.name;
      slug = c?.slug;
    }

    if (!name || !slug || !media)
      return alert("Name, slug and media are required");

    setCategoryRowLocal(
      normalizeOrder([
        ...sortedRow,
        {
          name,
          slug,
          navigationType,
          ...mediaToItem(media),
          isActive: true,
        },
      ])
    );

    setCategoryId("");
    setCollectionId("");
    setCustomName("");
    setNavigationType("category");
    setMedia(null);
  };

  /* ---------------- Save ---------------- */
  const save = async () => {
    clearMessages();
    await updateCategoryRow(sortedRow);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Top Categories
          </h1>
          <p className="text-sm text-gray-500">
            Drag & drop to reorder homepage items
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchHomepageSettings}
            className="p-2 rounded-xl bg-white shadow-sm"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-black text-white"
          >
            <Save size={16} className="inline mr-2" />
            Save
          </button>
        </div>
      </div>

      {(loading || saving) && (
        <p className="text-sm text-gray-500 mb-4">Loading…</p>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}

      <MediaPickerModal
        open={openMedia}
        onClose={() => setOpenMedia(false)}
        folder="miray/categories"
        onSelect={setMedia}
      />

      {/* Add Card */}
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          {navigationType === "category" ? (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-4 py-3 rounded-xl bg-gray-50"
            >
              <option value="">Select category</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="px-4 py-3 rounded-xl bg-gray-50"
            >
              <option value="">Select collection</option>
              {collections?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <input
            placeholder="Display name (optional)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="px-4 py-3 rounded-xl bg-gray-50"
          />

          <div className="flex gap-6 px-4 py-3 rounded-xl bg-gray-50 text-sm">
            <label>
              <input
                type="radio"
                checked={navigationType === "category"}
                onChange={() => setNavigationType("category")}
              />{" "}
              Category
            </label>
            <label>
              <input
                type="radio"
                checked={navigationType === "collection"}
                onChange={() => setNavigationType("collection")}
              />{" "}
              Collection
            </label>
          </div>

          <button
            onClick={() => setOpenMedia(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100"
          >
            <ImageIcon size={16} />
            Select Media
          </button>
        </div>

        <button
          onClick={addItem}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Drag List */}
      <div className="bg-white rounded-3xl shadow-sm p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sortedRow.map((i) => i.sortOrder)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full text-sm">
              <thead className="text-gray-400">
                <tr>
                  <th />
                  <th>Media</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Type</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedRow.map((item) => (
                  <SortableRow
                    key={item.sortOrder}
                    item={item}
                    onToggle={(v) =>
                      setCategoryRowLocal(
                        normalizeOrder(
                          sortedRow.map((i) =>
                            i.sortOrder === item.sortOrder
                              ? { ...i, isActive: v }
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
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
