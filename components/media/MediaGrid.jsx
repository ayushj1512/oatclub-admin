"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Play, Video } from "lucide-react";

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

const isVideoMedia = (media = {}) => {
  if (String(media?.resourceType || "").toLowerCase() === "video") return true;

  const value = String(
    media?.format || media?.originalName || media?.url || ""
  ).toLowerCase();

  return VIDEO_EXTENSIONS.some(
    (ext) =>
      value === ext ||
      value.endsWith(`.${ext}`) ||
      value.includes(`.${ext}?`)
  );
};

const getVideoThumbnail = (media = {}) => {
  const url = String(media?.url || "");

  if (!url.includes("res.cloudinary.com")) return "";

  return url
    .replace(
      "/video/upload/",
      "/video/upload/so_0,f_jpg,q_auto,w_600,c_limit/"
    )
    .replace(
      /\.(mp4|mov|webm|m4v|avi|mkv|mpeg|mpg)(\?.*)?$/i,
      ".jpg"
    );
};

function MediaPreview({ media }) {
  const [playing, setPlaying] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const isVideo = isVideoMedia(media);
  const thumbnail = isVideo ? getVideoThumbnail(media) : "";

  if (!isVideo) {
    return (
      <Image
        src={media?.url}
        alt={media?.originalName || "Media"}
        width={300}
        height={300}
        className="aspect-square h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  if (playing) {
    return (
      <video
        src={media?.url}
        autoPlay
        controls
        playsInline
        preload="metadata"
        onClick={(e) => e.stopPropagation()}
        className="aspect-square h-full w-full bg-black object-contain"
      />
    );
  }

  return (
    <div className="relative aspect-square h-full w-full overflow-hidden bg-gray-100">
      {thumbnail && !thumbnailFailed ? (
        <img
          src={thumbnail}
          alt={media?.originalName || "Video"}
          loading="lazy"
          onError={() => setThumbnailFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <video
          src={media?.url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(true);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-white shadow-lg transition hover:scale-105 hover:bg-black"
        >
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
        </button>
      </div>

      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-medium text-white">
        <Video className="h-3 w-3" />
        VIDEO
      </div>
    </div>
  );
}

export default function MediaGrid({
  items = [],
  onSelect = () => { },
  selected = [],
  loading = false,
  hasMore = false,
  loadMore = async () => { },
  loadingMore = false,
  rootMargin = "600px",
}) {
  const sentinelRef = useRef(null);
  const busyRef = useRef(false);

  const selectedIds = useMemo(
    () => new Set((selected || []).map((s) => String(s?._id))),
    [selected]
  );

  useEffect(() => {
    busyRef.current = false;
  }, [items?.length]);

  useEffect(() => {
    if (loading || !hasMore || !sentinelRef.current) return;

    const io = new IntersectionObserver(
      async ([entry]) => {
        if (
          !entry?.isIntersecting ||
          busyRef.current ||
          loadingMore ||
          !hasMore
        )
          return;

        busyRef.current = true;

        try {
          await loadMore();
        } finally {
          busyRef.current = false;
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0,
      }
    );

    io.observe(sentinelRef.current);

    return () => io.disconnect();
  }, [loading, hasMore, loadMore, loadingMore, rootMargin]);

  if (loading)
    return <p className="text-sm text-gray-500">Loading media...</p>;

  if (!Array.isArray(items) || items.length === 0)
    return <p className="text-sm text-gray-500">No media found</p>;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {items.map((m, index) => {
          const id = String(m?._id || m?.publicId || m?.url || index);
          const isSelected = selectedIds.has(String(m?._id || ""));

          return (
            <div
              key={id}
              onClick={() => onSelect(m)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl bg-gray-50 shadow-sm transition-all duration-200 hover:shadow-md ${isSelected
                  ? "scale-[1.02] ring-2 ring-black shadow-md"
                  : ""
                }`}
            >
              <MediaPreview media={m} />

              <div
                className={`pointer-events-none absolute inset-0 bg-black/0 transition-all duration-200 group-hover:bg-black/5 ${isSelected ? "bg-black/10" : ""
                  }`}
              />

              {isSelected && (
                <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white shadow">
                  <Check className="h-4 w-4" />
                </div>
              )}

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                {m?.originalName || "Media"}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-10" />

      {(loadingMore || hasMore) && (
        <div className="flex items-center justify-center py-3 text-sm text-gray-600">
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-xs text-gray-500">
              Scroll to load more
            </span>
          )}
        </div>
      )}
    </>
  );
}
