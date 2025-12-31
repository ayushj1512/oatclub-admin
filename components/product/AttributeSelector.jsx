"use client";

import { useEffect, useMemo } from "react";

/**
 * AttributeSelector
 *
 * Props:
 * - value: attributes array
 * - onChange: (nextAttributes) => void
 * - allAttributes: predefined attributes from API
 * - editable: boolean
 */
export default function AttributeSelector({
  value = [],
  onChange,
  allAttributes = [],
  editable = false,
}) {
  const attributes = Array.isArray(value) ? value : [];

  /* =========================================================
     ✅ DEFAULT SIZE ATTRIBUTE (XS..XXL)
     - Adds once when:
       1) editable=true
       2) attributes do NOT already contain Size
       3) allAttributes loaded
  ========================================================= */
  useEffect(() => {
    if (!editable) return;
    if (!Array.isArray(allAttributes) || allAttributes.length === 0) return;

    // check if size already exists (by key or by attribute match)
    const hasSize = attributes.some(
      (a) => String(a.key || "").toLowerCase() === "size"
    );
    if (hasSize) return;

    // find predefined Size attribute from API list
    const sizeDef =
      allAttributes.find((a) => String(a.slug || "").toLowerCase() === "size") ||
      allAttributes.find((a) => String(a.name || "").toLowerCase() === "size");

    if (!sizeDef) return;

    const defaultSizeValues = ["XS", "S", "M", "L", "XL"];

    onChange([
      {
        attribute: sizeDef._id,
        key: sizeDef.name || "Size",
        values: defaultSizeValues,
        mode: "select",
      },
      ...attributes,
    ]);
  }, [editable, allAttributes]); // run once after attributes arrive

  const updateAttr = (index, patch) => {
    const next = [...attributes];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAttr = (index) => {
    onChange(attributes.filter((_, i) => i !== index));
  };

  const addAttr = () => {
    onChange([
      ...attributes,
      {
        attribute: null,
        key: "",
        values: [],
        mode: "select", // select | custom
      },
    ]);
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Attributes</h2>

        {editable && (
          <button
            onClick={addAttr}
            className="px-3 py-1 rounded-lg bg-black text-white text-sm"
          >
            + Add Attribute
          </button>
        )}
      </div>

      {attributes.length === 0 && (
        <p className="text-sm text-gray-600">
          No attributes assigned.
          {editable && " Click “Add Attribute” to add one."}
        </p>
      )}

      {attributes.map((attr, index) => {
        const predefined = allAttributes.find((a) => a._id === attr.attribute);

        return (
          <div key={index} className="bg-gray-100 p-4 rounded-lg space-y-3">
            {/* MODE SELECT */}
            {editable && (
              <div className="flex gap-2">
                <select
                  value={attr.mode}
                  onChange={(e) =>
                    updateAttr(index, {
                      mode: e.target.value,
                      attribute: null,
                      key: "",
                      values: [],
                    })
                  }
                  className="rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <option value="select">Use predefined</option>
                  <option value="custom">Create new</option>
                </select>

                {attr.mode === "select" && (
                  <select
                    value={attr.attribute || ""}
                    onChange={(e) => {
                      const def = allAttributes.find(
                        (a) => a._id === e.target.value
                      );

                      // ✅ if selected attribute is Size → default preselect XS..XXL
                      const isSize =
                        String(def?.slug || "").toLowerCase() === "size" ||
                        String(def?.name || "").toLowerCase() === "size";

                      updateAttr(index, {
                        attribute: def?._id || null,
                        key: def?.name || "",
                        values: isSize ? ["XS", "S", "M", "L", "XL", "XXL"] : [],
                      });
                    }}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select attribute</option>
                    {allAttributes.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* ATTRIBUTE NAME */}
            {!editable && <p className="font-semibold text-sm">{attr.key}</p>}

            {editable && attr.mode === "custom" && (
              <input
                value={attr.key}
                onChange={(e) => updateAttr(index, { key: e.target.value })}
                placeholder="Attribute name (e.g. Fabric)"
                className="w-full rounded-lg bg-white px-3 py-2 text-sm outline-none"
              />
            )}

            {/* VALUES */}
            {editable ? (
              predefined && attr.mode === "select" ? (
                <div className="flex flex-wrap gap-2">
                  {predefined.values.map((v) => {
                    const active = attr.values.includes(v.value);
                    return (
                      <button
                        key={v.value}
                        onClick={() => {
                          const set = new Set(attr.values);
                          active ? set.delete(v.value) : set.add(v.value);
                          updateAttr(index, { values: Array.from(set) });
                        }}
                        className={`px-3 py-1 rounded-full text-xs ${
                          active ? "bg-black text-white" : "bg-gray-300"
                        }`}
                      >
                        {predefined.type === "color" && (
                          <span
                            className="inline-block w-3 h-3 rounded-full mr-1"
                            style={{ background: v.value }}
                          />
                        )}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={attr.values.join(", ")}
                  onChange={(e) =>
                    updateAttr(index, {
                      values: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Values (comma separated)"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm outline-none"
                />
              )
            ) : (
              <div className="flex gap-2 flex-wrap">
                {attr.values.map((v, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-300 rounded-full text-xs"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* REMOVE */}
            {editable && (
              <button
                onClick={() => removeAttr(index)}
                className="text-xs text-red-600"
              >
                Remove attribute
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
