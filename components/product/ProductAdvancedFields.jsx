"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ProductAdvancedFields({
  value,
  onChange,
  collections = [],
  editable = true,
}) {
  const [highlightInput, setHighlightInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const update = (patch) => onChange({ ...value, ...patch });

  /* ================= HIGHLIGHTS (MANDATORY) ================= */
  const addHighlight = () => {
    if (!highlightInput.trim()) return;
    update({
      highlights: [...(value.highlights || []), highlightInput.trim()],
    });
    setHighlightInput("");
  };

  const removeHighlight = (i) => {
    const next = [...(value.highlights || [])];
    next.splice(i, 1);
    update({ highlights: next });
  };

  /* ================= KEYWORDS ================= */
  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    const list = keywordInput
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    update({
      keywords: Array.from(new Set([...(value.keywords || []), ...list])),
    });
    setKeywordInput("");
  };

  const removeKeyword = (i) => {
    const next = [...(value.keywords || [])];
    next.splice(i, 1);
    update({ keywords: next });
  };

  return (
    <div className="space-y-8">

      {/* ================= HIGHLIGHTS (MANDATORY) ================= */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Highlights <span className="text-red-500">*</span>
          </h3>
          <p className="text-sm text-gray-600">
            Key selling points displayed on the product page
          </p>
        </div>

        {editable && (
          <div className="flex gap-2">
            <input
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
              className="input flex-1"
            />
            <button
              type="button"
              onClick={addHighlight}
              className="px-3 bg-black text-white rounded-lg"
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        {(value.highlights || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.highlights.map((h, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2"
              >
                {h}
                {editable && (
                  <button onClick={() => removeHighlight(i)}>
                    <X size={14} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

    

      {/* ================= SHIPPING (OPTIONAL) ================= */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Shipping & Dimensions{" "}
            <span className="text-gray-400 text-sm font-normal">(Optional)</span>
          </h3>
          <p className="text-sm text-gray-600">
            Used for courier rate calculation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={value.weight ?? 0}
            onChange={(e) => update({ weight: toNum(e.target.value) })}
            className="input"
          />
          <input
            value={value.dimensions?.length ?? 0}
            onChange={(e) =>
              update({
                dimensions: {
                  ...value.dimensions,
                  length: toNum(e.target.value),
                },
              })
            }
            className="input"
          />
          <input
            value={value.dimensions?.width ?? 0}
            onChange={(e) =>
              update({
                dimensions: {
                  ...value.dimensions,
                  width: toNum(e.target.value),
                },
              })
            }
            className="input"
          />
          <input
            value={value.dimensions?.height ?? 0}
            onChange={(e) =>
              update({
                dimensions: {
                  ...value.dimensions,
                  height: toNum(e.target.value),
                },
              })
            }
            className="input"
          />
        </div>
      </div>

      {/* ================= SEO (OPTIONAL) ================= */}
<div className="bg-white p-6 rounded-xl shadow space-y-6">
  {/* Header */}
  <div>
    <h3 className="text-lg font-semibold text-gray-900">
      SEO Settings{" "}
      <span className="text-gray-400 text-sm font-normal">(Optional)</span>
    </h3>
    <p className="text-sm text-gray-500">
      Controls how this product appears on search engines
    </p>
  </div>

  {/* Meta fields */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Meta Title */}
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        Meta Title
      </label>
      <input
        value={value.metaTitle || ""}
        onChange={(e) => update({ metaTitle: e.target.value })}
        className="input w-full"
      />
      <p className="text-xs text-gray-500">
        Recommended length: 50–60 characters
      </p>
    </div>

    {/* Meta Description */}
    <div className="space-y-1 md:col-span-2">
      <label className="text-sm font-medium text-gray-700">
        Meta Description
      </label>
      <textarea
        value={value.metaDescription || ""}
        onChange={(e) => update({ metaDescription: e.target.value })}
        className="input w-full resize-none"
        rows={3}
      />
      <p className="text-xs text-gray-500">
        Recommended length: 150–160 characters
      </p>
    </div>
  </div>

  {/* Keywords */}
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      SEO Keywords
    </label>

    <div className="flex gap-2">
      <input
        value={keywordInput}
        onChange={(e) => setKeywordInput(e.target.value)}
        className="input flex-1"
      />
      <button
        type="button"
        onClick={addKeyword}
        className="px-4 rounded-lg bg-black text-white text-sm shrink-0"
      >
        Add
      </button>
    </div>

    {(value.keywords || []).length > 0 && (
      <div className="flex flex-wrap gap-2 pt-1">
        {value.keywords.map((k, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-gray-100 rounded-full text-xs flex items-center gap-2"
          >
            {k}
            <button
              onClick={() => removeKeyword(i)}
              className="hover:text-red-600"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    )}
  </div>
</div>


      {/* ================= PUBLISHING (MANDATORY) ================= */}
      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Publishing <span className="text-red-500">*</span>
        </h3>

        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value.isActive}
              onChange={(e) => update({ isActive: e.target.checked })}
            />
            Active
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value.isFeatured}
              onChange={(e) => update({ isFeatured: e.target.checked })}
            />
            Featured
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value.isDraft}
              onChange={(e) => update({ isDraft: e.target.checked })}
            />
            Draft
          </label>
        </div>
      </div>
    </div>
  );
}
