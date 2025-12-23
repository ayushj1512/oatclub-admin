"use client";

import { useState } from "react";

const toStr = (v) => (v == null ? "" : String(v));
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ProductVariantsEditor({
  value = [],
  onChange,
  editable = false,
}) {
  if (!Array.isArray(value) || value.length === 0) return null;

  const updateVariantField = (index, key, val) => {
    const next = [...value];
    const v = { ...(next[index] || {}) };

    v[key] = key === "stock" || key === "price" ? toNum(val) : val;

    // 🚫 ensure no image ever exists on variant
    delete v.image;

    next[index] = v;
    onChange(next);
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
      <h2 className="text-lg md:text-xl font-semibold">Variants</h2>

      {value.map((v, i) => (
        <div
          key={toStr(v?._id) || i}
          className="p-4 rounded-lg bg-gray-100 space-y-3"
        >
          {/* VARIANT TITLE */}
          <p className="font-semibold text-sm">
            {(v.attributes || [])
              .map((a) => `${a.key}: ${a.value}`)
              .join(" • ") || "Variant"}
          </p>

          {editable ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* SKU */}
              <div>
                <label className="text-xs font-medium text-gray-600">
                  SKU
                </label>
                <input
                  value={toStr(v?.sku)}
                  onChange={(e) =>
                    updateVariantField(i, "sku", e.target.value)
                  }
                  className="w-full rounded-xl bg-white px-3 py-2 outline-none"
                />
              </div>

              {/* STOCK */}
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Stock
                </label>
                <input
                  value={toStr(v?.stock)}
                  onChange={(e) =>
                    updateVariantField(i, "stock", e.target.value)
                  }
                  className="w-full rounded-xl bg-white px-3 py-2 outline-none"
                />
              </div>

              {/* PRICE */}
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Price
                </label>
                <input
                  value={toStr(v?.price)}
                  onChange={(e) =>
                    updateVariantField(i, "price", e.target.value)
                  }
                  className="w-full rounded-xl bg-white px-3 py-2 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-700">
              SKU: {v.sku || "N/A"} • Stock: {v.stock ?? 0} • Price: ₹
              {v.price ?? 0}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
