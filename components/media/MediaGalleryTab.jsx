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
    <div className="space-y-4">
      {/* ================= GRID ================= */}
      <MediaGrid
        items={items}
        selected={selected}
        onSelect={toggleSelect}
        loading={loading}
      />

      {/* ================= MULTI SELECT ACTION ================= */}
      {multiple && selected.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => onSelect?.(selected)}
            className="px-4 py-2 bg-black text-white rounded-md text-sm"
          >
            Select {selected.length} item{selected.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      {page < pages && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchMedia({ page: page + 1 })}
            className="text-sm text-gray-600 underline"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
