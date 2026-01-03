"use client";

import { useEffect, useState } from "react";
import { useAdminMediaStore } from "@/store/adminMediaStore";
import MediaGrid from "./MediaGrid";

export default function MediaGalleryTab({ onSelect, multiple = false }) {
  /* ================= STORE ================= */
  const store = useAdminMediaStore();

  const items = Array.isArray(store.items) ? store.items : [];
  const {
    fetchMedia,
    page = 1,
    pages = 1,
    loading = false,
  } = store;

  /* ================= LOCAL STATE ================= */
  const [selected, setSelected] = useState([]);

  /* ================= FETCH ON OPEN ================= */
  useEffect(() => {
    fetchMedia({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= SELECT HANDLER ================= */
  const toggleSelect = (media) => {
    if (!media) return;

    if (!multiple) {
      onSelect?.(media);
      return;
    }

    setSelected((prev) => {
      const exists = prev.some((m) => m?._id === media?._id);
      return exists
        ? prev.filter((m) => m?._id !== media?._id)
        : [...prev, media];
    });
  };

  return (
   <div className="space-y-5">

  {/* ✅ TOP STICKY SELECT BAR (Premium) */}
  {multiple && selected.length > 0 && (
    <div className="sticky top-0 z-10">
      <div className="flex items-center justify-end rounded-2xl bg-white/90 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/60">
        <button
          onClick={() => onSelect?.(selected)}
          className="rounded-2xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Select {selected.length} item{selected.length > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  )}

  {/* ================= GRID ================= */}
  <MediaGrid
    items={items}
    selected={selected}
    onSelect={toggleSelect}
    loading={loading}
  />

  {/* ================= PAGINATION (Premium) ================= */}
  {page < pages && !loading && (
    <div className="flex justify-center">
      <button
        onClick={() => fetchMedia({ page: page + 1 })}
        className="rounded-2xl bg-white px-5 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/60 transition hover:bg-gray-50 hover:ring-gray-300"
      >
        Load more
      </button>
    </div>
  )}
</div>

  );
}
