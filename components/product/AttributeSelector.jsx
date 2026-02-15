"use client";

import { useEffect, useMemo, useRef } from "react";

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

  /* ---------------- helpers ---------------- */
  const slugOf = (a) => String(a?.slug || "").toLowerCase();
  const nameOf = (a) => String(a?.name || "").toLowerCase();
  const isId = (x) => String(x || "");

  const { sizeDef, footwearSizeDef } = useMemo(() => {
    const list = Array.isArray(allAttributes) ? allAttributes : [];
    const size =
      list.find((a) => slugOf(a) === "size") || list.find((a) => nameOf(a) === "size");
    const foot =
      list.find((a) => slugOf(a) === "footwear-size") ||
      list.find((a) => nameOf(a) === "footwear size");
    return { sizeDef: size || null, footwearSizeDef: foot || null };
  }, [allAttributes]);

  const clothingDefaults = ["XS", "S", "M", "L", "XL"];
  const footwearDefaults = useMemo(() => {
    const vals = footwearSizeDef?.values || [];
    return vals.map((v) => v.value);
  }, [footwearSizeDef]);

  /* =========================================================
     ✅ DEFAULT SIZE ATTRIBUTE
     - Adds once when editable=true and Size/Footwear Size not present
     - Default: clothing (XS..XL)
  ========================================================= */
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (!editable) return;
    if (!Array.isArray(allAttributes) || allAttributes.length === 0) return;
    if (!sizeDef) return;

    const hasSizeLike = attributes.some((a) => {
      const key = String(a?.key || "").toLowerCase();
      const def = allAttributes.find((x) => isId(x?._id) === isId(a?.attribute));
      const slug = slugOf(def);
      return key === "size" || slug === "size" || slug === "footwear-size";
    });
    if (hasSizeLike) return;

    didInit.current = true;
    onChange([
      {
        attribute: sizeDef._id,
        key: sizeDef.name || "Size",
        values: clothingDefaults, // ✅ XS..XL
        mode: "select",
        sizeType: "clothing", // ✅ for radio UI
      },
      ...attributes,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, allAttributes, sizeDef]);

  const updateAttr = (index, patch) => {
    const next = [...attributes];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAttr = (index) => onChange(attributes.filter((_, i) => i !== index));

  const addAttr = () =>
    onChange([
      ...attributes,
      { attribute: null, key: "", values: [], mode: "select" }, // select | custom
    ]);

  const setSizeType = (index, type) => {
    if (type === "footwear") {
      // switch to footwear-size attribute + select all sizes by default
      if (!footwearSizeDef) return;
      updateAttr(index, {
        sizeType: "footwear",
        attribute: footwearSizeDef._id,
        key: footwearSizeDef.name || "Footwear Size",
        values: footwearDefaults,
        mode: "select",
      });
      return;
    }

    // clothing
    if (!sizeDef) return;
    updateAttr(index, {
      sizeType: "clothing",
      attribute: sizeDef._id,
      key: sizeDef.name || "Size",
      values: clothingDefaults, // ✅ XS..XL
      mode: "select",
    });
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
        const predefined = allAttributes.find((a) => isId(a?._id) === isId(attr?.attribute));
        const preSlug = slugOf(predefined);

        const isSizeLike = preSlug === "size" || preSlug === "footwear-size";

        // keep a stable sizeType even if old data doesn't have it
        const resolvedSizeType =
          attr?.sizeType ||
          (preSlug === "footwear-size" ? "footwear" : preSlug === "size" ? "clothing" : "");

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
                      sizeType: undefined,
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
                      const def = allAttributes.find((a) => isId(a?._id) === isId(e.target.value));
                      const slug = slugOf(def);

                      // ✅ If Size selected -> default clothing XS..XL
                      if (slug === "size") {
                        updateAttr(index, {
                          attribute: def?._id || null,
                          key: def?.name || "",
                          values: clothingDefaults,
                          sizeType: "clothing",
                        });
                        return;
                      }

                      // ✅ If Footwear Size selected -> default ALL sizes selected
                      if (slug === "footwear-size") {
                        updateAttr(index, {
                          attribute: def?._id || null,
                          key: def?.name || "",
                          values: (def?.values || []).map((v) => v.value),
                          sizeType: "footwear",
                        });
                        return;
                      }

                      updateAttr(index, {
                        attribute: def?._id || null,
                        key: def?.name || "",
                        values: [],
                        sizeType: undefined,
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

            {/* ✅ Size type radios (clothing / footwear) */}
            {editable && attr.mode === "select" && isSizeLike && (
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`sizeType-${index}`}
                    checked={resolvedSizeType === "clothing"}
                    onChange={() => setSizeType(index, "clothing")}
                  />
                  Clothing (XS–XL)
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`sizeType-${index}`}
                    checked={resolvedSizeType === "footwear"}
                    onChange={() => setSizeType(index, "footwear")}
                    disabled={!footwearSizeDef} // if not available from API
                  />
                  Footwear (all sizes)
                </label>
              </div>
            )}

            {/* VALUES */}
            {editable ? (
              predefined && attr.mode === "select" ? (
                <div className="flex flex-wrap gap-2">
                  {(predefined.values || []).map((v) => {
                    const active = (attr.values || []).includes(v.value);
                    return (
                      <button
                        key={v.value}
                        onClick={() => {
                          const set = new Set(attr.values || []);
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
                  value={(attr.values || []).join(", ")}
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
                {(attr.values || []).map((v, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-300 rounded-full text-xs">
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* REMOVE */}
            {editable && (
              <button onClick={() => removeAttr(index)} className="text-xs text-red-600">
                Remove attribute
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
