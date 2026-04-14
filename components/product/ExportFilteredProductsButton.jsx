"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const PAGE_SIZE = 100;

const join = (value, separator = ", ") => {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (item == null) return "";
      if (typeof item === "string") return item;
      if (typeof item === "object") {
        return item.name || item.slug || item.label || item.value || "";
      }
      return String(item);
    })
    .filter(Boolean)
    .join(separator);
};

const bool = (v) => (v ? "Yes" : "No");

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN");
};

const getStatus = (product) => {
  if (!product?.isActive) return "Unpublished";
  if (product?.isDraft) return "Draft";
  return "Published";
};

const getVariantSummary = (variants = []) => {
  if (!Array.isArray(variants) || !variants.length) return "";
  return variants
    .map((variant) => {
      const attrs = Array.isArray(variant?.attributes)
        ? variant.attributes
            .map((a) => `${a?.key || "Attr"}:${a?.value || ""}`)
            .filter(Boolean)
            .join(" | ")
        : "";

      return [
        variant?.sku ? `SKU:${variant.sku}` : "",
        attrs,
        typeof variant?.stock === "number" ? `Stock:${variant.stock}` : "",
        variant?.isInStock ? "In Stock:Yes" : "In Stock:No",
      ]
        .filter(Boolean)
        .join(" • ");
    })
    .join(" || ");
};

const flattenProduct = (p = {}) => ({
  "Product ID": p._id || "",
  "Product Code": p.productCode || "",
  Title: p.title || "",
  Slug: p.slug || "",
  SKU: p.sku || "",
  Type: p.productType || "",
  Status: getStatus(p),

  Price: p.price ?? "",
  "Compare At Price": p.compareAtPrice ?? "",
  Currency: p.currency || "",
  "Tax Class": p.taxClass || "",

  Stock: p.stock ?? "",
  "Reserved Stock": p.reservedStock ?? "",
  "Available Stock": p.availableStock ?? "",
  "In Stock": bool(p.isInStock),

  Categories: join(p.categories),
  Collections: join(p.collections),
  Tags: join(p.tags),
  Colors: join(p.colors),
  Keywords: join(p.keywords),

  "Thumbnail Image": p.thumbnail || p.images?.[0] || "",
  "Image 1": p.images?.[0] || "",
  "Image 2": p.images?.[1] || "",
  "Image 3": p.images?.[2] || "",
  "Image 4": p.images?.[3] || "",
  "All Images": join(p.images),

  "Short Description": p.shortDescription || "",
  "How To Style": p.howToStyle || "",
  "Key Features": join(p.keyFeatures),
  "Fabric Details": p.fabricDetails || "",
  "HSN Code": p.hsnCode || "",

  Active: bool(p.isActive),
  Draft: bool(p.isDraft),
  Featured: bool(p.isFeatured),
  "Best Seller": bool(p.isBestSeller),
  Trending: bool(p.isTrending),
  "Pattern Ready": bool(p.isPatternReady),
  "Sampling Done": bool(p.isSamplingDone),
  "Primary Product": bool(p.isPrimaryProduct),

  "Average Rating": p.averageRating ?? "",
  "Total Reviews": p.totalReviews ?? "",

  "Analytics Views": p.analytics?.views ?? "",
  "Analytics Purchases": p.analytics?.purchases ?? "",
  "Analytics Wishlist Count": p.analytics?.wishlistCount ?? "",
  "Analytics Cart Adds": p.analytics?.cartAdds ?? "",
  "Analytics Search Appearances": p.analytics?.searchAppearances ?? "",

  "Dimension Length": p.dimensions?.length ?? "",
  "Dimension Width": p.dimensions?.width ?? "",
  "Dimension Height": p.dimensions?.height ?? "",
  "Dimension Unit": p.dimensions?.unit || "",

  "Avg Fabric Consumption Value": p.avgFabricConsumption?.value ?? "",
  "Avg Fabric Consumption Unit": p.avgFabricConsumption?.unit || "",

  "Variants Count": Array.isArray(p.variants) ? p.variants.length : 0,
  "Variants Summary": getVariantSummary(p.variants),

  "Original Product Link": p.originalProductLink || "",
  "External URL": p.externalURL || "",

  "Publish At": formatDate(p.publishAt),
  "Created At": formatDate(p.createdAt),
  "Updated At": formatDate(p.updatedAt),
});

const setHyperlinkCell = (sheet, cellAddress, url, label = "Open Link") => {
  if (!url) return;

  sheet[cellAddress] = {
    t: "s",
    v: label,
    l: { Target: url, Tooltip: url },
    s: {
      font: { color: { rgb: "2563EB" }, underline: true },
      alignment: { vertical: "center", horizontal: "center" },
    },
  };
};

const improveSheet = (sheet, rows) => {
  const headers = Object.keys(rows?.[0] || {});
  if (!headers.length) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);

  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: range.e.r, c: range.e.c },
    }),
  };

  sheet["!cols"] = headers.map((header) => {
    if (
      header.includes("Description") ||
      header.includes("Summary") ||
      header.includes("How To Style") ||
      header.includes("Key Features")
    ) {
      return { wch: 42 };
    }

    if (
      header.includes("Image") ||
      header.includes("Link") ||
      header.includes("URL")
    ) {
      return { wch: 16 };
    }

    if (
      header.includes("Title") ||
      header.includes("Slug") ||
      header.includes("Categories") ||
      header.includes("Collections") ||
      header.includes("Tags") ||
      header.includes("Colors")
    ) {
      return { wch: 28 };
    }

    return { wch: Math.min(Math.max(header.length + 4, 14), 24) };
  });

  headers.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    if (!sheet[cellAddress]) return;

    sheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "059669" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  });

  const linkColumns = [
    "Thumbnail Image",
    "Image 1",
    "Image 2",
    "Image 3",
    "Image 4",
    "Original Product Link",
    "External URL",
  ];

  rows.forEach((row, rowIndex) => {
    linkColumns.forEach((key) => {
      const colIndex = headers.indexOf(key);
      if (colIndex === -1) return;

      const value = row[key];
      if (!value) return;

      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });

      const label =
        key === "Thumbnail Image"
          ? "Open Image"
          : key.startsWith("Image ")
            ? "Open Image"
            : "Open Link";

      setHyperlinkCell(sheet, cellAddress, value, label);
    });
  });
};

export default function ExportFilteredProductsButton({
  buildQuery,
  fileName = "products-export",
  endpoint = "/api/products",
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  const btnClass = useMemo(
    () =>
      className ||
      "group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60",
    [className]
  );

  const fetchPage = async (page) => {
    const query = {
      ...buildQuery(page),
      page,
      limit: PAGE_SIZE,
    };

    const qs = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) return;
      qs.append(key, String(value));
    });

    const res = await fetch(`${API}${endpoint}?${qs.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch products for export");
    }

    return res.json();
  };

  const handleDownload = async () => {
    try {
      setLoading(true);

      const first = await fetchPage(1);
      const totalPages = Number(first?.pages || 1);

      let allProducts = Array.isArray(first?.products) ? [...first.products] : [];

      for (let current = 2; current <= totalPages; current += 1) {
        const next = await fetchPage(current);
        if (Array.isArray(next?.products)) {
          allProducts = [...allProducts, ...next.products];
        }
      }

      const rows = allProducts.map(flattenProduct);

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);

      improveSheet(worksheet, rows);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Products");

      XLSX.writeFile(
        workbook,
        `${fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert(error?.message || "Failed to export products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={loading} className={btnClass}>
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Download
          size={16}
          className="transition-transform duration-200 group-hover:-translate-y-0.5"
        />
      )}
      <span>{loading ? "Exporting..." : "Export Filtered"}</span>
    </button>
  );
}