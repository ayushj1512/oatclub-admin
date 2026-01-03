"use client";

import Image from "next/image";
import { Check } from "lucide-react";

export default function MediaGrid(props) {
  const {
    items,
    onSelect = () => {},
    selected = [],
    loading = false,
  } = props || {};

  /* 🔒 HARD GUARD */
  if (!Array.isArray(items) || loading) {
    return <p className="text-sm text-gray-500">Loading media...</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No media found</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {items.map((m) => {
        const isSelected = selected.some((s) => s?._id === m?._id);

        return (
          <div
            key={m._id}
            onClick={() => onSelect(m)}
            className={`group relative cursor-pointer rounded-xl overflow-hidden 
              bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 
              ${isSelected ? "ring-2 ring-black shadow-md scale-[1.02]" : ""}
            `}
          >
            {/* Image */}
            <Image
              src={m.url}
              alt={m.originalName || ""}
              width={300}
              height={300}
              className="object-cover aspect-square w-full h-full 
                group-hover:scale-105 transition-transform duration-300"
            />

            {/* Soft overlay on hover */}
            <div
              className={`absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 
                ${isSelected ? "bg-black/10" : ""}
              `}
            />

            {/* ✅ Selected Check */}
            {isSelected && (
              <div className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black text-white shadow">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Optional filename bottom (hover) */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[11px] text-white 
              bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
              {m.originalName || "Media"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
