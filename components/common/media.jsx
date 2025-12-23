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

/* ✅ SINGLE SOURCE OF TRUTH */
const API = process.env.NEXT_PUBLIC_API_URL + "/api/media";

export default function Media({
  onSelect,
  multiple = false,
  refreshKey = 0,
}) {
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

  /* ---------------- DEBOUNCE SEARCH ---------------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ---------------- FETCH MEDIA ---------------- */
  const fetchMedia = useCallback(
    async (pageNo = 1, q = "") => {
      setLoading(true);
      try {
        const res = await axios.get(API, {
          params: { page: pageNo, q },
        });
        setMedia(res.data.items || []);
        setPages(res.data.pages || 1);
        setPage(res.data.page || 1);
      } catch (err) {
        console.error("❌ Media fetch failed:", err);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* 🔥 FETCH ON OPEN / REFRESH */
  useEffect(() => {
    fetchMedia(1, debouncedSearch);
  }, [debouncedSearch, refreshKey, fetchMedia]);

  /* ---------------- UPLOAD ---------------- */
  const uploadFiles = async (files) => {
    if (!files?.length) return;

    const form = new FormData();
    [...files].forEach((f) => form.append("files", f));

    setUploading(true);
    try {
      await axios.post(`${API}/upload`, form);
      fetchMedia(1, debouncedSearch); // 🔁 refresh list
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check file size or format.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- DRAG / DROP / PASTE ---------------- */
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
  }, []);

  /* ---------------- SELECT ---------------- */
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
    if (!confirm("Delete this media?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setMedia((p) => p.filter((m) => m._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
  };

  const getFileIcon = (type) => {
    if (type === "video") return <VideoIcon size={22} className="text-blue-500" />;
    if (type === "raw") return <FileIcon size={22} className="text-amber-500" />;
    return <ImageIcon size={22} className="text-gray-400" />;
  };

  return (
    <div className="w-full bg-white rounded-xl">
      {/* UPLOAD + SEARCH */}
      <div
        ref={dropRef}
        className={`p-4 border-2 border-dashed rounded-xl mb-4 ${
          uploading ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => uploadFiles(e.target.files)}
        />

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Upload Media"}
          </button>

          <div className="relative flex-1 max-w-sm ml-auto w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* MEDIA GRID (FIXED HEIGHT 🔥) */}
      <div className="h-[320px] overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 size={36} className="animate-spin" />
          </div>
        )}

        {!loading && media.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ImageIcon size={32} className="mx-auto mb-2" />
            No media found
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 px-2">
          {media.map((item) => {
            const isSelected = selected.some((s) => s._id === item._id);

            return (
              <div
                key={item._id}
                onClick={() => toggleSelect(item)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                  isSelected ? "border-black ring-4 ring-black/10" : "border-transparent"
                }`}
              >
                {item.resourceType === "image" ? (
                  <img
                    src={item.url}
                    alt={item.originalName}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                    {getFileIcon(item.resourceType)}
                    <span className="text-[10px] truncate w-full text-center px-1">
                      {item.originalName}
                    </span>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1">
                    <Check size={12} />
                  </div>
                )}

                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(item.url);
                    }}
                    className="bg-white p-1 rounded"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMedia(item._id);
                    }}
                    className="bg-white p-1 rounded text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
