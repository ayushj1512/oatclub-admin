"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Sparkles, Trash2, X } from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";

const cleanUrls = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) =>
          typeof item === "string" ? item.trim() : String(item?.url || "").trim(),
        )
        .filter(Boolean),
    ),
  );

const isVideoUrl = (url = "") =>
  /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ||
  String(url).includes("/video/upload/");

function MediaPreview({ url, onRemove, primary, readonly }) {
  const isVideo = isVideoUrl(url);

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-gray-50">
      <div className="aspect-[4/5]">
        {isVideo ? (
          <video
            src={url}
            controls
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {primary ? (
        <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-[10px] font-medium text-white">
          Thumbnail
        </span>
      ) : null}

      {!readonly ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-red-600 shadow opacity-0 transition group-hover:opacity-100"
          aria-label="Remove media"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

export default function ProductMediaManager({
  images = [],
  productSpotlight = [],
  onImagesChange,
  onSpotlightChange,
  readonly = false,
}) {
  const [picker, setPicker] = useState(null);

  const safeImages = useMemo(() => cleanUrls(images), [images]);
  const safeSpotlight = useMemo(
    () => cleanUrls(productSpotlight),
    [productSpotlight],
  );

  const closePicker = () => setPicker(null);

  const handleSelect = (selected) => {
    const selectedUrls = cleanUrls(
      Array.isArray(selected) ? selected : [selected],
    );

    if (picker === "images") {
      onImagesChange?.(cleanUrls([...safeImages, ...selectedUrls]));
    }

    if (picker === "spotlight") {
      onSpotlightChange?.(cleanUrls([...safeSpotlight, ...selectedUrls]));
    }

    closePicker();
  };

  const removeImage = (url) => {
    onImagesChange?.(safeImages.filter((item) => item !== url));
  };

  const removeSpotlight = (url) => {
    onSpotlightChange?.(
      safeSpotlight.filter((item) => item !== url),
    );
  };

  return (
    <>
      <div className="space-y-8">
        {/* Product gallery */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">
                Product Images
              </h2>
              <p className="text-sm text-gray-500">
                First image will be used as the product thumbnail.
              </p>
            </div>

            {!readonly ? (
              <button
                type="button"
                onClick={() => setPicker("images")}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                <ImagePlus size={16} />
                Add Images
              </button>
            ) : null}
          </div>

          {safeImages.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {safeImages.map((url, index) => (
                <MediaPreview
                  key={`${url}-${index}`}
                  url={url}
                  primary={index === 0}
                  readonly={readonly}
                  onRemove={() => removeImage(url)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
              No product images selected.
            </div>
          )}
        </section>

        {/* Product spotlight */}
        <section className="space-y-4 border-t pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <Sparkles size={17} />
                Product Spotlight
              </h2>

              <p className="text-sm text-gray-500">
                Add images or videos for the product spotlight section.
              </p>
            </div>

            {!readonly ? (
              <button
                type="button"
                onClick={() => setPicker("spotlight")}
                className="inline-flex items-center gap-2 rounded-lg border border-black px-4 py-2 text-sm font-medium text-black"
              >
                <Sparkles size={16} />
                Add Spotlight Media
              </button>
            ) : null}
          </div>

          {safeSpotlight.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {safeSpotlight.map((url, index) => (
                <MediaPreview
                  key={`${url}-${index}`}
                  url={url}
                  readonly={readonly}
                  onRemove={() => removeSpotlight(url)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
              No spotlight media selected.
            </div>
          )}
        </section>
      </div>

      <MediaPickerModal
        open={Boolean(picker)}
        onClose={closePicker}
        onSelect={handleSelect}
        multiple
        folder={
          picker === "spotlight"
            ? "oatclub/products/spotlight"
            : "oatclub/products"
        }
      />
    </>
  );
}