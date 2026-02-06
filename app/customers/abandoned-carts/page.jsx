"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  RefreshCcw,
  Trash2,
  Eye,
  Send,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Package,
  ArrowUpDown,
} from "lucide-react";
import { useAdminAbandonedCartStore } from "@/store/adminAbandonedCartStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const safe = (v) => String(v ?? "").trim();
const lower = (v) => safe(v).toLowerCase();
const toNum = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

const fmtDT = (d) => {
  const dt = d ? new Date(d) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (n, cur = "INR") => {
  const num = Number(n);
  if (!Number.isFinite(num)) return cur === "INR" ? "₹0" : `${cur} 0`;
  const s = num.toLocaleString("en-IN");
  return cur === "INR" ? `₹${s}` : `${cur} ${s}`;
};

const pct = (a, b) => {
  const n = toNum(a, 0);
  const d = toNum(b, 0);
  if (!d) return "0%";
  const p = (n / d) * 100;
  return `${p.toFixed(p >= 10 ? 0 : 1)}%`;
};

const getItemSize = (item) => {
  if (!item) return "";
  if (item.size) return safe(item.size).toUpperCase();
  const attrs = Array.isArray(item.attributes) ? item.attributes : [];
  const hit = attrs.find((a) => ["size", "sizes"].includes(lower(a?.key)));
  return hit?.value ? safe(hit.value).toUpperCase() : "";
};

const statusTone = (s) => {
  const v = lower(s);
  if (v === "active") return "blue";
  if (v === "abandoned") return "yellow";
  if (v === "recovered") return "green";
  if (v === "expired") return "red";
  return "gray";
};

const Badge = ({ tone = "gray", children }) => {
  const map = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
        map[tone] || map.gray
      }`}
    >
      {children}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[11px] font-semibold text-gray-600">{label}</div>
        <div className="text-lg font-bold text-gray-900 mt-0.5">{value}</div>
        {sub ? <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div> : null}
      </div>
      {Icon ? (
        <div className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gray-700" />
        </div>
      ) : null}
    </div>
  </div>
);

const ProductMiniList = ({ title, rows }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
      <div className="text-[11px] font-semibold text-gray-700 flex items-center gap-2">
        <Package className="w-4 h-4" />
        {title}
      </div>
    </div>
    <div className="divide-y divide-gray-100">
      {(Array.isArray(rows) ? rows : []).slice(0, 6).map((r) => (
        <div key={r.pid} className="px-3 py-2 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
            {r.thumbnail ? (
              <Image src={r.thumbnail} alt={r.title} width={36} height={36} className="w-9 h-9 object-cover" />
            ) : (
              <div className="text-[10px] text-gray-400">No</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">{r.title}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
              {r.productCode ? (
                <span>
                  Code: <span className="font-semibold text-gray-700">{r.productCode}</span>
                </span>
              ) : null}
              <span>
                Lines: <span className="font-semibold text-gray-700">{r.count}</span>
              </span>
              <span>
                Qty: <span className="font-semibold text-gray-700">{r.qty}</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900">{money(r.revenue, "INR")}</div>
            <Link href={`/products/${r.pid}`} className="text-[11px] text-gray-900 underline underline-offset-2">
              Open
            </Link>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const buildItemKey = (cartId, item, idx) => {
  const cid = safe(cartId) || "cart";
  const pid = safe(item?.productId) || "p";
  const sig =
    safe(item?.variantId) ||
    safe(item?.variantSku) ||
    safe(item?.productSku) ||
    safe(item?.slug) ||
    safe(item?.title) ||
    "item";
  // ✅ extra entropy so React never sees duplicates
  return `${cid}_${pid}_${sig}_${idx}_${safe(item?._id) || safe(item?.lineId) || ""}`;
};

const getCustomer = (c) => {
  const pop = c?.customer || (c?.customerId && typeof c.customerId === "object" ? c.customerId : null);
  const name = safe(pop?.name);
  const email = safe(c?.customerEmail) || safe(pop?.email);
  const phone = safe(c?.customerPhone) || safe(pop?.phone);
  const uid = safe(c?.customerFirebaseUID) || safe(pop?.firebaseUID);
  return { name, email, phone, uid };
};

const isEmptyCart = (c) => {
  const items = Array.isArray(c?.items) ? c.items : [];
  const totals = toNum(c?.total, 0) + toNum(c?.subtotal, 0);
  const cu = getCustomer(c);
  const hasCustomerSignals = !!(cu.email || cu.phone || cu.uid || cu.name);
  return items.length === 0 && totals <= 0 && !hasCustomerSignals;
};

const sorters = {
  latest: (a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime(),
  oldest: (a, b) => new Date(a?.updatedAt || 0).getTime() - new Date(b?.updatedAt || 0).getTime(),
  total_high: (a, b) => toNum(b?.total, 0) - toNum(a?.total, 0),
  total_low: (a, b) => toNum(a?.total, 0) - toNum(b?.total, 0),
  retarget_high: (a, b) => toNum(b?.retargetCount, 0) - toNum(a?.retargetCount, 0),
  retarget_low: (a, b) => toNum(a?.retargetCount, 0) - toNum(b?.retargetCount, 0),
};

export default function AbandonedCartsPage() {
  const store = useAdminAbandonedCartStore();
  const { fetchProductsByIds } = useAdminProductStore();

  const {
    carts,
    loading,
    error,
    page,
    pages,
    filters,
    setFilters,
    setPage,
    fetchCarts,
    markAbandoned,
    markRecovered,
    markRetargeted,
    deleteCart,
  } = store;

  // ✅ FILTERS UI (No overlap)
  const [q, setQ] = useState(filters.q || "");
  const [status, setStatus] = useState(filters.status || "");
  const [hasCustomer, setHasCustomer] = useState(!!filters.hasCustomer);
  const [needContact, setNeedContact] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sortBy, setSortBy] = useState("latest");

  // infinite
  const [merged, setMerged] = useState([]);
  const loadedPagesRef = useRef(new Set());
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // products
  const [productMap, setProductMap] = useState({});
  const uiKeyRef = useRef("");

  // analytics
  const [aLoading, setALoading] = useState(false);
  const [aError, setAError] = useState("");
  const [tot, setTot] = useState({
    totalFromApi: 0,
    byStatus: { active: 0, abandoned: 0, recovered: 0, expired: 0, other: 0 },
    potentialRevenue: 0,
    recoveredRevenue: 0,
    avgCartValue: 0,
    recoveryRate: "0%",
    retargetedRate: "0%",
    retargetedCount: 0,
    totalCartsCounted: 0,
  });
  const [prodA, setProdA] = useState({ topByCount: [], topByRevenue: [] });

  const hasMore = Number(page || 1) < Number(pages || 1);

  // fetch UI page
  useEffect(() => {
    fetchCarts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status, filters.q, filters.hasCustomer]);

  // reset merged when server filters change
  useEffect(() => {
    loadedPagesRef.current = new Set();
    setMerged([]);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.q, filters.hasCustomer]);

  // merge page carts
  useEffect(() => {
    const p = Number(page || 1);
    if (loadedPagesRef.current.has(p)) return;
    loadedPagesRef.current.add(p);

    const list = Array.isArray(carts) ? carts : [];
    setMerged((prev) => {
      const out = [...prev];
      const seen = new Set(out.map((x) => safe(x?._id)));
      list.forEach((c) => {
        const id = safe(c?._id);
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(c);
      });
      return out;
    });
  }, [carts, page]);

  // infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loading) return;
        if (!hasMore) return;
        setPage(Number(page || 1) + 1);
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loading, hasMore, page, setPage]);

  // UI product ids
  const uiProductIds = useMemo(() => {
    const ids = [];
    const seen = new Set();
    merged.forEach((c) => {
      (Array.isArray(c?.items) ? c.items : []).forEach((it) => {
        const id = safe(it?.productId);
        if (!id || seen.has(id)) return;
        seen.add(id);
        ids.push(id);
      });
    });
    return ids;
  }, [merged]);

  // fetch product map for UI
  useEffect(() => {
    const key = uiProductIds.slice().sort().join("|");
    if (!key) {
      setProductMap({});
      uiKeyRef.current = "";
      return;
    }
    if (uiKeyRef.current === key) return;
    uiKeyRef.current = key;

    let alive = true;
    (async () => {
      try {
        const list = await fetchProductsByIds(uiProductIds);
        if (!alive) return;
        const map = {};
        (Array.isArray(list) ? list : []).forEach((p) => {
          const id = safe(p?._id);
          if (!id) return;
          map[id] = p;
        });
        setProductMap(map);
      } catch {
        if (!alive) return;
        setProductMap({});
      }
    })();

    return () => {
      alive = false;
    };
  }, [uiProductIds, fetchProductsByIds]);

  // ✅ view rows (client filters + sorting)
  const viewRows = useMemo(() => {
    const base = Array.isArray(merged) ? merged : [];
    let out = base;

    if (needContact) {
      out = out.filter((c) => {
        const cu = getCustomer(c);
        return !!(safe(cu.email) || safe(cu.phone));
      });
    }

    if (hideEmpty) out = out.filter((c) => !isEmptyCart(c));

    const sortFn = sorters[sortBy] || sorters.latest;
    return out.slice().sort(sortFn);
  }, [merged, needContact, hideEmpty, sortBy]);

  // ✅ TOTAL analytics (server filters only)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setALoading(true);
      setAError("");

      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "";
        const base = new URL(`${API}/api/abandoned-carts`);
        base.searchParams.set("page", "1");
        base.searchParams.set("limit", "200");
        if (filters.status) base.searchParams.set("status", safe(filters.status).toUpperCase());
        if (filters.q) base.searchParams.set("q", safe(filters.q));
        if (filters.hasCustomer) base.searchParams.set("hasCustomer", "1");

        const r1 = await fetch(base.toString(), { cache: "no-store" });
        const d1 = await r1.json();
        if (!r1.ok || d1?.success === false) throw new Error(d1?.message || "Analytics load failed");

        const totalFromApi = toNum(d1?.total, 0);
        const pagesFromApi = Math.max(1, toNum(d1?.pages, 1));

        const all = [];
        const seen = new Set();

        const ingest = (items) => {
          (Array.isArray(items) ? items : []).forEach((c) => {
            const id = safe(c?._id);
            if (!id || seen.has(id)) return;
            seen.add(id);
            all.push({
              _id: id,
              status: lower(c?.status),
              total: toNum(c?.pricing?.total ?? c?.total, 0),
              retargetCount: toNum(c?.retargetCount, 0),
              items: Array.isArray(c?.items) ? c.items : [],
            });
          });
        };

        ingest(d1?.items);

        for (let p = 2; p <= pagesFromApi; p += 1) {
          const u = new URL(base.toString());
          u.searchParams.set("page", String(p));
          const r = await fetch(u.toString(), { cache: "no-store" });
          const d = await r.json();
          if (!r.ok || d?.success === false) throw new Error(d?.message || `Analytics fetch failed at page ${p}`);
          ingest(d?.items);
        }

        if (!alive) return;

        const prodIds = [];
        const pSeen = new Set();
        all.forEach((c) => {
          c.items.forEach((it) => {
            const pid = safe(it?.productId);
            if (!pid || pSeen.has(pid)) return;
            pSeen.add(pid);
            prodIds.push(pid);
          });
        });

        const fullPMap = {};
        const CHUNK = 80;
        for (let i = 0; i < prodIds.length; i += CHUNK) {
          const chunk = prodIds.slice(i, i + CHUNK);
          const list = await fetchProductsByIds(chunk);
          (Array.isArray(list) ? list : []).forEach((p) => {
            const id = safe(p?._id);
            if (!id) return;
            fullPMap[id] = p;
          });
        }

        if (!alive) return;

        const byStatus = { active: 0, abandoned: 0, recovered: 0, expired: 0, other: 0 };
        let potentialRevenue = 0;
        let recoveredRevenue = 0;
        let totalCartValue = 0;
        let cartValueCount = 0;
        let retargetedCount = 0;

        const byProduct = new Map();
        const byProductAbandoned = new Map();
        const add = (map, pid, patch) => {
          const prev = map.get(pid) || { count: 0, qty: 0, revenue: 0 };
          map.set(pid, {
            count: prev.count + patch.count,
            qty: prev.qty + patch.qty,
            revenue: prev.revenue + patch.revenue,
          });
        };

        all.forEach((c) => {
          const st = c.status;
          if (st === "active") byStatus.active += 1;
          else if (st === "abandoned") byStatus.abandoned += 1;
          else if (st === "recovered") byStatus.recovered += 1;
          else if (st === "expired") byStatus.expired += 1;
          else byStatus.other += 1;

          const cartTotal = toNum(c.total, 0);
          if (cartTotal > 0) {
            totalCartValue += cartTotal;
            cartValueCount += 1;
          }

          if (c.retargetCount > 0) retargetedCount += 1;
          if (st === "recovered") recoveredRevenue += cartTotal;

          let itemSum = 0;
          c.items.forEach((it) => {
            const pid = safe(it?.productId);
            const qty = Math.max(1, Math.floor(toNum(it?.qty, 1)));
            const unit = Number.isFinite(Number(it?.unitPrice)) ? Number(it.unitPrice) : NaN;
            const live = pid ? fullPMap[pid] : null;
            const fallbackUnit = toNum(live?.price, 0);
            const used = Number.isFinite(unit) ? unit : fallbackUnit;
            const rev = used * qty;

            itemSum += rev;
            if (pid) {
              add(byProduct, pid, { count: 1, qty, revenue: rev });
              if (st === "abandoned") add(byProductAbandoned, pid, { count: 1, qty, revenue: rev });
            }
          });

          potentialRevenue += itemSum > 0 ? itemSum : cartTotal;
        });

        const considered = byStatus.abandoned + byStatus.recovered + byStatus.expired;

        const topByCount = Array.from(byProduct.entries())
          .map(([pid, v]) => {
            const live = fullPMap[pid] || null;
            return {
              pid,
              title: safe(live?.title) || pid,
              thumbnail: safe(live?.thumbnail) || "",
              productCode: safe(live?.productCode) || "",
              ...v,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        const topByRevenue = Array.from(byProductAbandoned.entries())
          .map(([pid, v]) => {
            const live = fullPMap[pid] || null;
            return {
              pid,
              title: safe(live?.title) || pid,
              thumbnail: safe(live?.thumbnail) || "",
              productCode: safe(live?.productCode) || "",
              ...v,
            };
          })
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6);

        setTot({
          totalFromApi,
          byStatus,
          potentialRevenue,
          recoveredRevenue,
          avgCartValue: cartValueCount ? totalCartValue / cartValueCount : 0,
          recoveryRate: pct(byStatus.recovered, Math.max(1, considered)),
          retargetedRate: pct(retargetedCount, Math.max(1, all.length)),
          retargetedCount,
          totalCartsCounted: all.length,
        });

        setProdA({ topByCount, topByRevenue });
      } catch (e) {
        if (!alive) return;
        setAError(e?.message || "Analytics failed");
      } finally {
        if (!alive) return;
        setALoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [filters.status, filters.q, filters.hasCustomer, fetchProductsByIds]);

  // ✅ apply uses ONE source of truth: store filters (no overlap)
  const onApply = (e) => {
    e.preventDefault();
    loadedPagesRef.current = new Set();
    setMerged([]);
    setPage(1);
    setFilters({ q: safe(q), status: safe(status), hasCustomer: !!hasCustomer });
  };

  const onReset = () => {
    setQ("");
    setStatus("");
    setHasCustomer(false);
    setNeedContact(false);
    setHideEmpty(true);
    setSortBy("latest");
    loadedPagesRef.current = new Set();
    setMerged([]);
    setPage(1);
    setFilters({ q: "", status: "", hasCustomer: false });
  };

  const doRecovered = async (id) => {
    const orderId = window.prompt("Recovered Order ID (optional):", "");
    await markRecovered(id, safe(orderId) || undefined);
  };

  const doDelete = async (id) => {
    const ok = window.confirm("Delete this cart snapshot? This cannot be undone.");
    if (!ok) return;
    await deleteCart(id);
  };

  const renderItems = (cart) => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    if (!items.length) return <div className="text-gray-500">-</div>;

    const shown = items.slice(0, 2);
    const more = Math.max(0, items.length - shown.length);

    return (
      <div className="space-y-2">
        {shown.map((it, idx) => {
          const pid = safe(it?.productId);
          const live = pid ? productMap[pid] : null;

          const title = safe(it?.title) || safe(live?.title) || "Untitled";
          const thumb = safe(it?.thumbnail) || safe(it?.image) || safe(live?.thumbnail) || "";
          const code = safe(it?.productCode) || safe(live?.productCode) || "";
          const size = getItemSize(it);
          const qty = Math.max(1, Math.floor(toNum(it?.qty, 1)));

          return (
            <div key={buildItemKey(cart?._id, it, idx)} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                {thumb ? (
                  <Image src={thumb} alt={title} width={36} height={36} className="w-9 h-9 object-cover" />
                ) : (
                  <div className="text-[10px] text-gray-400">No</div>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-gray-900 font-semibold truncate max-w-[260px]">{title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                  {code ? (
                    <span>
                      Code: <span className="font-semibold text-gray-700">{code}</span>
                    </span>
                  ) : null}
                  {size ? (
                    <span>
                      Size: <span className="font-semibold text-gray-700">{size}</span>
                    </span>
                  ) : null}
                  <span>
                    Qty: <span className="font-semibold text-gray-700">{qty}</span>
                  </span>
                  {live?._id ? (
                    <Link href={`/products/${live._id}`} className="text-gray-900 underline underline-offset-2">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {more > 0 ? <div className="text-[11px] text-gray-500">+{more} more</div> : null}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Abandoned Carts</h1>
          <p className="text-xs text-gray-600 mt-1">
            Analytics:{" "}
            <span className="font-semibold text-gray-900">
              {aLoading ? "calculating..." : `${tot.totalCartsCounted}/${tot.totalFromApi} carts`}
            </span>
            {filters.hasCustomer ? <span className="ml-2 text-gray-500">(hasCustomer=1)</span> : null}
            {aError ? <span className="text-red-600 ml-2">{aError}</span> : null}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadedPagesRef.current = new Set();
            setMerged([]);
            setPage(1);
            fetchCarts();
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 shadow-sm text-sm"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <StatCard icon={BarChart3} label="Abandoned" value={tot.byStatus.abandoned} sub={`of ${tot.totalFromApi} total`} />
        <StatCard icon={TrendingUp} label="Recovered" value={tot.byStatus.recovered} sub={`Recovery rate: ${tot.recoveryRate}`} />
        <StatCard icon={Send} label="Retargeted" value={tot.retargetedCount} sub={`Retargeted carts: ${tot.retargetedRate}`} />
        <StatCard icon={Package} label="Potential Revenue" value={money(tot.potentialRevenue, "INR")} sub="Total dataset" />
        <StatCard icon={CheckCircle2} label="Recovered Revenue" value={money(tot.recoveredRevenue, "INR")} sub="Total dataset" />
        <StatCard icon={BarChart3} label="Avg Cart Value" value={money(tot.avgCartValue, "INR")} sub="Total dataset" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ProductMiniList title="Top Products by Appearances (TOTAL)" rows={prodA.topByCount} />
        <ProductMiniList title="Top Products by Abandoned Revenue (TOTAL)" rows={prodA.topByRevenue} />
      </div>

      {/* ✅ FILTER BAR (no overlap / no layout issues) */}
      <form onSubmit={onApply} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-5">
            <label className="text-[11px] font-semibold text-gray-600">Search</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Email, UID, cartId, phone..."
                className="w-full outline-none text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
            >
              <option value="">All</option>
              <option value="active">active</option>
              <option value="abandoned">abandoned</option>
              <option value="recovered">recovered</option>
              <option value="expired">expired</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-[11px] font-semibold text-gray-600">Sort</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full outline-none text-sm text-gray-900 bg-transparent"
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="total_high">Total (high → low)</option>
                <option value="total_low">Total (low → high)</option>
                <option value="retarget_high">Retarget count (high → low)</option>
                <option value="retarget_low">Retarget count (low → high)</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="flex-1 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black">
              Apply
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          {/* ✅ checkboxes on new row so they never overlap */}
          <div className="md:col-span-12 mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
              <input type="checkbox" checked={hasCustomer} onChange={(e) => setHasCustomer(e.target.checked)} className="w-4 h-4" />
              Only carts with customer details (server)
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
              <input type="checkbox" checked={needContact} onChange={(e) => setNeedContact(e.target.checked)} className="w-4 h-4" />
              Only carts with email/phone (easy retarget)
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
              <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="w-4 h-4" />
              Hide empty carts (no items + ₹0)
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : null}
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">Cart</th>
                <th className="py-3 px-4 text-left font-semibold">Customer</th>
                <th className="py-3 px-4 text-left font-semibold">Status</th>
                <th className="py-3 px-4 text-left font-semibold">Items</th>
                <th className="py-3 px-4 text-left font-semibold">Total</th>
                <th className="py-3 px-4 text-left font-semibold">Retarget</th>
                <th className="py-3 px-4 text-left font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {!viewRows.length ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-gray-600">
                    {loading ? "Loading..." : "No carts found."}
                  </td>
                </tr>
              ) : (
                viewRows.map((c) => {
                  const cu = getCustomer(c);
                  const canRetarget = !!(safe(cu.email) || safe(cu.phone));

                  return (
                    <tr key={safe(c._id) || safe(c.cartId) || `${Math.random()}`} className="hover:bg-gray-50/60 align-top">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{safe(c.cartId) || safe(c._id)}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Updated: {fmtDT(c.updatedAt)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-gray-900 font-semibold">{cu.name || "-"}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Email: {cu.email || "-"}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Phone: {cu.phone || "-"}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">UID: {cu.uid || "-"}</div>
                        {!canRetarget ? <div className="text-[11px] text-red-600 mt-1">No contact (email/phone) ❌</div> : null}
                      </td>

                      <td className="py-3 px-4">
                        <Badge tone={statusTone(c.status)}>{safe(c.status) || "-"}</Badge>
                        <div className="text-[11px] text-gray-500 mt-1">Abandoned: {fmtDT(c.abandonedAt)}</div>
                        {c.recoveredAt ? <div className="text-[11px] text-gray-500">Recovered: {fmtDT(c.recoveredAt)}</div> : null}
                      </td>

                      <td className="py-3 px-4">{renderItems(c)}</td>

                      <td className="py-3 px-4">
                        <div className="text-gray-900 font-semibold">{money(c.total, c.currency)}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Subtotal: {money(c.subtotal, c.currency)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-gray-900 font-semibold">{toNum(c.retargetCount, 0)}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Last: {fmtDT(c.lastRetargetedAt)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/customers/abandoned-carts/${c._id}`}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 text-xs"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() => markAbandoned(c._id)}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 text-xs"
                          >
                            <Send className="w-4 h-4" />
                            Abandon
                          </button>

                          <button
                            type="button"
                            onClick={() => doRecovered(c._id)}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 text-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Recover
                          </button>

                          <button
                            type="button"
                            onClick={() => markRetargeted(c._id)}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs"
                          >
                            <Send className="w-4 h-4" />
                            Retarget
                          </button>

                          <button
                            type="button"
                            onClick={() => doDelete(c._id)}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          {loading ? (
            <div className="text-sm text-gray-600">Loading more...</div>
          ) : hasMore ? (
            <div className="text-sm text-gray-500">Scroll to load more</div>
          ) : (
            <div className="text-sm text-gray-500">No more carts</div>
          )}
          <div ref={sentinelRef} className="h-1 w-full" />
        </div>
      </div>
    </div>
  );
}
