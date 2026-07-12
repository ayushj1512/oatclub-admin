"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  GripVertical,
  ImageIcon,
  Link as LinkIcon,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";

import { useHomepageSettingsStore } from "../../../store/useHomepageSettingsStore";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/* =========================================================
   Drag and Drop
========================================================= */

import {
  DndContext,
  PointerSensor,
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

/* =========================================================
   Helpers
========================================================= */

const createClientId = () => {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto?.randomUUID
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `banner-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const createEmptyBanner = () => ({
  clientId: createClientId(),

  desktopImage: "",
  mobileImage: "",

  desktopPublicId: "",
  mobilePublicId: "",

  link: "",
  title: "",

  isActive: true,
  sortOrder: 0,
});

const normalizeForComparison = (banner = {}) => ({
  desktopImage: String(banner?.desktopImage || "").trim(),
  mobileImage: String(banner?.mobileImage || "").trim(),

  link: String(banner?.link || "").trim(),
  title: String(banner?.title || "").trim(),

  isActive: banner?.isActive !== false,
  sortOrder: Number(banner?.sortOrder || 0),
});

const cloneBanners = (banners = []) =>
  banners.map((banner) => ({ ...banner }));

const reorderBanners = (banners = []) =>
  banners.map((banner, index) => ({
    ...banner,
    sortOrder: index + 1,
  }));

/* =========================================================
   Banner Preview
========================================================= */

function BannerPreview({
  image,
  title,
  type,
  emptyText,
  aspectClass,
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-black/5 ${aspectClass}`}
    >
      {image ? (
        <Image
          src={image}
          alt={title || `${type} banner preview`}
          fill
          sizes={
            type === "Mobile"
              ? "(max-width: 768px) 100vw, 240px"
              : "(max-width: 768px) 100vw, 600px"
          }
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-gray-400">
          <ImageIcon size={22} />
          <span className="text-xs">{emptyText}</span>
        </div>
      )}

      <div className="absolute bottom-2 right-2 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-medium text-white">
        {type}
      </div>
    </div>
  );
}

/* =========================================================
   Media Selector
========================================================= */

function MediaSelector({
  label,
  description,
  image,
  publicId,
  type,
  onSelect,
}) {
  const isMobile = type === "mobile";

  return (
    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            {isMobile ? (
              <Smartphone size={16} />
            ) : (
              <Monitor size={16} />
            )}

            {label}

            {!image && (
              <span className="text-xs font-medium text-red-500">
                Required
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>

        {image && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} />
            Selected
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
      >
        <BannerPreview
          image={image}
          title={label}
          type={isMobile ? "Mobile" : "Desktop"}
          emptyText={`Select ${label.toLowerCase()}`}
          aspectClass={
            isMobile
              ? "aspect-[4/5] max-h-[320px]"
              : "aspect-[16/6]"
          }
        />
      </button>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-black/5 transition hover:bg-gray-100"
        >
          <ImageIcon size={14} />
          {image ? "Change image" : "Select image"}
        </button>

        <span
          className="max-w-[55%] truncate text-[10px] text-gray-400"
          title={publicId || ""}
        >
          {publicId || "No public ID"}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   Sortable Banner Card
========================================================= */

function SortableBannerCard({
  banner,
  index,
  isDirty,
  saving,
  onOpenMedia,
  onUpdateField,
  onRemove,
  onSave,
}) {
  const sortableId = banner.clientId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  const missingDesktop = !banner.desktopImage;
  const missingMobile = !banner.mobileImage;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-manipulation"
    >
      <div className="rounded-3xl bg-gray-50 p-4 ring-1 ring-black/5 transition hover:bg-gray-100/80 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              {...attributes}
              {...listeners}
              title="Drag to reorder"
              className="inline-flex cursor-grab items-center justify-center rounded-xl bg-white p-2.5 text-gray-500 shadow-sm ring-1 ring-black/5 transition hover:text-gray-950 active:cursor-grabbing"
            >
              <GripVertical size={17} />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-gray-950">
                Banner {index + 1}
              </h3>

              <p className="text-xs text-gray-500">
                Position {index + 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                Unsaved
              </span>
            )}

            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={saving}
              title="Delete banner"
              className="inline-flex items-center justify-center rounded-xl bg-white p-2.5 text-red-600 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {(missingDesktop || missingMobile) && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-700 ring-1 ring-red-100">
            {missingDesktop && missingMobile
              ? "Desktop and mobile images are required."
              : missingDesktop
                ? "Desktop image is required."
                : "Mobile image is required."}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="grid gap-4 md:grid-cols-2">
            <MediaSelector
              label="Desktop image"
              description="Recommended wide desktop banner"
              image={banner.desktopImage}
              publicId={banner.desktopPublicId}
              type="desktop"
              onSelect={() =>
                onOpenMedia(index, "desktopImage")
              }
            />

            <MediaSelector
              label="Mobile image"
              description="Use a portrait crop for mobile screens"
              image={banner.mobileImage}
              publicId={banner.mobilePublicId}
              type="mobile"
              onSelect={() =>
                onOpenMedia(index, "mobileImage")
              }
            />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <LinkIcon size={14} />
              Banner information
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Link
              </label>

              <input
                value={banner.link || ""}
                onChange={(event) =>
                  onUpdateField(
                    index,
                    "link",
                    event.target.value
                  )
                }
                placeholder="/category/dresses"
                className="w-full rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm text-gray-950 outline-none ring-1 ring-black/5 transition placeholder:text-gray-400 focus:ring-2 focus:ring-gray-950"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Internal title
              </label>

              <input
                value={banner.title || ""}
                onChange={(event) =>
                  onUpdateField(
                    index,
                    "title",
                    event.target.value
                  )
                }
                placeholder="Summer collection banner"
                className="w-full rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm text-gray-950 outline-none ring-1 ring-black/5 transition placeholder:text-gray-400 focus:ring-2 focus:ring-gray-950"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 ring-1 ring-black/5">
              <input
                type="checkbox"
                checked={banner.isActive !== false}
                onChange={(event) =>
                  onUpdateField(
                    index,
                    "isActive",
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-gray-950"
              />

              Active
            </label>

            {isDirty && (
              <button
                type="button"
                onClick={onSave}
                disabled={
                  saving || missingDesktop || missingMobile
                }
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save changes"}
              </button>
            )}
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

  const [mediaPicker, setMediaPicker] = useState({
    open: false,
    bannerIndex: null,
    field: null,
    isNewBanner: false,
  });

  const [newBanner, setNewBanner] = useState(
    createEmptyBanner
  );

  const snapshotRef = useRef([]);
  const hasLoadedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const sortedBanners = useMemo(
    () =>
      [...(heroBanners || [])].sort(
        (a, b) =>
          Number(a?.sortOrder || 0) -
          Number(b?.sortOrder || 0)
      ),
    [heroBanners]
  );

  /* -------------------------------------------------------
     Load
  ------------------------------------------------------- */

  useEffect(() => {
    fetchHomepageSettings();
  }, [fetchHomepageSettings]);

  /*
    Only create the initial snapshot after the first fetch.
    It must not update after every local field change.
  */
  useEffect(() => {
    if (!loading && !hasLoadedRef.current) {
      snapshotRef.current = cloneBanners(sortedBanners);
      hasLoadedRef.current = true;
    }
  }, [loading, sortedBanners]);

  /* -------------------------------------------------------
     Dirty Detection
  ------------------------------------------------------- */

  const isBannerDirty = (banner) => {
    const original = snapshotRef.current.find(
      (item) => item.clientId === banner.clientId
    );

    if (!original) {
      return true;
    }

    return (
      JSON.stringify(normalizeForComparison(original)) !==
      JSON.stringify(normalizeForComparison(banner))
    );
  };

  const hasDirtyBanners = useMemo(() => {
    if (
      sortedBanners.length !== snapshotRef.current.length
    ) {
      return true;
    }

    return sortedBanners.some(isBannerDirty);
  }, [sortedBanners]);

  const hasIncompleteBanners = sortedBanners.some(
    (banner) =>
      !banner.desktopImage?.trim() ||
      !banner.mobileImage?.trim()
  );

  /* -------------------------------------------------------
     Media Picker
  ------------------------------------------------------- */

  const openMediaPicker = ({
    bannerIndex = null,
    field,
    isNewBanner = false,
  }) => {
    setMediaPicker({
      open: true,
      bannerIndex,
      field,
      isNewBanner,
    });
  };

  const closeMediaPicker = () => {
    setMediaPicker({
      open: false,
      bannerIndex: null,
      field: null,
      isNewBanner: false,
    });
  };

  const handleMediaSelect = (media) => {
    if (!media?.url || !mediaPicker.field) {
      return;
    }

    const publicIdField =
      mediaPicker.field === "desktopImage"
        ? "desktopPublicId"
        : "mobilePublicId";

    if (mediaPicker.isNewBanner) {
      setNewBanner((current) => ({
        ...current,
        [mediaPicker.field]: media.url,
        [publicIdField]: media.publicId || "",
      }));
    } else if (mediaPicker.bannerIndex !== null) {
      const next = cloneBanners(sortedBanners);

      next[mediaPicker.bannerIndex] = {
        ...next[mediaPicker.bannerIndex],
        [mediaPicker.field]: media.url,
        [publicIdField]: media.publicId || "",
      };

      setHeroBannersLocal(reorderBanners(next));
    }

    closeMediaPicker();
  };

  /* -------------------------------------------------------
     Local Editing
  ------------------------------------------------------- */

  const updateField = (index, field, value) => {
    const next = cloneBanners(sortedBanners);

    next[index] = {
      ...next[index],
      [field]: value,
    };

    setHeroBannersLocal(reorderBanners(next));
  };

  /* -------------------------------------------------------
     Add
  ------------------------------------------------------- */

  const addBanner = async () => {
    if (!newBanner.desktopImage?.trim()) {
      window.alert(
        "Please select a desktop image for this banner."
      );
      return;
    }

    if (!newBanner.mobileImage?.trim()) {
      window.alert(
        "Please select a mobile image for this banner."
      );
      return;
    }

    clearMessages();

    const next = reorderBanners([
      ...sortedBanners,
      {
        ...newBanner,
        desktopImage: newBanner.desktopImage.trim(),
        mobileImage: newBanner.mobileImage.trim(),
        link: newBanner.link.trim(),
        title: newBanner.title.trim(),
      },
    ]);

    setHeroBannersLocal(next);

    const updated = await updateHeroBanners(next);

    if (updated) {
      const savedBanners =
        updated?.heroBanners || next;

      snapshotRef.current =
        cloneBanners(savedBanners);

      setNewBanner(createEmptyBanner());
    }
  };

  /* -------------------------------------------------------
     Remove
  ------------------------------------------------------- */

  const removeBanner = async (index) => {
    const shouldDelete = window.confirm(
      `Delete banner ${index + 1}?`
    );

    if (!shouldDelete) {
      return;
    }

    clearMessages();

    const next = reorderBanners(
      sortedBanners.filter(
        (_, bannerIndex) => bannerIndex !== index
      )
    );

    setHeroBannersLocal(next);

    const updated = await updateHeroBanners(next);

    if (updated) {
      snapshotRef.current = cloneBanners(
        updated?.heroBanners || next
      );
    }
  };

  /* -------------------------------------------------------
     Save
  ------------------------------------------------------- */

  const saveAllBanners = async () => {
    if (hasIncompleteBanners) {
      window.alert(
        "Every banner must have both a desktop and mobile image."
      );
      return;
    }

    clearMessages();

    const ordered = reorderBanners(sortedBanners);
    const updated = await updateHeroBanners(ordered);

    if (updated) {
      snapshotRef.current = cloneBanners(
        updated?.heroBanners || ordered
      );
    }
  };

  /* -------------------------------------------------------
     Refresh
  ------------------------------------------------------- */

  const refreshBanners = async () => {
    clearMessages();

    hasLoadedRef.current = false;

    const data = await fetchHomepageSettings();

    if (data) {
      snapshotRef.current = cloneBanners(
        data?.heroBanners || []
      );

      hasLoadedRef.current = true;
    }
  };

  /* -------------------------------------------------------
     Drag End
  ------------------------------------------------------- */

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedBanners.findIndex(
      (banner) => banner.clientId === active.id
    );

    const newIndex = sortedBanners.findIndex(
      (banner) => banner.clientId === over.id
    );

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const moved = arrayMove(
      sortedBanners,
      oldIndex,
      newIndex
    );

    setHeroBannersLocal(reorderBanners(moved));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
            Hero Banners
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Every homepage banner requires a separate desktop
            and mobile image.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshBanners}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {hasDirtyBanners && (
            <button
              type="button"
              onClick={saveAllBanners}
              disabled={saving || hasIncompleteBanners}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save all changes"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="mt-5 space-y-2">
        {loading && (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-black/5">
            Loading banners...
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
            {success}
          </div>
        )}
      </div>

      {/* Media Picker */}
      <MediaPickerModal
        open={mediaPicker.open}
        onClose={closeMediaPicker}
        folder="oatclub/banners"
        onSelect={handleMediaSelect}
      />

      {/* Add New Banner */}
      <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Add New Banner
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Both images are mandatory before adding the
              banner.
            </p>
          </div>

          <button
            type="button"
            onClick={addBanner}
            disabled={
              saving ||
              !newBanner.desktopImage ||
              !newBanner.mobileImage
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            {saving ? "Adding..." : "Add banner"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MediaSelector
            label="Desktop image"
            description="Recommended wide crop for desktop screens"
            image={newBanner.desktopImage}
            publicId={newBanner.desktopPublicId}
            type="desktop"
            onSelect={() =>
              openMediaPicker({
                field: "desktopImage",
                isNewBanner: true,
              })
            }
          />

          <MediaSelector
            label="Mobile image"
            description="Recommended portrait crop for mobile screens"
            image={newBanner.mobileImage}
            publicId={newBanner.mobilePublicId}
            type="mobile"
            onSelect={() =>
              openMediaPicker({
                field: "mobileImage",
                isNewBanner: true,
              })
            }
          />
        </div>

        <div className="mt-4 grid gap-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Banner link
            </label>

            <input
              value={newBanner.link}
              onChange={(event) =>
                setNewBanner((current) => ({
                  ...current,
                  link: event.target.value,
                }))
              }
              placeholder="/category/dresses"
              className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none ring-1 ring-black/5 transition placeholder:text-gray-400 focus:ring-2 focus:ring-gray-950"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Internal title
            </label>

            <input
              value={newBanner.title}
              onChange={(event) =>
                setNewBanner((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Summer collection banner"
              className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none ring-1 ring-black/5 transition placeholder:text-gray-400 focus:ring-2 focus:ring-gray-950"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={newBanner.isActive}
              onChange={(event) =>
                setNewBanner((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-gray-950"
            />

            Active banner
          </label>
        </div>
      </section>

      {/* Existing Banners */}
      <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Existing Banners{" "}
              <span className="text-gray-400">
                ({sortedBanners.length})
              </span>
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Drag banners to change their homepage order.
            </p>
          </div>

          {hasIncompleteBanners && (
            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-100">
              Mobile or desktop image missing
            </span>
          )}
        </div>

        {sortedBanners.length === 0 && !loading ? (
          <div className="mt-5 rounded-2xl bg-gray-50 px-5 py-10 text-center ring-1 ring-black/5">
            <ImageIcon
              size={24}
              className="mx-auto text-gray-300"
            />

            <p className="mt-2 text-sm font-medium text-gray-700">
              No banners added
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Add your first desktop and mobile banner above.
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedBanners.map(
                  (banner) => banner.clientId
                )}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {sortedBanners.map((banner, index) => (
                    <SortableBannerCard
                      key={banner.clientId}
                      banner={banner}
                      index={index}
                      isDirty={isBannerDirty(banner)}
                      saving={saving}
                      onOpenMedia={(bannerIndex, field) =>
                        openMediaPicker({
                          bannerIndex,
                          field,
                          isNewBanner: false,
                        })
                      }
                      onUpdateField={updateField}
                      onRemove={removeBanner}
                      onSave={saveAllBanners}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </section>
    </div>
  );
}