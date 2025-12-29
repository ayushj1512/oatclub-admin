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
        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-black transition"
      >
        <UploadCloud className="w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-600">
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
          <p className="text-sm font-medium">
            Ready to upload ({files.length})
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {files.map((file, i) => {
              const url = URL.createObjectURL(file);
              const isVideo = file.type.startsWith("video");

              return (
                <div
                  key={i}
                  className="relative border rounded-lg overflow-hidden"
                >
                  {isVideo ? (
                    <video
                      src={url}
                      className="aspect-square object-cover"
                      muted
                    />
                  ) : (
                    <Image
                      src={url}
                      alt=""
                      width={200}
                      height={200}
                      className="aspect-square object-cover"
                    />
                  )}

                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ================= ACTION ================= */}
          <div className="flex justify-end">
            <button
              disabled={uploading}
              onClick={handleUpload}
              className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Files"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
