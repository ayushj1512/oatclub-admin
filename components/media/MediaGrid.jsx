"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { Check, Loader2 } from "lucide-react";

export default function MediaGrid({
  items = [],
  onSelect = () => {},
  selected = [],
  loading = false,
  hasMore = false,
  loadMore = async () => {},
  loadingMore = false,
  rootMargin = "600px",
}) {
  const sentinelRef = useRef(null);
  const busyRef = useRef(false);

  const selectedIds = useMemo(() => new Set((selected || []).map((s) => String(s?._id))), [selected]);

  useEffect(() => {
    busyRef.current = false;
  }, [items?.length]);

  useEffect(() => {
    if (loading) return;
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;

    const io = new IntersectionObserver(
      async (entries) => {
        const hit = entries?.[0]?.isIntersecting;
        if (!hit) return;
        if (busyRef.current) return;
        if (loadingMore) return;
        if (!hasMore) return;

        busyRef.current = true;
        try {
          await loadMore();
        } finally {
          busyRef.current = false;
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loading, hasMore, loadMore, loadingMore, rootMargin]);

  if (loading) return <p className="text-sm text-gray-500">Loading media...</p>;
  if (!Array.isArray(items) || items.length === 0) return <p className="text-sm text-gray-500">No media found</p>;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {items.map((m) => {
          const id = String(m?._id || "");
          const isSelected = selectedIds.has(id);

          return (
            <div key={id} onClick={() => onSelect(m)} className={`group relative cursor-pointer rounded-xl overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 ${isSelected ? "ring-2 ring-black shadow-md scale-[1.02]" : ""}`}>
              <Image src={m?.url} alt={m?.originalName || ""} width={300} height={300} className="object-cover aspect-square w-full h-full group-hover:scale-105 transition-transform duration-300" />
              <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 ${isSelected ? "bg-black/10" : ""}`} />
              {isSelected && <div className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black text-white shadow"><Check className="w-4 h-4" /></div>}
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[11px] text-white bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">{m?.originalName || "Media"}</div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-10" />

      {(loadingMore || hasMore) && (
        <div className="flex items-center justify-center py-3 text-sm text-gray-600">
          {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs text-gray-500">Scroll to load more</span>}
        </div>
      )}
    </>
  );
}
