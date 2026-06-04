// components/product/ProductImagesEditor.jsx
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  ImagePlus,
  X,
  GripVertical,
  Clipboard,
  Check,
  Link2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/**
 * ProductImagesEditor (Tailwind)
 * ✅ MediaPicker
 * ✅ Quick URL add (paste/enter/blur) + Set Thumb
 * ✅ Copy URLs
 * ✅ Reorder: Drag & Drop + Up/Down buttons
 * ✅ Lightbox (fullscreen) on click
 * - Thumbnail = index 0
 */
export default function ProductImagesEditor({
  value = [],
  onChange,
  folder = "miray/products",
  max = 12,
}) {
 const urls = useMemo(
  () => (Array.isArray(value) ? value.map(normalizeUrl).filter(Boolean) : []),
  [value]
);

  const [thumbOpen, setThumbOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // optional refs: {url, publicId}
  const [mediaRefs, setMediaRefs] = useState([]);

  // quick add url input
  const [urlInput, setUrlInput] = useState("");

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedOne, setCopiedOne] = useState("");

  // ✅ lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const thumb = urls[0] || "";
  const gallery = urls.slice(1);
  const canAddMore = urls.length < max;

  const emit = (nextUrls, nextRefs = mediaRefs) => onChange?.(nextUrls, nextRefs);

  /* ---------------- pickers ---------------- */
  const onSelectThumb = (media) => {
    if (!media?.url) return;
    const nextUrls = unique([media.url, ...gallery]).slice(0, max);

    const nextRefs = upsertRef(mediaRefs, media);
    setMediaRefs(nextRefs);
    emit(nextUrls, nextRefs);

    setThumbOpen(false);
  };

  const onSelectGallery = (list) => {
    const picked = Array.isArray(list) ? list : [];
    if (!picked.length) return setGalleryOpen(false);

    const addUrls = picked.map((m) => m?.url).filter(Boolean);
    const nextUrls = unique([thumb, ...gallery, ...addUrls].filter(Boolean)).slice(0, max);

    const nextRefs = mergeRefs(mediaRefs, picked);
    setMediaRefs(nextRefs);
    emit(nextUrls, nextRefs);

    setGalleryOpen(false);
  };

  /* ---------------- remove / up-down reorder ---------------- */
  const removeAt = (idx) => {
    const next = urls.filter((_, i) => i !== idx);
    emit(next);
    // keep lightbox stable
    if (lightboxOpen) {
      if (!next.length) return closeLightbox();
      const nextIdx = Math.min(lightboxIndex, next.length - 1);
      setLightboxIndex(nextIdx);
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= urls.length) return;
    if (from === to) return;
    const next = [...urls];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    emit(next);

    // keep lightbox index consistent with reorder
    if (lightboxOpen) {
      if (lightboxIndex === from) setLightboxIndex(to);
      else if (from < lightboxIndex && to >= lightboxIndex) setLightboxIndex((i) => i - 1);
      else if (from > lightboxIndex && to <= lightboxIndex) setLightboxIndex((i) => i + 1);
    }
  };

  /* ---------------- quick add ---------------- */
  const addUrl = (rawUrl, mode = "gallery") => {
    const clean = normalizeUrl(rawUrl);
    if (!clean) return false;

    if (mode !== "thumbnail" && !canAddMore) return false;

    const next =
      mode === "thumbnail"
        ? unique([clean, ...urls.filter((_, i) => i !== 0)]).slice(0, max)
        : unique([thumb, ...gallery, clean].filter(Boolean)).slice(0, max);

    emit(next);
    return true;
  };

  const flushInput = (text, mode = "gallery") => {
    const u = normalizeUrl(text);
    if (!u) return false;
    const ok = addUrl(u, mode);
    if (ok) setUrlInput("");
    return ok;
  };

  const onPasteIntoInput = (e) => {
    const pasted = e.clipboardData?.getData("text") || "";
    const found = extractFirstUrl(pasted);
    if (!found) return;

    e.preventDefault();
    const ok = flushInput(found, "gallery");
    if (!ok) setUrlInput(found);
  };

  /* ---------------- copy ---------------- */
  const flashBool = (setter, ms = 900) => {
    setter(true);
    setTimeout(() => setter(false), ms);
  };

  const copyAll = async () => {
    if (!urls.length) return;
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      flashBool(setCopiedAll);
    } catch { }
  };

  const copyOne = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOne(url);
      setTimeout(() => setCopiedOne(""), 700);
    } catch { }
  };

  /* ---------------- drag & drop reorder ---------------- */
  const dragFrom = useRef(null);

  const onDragStart = (idx) => () => {
    dragFrom.current = idx;
  };

  const onDrop = (to) => (e) => {
    e.preventDefault();
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from == null) return;
    move(from, to);
  };

  /* ---------------- lightbox ---------------- */
  const openLightbox = (idx) => {
    if (!urls.length) return;
    setLightboxIndex(Math.min(Math.max(0, idx), urls.length - 1));
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const prevLb = () => setLightboxIndex((i) => (i - 1 + urls.length) % urls.length);
  const nextLb = () => setLightboxIndex((i) => (i + 1) % urls.length);

  // keyboard: esc, arrows
  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevLb();
      if (e.key === "ArrowRight") nextLb();
    };

    document.addEventListener("keydown", onKeyDown);
    // prevent background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, urls.length]);

  const lbUrl = urls[lightboxIndex] || "";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-slate-900">Product Images</p>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-800">
              {urls.length}/{max}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Thumbnail first, then gallery. Drag or use Up/Down. Click image for fullscreen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setThumbOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-800 active:translate-y-0"
          >
            <ImagePlus size={16} />
            Thumbnail
          </button>

          <button
            type="button"
            disabled={!canAddMore}
            onClick={() => setGalleryOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <ImagePlus size={16} />
            Gallery
          </button>

          <button
            type="button"
            onClick={copyAll}
            disabled={!urls.length}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Copy all URLs"
          >
            {copiedAll ? <Check size={16} /> : <Clipboard size={16} />}
            {copiedAll ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Quick Add URL */}
      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50">
              <Link2 size={16} />
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-900">Quick add image URL</p>
              <p className="text-[11px] text-slate-500">Paste URL → auto add (gallery).</p>
            </div>
          </div>

          <div className="flex-1 sm:pl-3">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onPaste={onPasteIntoInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  flushInput(urlInput, "gallery");
                }
              }}
              onBlur={() => flushInput(urlInput, "gallery")}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </div>

          <div className="flex gap-2 sm:pl-2">
            <button
              type="button"
              onClick={() => flushInput(urlInput, "gallery")}
              disabled={!urlInput.trim() || !canAddMore}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>

            <button
              type="button"
              onClick={() => flushInput(urlInput, "thumbnail")}
              disabled={!urlInput.trim()}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              title="Set as thumbnail (moves to first)"
            >
              Set Thumb
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {urls.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-extrabold text-slate-900">No images yet</p>
          <p className="mt-1 text-xs text-slate-500">Pick from media or paste URL above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((url, idx) => (
            <div
              key={url + idx}
              className={[
                "rounded-3xl border bg-white p-2 shadow-sm",
                idx === 0 ? "border-slate-200" : "border-slate-100",
              ].join(" ")}
              draggable
              onDragStart={onDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop(idx)}
              title="Drag to reorder"
            >
              <button
                type="button"
                onClick={() => openLightbox(idx)}
                className="relative block w-full overflow-hidden rounded-2xl bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                title="Open fullscreen"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square h-full w-full object-cover" />

                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur">
                  {idx === 0 ? "Thumbnail" : `Image ${idx + 1}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                title="Remove"
              >
                <X size={16} />
                Remove
              </button>

              <div
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-2xl bg-slate-50 px-2 py-2 text-[11px] font-extrabold text-slate-700"
                title="Drag to reorder"
              >
                <GripVertical size={14} />
                Drag to reorder
              </div>

              {/* url + copy */}
              <div className="mt-2 flex items-center gap-2">
                <p
                  className="flex-1 truncate rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600"
                  title={url}
                >
                  {url}
                </p>
                <button
                  type="button"
                  onClick={() => copyOne(url)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  title="Copy URL"
                >
                  {copiedOne === url ? <Check size={16} /> : <Clipboard size={16} />}
                </button>
              </div>

              {/* Up / Down */}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Move up"
                >
                  <ArrowUp size={14} />
                  Up
                </button>

                <button
                  type="button"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === urls.length - 1}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Move down"
                >
                  <ArrowDown size={14} />
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Pickers */}
      <MediaPickerModal
        open={thumbOpen}
        onClose={() => setThumbOpen(false)}
        folder={folder}
        onSelect={onSelectThumb}
      />

      <MediaPickerModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        multiple
        folder={`${folder}/gallery`}
        onSelect={onSelectGallery}
      />

      {/* ✅ Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // close only if clicking the backdrop
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          {/* top bar */}
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-2 p-3 sm:p-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-extrabold text-white">
              <span>{urls.length ? lightboxIndex + 1 : 0}</span>
              <span className="opacity-70">/</span>
              <span className="opacity-90">{urls.length}</span>
              <span className="ml-2 hidden max-w-[55vw] truncate text-[11px] font-semibold opacity-80 sm:inline">
                {lbUrl}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lbUrl);
                    setCopiedOne(lbUrl);
                    setTimeout(() => setCopiedOne(""), 700);
                  } catch { }
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-white/15"
                title="Copy current URL"
              >
                {copiedOne === lbUrl ? <Check size={16} /> : <Clipboard size={16} />}
                {copiedOne === lbUrl ? "Copied" : "Copy URL"}
              </button>

              <button
                type="button"
                onClick={closeLightbox}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/15"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* main */}
          <div className="flex h-full w-full items-center justify-center px-3 py-16 sm:px-6">
            <button
              type="button"
              onClick={prevLb}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-2xl bg-white/10 p-3 text-white hover:bg-white/15 sm:left-5"
              title="Previous (←)"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="relative max-h-[80vh] w-full max-w-5xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lbUrl}
                alt=""
                className="mx-auto max-h-[80vh] w-auto max-w-full rounded-2xl bg-white/5 object-contain shadow-2xl"
                draggable={false}
              />
            </div>

            <button
              type="button"
              onClick={nextLb}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-2xl bg-white/10 p-3 text-white hover:bg-white/15 sm:right-5"
              title="Next (→)"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* bottom strip thumbnails */}
          {urls.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
              <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto rounded-2xl bg-white/5 p-2">
                {urls.map((u, i) => (
                  <button
                    key={u + i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className={[
                      "relative h-14 w-14 flex-none overflow-hidden rounded-xl border",
                      i === lightboxIndex ? "border-white/70" : "border-white/10 hover:border-white/25",
                    ].join(" ")}
                    title={`Go to ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] font-semibold text-white/70">
                Esc to close • ←/→ to navigate
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function unique(arr) {
  return Array.from(new Set((arr || []).filter(Boolean).map(String)));
}

function normalizeUrl(raw) {
  let s = String(raw || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");

  if (!/^https?:\/\//i.test(s)) return "";

  const match = s.match(/\.(png|jpe?g|webp)/i);
  if (match) s = s.slice(0, match.index + match[0].length);

  return s;
}


function extractFirstUrl(text) {
  const raw = String(text || "");
  const match = raw.match(/https?:\/\/[^\s,"')]+/i);
  return match ? match[0] : "";
}

/** optional refs: store {url, publicId} */
function upsertRef(prevRefs, media) {
  if (!media?.publicId) return Array.isArray(prevRefs) ? prevRefs : [];
  const refs = Array.isArray(prevRefs) ? prevRefs : [];
  const map = new Map(refs.map((r) => [String(r.publicId), r]));
  map.set(String(media.publicId), { url: media.url, publicId: media.publicId });
  return Array.from(map.values());
}

function mergeRefs(prevRefs, mediaList) {
  const refs = Array.isArray(prevRefs) ? prevRefs : [];
  const map = new Map(refs.map((r) => [String(r.publicId), r]));
  for (const m of mediaList || []) {
    if (!m?.publicId) continue;
    map.set(String(m.publicId), { url: m.url, publicId: m.publicId });
  }
  return Array.from(map.values());
}