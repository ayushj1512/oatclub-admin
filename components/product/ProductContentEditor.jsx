"use client";

/**
 * ProductContentEditor
 *
 * Props:
 * - value: {
 *    shortDescription,
 *    description,
 *    tagsText
 *   }
 * - onChange: (nextValue) => void
 * - editable: boolean
 */
export default function ProductContentEditor({
  value = {},
  onChange,
  editable = false,
}) {
  const {
    shortDescription = "",
    description = "",
    tagsText = "",
  } = value;

  const update = (patch) => {
    onChange?.({
      shortDescription,
      description,
      tagsText,
      ...patch,
    });
  };

  const tags = (tagsText || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-950">
            Content
          </h2>
          <p className="mt-0.5 text-xs md:text-sm text-gray-500">
            Manage how your product appears across cards, previews, and the detail page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              editable
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 border border-gray-200",
            ].join(" ")}
          >
            {editable ? "Editing" : "Preview"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
        {editable ? (
          <div className="space-y-6">
            {/* Short Description */}
            <FieldHeader
              title="Short Description"
              subtitle="Shown in product cards and previews"
            />
            <textarea
              value={shortDescription}
              onChange={(e) => update({ shortDescription: e.target.value })}
              placeholder="Write a concise summary (supports new lines)."
              className="w-full min-h-[96px] resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900 focus:ring-4 focus:ring-gray-200"
            />

            {/* Full Description */}
            <FieldHeader
              title="Full Description"
              subtitle="Shown on the product detail page"
            />
            <textarea
              value={description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Write the full product story (supports new lines)."
              className="w-full min-h-[140px] resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900 focus:ring-4 focus:ring-gray-200"
            />

            {/* Tags */}
            <FieldHeader
              title="Tags"
              subtitle="Comma separated (used for search & filtering)"
              rightHint={`${tags.length} tag${tags.length === 1 ? "" : "s"}`}
            />
            <input
              value={tagsText}
              onChange={(e) => update({ tagsText: e.target.value })}
              placeholder="e.g. summer, cotton, limited edition"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900 focus:ring-4 focus:ring-gray-200"
            />

            {/* Live preview chips */}
            <div className="flex flex-wrap gap-2">
              {tags.length ? (
                tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800"
                    title={t}
                  >
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">
                  No tags yet — add comma separated tags above.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Short */}
            <DisplayBlock title="Short Description" value={shortDescription} />

            {/* Description (preserve new lines & spacing) */}
            <DisplayBlock title="Full Description" value={description} prewrap />

            {/* Tags */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Tags
                </h3>
                <span className="text-xs text-gray-500">
                  {tags.length ? `${tags.length} total` : "—"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length ? (
                  tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-5 py-4 md:px-6">
        <p className="text-xs text-gray-500">
          Tip: Line breaks and spacing in the full description are preserved in preview.
        </p>
      </div>
    </section>
  );
}

function FieldHeader({ title, subtitle, rightHint }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {rightHint ? (
        <span className="text-xs text-gray-500">{rightHint}</span>
      ) : null}
    </div>
  );
}

function DisplayBlock({ title, value, prewrap = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {title}
      </h3>
      <p
        className={[
          "mt-2 text-sm text-gray-900 leading-relaxed",
          prewrap ? "whitespace-pre-wrap break-words" : "break-words",
        ].join(" ")}
      >
        {value?.trim() ? value : "-"}
      </p>
    </div>
  );
}
