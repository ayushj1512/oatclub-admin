"use client";

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { useAdminMediaStore } from "@/store/adminMediaStore";
import MediaGrid from "./MediaGrid";

export default function MediaGalleryTab({ onSelect, multiple = false }) {
  const { items: storeItems, fetchMedia, page = 1, pages = 1, loading = false } = useAdminMediaStore();

  const items = Array.isArray(storeItems) ? storeItems : [];
  const [selected, setSelected] = useState([]);

  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const prevScrollHRef = useRef(0);
  const prevScrollYRef = useRef(0);

  const hasMore = page < pages;

  useEffect(() => {
    fetchMedia({ page: 1, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = useCallback(
    (media) => {
      if (!media) return;
      if (!multiple) return onSelect?.(media);

      setSelected((prev) => {
        const id = String(media?._id || "");
        const exists = prev.some((m) => String(m?._id) === id);
        return exists ? prev.filter((m) => String(m?._id) !== id) : [...prev, media];
      });
    },
    [multiple, onSelect]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMoreRef.current) return;

    prevScrollYRef.current = window.scrollY;
    prevScrollHRef.current = document.documentElement.scrollHeight;

    loadingMoreRef.current = true;
    try {
      await fetchMedia({ page: page + 1, append: true });
    } finally {
      loadingMoreRef.current = false;
    }
  }, [fetchMedia, hasMore, loading, page]);

  useLayoutEffect(() => {
    if (!prevScrollHRef.current) return;
    const newH = document.documentElement.scrollHeight;
    const delta = newH - prevScrollHRef.current;
    if (delta > 0) window.scrollTo({ top: prevScrollYRef.current, behavior: "auto" });
    prevScrollHRef.current = 0;
  }, [items.length]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries?.[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "800px", threshold: 0 }
    );

    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-5">
      {multiple && selected.length > 0 && (
        <div className="sticky top-0 z-10">
          <div className="flex items-center justify-end rounded-2xl bg-white/90 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/60">
            <button onClick={() => onSelect?.(selected)} className="rounded-2xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90">
              Select {selected.length} item{selected.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      <MediaGrid items={items} selected={selected} onSelect={toggleSelect} loading={loading && items.length === 0} />

      {hasMore && <div ref={sentinelRef} className="h-12" />}
    </div>
  );
}
