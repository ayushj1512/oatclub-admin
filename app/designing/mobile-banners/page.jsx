"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, GripVertical, Phone, RefreshCw, Save } from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useHomepageSettingsStore } from "@/store/useHomepageSettingsStore";

const normalizeOrder = (items = []) =>
  items.map((item, index) => ({ ...item, sortOrder: index }));

export default function MobileBannersPage() {
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

  const [mediaTarget, setMediaTarget] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    fetchHomepageSettings();
  }, [fetchHomepageSettings]);

  const sortedBanners = useMemo(
    () =>
      [...(heroBanners || [])].sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      ),
    [heroBanners]
  );

  const handleMediaSelect = (media) => {
    if (!media?.url || mediaTarget === null) return;

    const next = sortedBanners.map((item, index) =>
      index === mediaTarget
        ? {
            ...item,
            mobileImage: media.url,
            desktopImage: item?.desktopImage || item?.mobileImage || media.url,
          }
        : item
    );

    setHeroBannersLocal(next);
    setMediaTarget(null);
  };

  const updateField = (index, field, value) => {
    const next = sortedBanners.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );

    setHeroBannersLocal(next);
  };

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;

    const next = [...sortedBanners];
    const [draggedItem] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, draggedItem);

    setHeroBannersLocal(normalizeOrder(next));
    setDragIndex(null);
  };

  const save = async () => {
    clearMessages?.();

    const payload = normalizeOrder(
      sortedBanners.map((item) => ({
        ...item,

        // backend requires desktopImage
        desktopImage:
          item?.desktopImage?.trim() || item?.mobileImage?.trim() || "",

        mobileImage: item?.mobileImage?.trim() || "",
        title: item?.title?.trim() || "",
        link: item?.link?.trim() || "",
        isActive: item?.isActive !== false,
      }))
    );

    const hasMissingMobile = payload.some(
      (item) => item?.isActive !== false && !item?.mobileImage
    );

    if (hasMissingMobile) {
      alert("Please add mobile image for every active banner.");
      return;
    }

    const hasMissingDesktop = payload.some((item) => !item?.desktopImage);

    if (hasMissingDesktop) {
      alert(
        "Some banners do not have desktop images. Please add desktop banners first from Banners Manager."
      );
      return;
    }

    await updateHeroBanners(payload);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <MediaPickerModal
        open={mediaTarget !== null}
        onClose={() => setMediaTarget(null)}
        folder="oatclub/mobile-banners"
        onSelect={handleMediaSelect}
      />

      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Homepage settings
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Mobile Banners
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage mobile hero banners. Recommended size:{" "}
            <span className="font-semibold text-zinc-950">
              1200 × 1600 px / 3:4 ratio
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchHomepageSettings}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save mobile banners"}
          </button>
        </div>
      </div>

      {(loading || error || success) && (
        <div className="mb-5 border border-zinc-200 bg-white px-4 py-3 text-sm">
          {loading ? "Loading homepage settings..." : error || success}
        </div>
      )}

      <section className="border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">
              Mobile banner stream
            </h2>
            <p className="text-xs text-zinc-500">
              Drag and drop cards to rearrange banners.
            </p>
          </div>

          <div className="hidden items-center gap-2 text-xs font-medium text-zinc-500 md:flex">
            <Phone size={14} />
            3:4 • 1200 × 1600 px
          </div>
        </div>

        {sortedBanners.length === 0 ? (
          <div className="border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
            No hero banners found. Add hero banners first.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedBanners.map((item, index) => (
              <div
                key={`${item.title || "banner"}-${index}`}
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
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="cursor-grab border border-zinc-300 bg-white p-2 active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <GripVertical size={15} />
                    </button>

                    <span className="bg-white px-2 py-1 text-xs font-semibold">
                      #{index + 1}
                    </span>
                  </div>

                  <span className="text-xs font-medium text-zinc-500">
                    {item.isActive === false ? "Hidden" : "Active"}
                  </span>
                </div>

                <div className="relative mx-auto aspect-[3/4] w-full max-w-[270px] overflow-hidden border border-zinc-200 bg-zinc-100">
                  {item.mobileImage ? (
                    <Image
                      src={item.mobileImage}
                      alt={item.title || "Mobile banner"}
                      fill
                      sizes="(max-width: 640px) 100vw, 270px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-zinc-400">
                      No mobile image selected
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMediaTarget(index)}
                  className="mt-3 w-full border border-zinc-300 bg-white px-2 py-2 text-xs font-semibold hover:bg-zinc-100"
                >
                  {item.mobileImage ? "Change mobile image" : "Add mobile image"}
                </button>

                <div className="mt-2 border border-zinc-200 bg-zinc-100 px-3 py-2 text-center text-xs font-medium text-zinc-600">
                  Recommended: 3:4 Ratio • 1200 × 1600 px
                </div>

                <input
                  value={item.title || ""}
                  onChange={(event) =>
                    updateField(index, "title", event.target.value)
                  }
                  className="mt-3 w-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-zinc-950"
                  placeholder="Title optional"
                />

                <input
                  value={item.link || ""}
                  onChange={(event) =>
                    updateField(index, "link", event.target.value)
                  }
                  className="mt-2 w-full border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-950"
                  placeholder="/collection/new-arrivals"
                />

                <button
                  type="button"
                  onClick={() =>
                    updateField(index, "isActive", item.isActive === false)
                  }
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                >
                  {item.isActive === false ? (
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}