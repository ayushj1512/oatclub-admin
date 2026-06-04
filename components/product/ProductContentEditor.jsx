"use client";

export default function ProductContentEditor({
  value = {},
  onChange,
  editable = false,
}) {
  const {
    shortDescription = "",
    howToStyle = "",
    fabricDetails = "",
    keyFeaturesText = "",
    specificationsText = "",
    tagsText = "",
  } = value;

  const update = (patch) => {
    onChange?.({
      shortDescription,
      howToStyle,
      fabricDetails,
      keyFeaturesText,
      specificationsText,
      tagsText,
      ...patch,
    });
  };

  const toStr = (v) => String(v ?? "");

  const tags = String(tagsText || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const keyFeatures = String(keyFeaturesText || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const textToSpecs = (text) => {
    const lines = String(text || "").split("\n");

    const rows = lines.map((line) => {
      const raw = String(line || "");
      const sepIndex = raw.indexOf(":");

      if (sepIndex === -1) {
        return { key: raw.trim(), value: "" };
      }

      return {
        key: raw.slice(0, sepIndex).trim(),
        value: raw.slice(sepIndex + 1).trim(),
      };
    });

    return rows.length ? rows : [{ key: "", value: "" }];
  };

  const specsToText = (rows) =>
    rows.map((r) => `${r.key || ""}: ${r.value || ""}`).join("\n");

  const specs = textToSpecs(specificationsText);

  const addSpecRow = () => {
    update({
      specificationsText: specsToText([...specs, { key: "", value: "" }]),
    });
  };

  const removeSpecRow = (idx) => {
    const next = specs.filter((_, i) => i !== idx);
    update({
      specificationsText: specsToText(next.length ? next : [{ key: "", value: "" }]),
    });
  };

  const updateSpecRow = (idx, patch) => {
    const next = specs.map((row, i) =>
      i === idx ? { ...row, ...patch } : row
    );

    update({
      specificationsText: specsToText(next),
    });
  };

  const previewSpecs = specs
    .map((r) => ({
      key: String(r.key || "").trim(),
      value: String(r.value || "").trim(),
    }))
    .filter((r) => r.key || r.value);

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-950">
            Content
          </h2>
          <p className="mt-0.5 text-xs md:text-sm text-gray-500">
            Manage product content and specifications.
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            editable
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 border border-gray-200"
          }`}
        >
          {editable ? "Editing" : "Preview"}
        </span>
      </div>

      <div className="px-5 py-5 md:px-6 md:py-6 space-y-6">
        {editable ? (
          <div className="space-y-7">
            <FieldHeader
              title="Short Description"
              subtitle="Shown in product cards and previews"
            />
            <textarea
              value={shortDescription}
              onChange={(e) => update({ shortDescription: e.target.value })}
              placeholder="Write a concise summary."
              className="fieldTextarea"
            />

            <FieldHeader title="How To Style" subtitle="Styling tips" />
            <textarea
              value={howToStyle}
              onChange={(e) => update({ howToStyle: e.target.value })}
              placeholder="Example: Pair with heels and a statement bag..."
              className="fieldTextarea"
            />

            <FieldHeader title="Fabric Details" subtitle="Material and care notes" />
            <textarea
              value={fabricDetails}
              onChange={(e) => update({ fabricDetails: e.target.value })}
              placeholder="Example: Cotton blend, soft lining, gentle wash..."
              className="fieldTextarea"
            />

            <FieldHeader
              title="Key Features"
              subtitle="Comma separated"
              rightHint={`${keyFeatures.length} feature${
                keyFeatures.length === 1 ? "" : "s"
              }`}
            />
            <input
              value={keyFeaturesText}
              onChange={(e) => update({ keyFeaturesText: e.target.value })}
              placeholder="e.g. stretchable, breathable, wrinkle-free"
              className="fieldInput"
            />

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-950">
                    Specifications
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Add simple key/value rows like Color, Fabric, Fit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSpecRow}
                  className="rounded-xl bg-gray-900 text-white px-3 py-2 text-xs font-semibold hover:bg-black transition"
                >
                  + Add Row
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200">
                  <div className="col-span-5 px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Key
                  </div>
                  <div className="col-span-6 px-4 py-3 text-xs font-semibold text-gray-600 uppercase border-l border-gray-200">
                    Value
                  </div>
                  <div className="col-span-1 px-3 py-3 text-xs font-semibold text-gray-600 uppercase text-right border-l border-gray-200">
                    Remove
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {specs.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 bg-white">
                      <div className="col-span-5 p-3">
                        <input
                          value={toStr(row.key)}
                          onChange={(e) =>
                            updateSpecRow(idx, { key: e.target.value })
                          }
                          placeholder="e.g. Color"
                          className="fieldInput"
                        />
                      </div>

                      <div className="col-span-6 p-3 border-l border-gray-200">
                        <input
                          value={toStr(row.value)}
                          onChange={(e) =>
                            updateSpecRow(idx, { value: e.target.value })
                          }
                          placeholder="e.g. White"
                          className="fieldInput"
                        />
                      </div>

                      <div className="col-span-1 p-3 border-l border-gray-200 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeSpecRow(idx)}
                          className="rounded-lg px-3 py-2 text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <FieldHeader
              title="Tags"
              subtitle="Comma separated"
              rightHint={`${tags.length} tag${tags.length === 1 ? "" : "s"}`}
            />
            <input
              value={tagsText}
              onChange={(e) => update({ tagsText: e.target.value })}
              placeholder="e.g. summer, cotton, limited edition"
              className="fieldInput"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <DisplayBlock title="Short Description" value={shortDescription} />
            <DisplayBlock title="How To Style" value={howToStyle} prewrap />
            <DisplayBlock title="Fabric Details" value={fabricDetails} prewrap />
            <DisplayBlock
              title="Key Features"
              value={keyFeatures.length ? keyFeatures.join(", ") : ""}
            />

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
              <h3 className="text-xs font-semibold text-gray-600 uppercase">
                Specifications
              </h3>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {previewSpecs.length ? (
                  previewSpecs.map((r, i) => (
                    <div
                      key={`${r.key}-${i}`}
                      className="rounded-xl border border-gray-200 bg-white p-3"
                    >
                      <p className="text-xs font-semibold text-gray-500">
                        {r.key || "-"}
                      </p>
                      <p className="mt-1 text-sm text-gray-900 break-words">
                        {r.value || "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">-</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .fieldInput {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.9rem;
          outline: none;
          font-size: 0.875rem;
          transition: 150ms;
        }
        .fieldInput:focus {
          border-color: #111827;
          box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.12);
          background: #fff;
        }
        .fieldTextarea {
          width: 100%;
          min-height: 96px;
          resize: vertical;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.9rem;
          outline: none;
          font-size: 0.875rem;
          transition: 150ms;
        }
        .fieldTextarea:focus {
          border-color: #111827;
          box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.12);
          background: #fff;
        }
      `}</style>
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
      {rightHint ? <span className="text-xs text-gray-500">{rightHint}</span> : null}
    </div>
  );
}

function DisplayBlock({ title, value, prewrap = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
      <h3 className="text-xs font-semibold text-gray-600 uppercase">
        {title}
      </h3>
      <p
        className={`mt-2 text-sm text-gray-900 leading-relaxed ${
          prewrap ? "whitespace-pre-wrap break-words" : "break-words"
        }`}
      >
        {String(value || "").trim() ? value : "-"}
      </p>
    </div>
  );
}