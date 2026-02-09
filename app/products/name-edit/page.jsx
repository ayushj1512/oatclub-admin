"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Save, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const safe = (v) => String(v ?? "").trim();
const getFirstCategory = (p) => (Array.isArray(p?.categories) && p.categories.length ? safe(p.categories[0]) || "—" : "—");
const getThumb = (p) => safe(p?.thumbnail) || (Array.isArray(p?.images) ? safe(p.images[0]) : "") || "";
const Chip = ({ children }) => <span className="inline-flex items-center rounded-full bg-zinc-900/70 px-2.5 py-1 text-xs text-zinc-100 ring-1 ring-white/10">{children}</span>;

export default function ProductNameEditPage() {
  const { products, loading, saving, page, pages, total, fetchProducts, updateProduct } = useAdminProductStore();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState({});
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const limit = 30;

  const params = useMemo(() => {
    const p = { page: String(page || 1), limit: String(limit) };
    if (safe(q)) p.q = safe(q);
    return p;
  }, [q, page]);

  useEffect(() => { fetchProducts(params); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [params]);

  const markDirty = (id) => setDirtyIds((prev) => new Set(prev).add(id));
  const unmarkDirty = (id) => setDirtyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });

  const onChangeTitle = (id, val) => { setDraft((s) => ({ ...s, [id]: safe(val) })); markDirty(id); };
  const resetRow = (id) => { setDraft((s) => { const n = { ...s }; delete n[id]; return n; }); unmarkDirty(id); };

  const refresh = async () => { await fetchProducts(params); toast.success("Refreshed ✅"); };

  const saveOne = async (p) => {
    const id = p?._id; if (!id) return;
    const nextTitle = safe(draft[id] ?? ""); if (!nextTitle) return toast.error("Title is required");
    if (nextTitle === safe(p?.title)) return resetRow(id);
    await updateProduct(id, { title: nextTitle });
    resetRow(id);
  };

  const saveAll = async () => {
    const ids = Array.from(dirtyIds);
    if (!ids.length) return toast.error("No changes to save");
    let ok = 0;
    for (const id of ids) {
      const p = (products || []).find((x) => x?._id === id); if (!p) continue;
      const nextTitle = safe(draft[id] ?? ""); if (!nextTitle) continue;
      if (nextTitle === safe(p?.title)) { resetRow(id); continue; }
      try { await updateProduct(id, { title: nextTitle }); ok += 1; resetRow(id); } catch {}
    }
    toast.success(`Saved ${ok} product(s) ✅`);
    await fetchProducts(params);
  };

  const goPage = async (nextPage) => {
    const n = Math.max(1, Math.min(Number(nextPage || 1), Number(pages || 1)));
    await fetchProducts({ ...params, page: String(n) });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="h-1 w-full bg-gradient-to-r from-zinc-950 via-zinc-500 to-emerald-500" />

      {/* ✅ removed max width */}
      <div className="mx-auto w-full px-4 py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Product Name Edit</h1>
            <p className="text-sm text-zinc-500">Edit titles quickly. (Slug should update server-side.)</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title / category…" className="w-full rounded-xl border border-zinc-200 bg-white px-10 py-2 text-sm outline-none transition focus:border-zinc-300 focus:ring-4 focus:ring-emerald-200" />
            </div>

            <button onClick={refresh} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>

            <button onClick={saveAll} disabled={saving || dirtyIds.size === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" /> Save All {dirtyIds.size > 0 ? <span className="ml-1 opacity-80">({dirtyIds.size})</span> : null}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <div className="col-span-3 sm:col-span-2">Image</div>
            <div className="col-span-3 sm:col-span-2">Category</div>
            <div className="col-span-6 sm:col-span-8">Title</div>
          </div>

          <div className="divide-y divide-zinc-200">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">Loading…</div>
            ) : (products || []).length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">No products found</div>
            ) : (
              (products || []).map((p) => {
                const id = p?._id;
                const thumb = getThumb(p);
                const category = getFirstCategory(p);
                const currentTitle = safe(p?.title);
                const value = draft[id] ?? currentTitle;
                const isDirty = dirtyIds.has(id) && safe(value) !== currentTitle;

                return (
                  <div key={id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
                    {/* ✅ bigger image */}
                    <div className="col-span-3 sm:col-span-2">
                      <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200">
                        {thumb ? <Image src={thumb} alt={currentTitle || "product"} fill sizes="80px" className="object-cover" /> : null}
                      </div>
                    </div>

                    <div className="col-span-3 sm:col-span-2"><Chip>{category}</Chip></div>

                    <div className="col-span-6 sm:col-span-8">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input value={value} onChange={(e) => onChangeTitle(id, e.target.value)} className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition bg-white focus:ring-4 ${isDirty ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200" : "border-zinc-200 focus:border-zinc-300 focus:ring-zinc-200"}`} />
                        <div className="flex gap-2">
                          <button onClick={() => saveOne(p)} disabled={saving || !isDirty} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">Save</button>
                          <button onClick={() => resetRow(id)} disabled={saving || !dirtyIds.has(id)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60">Reset</button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{isDirty ? "Unsaved change" : " "}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500">Total: <span className="font-medium text-zinc-800">{total || 0}</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => goPage((page || 1) - 1)} disabled={(page || 1) <= 1 || loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"><ChevronLeft className="h-4 w-4" /> Prev</button>
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">Page <span className="font-medium">{page || 1}</span> / <span className="font-medium">{pages || 1}</span></div>
            <button onClick={() => goPage((page || 1) + 1)} disabled={(page || 1) >= (pages || 1) || loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">Note:</span> If you want slug to auto-update when title changes, implement it in backend so admin UI only sends <span className="font-mono text-zinc-800">{"{ title }"}</span>.
        </div>
      </div>
    </div>
  );
}
