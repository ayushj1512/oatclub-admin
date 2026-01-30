"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ============================================================================
  Inventory > Products
  - Compact rows, expand for variants, inline stock edit
  - Status shown: Published / Draft / Unpublished (isActive + isDraft)
  - Light accent colors (emerald/amber/rose) but overall black/white/grey
============================================================================ */

const cx = (...a) => a.filter(Boolean).join(" ");
const s = (v) => (v == null ? "" : String(v));
const n = (v) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
};

const LOW_STOCK = 5;

/* ------------------------------ Data helpers ------------------------------ */
const getThumb = (p) =>
  p?.thumbnail || (Array.isArray(p?.images) ? p.images[0] : "") || "";

/**
 * Category label resolver:
 * - your payload shows `categories: ["dress", ...]`
 * - sometimes backend may send `category` populated object or id
 */
const pickCategoryLabel = (p) => {
  const readName = (c) =>
    s(c?.name) || s(c?.title) || s(c?.label) || s(c?.slug);

  // if you add these later, this will auto-work
  const direct =
    s(p?.categoryLabel) ||
    s(p?.categoryName) ||
    s(p?.categoryTitle) ||
    s(p?.categoryPath);
  if (direct) return direct;

  // populated category object
  if (p?.category && typeof p.category === "object") {
    const name = readName(p.category);
    if (name) return name;
  }

  // ✅ IMPORTANT: your API uses `categories` array of slugs
  if (Array.isArray(p?.categories) && p.categories.length) {
    const first = p.categories[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") return readName(first) || "—";
  }

  // category id string
  if (typeof p?.category === "string" && p.category.trim()) {
    return `#${p.category.trim().slice(0, 6)}…`;
  }

  return "—";
};

/** Status from flags: Published / Draft / Unpublished */
const getStatus = (p) => {
  const isActive = Boolean(p?.isActive);
  const isDraft = Boolean(p?.isDraft);

  if (!isActive) return { label: "Unpublished", tone: "neutral" };
  if (isDraft) return { label: "Draft", tone: "amber" };
  return { label: "Published", tone: "emerald" };
};

/* ------------------------------ UI atoms ------------------------------ */
function Chip({ children, tone = "neutral" }) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-black/5 text-black/70 ring-black/10";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs",
        "ring-1",
        toneCls
      )}
    >
      {children}
    </span>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", className = "" }) {
  const base =
    variant === "primary"
      ? "bg-black text-white hover:bg-black/90"
      : "bg-black/5 text-black hover:bg-black/10";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-xl px-3 py-2 text-sm transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        base,
        className
      )}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "h-10 w-full rounded-xl bg-white px-3 text-sm text-black",
        "ring-1 ring-black/10 outline-none focus:ring-black/30"
      )}
    />
  );
}

function NumInput({ value, onChange }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "h-9 w-24 rounded-xl bg-white px-3 text-sm text-black",
        "ring-1 ring-black/10 outline-none focus:ring-black/30"
      )}
    />
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[44px_1fr_220px_120px_260px] items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="h-11 w-11 rounded-xl bg-black/5" />
      <div className="space-y-2">
        <div className="h-3 w-1/2 rounded bg-black/5" />
        <div className="h-3 w-1/3 rounded bg-black/5" />
      </div>
      <div className="h-3 w-40 rounded bg-black/5" />
      <div className="h-9 w-28 rounded-xl bg-black/5" />
      <div className="h-9 w-44 rounded-xl bg-black/5 justify-self-end" />
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
export default function InventoryProductsPage() {
  const { products, loading, saving, error, fetchAllProducts, updateProduct, updateVariantStock } =
    useAdminProductStore();

  // UI state
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [draft, setDraft] = useState({});
  const [savingKey, setSavingKey] = useState("");

  const load = async () => {
    try {
      await fetchAllProducts({});
    } catch (e) {
      toast.error(e?.message || "Failed to load products");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const arr = Array.isArray(products) ? products : [];
    const needle = s(q).trim().toLowerCase();

    return arr
      .filter((p) => {
        if (!needle) return true;

        const cat = pickCategoryLabel(p);
        const st = getStatus(p).label;

        const hay = [
          p?.productCode,
          p?.title,
          p?.slug,
          p?.sku,
          cat,
          st,
          ...(Array.isArray(p?.tags) ? p.tags : []),
        ]
          .map((x) => s(x).toLowerCase())
          .join(" ");

        return hay.includes(needle);
      })
      .filter((p) => {
        if (!onlyLow) return true;

        const vars = Array.isArray(p?.variants) ? p.variants : [];
        const isVar = s(p?.productType).toLowerCase() === "variable" || vars.length > 0;

        if (!isVar) return n(p?.stock) <= LOW_STOCK;
        return vars.some((v) => n(v?.stock) <= LOW_STOCK);
      });
  }, [products, q, onlyLow]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setDraftVal = (key, val) => setDraft((prev) => ({ ...prev, [key]: val }));

  // save stock for simple product
  const saveSimple = async (pid, current) => {
    const key = `${pid}`;
    const next = Math.max(0, Math.floor(n(draft[key] ?? current)));

    try {
      setSavingKey(key);
      await updateProduct(pid, { stock: next });
      toast.success("Stock updated ✅");
    } catch (e) {
      toast.error(e?.message || "Stock update failed");
    } finally {
      setSavingKey("");
    }
  };

  // save stock for variant
  const saveVariant = async (pid, vid, current) => {
    const key = `${pid}:${vid}`;
    const next = Math.max(0, Math.floor(n(draft[key] ?? current)));

    try {
      setSavingKey(key);
      await updateVariantStock(pid, vid, next);
      toast.success("Variant stock updated ✅");
    } catch (e) {
      toast.error(e?.message || "Variant stock update failed");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#fafafa]/80 backdrop-blur">
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold tracking-tight">Inventory · Products</div>
              <div className="mt-1 text-sm text-black/60">
                Expand product → edit variant stock. Status shown as Published/Draft/Unpublished.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={() => setOnlyLow((v) => !v)}>
                {onlyLow ? "Showing: Low stock" : "Filter: Low stock"}
              </Btn>
              <Btn onClick={load} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Btn>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <TextInput
              value={q}
              onChange={setQ}
              placeholder="Search code, name, category, sku, status, tags…"
            />
            <div className="flex items-center gap-2 md:justify-end">
              <Chip>Total: {list.length}</Chip>
              <Chip>Loaded: {Array.isArray(products) ? products.length : 0}</Chip>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div className="text-sm font-medium">Could not load products</div>
              <div className="mt-1 text-sm text-black/60">{error}</div>
              <div className="mt-3">
                <Btn onClick={load}>Retry</Btn>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Rows */}
      <div className="px-5 pb-10">
        <div className="space-y-2">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : list.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="text-sm font-medium">No products found</div>
              <div className="mt-1 text-sm text-black/60">Try clearing filters or search.</div>
            </div>
          ) : (
            list.map((p) => {
              const id = s(p?._id);
              const isOpen = expanded.has(id);

              const title = s(p?.title) || "Untitled";
              const code = s(p?.productCode) || "—";
              const cat = pickCategoryLabel(p);
              const img = getThumb(p);

              const vars = Array.isArray(p?.variants) ? p.variants : [];
              const isVar = s(p?.productType).toLowerCase() === "variable" || vars.length > 0;

              const simpleStock = n(p?.stock);
              const isLow = isVar
                ? vars.some((v) => n(v?.stock) <= LOW_STOCK)
                : simpleStock <= LOW_STOCK;

              const st = getStatus(p);

              return (
                <div key={id} className="rounded-2xl bg-white ring-1 ring-black/5">
                  {/* Main row */}
                  <div className="grid grid-cols-[44px_1fr_220px_120px_260px] items-center gap-3 p-3">
                    {/* Image */}
                    <div className="h-11 w-11 overflow-hidden rounded-xl bg-black/5">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>

                    {/* Title + meta */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium">{title}</div>

                        {/* ✅ STATUS (Published / Draft / Unpublished) */}
                        <Chip tone={st.tone}>{st.label}</Chip>

                        {/* Stock hints */}
                        {isLow ? <Chip tone="amber">Low</Chip> : null}
                        <Chip>{isVar ? "Variable" : "Simple"}</Chip>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/60">
                        <span className="truncate">Code: {code}</span>
                        <span className="text-black/20">•</span>
                        <span className="truncate">Category: {cat}</span>
                        {p?.sku ? (
                          <>
                            <span className="text-black/20">•</span>
                            <span className="truncate">SKU: {s(p.sku)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Stock summary */}
                    <div className="flex items-center gap-2">
                      {isVar ? (
                        <Chip>{vars.length} variants</Chip>
                      ) : (
                        <Chip tone={simpleStock === 0 ? "rose" : "neutral"}>
                          Stock: {simpleStock}
                        </Chip>
                      )}
                    </div>

                    {/* Expand */}
                    <div className="flex items-center gap-2">
                      <Btn
                        variant="secondary"
                        onClick={() => toggle(id)}
                        className="w-full"
                      >
                        {isOpen ? "Collapse" : "Expand"}
                      </Btn>
                    </div>

                    {/* Quick edit for simple */}
                    <div className="flex items-center justify-end gap-2">
                      {!isVar ? (
                        <>
                          <NumInput
                            value={draft[id] ?? String(simpleStock)}
                            onChange={(v) => setDraftVal(id, v)}
                          />
                          <Btn
                            onClick={() => saveSimple(id, simpleStock)}
                            disabled={saving || savingKey === id}
                          >
                            {savingKey === id ? "Saving..." : "Save"}
                          </Btn>
                        </>
                      ) : (
                        <div className="text-xs text-black/50">Edit variants →</div>
                      )}
                    </div>
                  </div>

                  {/* Expanded variants */}
                  {isOpen ? (
                    <div className="border-t border-black/5 px-3 pb-3 pt-3">
                      {isVar ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">Variants</div>
                            <div className="text-xs text-black/50">
                              Set stock to 0 for out-of-stock
                            </div>
                          </div>

                          {vars.length === 0 ? (
                            <div className="rounded-2xl bg-[#f6f6f6] p-3 text-sm text-black/60">
                              No variants found.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {vars.map((v) => {
                                const vid = s(v?._id);
                                const key = `${id}:${vid}`;
                                const vSku = s(v?.sku) || "—";
                                const vStock = n(v?.stock);

                                // attributes line e.g. "Size:M · Color:Black"
                                const attrs = Array.isArray(v?.attributes)
                                  ? v.attributes
                                  : [];
                                const attrsText = attrs
                                  .map((a) => {
                                    const kk = s(a?.key).trim();
                                    const vv = s(a?.value).trim();
                                    if (!kk || !vv) return "";
                                    return `${kk}:${vv}`;
                                  })
                                  .filter(Boolean)
                                  .join(" · ");

                                return (
                                  <div
                                    key={key}
                                    className="grid grid-cols-[1fr_220px_120px_220px] items-center gap-3 rounded-2xl bg-[#f6f6f6] p-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="truncate text-sm font-medium">
                                          {vSku}
                                        </div>
                                        {vStock === 0 ? (
                                          <Chip tone="rose">OOS</Chip>
                                        ) : null}
                                        {vStock > 0 && vStock <= LOW_STOCK ? (
                                          <Chip tone="amber">Low</Chip>
                                        ) : null}
                                      </div>
                                      <div className="mt-1 truncate text-xs text-black/60">
                                        {attrsText || "—"}
                                      </div>
                                    </div>

                                    <div className="text-xs text-black/60">
                                      Current:{" "}
                                      <span className="text-black/80">{vStock}</span>
                                    </div>

                                    <NumInput
                                      value={draft[key] ?? String(vStock)}
                                      onChange={(val) => setDraftVal(key, val)}
                                    />

                                    <div className="flex justify-end">
                                      <Btn
                                        onClick={() => saveVariant(id, vid, vStock)}
                                        disabled={saving || savingKey === key}
                                      >
                                        {savingKey === key ? "Saving..." : "Save stock"}
                                      </Btn>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[#f6f6f6] p-3 text-sm text-black/60">
                          This is a simple product (no variants).
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
