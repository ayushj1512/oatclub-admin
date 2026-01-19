"use client";

import { useEffect, useMemo, useState } from "react";
import { useCategoryStore } from "@/store/categorystore";
import { RefreshCw, Search } from "lucide-react";

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

    if (selectedDefaults.length) onChange(selectedDefaults);
  }, [categories, value.length, onChange]);

  /* ---------------- helpers ---------------- */
  const toggle = (key) => {
    const set = new Set(value);
    set.has(key) ? set.delete(key) : set.add(key);
    onChange(Array.from(set));
  };

  const handleRefresh = async () => {
    await fetchCategories();
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
        {value.length ? (
          value.map((k, idx) => (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className="group inline-flex items-center gap-2 rounded-full bg-black/90 px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-black/20"
              title="Click to remove"
            >
              <span className="truncate max-w-[180px]">{selected[idx]}</span>
              <span className="opacity-80 group-hover:opacity-100">✕</span>
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500">{placeholder}</p>
        )}
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-2xl bg-gray-50 px-10 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-black/5 transition placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/15"
          />
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh categories"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 shadow-sm ring-1 ring-black/5 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 text-gray-700 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Categories */}
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        {loading && (
          <div className="flex items-center gap-2 px-1 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
            <p className="text-sm text-gray-500">Loading categories…</p>
          </div>
        )}

        {!loading && filtered?.length === 0 && (
          <p className="px-1 py-2 text-sm text-gray-500">No categories found</p>
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
                  className={[
                    "rounded-full px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-black/15",
                    active
                      ? "bg-black text-white shadow-sm"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200",
                  ].join(" ")}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* subtle hint */}
      <p className="text-xs text-gray-400">
        Tip: Click a selected chip to remove it. Use refresh to re-fetch latest categories.
      </p>
    </div>
  );
}
