"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Phone,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useHomepageSettingsStore } from "@/store/useHomepageSettingsStore";

/* =========================================================
   HELPERS
========================================================= */

const createClientId = () =>
  `mobile-banner-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const normalizeOrder = (items = []) =>
  items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));

const createEmptyBanner = (sortOrder = 0) => ({
  clientId: createClientId(),
  image: "",
  publicId: "",
  title: "",
  link: "",
  isActive: true,
  sortOrder,
});

/* =========================================================
   PAGE
========================================================= */

export default function MobileBannersPage() {
  const {
    mobileHeroBanners,
    loading,
    saving,
    error,
    success,

    fetchHomepageSettings,
    setMobileHeroBannersLocal,
    updateMobileHeroBanners,
    clearMessages,
  } = useHomepageSettingsStore();

  const [mediaTarget, setMediaTarget] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  /* =======================================================
     FETCH SETTINGS
  ======================================================= */

  useEffect(() => {
    fetchHomepageSettings();
  }, [fetchHomepageSettings]);

  /* =======================================================
     SORTED BANNERS
  ======================================================= */

  const sortedBanners = useMemo(
    () =>
      [...(mobileHeroBanners || [])].sort(
        (firstBanner, secondBanner) =>
          Number(firstBanner?.sortOrder || 0) -
          Number(secondBanner?.sortOrder || 0)
      ),
    [mobileHeroBanners]
  );

  /* =======================================================
     MEDIA SELECT
  ======================================================= */

  const handleMediaSelect = (media) => {
    if (!media?.url || mediaTarget === null) return;

    const nextBanners = sortedBanners.map((banner, index) =>
      index === mediaTarget
        ? {
            ...banner,
            image: media.url,
            publicId:
              media?.publicId ||
              media?.public_id ||
              banner?.publicId ||
              "",
          }
        : banner
    );

    setMobileHeroBannersLocal(nextBanners);
    setMediaTarget(null);
  };

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  const updateField = (index, field, value) => {
    const nextBanners = sortedBanners.map((banner, bannerIndex) =>
      bannerIndex === index
        ? {
            ...banner,
            [field]: value,
          }
        : banner
    );

    setMobileHeroBannersLocal(nextBanners);
  };

  /* =======================================================
     ADD BANNER
  ======================================================= */

  const addBanner = () => {
    clearMessages?.();

    const nextBanners = normalizeOrder([
      ...sortedBanners,
      createEmptyBanner(sortedBanners.length),
    ]);

    setMobileHeroBannersLocal(nextBanners);
  };

  /* =======================================================
     REMOVE BANNER
  ======================================================= */

  const removeBanner = (index) => {
    const banner = sortedBanners[index];

    const shouldRemove = window.confirm(
      `Remove mobile banner #${index + 1}${
        banner?.title ? ` — ${banner.title}` : ""
      }?`
    );

    if (!shouldRemove) return;

    const nextBanners = normalizeOrder(
      sortedBanners.filter((_, bannerIndex) => bannerIndex !== index)
    );

    setMobileHeroBannersLocal(nextBanners);

    if (mediaTarget === index) {
      setMediaTarget(null);
    }
  };

  /* =======================================================
     DRAG AND DROP
  ======================================================= */

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    const nextBanners = [...sortedBanners];
    const [draggedBanner] = nextBanners.splice(dragIndex, 1);

    nextBanners.splice(dropIndex, 0, draggedBanner);

    setMobileHeroBannersLocal(normalizeOrder(nextBanners));
    setDragIndex(null);
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const save = async () => {
    clearMessages?.();

    const payload = normalizeOrder(
      sortedBanners.map((banner) => ({
        image: String(banner?.image || "").trim(),
        publicId: String(banner?.publicId || "").trim(),
        title: String(banner?.title || "").trim(),
        link: String(banner?.link || "").trim(),
        isActive: banner?.isActive !== false,
        sortOrder: Number(banner?.sortOrder || 0),
      }))
    );

    const missingImageIndex = payload.findIndex(
      (banner) => !banner?.image
    );

    if (missingImageIndex !== -1) {
      window.alert(
        `Please add an image for mobile banner #${
          missingImageIndex + 1
        }.`
      );

      return;
    }

    await updateMobileHeroBanners(payload);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <MediaPickerModal
        open={mediaTarget !== null}
        onClose={() => setMediaTarget(null)}
        folder="oatclub/mobile-banners"
        onSelect={handleMediaSelect}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Homepage settings
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Mobile Banners
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage mobile hero banners independently from desktop banners.
            Recommended size:{" "}
            <span className="font-semibold text-zinc-950">
              1200 × 1600 px / 3:4 ratio
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addBanner}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Add banner
          </button>

          <button
            type="button"
            onClick={fetchHomepageSettings}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save mobile banners"}
          </button>
        </div>
      </div>

      {/* Status */}
      {(loading || error || success) && (
        <div
          className={`mb-5 border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {loading ? "Loading homepage settings..." : error || success}
        </div>
      )}

      {/* Mobile banner manager */}
      <section className="border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">
              Mobile banner stream
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Add, remove, hide, or drag cards to rearrange mobile banners.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600">
              {sortedBanners.length}{" "}
              {sortedBanners.length === 1 ? "banner" : "banners"}
            </span>

            <div className="hidden items-center gap-2 text-xs font-medium text-zinc-500 md:flex">
              <Phone size={14} />
              3:4 • 1200 × 1600 px
            </div>
          </div>
        </div>

        {sortedBanners.length === 0 ? (
          <div className="border border-dashed border-zinc-300 bg-zinc-50 px-4 py-14 text-center">
            <Phone
              size={30}
              className="mx-auto text-zinc-400"
            />

            <p className="mt-3 text-sm font-semibold text-zinc-700">
              No mobile banners added
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Mobile banners are now managed separately from desktop banners.
            </p>

            <button
              type="button"
              onClick={addBanner}
              className="mt-4 inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              <Plus size={16} />
              Add first banner
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedBanners.map((banner, index) => (
              <article
                key={
                  banner?.clientId ||
                  banner?._id ||
                  `mobile-banner-${index}`
                }
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setDragIndex(null)}
                className={`border bg-zinc-50 p-4 transition ${
                  dragIndex === index
                    ? "border-zinc-950 opacity-60"
                    : "border-zinc-200"
                }`}
              >
                {/* Card header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="cursor-grab border border-zinc-300 bg-white p-2 active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-label={`Drag mobile banner ${index + 1}`}
                    >
                      <GripVertical size={15} />
                    </button>

                    <span className="bg-white px-2 py-1 text-xs font-semibold">
                      #{index + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBanner(index)}
                    disabled={saving}
                    className="inline-flex items-center justify-center border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    title="Remove banner"
                    aria-label={`Remove mobile banner ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Image preview */}
                <div className="relative mx-auto aspect-[3/4] w-full max-w-[270px] overflow-hidden border border-zinc-200 bg-zinc-100">
                  {banner?.image ? (
                    <Image
                      src={banner.image}
                      alt={banner?.title || `Mobile banner ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 270px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-zinc-400">
                      <Phone size={24} />

                      <span className="mt-2">
                        No mobile image selected
                      </span>
                    </div>
                  )}

                  <div
                    className={`absolute right-2 top-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      banner?.isActive === false
                        ? "bg-white text-zinc-500"
                        : "bg-zinc-950 text-white"
                    }`}
                  >
                    {banner?.isActive === false ? "Hidden" : "Active"}
                  </div>
                </div>

                {/* Media button */}
                <button
                  type="button"
                  onClick={() => setMediaTarget(index)}
                  className="mt-3 w-full border border-zinc-300 bg-white px-2 py-2 text-xs font-semibold transition hover:bg-zinc-100"
                >
                  {banner?.image
                    ? "Change mobile image"
                    : "Add mobile image"}
                </button>

                <div className="mt-2 border border-zinc-200 bg-zinc-100 px-3 py-2 text-center text-xs font-medium text-zinc-600">
                  Recommended: 3:4 ratio • 1200 × 1600 px
                </div>

                {/* Title */}
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Banner title
                  </span>

                  <input
                    value={banner?.title || ""}
                    onChange={(event) =>
                      updateField(index, "title", event.target.value)
                    }
                    className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-zinc-950"
                    placeholder="Title optional"
                  />
                </label>

                {/* Link */}
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Destination link
                  </span>

                  <input
                    value={banner?.link || ""}
                    onChange={(event) =>
                      updateField(index, "link", event.target.value)
                    }
                    className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-950"
                    placeholder="/category/new-arrivals"
                  />
                </label>

                {/* Visibility */}
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      index,
                      "isActive",
                      banner?.isActive === false
                    )
                  }
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-zinc-100"
                >
                  {banner?.isActive === false ? (
                    <>
                      <EyeOff size={15} />
                      Hidden
                    </>
                  ) : (
                    <>
                      <Eye size={15} />
                      Active
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}