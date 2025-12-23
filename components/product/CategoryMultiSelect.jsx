"use client";

import { useEffect, useState } from "react";

/**
 * CategoryMultiSelect
 *
 * Props:
 * - value: string[]        (selected category slugs/names)
 * - onChange: fn(string[]) (callback on change)
 * - apiUrl?: string        (optional override)
 * - placeholder?: string
 */
export default function CategoryMultiSelect({
  value = [],
  onChange,
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
  placeholder = "Select categories",
}) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- fetch categories ---------------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/categories`, {
          cache: "no-store",
        });
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load categories", e);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [apiUrl]);

  /* ---------------- helpers ---------------- */
  const toggle = (key) => {
    const set = new Set(value);
    set.has(key) ? set.delete(key) : set.add(key);
    onChange(Array.from(set));
  };

  const selectedNames = categories
    .filter((c) => value.includes(c.slug || c.name))
    .map((c) => c.name);

  /* ---------------- UI ---------------- */
  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl bg-gray-100 px-4 py-2 text-sm"
      >
        <span className="truncate">
          {selectedNames.length ? selectedNames.join(", ") : placeholder}
        </span>
        <span className="text-xs">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-2 w-full max-h-64 overflow-auto rounded-xl bg-white shadow-lg border">
          {loading && (
            <p className="px-4 py-3 text-sm text-gray-500">Loading…</p>
          )}

          {!loading &&
            categories.map((cat) => {
              const key = cat.slug || cat.name;
              const active = value.includes(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  className={`w-full px-4 py-2 text-left text-sm transition ${
                    active
                      ? "bg-black text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}

          {!loading && categories.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">
              No categories found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
