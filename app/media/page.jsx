"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Trash2,
  Copy,
  RefreshCw,
  X,
  Image as ImageIcon,
  Video,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const LIMIT = 48;

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
};

const shortName = (s = "") => {
  const t = String(s || "");
  return t.length > 26 ? `${t.slice(0, 26)}…` : t;
};

const isAcceptedFile = (file) =>
  file?.type?.startsWith("image/") ||
  file?.type?.startsWith("video/") ||
  !file?.type;

const mergeById = (prev = [], next = []) => {
  const map = new Map();
  [...prev, ...next].forEach((x) => x?._id && map.set(String(x._id), x));
  return [...map.values()];
};

export default function MediaPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("oatclub/media");
  const [type, setType] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef(null);
  const sentinelRef = useRef(null);
  const ioRef = useRef(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  const fetchPage = useCallback(async ({ nextPage = 1, mode = "replace", targetType = type } = {}) => {
    if (!API) return console.error("NEXT_PUBLIC_API_URL missing");

    const append = mode === "append";
    append ? setLoadingMore(true) : setLoading(true);

    try {
      const url = new URL(`${API}/api/media`);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("limit", String(LIMIT));
      if (targetType) url.searchParams.set("type", targetType);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Media load failed");

      const nextItems = Array.isArray(data.items) ? data.items : [];
      const newTotal = Number(data.total || 0);

      setTotal(newTotal);
      setPage(nextPage);

      setItems((prev) => {
        const merged = append ? mergeById(prev, nextItems) : nextItems;
        setHasMore(merged.length < newTotal && nextItems.length === LIMIT);
        return merged;
      });
    } catch (err) {
      console.error("❌ Media load:", err);
      if (!append) {
        setItems([]);
        setTotal(0);
      }
      setHasMore(false);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [type]);

  const loadFirst = useCallback(async (targetType = type) => {
    setPage(1);
    setHasMore(true);
    await fetchPage({ nextPage: 1, targetType, mode: "replace" });
  }, [fetchPage, type]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await fetchPage({ nextPage: page + 1, targetType: type, mode: "append" });
  }, [fetchPage, hasMore, loading, loadingMore, page, type]);

  useEffect(() => {
    loadFirst(type);
  }, [type, loadFirst]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    ioRef.current?.disconnect();

    ioRef.current = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && loadMore(),
      { rootMargin: "800px 0px" }
    );

    ioRef.current.observe(el);
    return () => ioRef.current?.disconnect();
  }, [loadMore]);

  useEffect(() => {
    return () => {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  const addFiles = (incoming = []) => {
    const list = Array.from(incoming).filter(isAcceptedFile);
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

  const clearPicked = () => {
    setFiles((prev) => {
      prev.forEach((x) => x.preview && URL.revokeObjectURL(x.preview));
      return [];
    });
  };

  const removePicked = (idx) => {
    setFiles((prev) => {
      prev[idx]?.preview && URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadBatch = async () => {
    if (!files.length) return alert("Select files first");

    setUploading(true);

    try {
      const fd = new FormData();
      files.forEach(({ file }) => fd.append("files", file));
      fd.append("folder", folder || "oatclub/media");

      const res = await fetch(`${API}/api/media/upload`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");

      clearPicked();
      await loadFirst(type);
      alert(`Uploaded ${data.media?.length || 0} file(s)!`);
    } catch (err) {
      console.error("❌ Upload:", err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const syncMedia = async () => {
    try {
      const res = await fetch(`${API}/api/media/sync?max=100`, {
        method: "POST",
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Sync failed");

      await loadFirst(type);
      alert("Media synced");
    } catch (err) {
      console.error("❌ Sync:", err);
      alert(err.message || "Sync failed");
    }
  };

  const deleteOne = async (id) => {
    if (!id || !confirm("Delete this media permanently?")) return;

    setDeletingId(id);

    try {
      const res = await fetch(`${API}/api/media/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      await loadFirst(type);
    } catch (err) {
      console.error("❌ Delete:", err);
      alert(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  useEffect(() => {
    const onPaste = (e) => {
      const pasted = [];

      for (const item of e.clipboardData?.items || []) {
        if (item.kind !== "file") continue;

        const file = item.getAsFile();
        if (!file || !isAcceptedFile(file)) continue;

        pasted.push(
          file.name && file.name !== "image.png"
            ? file
            : new File([file], `pasted-${Date.now()}.png`, { type: file.type })
        );
      }

      if (pasted.length) {
        e.preventDefault();
        addFiles(pasted);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const selectedImages = files.filter((f) => f.kind === "image").length;
  const selectedVideos = files.filter((f) => f.kind === "video").length;

  return (
    <section className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Media</h1>
            <p className="text-xs text-gray-500">
              All Cloudinary folders are fetched. Folder is only used while uploading.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={syncMedia}
              className="inline-flex items-center gap-2 bg-white px-4 py-2 text-sm text-black border border-gray-200"
            >
              <RefreshCw size={16} />
              Sync
            </button>

            <button
              onClick={() => loadFirst(type)}
              className="inline-flex items-center gap-2 bg-black px-4 py-2 text-sm text-white"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-4 border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Upload folder
              </label>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none"
                placeholder="oatclub/media"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Example: <b>oatclub/products</b>, <b>oatclub/banners</b>,{" "}
                <b>oatclub/blogs</b>
              </p>
            </div>

            <div className="md:w-[180px]">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none"
              >
                <option value="">All</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="raw">Raw</option>
              </select>
            </div>

            <div className="flex gap-2 md:w-[260px]">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 border border-gray-200 bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
              >
                Choose
              </button>

              <button
                onClick={uploadBatch}
                disabled={uploading || !files.length}
                className="flex-1 bg-black px-4 py-2 text-sm text-white disabled:bg-gray-400"
              >
                {uploading ? "Uploading..." : `Upload (${files.length})`}
              </button>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer?.files);
            }}
            className={`cursor-pointer border border-dashed p-6 ${
              dragOver ? "border-black bg-gray-100" : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="border border-gray-200 bg-white p-3">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Drag & drop images/videos here
                </p>
                <p className="text-xs text-gray-500">
                  Click to choose or paste with Ctrl+V / Cmd+V
                </p>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <div className="flex items-center gap-3">
                  <span>
                    Selected: <b>{files.length}</b>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <ImageIcon size={14} /> {selectedImages}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Video size={14} /> {selectedVideos}
                  </span>
                </div>

                <button onClick={clearPicked} className="text-sm text-red-600">
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4 md:grid-cols-8">
                {files.slice(0, 16).map((f, idx) => (
                  <div key={f.key} className="overflow-hidden border border-gray-200 bg-white">
                    <div className="flex h-24 items-center justify-center bg-gray-100">
                      {f.kind === "video" ? (
                        <video
                          src={f.preview}
                          className="h-full w-full object-contain bg-black"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={f.preview}
                          className="h-full w-full object-contain"
                          alt={f.file.name}
                        />
                      )}
                    </div>

                    <div className="p-2">
                      <p className="truncate text-[11px] text-gray-800">
                        {shortName(f.file.name)}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">
                          {formatBytes(f.file.size)}
                        </span>
                        <button onClick={() => removePicked(idx)} className="bg-gray-100 p-1">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total: <b>{total}</b>{" "}
            <span className="text-xs text-gray-500">(loaded: {items.length})</span>
          </span>
          <span className="text-xs text-gray-500">
            Page {page} / {pages}
          </span>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No media found.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
              {items.map((m) => (
                <div key={m._id} className="border border-gray-200 bg-white">
                  <div className="flex h-40 w-full items-center justify-center bg-gray-100">
                    {m.resourceType === "video" ? (
                      <video
                        src={m.url}
                        className="h-full w-full object-contain bg-black"
                        muted
                        preload="metadata"
                        controls
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt={m.originalName || "media"}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="p-2">
                    <p className="truncate text-[11px] text-gray-700">
                      {shortName(m.originalName || m.publicId)}
                    </p>

                    <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                      <span className="uppercase">{m.resourceType}</span>
                      <span>{formatBytes(m.bytes)}</span>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => copyUrl(m.url)}
                        className="flex-1 bg-gray-100 py-2 text-xs hover:bg-gray-200"
                      >
                        <Copy size={14} className="mx-auto" />
                      </button>

                      <button
                        onClick={() => deleteOne(m._id)}
                        disabled={deletingId === m._id}
                        className="bg-red-600 px-3 py-2 text-white disabled:bg-gray-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 text-center">
              {hasMore ? (
                loadingMore ? (
                  <p className="text-sm text-gray-600">Loading more...</p>
                ) : (
                  <button
                    onClick={loadMore}
                    className="border bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Load more
                  </button>
                )
              ) : (
                <p className="text-sm text-gray-500">You’ve reached the end.</p>
              )}

              <div ref={sentinelRef} className="h-1" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}