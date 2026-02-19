// app/products/bestseller/page.jsx
// ✅ Minimal + Compact Bestsellers Manager (Tailwind only)
// ✅ UPDATED (reorder + auth + canonical refresh):
// - All API calls include credentials (cookie sessions)
// - Safer JSON parsing (handles empty responses)
// - Save order hits /bestseller/order reliably
// - After save, refresh ids from server so order always matches DB
// - Drag & drop more reliable (dataTransfer set)

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
const API = BASE ? `${BASE}/api/bestseller` : "/api/bestseller";
const PRODUCT_API = BASE ? `${BASE}/api/products` : "/api/products";

const uniq = (a) => Array.from(new Set((a || []).map(String).filter(Boolean)));
const idOf = (p) => String(p?._id || "");
const nameOf = (p) => String(p?.title || p?.name || "Untitled");
const codeOf = (p) =>
  String(p?.productCode || p?.code || p?.sku || p?.patternNumber || "").trim();
const imgOf = (p) =>
  p?.images?.[0] ||
  p?.image ||
  p?.thumbnail ||
  p?.featuredImage ||
  p?.media?.[0]?.url ||
  "";

const moveItem = (arr, from, to) => {
  const a = [...arr];
  if (from < 0 || to < 0 || from >= a.length || to >= a.length) return a;
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
};

// fetch helper (cookie auth + no-store)
const f = (url, init = {}) =>
  fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

const safeJson = async (res) => {
  const text = await res.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

export default function BestsellerManagerPage() {
  const { products, loading, fetchAllProducts, toggleBestSeller } = useAdminProductStore();

  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [serverIds, setServerIds] = useState([]);
  const [draftIds, setDraftIds] = useState([]);

  const serverSet = useMemo(() => new Set(serverIds), [serverIds]);
  const draftSet = useMemo(() => new Set(draftIds), [draftIds]);

  const productMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(products) ? products : []).forEach((p) => {
      const id = idOf(p);
      if (id) m.set(id, p);
    });
    return m;
  }, [products]);

  // ✅ update Product.isBestSeller
  const syncProductBestSeller = useCallback(
    async (productId, value) => {
      const id = String(productId || "").trim();
      if (!id) return;

      // Prefer store action if present
      if (typeof toggleBestSeller === "function") {
        await toggleBestSeller(id, !!value);
        return;
      }

      // fallback direct API
      const res = await f(`${PRODUCT_API}/${id}/best-seller`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBestSeller: !!value }),
      });
      await safeJson(res);
    },
    [toggleBestSeller]
  );

  const fetchServerIds = useCallback(async () => {
    const res = await f(`${API}/ids`);
    const data = await safeJson(res);
    return uniq(Array.isArray(data) ? data : Array.isArray(data?.ids) ? data.ids : []);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await fetchAllProducts?.({});
      const ids = await fetchServerIds();
      setServerIds(ids);
      setDraftIds(ids);
    } catch (e) {
      toast.error(e?.message || "Failed to load");
    }
  }, [fetchAllProducts, fetchServerIds]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggle = (id) => {
    const pid = String(id);
    setDraftIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  const { toAdd, toRemove, orderChanged, hasChanges } = useMemo(() => {
    const add = [];
    const remove = [];

    for (const id of draftSet) if (!serverSet.has(id)) add.push(id);
    for (const id of serverSet) if (!draftSet.has(id)) remove.push(id);

    // order change (only compare common ids)
    const commonS = serverIds.filter((x) => draftSet.has(x));
    const commonD = draftIds.filter((x) => serverSet.has(x));
    const ord = JSON.stringify(commonS) !== JSON.stringify(commonD);

    return {
      toAdd: add,
      toRemove: remove,
      orderChanged: ord,
      hasChanges: add.length || remove.length || ord,
    };
  }, [serverIds, draftIds, serverSet, draftSet]);

  // ✅ Persist order (backend expects PUT/POST /bestseller/order with { ids: [] })
  const saveOrder = async (ids) => {
    const ordered = uniq(ids);
    const endpoints = [`${API}/order`]; // ✅ your backend route
    const methods = ["PUT", "POST", "PATCH"];
    const payloads = [
      { ids: ordered }, // ✅ correct
      { productIds: ordered },
      { bestsellerIds: ordered },
      { order: ordered.map((productId, index) => ({ productId, index })) },
    ];

    let lastErr = null;

    for (const url of endpoints) {
      for (const method of methods) {
        for (const payload of payloads) {
          try {
            const res = await f(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            await safeJson(res);
            return;
          } catch (e) {
            lastErr = e;
          }
        }
      }
    }

    throw lastErr || new Error("Order save failed");
  };

  const onSave = async () => {
    try {
      if (!hasChanges) return toast("No changes");
      setSaving(true);

      // ✅ ADD + sync product flag = true
      for (const productId of toAdd) {
        const res = await f(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        await safeJson(res);
        await syncProductBestSeller(productId, true);
      }

      // ✅ REMOVE + sync product flag = false
      for (const productId of toRemove) {
        const res = await f(`${API}/product/${productId}`, { method: "DELETE" });
        await safeJson(res);
        await syncProductBestSeller(productId, false);
      }

      // ✅ ORDER
      if (draftIds.length) await saveOrder(draftIds);

      // ✅ Canonical refresh from DB (don’t assume)
      const fresh = await fetchServerIds();
      setServerIds(fresh);
      setDraftIds(fresh);

      toast.success("Saved");
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Sync button: force-fix product flags based on current bestseller ids
  const onSync = async () => {
    try {
      setSyncing(true);

      const ids = await fetchServerIds();
      const setIds = new Set(ids);

      if (!Array.isArray(products) || products.length === 0) {
        await fetchAllProducts?.({});
      }

      const all = Array.isArray(products) ? products : [];
      if (!all.length) {
        toast.error("No products loaded");
        return;
      }

      let fixed = 0;
      for (const p of all) {
        const pid = idOf(p);
        if (!pid) continue;

        const shouldBe = setIds.has(pid);
        const isNow = !!p?.isBestSeller;

        if (shouldBe !== isNow) {
          await syncProductBestSeller(pid, shouldBe);
          fixed += 1;
        }
      }

      setServerIds(ids);
      setDraftIds(ids);

      toast.success(fixed ? `Synced ✅ (${fixed} fixed)` : "Already synced ✅");
    } catch (e) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const onReset = () => setDraftIds(serverIds);

  const list = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    const arr = Array.isArray(products) ? products : [];

    const filtered = !term
      ? arr
      : arr.filter((p) => {
          const n = nameOf(p).toLowerCase();
          const c = codeOf(p).toLowerCase();
          return n.includes(term) || c.includes(term);
        });

    // stable: server-selected on top only
    return [...filtered].sort((a, b) => {
      const A = serverSet.has(idOf(a));
      const B = serverSet.has(idOf(b));
      if (A === B) return 0;
      return A ? -1 : 1;
    });
  }, [products, q, serverSet]);

  const selected = useMemo(
    () => draftIds.map((id) => productMap.get(id)).filter(Boolean),
    [draftIds, productMap]
  );

  // ✅ drag reorder (selected) - more reliable
  const dragFrom = useRef(null);

  const onDragStart = (e, idx) => {
    dragFrom.current = idx;
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {}
  };

  const onDrop = (e, idx) => {
    e.preventDefault();

    let from = dragFrom.current;
    try {
      const raw = e.dataTransfer.getData("text/plain");
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) from = parsed;
    } catch {}

    dragFrom.current = null;
    if (from == null || from === idx) return;

    setDraftIds((prev) => moveItem(prev, from, idx));
  };

  const up = (i) => i > 0 && setDraftIds((p) => moveItem(p, i, i - 1));
  const down = (i) => i < draftIds.length - 1 && setDraftIds((p) => moveItem(p, i, i + 1));

  return (
    <div className="w-full bg-white text-zinc-900">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 px-3 py-3">
          <div className="mr-auto">
            <div className="text-sm font-black">Bestsellers</div>
            <div className="text-[11px] font-semibold text-zinc-500">
              Select + order • Save once • Syncs to products
            </div>
          </div>

          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 px-3 py-2">
            <span className="text-xs font-black text-zinc-400">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / code"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-400"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="rounded-lg px-2 py-1 text-xs font-black text-zinc-500 hover:bg-white"
                title="Clear"
              >
                ✕
              </button>
            ) : null}
          </div>

          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-extrabold">
            {loading ? "Loading..." : `All: ${products?.length || 0}`}
          </span>
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-black text-white">
            Sel: {draftIds.length}
          </span>
          {orderChanged ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold">
              Order
            </span>
          ) : null}

          <button
            onClick={onSync}
            disabled={saving || syncing}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold hover:bg-zinc-50 disabled:opacity-50"
            title="Force sync Product.isBestSeller with Bestseller list"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>

          <button
            onClick={onReset}
            disabled={saving || syncing}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold hover:bg-zinc-50 disabled:opacity-50"
          >
            Reset
          </button>

          <button
            onClick={onSave}
            disabled={saving || syncing || !hasChanges}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-extrabold text-white hover:bg-black disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-12">
        {/* All products */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-black/10">
            <div className="border-b border-black/10 px-3 py-2 text-xs font-black text-zinc-600">
              All products
            </div>

            <div className="divide-y divide-black/5">
              {list.map((p) => {
                const id = idOf(p);
                const checked = draftSet.has(id);
                const img = imgOf(p);
                const name = nameOf(p);
                const code = codeOf(p) || "—";

                const isBest = serverSet.has(id) || !!p?.isBestSeller;

                return (
                  <div key={id} className="flex items-center gap-3 px-3 py-2">
                    <div className="h-10 w-10 overflow-hidden rounded-xl bg-zinc-100">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-black">{name}</div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(id)}
                          disabled={saving || syncing}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-extrabold">
                          {code}
                        </span>
                        {isBest ? (
                          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-black text-white">
                            Bestseller
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && list.length === 0 ? (
              <div className="p-3">
                <div className="rounded-xl border border-black/10 bg-zinc-50 p-3 text-sm font-black">
                  No products found.
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Selected order */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-black/10">
            <div className="border-b border-black/10 px-3 py-2 text-xs font-black text-zinc-600">
              Selected (drag / ↑ ↓)
            </div>

            <div className="p-3">
              {selected.length === 0 ? (
                <div className="rounded-xl border border-black/10 bg-zinc-50 p-3 text-sm font-black">
                  No selected products.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.map((p, idx) => {
                    const id = idOf(p);
                    const img = imgOf(p);
                    const name = nameOf(p);
                    const code = codeOf(p) || "—";

                    return (
                      <div
                        key={id}
                        draggable={!saving && !syncing}
                        onDragStart={(e) => onDragStart(e, idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, idx)}
                        className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2"
                        title="Drag to reorder"
                      >
                        <div className="grid h-9 w-7 place-items-center rounded-xl border border-black/10 bg-zinc-50 text-xs font-black text-zinc-500">
                          ⋮⋮
                        </div>

                        <div className="h-9 w-9 overflow-hidden rounded-xl bg-zinc-100">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black">{name}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-extrabold">
                              {code}
                            </span>
                            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-black text-white">
                              #{idx + 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => up(idx)}
                            disabled={saving || syncing || idx === 0}
                            className="h-9 w-9 rounded-xl border border-black/10 bg-white text-sm font-black hover:bg-zinc-50 disabled:opacity-40"
                            title="Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => down(idx)}
                            disabled={saving || syncing || idx === draftIds.length - 1}
                            className="h-9 w-9 rounded-xl border border-black/10 bg-white text-sm font-black hover:bg-zinc-50 disabled:opacity-40"
                            title="Down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => toggle(id)}
                            disabled={saving || syncing}
                            className="h-9 rounded-xl border border-black/10 bg-white px-2 text-xs font-extrabold hover:bg-zinc-50 disabled:opacity-40"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
