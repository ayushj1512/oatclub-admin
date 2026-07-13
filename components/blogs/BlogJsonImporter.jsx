"use client";

import { Braces, CheckCircle2, RotateCcw, Upload } from "lucide-react";
import { useState } from "react";

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item || "").trim()).filter(Boolean))
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
};

const normalizeBoolean = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (String(value).toLowerCase() === "false") return false;
  if (String(value).toLowerCase() === "true") return true;
  return fallback;
};

const cleanText = (value) =>
  typeof value === "string" ? value.trim() : "";

const parseJsonSafely = (rawValue) => {
  const raw = String(rawValue || "").trim();

  if (!raw) {
    throw new Error("Paste the generated JSON first.");
  }

  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(withoutFence);

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("The JSON root must be an object.");
  }

  return parsed;
};

export default function BlogJsonImporter({ onImport, disabled = false }) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const importJson = () => {
    setError("");
    setSuccess(false);

    try {
      const parsed = parseJsonSafely(jsonText);

      const normalized = {
        title: cleanText(parsed.title),
        slug: cleanText(parsed.slug),
        excerpt: cleanText(parsed.excerpt),
        category: cleanText(parsed.category) || "Fashion",
        tags: normalizeTags(parsed.tags),
        content: cleanText(parsed.content),
        isPublished: normalizeBoolean(parsed.isPublished, true),
      };

      if (!normalized.title) {
        throw new Error('Missing required field: "title".');
      }

      if (!normalized.excerpt) {
        throw new Error('Missing required field: "excerpt".');
      }

      if (!normalized.content) {
        throw new Error('Missing required field: "content".');
      }

      onImport?.(normalized);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON.");
    }
  };

  const reset = () => {
    setJsonText("");
    setError("");
    setSuccess(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-black text-white">
              3
            </span>
            JSON playground
          </div>

          <h2 className="mt-3 text-xl font-semibold text-black">
            Paste and import generated JSON
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Paste the AI response below. Valid fields will automatically fill the blog form.
          </p>
        </div>

        <Braces className="shrink-0 text-gray-400" size={22} />
      </div>

      <textarea
        value={jsonText}
        onChange={(event) => {
          setJsonText(event.target.value);
          setError("");
          setSuccess(false);
        }}
        disabled={disabled}
        rows={15}
        spellCheck={false}
        placeholder={`{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "category": "Fashion",
  "tags": ["...", "..."],
  "content": "...",
  "isPublished": true
}`}
        className="w-full resize-y rounded-xl border border-gray-200 bg-[#0f1115] p-4 font-mono text-xs leading-6 text-white outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} />
          JSON imported successfully. Review the fields and publish when ready.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={importJson}
          disabled={disabled || !jsonText.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Upload size={16} />
          Import JSON
        </button>

        <button
          type="button"
          onClick={reset}
          disabled={!jsonText && !error && !success}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={16} />
          Clear
        </button>
      </div>
    </div>
  );
}