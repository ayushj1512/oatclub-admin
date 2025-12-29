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
  if (!Array.isArray(items)) {
    return (
      <p className="text-sm text-gray-500">
        Loading media...
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-gray-500">
        Loading media...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No media found
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {items.map((m) => {
        const isSelected = selected.some(
          (s) => s?._id === m?._id
        );

        return (
          <div
            key={m._id}
            onClick={() => onSelect(m)}
            className={`relative cursor-pointer border rounded-lg overflow-hidden ${
              isSelected ? "ring-2 ring-black" : ""
            }`}
          >
            <Image
              src={m.url}
              alt={m.originalName || ""}
              width={300}
              height={300}
              className="object-cover aspect-square"
            />

            {isSelected && (
              <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
