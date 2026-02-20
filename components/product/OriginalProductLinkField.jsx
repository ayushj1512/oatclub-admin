// components/product/OriginalProductLinkField.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  X,
  ExternalLink,
  Clipboard,
  Check,
  Image as ImageIcon,
  FileText,
  Globe,
} from "lucide-react";

const s = (v) => String(v ?? "").trim();

const looksLikeUrl = (v) => {
  const t = s(v);
  if (!t) return true;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

const safeUrl = (raw) => {
  const t = s(raw);
  if (!t) return "";
  // allow pasting without protocol
  if (/^www\./i.test(t)) return `https://${t}`;
  if (!/^https?:\/\//i.test(t) && t.includes(".")) return `https://${t}`;
  return t;
};

const getMeta = (raw) => {
  const url = safeUrl(raw);
  if (!url) return { url: "", host: "", path: "", filename: "", ext: "" };

  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    const path = decodeURIComponent(u.pathname || "/");
    const last = path.split("/").filter(Boolean).pop() || "";
    const filename = last || "";
    const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() || "" : "";
    return { url, host, path, filename, ext };
  } catch {
    return { url, host: "", path: "", filename: "", ext: "" };
  }
};

const extKind = (ext) => {
  const e = (ext || "").toLowerCase();
  if (!e) return "link";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(e)) return "image";
  if (["pdf"].includes(e)) return "doc";
  if (["html", "htm"].includes(e)) return "web";
  return "file";
};

export default function OriginalProductLinkField({
  label = "Original Product Link",
  hint = "Paste the original product page link. We’ll store it for internal reference.",
  value = "",
  onChange,
  placeholder = "e.g. https://brand.com/products/black-dress",
}) {
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  const clean = useMemo(() => s(value), [value]);
  const meta = useMemo(() => getMeta(clean), [clean]);
  const valid = useMemo(() => looksLikeUrl(meta.url), [meta.url]);

  // auto-fix url on blur (adds https:// if missing)
  const handleBlur = () => {
    setTouched(true);
    if (!clean) return;
    const fixed = safeUrl(clean);
    if (fixed !== clean) onChange?.(fixed);
  };

  const canOpen = !!meta.url && valid;

  const copy = async () => {
    try {
      if (!meta.url) return;
      await navigator.clipboard.writeText(meta.url);
      setCopied(true);
    } catch {}
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const Icon =
    extKind(meta.ext) === "image"
      ? ImageIcon
      : extKind(meta.ext) === "doc"
        ? FileText
        : extKind(meta.ext) === "web"
          ? Globe
          : Link2;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{label} <span className="text-gray-400 font-medium">(optional)</span></h3>
          <p className="text-sm text-gray-500">{hint}</p>
        </div>

        {clean ? (
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border ${
              valid
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {valid ? "Valid link" : "Invalid link"}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border bg-gray-50 text-gray-600 border-gray-200">
            Not set
          </span>
        )}
      </div>

      {/* Input */}
      <div
        className={`rounded-2xl border bg-white shadow-sm transition ${
          touched && clean && !valid ? "border-rose-200 ring-2 ring-rose-100" : "border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-200">
            <Icon size={18} className="text-gray-700" />
          </div>

          <input
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={handleBlur}
            className="h-10 w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
          />

          {!!clean && (
            <button
              type="button"
              onClick={() => onChange?.("")}
              className="h-10 w-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
              title="Clear"
              aria-label="Clear"
            >
              <X size={16} className="mx-auto" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <button
            type="button"
            onClick={copy}
            disabled={!meta.url}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs border transition ${
              meta.url
                ? "bg-white border-gray-200 hover:border-gray-300 text-gray-800"
                : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>

          <a
            href={canOpen ? meta.url : "#"}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs border transition ${
              canOpen
                ? "bg-black text-white border-black hover:opacity-90"
                : "bg-gray-50 border-gray-200 text-gray-400 pointer-events-none"
            }`}
            title="Open in new tab"
          >
            <ExternalLink size={14} />
            Open
          </a>
        </div>

        {/* Meta */}
        {!!meta.url && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-[11px] text-gray-500">Domain</p>
                <p className="text-sm font-medium text-gray-900 truncate">{meta.host || "—"}</p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-[11px] text-gray-500">Path</p>
                <p className="text-sm font-medium text-gray-900 truncate">{meta.path || "—"}</p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-[11px] text-gray-500">File / slug</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {meta.filename || "—"}
                  {meta.ext ? (
                    <span className="ml-2 text-[11px] font-semibold text-gray-600">.{meta.ext}</span>
                  ) : null}
                </p>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-500">
              Saved as: <span className="font-medium text-gray-700">{meta.url}</span>
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {touched && clean && !valid && (
        <p className="text-xs text-rose-600">
          Please enter a valid URL starting with <span className="font-semibold">http://</span> or{" "}
          <span className="font-semibold">https://</span>. (We also auto-fix if you paste without it.)
        </p>
      )}
    </div>
  );
}