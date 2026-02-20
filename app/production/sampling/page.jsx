// app/production/sampling/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  Search,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

const s = (v) => String(v ?? "");
const lower = (v) => s(v).trim().toLowerCase();
const safeArr = (v) => (Array.isArray(v) ? v : []);
const getImage = (p) => p?.thumbnail || safeArr(p?.images)[0] || "";

/** ✅ Build frontend product URL from slug (works even if env not set) */
const FRONTEND_BASE = s(process.env.NEXT_PUBLIC_FRONTEND_URL || "")
  .trim()
  .replace(/\/+$/, "");

const productUrlFromSlug = (slug) => {
  const sl = s(slug).trim().replace(/^\/+/, "");
  if (!sl) return "";
  return FRONTEND_BASE ? `${FRONTEND_BASE}/products/${sl}` : `/products/${sl}`;
};

/** ✅ Determine original link status + url */
const getOriginalLinkMeta = (p) => {
  const raw = s(p?.originalProductLink).trim();
  if (!raw) return { missing: true, url: "", raw: "" };

  // if URL, use it
  if (/^https?:\/\//i.test(raw)) return { missing: false, url: raw, raw };

  // else treat as slug/code -> open as product slug path
  return { missing: false, url: productUrlFromSlug(raw), raw };
};

const cx = (...a) => a.filter(Boolean).join(" ");

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function SamplingPage() {
  const {
    products,
    loading,
    saving,
    fetchAllProducts,
    updateSamplingStatus,
    markPatternReady,
  } = useAdminProductStore();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | pattern-pending | pattern-done | sampling-pending | sampling-done

  useEffect(() => {
    fetchAllProducts({});
  }, [fetchAllProducts]);

  const totals = useMemo(() => {
    const all = safeArr(products);

    const patternDone = all.filter((p) => !!p?.isPatternReady).length;
    const patternPending = all.length - patternDone;

    const samplingDone = all.filter((p) => !!p?.isSamplingDone).length;
    const samplingPending = all.length - samplingDone;

    return {
      total: all.length,
      patternDone,
      patternPending,
      samplingDone,
      samplingPending,
    };
  }, [products]);

  const list = useMemo(() => {
    const query = lower(q);
    let out = safeArr(products);

    if (query) {
      out = out.filter((p) => {
        const title = lower(p?.title);
        const code = lower(p?.productCode);
        const slug = lower(p?.slug);
        const orig = lower(p?.originalProductLink);
        return (
          title.includes(query) ||
          code.includes(query) ||
          slug.includes(query) ||
          orig.includes(query)
        );
      });
    }

    if (filter === "pattern-pending") out = out.filter((p) => !p?.isPatternReady);
    if (filter === "pattern-done") out = out.filter((p) => !!p?.isPatternReady);

    if (filter === "sampling-pending") out = out.filter((p) => !p?.isSamplingDone);
    if (filter === "sampling-done") out = out.filter((p) => !!p?.isSamplingDone);

    return out
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }, [products, q, filter]);

  const onPatternReady = async (p) => {
    if (!p?._id) return;
    if (p?.isPatternReady) return;
    await markPatternReady(p._id);
  };

  const onSamplingToggle = async (p) => {
    if (!p?._id) return;

    if (!p?.isPatternReady) {
      alert("First mark Pattern Ready, then you can mark Sampling Done.");
      return;
    }

    const next = !Boolean(p?.isSamplingDone);
    await updateSamplingStatus(p._id, next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto  p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-gray-900">
              Production • Pattern → Sampling
            </h1>
            <p className="text-sm text-gray-500">
              Step 1: Pattern Ready • Step 2: Sampling Done
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={cx(chipBase, "bg-white text-gray-700 ring-gray-200")}>
                Total: {totals.total}
              </span>

              <span className={cx(chipBase, "bg-indigo-50 text-indigo-700 ring-indigo-200")}>
                Pattern • Done: {totals.patternDone}
              </span>
              <span className={cx(chipBase, "bg-amber-50 text-amber-800 ring-amber-200")}>
                Pattern • Pending: {totals.patternPending}
              </span>

              <span className={cx(chipBase, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                Sampling • Done: {totals.samplingDone}
              </span>
              <span className={cx(chipBase, "bg-yellow-50 text-yellow-800 ring-yellow-200")}>
                Sampling • Pending: {totals.samplingPending}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[420px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-2xl bg-white pl-9 pr-3 py-2.5 text-sm outline-none ring-1 ring-gray-200 shadow-sm focus:ring-2 focus:ring-black/10"
                placeholder="Search title / code / slug / original link…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              className="rounded-2xl bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-gray-200 shadow-sm focus:ring-2 focus:ring-black/10"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pattern-pending">Pattern Pending</option>
              <option value="pattern-done">Pattern Done</option>
              <option value="sampling-pending">Sampling Pending</option>
              <option value="sampling-done">Sampling Done</option>
            </select>

            <button
              className={cx(
                btnBase,
                "bg-black text-white shadow-sm hover:opacity-90 active:opacity-80"
              )}
              onClick={() => fetchAllProducts({})}
              disabled={loading}
              title="Refresh list"
            >
              <RefreshCw className={cx("h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>
        </div>

        {/* List */}
        <div className="mt-5">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-gray-600 ring-1 ring-gray-200 shadow-sm">
              Loading...
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-gray-600 ring-1 ring-gray-200 shadow-sm">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {list.map((p) => {
                const img = getImage(p);
                const patternReady = !!p?.isPatternReady;
                const samplingDone = !!p?.isSamplingDone;

                const orig = getOriginalLinkMeta(p);

                return (
                  <div
                    key={p._id}
                    className="group rounded-3xl bg-white p-3 md:p-4 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition"
                  >
                    <div className="flex gap-3 md:gap-4">
                      {/* Image */}
                      <div className="h-24 w-24 md:h-28 md:w-28 shrink-0 rounded-2xl bg-gray-50 ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={p?.title || "product"}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm text-gray-500">
                                Code:{" "}
                                <span className="font-semibold text-gray-800">
                                  {p?.productCode || "-"}
                                </span>
                              </div>

                              {p?.slug ? (
                                <span className={cx(chipBase, "bg-gray-50 text-gray-600 ring-gray-200")}>
                                  /{p.slug}
                                </span>
                              ) : (
                                <span className={cx(chipBase, "bg-gray-50 text-gray-400 ring-gray-200")}>
                                  No slug
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-base font-semibold text-gray-900 truncate">
                              {p?.title || "-"}
                            </div>

                            {/* ✅ ONLY Original Product Link */}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              {!orig.missing ? (
                                <a
                                  href={orig.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cx(
                                    chipBase,
                                    "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                                  )}
                                  title="Open original product link"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                  Original Product Link
                                </a>
                              ) : (
                                <span
                                  className={cx(
                                    chipBase,
                                    "bg-rose-50 text-rose-700 ring-rose-200"
                                  )}
                                  title="Please add originalProductLink in product"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Original link missing
                                </span>
                              )}

                              {/* raw value pill */}
                              {orig.raw ? (
                                <span
                                  className={cx(
                                    chipBase,
                                    "bg-gray-50 text-gray-500 ring-gray-200 max-w-[520px] truncate"
                                  )}
                                  title={orig.raw}
                                >
                                  {orig.raw}
                                </span>
                              ) : null}
                            </div>

                            {/* Meta */}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-200">
                                Type: {p?.productType || "-"}
                              </span>
                              {safeArr(p?.categories).length ? (
                                <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-200">
                                  Category: {String(p.categories[0] || "").toLowerCase()}
                                </span>
                              ) : null}
                            </div>

                            {!patternReady ? (
                              <div className="mt-2 text-xs text-amber-700">
                                Sampling locked until Pattern Ready.
                              </div>
                            ) : null}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            {/* Pattern badge */}
                            <span
                              className={cx(
                                chipBase,
                                patternReady
                                  ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                                  : "bg-amber-50 text-amber-800 ring-amber-200"
                              )}
                              title="Step 1"
                            >
                              {patternReady ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Circle className="h-3.5 w-3.5" />
                              )}
                              {patternReady ? "Pattern Ready" : "Pattern Pending"}
                            </span>

                            <button
                              className={cx(
                                btnBase,
                                patternReady
                                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  : "bg-black text-white hover:opacity-90 active:opacity-80"
                              )}
                              onClick={() => onPatternReady(p)}
                              disabled={saving || patternReady}
                              title={patternReady ? "Already pattern ready" : "Mark pattern ready"}
                            >
                              {patternReady ? "Done" : saving ? "..." : "Mark"}
                            </button>

                            {/* Sampling badge */}
                            <span
                              className={cx(
                                chipBase,
                                samplingDone
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : "bg-yellow-50 text-yellow-800 ring-yellow-200"
                              )}
                              title="Step 2"
                            >
                              {samplingDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Circle className="h-3.5 w-3.5" />
                              )}
                              {samplingDone ? "Sampling Done" : "Sampling Pending"}
                            </span>

                            <button
                              className={cx(
                                btnBase,
                                samplingDone
                                  ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                  : "bg-black text-white hover:opacity-90 active:opacity-80"
                              )}
                              onClick={() => onSamplingToggle(p)}
                              disabled={saving || !patternReady}
                              title={
                                !patternReady
                                  ? "First mark Pattern Ready"
                                  : samplingDone
                                  ? "Undo sampling"
                                  : "Mark sampling done"
                              }
                            >
                              {saving ? "..." : samplingDone ? "Undo" : "Done"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">
            Showing: <span className="font-semibold text-gray-700">{list.length}</span>{" "}
            (Total: <span className="font-semibold text-gray-700">{totals.total}</span>)
          </div>
        </div>
      </div>
    </div>
  );
}