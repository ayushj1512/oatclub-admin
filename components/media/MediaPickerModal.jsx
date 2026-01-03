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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-3">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ✅ Sticky Top */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">

          {/* ================= HEADER ================= */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Media Library
              </h2>
              <p className="text-xs text-gray-500">
                Upload or select media for your product
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ================= TABS ================= */}
          <div className="px-6 pb-4">
            <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTab("upload")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition
                  ${
                    tab === "upload"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-500 hover:text-black"
                  }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>

              <button
                onClick={() => setTab("select")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition
                  ${
                    tab === "select"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-500 hover:text-black"
                  }`}
              >
                <ImageIcon className="w-4 h-4" />
                Library
              </button>
            </div>
          </div>
        </div>

        {/* ================= BODY ================= */}
        <div className="p-5 overflow-y-auto flex-1 bg-gray-50">
          <div className="bg-white rounded-2xl shadow-sm p-4">
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
    </div>
  );
}
