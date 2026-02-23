"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const t = (v) => String(v ?? "").trim();
const cleanCode = (v) => t(v).replace(/\s+/g, "");
const toInt = (v, fallback = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
};
const clampNonNeg = (n) => Math.max(0, Number(n ?? 0));

const normalizeSize = (v) => String(v || "").trim().toUpperCase();

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

const buildIndex = (products = []) => {
  // exact-match index for fast scan lookup
  const skuToSimple = new Map(); // sku -> {product}
  const codeToProduct = new Map(); // productCode -> {product}
  const skuToVariant = new Map(); // sku -> {product, variant}
  const barToVariant = new Map(); // barcode -> {product, variant}

  for (const p of safeArr(products)) {
    const pid = t(p?._id);
    if (!pid) continue;

    const pc = t(p?.productCode).toLowerCase();
    if (pc) codeToProduct.set(pc, p);

    const pSku = t(p?.sku).toLowerCase();
    if (pSku) skuToSimple.set(pSku, p);

    for (const v of safeArr(p?.variants)) {
      const vSku = t(v?.sku).toLowerCase();
      const vBar = t(v?.barcode).toLowerCase();
      if (vSku) skuToVariant.set(vSku, { product: p, variant: v });
      if (vBar) barToVariant.set(vBar, { product: p, variant: v });
    }
  }

  return { skuToSimple, codeToProduct, skuToVariant, barToVariant };
};

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function makeSampleCsv() {
  // identifier can be barcode OR sku OR productCode
  // qty optional; if blank => +1
  // mode: ADD or SET
  const rows = [
    ["identifier", "qty", "mode"],
    ["1234567890123", "2", "ADD"], // barcode
    ["SKU-RED-S", "", "ADD"], // sku, blank qty => +1
    ["00012", "10", "SET"], // productCode, set to 10
  ];
  const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

function makeSampleXlsx() {
  const data = [
    { identifier: "1234567890123", qty: 2, mode: "ADD" },
    { identifier: "SKU-RED-S", qty: "", mode: "ADD" },
    { identifier: "00012", qty: 10, mode: "SET" },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "inventory_update");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function InventoryBulkQuickUpdater({
  products,
  saving,
  updateProductStock,
  updateVariantStock,
  loadAll,
  triggerReconcile, // function({productId, variantId?}) => Promise
}) {
  const idx = useMemo(() => buildIndex(products), [products]);

  // pending ops: array of {id, kind, productId, variantId?, size?, label, from, to, mode, deltaQty, identifier}
  const [pending, setPending] = useState([]);
  const [applying, setApplying] = useState(false);

  // scan inputs
  const [scanCode, setScanCode] = useState("");
  const [scanQty, setScanQty] = useState("");
  const [scanMode, setScanMode] = useState("ADD"); // ADD | SET
  const scanRef = useRef(null);

  // upload
  const fileRef = useRef(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  const totalLines = pending.length;

  const summary = useMemo(() => {
    // show compact summary: label -> count lines
    const map = new Map();
    for (const op of pending) {
      const k = op.label;
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries()).slice(0, 6);
  }, [pending]);

  const findTarget = (identifierRaw) => {
    const identifier = cleanCode(identifierRaw).toLowerCase();
    if (!identifier) return null;

    // priority: variant barcode, variant sku, product sku, productCode
    if (idx.barToVariant.has(identifier)) return { type: "variant", ...idx.barToVariant.get(identifier), identifierType: "barcode" };
    if (idx.skuToVariant.has(identifier)) return { type: "variant", ...idx.skuToVariant.get(identifier), identifierType: "variant_sku" };
    if (idx.skuToSimple.has(identifier)) return { type: "simple", product: idx.skuToSimple.get(identifier), identifierType: "product_sku" };
    if (idx.codeToProduct.has(identifier)) return { type: "simple", product: idx.codeToProduct.get(identifier), identifierType: "productCode" };
    return null;
  };

  const computeNext = ({ current, qtyVal, mode }) => {
    const qBlank = t(qtyVal) === "";
    const q = qBlank ? 1 : toInt(qtyVal, 1);

    if (mode === "SET") {
      // blank qty -> still +1 for fast scan
      if (qBlank) return clampNonNeg(Number(current ?? 0) + 1);
      return clampNonNeg(q);
    }
    // ADD
    return clampNonNeg(Number(current ?? 0) + q);
  };

  const addPendingOpFromIdentifier = ({ identifier, qtyVal, mode }) => {
    const hit = findTarget(identifier);
    if (!hit) {
      toast.error(`Not found: ${identifier}`);
      return;
    }

    if (hit.type === "simple") {
      const p = hit.product;
      const pid = t(p?._id);
      const current = Number(p?.stock ?? 0);
      const next = computeNext({ current, qtyVal, mode });

      const label = `${t(p?.productCode) || "—"} • ${t(p?.title) || "—"} • SIMPLE`;
      const id = `${pid}::simple`;

      setPending((prev) => [
        ...prev,
        {
          id: `${id}::${Date.now()}::${Math.random()}`,
          kind: "simple",
          productId: pid,
          variantId: null,
          size: null,
          label,
          from: current,
          to: next,
          mode,
          deltaQty: mode === "ADD" ? next - current : next,
          identifier: cleanCode(identifier),
          identifierType: hit.identifierType,
        },
      ]);

      toast.success(`Queued ✅ ${t(p?.productCode)} → ${next}`);
      return;
    }

    // variant
    const p = hit.product;
    const v = hit.variant;
    const pid = t(p?._id);
    const vid = t(v?._id);

    const size = normalizeSize(getVariantSize(v));
    if (!size) {
      toast.error("Variant size missing for this barcode/SKU");
      return;
    }

    const current = Number(v?.stock ?? 0);
    const next = computeNext({ current, qtyVal, mode });

    const label = `${t(p?.productCode) || "—"} • ${t(p?.title) || "—"} • ${size}`;
    const id = `${pid}::${size}`;

    setPending((prev) => [
      ...prev,
      {
        id: `${id}::${Date.now()}::${Math.random()}`,
        kind: "variant",
        productId: pid,
        variantId: vid || null,
        size,
        label,
        from: current,
        to: next,
        mode,
        deltaQty: mode === "ADD" ? next - current : next,
        identifier: cleanCode(identifier),
        identifierType: hit.identifierType,
      },
    ]);

    toast.success(`Queued ✅ ${t(p?.productCode)} ${size} → ${next}`);
  };

  const onScanEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const identifier = cleanCode(scanCode);
    if (!identifier) return;

    const qtyVal = t(scanQty); // optional
    addPendingOpFromIdentifier({ identifier, qtyVal, mode: scanMode });

    setScanCode("");
    scanRef.current?.focus();
  };

  const clearPending = () => setPending([]);

  const removeLine = (lineId) => setPending((prev) => prev.filter((x) => x.id !== lineId));

  const applyPending = async () => {
    if (!pending.length) {
      toast.error("Nothing to confirm");
      return;
    }
    if (typeof updateProductStock !== "function" || typeof updateVariantStock !== "function") {
      toast.error("Missing stock update functions");
      return;
    }

    setApplying(true);
    try {
      // Apply in order, but avoid stale current by reloading after all
      for (const op of pending) {
        if (op.kind === "simple") {
          await updateProductStock(op.productId, op.to);
          if (typeof triggerReconcile === "function") {
            await triggerReconcile({ productId: op.productId });
          }
        } else {
          await updateVariantStock(op.productId, op.size, op.to);
          if (typeof triggerReconcile === "function" && op.variantId) {
            await triggerReconcile({ productId: op.productId, variantId: op.variantId });
          }
        }
      }

      toast.success(`Confirmed ✅ ${pending.length} updates`);
      setPending([]);
      await loadAll?.();
      scanRef.current?.focus();
    } catch (e) {
      toast.error(e?.message || "Confirm failed");
    } finally {
      setApplying(false);
    }
  };

  const parseUploadRows = (rows) => {
    // rows => array of {identifier, qty, mode}
    let added = 0;
    for (const r of rows) {
      const identifier = cleanCode(r?.identifier ?? r?.Identifier ?? r?.code ?? "");
      if (!identifier) continue;
      const qtyVal = t(r?.qty ?? r?.Qty ?? "");
      const mode = String(r?.mode ?? r?.Mode ?? "ADD").toUpperCase() === "SET" ? "SET" : "ADD";
      addPendingOpFromIdentifier({ identifier, qtyVal, mode });
      added++;
    }
    if (!added) toast.error("No valid rows found");
  };

  const onUploadFile = async (file) => {
    if (!file) return;
    const name = (file.name || "").toLowerCase();

    try {
      if (name.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return toast.error("CSV empty");

        const headers = lines[0].split(",").map((x) => x.replace(/^"|"$/g, "").trim().toLowerCase());
        const idxId = headers.indexOf("identifier");
        const idxQty = headers.indexOf("qty");
        const idxMode = headers.indexOf("mode");

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]
            .split(",")
            .map((x) => x.replace(/^"|"$/g, "").trim());
          rows.push({
            identifier: cols[idxId] ?? cols[0],
            qty: idxQty >= 0 ? cols[idxQty] : "",
            mode: idxMode >= 0 ? cols[idxMode] : "ADD",
          });
        }
        parseUploadRows(rows);
        toast.success("CSV imported to pending ✅");
        return;
      }

      // xlsx / xls
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const wsName = wb.SheetNames?.[0];
      const ws = wb.Sheets?.[wsName];
      if (!ws) return toast.error("Excel sheet not found");

      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      parseUploadRows(json);
      toast.success("Excel imported to pending ✅");
    } catch (e) {
      toast.error(e?.message || "Upload parse failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      scanRef.current?.focus();
    }
  };

  return (
    <div className="border border-black/10 rounded-lg bg-white p-3 md:p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight">
            Quick Inventory Updater (Scan + Excel/CSV) — Pending then Confirm
          </div>
          <div className="text-[11px] text-gray-600 mt-1">
            Scan/enter <b>barcode / SKU / productCode</b> → it will be queued on screen. Then click <b>Confirm</b> to update stock + reservations.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
            onClick={() => downloadBlob("inventory_sample.csv", makeSampleCsv())}
          >
            Sample CSV
          </button>
          <button
            className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded"
            onClick={() => downloadBlob("inventory_sample.xlsx", makeSampleXlsx())}
          >
            Sample Excel
          </button>
        </div>
      </div>

      {/* Scan row */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_160px_120px_120px] gap-2">
        <input
          ref={scanRef}
          className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
          placeholder="Scan barcode / SKU / productCode… (Enter)"
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
          onKeyDown={onScanEnter}
          autoComplete="off"
        />

        <input
          className="px-3 py-2 text-sm bg-gray-50 border border-black/10 focus:border-black outline-none rounded"
          placeholder="Qty (optional)"
          value={scanQty}
          onChange={(e) => setScanQty(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
        />

        <select
          className="px-3 py-2 text-sm bg-gray-50 border border-black/10 rounded"
          value={scanMode}
          onChange={(e) => setScanMode(e.target.value)}
        >
          <option value="ADD">ADD</option>
          <option value="SET">SET</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => onUploadFile(e.target.files?.[0])}
          />
          <button
            className="px-3 py-2 text-sm border border-black/10 hover:bg-gray-50 rounded w-full"
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </button>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-gray-500">
        Qty blank = <b>+1</b> (fast scan). Mode <b>ADD</b> = increase by qty. Mode <b>SET</b> = set exact qty (blank still +1).
      </div>

      {/* Pending list */}
      <div className="mt-4 border border-black/10 rounded-lg overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-black/10 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm font-semibold">
            Pending Updates: {totalLines}
            {summary.length ? (
              <span className="ml-2 text-[11px] font-normal text-gray-600">
                (Top: {summary.map(([k, v]) => `${k}×${v}`).join(", ")})
              </span>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-2 text-sm border border-black/10 hover:bg-white rounded disabled:opacity-50"
              onClick={clearPending}
              disabled={!pending.length || applying}
            >
              Clear
            </button>

            <button
              className="px-3 py-2 text-sm bg-black text-white hover:bg-black/90 rounded disabled:opacity-50"
              onClick={applyPending}
              disabled={!pending.length || applying || saving}
            >
              {applying ? "Confirming…" : "Confirm Updates"}
            </button>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">No pending lines. Start scanning or upload a file.</div>
        ) : (
          <div className="max-h-[340px] overflow-auto bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-black/10">
                <tr className="text-left">
                  <th className="p-3 w-[46%]">Item</th>
                  <th className="p-3 w-[10%]">Mode</th>
                  <th className="p-3 w-[12%]">From</th>
                  <th className="p-3 w-[12%]">To</th>
                  <th className="p-3 w-[14%]">Identifier</th>
                  <th className="p-3 w-[6%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {pending.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{op.label}</div>
                      <div className="text-[11px] text-gray-500">
                        {op.kind === "variant" ? `Variant size: ${op.size}` : "Simple product"} • via {op.identifierType}
                      </div>
                    </td>
                    <td className="p-3">{op.mode}</td>
                    <td className="p-3">{op.from}</td>
                    <td className="p-3 font-semibold">{op.to}</td>
                    <td className="p-3">
                      <div className="text-xs">{op.identifier}</div>
                    </td>
                    <td className="p-3">
                      <button
                        className="px-2 py-1 text-xs border border-black/10 hover:bg-white rounded"
                        onClick={() => removeLine(op.id)}
                        disabled={applying}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-gray-500">
        Confirm will update stock first, then run reconcile (reservations/backorders) per item.
      </div>
    </div>
  );
}