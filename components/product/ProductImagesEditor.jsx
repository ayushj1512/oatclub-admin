"use client";

import { useMemo, useState } from "react";
import { ImagePlus, X, GripVertical } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/**
 * ProductImagesEditor
 * ✅ Uses universal MediaPickerModal (as per Media System README)
 * 🚫 No upload logic here.
 *
 * Props:
 *  - value?: string[]        (existing image URLs)
 *  - onChange?: (urls: string[], mediaRefs?: {url, publicId}[]) => void
 *  - folder?: string         (cloudinary folder)
 *  - max?: number            (max images)
 *
 * Recommended storage:
 *  - urls array OR (url + publicId) in separate field
 */
export default function ProductImagesEditor({
  value = [],
  onChange,
  folder = "miray/products",
  max = 12,
}) {
  // store urls only for UI
  const urls = Array.isArray(value) ? value.filter(Boolean) : [];

  // state for modal
  const [thumbOpen, setThumbOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // keep media refs (optional)
  const [mediaRefs, setMediaRefs] = useState([]);

  const canAddMore = urls.length < max;

  const thumbnail = urls?.[0] || null;
  const gallery = urls?.slice(1) || [];

  const safeEmit = (nextUrls, nextRefs = mediaRefs) => {
    onChange?.(nextUrls, nextRefs);
  };

  /* ==============================
     Selection Handlers
  ============================== */

  // Single image -> set as thumbnail (index 0)
  const onSelectThumb = (media) => {
    if (!media?.url) return;

    const nextUrls = [media.url, ...gallery].slice(0, max);

    // store refs (optional)
    const nextRefs = upsertRef(mediaRefs, media);

    setMediaRefs(nextRefs);
    safeEmit(nextUrls, nextRefs);

    setThumbOpen(false);
  };

  // Multiple images -> append to gallery
  const onSelectGallery = (list) => {
    const picked = Array.isArray(list) ? list : [];
    if (!picked.length) {
      setGalleryOpen(false);
      return;
    }

    const addUrls = picked.map((m) => m.url).filter(Boolean);

    // merge and unique
    const merged = unique([thumbnail, ...gallery, ...addUrls].filter(Boolean)).slice(
      0,
      max
    );

    // thumbnail remains first
    const nextUrls = merged;

    // refs merge
    const nextRefs = mergeRefs(mediaRefs, picked);

    setMediaRefs(nextRefs);
    safeEmit(nextUrls, nextRefs);

    setGalleryOpen(false);
  };

  /* ==============================
     Remove & Reorder
  ============================== */
  const removeAt = (idx) => {
    const nextUrls = urls.filter((_, i) => i !== idx);
    safeEmit(nextUrls);
  };

  const move = (from, to) => {
    if (to < 0 || to >= urls.length) return;
    const copy = [...urls];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    safeEmit(copy);
  };

  return (
    <div className="space-y-4">
      {/* Top: Thumbnail */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Product Images</p>
          <p className="text-xs text-gray-500">
            Thumbnail + gallery (max {max})
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setThumbOpen(true)}
          >
            <ImagePlus size={16} />
            Thumbnail
          </button>

          <button
            type="button"
            className="btn"
            disabled={!canAddMore}
            onClick={() => setGalleryOpen(true)}
          >
            <ImagePlus size={16} />
            Gallery
          </button>
        </div>
      </div>

      {/* Preview Grid */}
      {urls.length === 0 ? (
        <div className="empty">
          <p className="text-sm text-gray-500">No images selected</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {urls.map((url, idx) => (
            <div key={url + idx} className="imgCard">
              <div className="imgWrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="img" />
              </div>

              {/* label */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-semibold text-gray-700">
                  {idx === 0 ? "Thumbnail" : `Image ${idx + 1}`}
                </p>

                <button
                  type="button"
                  className="xBtn"
                  onClick={() => removeAt(idx)}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>

              {/* reorder */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="miniBtn"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  title="Move left"
                >
                  <GripVertical size={14} />
                  Up
                </button>

                <button
                  type="button"
                  className="miniBtn"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === urls.length - 1}
                  title="Move right"
                >
                  <GripVertical size={14} />
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Universal Media Picker Modals */}
      <MediaPickerModal
        open={thumbOpen}
        onClose={() => setThumbOpen(false)}
        folder={folder}
        onSelect={onSelectThumb}
      />

      <MediaPickerModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        multiple
        folder={`${folder}/gallery`}
        onSelect={onSelectGallery}
      />

      {/* Minimal styles */}
      <style jsx>{`
        .btn {
          padding: 10px 12px;
          border-radius: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111827;
          color: white;
          transition: 0.15s;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty {
          border-radius: 18px;
          background: #fff;
          padding: 28px;
          text-align: center;
          box-shadow: 0 1px 12px rgba(0, 0, 0, 0.05);
        }

        .imgCard {
          background: white;
          border-radius: 18px;
          padding: 10px;
          box-shadow: 0 1px 12px rgba(0, 0, 0, 0.06);
        }

        .imgWrap {
          width: 100%;
          aspect-ratio: 1/1;
          border-radius: 14px;
          overflow: hidden;
          background: #f3f4f6;
        }

        .img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .xBtn {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          background: #fee2e2;
          color: #991b1b;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .miniBtn {
          flex: 1;
          font-size: 12px;
          font-weight: 700;
          padding: 8px;
          border-radius: 12px;
          background: #e5e7eb;
          color: #111827;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .miniBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/* ==============================
   Helpers
============================== */

function unique(arr) {
  return Array.from(new Set(arr.map(String)));
}

/**
 * Keep mediaRefs list updated (optional)
 * recommended: store publicId + url
 */
function upsertRef(prevRefs, media) {
  if (!media?.publicId) return prevRefs || [];
  const refs = Array.isArray(prevRefs) ? prevRefs : [];
  const map = new Map(refs.map((r) => [String(r.publicId), r]));
  map.set(String(media.publicId), { url: media.url, publicId: media.publicId });
  return Array.from(map.values());
}

function mergeRefs(prevRefs, mediaList) {
  const refs = Array.isArray(prevRefs) ? prevRefs : [];
  const map = new Map(refs.map((r) => [String(r.publicId), r]));

  for (const m of mediaList || []) {
    if (!m?.publicId) continue;
    map.set(String(m.publicId), { url: m.url, publicId: m.publicId });
  }
  return Array.from(map.values());
}
