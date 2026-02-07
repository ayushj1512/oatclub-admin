// app/products/colors/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Loader2, CheckCircle2, XCircle, RefreshCcw, Filter } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const safe = (v) => String(v ?? "").trim();
const normColor = (c) => safe(c).toLowerCase();
const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
const normalizeColors = (input) => {
  const list = Array.isArray(input) ? input : safe(input).split(",");
  return uniq(list.map((c) => normColor(c)).filter(Boolean));
};

const BASIC_COLORS = [
  "black",
  "white",
  "red",
  "maroon",
  "pink",
  "hot pink",
  "peach",
  "orange",
  "yellow",
  "mustard",
  "green",
  "olive",
  "mint",
  "teal",
  "blue",
  "navy",
  "sky blue",
  "purple",
  "lavender",
  "brown",
  "beige",
  "cream",
  "grey",
  "silver",
  "gold",
];

const Badge = ({ tone = "gray", children }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${tones[tone] || tones.gray}`}>{children}</span>;
};

const Chip = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`px-2.5 py-1 text-xs rounded-full border transition ${active ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}>
    {children}
  </button>
);

export default function ProductColorsPage() {
  const { products, loading, saving, fetchProducts, updateProduct } = useAdminProductStore();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("no_colors"); // all | has_colors | no_colors
  const [draft, setDraft] = useState({}); // { [id]: "black, white" }
  const [savingId, setSavingId] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 60;

  const load = async (nextPage = 1) => {
    try {
      await fetchProducts({ page: String(nextPage), limit: String(limit), q: safe(q) });
      setPage(nextPage);
    } catch {}
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep draft in sync when products load
  useEffect(() => {
    const map = {};
    (products || []).forEach((p) => {
      map[p._id] = (p.colors || []).join(", ");
    });
    setDraft((prev) => ({ ...map, ...prev }));
  }, [products]);

  const filtered = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    if (filter === "has_colors") return list.filter((p) => Array.isArray(p.colors) && p.colors.length > 0);
    if (filter === "no_colors") return list.filter((p) => !Array.isArray(p.colors) || p.colors.length === 0);
    return list;
  }, [products, filter]);

  const addPreset = (id, color) => {
    const current = normalizeColors(draft[id] ?? "");
    const next = uniq([...current, normColor(color)]);
    setDraft((s) => ({ ...s, [id]: next.join(", ") }));
  };

  const removeColor = (id, color) => {
    const current = normalizeColors(draft[id] ?? "");
    const next = current.filter((c) => c !== normColor(color));
    setDraft((s) => ({ ...s, [id]: next.join(", ") }));
  };

  const saveOne = async (p) => {
    const id = p?._id;
    if (!id) return;

    const colors = normalizeColors(draft[id] ?? "");
    setSavingId(id);

    try {
      const updated = await updateProduct(id, { colors }); // ✅ your controller already normalizes too
      toast.success("Colors saved ✅");

      // keep draft clean
      setDraft((s) => ({ ...s, [id]: (updated?.colors || colors).join(", ") }));
    } catch (e) {
      toast.error(e?.message || "Failed to save colors");
    } finally {
      setSavingId(null);
    }
  };

  const clearOne = async (p) => {
    const id = p?._id;
    if (!id) return;
    setDraft((s) => ({ ...s, [id]: "" }));
    setSavingId(id);

    try {
      await updateProduct(id, { colors: [] });
      toast.success("Colors cleared ✅");
    } catch (e) {
      toast.error(e?.message || "Failed to clear colors");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">Product Colors</h1>
          <p className="text-sm text-gray-600">Add product-level colors quickly (no swatch images).</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title / code / etc..." className="w-[280px] pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-black/10" />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-2">
              <Chip active={filter === "no_colors"} onClick={() => setFilter("no_colors")}>No colors</Chip>
              <Chip active={filter === "has_colors"} onClick={() => setFilter("has_colors")}>Has colors</Chip>
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
            </div>
          </div>

          <button type="button" onClick={() => load(1)} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white hover:border-gray-300">
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => load(1)}
            className="px-3 py-2 text-sm rounded-xl bg-black text-white hover:bg-black/90"
          >
            Search
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Badge tone={filter === "no_colors" ? "red" : filter === "has_colors" ? "green" : "blue"}>
            {filter === "no_colors" ? "No colors" : filter === "has_colors" ? "Has colors" : "All"}
          </Badge>
          <span>{filtered.length} products</span>
          {loading && <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</span>}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50">
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {page}</span>
          <button type="button" onClick={() => load(page + 1)} disabled={loading} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50">
            Next
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-4 px-5 text-left font-semibold">Product</th>
                <th className="py-4 px-5 text-left font-semibold">Colors</th>
                <th className="py-4 px-5 text-left font-semibold">Quick add</th>
                <th className="py-4 px-5 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {(filtered || []).map((p) => {
                const id = p._id;
                const currentColors = normalizeColors(draft[id] ?? (p.colors || []).join(", "));
                const hasColors = currentColors.length > 0;
                const busy = saving || savingId === id;

                return (
                  <tr key={id} className="align-top">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 relative">
                          {p.thumbnail ? (
                            <Image src={p.thumbnail} alt={p.title || "Product"} fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate max-w-[420px]">{p.title || "-"}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge tone={hasColors ? "green" : "red"}>{hasColors ? "Has colors" : "No colors"}</Badge>
                            {p.productCode ? <span className="text-xs text-gray-500">#{p.productCode}</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="space-y-2">
                        <input
                          value={draft[id] ?? ""}
                          onChange={(e) => setDraft((s) => ({ ...s, [id]: e.target.value }))}
                          placeholder="e.g. black, white, red"
                          className="w-full max-w-[520px] px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/10"
                        />

                        <div className="flex flex-wrap gap-2">
                          {currentColors.length ? (
                            currentColors.map((c) => (
                              <button key={c} type="button" onClick={() => removeColor(id, c)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border border-gray-200 bg-white hover:border-gray-300">
                                <span className="capitalize">{c}</span>
                                <XCircle className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No colors set</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-2 max-w-[520px]">
                        {BASIC_COLORS.slice(0, 18).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => addPreset(id, c)}
                            className={`px-2.5 py-1 text-xs rounded-full border transition ${currentColors.includes(normColor(c)) ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">Tip: click chip to add. Click a selected color pill (left) to remove.</div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => clearOne(p)}
                          disabled={busy}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white hover:border-gray-300 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Clear
                        </button>

                        <button
                          type="button"
                          onClick={() => saveOne(p)}
                          disabled={busy}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && (!filtered || filtered.length === 0) ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
