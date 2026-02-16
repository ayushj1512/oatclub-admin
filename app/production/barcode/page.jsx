// app/production/barcode/page.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";

import { useAdminProductStore } from "@/store/adminProductStore";

/* ---------------- helpers ---------------- */
const pad5 = (v) => {
  const digits = String(v ?? "").trim().replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.slice(-5).padStart(5, "0");
};
const safe = (v) => (v == null ? "" : String(v));
const toStr = (v) => String(v ?? "").trim();
const normalizeSize = (v) => toStr(v).toUpperCase();

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

// image url -> dataURL for PDF (works only if host allows CORS)
async function urlToDataUrl(url) {
  if (!url) return "";
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BarcodePage() {
  const canvasRef = useRef(null);

  // ✅ use store
  const storeLoading = useAdminProductStore((s) => s.loading);
  const fetchProducts = useAdminProductStore((s) => s.fetchProducts);

  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState(null);

  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedSku, setSelectedSku] = useState("");

  const [exportingPdf, setExportingPdf] = useState(false);

  const isVariable = useMemo(() => {
    const v = Array.isArray(product?.variants) ? product.variants : [];
    return v.length > 0;
  }, [product]);

  const img = useMemo(() => getBestImage(product), [product]);

  const skuOptions = useMemo(() => {
    const p = product;
    if (!p) return [];

    const variants = Array.isArray(p.variants) ? p.variants : [];
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
  }, [product]);

  const barcodeValue = useMemo(() => toStr(selectedSku), [selectedSku]);

  /* ---------------- load product (via store) ---------------- */
  async function loadByProductCode(rawCode) {
    const code = pad5(rawCode);
    if (!code) {
      setError("Enter a valid product code.");
      return;
    }

    setError("");
    setProduct(null);
    setSelectedSize("");
    setSelectedSku("");

    try {
      // ✅ store fetch (puts products into store, but we also capture first result)
      await fetchProducts({ productCode: code, page: 1, limit: 1 });

      // read latest state directly from zustand
      const { products } = useAdminProductStore.getState();
      const p = Array.isArray(products) ? products[0] : null;

      if (!p) {
        setError(`No product found for code ${code}`);
        return;
      }

      setProduct(p);

      // auto pick first sku
      if (Array.isArray(p.variants) && p.variants.length) {
        const opts = [];
        const map = new Map();
        for (const v of p.variants) {
          const size = normalizeSize(getVariantSize(v));
          const sku = toStr(v?.sku);
          if (!size || !sku) continue;
          if (!map.has(size)) map.set(size, sku);
        }
        map.forEach((sku, size) => opts.push({ size, sku }));
        opts.sort((a, b) => a.size.localeCompare(b.size));

        if (opts.length) {
          setSelectedSize(opts[0].size);
          setSelectedSku(opts[0].sku);
        } else {
          setError("Product found, but variant SKUs are missing.");
        }
        return;
      }

      // simple product
      const sku = toStr(p?.sku);
      if (sku) {
        setSelectedSize("—");
        setSelectedSku(sku);
      } else {
        setError("Product found, but SKU not set yet.");
      }
    } catch (e) {
      setError(e?.message || "Something went wrong");
    }
  }

  /* ---------------- generate barcode ---------------- */
  useEffect(() => {
    if (!barcodeValue) return;
    if (!canvasRef.current) return;

    try {
      setError("");
      JsBarcode(canvasRef.current, barcodeValue, {
        format: "CODE128",
        displayValue: true,
        margin: 14,
        fontSize: 14,
        textMargin: 6,
        height: 92,
      });
    } catch {
      setError("Barcode generation failed. Ensure SKU is valid.");
    }
  }, [barcodeValue]);

  const onSelectSize = (size) => {
    const s = normalizeSize(size);
    setSelectedSize(s);
    const hit = skuOptions.find((x) => x.size === s);
    setSelectedSku(hit?.sku || "");
  };

  /* ---------------- exports ---------------- */
  const downloadPng = () => {
    const c = canvasRef.current;
    if (!c || !barcodeValue) return;

    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${barcodeValue}.png`;
    a.click();
  };

  const downloadPdf = async () => {
    const c = canvasRef.current;
    if (!c || !barcodeValue) return;

    setExportingPdf(true);
    try {
      const barcodePng = c.toDataURL("image/png");

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 16;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("SKU Barcode", margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Product: ${safe(product?.title || "—")}`, margin, y);
      y += 6;
      doc.text(`Product Code: ${safe(product?.productCode || "—")}`, margin, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text(`SKU: ${barcodeValue}`, margin, y);
      y += 10;

      // optional product image
      const imgData = await urlToDataUrl(img);
      if (imgData) {
        const imgW = 38;
        const imgH = 52;
        doc.setDrawColor(220);
        doc.rect(margin, y, imgW, imgH);
        // If your images are PNG, jsPDF still usually accepts as "PNG" when dataURL starts with image/png
        const fmt = imgData.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(imgData, fmt, margin, y, imgW, imgH, undefined, "FAST");
      }

      // barcode on right
      const barcodeBoxX = imgData ? margin + 44 : margin;
      const barcodeW = pageW - barcodeBoxX - margin;
      const barcodeH = 40;

      doc.setDrawColor(220);
      doc.rect(barcodeBoxX, y, barcodeW, barcodeH);
      doc.addImage(
        barcodePng,
        "PNG",
        barcodeBoxX + 3,
        y + 3,
        barcodeW - 6,
        barcodeH - 6,
        undefined,
        "FAST"
      );

      y += imgData ? 58 : 46;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text("Generated from Miray Production Panel", margin, y);

      const blob = doc.output("blob");
      downloadBlob(blob, `${barcodeValue}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  const printBarcode = () => {
    const c = canvasRef.current;
    if (!c || !barcodeValue) return;

    const dataUrl = c.toDataURL("image/png");
    const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=640");
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <title>${barcodeValue}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .wrap { display: grid; gap: 12px; }
            .sku { font-size: 18px; font-weight: 800; color: #111; }
            .meta { font-size: 12px; color: #555; }
            img.bar { max-width: 640px; width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="sku">${barcodeValue}</div>
            <div class="meta">${safe(product?.title || "")} • Code: ${safe(
      product?.productCode || ""
    )}</div>
            <img class="bar" src="${dataUrl}" />
          </div>
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const canExport = !!barcodeValue && !!product;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ✅ full width (no max-w) */}
      <div className="px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Barcode Generator
            </h1>
            <p className="text-sm text-neutral-600">
              Product Code → Size/SKU → Barcode → Print / PNG / PDF
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
              /production/barcode
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[420px_1fr]">
          {/* Left */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <label className="text-xs font-medium text-neutral-700">
              Product Code
            </label>

            <div className="mt-1 flex gap-2">
              <input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="e.g. 00123"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadByProductCode(productCode);
                }}
              />
              <button
                onClick={() => loadByProductCode(productCode)}
                disabled={storeLoading}
                className="whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {storeLoading ? "Loading..." : "Load"}
              </button>
            </div>

            <p className="mt-1 text-xs text-neutral-500">
              Auto pads to 5 digits: <span className="font-mono">00123</span>
            </p>

            {error ? (
              <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {/* Product preview */}
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-start gap-3">
                <div className="relative h-24 w-20 overflow-hidden rounded-xl bg-white">
                  {img ? (
                    <Image
                      src={img}
                      alt={safe(product?.title)}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-white" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-neutral-900">
                    {product ? safe(product?.title) : "No product loaded"}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    Code:{" "}
                    <span className="font-mono">
                      {product ? safe(product?.productCode) : "—"}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600">
                    Type:{" "}
                    <span className="font-mono">
                      {product ? (isVariable ? "variable" : "simple") : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Size/SKU */}
              <div className="mt-3 grid gap-2">
                <label className="text-xs font-medium text-neutral-700">
                  {product ? (isVariable ? "Size (auto SKU)" : "SKU") : "Size / SKU"}
                </label>

                {product && isVariable ? (
                  <select
                    value={selectedSize}
                    onChange={(e) => onSelectSize(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  >
                    {skuOptions.length ? (
                      skuOptions.map((o) => (
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
                    <span className="font-mono">{barcodeValue || "—"}</span>
                  </div>
                )}

                <div className="text-xs text-neutral-500">
                  Selected SKU:{" "}
                  <span className="font-mono">{barcodeValue || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">Barcode</div>
                <div className="text-xs text-neutral-600">
                  Format: <span className="font-mono">CODE128</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={printBarcode}
                  disabled={!canExport}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Print
                </button>
                <button
                  onClick={downloadPng}
                  disabled={!canExport}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Download PNG
                </button>
                <button
                  onClick={downloadPdf}
                  disabled={!canExport || exportingPdf}
                  className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {exportingPdf ? "Creating PDF..." : "Download PDF"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="overflow-x-auto">
                <canvas ref={canvasRef} />
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                Files saved as:{" "}
                <span className="font-mono">
                  {barcodeValue || "SKU"}.png / {barcodeValue || "SKU"}.pdf
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              PDF includes product title + code + barcode (image appears only if your
              image host allows CORS).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
