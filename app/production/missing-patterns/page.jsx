"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const norm = (v) => String(v || "").trim().toLowerCase();

function pickSize(item) {
  const flat = String(item?.selectedSize || "").trim();
  if (flat) return flat;

  const attrs = Array.isArray(item?.variant?.attributes) ? item.variant.attributes : [];
  const v =
    attrs.find((a) => norm(a?.key) === "size")?.value ||
    attrs.find((a) => norm(a?.key) === "sizes")?.value ||
    "";
  return String(v || "").trim();
}

function getProductIdFromOrderItem(item) {
  const pid = item?.productId;
  if (!pid) return "";
  if (typeof pid === "string") return String(pid).trim();
  if (typeof pid === "object") return String(pid?._id || "").trim();
  return "";
}

function findVariant(product, orderItem) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const wantedVariantId = String(orderItem?.variant?.variantId || "").trim();
  if (wantedVariantId) {
    const v = variants.find((x) => String(x?._id || "").trim() === wantedVariantId);
    if (v) return v;
  }

  const wantedSku = String(orderItem?.variant?.sku || "").trim();
  if (wantedSku) {
    const v = variants.find((x) => String(x?.sku || "").trim() === wantedSku);
    if (v) return v;
  }

  const size = pickSize(orderItem);
  if (size) {
    const s = norm(size);
    const v = variants.find((x) => {
      const attrs = Array.isArray(x?.attributes) ? x.attributes : [];
      const vSize = norm(attrs.find((a) => norm(a?.key) === "size")?.value);
      return vSize === s;
    });
    if (v) return v;
  }

  return null;
}

function escapeCSV(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(filename, headers, rows) {
  const head = headers.map(escapeCSV).join(",");
  const body = rows
    .map((r) => headers.map((h) => escapeCSV(r[h] ?? "")).join(","))
    .join("\n");

  const csv = `${head}\n${body}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function Lightbox({ open, src, title, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div className="text-sm font-medium truncate">{title || "Preview"}</div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-lg bg-black text-white"
          >
            Close
          </button>
        </div>
        <div className="bg-[#f2f2f2] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title || "Preview"}
            className="w-full h-auto max-h-[75vh] object-contain rounded-xl bg-white"
          />
        </div>
      </div>
    </div>
  );
}

export default function MissingPatternsPage() {
  const { fetchAllOrders, loading: ordersLoading } = useOrderStore();
  const { fetchProductsByIds, loading: productsLoading } = useAdminProductStore();

  const [alertsRaw, setAlertsRaw] = useState([]);
  const [ranOnce, setRanOnce] = useState(false);

  const [lightbox, setLightbox] = useState({ open: false, src: "", title: "" });

  const isBusy = ordersLoading || productsLoading;

  const runScan = async () => {
    try {
      setAlertsRaw([]);
      setRanOnce(false);

      const orderList = await fetchAllOrders({});
      const orders = Array.isArray(orderList) ? orderList : [];

      if (!orders.length) {
        setRanOnce(true);
        toast.success("No orders found");
        return;
      }

      const productIdsSet = new Set();
      for (const o of orders) {
        const items = Array.isArray(o?.items) ? o.items : [];
        for (const it of items) {
          const pid = getProductIdFromOrderItem(it);
          if (pid) productIdsSet.add(pid);
        }
      }
      const productIds = Array.from(productIdsSet);

      if (!productIds.length) {
        setRanOnce(true);
        toast.error("No product ids found in orders");
        return;
      }

      const products = await fetchProductsByIds(productIds);
      const productMap = new Map((products || []).map((p) => [String(p?._id), p]));

      const missing = [];

      for (const o of orders) {
        const orderNumber = String(o?.orderNumber || "-");
        const items = Array.isArray(o?.items) ? o.items : [];

        for (const it of items) {
          const pid = getProductIdFromOrderItem(it);
          if (!pid) continue;

          const product = productMap.get(pid);
          if (!product) continue;

          const v = findVariant(product, it);
          if (!v) continue;

          const pattern = String(v?.patternNumber || "").trim();
          if (pattern) continue; // ✅ only missing

          const size = pickSize(it) || "-";

          const productCode =
            String(it?.productSnapshot?.productCode || "").trim() ||
            String(product?.productCode || "").trim() ||
            "";

          const title = String(product?.title || it?.productSnapshot?.title || "-");

          const image =
            String(it?.productSnapshot?.thumbnail || "").trim() ||
            String(it?.variant?.image || "").trim() ||
            String(product?.thumbnail || "").trim() ||
            (Array.isArray(product?.images) ? String(product.images[0] || "") : "") ||
            "";

          missing.push({
            productCode: productCode || "(no-code)",
            size,
            title,
            image,
            orderNumber,
          });
        }
      }

      setAlertsRaw(missing);
      setRanOnce(true);

      toast.success(missing.length ? `Missing patterns: ${missing.length}` : "No missing patterns ✅");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Scan failed");
      setRanOnce(true);
    }
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ group key = productCode + size (unique key)
  const grouped = useMemo(() => {
    const map = new Map();

    for (const r of alertsRaw) {
      const pc = String(r.productCode || "").trim() || "(no-code)";
      const sz = String(r.size || "").trim() || "-";
      const key = `${pc}__${norm(sz)}`;

      if (!map.has(key)) {
        map.set(key, {
          productCode: pc,
          size: sz,
          title: r.title,
          image: r.image,
          ordersSet: new Set(),
        });
      }

      const g = map.get(key);
      if (r.orderNumber) g.ordersSet.add(r.orderNumber);
    }

    const out = Array.from(map.values()).map((g) => ({
      productCode: g.productCode,
      title: g.title,
      image: g.image,
      size: g.size,
      orders: Array.from(g.ordersSet),
    }));

    out.sort((a, b) => a.productCode.localeCompare(b.productCode) || a.size.localeCompare(b.size));
    return out;
  }, [alertsRaw]);

  const stats = useMemo(() => {
    const totalGroups = grouped.length;
    const totalOrders = new Set(grouped.flatMap((g) => g.orders)).size;
    return { totalGroups, totalOrders };
  }, [grouped]);

  const exportExcel = () => {
    if (!grouped.length) {
      toast.error("Nothing to export");
      return;
    }

    const rows = grouped.map((g) => ({
      "Product Name": g.title,
      "Product Code": g.productCode,
      Size: g.size,
      "Order Numbers": g.orders.join(" | "),
      "Image URL": g.image,
    }));

    downloadCSV(
      `missing-patterns-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Product Name", "Product Code", "Size", "Order Numbers", "Image URL"],
      rows
    );

    toast.success("Excel export ready ✅ (CSV downloaded)");
  };

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-black">
      <Lightbox
        open={lightbox.open}
        src={lightbox.src}
        title={lightbox.title}
        onClose={() => setLightbox({ open: false, src: "", title: "" })}
      />

      <div className="px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Missing Pattern Alerts</h1>
            <p className="text-sm text-black/60 mt-1">
              Only shows items where <span className="font-medium text-black">patternNumber is empty</span> for the ordered variant.
              <br />
              Group key: <span className="font-medium text-black">productCode + size</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              disabled={!grouped.length}
              className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-40"
            >
              Export Excel (CSV)
            </button>

            <button
              onClick={runScan}
              disabled={isBusy}
              className="px-3 py-2 rounded-lg bg-white text-black text-sm border border-black/10 hover:border-black/20 disabled:opacity-50"
            >
              {isBusy ? "Scanning..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 border border-black/5">
            <div className="text-xs text-black/60">Alert Groups</div>
            <div className="text-2xl font-semibold mt-1">{ranOnce ? stats.totalGroups : "—"}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-black/5">
            <div className="text-xs text-black/60">Unique Orders</div>
            <div className="text-2xl font-semibold mt-1">{ranOnce ? stats.totalOrders : "—"}</div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-medium">Missing Pattern Table</div>
            <div className="text-xs text-black/50">
              {isBusy && !ranOnce ? "Scanning..." : ranOnce ? `${grouped.length} groups` : "—"}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-[#fafafa] text-black/70 sticky top-0">
                <tr className="border-b border-black/5">
                  <th className="text-left font-medium px-4 py-3">Image</th>
                  <th className="text-left font-medium px-4 py-3">Product</th>
                  <th className="text-left font-medium px-4 py-3">Size</th>
                  <th className="text-left font-medium px-4 py-3">Order Numbers</th>
                </tr>
              </thead>

              <tbody>
                {isBusy && !ranOnce ? (
                  <tr>
                    <td className="px-4 py-6 text-black/60" colSpan={4}>
                      Scanning orders and products...
                    </td>
                  </tr>
                ) : grouped.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-black/60" colSpan={4}>
                      {ranOnce ? "No missing patterns ✅" : "No results yet."}
                    </td>
                  </tr>
                ) : (
                  grouped.map((g) => (
                    <tr
                      key={`${g.productCode}__${norm(g.size)}`}
                      className="border-b border-black/5 hover:bg-black/[0.02]"
                    >
                      <td className="px-4 py-3">
                        {g.image ? (
                          <button
                            type="button"
                            className="block"
                            onClick={() =>
                              setLightbox({ open: true, src: g.image, title: g.title })
                            }
                            title="Click to preview"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={g.image}
                              alt={g.title}
                              className="h-12 w-12 rounded-xl object-cover bg-[#f2f2f2]"
                            />
                          </button>
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-[#f2f2f2] flex items-center justify-center text-xs text-black/50">
                            No Image
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{g.title}</div>
                        <div className="text-xs text-black/50 mt-0.5">
                          Code: <span className="text-black/70">{g.productCode}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium">{g.size}</td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {g.orders.slice(0, 16).map((o) => (
                            <span
                              key={o}
                              className="inline-flex items-center rounded-full border border-black/10 bg-white px-2 py-1 text-xs text-black/70"
                            >
                              {o}
                            </span>
                          ))}
                          {g.orders.length > 16 && (
                            <span className="text-xs text-black/50">
                              +{g.orders.length - 16} more
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-black/50">
          Excel export is CSV (opens in Excel). Lightbox: click image, press ESC to close.
        </div>
      </div>
    </div>
  );
}
