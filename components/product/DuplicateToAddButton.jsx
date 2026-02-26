"use client";

import React, { useMemo, useState } from "react";
import { Copy, Loader2 } from "lucide-react";

const s = (v) => (v == null ? "" : String(v));
const n = (v, fb = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
};
const safeArr = (v) => (Array.isArray(v) ? v : []);

function buildPrefillFromProduct(product, opts = {}) {
  const {
    stripColors = true, // you said color thing nahi karte
    stripSkuBarcode = true,
    forceDraft = true,
  } = opts;

  const images = safeArr(product?.images).filter(Boolean);

  const keyFeaturesText = safeArr(product?.keyFeatures).filter(Boolean).join(", ");
  const tagsText = safeArr(product?.tags).filter(Boolean).join(", ");
  const colorsText = stripColors ? "" : safeArr(product?.colors).filter(Boolean).join(", ");

  const specificationsText = safeArr(product?.specifications)
    .filter((r) => r && (r.key || r.value))
    .map((r) => `${s(r.key).trim()}:${s(r.value).trim()}`)
    .join(" | ");

  const variants = safeArr(product?.variants).map((v) => ({
    // remove _id so it behaves like new rows
    sku: stripSkuBarcode ? "" : s(v?.sku),
    barcode: stripSkuBarcode ? "" : s(v?.barcode),
    weight: n(v?.weight),
    patternNumber: stripSkuBarcode ? "" : s(v?.patternNumber),
    attributes: safeArr(v?.attributes),
  }));

  const attributes = safeArr(product?.attributes).map((a) => ({
    attribute: a?.attribute || null,
    key: s(a?.key).trim(),
    values: safeArr(a?.values),
    mode: a?.attribute ? "select" : "custom",
  }));

  const crossSellProducts = safeArr(product?.crossSellProducts).map((x) =>
    typeof x === "string" ? x : x?._id,
  );

  return {
    // Add page form fields
    title: `${s(product?.title).trim()} (Copy)`,
    price: s(product?.price ?? ""),
    compareAtPrice: product?.compareAtPrice ?? "",
    categories: safeArr(product?.categories),

    hsnCode: s(product?.hsnCode || "62105000"),

    shortDescription: s(product?.shortDescription),
    howToStyle: s(product?.howToStyle),
    fabricDetails: s(product?.fabricDetails),
    keyFeaturesText,
    specificationsText,

    tagsText,
    colorsText,

    fabrics: safeArr(product?.fabrics),

    images,
    thumbnail: images?.[0] || "",

    crossSellProducts,

    attributes,
    variants,

    highlights: safeArr(product?.highlights),
    collections: safeArr(product?.collections),
    weight: n(product?.weight),
    dimensions: product?.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },

    metaTitle: s(product?.metaTitle),
    metaDescription: s(product?.metaDescription),
    keywords: safeArr(product?.keywords),

    // draft mode
    isActive: forceDraft ? false : !!product?.isActive,
    isFeatured: !!product?.isFeatured,
    isDraft: forceDraft ? true : !!product?.isDraft,

    // your new field
    originalProductLink: s(product?.originalProductLink),
  };
}

export default function DuplicateToAddButton({
  product, // pass full product from slug page
  className = "",
  label = "Duplicate",
  stripColors = true,
  stripSkuBarcode = true,
  forceDraft = true,
  onError,
}) {
  const [busy, setBusy] = useState(false);

  const can = useMemo(() => !!product && !!product?._id, [product]);

  const handleDuplicate = () => {
    if (!can) return;
    try {
      setBusy(true);

      const payload = buildPrefillFromProduct(product, {
        stripColors,
        stripSkuBarcode,
        forceDraft,
      });

      const key = `dup_prefill_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      localStorage.setItem(key, JSON.stringify(payload));

      // open add page in new tab with key
      const url = `/products/add?dupKey=${encodeURIComponent(key)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("DuplicateToAddButton error:", e);
      onError?.(e);
      alert(e?.message || "Failed to duplicate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={!can || busy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-60 ${className}`}
      title="Open Add Product in new tab with prefilled data"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
      {busy ? "Duplicating…" : label}
    </button>
  );
}