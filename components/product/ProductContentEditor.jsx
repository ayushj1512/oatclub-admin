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
    onChange({
      shortDescription,
      description,
      tagsText,
      ...patch,
    });
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-6">
      <h2 className="text-lg md:text-xl font-semibold">Content</h2>

      {editable ? (
        <div className="space-y-6">
          {/* Short Description */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Short Description
            </h3>
            <p className="text-xs text-gray-500">
              Shown in product cards and previews
            </p>
            <textarea
              value={shortDescription}
              onChange={(e) =>
                update({ shortDescription: e.target.value })
              }
              className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none min-h-[90px]"
            />
          </div>

          {/* Full Description */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Full Description
            </h3>
            <p className="text-xs text-gray-500">
              Shown on the product detail page
            </p>
            <textarea
              value={description}
              onChange={(e) =>
                update({ description: e.target.value })
              }
              className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none min-h-[120px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Tags
            </h3>
            <p className="text-xs text-gray-500">
              Comma separated (used for search & filtering)
            </p>
            <input
              value={tagsText}
              onChange={(e) =>
                update({ tagsText: e.target.value })
              }
              className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Short */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase">
              Short Description
            </h3>
            <p className="text-sm text-gray-800 mt-1">
              {shortDescription || "-"}
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase">
              Full Description
            </h3>
            <p className="text-sm text-gray-800 mt-1">
              {description || "-"}
            </p>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase">
              Tags
            </h3>
            <div className="flex gap-2 flex-wrap mt-2">
              {tagsText
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-gray-200 rounded-full text-xs"
                  >
                    {t}
                  </span>
                ))}
              {!tagsText && (
                <span className="text-sm text-gray-400">-</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
