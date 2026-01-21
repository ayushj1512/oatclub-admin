import { useEffect, useMemo, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";

/**
 * Universal Product Linker (multi-select)
 *
 * Props:
 * - value: array of selected product IDs (controlled)
 * - onChange: (ids: string[]) => void
 * - label: string
 * - placeholder: string
 * - disabled: boolean
 * - max: number (optional limit)
 * - getProductLabel: (p) => string  // optional
 * - getProductHref: (p) => string   // optional (for preview click)
 */
export default function ProductLinker({
  value = [],
  onChange,
  label = "Link Products",
  placeholder = "Search products by name, SKU, pattern no...",
  disabled = false,
  max,
  getProductLabel,
  getProductHref,
}) {
  const { fetchAllProducts, fetchProductsByIds } = useAdminProductStore();

  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [q, setQ] = useState("");

  const selectedIds = useMemo(() => Array.from(new Set(value || [])), [value]);

  // Default label
  const labelFn =
    getProductLabel ||
    ((p) =>
      p?.name ||
      p?.title ||
      p?.productName ||
      p?.slug ||
      p?._id ||
      "Untitled Product");

  // Default href preview (customize to your site routes)
  const hrefFn =
    getProductHref ||
    ((p) => (p?.slug ? `/product/${p.slug}` : p?._id ? `/product/${p._id}` : "#"));

  // 1) Load ALL products (for search dropdown)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchAllProducts();
      if (!mounted) return;
      setAllProducts(Array.isArray(list) ? list : []);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchAllProducts]);

  // 2) Hydrate selected product objects from IDs
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!selectedIds.length) {
        setSelectedProducts([]);
        return;
      }

      // First try to resolve from allProducts if already loaded
      const map = new Map((allProducts || []).map((p) => [String(p._id), p]));
      const resolved = selectedIds.map((id) => map.get(String(id))).filter(Boolean);

      // If not all resolved, fetch missing by ids
      const missing = selectedIds.filter((id) => !map.has(String(id)));
      if (missing.length) {
        const fetched = await fetchProductsByIds(missing);
        const merged = [
          ...resolved,
          ...(Array.isArray(fetched) ? fetched : []),
        ];
        if (!mounted) return;
        // de-dupe by _id
        const uniq = [];
        const seen = new Set();
        for (const p of merged) {
          const id = String(p?._id || "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          uniq.push(p);
        }
        setSelectedProducts(uniq);
      } else {
        if (!mounted) return;
        setSelectedProducts(resolved);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedIds, allProducts, fetchProductsByIds]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return allProducts.slice(0, 30);

    return (allProducts || [])
      .filter((p) => {
        const hay = [
          p?.name,
          p?.title,
          p?.sku,
          p?.patternNumber,
          p?.slug,
          p?._id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(query);
      })
      .slice(0, 50);
  }, [allProducts, q]);

  const canAddMore = typeof max === "number" ? selectedIds.length < max : true;

  const add = (product) => {
    if (disabled) return;
    if (!product?._id) return;

    const id = String(product._id);
    if (selectedIds.includes(id)) return;

    if (!canAddMore) return;

    const nextIds = [...selectedIds, id];
    onChange?.(nextIds);

    // optimistic selectedProducts update
    setSelectedProducts((prev) => {
      const seen = new Set(prev.map((x) => String(x._id)));
      if (seen.has(id)) return prev;
      return [product, ...prev];
    });
  };

  const remove = (id) => {
    if (disabled) return;
    const nextIds = selectedIds.filter((x) => String(x) !== String(id));
    onChange?.(nextIds);
    setSelectedProducts((prev) => prev.filter((p) => String(p._id) !== String(id)));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange?.([]);
    setSelectedProducts([]);
  };

  return (
    <div className="w-full rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{label}</div>
          {max ? (
            <div className="text-xs text-gray-500">
              Selected {selectedIds.length}/{max}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Selected {selectedIds.length}</div>
          )}
        </div>

        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || !selectedIds.length}
          className="text-sm px-3 py-1 rounded-lg border disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 outline-none disabled:opacity-50"
      />

      {/* Results */}
      <div className="max-h-56 overflow-auto rounded-lg border">
        {filtered.length ? (
          filtered.map((p) => {
            const id = String(p?._id || "");
            const isSelected = selectedIds.includes(id);

            return (
              <button
                key={id}
                type="button"
                onClick={() => add(p)}
                disabled={disabled || isSelected || !canAddMore}
                className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{labelFn(p)}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {p?.sku ? `SKU: ${p.sku} • ` : ""}
                      {p?.patternNumber ? `Pattern: ${p.patternNumber} • ` : ""}
                      ID: {id}
                    </div>
                  </div>
                  <div className="text-xs">
                    {isSelected ? "Selected" : canAddMore ? "Add" : "Max"}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-3 text-sm text-gray-500">No products found.</div>
        )}
      </div>

      {/* Selected */}
      {selectedProducts.length ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">Linked Products</div>

          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((p) => {
              const id = String(p?._id || "");
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full border"
                >
                  <a
                    href={hrefFn(p)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline max-w-[220px] truncate"
                    title={labelFn(p)}
                  >
                    {labelFn(p)}
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    disabled={disabled}
                    className="text-xs px-2 py-0.5 rounded-full border disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {/* Hidden input helper (optional) */}
          <input type="hidden" value={selectedIds.join(",")} readOnly />
        </div>
      ) : (
        <div className="text-sm text-gray-500">No products linked yet.</div>
      )}
    </div>
  );
}
