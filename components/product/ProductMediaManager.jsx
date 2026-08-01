"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  Sparkles,
  Trash2,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";

const cleanUrls = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) =>
          typeof item === "string"
            ? item.trim()
            : String(item?.url || "").trim(),
        )
        .filter(Boolean),
    ),
  );

const isVideoUrl = (url = "") =>
  /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ||
  String(url).includes("/video/upload/");

const reorderItems = (items, fromIndex, toIndex) => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const updatedItems = [...items];
  const [movedItem] = updatedItems.splice(fromIndex, 1);

  updatedItems.splice(toIndex, 0, movedItem);

  return updatedItems;
};

function MediaPreview({
  url,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnter,
  onDragEnd,
  primary = false,
  readonly = false,
  dragging = false,
}) {
  const isVideo = isVideoUrl(url);

  return (
    <div
      draggable={!readonly}
      onDragStart={(event) => onDragStart?.(event, index)}
      onDragEnter={(event) => onDragEnter?.(event, index)}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      className={[
        "group relative overflow-hidden rounded-xl border bg-gray-50 transition",
        !readonly ? "cursor-grab active:cursor-grabbing" : "",
        dragging
          ? "scale-[0.98] border-black opacity-50"
          : "border-gray-200",
      ].join(" ")}
    >
      <div className="aspect-[4/5]">
        {isVideo ? (
          <video
            src={url}
            controls
            muted
            playsInline
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt={`Product media ${index + 1}`}
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
        )}
      </div>

      {primary ? (
        <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-[10px] font-medium text-white shadow">
          Thumbnail
        </span>
      ) : (
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white shadow">
          {index + 1}
        </span>
      )}

      {!readonly ? (
        <>
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove?.();
              }}
              onMouseDown={(event) => event.stopPropagation()}
              className="rounded-full bg-white/95 p-1.5 text-red-600 shadow transition hover:bg-red-50"
              aria-label="Remove media"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
            <div className="flex items-center overflow-hidden rounded-lg bg-white/95 shadow">
              <button
                type="button"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveUp?.();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                className="border-r p-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move media up"
                title="Move left/up"
              >
                <ArrowUp size={14} />
              </button>

              <button
                type="button"
                disabled={index === total - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveDown?.();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                className="p-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move media down"
                title="Move right/down"
              >
                <ArrowDown size={14} />
              </button>
            </div>

            <div
              className="flex items-center gap-1 rounded-lg bg-black/80 px-2 py-1.5 text-[10px] font-medium text-white shadow"
              title="Drag to rearrange"
            >
              <GripVertical size={13} />
              Drag
            </div>
          </div>
        </>
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

  const [dragState, setDragState] = useState({
    type: null,
    index: null,
  });

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
      onSpotlightChange?.(
        cleanUrls([...safeSpotlight, ...selectedUrls]),
      );
    }

    closePicker();
  };

  const removeImage = (url) => {
    onImagesChange?.(
      safeImages.filter((item) => item !== url),
    );
  };

  const removeSpotlight = (url) => {
    onSpotlightChange?.(
      safeSpotlight.filter((item) => item !== url),
    );
  };

  const moveImage = (fromIndex, toIndex) => {
    onImagesChange?.(
      reorderItems(safeImages, fromIndex, toIndex),
    );
  };

  const moveSpotlight = (fromIndex, toIndex) => {
    onSpotlightChange?.(
      reorderItems(safeSpotlight, fromIndex, toIndex),
    );
  };

  const handleDragStart = (event, type, index) => {
    setDragState({
      type,
      index,
    });

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnter = (event, type, targetIndex) => {
    event.preventDefault();

    if (
      dragState.type !== type ||
      dragState.index === null ||
      dragState.index === targetIndex
    ) {
      return;
    }

    if (type === "images") {
      onImagesChange?.(
        reorderItems(
          safeImages,
          dragState.index,
          targetIndex,
        ),
      );
    }

    if (type === "spotlight") {
      onSpotlightChange?.(
        reorderItems(
          safeSpotlight,
          dragState.index,
          targetIndex,
        ),
      );
    }

    setDragState({
      type,
      index: targetIndex,
    });
  };

  const handleDragEnd = () => {
    setDragState({
      type: null,
      index: null,
    });
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
                Drag media or use the arrows to rearrange it. The first
                image will be used as the product thumbnail.
              </p>
            </div>

            {!readonly ? (
              <button
                type="button"
                onClick={() => setPicker("images")}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
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
                  key={url}
                  url={url}
                  index={index}
                  total={safeImages.length}
                  primary={index === 0}
                  readonly={readonly}
                  dragging={
                    dragState.type === "images" &&
                    dragState.index === index
                  }
                  onRemove={() => removeImage(url)}
                  onMoveUp={() => moveImage(index, index - 1)}
                  onMoveDown={() => moveImage(index, index + 1)}
                  onDragStart={(event) =>
                    handleDragStart(event, "images", index)
                  }
                  onDragEnter={(event) =>
                    handleDragEnter(event, "images", index)
                  }
                  onDragEnd={handleDragEnd}
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
                Add and rearrange images or videos for the product
                spotlight section.
              </p>
            </div>

            {!readonly ? (
              <button
                type="button"
                onClick={() => setPicker("spotlight")}
                className="inline-flex items-center gap-2 rounded-lg border border-black px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-50"
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
                  key={url}
                  url={url}
                  index={index}
                  total={safeSpotlight.length}
                  readonly={readonly}
                  dragging={
                    dragState.type === "spotlight" &&
                    dragState.index === index
                  }
                  onRemove={() => removeSpotlight(url)}
                  onMoveUp={() =>
                    moveSpotlight(index, index - 1)
                  }
                  onMoveDown={() =>
                    moveSpotlight(index, index + 1)
                  }
                  onDragStart={(event) =>
                    handleDragStart(event, "spotlight", index)
                  }
                  onDragEnter={(event) =>
                    handleDragEnter(event, "spotlight", index)
                  }
                  onDragEnd={handleDragEnd}
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