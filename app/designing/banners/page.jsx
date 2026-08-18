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

/* =========================================================
   HELPERS
========================================================= */

const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `desktop-banner-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "webm",
  "m4v",
  "avi",
  "mkv",
  "mpeg",
  "mpg",
];

const isVideoUrl = (url = "") => {
  const value = String(url || "").toLowerCase();

  return (
    value.includes("/video/upload/") ||
    VIDEO_EXTENSIONS.some((ext) =>
      value.split("?")[0].endsWith(`.${ext}`)
    )
  );
};

const isVideoMedia = (media = {}) =>
  String(media?.resourceType || "").toLowerCase() === "video" ||
  VIDEO_EXTENSIONS.includes(
    String(media?.format || "").toLowerCase()
  ) ||
  isVideoUrl(media?.url);

const emptyBanner = () => ({
  clientId: createId(),

  image: "",
  publicId: "",
  resourceType: "",

  title: "",
  link: "",

  isActive: true,
  sortOrder: 0,
});

const prepareBanners = (items = []) =>
  [...(Array.isArray(items) ? items : [])]
    .sort(
      (firstBanner, secondBanner) =>
        Number(firstBanner?.sortOrder || 0) -
        Number(secondBanner?.sortOrder || 0)
    )
    .map((banner, index) => ({
      ...banner,

      clientId:
        banner?.clientId ||
        banner?._id ||
        createId(),

      image: String(banner?.image || "").trim(),

      publicId: String(
        banner?.publicId ||
        banner?.imagePublicId ||
        ""
      ).trim(),

      resourceType:
        banner?.resourceType === "video" ||
          isVideoUrl(banner?.image)
          ? "video"
          : "image",

      title: String(banner?.title || "").trim(),
      link: String(banner?.link || "").trim(),

      isActive: banner?.isActive !== false,
      sortOrder: index,
    }));

const reindexBanners = (items = []) =>
  items.map((banner, index) => ({
    ...banner,

    clientId:
      banner?.clientId ||
      banner?._id ||
      createId(),

    sortOrder: index,
  }));

const comparable = (items = []) =>
  prepareBanners(items).map(
    ({
      image,
      publicId,
      title,
      link,
      isActive,
      sortOrder,
    }) => ({
      image: String(image || "").trim(),
      publicId: String(publicId || "").trim(),
      title: String(title || "").trim(),
      link: String(link || "").trim(),
      isActive: isActive !== false,
      sortOrder,
    })
  );

/* =========================================================
   DESKTOP IMAGE PICKER
========================================================= */

function DesktopImagePicker({
  label,
  image,
  resourceType,
  onClick,
}) {
  const isVideo =
    resourceType === "video" ||
    isVideoUrl(image);

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition hover:border-gray-400">
      <div className="relative aspect-[16/6] w-full overflow-hidden bg-gray-100">
        {image ? (
          isVideo ? (
            <video
              key={image}
              src={image}
              controls
              muted
              playsInline
              preload="metadata"
              className="h-full w-full bg-black object-cover"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Image
              src={image}
              alt={label}
              fill
              sizes="(max-width: 768px) 100vw, 900px"
              className="object-cover"
              unoptimized
            />
          )
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="absolute inset-0 flex w-full flex-col items-center justify-center gap-2 text-gray-400"
          >
            <ImageIcon size={24} />

            <span className="text-xs">
              Select desktop media
            </span>
          </button>
        )}

        {image && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase text-white">
            {isVideo ? "Video" : "Image"}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          <Monitor size={14} />
          {label}
        </span>

        <span className="text-[11px] text-gray-500">
          {image ? "Change" : "Required"}
        </span>
      </button>
    </div>
  );
}

/* =========================================================
   SORTABLE DESKTOP BANNER
========================================================= */

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
  } = useSortable({
    id: banner.clientId,
  });

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
            className="cursor-grab rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 active:cursor-grabbing"
            title="Drag to arrange"
            aria-label={`Drag desktop banner ${index + 1}`}
          >
            <GripVertical size={17} />
          </button>

          <div>
            <h3 className="text-sm font-semibold text-gray-950">
              Desktop Banner {index + 1}
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
            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
            title="Move up"
            aria-label={`Move desktop banner ${index + 1} up`}
          >
            <ArrowUp size={15} />
          </button>

          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1 || saving}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
            title="Move down"
            aria-label={`Move desktop banner ${index + 1} down`}
          >
            <ArrowDown size={15} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(index)}
            disabled={saving}
            className="rounded-lg border border-red-100 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
            title="Delete banner"
            aria-label={`Delete desktop banner ${index + 1}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DesktopImagePicker
          label="Desktop media"
          image={banner.image}
          resourceType={banner.resourceType}
          onClick={() => onMedia(index)}
        />

        <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Internal title
            </label>

            <input
              value={banner.title || ""}
              onChange={(event) =>
                onChange(
                  index,
                  "title",
                  event.target.value
                )
              }
              placeholder="Summer collection banner"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Destination link
            </label>

            <input
              value={banner.link || ""}
              onChange={(event) =>
                onChange(
                  index,
                  "link",
                  event.target.value
                )
              }
              placeholder="/category/dresses"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-950"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={banner.isActive !== false}
              onChange={(event) =>
                onChange(
                  index,
                  "isActive",
                  event.target.checked
                )
              }
              className="h-4 w-4 accent-black"
            />

            Active
          </label>

          {!banner.image && (
            <p className="text-xs font-medium text-red-600">
              Desktop image is required.
            </p>
          )}

          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
            Recommended desktop size:{" "}
            <span className="font-semibold text-gray-900">
              1920 × 720 px
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   DESKTOP BANNERS MANAGER
========================================================= */

export default function BannersManagerPage() {
  const {
    desktopHeroBanners,
    loading,
    saving,
    error,
    success,

    fetchHomepageSettings,
    setDesktopHeroBannersLocal,
    updateDesktopHeroBanners,
    clearMessages,
  } = useHomepageSettingsStore();

  const [draft, setDraft] = useState(() =>
    emptyBanner()
  );

  const [mediaPicker, setMediaPicker] = useState({
    open: false,
    index: null,
    draft: false,
  });

  const snapshotRef = useRef([]);
  const loadedRef = useRef(false);

  /* =======================================================
     DND SENSORS
  ======================================================= */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),

    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  /* =======================================================
     DERIVED STATE
  ======================================================= */

  const banners = useMemo(
    () =>
      prepareBanners(
        desktopHeroBanners || []
      ),
    [desktopHeroBanners]
  );

  const dirty =
    JSON.stringify(comparable(banners)) !==
    JSON.stringify(
      comparable(snapshotRef.current)
    );

  const incomplete = banners.some(
    (banner) => !banner.image
  );

  /* =======================================================
     INITIAL FETCH
  ======================================================= */

  useEffect(() => {
    fetchHomepageSettings();
  }, [fetchHomepageSettings]);

  useEffect(() => {
    if (!loading && !loadedRef.current) {
      const initial = prepareBanners(
        desktopHeroBanners || []
      );

      setDesktopHeroBannersLocal(initial);
      snapshotRef.current = initial;
      loadedRef.current = true;
    }
  }, [
    loading,
    desktopHeroBanners,
    setDesktopHeroBannersLocal,
  ]);

  /* =======================================================
     LOCAL UPDATE
  ======================================================= */

  const updateLocal = (nextBanners) => {
    setDesktopHeroBannersLocal(
      reindexBanners(nextBanners)
    );
  };

  const changeField = (
    index,
    field,
    value
  ) => {
    const nextBanners = [...banners];

    nextBanners[index] = {
      ...nextBanners[index],
      [field]: value,
    };

    updateLocal(nextBanners);
  };

  /* =======================================================
     REORDER
  ======================================================= */

  const moveBanner = (fromIndex, toIndex) => {
    if (
      toIndex < 0 ||
      toIndex >= banners.length
    ) {
      return;
    }

    updateLocal(
      arrayMove(
        banners,
        fromIndex,
        toIndex
      )
    );
  };

  const handleDragEnd = ({
    active,
    over,
  }) => {
    if (
      !over ||
      active.id === over.id
    ) {
      return;
    }

    const fromIndex = banners.findIndex(
      (banner) =>
        banner.clientId === active.id
    );

    const toIndex = banners.findIndex(
      (banner) =>
        banner.clientId === over.id
    );

    if (
      fromIndex !== -1 &&
      toIndex !== -1
    ) {
      moveBanner(fromIndex, toIndex);
    }
  };

  /* =======================================================
     MEDIA PICKER
  ======================================================= */

  const openMedia = (
    index,
    isDraft = false
  ) => {
    setMediaPicker({
      open: true,
      index,
      draft: isDraft,
    });
  };

  const closeMediaPicker = () => {
    setMediaPicker({
      open: false,
      index: null,
      draft: false,
    });
  };

  const handleMediaSelect = (media) => {
    if (!media?.url) return;

    const publicId =
      media?.publicId ||
      media?.public_id ||
      "";

    const resourceType = isVideoMedia(media)
      ? "video"
      : "image";

    if (mediaPicker.draft) {
      setDraft((current) => ({
        ...current,
        image: media.url,
        publicId,
        resourceType,
      }));
    } else {
      const nextBanners = [...banners];

      if (
        mediaPicker.index === null ||
        !nextBanners[mediaPicker.index]
      ) {
        closeMediaPicker();
        return;
      }

      nextBanners[mediaPicker.index] = {
        ...nextBanners[mediaPicker.index],
        image: media.url,
        publicId,
        resourceType,
      };

      updateLocal(nextBanners);
    }

    closeMediaPicker();
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const saveBanners = async (
    items = banners
  ) => {
    if (
      items.some(
        (banner) => !banner.image
      )
    ) {
      window.alert(
        "Every desktop banner needs an image."
      );

      return false;
    }

    clearMessages?.();

    const ordered = reindexBanners(
      items
    ).map((banner) => ({
      image: String(
        banner?.image || ""
      ).trim(),

      publicId: String(
        banner?.publicId || ""
      ).trim(),

      title: String(
        banner?.title || ""
      ).trim(),

      link: String(
        banner?.link || ""
      ).trim(),

      isActive:
        banner?.isActive !== false,

      sortOrder: Number(
        banner?.sortOrder || 0
      ),
    }));

    const result =
      await updateDesktopHeroBanners(
        ordered
      );

    if (result) {
      const saved = prepareBanners(
        Array.isArray(result)
          ? result
          : result?.desktopHeroBanners ||
          ordered
      );

      setDesktopHeroBannersLocal(saved);
      snapshotRef.current = saved;

      return true;
    }

    return false;
  };

  /* =======================================================
     ADD BANNER
  ======================================================= */

  const addBanner = async () => {
    if (!draft.image) {
      window.alert(
        "Please select a desktop image."
      );

      return;
    }

    const nextBanners = reindexBanners([
      ...banners,
      {
        ...draft,

        image: draft.image.trim(),

        publicId:
          draft.publicId.trim(),

        title:
          draft.title.trim(),

        link:
          draft.link.trim(),
      },
    ]);

    setDesktopHeroBannersLocal(
      nextBanners
    );

    const saved =
      await saveBanners(nextBanners);

    if (saved) {
      setDraft(emptyBanner());
    }
  };

  /* =======================================================
     DELETE BANNER
  ======================================================= */

  const deleteBanner = async (
    index
  ) => {
    const banner = banners[index];

    const shouldDelete =
      window.confirm(
        `Delete desktop banner ${index + 1
        }${banner?.title
          ? ` — ${banner.title}`
          : ""
        }?`
      );

    if (!shouldDelete) return;

    const nextBanners =
      reindexBanners(
        banners.filter(
          (_, bannerIndex) =>
            bannerIndex !== index
        )
      );

    setDesktopHeroBannersLocal(
      nextBanners
    );

    const saved =
      await saveBanners(nextBanners);

    if (saved) {
      snapshotRef.current =
        nextBanners;
    }
  };

  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh = async () => {
    clearMessages?.();
    loadedRef.current = false;

    const result =
      await fetchHomepageSettings();

    if (result) {
      const nextBanners =
        prepareBanners(
          result?.desktopHeroBanners ||
          []
        );

      setDesktopHeroBannersLocal(
        nextBanners
      );

      snapshotRef.current =
        nextBanners;

      loadedRef.current = true;
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <MediaPickerModal
        open={mediaPicker.open}
        onClose={closeMediaPicker}
        folder="oatclub/desktop-banners"
        onSelect={handleMediaSelect}
      />

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Homepage settings
            </p>

            <h1 className="mt-2 text-2xl font-bold text-gray-950">
              Desktop Hero Banners
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Add, arrange, activate and manage desktop homepage banners.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading || saving}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            {dirty && (
              <button
                type="button"
                onClick={() =>
                  saveBanners()
                }
                disabled={
                  saving ||
                  incomplete
                }
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
              >
                <Save size={15} />

                {saving
                  ? "Saving..."
                  : "Save arrangement"}
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        {(error || success) && (
          <div
            className={`mt-5 rounded-xl px-4 py-3 text-sm ${error
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
              }`}
          >
            {error || success}
          </div>
        )}

        {/* Add banner */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-950">
                Add Desktop Banner
              </h2>

              <p className="text-xs text-gray-500">
                Select desktop image or video and optionally add a title and link.              </p>
            </div>

            <button
              type="button"
              onClick={addBanner}
              disabled={
                saving ||
                !draft.image
              }
              className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
            >
              <Plus size={15} />
              Add banner
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <DesktopImagePicker
              label="Desktop media"
              image={draft.image}
              resourceType={draft.resourceType}
              onClick={() => openMedia(null, true)}
            />

            <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Internal title
                </label>

                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Summer collection banner"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Destination link
                </label>

                <input
                  value={draft.link}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        link:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="/category/dresses"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    draft.isActive
                  }
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        isActive:
                          event.target
                            .checked,
                      })
                    )
                  }
                  className="h-4 w-4 accent-black"
                />

                Active
              </label>

              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                Recommended:{" "}
                <span className="font-semibold text-gray-900">
                  1920 × 720 px
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Arrangement */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-950">
                Desktop Banner Arrangement (
                {banners.length})
              </h2>

              <p className="text-xs text-gray-500">
                Hold the grip icon and drag. Arrow buttons also work.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600">
              <Monitor size={14} />
              Desktop only
            </div>
          </div>

          {banners.length === 0 &&
            !loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
              <Monitor
                size={30}
                className="mx-auto text-gray-400"
              />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                No desktop banners added
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Add your first desktop hero banner above.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={
                closestCenter
              }
              onDragEnd={
                handleDragEnd
              }
            >
              <SortableContext
                items={banners.map(
                  (banner) =>
                    banner.clientId
                )}
                strategy={
                  verticalListSortingStrategy
                }
              >
                <div className="space-y-4">
                  {banners.map(
                    (
                      banner,
                      index
                    ) => (
                      <SortableBanner
                        key={
                          banner.clientId
                        }
                        banner={
                          banner
                        }
                        index={
                          index
                        }
                        total={
                          banners.length
                        }
                        saving={
                          saving
                        }
                        onMove={
                          moveBanner
                        }
                        onChange={
                          changeField
                        }
                        onMedia={
                          openMedia
                        }
                        onDelete={
                          deleteBanner
                        }
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </main>
  );
}
