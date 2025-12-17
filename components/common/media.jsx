"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import {
  Upload,
  Trash2,
  Copy,
  ImageIcon,
  VideoIcon,
  FileIcon,
  Search,
  Check,
  Loader2,
} from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL + "/api/media";

export default function Media({ onSelect, multiple = false }) {
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState([]);

  /* ---------------- Debounce Search Logic ---------------- */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // Wait 500ms after user stops typing
    return () => clearTimeout(handler);
  }, [search]);

  /* ---------------- Fetch Media ---------------- */
  const fetchMedia = useCallback(async (pageNo = 1, q = "") => {
    setLoading(true);
    try {
      const res = await axios.get(BACKEND, {
        params: { page: pageNo, q },
      });
      setMedia(res.data.items || []);
      setPages(res.data.pages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia(1, debouncedSearch);
  }, [debouncedSearch, fetchMedia]);

  /* ---------------- Upload ---------------- */
  const uploadFiles = async (files) => {
    if (!files?.length) return;

    const form = new FormData();
    [...files].forEach((f) => form.append("files", f));

    setUploading(true);
    try {
      await axios.post(`${BACKEND}/upload`, form);
      // Refresh to page 1 to show the newest uploads
      fetchMedia(1, debouncedSearch);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check file size or format.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- Drag & Drop + Paste ---------------- */
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e) => e.preventDefault();
    const onDrop = (e) => {
      e.preventDefault();
      uploadFiles(e.dataTransfer.files);
    };

    const onPaste = (e) => {
      const files = e.clipboardData?.files;
      if (files?.length) uploadFiles(files);
    };

    el.addEventListener("dragover", prevent);
    el.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);

    return () => {
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [debouncedSearch]); // Re-bind if search context changes

  /* ---------------- Selection Logic ---------------- */
  const toggleSelect = (item) => {
    if (!multiple) {
      setSelected([item]);
      onSelect?.(item);
    } else {
      setSelected((prev) => {
        const exists = prev.some((p) => p._id === item._id);
        const next = exists
          ? prev.filter((p) => p._id !== item._id)
          : [...prev, item];
        onSelect?.(next);
        return next;
      });
    }
  };

  const deleteMedia = async (id) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await axios.delete(`${BACKEND}/${id}`);
      setMedia((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    // You could trigger a small toast notification here
  };

  const getFileIcon = (type) => {
    if (type === "video") return <VideoIcon size={24} className="text-blue-500" />;
    if (type === "raw") return <FileIcon size={24} className="text-amber-500" />;
    return <ImageIcon size={24} className="text-gray-400" />;
  };

  return (
    <div className="w-full space-y-4 bg-white p-1">
      {/* Header: Upload + Search */}
      <div
        ref={dropRef}
        className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-colors ${
          uploading ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => uploadFiles(e.target.files)}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400 transition"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Upload Media"}
          </button>
          <p className="text-xs text-gray-500 hidden sm:block">
            Drag files here or paste from clipboard
          </p>
        </div>

        <div className="relative flex-1 w-full max-w-sm ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-black/5 transition"
          />
        </div>
      </div>

      {/* Grid Area */}
      {loading && media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 size={40} className="animate-spin mb-2" />
          <p className="text-sm">Accessing Library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {media.map((item) => {
            const isSelected = selected.some((s) => s._id === item._id);

            return (
              <div
                key={item._id}
                onClick={() => toggleSelect(item)}
                className={`group relative aspect-square cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                  isSelected ? "border-black ring-4 ring-black/5" : "border-transparent bg-gray-100 hover:border-gray-300"
                }`}
              >
                {item.resourceType === "image" ? (
                  <img
                    src={item.url}
                    alt={item.originalName}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-500">
                    {getFileIcon(item.resourceType)}
                    <span className="text-[10px] px-1 truncate w-full text-center">
                      {item.originalName}
                    </span>
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute right-2 top-2 rounded-full bg-black p-1 shadow-lg">
                    <Check size={12} className="text-white" />
                  </div>
                )}

                {/* Hover Overlay Actions */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.url);
                      }}
                      title="Copy URL"
                      className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-gray-100 text-gray-700"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMedia(item._id);
                      }}
                      title="Delete"
                      className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-red-50 text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && media.length === 0 && (
        <div className="text-center py-10 border rounded-2xl bg-gray-50">
          <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No media found for "{debouncedSearch}"</p>
        </div>
      )}

      {/* Pagination Container */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t pt-4 px-2">
          <p className="text-xs text-gray-500 font-medium">
            Showing page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchMedia(page - 1, debouncedSearch)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Previous
            </button>
            <button
              disabled={page >= pages || loading}
              onClick={() => fetchMedia(page + 1, debouncedSearch)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}