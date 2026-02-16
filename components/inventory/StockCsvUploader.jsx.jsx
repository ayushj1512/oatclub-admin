"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

const safeArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? "" : String(v));
const t = (v) => str(v).trim();
const toInt = (v, fallback = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
};
const normalizeSize = (v) => t(v).toUpperCase();
const isMongoId = (v) => /^[a-f\d]{24}$/i.test(String(v || "").trim());

const getVariantSize = (variant) => {
  if (!variant) return "";
  if (variant.size) return String(variant.size);

  const attrs = Array.isArray(variant.attributes) ? variant.attributes : [];
  const hit = attrs.find((a) => {
    const k = String(a?.key || "").trim().toLowerCase();
    return k === "size" || k === "sizes" || k === "shirt_size";
  });

  return hit?.value ? String(hit.value) : "";
};

// very small CSV parser (supports quotes)
function parseCSV(text = "") {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    // ignore completely empty row
    if (row.some((c) => t(c))) rows.push(row.map((c) => String(c ?? "")));
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQ && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && (ch === "," || ch === "\t")) {
      pushCell();
      continue;
    }
    if (!inQ && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cur += ch;
  }
  pushCell();
  pushRow();

  if (!rows.length) return { headers: [], data: [] };

  const headers = rows[0].map((h) => t(h));
  const data = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = r[idx] ?? ""));
    return obj;
  });

  return { headers, data };
}

async function triggerReconcile({ productId, variantId = null }) {
  try {
    const res = await fetch(`${BACKEND}/api/inventory-reservations/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, variantId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Reconcile failed");
    return data;
  } catch (e) {
    console.log("[RECONCILE_FAIL]", e?.message || e);
    return null;
  }
}

const sampleCSV = `productCode,size,addQty
00012,,10
00012,,5
00105,S,3
00105,M,7
`;

/**
 * StockCsvUploader
 * Props:
 * - products (array)
 * - updateProductStock(productId, nextStock)
 * - updateVariantStock(productId, size, nextStock)
 * - loadAll() refresh
 * - saving boolean
 */
export default function StockCsvUploader({
  products = [],
  updateProductStock,
  updateVariantStock,
  loadAll,
  saving = false,
}) {
  const [items, setItems] = useState([]); // preview items
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const productByCode = useMemo(() => {
    const m = new Map();
    safeArr(products).forEach((p) => {
      const pc = t(p?.productCode);
      if (pc) m.set(pc, p);
    });
    return m;
  }, [products]);

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_update_sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildPreview = ({ data }) => {
    // expected headers: productCode, size (optional), addQty
    // addQty is delta to ADD (can be 0+, allow negative too if you want)
    const agg = new Map();

    for (const r of safeArr(data)) {
      const productCode = t(r.productCode || r.product_code || r.code);
      const size = normalizeSize(r.size || r.Size || "");
      const addQty = toInt(r.addQty ?? r.qty ?? r.quantity ?? r.add ?? 0, 0);

      if (!productCode) continue;

      const key = `${productCode}__${size || "_"}`;
      const prev = agg.get(key) || { productCode, size, addQty: 0 };
      prev.addQty += addQty;
      agg.set(key, prev);
    }

    const out = [];
    for (const x of agg.values()) {
      const p = productByCode.get(x.productCode);
      if (!p) {
        out.push({
          ...x,
          status: "error",
          message: "productCode not found",
        });
        continue;
      }

      const variants = safeArr(p?.variants);
      const isVariable = variants.length > 0;

      if (!isVariable) {
        const current = Number(p?.stock ?? 0);
        out.push({
          ...x,
          status: "ok",
          kind: "simple",
          productId: t(p?._id),
          title: t(p?.title),
          current,
          next: Math.max(0, current + x.addQty),
        });
        continue;
      }

      // variable requires size
      if (!x.size) {
        out.push({
          ...x,
          status: "error",
          kind: "variant",
          title: t(p?.title),
          message: "Size missing for variable product",
        });
        continue;
      }

      const hit = variants.find(
        (v) => normalizeSize(getVariantSize(v)) === x.size
      );

      if (!hit) {
        out.push({
          ...x,
          status: "error",
          kind: "variant",
          title: t(p?.title),
          message: `Size not found: ${x.size}`,
        });
        continue;
      }

      const current = Number(hit?.stock ?? 0);
      out.push({
        ...x,
        status: "ok",
        kind: "variant",
        productId: t(p?._id),
        variantId: t(hit?._id),
        title: t(p?.title),
        current,
        next: Math.max(0, current + x.addQty),
        sku: t(hit?.sku),
      });
    }

    // drop rows where addQty is 0 (optional)
    const cleaned = out.filter((x) => Number(x.addQty) !== 0);
    setItems(cleaned);
  };

  const onPickFile = async (file) => {
    if (!file) return;
    setFileName(file.name || "uploaded.csv");

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (!parsed?.data?.length) {
        toast.error("CSV empty / invalid");
        setItems([]);
        return;
      }

      // must have productCode + addQty
      const headersLower = (parsed.headers || []).map((h) => h.toLowerCase());
      const hasPC = headersLower.includes("productcode") || headersLower.includes("product_code") || headersLower.includes("code");
      const hasQty =
        headersLower.includes("addqty") ||
        headersLower.includes("qty") ||
        headersLower.includes("quantity") ||
        headersLower.includes("add");

      if (!hasPC || !hasQty) {
        toast.error("CSV needs columns: productCode, addQty (size optional)");
        setItems([]);
        return;
      }

      buildPreview(parsed);
    } catch (e) {
      toast.error(e?.message || "Failed to read CSV");
      setItems([]);
    }
  };

  const okCount = useMemo(() => items.filter((x) => x.status === "ok").length, [items]);
  const errCount = useMemo(() => items.filter((x) => x.status !== "ok").length, [items]);

  const applyAll = async () => {
    const okItems = items.filter((x) => x.status === "ok" && x.productId);
    if (!okItems.length) return toast.error("No valid rows to apply");

    if (typeof updateProductStock !== "function" || typeof updateVariantStock !== "function") {
      toast.error("Missing store actions: updateProductStock / updateVariantStock");
      return;
    }
    if (typeof loadAll !== "function") {
      toast.error("loadAll() missing");
      return;
    }

    setBusy(true);
    try {
      // apply sequentially (safe)
      for (const it of okItems) {
        if (it.kind === "simple") {
          await updateProductStock(it.productId, it.next);
          await triggerReconcile({ productId: it.productId }); // reserve backorders etc.
          continue;
        }

        // variant
        await updateVariantStock(it.productId, it.size, it.next);
        if (it.variantId) {
          await triggerReconcile({ productId: it.productId, variantId: it.variantId });
        } else {
          // fallback: product reconcile at least
          await triggerReconcile({ productId: it.productId });
        }
      }

      toast.success(`Applied ✅ (${okItems.length} rows)`);
      setItems([]);
      setFileName("");
      await loadAll();
    } catch (e) {
      toast.error(e?.message || "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-black/10 rounded-lg bg-white overflow-hidden">
      <div className="p-3 md:p-4 border-b border-black/10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold">CSV Stock Update</div>
          <div className="text-[11px] text-gray-500">
            CSV columns: <b>productCode</b>, <b>addQty</b>, optional <b>size</b> (for variable products).
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
            onClick={downloadSample}
          >
            Download Sample CSV
          </button>

          <label className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 rounded cursor-pointer">
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {!items.length ? (
          <div className="text-sm text-gray-600">
            {fileName ? (
              <span>
                File: <b>{fileName}</b> • No rows to show (maybe addQty is 0 / invalid).
              </span>
            ) : (
              <span>Upload a CSV to preview changes before applying.</span>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs px-2 py-1 rounded bg-gray-50 border border-black/10">
                Rows: {items.length}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700">
                OK: {okCount}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700">
                Errors: {errCount}
              </span>

              <div className="flex-1" />

              <button
                className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 rounded"
                onClick={applyAll}
                disabled={saving || busy || okCount === 0}
                title={okCount === 0 ? "No valid rows" : ""}
              >
                {busy ? "Applying…" : "OK • Apply Updates"}
              </button>

              <button
                className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
                onClick={() => {
                  setItems([]);
                  setFileName("");
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm border border-black/10 rounded">
                <thead>
                  <tr className="text-left border-b border-black/10 bg-gray-50">
                    <th className="p-3">productCode</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Current</th>
                    <th className="p-3">ADD</th>
                    <th className="p-3">Final</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white">
                  {items.map((it, idx) => (
                    <tr key={`${it.productCode}-${it.size}-${idx}`}>
                      <td className="p-3 font-medium">{it.productCode}</td>
                      <td className="p-3">{it.title || "—"}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-1 rounded border border-black/10 bg-gray-50">
                          {it.size || "—"}
                        </span>
                      </td>
                      <td className="p-3">{Number.isFinite(it.current) ? it.current : "—"}</td>
                      <td className="p-3">{it.addQty}</td>
                      <td className="p-3">{Number.isFinite(it.next) ? it.next : "—"}</td>
                      <td className="p-3">
                        {it.status === "ok" ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700">
                            OK
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700">
                            {it.message || "Invalid"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-[11px] text-gray-500 mt-2">
                Note: Variable products require <b>size</b>. Final stock = max(0, current + addQty).
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
