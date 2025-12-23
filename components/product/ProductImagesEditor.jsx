"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, X, Star, Plus } from "lucide-react";
import Media from "@/components/product/Media";

/**
 * ProductImagesEditor
 *
 * images: string[]
 * thumbnail: string
 * onChange: ({ images, thumbnail }) => void
 */

export default function ProductImagesEditor({
  images = [],
  thumbnail = "",
  onChange,
}) {
  const safeImages = useMemo(
    () => (Array.isArray(images) ? images : []),
    [images]
  );

  const [mode, setMode] = useState("images"); // images | thumbnail
  const [openMedia, setOpenMedia] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* 🔍 Preview modal */
  const [preview, setPreview] = useState(null);

  /* 🔀 Drag state */
  const dragIndex = useRef(null);

  /* ---------------- AUTO THUMBNAIL ---------------- */
  useEffect(() => {
    if (!thumbnail && safeImages.length > 0) {
      onChange({
        images: safeImages,
        thumbnail: safeImages[0],
      });
    }
  }, [safeImages, thumbnail, onChange]);

  /* ---------------- OPEN MEDIA PICKER ---------------- */
  const openPicker = (m) => {
    setMode(m);
    setRefreshKey((k) => k + 1);
    setOpenMedia(true);
  };

  /* ---------------- MEDIA SELECT ---------------- */
  const handleSelect = (selection) => {
    if (!selection) return;

    if (mode === "thumbnail") {
      onChange({
        images: safeImages,
        thumbnail: selection.url,
      });
      setOpenMedia(false);
      return;
    }

    const urls = Array.isArray(selection)
      ? selection.map((m) => m.url)
      : [selection.url];

    const merged = Array.from(new Set([...safeImages, ...urls]));

    onChange({
      images: merged,
      thumbnail: thumbnail || merged[0] || "",
    });

    setOpenMedia(false);
  };

  /* ---------------- REMOVE IMAGE ---------------- */
  const removeImage = (url) => {
    const filtered = safeImages.filter((i) => i !== url);

    onChange({
      images: filtered,
      thumbnail: url === thumbnail ? filtered[0] || "" : thumbnail,
    });
  };

  /* ---------------- SET THUMBNAIL ---------------- */
  const setAsThumbnail = (url) => {
    onChange({
      images: safeImages,
      thumbnail: url,
    });
  };

  /* ---------------- DRAG & REORDER ---------------- */
  const onDragStart = (index) => {
    dragIndex.current = index;
  };

  const onDrop = (index) => {
    const from = dragIndex.current;
    if (from === null || from === index) return;

    const reordered = [...safeImages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);

    dragIndex.current = null;

    onChange({
      images: reordered,
      thumbnail: reordered.includes(thumbnail)
        ? thumbnail
        : reordered[0] || "",
    });
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Product Images</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openPicker("images")}
            className="px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1 hover:bg-gray-50"
          >
            <Plus size={14} />
            Gallery
          </button>

          <button
            type="button"
            onClick={() => openPicker("thumbnail")}
            className="px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1 hover:bg-gray-50"
          >
            <Star size={14} />
            Thumbnail
          </button>
        </div>
      </div>

      {/* IMAGE GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {safeImages.length > 0 ? (
          safeImages.map((img, index) => (
            <div
              key={img}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
              className={`relative group rounded-lg border overflow-hidden bg-gray-50 cursor-move ${
                img === thumbnail ? "ring-2 ring-black" : ""
              }`}
            >
              {/* IMAGE */}
              <div
                onClick={() => setPreview(img)}
                className="h-36 flex items-center justify-center bg-white cursor-pointer"
              >
                <img
                  src={img}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* THUMBNAIL BADGE */}
              {img === thumbnail && (
                <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-2 py-0.5 rounded">
                  Thumbnail
                </span>
              )}

              {/* HOVER ACTIONS */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAsThumbnail(img)}
                  className="p-2 bg-white rounded-full"
                  title="Set thumbnail"
                >
                  <Star size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="p-2 bg-white rounded-full"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-sm text-gray-500 flex items-center gap-2">
            <ImageIcon size={16} />
            No images selected
          </div>
        )}
      </div>

      {/* MEDIA PICKER */}
      {openMedia && (
        <div className="border rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b bg-gray-50 text-sm font-medium flex justify-between">
            <span>
              {mode === "thumbnail"
                ? "Select ONE image as thumbnail"
                : "Select MULTIPLE images for gallery"}
            </span>
            <button
              type="button"
              onClick={() => setOpenMedia(false)}
              className="text-xs underline"
            >
              Close
            </button>
          </div>

          <Media
            refreshKey={refreshKey}
            multiple={mode === "images"}
            allowUpload
            onSelect={handleSelect}
          />
        </div>
      )}

      {/* PREVIEW MODAL */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              className="absolute top-2 right-2 text-white"
              onClick={() => setPreview(null)}
            >
              <X size={24} />
            </button>
            <img
              src={preview}
              alt=""
              className="max-h-[80vh] max-w-full object-contain bg-white rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
