"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

/**
 * CrossSellSelector
 *
 * value = [productIds]
 * onChange = fn(nextIds)
 */
export default function CrossSellSelector({
  value = [],
  onChange,
  placeholder = "Search products…",
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { products, fetchProducts, loading } = useAdminProductStore();

  /* -----------------------------------------------------------
     ✅ Local cache of selected product objects
     (so selected chips don't disappear when search results change)
  ----------------------------------------------------------- */
  const [selectedMap, setSelectedMap] = useState({}); // { [id]: product }

  /* ---------------- fetch selected products on mount / value change ---------------- */
  useEffect(() => {
    if (!value.length) return;

    // Find which ids are missing in cache
    const missing = value.filter((id) => !selectedMap[id]);

    if (!missing.length) return;

    // Fetch missing IDs (assuming your fetchProducts supports ids)
    // If not, I’ll adjust below
    fetchProducts({ ids: missing, limit: missing.length }).then((res) => {
      // merge results into map
      const next = { ...selectedMap };
      (res || products || []).forEach((p) => {
        if (missing.includes(p._id)) next[p._id] = p;
      });
      setSelectedMap(next);
    });
  }, [value]);

  /* ---------------- fetch on search ---------------- */
  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      fetchProducts({
        search: query || undefined,
        limit: 10,
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

  /* ---------------- toggle select ---------------- */
  const toggle = (id, productObj = null) => {
    if (value.includes(id)) {
      const nextIds = value.filter((x) => x !== id);
      onChange(nextIds);

      // remove from cache
      const nextMap = { ...selectedMap };
      delete nextMap[id];
      setSelectedMap(nextMap);
    } else {
      onChange([...value, id]);

      // add to cache if we have product obj
      if (productObj) {
        setSelectedMap((m) => ({ ...m, [id]: productObj }));
      }
    }
  };

  /* ---------------- selected product objects ---------------- */
  const selectedProducts = useMemo(() => {
    return value.map((id) => selectedMap[id]).filter(Boolean);
  }, [value, selectedMap]);

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
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden">
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
          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <p className="p-3 text-sm text-gray-500">Searching…</p>
            )}

            {!loading && products.length === 0 && (
              <p className="p-3 text-sm text-gray-500">No products found</p>
            )}

            {!loading &&
              products.map((p) => {
                const active = value.includes(p._id);

                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => toggle(p._id, p)}
                    className={`w-full px-4 py-2 text-left flex items-center justify-between gap-3 hover:bg-gray-50 ${
                      active ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      {p.thumbnail && (
                        <img
                          src={p.thumbnail}
                          alt={p.title}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                        />
                      )}

                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.title}</span>
                        <span className="text-xs text-gray-500">
                          ₹{p.price}
                        </span>
                      </div>
                    </div>

                    {active && <span className="text-black">✓</span>}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* SELECTED CHIPS */}
      {!!selectedProducts.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedProducts.map((p) => (
            <span
              key={p._id}
              className="flex items-center gap-2 rounded-full bg-black text-white px-3 py-1 text-xs"
            >
              {p.thumbnail && (
                <img
                  src={p.thumbnail}
                  alt={p.title}
                  className="w-5 h-5 rounded-full object-cover bg-gray-200"
                />
              )}
              <span className="truncate max-w-[180px]">{p.title}</span>

              <button
                type="button"
                onClick={() => toggle(p._id)}
                className="hover:opacity-80"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
