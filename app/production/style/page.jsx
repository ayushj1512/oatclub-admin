"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useFabricStore } from "@/store/fabricStore";

/* ---------------- Helpers ---------------- */
const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();

const fabricCode = (f) => t(f?.code || f?.fabricCode || "");
const fabricName = (f) => t(f?.name || "");
const fabricLabel = (f) => {
  const n = fabricName(f);
  const c = fabricCode(f);
  if (n && c) return `${n} (${c})`;
  return n || c || "—";
};

const initAvg = (p) => {
  const a = p?.avgFabricConsumption;
  if (a && typeof a === "object") {
    return {
      value: Number(a.value ?? 0),
      unit: a.unit === "gram" || a.unit === "meter" ? a.unit : "meter",
    };
  }
  return { value: 0, unit: "meter" };
};

const initFabrics = (p) => {
  const rows = safeArr(p?.fabrics).map((x) => ({
    fabricCode: t(x?.fabricCode || x?.fabric?.code || x?.fabric || ""),
  }));
  return rows.length ? rows : [{ fabricCode: "" }];
};

const uniqNonEmpty = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const v = t(x);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
};

/* ---------------- Component ---------------- */
export default function ProductionStylesPage() {
  const { products, loading, saving, fetchProducts, updateProduct } =
    useAdminProductStore();

  const {
    fabrics: fabricList,
    loading: fabricLoading,
    error: fabricError,
    fetchFabrics,
  } = useFabricStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [imgIdx, setImgIdx] = useState({});
  const [edits, setEdits] = useState({});
  const [expanded, setExpanded] = useState({});
  const [fabricSearchById, setFabricSearchById] = useState({});

  useEffect(() => {
    fetchProducts({ page: 1, limit: 50 });
    fetchFabrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fabricByCode = useMemo(() => {
    const m = new Map();
    safeArr(fabricList).forEach((f) => {
      const c = fabricCode(f);
      if (c) m.set(c, f);
    });
    return m;
  }, [fabricList]);

  const fabricOptionsAll = useMemo(() => {
    const opts = safeArr(fabricList)
      .map((f) => ({ code: fabricCode(f), label: fabricLabel(f) }))
      .filter((x) => x.code)
      .sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [fabricList]);

  const filtered = useMemo(() => {
    const s = t(search).toLowerCase();
    const c = t(category).toLowerCase();
    return safeArr(products).filter((p) => {
      const matchSearch =
        !s ||
        str(p?.title).toLowerCase().includes(s) ||
        str(p?.slug).toLowerCase().includes(s) ||
        str(p?.patternNumber).toLowerCase().includes(s);

      const cats = safeArr(p?.categories).map((x) => str(x).toLowerCase());
      const matchCat = !c || cats.some((x) => x.includes(c));

      return matchSearch && matchCat;
    });
  }, [products, search, category]);

  const ensureRow = (p) => {
    const id = p?._id;
    if (!id) return null;
    if (edits[id]) return edits[id];

    const next = {
      patternNumber: t(p?.patternNumber),
      avg: initAvg(p),
      fabrics: initFabrics(p),
    };
    setEdits((prev) => ({ ...prev, [id]: next }));
    return next;
  };

  const patchRow = (id, patch) =>
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const patchFabric = (id, index, patch) =>
    setEdits((prev) => {
      const cur = prev[id] || {};
      const fabrics = safeArr(cur.fabrics).slice();
      fabrics[index] = { ...(fabrics[index] || {}), ...patch };
      return { ...prev, [id]: { ...cur, fabrics } };
    });

  const addFabric = (id) =>
    setEdits((prev) => {
      const cur = prev[id] || {};
      const fabrics = safeArr(cur.fabrics).slice();
      fabrics.push({ fabricCode: "" });
      return { ...prev, [id]: { ...cur, fabrics } };
    });

  const removeFabric = (id, index) =>
    setEdits((prev) => {
      const cur = prev[id] || {};
      const fabrics = safeArr(cur.fabrics).slice();
      fabrics.splice(index, 1);
      return {
        ...prev,
        [id]: {
          ...cur,
          fabrics: fabrics.length ? fabrics : [{ fabricCode: "" }],
        },
      };
    });

  const toggleExpand = (id) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const img = (p) => {
    const id = p?._id;
    const images = [
      ...safeArr(p?.images).filter(Boolean),
      ...(p?.thumbnail ? [p.thumbnail] : []),
    ];
    const uniq = [...new Set(images)];
    const idx = Math.max(0, Math.min(imgIdx[id] ?? 0, uniq.length - 1));
    return { images: uniq, idx, url: uniq[idx] || "" };
  };

  const prevImg = (p) => {
    const id = p?._id;
    const { images } = img(p);
    if (!id || !images.length) return;
    setImgIdx((m) => ({
      ...m,
      [id]:
        (m[id] ?? 0) - 1 < 0 ? images.length - 1 : (m[id] ?? 0) - 1,
    }));
  };

  const nextImg = (p) => {
    const id = p?._id;
    const { images } = img(p);
    if (!id || !images.length) return;
    setImgIdx((m) => ({
      ...m,
      [id]:
        (m[id] ?? 0) + 1 >= images.length ? 0 : (m[id] ?? 0) + 1,
    }));
  };

  const validate = (row) => {
    const v = Number(row?.avg?.value ?? 0);
    if (Number.isNaN(v) || v < 0) return "Avg must be a number ≥ 0";

    const codes = uniqNonEmpty(safeArr(row?.fabrics).map((x) => x?.fabricCode));
    for (const c of codes) {
      if (!fabricByCode.has(c)) return `Fabric not found for code: ${c}`;
    }
    return null;
  };

  const fabricOptionsFor = (productId) => {
    const q = t(fabricSearchById[productId]).toLowerCase();
    if (!q) return fabricOptionsAll.slice(0, 120);
    return fabricOptionsAll
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q)
      )
      .slice(0, 120);
  };

  const fabricSummary = (p) => {
    const codes = safeArr(p?.fabrics)
      .map((f) => t(f?.fabricCode || f?.fabric?.code || f?.fabric))
      .filter(Boolean);

    if (!codes.length) return "—";

    const pretty = codes.slice(0, 3).map((code) => {
      const f = fabricByCode.get(code);
      return f ? `${fabricName(f)} (${code})` : code;
    });

    return pretty.join(", ") + (codes.length > 3 ? "…" : "");
  };

  const saveRow = async (p) => {
    const id = p?._id;
    if (!id) return;

    const row = edits[id] || ensureRow(p);
    const err = validate(row);
    if (err) return toast.error(err);

    const codes = uniqNonEmpty(safeArr(row?.fabrics).map((x) => x?.fabricCode));

    const payload = {
      patternNumber: t(row?.patternNumber),
      avgFabricConsumption: {
        value: Number(row?.avg?.value ?? 0),
        unit: row?.avg?.unit === "gram" ? "gram" : "meter",
      },
      fabrics: codes.map((fabricCode) => ({ fabricCode })),
    };

    try {
      await updateProduct(id, payload);
      toast.success("Saved ✅");

      // ✅ close after save
      setExpanded((m) => ({ ...m, [id]: false }));
      setFabricSearchById((m) => ({ ...m, [id]: "" }));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/10">
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="min-w-[220px]">
            <div className="text-lg font-semibold tracking-tight">
              Production / Styles
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              {fabricLoading
                ? "Loading fabrics…"
                : fabricError
                ? `Fabric error: ${fabricError}`
                : `${fabricOptionsAll.length} fabrics loaded`}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full md:w-72"
              placeholder="Search name / slug / pattern…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full md:w-56"
              placeholder="Category…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <button
              className="px-3 py-2 bg-black text-white hover:bg-black/90 disabled:opacity-50"
              onClick={() => {
                fetchProducts({ page: 1, limit: 50 });
                fetchFabrics();
              }}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 md:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[1150px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10">
                <th className="p-3 w-[310px] font-semibold">Name</th>
                <th className="p-3 w-[210px] font-semibold">Image</th>
                <th className="p-3 w-[220px] font-semibold">Category</th>
                <th className="p-3 w-[190px] font-semibold">Pattern</th>
                <th className="p-3 w-[260px] font-semibold">Avg + Fabrics</th>
                <th className="p-3 w-[130px] font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td className="p-6 text-gray-600" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-6 text-gray-600" colSpan={6}>
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const id = p?._id;
                  const row = ensureRow(p);
                  const { url, images, idx } = img(p);

                  return (
                    <React.Fragment key={id}>
                      <tr className="align-top hover:bg-gray-50">
                        {/* Name */}
                        <td className="p-3">
                          <div className="font-medium">{p?.title}</div>
                          <div className="text-xs text-gray-500">{p?.slug}</div>
                        </td>

                        {/* Image */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 border border-black/10 disabled:opacity-50"
                              onClick={() => prevImg(p)}
                              disabled={!images.length}
                              aria-label="Previous image"
                              title="Previous image"
                            >
                              ←
                            </button>

                            <div className="w-[132px] h-[84px] bg-gray-50 border border-black/10 overflow-hidden flex items-center justify-center">
                              {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt={p?.title || "product"}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-xs text-gray-500">
                                  No image
                                </span>
                              )}
                            </div>

                            <button
                              className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 border border-black/10 disabled:opacity-50"
                              onClick={() => nextImg(p)}
                              disabled={!images.length}
                              aria-label="Next image"
                              title="Next image"
                            >
                              →
                            </button>
                          </div>

                          {!!images.length && (
                            <div className="text-xs text-gray-500 mt-1">
                              {idx + 1}/{images.length}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {safeArr(p?.categories).length ? (
                              safeArr(p.categories)
                                .slice(0, 4)
                                .map((c, i) => (
                                  <span
                                    key={`${id}-cat-${i}`}
                                    className="px-2 py-1 text-xs bg-gray-50 text-black border border-black/10"
                                  >
                                    {str(c)}
                                  </span>
                                ))
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Pattern */}
                        <td className="p-3">
                          <input
                            className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full"
                            placeholder="Pattern number"
                            value={row?.patternNumber ?? ""}
                            onChange={(e) =>
                              patchRow(id, { patternNumber: e.target.value })
                            }
                          />
                        </td>

                        {/* Avg + Fabrics */}
                        <td className="p-3">
                          <div className="flex gap-2">
                            <input
                              className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-[120px]"
                              type="number"
                              min="0"
                              step="0.01"
                              value={row?.avg?.value ?? 0}
                              onChange={(e) =>
                                patchRow(id, {
                                  avg: {
                                    ...(row.avg || {}),
                                    value: e.target.value,
                                  },
                                })
                              }
                            />

                            <select
                              className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-[110px]"
                              value={row?.avg?.unit ?? "meter"}
                              onChange={(e) =>
                                patchRow(id, {
                                  avg: {
                                    ...(row.avg || {}),
                                    unit: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="meter">meter</option>
                              <option value="gram">gram</option>
                            </select>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="text-xs text-gray-700 hover:text-black underline underline-offset-4"
                              onClick={() => toggleExpand(id)}
                            >
                              {expanded[id] ? "Hide fabrics" : "Assign fabrics"}
                            </button>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600">
                              {fabricSummary(p)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3">
                          <button
                            className="px-3 py-2 bg-black text-white hover:bg-black/90 w-full disabled:opacity-50"
                            onClick={() => saveRow(p)}
                            disabled={saving}
                          >
                            Save
                          </button>
                        </td>
                      </tr>

                      {/* Expand */}
                      {expanded[id] && (
                        <tr className="bg-gray-50">
                          <td className="p-3" colSpan={6}>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3">
                              <div className="font-medium flex-1">
                                Fabrics — {p?.title}
                              </div>

                              <input
                                className="px-3 py-2 bg-white border border-black/10 focus:border-black outline-none w-full md:w-72"
                                placeholder="Search fabric by name/code…"
                                value={fabricSearchById[id] || ""}
                                onChange={(e) =>
                                  setFabricSearchById((m) => ({
                                    ...m,
                                    [id]: e.target.value,
                                  }))
                                }
                              />

                              <button
                                className="px-3 py-2 bg-white border border-black/10 hover:bg-gray-100"
                                onClick={() => addFabric(id)}
                              >
                                + Add
                              </button>
                            </div>

                            <div className="grid gap-2">
                              {safeArr(row?.fabrics).map((f, i) => {
                                const code = t(f?.fabricCode);
                                const options = fabricOptionsFor(id);

                                return (
                                  <div
                                    key={`${id}-fab-${i}`}
                                    className="flex flex-col md:flex-row md:items-center gap-2 bg-white border border-black/10 p-2"
                                  >
                                    <select
                                      className="px-3 py-2 bg-gray-50 border border-black/10 focus:border-black outline-none w-full md:flex-1"
                                      value={code}
                                      onChange={(e) =>
                                        patchFabric(id, i, {
                                          fabricCode: e.target.value,
                                        })
                                      }
                                      disabled={fabricLoading}
                                    >
                                      <option value="">
                                        {fabricLoading
                                          ? "Loading fabrics..."
                                          : "Select fabric"}
                                      </option>
                                      {options.map((opt) => (
                                        <option key={opt.code} value={opt.code}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      className="px-3 py-2 bg-white border border-black/10 hover:bg-gray-100 w-full md:w-auto"
                                      onClick={() => removeFabric(id, i)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="text-xs text-gray-600 mt-2">
                              Avg consumption is saved from top. Multiple fabrics
                              allowed. Duplicates auto-removed on save.
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
