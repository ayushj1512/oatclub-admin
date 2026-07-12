"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImageIcon,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useHomepageSettingsStore } from "../../../store/useHomepageSettingsStore";

const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `banner-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyBanner = () => ({
  clientId: createId(),
  desktopImage: "",
  mobileImage: "",
  desktopPublicId: "",
  mobilePublicId: "",
  title: "",
  link: "",
  isActive: true,
  sortOrder: 1,
});

const prepareBanners = (items = []) =>
  [...items]
    .sort(
      (a, b) =>
        Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)
    )
    .map((item, index) => ({
      ...item,
      clientId: item.clientId || item._id || createId(),
      sortOrder: index + 1,
    }));

const reindexBanners = (items = []) =>
  items.map((item, index) => ({
    ...item,
    clientId: item.clientId || item._id || createId(),
    sortOrder: index + 1,
  }));

const comparable = (items = []) =>
  prepareBanners(items).map(
    ({
      desktopImage,
      mobileImage,
      title,
      link,
      isActive,
      sortOrder,
    }) => ({
      desktopImage: String(desktopImage || "").trim(),
      mobileImage: String(mobileImage || "").trim(),
      title: String(title || "").trim(),
      link: String(link || "").trim(),
      isActive: isActive !== false,
      sortOrder,
    })
  );

function ImagePicker({
  label,
  image,
  mobile = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 text-left transition hover:border-gray-400"
    >
      <div
        className={`relative w-full overflow-hidden bg-gray-100 ${
          mobile ? "aspect-[4/5]" : "aspect-[16/6]"
        }`}
      >
        {image ? (
          <Image
            src={image}
            alt={label}
            fill
            sizes={
              mobile
                ? "(max-width: 768px) 100vw, 320px"
                : "(max-width: 768px) 100vw, 700px"
            }
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon size={22} />
            <span className="text-xs">Select image</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          {mobile ? <Smartphone size={14} /> : <Monitor size={14} />}
          {label}
        </span>

        <span className="text-[11px] text-gray-500">
          {image ? "Change" : "Required"}
        </span>
      </div>
    </button>
  );
}

function SortableBanner({
  banner,
  index,
  total,
  saving,
  onMove,
  onChange,
  onMedia,
  onDelete,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.clientId });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        zIndex: isDragging ? 20 : "auto",
      }}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 active:cursor-grabbing"
            title="Drag to arrange"
          >
            <GripVertical size={17} />
          </button>

          <div>
            <h3 className="text-sm font-semibold text-gray-950">
              Banner {index + 1}
            </h3>
            <p className="text-[11px] text-gray-500">
              Drag or use arrows to arrange
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0 || saving}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            title="Move up"
          >
            <ArrowUp size={15} />
          </button>

          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1 || saving}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown size={15} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(index)}
            disabled={saving}
            className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
            title="Delete banner"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
        <ImagePicker
          label="Desktop image"
          image={banner.desktopImage}
          onClick={() => onMedia(index, "desktopImage")}
        />

        <ImagePicker
          label="Mobile image"
          image={banner.mobileImage}
          mobile
          onClick={() => onMedia(index, "mobileImage")}
        />

        <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
          <input
            value={banner.title || ""}
            onChange={(e) => onChange(index, "title", e.target.value)}
            placeholder="Internal title"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-950"
          />

          <input
            value={banner.link || ""}
            onChange={(e) => onChange(index, "link", e.target.value)}
            placeholder="/category/dresses"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-950"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={banner.isActive !== false}
              onChange={(e) =>
                onChange(index, "isActive", e.target.checked)
              }
              className="h-4 w-4 accent-black"
            />
            Active
          </label>

          {(!banner.desktopImage || !banner.mobileImage) && (
            <p className="text-xs font-medium text-red-600">
              Desktop and mobile images are required.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

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

  const [draft, setDraft] = useState(emptyBanner);
  const [mediaPicker, setMediaPicker] = useState({
    open: false,
    index: null,
    field: "",
    draft: false,
  });

  const snapshotRef = useRef([]);
  const loadedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const banners = useMemo(
    () => prepareBanners(heroBanners || []),
    [heroBanners]
  );

  const dirty =
    JSON.stringify(comparable(banners)) !==
    JSON.stringify(comparable(snapshotRef.current));

  const incomplete = banners.some(
    (item) => !item.desktopImage || !item.mobileImage
  );

  useEffect(() => {
    fetchHomepageSettings();
  }, [fetchHomepageSettings]);

  useEffect(() => {
    if (!loading && !loadedRef.current) {
      const initial = prepareBanners(heroBanners || []);
      setHeroBannersLocal(initial);
      snapshotRef.current = initial;
      loadedRef.current = true;
    }
  }, [loading, heroBanners, setHeroBannersLocal]);

  const updateLocal = (next) =>
    setHeroBannersLocal(reindexBanners(next));

  const changeField = (index, field, value) => {
    const next = [...banners];
    next[index] = { ...next[index], [field]: value };
    updateLocal(next);
  };

  const moveBanner = (from, to) => {
    if (to < 0 || to >= banners.length) return;
    updateLocal(arrayMove(banners, from, to));
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const from = banners.findIndex(
      (item) => item.clientId === active.id
    );
    const to = banners.findIndex(
      (item) => item.clientId === over.id
    );

    if (from !== -1 && to !== -1) {
      moveBanner(from, to);
    }
  };

  const openMedia = (index, field, isDraft = false) =>
    setMediaPicker({
      open: true,
      index,
      field,
      draft: isDraft,
    });

  const handleMediaSelect = (media) => {
    if (!media?.url || !mediaPicker.field) return;

    const publicIdField =
      mediaPicker.field === "desktopImage"
        ? "desktopPublicId"
        : "mobilePublicId";

    if (mediaPicker.draft) {
      setDraft((current) => ({
        ...current,
        [mediaPicker.field]: media.url,
        [publicIdField]: media.publicId || "",
      }));
    } else {
      const next = [...banners];
      next[mediaPicker.index] = {
        ...next[mediaPicker.index],
        [mediaPicker.field]: media.url,
        [publicIdField]: media.publicId || "",
      };
      updateLocal(next);
    }

    setMediaPicker({
      open: false,
      index: null,
      field: "",
      draft: false,
    });
  };

  const saveBanners = async (items = banners) => {
    if (
      items.some(
        (item) => !item.desktopImage || !item.mobileImage
      )
    ) {
      window.alert(
        "Every banner needs desktop and mobile images."
      );
      return false;
    }

    clearMessages();

    const ordered = reindexBanners(items);
    const result = await updateHeroBanners(ordered);

    if (result) {
      const saved = prepareBanners(
        result?.heroBanners || ordered
      );
      setHeroBannersLocal(saved);
      snapshotRef.current = saved;
      return true;
    }

    return false;
  };

  const addBanner = async () => {
    if (!draft.desktopImage || !draft.mobileImage) {
      window.alert(
        "Please select both desktop and mobile images."
      );
      return;
    }

    const next = reindexBanners([
      ...banners,
      {
        ...draft,
        title: draft.title.trim(),
        link: draft.link.trim(),
      },
    ]);

    setHeroBannersLocal(next);

    if (await saveBanners(next)) {
      setDraft(emptyBanner());
    }
  };

  const deleteBanner = async (index) => {
    if (!window.confirm(`Delete banner ${index + 1}?`)) return;

    const next = reindexBanners(
      banners.filter((_, itemIndex) => itemIndex !== index)
    );

    setHeroBannersLocal(next);

    if (await saveBanners(next)) {
      snapshotRef.current = next;
    }
  };

  const refresh = async () => {
    clearMessages();
    loadedRef.current = false;

    const result = await fetchHomepageSettings();

    if (result) {
      const next = prepareBanners(result?.heroBanners || []);
      setHeroBannersLocal(next);
      snapshotRef.current = next;
      loadedRef.current = true;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <MediaPickerModal
        open={mediaPicker.open}
        onClose={() =>
          setMediaPicker({
            open: false,
            index: null,
            field: "",
            draft: false,
          })
        }
        folder="oatclub/banners"
        onSelect={handleMediaSelect}
      />

      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">
              Hero Banners
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Drag, move and arrange homepage banners easily.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading || saving}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {dirty && (
              <button
                type="button"
                onClick={() => saveBanners()}
                disabled={saving || incomplete}
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save arrangement"}
              </button>
            )}
          </div>
        </header>

        {(error || success) && (
          <div
            className={`mt-5 rounded-xl px-4 py-3 text-sm ${
              error
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-950">
                Add Banner
              </h2>
              <p className="text-xs text-gray-500">
                Add desktop and mobile image.
              </p>
            </div>

            <button
              type="button"
              onClick={addBanner}
              disabled={
                saving ||
                !draft.desktopImage ||
                !draft.mobileImage
              }
              className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              <Plus size={15} />
              Add banner
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
            <ImagePicker
              label="Desktop image"
              image={draft.desktopImage}
              onClick={() =>
                openMedia(null, "desktopImage", true)
              }
            />

            <ImagePicker
              label="Mobile image"
              image={draft.mobileImage}
              mobile
              onClick={() =>
                openMedia(null, "mobileImage", true)
              }
            />

            <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
              <input
                value={draft.title}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    title: e.target.value,
                  }))
                }
                placeholder="Internal title"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              />

              <input
                value={draft.link}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    link: e.target.value,
                  }))
                }
                placeholder="/category/dresses"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-black"
                />
                Active
              </label>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="font-semibold text-gray-950">
              Banner Arrangement ({banners.length})
            </h2>
            <p className="text-xs text-gray-500">
              Hold the grip icon and drag. Arrow buttons also work.
            </p>
          </div>

          {banners.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
              No banners added.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={banners.map((item) => item.clientId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {banners.map((banner, index) => (
                    <SortableBanner
                      key={banner.clientId}
                      banner={banner}
                      index={index}
                      total={banners.length}
                      saving={saving}
                      onMove={moveBanner}
                      onChange={changeField}
                      onMedia={openMedia}
                      onDelete={deleteBanner}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </main>
  );
}
