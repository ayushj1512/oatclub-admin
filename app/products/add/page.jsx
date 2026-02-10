"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";

import CategoryMultiSelect from "@/components/product/CategoryMultiSelect";
import AttributeSelector from "@/components/product/AttributeSelector";
import ProductVariantsEditor from "@/components/product/ProductVariantsEditor";
import ProductImagesEditor from "@/components/product/ProductImagesEditor";
import ProductContentEditor from "@/components/product/ProductContentEditor";
import ProductAdvancedFields from "@/components/product/ProductAdvancedFields";
import CrossSellSelector from "@/components/product/CrossSellSelector";
import CollectionMultiSelect from "@/components/product/CollectionMultiSelect";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ✅ show HSN only for apparels
const isApparelCategory = (categories) => {
  const cats = Array.isArray(categories)
    ? categories
    : typeof categories === "string"
      ? categories.split(",")
      : [];

  return cats
    .map((c) => String(c || "").trim().toLowerCase())
    .some((c) => ["apparel", "apparels", "clothing", "garments"].includes(c));
};

// ✅ parse "a, b, c" OR JSON array string -> ["a","b","c"]
const parseList = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  if (typeof v !== "string") return [];
  const t = v.trim();
  if (!t) return [];
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {}
  return t.split(",").map((x) => x.trim()).filter(Boolean);
};

// ✅ parse specifications from UI input
// supports: [{key,value}] OR JSON string OR object OR "Key:Val|Key2:Val2"
const parseSpecs = (v) => {
  const out = [];
  const push = (k, val) => {
    const key = String(k ?? "").trim();
    const value = String(val ?? "").trim();
    if (!key) return;
    out.push({ key, value });
  };

  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    try {
      v = JSON.parse(t);
    } catch {
      const parts = t.includes("|") ? t.split("|") : t.split(",");
      for (const p of parts) {
        const s = String(p || "").trim();
        if (!s) continue;
        const sep = s.includes(":") ? ":" : s.includes("=") ? "=" : null;
        if (!sep) continue;
        const [k, ...rest] = s.split(sep);
        push(k, rest.join(sep));
      }
      return out;
    }
  }

  if (Array.isArray(v)) {
    v.forEach((row) => row && push(row.key, row.value));
    return out;
  }

  if (v && typeof v === "object") {
    Object.entries(v).forEach(([k, val]) => push(k, val));
    return out;
  }

  return [];
};

export default function AddProductPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [allAttributes, setAllAttributes] = useState([]);
  const [collections, setCollections] = useState([]);

  const [form, setForm] = useState({
    /* BASIC */
    title: "",
    price: "",
    compareAtPrice: "",
    categories: [],

    /* ✅ HSN (Apparels) */
    hsnCode: "62105000",

    /* CONTENT (NEW SCHEMA FIELDS ✅) */
    shortDescription: "",
    howToStyle: "",
    fabricDetails: "",
    keyFeaturesText: "", // comma separated
    specificationsText: "", // "Key:Val|Key2:Val2" OR JSON

    /* TAGS + COLORS */
    tagsText: "",
    colorsText: "",

    /* MEDIA */
    images: [],
    thumbnail: "",

    /* CROSS SELL */
    crossSellProducts: [],

    /* ATTRIBUTES / VARIANTS */
    attributes: [],
    variants: [],

    /* ADVANCED */
    highlights: [], // legacy (kept if ProductAdvancedFields uses it)
    collections: [],
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0, unit: "cm" },

    metaTitle: "",
    metaDescription: "",
    keywords: [],

    isActive: true,
    isFeatured: false,
    isDraft: false,
  });

  const showHsnCode = useMemo(
    () => isApparelCategory(form.categories),
    [form.categories]
  );

  /* ---------------- LOAD MASTER DATA ---------------- */
  useEffect(() => {
    fetch(`${API}/api/attributes`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAllAttributes(Array.isArray(d) ? d : []))
      .catch(() => setAllAttributes([]));

    fetch(`${API}/api/collections`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCollections(Array.isArray(d) ? d : []))
      .catch(() => setCollections([]));
  }, []);

  /* ---------------- SAVE ---------------- */
  const saveProduct = async () => {
    if (!form.title || !form.price || !form.categories.length) {
      alert("Title, Price & Category are required");
      return;
    }

    if (!form.images.length) {
      alert("At least one product image is required");
      return;
    }

    // ✅ HSN validation only for apparels
    if (showHsnCode) {
      const hsn = String(form.hsnCode ?? "").trim();
      if (!hsn) return alert("HSN Code is required for Apparels");
      if (!/^\d+$/.test(hsn)) return alert("HSN Code must be numeric only");
    }

    setSaving(true);

    const tags = parseList(form.tagsText).map((t) => t.toLowerCase());
    const colors = parseList(form.colorsText).map((c) => c.toLowerCase());

    const keyFeatures = parseList(form.keyFeaturesText);
    const specifications = parseSpecs(form.specificationsText);

    const payload = {
      title: form.title,
      price: toNum(form.price),
      compareAtPrice: form.compareAtPrice === "" ? null : toNum(form.compareAtPrice),

      categories: form.categories,

      ...(showHsnCode ? { hsnCode: String(form.hsnCode ?? "").trim() } : {}),

      // ✅ NEW schema fields
      shortDescription: String(form.shortDescription || "").trim(),
      howToStyle: String(form.howToStyle || "").trim(),
      fabricDetails: String(form.fabricDetails || "").trim(),
      keyFeatures,
      specifications,

      // ✅ Images and thumbnail
      images: form.images,
      thumbnail: form.images?.[0] || "",

      tags,
      colors,

      attributes: form.attributes,
      variants: form.variants,

      crossSellProducts: form.crossSellProducts,

      /* ADVANCED */
      highlights: form.highlights, // harmless (backend maps highlights -> keyFeatures if keyFeatures missing)
      collections: form.collections,
      weight: toNum(form.weight),
      dimensions: form.dimensions,

      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      keywords: form.keywords,

      isActive: Boolean(form.isActive),
      isFeatured: Boolean(form.isFeatured),
      isDraft: Boolean(form.isDraft),
    };

    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Create failed");

      alert("✅ Product created successfully");
      router.push("/products");
    } catch (e) {
      alert(e.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <section className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="w-full max-w-full mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Add Product</h1>
            <p className="text-sm text-gray-600">Create a new product for your store</p>
          </div>

          <button
            onClick={saveProduct}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Create"}
          </button>
        </div>

        {/* BASIC */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Basic Info</h2>

          <input
            placeholder="Product title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="input"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              className="input"
            />
            <input
              placeholder="Compare at price"
              value={form.compareAtPrice}
              onChange={(e) => setForm((p) => ({ ...p, compareAtPrice: e.target.value }))}
              className="input"
            />
          </div>

          {/* COLORS */}
          <div className="space-y-1">
            <input
              placeholder="Colors (comma-separated) e.g. red, black, navy"
              value={form.colorsText}
              onChange={(e) => setForm((p) => ({ ...p, colorsText: e.target.value }))}
              className="input"
            />
            <p className="text-xs text-gray-500">
              Stored at product level for filtering.
            </p>
          </div>

          {/* HSN */}
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold">HSN Code {showHsnCode ? "(Apparels)" : ""}</h3>
              <p className="text-sm text-gray-500">
                Default HSN: <span className="font-medium">62105000</span>
              </p>
            </div>

            <input
              placeholder="HSN Code (numeric only)"
              inputMode="numeric"
              value={form.hsnCode}
              onChange={(e) => {
                const digitsOnly = String(e.target.value || "").replace(/[^\d]/g, "");
                setForm((p) => ({ ...p, hsnCode: digitsOnly }));
              }}
              className="input"
              disabled={!showHsnCode}
            />

            {!showHsnCode ? (
              <p className="text-xs text-gray-500">
                (HSN is used for apparels. Enable by selecting Apparel/Clothing category.)
              </p>
            ) : (
              <p className="text-xs text-gray-500">*Only digits allowed.</p>
            )}
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Categories</h2>
          <CategoryMultiSelect
            value={form.categories}
            onChange={(next) => setForm((p) => ({ ...p, categories: next }))}
          />
        </div>

        {/* IMAGES */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Product Images</h2>

          <ProductImagesEditor
            value={form.images}
            folder="miray/products"
            onChange={(urls) =>
              setForm((p) => ({ ...p, images: urls, thumbnail: urls?.[0] || "" }))
            }
          />
        </div>

        {/* CONTENT (UPDATED: includes all new fields) */}
        <ProductContentEditor
          editable
          value={{
            shortDescription: form.shortDescription,
            howToStyle: form.howToStyle,
            fabricDetails: form.fabricDetails,
            keyFeaturesText: form.keyFeaturesText,
            specificationsText: form.specificationsText,
            tagsText: form.tagsText,
          }}
          onChange={(next) => setForm((p) => ({ ...p, ...next }))}
        />

        {/* ATTRIBUTES */}
        <AttributeSelector
          editable
          value={form.attributes}
          allAttributes={allAttributes}
          onChange={(next) => setForm((p) => ({ ...p, attributes: next }))}
        />

        {/* VARIANTS */}
        {form.attributes.length > 0 && (
          <ProductVariantsEditor
            editable
            value={form.variants}
            onChange={(next) => setForm((p) => ({ ...p, variants: next }))}
          />
        )}

        {/* CROSS SELL */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Cross-sell Products</h2>

          <CrossSellSelector
            value={form.crossSellProducts}
            onChange={(next) => setForm((p) => ({ ...p, crossSellProducts: next }))}
          />
        </div>

        {/* COLLECTIONS */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Collections (Optional)</h2>
          <p className="text-sm text-gray-500">Assign this product to one or more collections</p>

          <CollectionMultiSelect
            collections={collections}
            value={form.collections}
            onChange={(next) => setForm((p) => ({ ...p, collections: next }))}
          />
        </div>

        {/* ADVANCED */}
        <ProductAdvancedFields
          value={form}
          collections={collections}
          editable
          onChange={(next) => setForm(next)}
        />
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border-radius: 0.75rem;
          outline: none;
        }
      `}</style>
    </section>
  );
}
