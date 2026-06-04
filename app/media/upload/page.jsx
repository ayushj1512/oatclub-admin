"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { useAdminMediaStore } from "@/store/adminMediaStore";

const isValidFile = (file) =>
  file?.type?.startsWith("image/") ||
  file?.type?.startsWith("video/") ||
  !file?.type;

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;

  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }

  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
};

const shortName = (name = "") => {
  const text = String(name || "");
  return text.length > 28 ? `${text.slice(0, 28)}…` : text;
};

export default function MediaUploadPage() {
  const inputRef = useRef(null);
  const { uploadMedia, uploading } = useAdminMediaStore();

  const [folder, setFolder] = useState("oatclub/media");
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);

  const selected = useMemo(
    () => ({
      images: files.filter((x) => x.kind === "image").length,
      videos: files.filter((x) => x.kind === "video").length,
    }),
    [files]
  );

  useEffect(() => {
    const onPaste = (e) => {
      const picked = [];

      for (const item of e.clipboardData?.items || []) {
        if (item.kind !== "file") continue;

        const file = item.getAsFile();
        if (!file || !isValidFile(file)) continue;

        picked.push(
          file.name && file.name !== "image.png"
            ? file
            : new File([file], `pasted-${Date.now()}.png`, { type: file.type })
        );
      }

      if (picked.length) {
        e.preventDefault();
        addFiles(picked);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    return () => {
      files.forEach((x) => x.preview && URL.revokeObjectURL(x.preview));
    };
  }, [files]);

  const addFiles = (incoming = []) => {
    const list = Array.from(incoming || []).filter(isValidFile);
    if (!list.length) return;

    setFiles((prev) => {
      const map = new Map(prev.map((x) => [x.key, x]));

      list.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (map.has(key)) return;

        map.set(key, {
          key,
          file,
          preview: URL.createObjectURL(file),
          kind: file.type?.startsWith("video/") ? "video" : "image",
        });
      });

      return [...map.values()];
    });
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      prev[idx]?.preview && URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearFiles = () => {
    setFiles((prev) => {
      prev.forEach((x) => x.preview && URL.revokeObjectURL(x.preview));
      return [];
    });
  };

  const handleUpload = async () => {
    if (!files.length) return;

    await uploadMedia({
      files: files.map((x) => x.file),
      folder: folder || "oatclub/media",
    });

    clearFiles();
  };

  return (
    <section className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">Upload Media</h1>
          <p className="text-sm text-gray-500">
            Upload images/videos to Cloudinary media library.
          </p>
        </div>

        <div className="space-y-4 border border-gray-200 bg-white p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Upload Folder
            </label>

            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="oatclub/media"
              className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-black"
            />

            <p className="mt-1 text-xs text-gray-500">
              Example: oatclub/products, oatclub/banners, oatclub/blogs
            </p>
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`cursor-pointer border border-dashed p-10 transition ${
              drag ? "border-black bg-gray-100" : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="border border-gray-200 bg-white p-4">
                <Upload size={22} />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">
                  Drag & drop images/videos here
                </p>
                <p className="text-xs text-gray-500">
                  Click to choose or paste screenshots with Ctrl+V
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-700">
                  <span>
                    Selected: <b>{files.length}</b>
                  </span>

                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <ImageIcon size={14} /> {selected.images}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Video size={14} /> {selected.videos}
                  </span>
                </div>

                <button onClick={clearFiles} className="text-sm text-red-600">
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4 md:grid-cols-6">
                {files.map((f, idx) => (
                  <div key={f.key} className="border border-gray-200 bg-white">
                    <div className="flex h-28 items-center justify-center bg-gray-100">
                      {f.kind === "video" ? (
                        <video
                          src={f.preview}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full bg-black object-contain"
                        />
                      ) : (
                        <img
                          src={f.preview}
                          alt={f.file.name}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>

                    <div className="p-2">
                      <p
                        title={f.file.name}
                        className="truncate text-[11px] text-gray-800"
                      >
                        {shortName(f.file.name)}
                      </p>

                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">
                          {formatBytes(f.file.size)}
                        </span>

                        <button
                          onClick={() => removeFile(idx)}
                          className="bg-gray-100 p-1 hover:bg-gray-200"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !files.length}
                className="w-full bg-black px-4 py-3 text-sm font-medium text-white disabled:bg-gray-400"
              >
                {uploading ? "Uploading..." : `Upload ${files.length} File(s)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}