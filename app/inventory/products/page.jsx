"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ----------------------------- tiny utils ----------------------------- */
const cx = (...c) => c.filter(Boolean).join(" ");
const s = (v) => (v == null ? "" : String(v));
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const thumb = (p) => p?.thumbnail || (Array.isArray(p?.images) && p.images[0]) || "";

const pickCategory = (p) => {
  const direct = s(p?.categoryLabel) || s(p?.categoryName) || s(p?.categoryTitle) || s(p?.categoryPath);
  if (direct) return direct;

  const read = (c) => s(c?.name) || s(c?.title) || s(c?.label) || s(c?.slug);

  if (p?.category && typeof p.category === "object") return read(p.category) || "—";
  if (Array.isArray(p?.categories) && p.categories.length) {
    const first = p.categories[0];
    if (first && typeof first === "object") return read(first) || "—";
    if (typeof first === "string") return first;
  }
  if (typeof p?.category === "string" && p.category.trim()) return `Category: ${p.category.trim().slice(0, 6)}…`;
  return "—";
};

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const publishStatus = (p) => {
  const isDraft = !!p?.isDraft;
  const isActive = p?.computedIsActive == null ? !!p?.isActive : !!p?.computedIsActive;
  const at = p?.publishAt ? new Date(p.publishAt) : null;
  const future = at && Number.isFinite(at.getTime()) && at > new Date();

  if (isDraft) return { label: "Draft", tone: "neutral" };
  if (!isActive) return { label: "Inactive", tone: "muted" };
  if (future) return { label: "Scheduled", tone: "warning" };
  return { label: "Published", tone: "success" };
};

/* ------------------------------ UI bits ------------------------------ */
function Pill({ children, tone = "muted" }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : tone === "neutral"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : "bg-black/5 text-black/60 ring-black/10";

  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1", cls)}>{children}</span>;
}

function Btn({ children, onClick, disabled, variant = "primary", className = "" }) {
  const base = "h-10 rounded-xl px-3 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-black/90"
      : "bg-white ring-1 ring-black/10 hover:bg-black/5";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx(base, styles, className)}>
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-black/10 outline-none focus:ring-black/30"
    />
  );
}

function NumInput({ value, onChange, className = "" }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cx("h-10 w-24 rounded-xl bg-white px-3 text-sm ring-1 ring-black/10 outline-none focus:ring-black/30", className)}
    />
  );
}

/* ------------------------------ Page ------------------------------ */
export default function InventoryProductsPage() {
  const { products, loading, saving, error, fetchAllProducts, updateProduct, updateVariantStock } =
    useAdminProductStore();

  const LOW = 5;
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState(() => new Set());
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
    const all = Array.isArray(products) ? products : [];
    const query = s(q).trim().toLowerCase();

    return all
      .filter((p) => {
        if (!query) return true;
        const cat = pickCategory(p);
        const pub = publishStatus(p);
        const hay = [
          p?.productCode,
          p?.title,
          p?.slug,
          p?.sku,
          cat,
          pub.label,
          p?.publishAt,
          ...(Array.isArray(p?.tags) ? p.tags : []),
        ]
          .map((x) => s(x).toLowerCase())
          .join(" ");
        return hay.includes(query);
      })
      .filter((p) => {
        if (!lowOnly) return true;
        const vars = Array.isArray(p?.variants) ? p.variants : [];
        const isVar = s(p?.productType).toLowerCase() === "variable" || vars.length > 0;
        if (!isVar) return n(p?.stock) <= LOW;
        return vars.some((v) => n(v?.stock) <= LOW);
      });
  }, [products, q, lowOnly]);

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const setD = (key, val) => setDraft((p) => ({ ...p, [key]: val }));

  const saveSimple = async (pid, current) => {
    const key = pid;
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

  const saveVar = async (pid, vid, current) => {
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
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-black/5 bg-[#fafafa]/85 backdrop-blur">
        <div className="mx-auto px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight">Inventory · Products</div>
              <div className="mt-0.5 text-sm text-black/60">Search, filter, expand → update variant stock.</div>
            </div>

            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={() => setLowOnly((v) => !v)}>
                {lowOnly ? "Low stock: ON" : "Low stock: OFF"}
              </Btn>
              <Btn onClick={load} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Btn>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <TextInput
              value={q}
              onChange={setQ}
              placeholder="Search by code, name, category, sku, tags, publish status…"
            />
            <div className="flex items-center gap-2 md:justify-end">
              <Pill>{`Showing: ${list.length}`}</Pill>
              <Pill>{`Loaded: ${Array.isArray(products) ? products.length : 0}`}</Pill>
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

      {/* Content */}
      <div className="mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white ring-1 ring-black/5" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <div className="text-sm font-medium">No products found</div>
            <div className="mt-1 text-sm text-black/60">Try clearing filters or changing search.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((p) => {
              const id = s(p?._id);
              const vars = Array.isArray(p?.variants) ? p.variants : [];
              const isVar = s(p?.productType).toLowerCase() === "variable" || vars.length > 0;

              const stock = n(p?.stock);
              const low = isVar ? vars.some((v) => n(v?.stock) <= LOW) : stock <= LOW;

              const pub = publishStatus(p);
              const publishAt = fmt(p?.publishAt);

              return (
                <div key={id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                  {/* Product row */}
                  <div className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-black/5 ring-1 ring-black/5">
                          {thumb(p) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb(p)} alt={s(p?.title)} className="h-full w-full object-cover" loading="lazy" />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold">{s(p?.title) || "Untitled"}</div>
                            {low ? <Pill tone="warning">Low</Pill> : null}
                            <Pill tone={pub.tone}>{pub.label}</Pill>
                            <Pill>{isVar ? `Variants: ${vars.length}` : `Stock: ${stock}`}</Pill>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/60">
                            <span className="truncate">Code: {s(p?.productCode) || "—"}</span>
                            <span className="text-black/20">•</span>
                            <span className="truncate">Category: {pickCategory(p)}</span>
                            {publishAt ? (
                              <>
                                <span className="text-black/20">•</span>
                                <span className="truncate">PublishAt: {publishAt}</span>
                              </>
                            ) : null}
                            {p?.sku ? (
                              <>
                                <span className="text-black/20">•</span>
                                <span className="truncate">SKU: {s(p?.sku)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Btn variant="secondary" onClick={() => toggle(id)} className="min-w-[120px]">
                          {open.has(id) ? "Collapse" : "Expand"}
                        </Btn>

                        {!isVar ? (
                          <div className="flex items-center gap-2">
                            <NumInput value={draft[id] ?? String(stock)} onChange={(v) => setD(id, v)} />
                            <Btn
                              onClick={() => saveSimple(id, stock)}
                              disabled={saving || savingKey === id}
                              className="min-w-[90px]"
                            >
                              {savingKey === id ? "Saving…" : "Save"}
                            </Btn>
                          </div>
                        ) : (
                          <Pill>Update inside</Pill>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variants */}
                  {open.has(id) ? (
                    <div className="border-t border-black/5 bg-[#fbfbfb] p-4">
                      {!isVar ? (
                        <div className="text-sm text-black/60">This is a simple product (no variants).</div>
                      ) : vars.length === 0 ? (
                        <div className="text-sm text-black/60">No variants found.</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Variants</div>
                            <div className="text-xs text-black/50">Set stock to 0 for out-of-stock</div>
                          </div>

                          <div className="space-y-2">
                            {vars.map((v) => {
                              const vid = s(v?._id);
                              const key = `${id}:${vid}`;
                              const vStock = n(v?.stock);
                              const attrs = Array.isArray(v?.attributes) ? v.attributes : [];
                              const attrsText = attrs
                                .map((a) => `${s(a?.key).trim()}:${s(a?.value).trim()}`.replace(/^:|:$/g, ""))
                                .filter((t) => t && !t.includes("::") && !t.startsWith(":") && !t.endsWith(":"))
                                .join(" · ");

                              return (
                                <div
                                  key={key}
                                  className="grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5 md:grid-cols-[1fr_auto_auto]"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="truncate text-sm font-semibold">{s(v?.sku) || "—"}</div>
                                      {vStock <= LOW ? <Pill tone="warning">Low</Pill> : null}
                                      {vStock === 0 ? <Pill>OOS</Pill> : null}
                                      <Pill>{`Current: ${vStock}`}</Pill>
                                    </div>
                                    <div className="mt-1 truncate text-xs text-black/60">{attrsText || "—"}</div>
                                  </div>

                                  <div className="flex items-center gap-2 md:justify-end">
                                    <NumInput value={draft[key] ?? String(vStock)} onChange={(val) => setD(key, val)} />
                                    <Btn
                                      onClick={() => saveVar(id, vid, vStock)}
                                      disabled={saving || savingKey === key}
                                      className="min-w-[110px]"
                                    >
                                      {savingKey === key ? "Saving…" : "Save"}
                                    </Btn>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Hint */}
        {!loading && list.length > 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-4 text-xs text-black/60 ring-1 ring-black/5">
            If Category shows an id, backend likely sends only ObjectId. Fix by populating category fields or sending
            <span className="mx-1 font-semibold text-black/70">categoryName</span>.
          </div>
        ) : null}

        <div className="mt-4 text-xs text-black/45">
          Uses <span className="font-semibold text-black/60">useAdminProductStore</span> (fetchAllProducts, updateProduct, updateVariantStock)
        </div>
      </div>
    </div>
  );
}
