"use client";

import { useEffect, useMemo, useState } from "react";
import { useCategoryStore } from "@/store/categorystore";

export default function CategoryMultiSelect({
  value = [],
  onChange,
  placeholder = "Select categories",
}) {
  const [q, setQ] = useState("");

  // ✅ Use separate selectors (prevents snapshot loop)
  const categories = useCategoryStore((state) => state.categories);
  const loading = useCategoryStore((state) => state.loading);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  /* ---------------- fetch categories ---------------- */
  useEffect(() => {
    // ✅ only fetch once if store empty
    if (!categories?.length) fetchCategories();
  }, [categories?.length, fetchCategories]);

  /* -----------------------------------------------------
     ✅ Default select: all-clothing + new-arrivals
     only if value is empty (first time)
  ------------------------------------------------------ */
  useEffect(() => {
    if (!categories?.length) return;
    if (value.length) return;

    const defaults = ["all-clothing", "new-arrivals"];
    const availableKeys = new Set(
      categories.map((c) => (c.slug || c.name).toLowerCase())
    );

    const selectedDefaults = defaults.filter((d) => availableKeys.has(d));

    if (selectedDefaults.length) {
      onChange(selectedDefaults);
    }
  }, [categories, value.length, onChange]);

  /* ---------------- helpers ---------------- */
  const toggle = (key) => {
    const set = new Set(value);
    set.has(key) ? set.delete(key) : set.add(key);
    onChange(Array.from(set));
  };

  /* ---------------- filter categories ---------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return categories;

    return categories.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const slug = String(c.slug || "").toLowerCase();
      return name.includes(term) || slug.includes(term);
    });
  }, [categories, q]);

  /* ---------------- selected labels ---------------- */
  const selected = useMemo(() => {
    const map = new Map();
    categories?.forEach((c) => {
      const key = c.slug || c.name;
      map.set(key, c.name);
    });
    return value.map((k) => map.get(k) || k);
  }, [categories, value]);

  return (
    <div className="space-y-3">
      {/* Selected summary */}
      <div className="flex flex-wrap gap-2">
        {selected.length ? (
          value.map((k, idx) => (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className="px-3 py-1 rounded-full text-sm bg-black text-white hover:opacity-80 transition"
              title="Click to remove"
            >
              {selected[idx]} ✕
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500">{placeholder}</p>
        )}
      </div>

      {/* Search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search categories..."
        className="w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      />

      {/* Categories as tags */}
      <div className="rounded-xl border bg-white p-3 max-h-64 overflow-auto">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && filtered?.length === 0 && (
          <p className="text-sm text-gray-500">No categories found</p>
        )}

        {!loading && filtered?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filtered.map((cat) => {
              const key = cat.slug || cat.name;
              const active = value.includes(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-gray-100 hover:bg-gray-200 border-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
