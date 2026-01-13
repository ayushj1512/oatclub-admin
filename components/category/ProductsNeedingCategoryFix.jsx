import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";

function ProductsNeedingCategoryFix({
  products,
  categories,
  normalizeCategoryId,
  updateCategoriesInline,
  saving,
}) {
  const [selectedFixProductId, setSelectedFixProductId] = useState(null);
  const [selectedToAdd, setSelectedToAdd] = useState([]); // array of categoryIds
  const [keepBaseCats, setKeepBaseCats] = useState(true); // keep new-arrivals + all-clothing?

  // helper: get normalized ids for a product
  const getProductCategoryIds = (p) => {
    return (p?.categories || []).map(normalizeCategoryId).filter(Boolean);
  };

  // detect special categories (by slug OR name)
  const specialCatIds = useMemo(() => {
    const bySlugOrName = (key) => {
      const k = key.trim().toLowerCase();
      const found =
        (categories || []).find((c) => String(c?.slug || "").toLowerCase() === k) ||
        (categories || []).find((c) => String(c?.name || "").toLowerCase() === k);
      return found?._id ? String(found._id) : null;
    };

    return {
      newArrivalsId: bySlugOrName("new-arrivals") || bySlugOrName("new arrivals"),
      allClothingId: bySlugOrName("all-clothing") || bySlugOrName("all clothing"),
    };
  }, [categories]);

  const { noCategoryProducts, onlyBaseCategoryProducts } = useMemo(() => {
    const noCat = [];
    const onlyBase = [];

    const base = new Set(
      [specialCatIds.newArrivalsId, specialCatIds.allClothingId].filter(Boolean)
    );

    (products || []).forEach((p) => {
      const ids = getProductCategoryIds(p);

      if (!ids.length) {
        noCat.push(p);
        return;
      }

      // case: only {newArrivals, allClothing} (and nothing else)
      // Must contain both and nothing outside base
      if (base.size === 2) {
        const allInsideBase = ids.every((x) => base.has(x));
        const hasBoth = base.has(ids[0]) && ids.length === 2 && ids.includes([...base][0]) && ids.includes([...base][1]);

        // safer: check includes both + all are inside base + no extras
        const includesBoth =
          ids.includes(specialCatIds.newArrivalsId) && ids.includes(specialCatIds.allClothingId);

        if (allInsideBase && includesBoth) onlyBase.push(p);
      }
    });

    return { noCategoryProducts: noCat, onlyBaseCategoryProducts: onlyBase };
  }, [products, specialCatIds, categories, normalizeCategoryId]);

  const fixList = useMemo(() => {
    const combined = [
      ...noCategoryProducts.map((p) => ({ type: "NO_CATEGORY", p })),
      ...onlyBaseCategoryProducts.map((p) => ({ type: "ONLY_BASE", p })),
    ];

    // Optional: sort by type then name
    combined.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      const an = (a.p?.title || a.p?.name || "").toLowerCase();
      const bn = (b.p?.title || b.p?.name || "").toLowerCase();
      return an.localeCompare(bn);
    });

    return combined;
  }, [noCategoryProducts, onlyBaseCategoryProducts]);

  const selectedProduct = useMemo(() => {
    if (!selectedFixProductId) return null;
    return (products || []).find((p) => p._id === selectedFixProductId) || null;
  }, [selectedFixProductId, products]);

  const categoryOptions = useMemo(() => {
    return (categories || []).map((c) => ({ value: String(c._id), label: c.name }));
  }, [categories]);

  const baseCatIds = useMemo(() => {
    return [specialCatIds.newArrivalsId, specialCatIds.allClothingId].filter(Boolean);
  }, [specialCatIds]);

  const handleApplyFix = async () => {
    if (!selectedProduct) return toast.error("Select a product first");
    if (!selectedToAdd.length) return toast.error("Select at least 1 category to add");

    const current = getProductCategoryIds(selectedProduct);

    // build final set
    const nextSet = new Set();

    // keep existing categories?
    // If product was ONLY_BASE and user unchecks keepBaseCats, we remove base categories.
    // Otherwise we keep everything already present.
    const shouldKeep = keepBaseCats ? current : current.filter((id) => !baseCatIds.includes(id));

    shouldKeep.forEach((id) => nextSet.add(id));
    selectedToAdd.forEach((id) => nextSet.add(id));

    const next = Array.from(nextSet);

    if (!next.length) return toast.error("At least 1 category required");

    try {
      await updateCategoriesInline(selectedProduct._id, next);
      toast.success("Categories updated ✅");
      setSelectedToAdd([]);
    } catch (e) {
      toast.error(e?.message || "Failed to update");
    }
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm border border-black/5 overflow-hidden">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-semibold truncate">Needs Category Fix</div>
          <div className="text-xs text-muted-foreground truncate">
            No category OR only (new-arrivals + all-clothing)
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {fixList.length} products
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: list */}
        <div className="rounded-2xl border border-black/5 p-3 max-h-[60vh] overflow-auto space-y-2">
          {!fixList.length ? (
            <div className="text-sm text-muted-foreground">
              ✅ All products look good.
            </div>
          ) : (
            fixList.map(({ type, p }) => {
              const active = selectedFixProductId === p._id;
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setSelectedFixProductId(p._id)}
                  className={`w-full text-left rounded-2xl p-3 transition ${
                    active ? "bg-black text-white" : "hover:bg-black/5"
                  }`}
                >
                  <div className={`text-xs ${active ? "text-white/70" : "text-muted-foreground"}`}>
                    {type === "NO_CATEGORY" ? "No Category" : "Only New Arrivals + All Clothing"}
                  </div>
                  <div className="font-medium truncate">{p.title || p.name}</div>
                  <div className={`text-xs truncate ${active ? "text-white/70" : "text-muted-foreground"}`}>
                    {p._id}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* MIDDLE: current categories */}
        <div className="rounded-2xl border border-black/5 p-3">
          {!selectedProduct ? (
            <div className="text-sm text-muted-foreground">Select a product.</div>
          ) : (
            <>
              <div className="font-medium mb-2">Current Categories</div>
              <div className="flex flex-wrap gap-2">
                {getProductCategoryIds(selectedProduct)
                  .map((id) => (categories || []).find((c) => String(c._id) === String(id)))
                  .filter(Boolean)
                  .map((c) => (
                    <span key={c._id} className="px-3 py-1 rounded-full bg-black/5 text-sm">
                      {c.name}
                    </span>
                  ))}
              </div>

              {baseCatIds.length === 2 && (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={keepBaseCats}
                    onChange={(e) => setKeepBaseCats(e.target.checked)}
                  />
                  Keep “New Arrivals” + “All Clothing”
                </label>
              )}
            </>
          )}
        </div>

        {/* RIGHT: add categories + apply */}
        <div className="rounded-2xl border border-black/5 p-3 space-y-3">
          {!selectedProduct ? (
            <div className="text-sm text-muted-foreground">Select a product to fix.</div>
          ) : (
            <>
              <div className="font-medium">Add Categories</div>

              {/* multi select (simple) */}
              <select
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  setSelectedToAdd((prev) => (prev.includes(id) ? prev : [...prev, id]));
                  e.target.value = "";
                }}
                defaultValue=""
                disabled={saving}
              >
                <option value="" disabled>
                  Select category to add...
                </option>
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* selected chips */}
              <div className="flex flex-wrap gap-2">
                {selectedToAdd.map((id) => {
                  const c = (categories || []).find((x) => String(x._id) === String(id));
                  return (
                    <span
                      key={id}
                      className="px-3 py-1 rounded-full bg-black/5 text-sm flex items-center gap-2"
                    >
                      {c?.name || id}
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => setSelectedToAdd((prev) => prev.filter((x) => x !== id))}
                      >
                        remove
                      </button>
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleApplyFix}
                disabled={saving}
                className="w-full rounded-2xl bg-black text-white px-4 py-2 text-sm shadow hover:opacity-90 active:scale-[0.99]"
              >
                {saving ? "Saving..." : "Apply Fix"}
              </button>

              <p className="text-xs text-muted-foreground">
                Tip: For products showing only (new-arrivals + all-clothing), add the real leaf category
                like “Men / Shirts” etc.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductsNeedingCategoryFix;
