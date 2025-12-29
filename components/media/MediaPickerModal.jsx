"use client";

import { useEffect, useState } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import MediaUploadTab from "./MediaUploadTab";
import MediaGalleryTab from "./MediaGalleryTab";

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  multiple = false,
  folder = "miray/media",
}) {
  const [tab, setTab] = useState("select");

  useEffect(() => {
    if (open) setTab("select");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Media Library</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex border-b">
          <button
            onClick={() => setTab("upload")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 ${
              tab === "upload"
                ? "border-black text-black"
                : "border-transparent text-gray-500"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Media
          </button>

          <button
            onClick={() => setTab("select")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 ${
              tab === "select"
                ? "border-black text-black"
                : "border-transparent text-gray-500"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Select from Media
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="p-4 min-h-[420px] max-h-[70vh] overflow-y-auto">
          {tab === "upload" ? (
            <MediaUploadTab folder={folder} />
          ) : (
            <MediaGalleryTab
              multiple={multiple}
              onSelect={(media) => {
                onSelect(media);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
