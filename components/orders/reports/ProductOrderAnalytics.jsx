"use client";

import React, { useMemo, useState } from "react";

/* -------------------------
  Date helpers
------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");

const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const currencyFmt = (amount, currency = "INR") => {
  const n = Number(amount || 0);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
};

const safeLower = (v) => String(v || "").toLowerCase();

export default function ProductOrderAnalytics({
  orders = [],
  excludeStatuses = ["cancelled", "rto"],
  defaultRange = "30d", // "7d" | "15d" | "30d" | "month"
  defaultTopN = 5, // ✅ show only top N by default
}) {
  const today = new Date();

  const [range, setRange] = useState(defaultRange);
  const [month, setMonth] = useState(() => {
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    return `${y}-${pad2(m)}`; // YYYY-MM for <input type="month">
  });

  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("qty"); // qty | revenue | orders
  const [excludeCancelled, setExcludeCancelled] = useState(true);

  // ✅ expand/collapse all rows
  const [expanded, setExpanded] = useState(false);
  const [topN, setTopN] = useState(defaultTopN);

  // compute date window
  const { fromD, toD } = useMemo(() => {
    if (range === "month") {
      const [yy, mm] = String(month || "").split("-").map((x) => Number(x));
      if (!yy || !mm) return { fromD: null, toD: null };

      const from = new Date(yy, mm - 1, 1);
      const to = new Date(yy, mm, 0); // last day of month
      return { fromD: startOfDay(from), toD: endOfDay(to) };
    }

    const days = range === "7d" ? 7 : range === "15d" ? 15 : 30;

    const from = new Date();
    from.setDate(today.getDate() - days);
    return { fromD: startOfDay(from), toD: endOfDay(today) };
  }, [range, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredOrders = useMemo(() => {
    const needle = safeLower(q).trim();

    return (orders || []).filter((o) => {
      const d = parseDate(o?.orderDate);
      if (!d) return false;

      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;

      if (excludeCancelled) {
        const fs = String(o?.fulfillmentStatus || "");
        if (excludeStatuses.includes(fs)) return false;
      }

      if (!needle) return true;

      // Search across order + item snapshots
      const hayOrder = [
        o?.orderNumber,
        o?.shippingAddressSnapshot?.fullName,
        o?.shippingAddressSnapshot?.phone,
        o?.shippingAddressSnapshot?.email,
      ]
        .map((x) => safeLower(x))
        .join(" ");

      if (hayOrder.includes(needle)) return true;

      const items = Array.isArray(o?.items) ? o.items : [];
      for (const it of items) {
        const snap = it?.productSnapshot || {};
        const v = it?.variant || {};
        const hayItem = [
          snap?.title,
          snap?.productCode,
          snap?.slug,
          snap?.sku,
          v?.sku,
          it?.selectedSize,
          it?.selectedColor,
        ]
          .map((x) => safeLower(x))
          .join(" ");
        if (hayItem.includes(needle)) return true;
      }

      return false;
    });
  }, [orders, q, fromD, toD, excludeCancelled, excludeStatuses]);

  const rows = useMemo(() => {
    const map = new Map();

    for (const o of filteredOrders) {
      const orderId = String(o?._id || o?.orderNumber || "");
      const items = Array.isArray(o?.items) ? o.items : [];

      for (const it of items) {
        const snap = it?.productSnapshot || {};
        const productId =
          String(it?.productId?._id || "") ||
          String(snap?.productCode || "") ||
          String(snap?.slug || "") ||
          String(snap?.title || "");

        if (!productId) continue;

        const title = snap?.title || it?.productId?.title || "Untitled";
        const productCode = snap?.productCode || it?.productId?.productCode || "";
        const slug = snap?.slug || it?.productId?.slug || "";
        const image =
          it?.variant?.image ||
          snap?.thumbnail ||
          (Array.isArray(snap?.images) ? snap.images[0] : "") ||
          it?.productId?.thumbnail ||
          (Array.isArray(it?.productId?.images) ? it.productId.images[0] : "");

        const qty = Number(it?.quantity ?? 0);
        const subtotal = Number(
          it?.subtotal ??
            (Number(it?.price ?? 0) * Number(it?.quantity ?? 0)) ??
            0
        );
        const price = Number(it?.price ?? 0);

        if (!map.has(productId)) {
          map.set(productId, {
            key: productId,
            title,
            productCode,
            slug,
            image,
            qtySold: 0,
            revenue: 0,
            priceSum: 0,
            priceCount: 0,
            orderIds: new Set(),
            currency: snap?.currency || it?.productId?.currency || "INR",
          });
        }

        const r = map.get(productId);
        r.qtySold += Number.isFinite(qty) ? qty : 0;
        r.revenue += Number.isFinite(subtotal) ? subtotal : 0;

        if (Number.isFinite(price) && price > 0) {
          r.priceSum += price;
          r.priceCount += 1;
        }

        if (orderId) r.orderIds.add(orderId);
      }
    }

    const out = Array.from(map.values()).map((r) => {
      const avgPrice =
        r.qtySold > 0
          ? r.revenue / r.qtySold
          : r.priceCount
          ? r.priceSum / r.priceCount
          : 0;

      return {
        ...r,
        ordersCount: r.orderIds.size,
        avgPrice,
      };
    });

    out.sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "orders") return b.ordersCount - a.ordersCount;
      return b.qtySold - a.qtySold;
    });

    return out;
  }, [filteredOrders, sortBy]);

  const totals = useMemo(() => {
    let qty = 0;
    let rev = 0;
    for (const r of rows) {
      qty += r.qtySold || 0;
      rev += r.revenue || 0;
    }
    return { qty, rev };
  }, [rows]);

  const windowLabel = useMemo(() => {
    if (!fromD || !toD) return "—";
    return `${toYMD(fromD)} → ${toYMD(toD)}`;
  }, [fromD, toD]);

  // ✅ Top rows for compact view
  const visibleRows = useMemo(() => {
    if (expanded) return rows;
    return rows.slice(0, Math.max(1, Number(topN) || defaultTopN));
  }, [rows, expanded, topN, defaultTopN]);

  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  // ✅ if search is active, auto-expand (better UX)
  const effectiveExpanded = useMemo(() => {
    const hasSearch = String(q || "").trim().length > 0;
    return hasSearch ? true : expanded;
  }, [q, expanded]);

  const effectiveVisibleRows = useMemo(() => {
    if (effectiveExpanded) return rows;
    return rows.slice(0, Math.max(1, Number(topN) || defaultTopN));
  }, [rows, effectiveExpanded, topN, defaultTopN]);

  const effectiveHiddenCount = Math.max(0, rows.length - effectiveVisibleRows.length);

  return (
    <section style={s.card}>
      {/* Header */}
      <div style={s.headRow}>
        <div>
          <div style={s.hTitle}>Product Orders Analytics</div>
          <div style={s.hSub}>
            <span style={s.badge}>Window</span> {windowLabel} •{" "}
            <span style={s.badge}>Orders</span> {filteredOrders.length} •{" "}
            <span style={s.badge}>Qty</span> {totals.qty} •{" "}
            <span style={s.badge}>Revenue</span>{" "}
            {currencyFmt(totals.rev, rows?.[0]?.currency || "INR")}
          </div>
        </div>

        {/* ✅ Expand toggle */}
        <div style={s.expandBox}>
          {!String(q || "").trim() ? (
            <>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                style={s.selectMini}
                disabled={effectiveExpanded}
                title="Top rows to show"
              >
                {[5, 10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                style={s.expandBtn}
              >
                {effectiveExpanded ? "Collapse" : `Expand (${rows.length})`}
              </button>
            </>
          ) : (
            <div style={s.searchHint}>Search active → showing all</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <div style={s.segment}>
          <button onClick={() => setRange("7d")} style={{ ...s.segBtn, ...(range === "7d" ? s.segActive : {}) }}>
            7D
          </button>
          <button onClick={() => setRange("15d")} style={{ ...s.segBtn, ...(range === "15d" ? s.segActive : {}) }}>
            15D
          </button>
          <button onClick={() => setRange("30d")} style={{ ...s.segBtn, ...(range === "30d" ? s.segActive : {}) }}>
            30D
          </button>
          <button onClick={() => setRange("month")} style={{ ...s.segBtn, ...(range === "month" ? s.segActive : {}) }}>
            Month
          </button>
        </div>

        <div style={s.rightControls}>
          {range === "month" ? (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={s.input}
              aria-label="Pick month"
            />
          ) : null}

          <input
            placeholder="Search product / code / slug / sku"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={s.inputWide}
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={s.select}>
            <option value="qty">Sort: Qty</option>
            <option value="revenue">Sort: Revenue</option>
            <option value="orders">Sort: Orders</option>
          </select>

          <label style={s.chk}>
            <input
              type="checkbox"
              checked={excludeCancelled}
              onChange={(e) => setExcludeCancelled(e.target.checked)}
            />
            <span>Exclude cancelled/rto</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 54 }}>Img</th>
              <th style={s.th}>Product</th>
              <th style={{ ...s.th, width: 110, textAlign: "right" }}>Avg Price</th>
              <th style={{ ...s.th, width: 90, textAlign: "right" }}>Qty</th>
              <th style={{ ...s.th, width: 110, textAlign: "right" }}>Revenue</th>
              <th style={{ ...s.th, width: 90, textAlign: "right" }}>Orders</th>
            </tr>
          </thead>

          <tbody>
            {effectiveVisibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={s.empty}>
                  No product sales found for this window.
                </td>
              </tr>
            ) : (
              effectiveVisibleRows.map((r) => (
                <tr key={r.key} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.imgBox}>
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt={r.title} style={s.img} />
                      ) : (
                        <div style={s.imgFallback} />
                      )}
                    </div>
                  </td>

                  <td style={s.td}>
                    <div style={s.pTitle}>{r.title}</div>
                    <div style={s.pMeta}>
                      {r.productCode ? <span style={s.metaPill}>#{r.productCode}</span> : null}
                      {r.slug ? <span style={s.metaMuted}>{r.slug}</span> : null}
                    </div>
                  </td>

                  <td style={{ ...s.td, textAlign: "right", fontWeight: 800 }}>
                    {currencyFmt(r.avgPrice, r.currency)}
                  </td>

                  <td style={{ ...s.td, textAlign: "right", fontWeight: 900 }}>
                    <span style={s.qtyAccent}>{r.qtySold}</span>
                  </td>

                  <td style={{ ...s.td, textAlign: "right", fontWeight: 900 }}>
                    {currencyFmt(r.revenue, r.currency)}
                  </td>

                  <td style={{ ...s.td, textAlign: "right", fontWeight: 800 }}>
                    {r.ordersCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Footer with "showing top" hint */}
      <div style={s.foot}>
        {String(q || "").trim() ? (
          <>Search is active → showing all results.</>
        ) : effectiveExpanded ? (
          <>Showing all <b>{rows.length}</b> products.</>
        ) : (
          <>
            Showing top <b>{effectiveVisibleRows.length}</b> of <b>{rows.length}</b> products
            {effectiveHiddenCount ? <> • Hidden: <b>{effectiveHiddenCount}</b></> : null}
          </>
        )}
      </div>
    </section>
  );
}

/* -------------------------
  Compact white/black UI + accent
------------------------- */
const s = {
  card: {
    marginTop: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 12,
    background: "#ffffff",
    padding: 12,
  },
  headRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  hTitle: { fontSize: 14, fontWeight: 950, letterSpacing: 0.2, color: "#0f172a" },
  hSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  badge: {
    fontSize: 10,
    fontWeight: 900,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#f8fafc",
    color: "#0f172a",
  },

  expandBox: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  expandBtn: {
    border: "1px solid rgba(15,23,42,0.12)",
    background: "#0f172a",
    color: "#ffffff",
    padding: "8px 10px",
    borderRadius: 10,
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  selectMini: {
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    padding: "0 10px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 900,
  },
  searchHint: { fontSize: 12, fontWeight: 800, color: "#0f172a", opacity: 0.8 },

  controls: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  segment: {
    display: "inline-flex",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    overflow: "hidden",
    background: "#fff",
  },
  segBtn: {
    border: "none",
    background: "transparent",
    padding: "8px 10px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    color: "#0f172a",
  },
  segActive: { background: "#0f172a", color: "#ffffff" },

  rightControls: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },

  input: {
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    padding: "0 10px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
  },
  inputWide: {
    height: 34,
    width: 260,
    maxWidth: "72vw",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    padding: "0 10px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
  },
  select: {
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    padding: "0 10px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 800,
  },
  chk: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "#0f172a" },

  tableWrap: {
    marginTop: 10,
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 12,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 720,
    background: "#fff",
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    textAlign: "left",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.3,
    color: "#0f172a",
    padding: "10px 10px",
    borderBottom: "1px solid rgba(15,23,42,0.10)",
    background: "#ffffff",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid rgba(15,23,42,0.06)" },
  td: {
    padding: "10px 10px",
    borderBottom: "1px solid rgba(15,23,42,0.06)",
    verticalAlign: "middle",
    fontSize: 12,
    color: "#0f172a",
  },
  empty: { padding: 18, fontSize: 12, color: "#64748b", textAlign: "center" },

  imgBox: {
    width: 38,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#f8fafc",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  imgFallback: { width: "100%", height: "100%" },

  pTitle: { fontWeight: 950, fontSize: 12, lineHeight: 1.2 },
  pMeta: { marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  metaPill: {
    fontSize: 10,
    fontWeight: 900,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#0f172a",
    color: "#fff",
  },
  metaMuted: { fontSize: 11, color: "#64748b", fontWeight: 700 },

  qtyAccent: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.12)",
    color: "#166534",
    fontWeight: 950,
  },

  foot: { marginTop: 10, fontSize: 11, color: "#64748b" },
};
