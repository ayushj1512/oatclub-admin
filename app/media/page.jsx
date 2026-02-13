"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Upload, Trash2, Copy, RefreshCw, X, Image as ImageIcon, Video } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function shortName(s = "") {
  const t = String(s);
  return t.length > 26 ? t.slice(0, 26) + "…" : t;
}

function isAcceptedFile(file) {
  return (
    file?.type?.startsWith("image/") ||
    file?.type?.startsWith("video/") ||
    file?.type === "" ||
    file?.type === undefined
  );
}

export default function MediaPage() {
  const limit = 48;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [files, setFiles] = useState([]); // [{ file, preview, kind, key }]
  const [folder, setFolder] = useState("miray/media");
  const [type, setType] = useState(""); // "" | image | video | raw

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true); // initial load / refresh
  const [loadingMore, setLoadingMore] = useState(false); // infinite append
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const sentinelRef = useRef(null);
  const ioRef = useRef(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const fetchPage = useCallback(
    async ({ nextPage, targetType, mode }) => {
      // mode: "replace" | "append"
      const isAppend = mode === "append";
      isAppend ? setLoadingMore(true) : setLoading(true);

      try {
        const url = new URL(`${API}/api/media`);
        url.searchParams.set("page", String(nextPage));
        url.searchParams.set("limit", String(limit));
        if (targetType) url.searchParams.set("type", targetType);

        const r = await fetch(url.toString(), { cache: "no-store" });
        const d = await r.json();

        const newItems = Array.isArray(d.items) ? d.items : [];
        const newTotal = Number(d.total || 0);

        setTotal(newTotal);
        setPage(nextPage);

        setItems((prev) => (isAppend ? [...prev, ...newItems] : newItems));

        // hasMore: either API signals end (items < limit) OR total-based
        const moreByItems = newItems.length === limit;
        const loadedCount = (isAppend ? items.length : 0) + newItems.length; // best-effort
        const moreByTotal = newTotal ? loadedCount < newTotal : moreByItems;

        setHasMore(moreByTotal && moreByItems);
      } catch (e) {
        console.error("❌ Media load:", e);
        if (!isAppend) {
          setItems([]);
          setTotal(0);
        }
        setHasMore(false);
      } finally {
        isAppend ? setLoadingMore(false) : setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit, type, items.length]
  );

  const loadFirst = useCallback(
    async (targetType = type) => {
      setHasMore(true);
      await fetchPage({ nextPage: 1, targetType, mode: "replace" });
    },
    [fetchPage, type]
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await fetchPage({ nextPage: page + 1, targetType: type, mode: "append" });
  }, [fetchPage, hasMore, loading, loadingMore, page, type]);

  useEffect(() => {
    loadFirst(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    if (ioRef.current) ioRef.current.disconnect();

    ioRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    ioRef.current.observe(el);

    return () => {
      ioRef.current?.disconnect();
      ioRef.current = null;
    };
  }, [loadMore]);

  // cleanup previews on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (incoming = []) => {
    const list = Array.from(incoming || []).filter(isAcceptedFile);
    if (!list.length) return;

    setFiles((prev) => {
      const map = new Map();
      prev.forEach((x) => map.set(x.key, x));

      list.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (map.has(key)) return;

        const kind = file.type?.startsWith("video/") ? "video" : "image";
        const preview = URL.createObjectURL(file);
        map.set(key, { file, preview, kind, key });
      });

      return Array.from(map.values());
    });
  };

  const onPickFiles = (e) => addFiles(e.target.files);

  const removePicked = (idx) => {
    setFiles((prev) => {
      const target = prev[idx];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearPicked = () => {
    setFiles((prev) => {
      prev.forEach((x) => x.preview && URL.revokeObjectURL(x.preview));
      return [];
    });
  };

  const uploadBatch = async () => {
    if (!files.length) return alert("Select files first");
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(({ file }) => fd.append("files", file));
      fd.append("folder", folder);

      const r = await fetch(`${API}/api/media/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Upload failed");

      clearPicked();
      await loadFirst(type);

      alert(`Uploaded ${d.media?.length || 0} file(s)!`);
    } catch (e) {
      console.error("❌ Upload:", e);
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
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

  const deleteOne = async (id) => {
    if (!confirm("Delete this media permanently?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`${API}/api/media/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Delete failed");
      await loadFirst(type); // refresh list
    } catch (e) {
      console.error("❌ Delete:", e);
      alert(e.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ Drag & Drop
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dtFiles = e.dataTransfer?.files;
    if (dtFiles?.length) addFiles(dtFiles);
  };

  // ✅ Paste support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const onPaste = (e) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems?.length) return;

      const pastedFiles = [];
      for (const item of clipboardItems) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && isAcceptedFile(file)) {
            const named =
              file.name && file.name !== "image.png"
                ? file
                : new File([file], `pasted-${Date.now()}.png`, { type: file.type });
            pastedFiles.push(named);
          }
        }
      }

      if (pastedFiles.length) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const selectedCount = files.length;
  const selectedImages = files.filter((f) => f.kind === "image");
  const selectedVideos = files.filter((f) => f.kind === "video");

  return (
    <section className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Media</h1>
            <p className="text-xs text-gray-500">
              Drag & drop → preview → upload. ✅ You can also <b>paste images</b> (Ctrl+V / Cmd+V).
            </p>
          </div>

          <button
            onClick={() => loadFirst(type)}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Upload / Dropzone */}
        <div className="bg-white border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Cloudinary folder</label>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full bg-gray-100 px-3 py-2 outline-none border border-gray-200"
                placeholder="miray/media"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Example: <b>miray/products</b>, <b>miray/banners</b>, <b>miray/blogs</b>
              </p>
            </div>

            <div className="md:w-[180px]">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Filter</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-gray-100 px-3 py-2 outline-none border border-gray-200"
              >
                <option value="">All</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="raw">Raw</option>
              </select>
            </div>

            <div className="md:w-[260px] flex gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 border border-gray-200"
              >
                <Upload size={18} />
                Choose
              </button>

              <button
                onClick={uploadBatch}
                disabled={uploading || !selectedCount}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-white ${
                  uploading || !selectedCount ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {uploading ? "Uploading..." : `Upload (${selectedCount})`}
              </button>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={onPickFiles}
                className="hidden"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`w-full border border-dashed p-6 cursor-pointer select-none ${
              dragOver ? "bg-blue-50 border-blue-400" : "bg-gray-50 border-gray-300"
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-white border border-gray-200">
                <Upload size={18} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-800">Drag & drop images/videos here</div>
                <div className="text-xs text-gray-500">
                  or click to choose — ✅ <b>or paste (Ctrl+V / Cmd+V)</b>
                </div>
              </div>
            </div>
          </div>

          {/* Preview meta */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 flex items-center gap-3">
              <span>
                Selected: <b>{selectedCount}</b>
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <ImageIcon size={14} /> {selectedImages.length}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Video size={14} /> {selectedVideos.length}
              </span>
            </div>

            {selectedCount > 0 && (
              <button onClick={clearPicked} className="text-sm text-red-600 hover:underline">
                Clear all
              </button>
            )}
          </div>

          {/* Preview grid */}
          {selectedCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {files.slice(0, 16).map((f, idx) => (
                  <div key={f.key} className="bg-white border border-gray-200 overflow-hidden">
                    <div className="h-24 bg-gray-100 flex items-center justify-center">
                      {f.kind === "video" ? (
                        <video
                          src={f.preview}
                          className="w-full h-full object-contain bg-black"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img src={f.preview} className="w-full h-full object-contain" alt={f.file.name} />
                      )}
                    </div>

                    <div className="p-2">
                      <div className="text-[11px] text-gray-800 truncate" title={f.file.name}>
                        {shortName(f.file.name)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-[10px] text-gray-500">{formatBytes(f.file.size)}</div>
                        <button
                          onClick={() => removePicked(idx)}
                          className="p-1 bg-gray-100 hover:bg-gray-200"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {files.length > 16 && (
                <div className="text-xs text-gray-500 mt-2">
                  Showing preview of first <b>16</b>. Total selected: <b>{files.length}</b>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info row */}
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span>
            Total: <b>{total}</b>
            <span className="text-xs text-gray-500"> (loaded: {items.length})</span>
          </span>
          <span className="text-xs text-gray-500">
            Page {page} / {pages}
          </span>
        </div>

        {/* Library grid */}
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No media found.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {items.map((m) => (
                <div key={m._id} className="bg-white border border-gray-200">
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    {m.resourceType === "video" ? (
                      <video
                        src={m.url}
                        className="w-full h-full object-contain bg-black"
                        muted
                        preload="metadata"
                        controls
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt={m.originalName || "media"}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="p-2">
                    <div className="text-[11px] text-gray-700" title={m.originalName || m.publicId}>
                      {shortName(m.originalName || m.publicId)}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                      <span className="uppercase">{m.resourceType}</span>
                      <span>{formatBytes(m.bytes)}</span>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => copyUrl(m.url)}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-xs py-2"
                        title="Copy URL"
                      >
                        <Copy size={14} />
                        Copy
                      </button>

                      <button
                        onClick={() => deleteOne(m._id)}
                        disabled={deletingId === m._id}
                        className={`inline-flex items-center justify-center px-3 py-2 text-white ${
                          deletingId === m._id ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
                        }`}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite footer */}
            <div className="pt-4">
              {hasMore ? (
                <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                  {loadingMore ? (
                    <span>Loading more...</span>
                  ) : (
                    <button
                      onClick={loadMore}
                      className="px-4 py-2 border bg-white hover:bg-gray-50 text-gray-700"
                    >
                      Load more
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500">You’ve reached the end.</div>
              )}

              {/* observer target */}
              <div ref={sentinelRef} className="h-1" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
