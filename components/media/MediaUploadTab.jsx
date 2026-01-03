"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, X } from "lucide-react";
import { useAdminMediaStore } from "@/store/adminMediaStore";

export default function MediaUploadTab({ folder }) {
  const { uploadMedia, uploading } = useAdminMediaStore();

  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const [files, setFiles] = useState([]);

  /* ================= ADD FILES ================= */
  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles || []);
    if (!arr.length) return;

    setFiles((prev) => [...prev, ...arr]);
  };

  /* ================= DRAG & DROP ================= */
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onDrop = (e) => {
      prevent(e);
      addFiles(e.dataTransfer.files);
    };

    el.addEventListener("dragenter", prevent);
    el.addEventListener("dragover", prevent);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  /* ================= COPY / PASTE ================= */
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      const pastedFiles = [];

      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length) {
        addFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  /* ================= REMOVE ================= */
  const removeFile = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* ================= UPLOAD ================= */
  const handleUpload = async () => {
    if (!files.length) return;

    await uploadMedia({
      files,
      folder,
    });

    setFiles([]);
  };

  return (
    <div className="space-y-6">
  {/* ================= DROP ZONE ================= */}
  <div
    ref={dropRef}
    onClick={() => inputRef.current?.click()}
    className="
      group flex flex-col items-center justify-center gap-3 
      rounded-2xl p-12 text-center cursor-pointer 
      bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200
      border border-transparent hover:border-gray-200
    "
  >
    <div className="w-14 h-14 rounded-full bg-white shadow flex items-center justify-center">
      <UploadCloud className="w-7 h-7 text-gray-500 group-hover:text-black transition" />
    </div>

    <p className="text-sm font-medium text-gray-700">
      Drag & drop, paste, or click to upload
    </p>

    <p className="text-xs text-gray-400">
      Supports images & videos
    </p>

    <input
      ref={inputRef}
      type="file"
      multiple
      accept="image/*,video/*"
      className="hidden"
      onChange={(e) => addFiles(e.target.files)}
    />
  </div>

  {/* ================= PREVIEW ================= */}
  {files.length > 0 && (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          Ready to upload <span className="text-gray-500">({files.length})</span>
        </p>

        <button
          disabled={uploading}
          onClick={handleUpload}
          className="
            px-4 py-2 rounded-lg text-sm font-medium
            bg-black text-white shadow-sm hover:shadow-md transition
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      </div>

      {/* ✅ Premium Preview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {files.map((file, i) => {
          const url = URL.createObjectURL(file);
          const isVideo = file.type.startsWith("video");

          return (
            <div
              key={i}
              className="
                group relative rounded-xl overflow-hidden 
                bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200
              "
            >
              {isVideo ? (
                <video
                  src={url}
                  className="aspect-square object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  muted
                />
              ) : (
                <Image
                  src={url}
                  alt=""
                  width={200}
                  height={200}
                  className="aspect-square object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Soft overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />

              {/* ❌ Remove Button (cleaner) */}
              <button
                onClick={() => removeFile(i)}
                className="
                  absolute top-2 right-2 
                  w-7 h-7 flex items-center justify-center
                  rounded-full bg-white/90 text-gray-700 shadow
                  hover:bg-black hover:text-white transition
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  )}
</div>

  );
}
