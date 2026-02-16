// app/production/barcode/page.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";

import { useAdminProductStore } from "@/store/adminProductStore";

/* =========================================================
   LABEL SIZE (2 x 1 inch)
   ========================================================= */
const LABEL_W_IN = 2;
const LABEL_H_IN = 1;
const INCH_TO_MM = 25.4;
const LABEL_W_MM = LABEL_W_IN * INCH_TO_MM; // 50.8
const LABEL_H_MM = LABEL_H_IN * INCH_TO_MM; // 25.4

/* ---------------- helpers ---------------- */
const pad5 = (v) => {
  const digits = String(v ?? "").trim().replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.slice(-5).padStart(5, "0");
};
const safe = (v) => (v == null ? "" : String(v));
const toStr = (v) => String(v ?? "").trim();
const normalizeSize = (v) => toStr(v).toUpperCase();

const parseCodes = (raw) => {
  // supports: "00123, 00124 00125\n00126"
  const parts = String(raw || "")
    .split(/[\s,]+/g)
    .map((x) => pad5(x))
    .filter(Boolean);

  // dedupe
  const seen = new Set();
  const out = [];
  for (const c of parts) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
};

const getVariantSize = (variant) => {
  if (!variant) return "";
  if (variant.size) return String(variant.size);

  const attrs = Array.isArray(variant.attributes) ? variant.attributes : [];
  const hit = attrs.find((a) => {
    const k = String(a?.key || "").trim().toLowerCase();
    return k === "size" || k === "sizes";
  });

  return hit?.value ? String(hit.value) : "";
};

const getBestImage = (p) =>
  p?.thumbnail || (Array.isArray(p?.images) && p.images[0]) || "";

/* =========================================================
   BARCODE -> PNG DATAURL (for PDF / print sheet)
   Uses an offscreen canvas per SKU
   ========================================================= */
function barcodeToPngDataUrl(value) {
  const v = toStr(value);
  if (!v) return "";

  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, v, {
      format: "CODE128",
      displayValue: true,
      margin: 0,
      // tuned to fit inside 2x1 label
      height: 44, // px (we scale in PDF/print)
      fontSize: 12,
      textMargin: 2,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/* =========================================================
   PAGE
   - Multi product codes
   - Per product choose size->SKU
   - "Add to Sheet" asks qty
   - "Print All / Download PDF" one sheet (auto-paginated)
   ========================================================= */
export default function BarcodePage() {
  // store
  const storeLoading = useAdminProductStore((s) => s.loading);
  const fetchProducts = useAdminProductStore((s) => s.fetchProducts);

  const [inputCodes, setInputCodes] = useState("");
  const [loadError, setLoadError] = useState("");

  // loaded products list
  const [loaded, setLoaded] = useState([]); // [{ code, product, img, isVariable, skuOptions, selectedSize, selectedSku, error }]
  const [loadingCodes, setLoadingCodes] = useState(false);

  // sheet items (what will be printed)
  // each item is a single label: { id, productCode, title, sku, size, barcodePng }
  const [sheet, setSheet] = useState([]);

  const [exportingPdf, setExportingPdf] = useState(false);

  /* ---------------- build skuOptions for a product ---------------- */
  const buildSkuOptions = (p) => {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    if (variants.length) {
      const map = new Map(); // size -> sku
      for (const v of variants) {
        const size = normalizeSize(getVariantSize(v));
        const sku = toStr(v?.sku);
        if (!size || !sku) continue;
        if (!map.has(size)) map.set(size, sku);
      }
      return Array.from(map.entries())
        .map(([size, sku]) => ({ size, sku }))
        .sort((a, b) => a.size.localeCompare(b.size));
    }

    const sku = toStr(p?.sku);
    return sku ? [{ size: "—", sku }] : [];
  };

  /* ---------------- store-based fetch single product ---------------- */
  async function fetchOneProductByCode(code) {
    await fetchProducts({ productCode: code, page: 1, limit: 1 });
    const { products } = useAdminProductStore.getState();
    return Array.isArray(products) ? products[0] : null;
  }

  /* ---------------- load multiple product codes ---------------- */
  const loadProducts = async () => {
    const codes = parseCodes(inputCodes);
    if (!codes.length) {
      setLoadError("Enter product codes (comma or space separated).");
      return;
    }

    setLoadError("");
    setLoadingCodes(true);
    try {
      const results = [];

      for (const code of codes) {
        try {
          const p = await fetchOneProductByCode(code);

          if (!p) {
            results.push({
              code,
              product: null,
              img: "",
              isVariable: false,
              skuOptions: [],
              selectedSize: "",
              selectedSku: "",
              error: `No product found for code ${code}`,
            });
            continue;
          }

          const skuOptions = buildSkuOptions(p);
          const isVariable = Array.isArray(p?.variants) && p.variants.length > 0;
          const img = getBestImage(p);

          // auto select first sku
          let selectedSize = "";
          let selectedSku = "";
          if (skuOptions.length) {
            selectedSize = skuOptions[0].size;
            selectedSku = skuOptions[0].sku;
          }

          results.push({
            code,
            product: p,
            img,
            isVariable,
            skuOptions,
            selectedSize,
            selectedSku,
            error: skuOptions.length ? "" : "Product found, but SKU not set yet.",
          });
        } catch (e) {
          results.push({
            code,
            product: null,
            img: "",
            isVariable: false,
            skuOptions: [],
            selectedSize: "",
            selectedSku: "",
            error: e?.message || "Failed to load product",
          });
        }
      }

      setLoaded(results);
    } finally {
      setLoadingCodes(false);
    }
  };

  /* ---------------- update selection per loaded row ---------------- */
  const updateRow = (code, patch) => {
    setLoaded((prev) =>
      prev.map((r) => (r.code === code ? { ...r, ...patch } : r))
    );
  };

  const onSelectSize = (code, size) => {
    setLoaded((prev) =>
      prev.map((r) => {
        if (r.code !== code) return r;
        const s = normalizeSize(size);
        const hit = r.skuOptions.find((x) => x.size === s);
        return { ...r, selectedSize: s, selectedSku: hit?.sku || "" };
      })
    );
  };

  /* =========================================================
     ADD TO SHEET (asks qty)
     ========================================================= */
  const askQty = (defaultQty = 1) => {
    const raw = window.prompt("How many barcodes to print for this product?", String(defaultQty));
    if (raw == null) return 0; // cancelled
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(Math.floor(n), 999); // safety cap
  };

  const addRowToSheet = (row) => {
    const p = row?.product;
    const sku = toStr(row?.selectedSku);
    if (!p || !sku) return;

    const qty = askQty(1);
    if (!qty) return;

    const barcodePng = barcodeToPngDataUrl(sku);
    if (!barcodePng) return;

    const title = safe(p?.title || "");
    const productCode = safe(p?.productCode || row.code || "");
    const size = safe(row?.selectedSize || "—");

    setSheet((prev) => {
      const next = [...prev];
      for (let i = 0; i < qty; i++) {
        next.push({
          id: `${productCode}-${sku}-${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`,
          productCode,
          title,
          sku,
          size,
          barcodePng,
        });
      }
      return next;
    });
  };

  const clearSheet = () => setSheet([]);

  const removeOne = (id) => setSheet((prev) => prev.filter((x) => x.id !== id));

  /* =========================================================
     PRINT SHEET (2x1 inch labels)
     ========================================================= */
  const printSheet = () => {
    if (!sheet.length) return;

    // Build HTML with exact inch sizing
    const html = `
      <html>
        <head>
          <title>Barcodes</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; font-family: Arial, sans-serif; }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, ${LABEL_W_IN}in);
              grid-auto-rows: ${LABEL_H_IN}in;
              gap: 2mm;
              align-content: start;
            }
            .label {
              width: ${LABEL_W_IN}in;
              height: ${LABEL_H_IN}in;
              border: 1px solid #ddd;
              box-sizing: border-box;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2mm;
              overflow: hidden;
            }
            .label img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
            }
            .meta { display:none; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${sheet
              .map(
                (x) => `
                <div class="label">
                  <img src="${x.barcodePng}" alt="${x.sku}" />
                </div>
              `
              )
              .join("")}
          </div>
          <script>
            window.onload = function(){ window.print(); };
          </script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  /* =========================================================
     PDF SHEET (A4, auto paginate)
     2x1 inch label boxes (50.8mm x 25.4mm)
     ========================================================= */
  const downloadSheetPdf = async () => {
    if (!sheet.length) return;

    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth(); // ~210
      const pageH = doc.internal.pageSize.getHeight(); // ~297

      const margin = 10; // mm
      const gap = 2; // mm

      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const cols = Math.max(
        1,
        Math.floor((usableW + gap) / (LABEL_W_MM + gap))
      );
      const rows = Math.max(
        1,
        Math.floor((usableH + gap) / (LABEL_H_MM + gap))
      );

      const perPage = cols * rows;

      const drawLabel = (x, y, item) => {
        // optional light border
        doc.setDrawColor(220);
        doc.rect(x, y, LABEL_W_MM, LABEL_H_MM);

        // barcode image inside label (leave tiny padding)
        const pad = 1.5; // mm
        const imgX = x + pad;
        const imgY = y + pad;
        const imgW = LABEL_W_MM - pad * 2;
        const imgH = LABEL_H_MM - pad * 2;

        doc.addImage(item.barcodePng, "PNG", imgX, imgY, imgW, imgH, undefined, "FAST");
      };

      for (let i = 0; i < sheet.length; i++) {
        const pageIndex = Math.floor(i / perPage);
        const idxInPage = i % perPage;

        if (i > 0 && idxInPage === 0) doc.addPage();

        const r = Math.floor(idxInPage / cols);
        const c = idxInPage % cols;

        const x = margin + c * (LABEL_W_MM + gap);
        const y = margin + r * (LABEL_H_MM + gap);

        drawLabel(x, y, sheet[i]);
      }

      doc.save(`barcodes_${LABEL_W_IN}x${LABEL_H_IN}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  /* ---------------- derived ---------------- */
  const loadedOkCount = useMemo(
    () => loaded.filter((r) => r.product && r.selectedSku && !r.error).length,
    [loaded]
  );

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Barcode Sheet Generator
            </h1>
            <p className="text-sm text-neutral-600">
              Label size: <span className="font-mono">2 × 1 inch</span> (length × breadth)
            </p>
          </div>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
            /production/barcode
          </span>
        </div>

        {/* Input */}
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="text-xs font-medium text-neutral-700">
            Product Codes (comma / space separated)
          </label>

          <div className="mt-1 flex flex-col gap-2 md:flex-row">
            <input
              value={inputCodes}
              onChange={(e) => setInputCodes(e.target.value)}
              placeholder="e.g. 00123, 00124, 00125"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") loadProducts();
              }}
            />
            <button
              onClick={loadProducts}
              disabled={storeLoading || loadingCodes}
              className="whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loadingCodes || storeLoading ? "Loading..." : "Load Products"}
            </button>
          </div>

          {loadError ? (
            <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-red-600">
              {loadError}
            </div>
          ) : null}

          {loaded.length ? (
            <div className="mt-3 text-xs text-neutral-600">
              Loaded: <span className="font-mono">{loaded.length}</span> • Ready:{" "}
              <span className="font-mono">{loadedOkCount}</span>
            </div>
          ) : null}
        </div>

        {/* Loaded products list */}
        {loaded.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {loaded.map((row) => {
              const p = row.product;
              const img = row.img;

              return (
                <div
                  key={row.code}
                  className="rounded-2xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex gap-3">
                    <div className="relative h-24 w-20 overflow-hidden rounded-xl bg-neutral-50">
                      {img ? (
                        <Image
                          src={img}
                          alt={safe(p?.title)}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-neutral-100" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-neutral-900">
                        {p ? safe(p?.title) : "Not found"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        Code: <span className="font-mono">{row.code}</span>
                      </div>

                      {p ? (
                        <div className="text-xs text-neutral-600">
                          Type:{" "}
                          <span className="font-mono">
                            {row.isVariable ? "variable" : "simple"}
                          </span>
                        </div>
                      ) : null}

                      {row.error ? (
                        <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-red-600">
                          {row.error}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Size/SKU select */}
                  <div className="mt-3 grid gap-2">
                    <label className="text-xs font-medium text-neutral-700">
                      {p ? (row.isVariable ? "Size (auto SKU)" : "SKU") : "Size / SKU"}
                    </label>

                    {p && row.isVariable ? (
                      <select
                        value={row.selectedSize}
                        onChange={(e) => onSelectSize(row.code, e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      >
                        {row.skuOptions.length ? (
                          row.skuOptions.map((o) => (
                            <option key={o.size} value={o.size}>
                              {o.size} — {o.sku}
                            </option>
                          ))
                        ) : (
                          <option value="">No SKU found</option>
                        )}
                      </select>
                    ) : (
                      <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
                        <span className="font-mono">{row.selectedSku || "—"}</span>
                      </div>
                    )}

                    <div className="text-xs text-neutral-500">
                      Selected SKU:{" "}
                      <span className="font-mono">{row.selectedSku || "—"}</span>
                    </div>

                    {/* Quick preview (2x1 inch visual) */}
                    {p && row.selectedSku ? (
                      <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="text-xs text-neutral-600 mb-2">
                          Preview (2×1 inch)
                        </div>
                        <div
                          className="border border-neutral-200 bg-white overflow-hidden"
                          style={{
                            width: `${LABEL_W_IN}in`,
                            height: `${LABEL_H_IN}in`,
                          }}
                        >
                          {/* barcode image scaled to label size */}
                          <img
                            src={barcodeToPngDataUrl(row.selectedSku)}
                            alt={row.selectedSku}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => addRowToSheet(row)}
                        disabled={!p || !row.selectedSku || !!row.error}
                        className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Add to Sheet (asks qty)
                      </button>

                      <button
                        onClick={() => {
                          // quick fix: reload this one code
                          setInputCodes(row.code);
                          loadProducts();
                        }}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                      >
                        Reload
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Sheet controls */}
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold">Print Sheet</div>
              <div className="text-xs text-neutral-600">
                Total labels in sheet:{" "}
                <span className="font-mono">{sheet.length}</span> • Size:{" "}
                <span className="font-mono">2×1 inch</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={printSheet}
                disabled={!sheet.length}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                Print All
              </button>

              <button
                onClick={downloadSheetPdf}
                disabled={!sheet.length || exportingPdf}
                className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {exportingPdf ? "Creating PDF..." : "Download Sheet PDF"}
              </button>

              <button
                onClick={clearSheet}
                disabled={!sheet.length}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                Clear Sheet
              </button>
            </div>
          </div>

          {/* Sheet preview list (compact) */}
          {sheet.length ? (
            <div className="mt-4">
              <div className="text-xs text-neutral-600 mb-2">
                Sheet items (remove any if needed):
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sheet.slice(0, 12).map((x) => (
                  <div
                    key={x.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-neutral-900">
                          {x.title || "—"}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-600">
                          Code: <span className="font-mono">{x.productCode}</span>
                        </div>
                        <div className="text-[11px] text-neutral-600">
                          SKU: <span className="font-mono">{x.sku}</span>
                        </div>
                        <div className="text-[11px] text-neutral-600">
                          Size: <span className="font-mono">{x.size}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeOne(x.id)}
                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs hover:bg-neutral-100"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-2 border border-neutral-200 bg-white">
                      <img
                        src={x.barcodePng}
                        alt={x.sku}
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {sheet.length > 12 ? (
                <div className="mt-2 text-xs text-neutral-500">
                  Showing first 12 previews. PDF/Print will include all{" "}
                  <span className="font-mono">{sheet.length}</span> labels.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-xs text-neutral-500">
              Add items from the product list using{" "}
              <span className="font-mono">Add to Sheet</span> (it will ask qty).
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Notes: PDF/Print uses exact label size{" "}
          <span className="font-mono">2×1 inch</span>. Printer scaling should be set to
          <span className="font-mono"> Actual size / 100%</span> for perfect output.
        </div>
      </div>
    </div>
  );
}
