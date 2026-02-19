// components/product/ProductImagesEditor.jsx
"use client";

import { useMemo, useState } from "react";
import { ImagePlus, X, GripVertical, Clipboard, Check, Link2 } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/**
 * ProductImagesEditor (Tailwind)
 * ✅ MediaPicker + ✅ Single URL quick-add input (auto-add on paste/enter/blur) + ✅ Copy URLs
 * - Thumbnail = index 0
 */
export default function ProductImagesEditor({
  value = [],
  onChange,
  folder = "miray/products",
  max = 12,
}) {
  const urls = Array.isArray(value) ? value.filter(Boolean) : [];

  const [thumbOpen, setThumbOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // optional refs: {url, publicId}
  const [mediaRefs, setMediaRefs] = useState([]);

  // ✅ quick add url input
  const [urlInput, setUrlInput] = useState("");

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedOne, setCopiedOne] = useState("");

  const thumb = urls[0] || null;
  const gallery = urls.slice(1);
  const canAddMore = urls.length < max;

  const emit = (nextUrls, nextRefs = mediaRefs) => onChange?.(nextUrls, nextRefs);

  /* ---------- picker handlers ---------- */
  const onSelectThumb = (media) => {
    if (!media?.url) return;
    const nextUrls = [media.url, ...gallery].slice(0, max);

    const nextRefs = upsertRef(mediaRefs, media);
    setMediaRefs(nextRefs);
    emit(nextUrls, nextRefs);

    setThumbOpen(false);
  };

  const onSelectGallery = (list) => {
    const picked = Array.isArray(list) ? list : [];
    if (!picked.length) return setGalleryOpen(false);

    const addUrls = picked.map((m) => m?.url).filter(Boolean);
    const merged = unique([thumb, ...gallery, ...addUrls].filter(Boolean)).slice(0, max);

    const nextRefs = mergeRefs(mediaRefs, picked);
    setMediaRefs(nextRefs);
    emit(merged, nextRefs);

    setGalleryOpen(false);
  };

  /* ---------- remove/reorder ---------- */
  const removeAt = (idx) => emit(urls.filter((_, i) => i !== idx));

  const move = (from, to) => {
    if (to < 0 || to >= urls.length) return;
    const copy = [...urls];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    emit(copy);
  };

  /* ---------- quick add (single textbox) ---------- */
  const addUrl = (rawUrl, mode = "gallery") => {
    if (!rawUrl) return false;
    if (!canAddMore && mode !== "thumbnail") return false;

    const clean = normalizeUrl(rawUrl);
    if (!clean) return false;

    const next =
      mode === "thumbnail"
        ? unique([clean, ...gallery].filter(Boolean)).slice(0, max)
        : unique([thumb, ...gallery, clean].filter(Boolean)).slice(0, max);

    emit(next);
    return true;
  };

  const flushInput = (text, mode = "gallery") => {
    const u = normalizeUrl(text);
    if (!u) return false;
    const ok = addUrl(u, mode);
    if (ok) setUrlInput(""); // ✅ clear after add
    return ok;
  };

  const onPasteIntoInput = (e) => {
    const pasted = e.clipboardData?.getData("text") || "";
    // try to extract first valid url from paste
    const found = extractFirstUrl(pasted);
    if (!found) return;

    e.preventDefault(); // don't keep pasted text
    const ok = flushInput(found, "gallery"); // default: add to gallery
    if (!ok) setUrlInput(found); // fallback
  };

  /* ---------- copy ---------- */
  const flashBool = (setter, ms = 900) => {
    setter(true);
    setTimeout(() => setter(false), ms);
  };

  const copyAll = async () => {
    if (!urls.length) return;
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      flashBool(setCopiedAll);
    } catch {}
  };

  const copyOne = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOne(url);
      setTimeout(() => setCopiedOne(""), 700);
    } catch {}
  };

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
            Thumbnail first, then gallery. Add URL quickly from textbox.
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

      {/* ✅ Quick Add URL */}
      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50">
              <Link2 size={16} />
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-900">Quick add image URL</p>
              <p className="text-[11px] text-slate-500">
                Paste URL → auto add + input clears (adds to gallery).
              </p>
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
              onBlur={() => {
                // if user typed url and clicked away, add it
                flushInput(urlInput, "gallery");
              }}
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
            >
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square h-full w-full object-cover" />

                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur">
                  {idx === 0 ? "Thumbnail" : `Image ${idx + 1}`}
                </span>

                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/90 text-slate-800 shadow-sm backdrop-blur hover:bg-white"
                  title="Remove"
                >
                  <X size={16} />
                </button>
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

              {/* reorder */}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GripVertical size={14} />
                  Up
                </button>

                <button
                  type="button"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === urls.length - 1}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GripVertical size={14} />
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
    </div>
  );
}

/* ---------------- helpers ---------------- */

function unique(arr) {
  return Array.from(new Set((arr || []).map(String)));
}

function normalizeUrl(raw) {
  const s = String(raw || "").trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
  if (!s) return "";
  // only allow http(s)
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

function extractFirstUrl(text) {
  const raw = String(text || "");
  // pick first http(s) url found even inside a line
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
