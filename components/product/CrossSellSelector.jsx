"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useAdminProductStore } from "@/stores/adminProductStore";

export default function CrossSellSelector({
  value = [],            // array of product IDs
  onChange,
  placeholder = "Search products…",
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const {
    products,
    fetchProducts,
    loading,
  } = useAdminProductStore();

  /* ---------------- fetch on search ---------------- */
  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      fetchProducts({
        search: query || undefined,
        limit: 8,
      });
    }, 300);

    return () => clearTimeout(t);
  }, [query, open]);

  /* ---------------- close on outside click ---------------- */
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (id) => {
    onChange(
      value.includes(id)
        ? value.filter((x) => x !== id)
        : [...value, id]
    );
  };

  const selected = products.filter((p) => value.includes(p._id));

  return (
    <div ref={ref} className="relative w-full">
      {/* INPUT */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-left"
      >
        <span className="text-sm text-gray-700">
          {value.length
            ? `${value.length} product(s) selected`
            : "Select cross-sell products"}
        </span>
        <ChevronDown size={16} />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-lg">
          {/* SEARCH */}
          <div className="p-3 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* RESULTS */}
          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <p className="p-3 text-sm text-gray-500">Searching…</p>
            )}

            {!loading && products.length === 0 && (
              <p className="p-3 text-sm text-gray-500">No products found</p>
            )}

            {!loading &&
              products.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => toggle(p._id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between"
                >
                  <span className="text-sm">{p.title}</span>
                  {value.includes(p._id) && <span>✓</span>}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* SELECTED CHIPS */}
      {!!value.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((p) => (
            <span
              key={p._id}
              className="flex items-center gap-1 rounded-full bg-black text-white px-3 py-1 text-xs"
            >
              {p.title}
              <button onClick={() => toggle(p._id)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
