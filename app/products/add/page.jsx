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

    /* CONTENT */
    shortDescription: "",
    description: "",
    tagsText: "",

    /* MEDIA */
    images: [], // ✅ urls array
    thumbnail: "", // ✅ always synced from images[0]

    /* ✅ CROSS SELL */
    crossSellProducts: [],

    /* ATTRIBUTES / VARIANTS */
    attributes: [],
    variants: [],

    /* ADVANCED (MODEL COMPLETE) */
    highlights: [],
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
      if (!hsn) {
        alert("HSN Code is required for Apparels");
        return;
      }
      if (!/^\d+$/.test(hsn)) {
        alert("HSN Code must be numeric only");
        return;
      }
    }

    setSaving(true);

    const payload = {
      title: form.title,
      price: toNum(form.price),
      compareAtPrice:
        form.compareAtPrice === "" ? null : toNum(form.compareAtPrice),

      categories: form.categories,

      // ✅ include HSN only when apparels
      ...(showHsnCode ? { hsnCode: String(form.hsnCode ?? "").trim() } : {}),

      shortDescription: form.shortDescription,
      description: form.description,

      // ✅ Images and thumbnail always correct now
      images: form.images,
      thumbnail: form.images?.[0] || "",

      tags: form.tagsText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),

      attributes: form.attributes,
      variants: form.variants,

      /* ✅ CROSS SELL */
      crossSellProducts: form.crossSellProducts,

      /* ADVANCED */
      highlights: form.highlights,
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
            <p className="text-sm text-gray-600">
              Create a new product for your store
            </p>
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
              onChange={(e) =>
                setForm((p) => ({ ...p, compareAtPrice: e.target.value }))
              }
              className="input"
            />
          </div>

          {/* ✅ HSN Code visible here too (display) */}
          <div className="bg-white rounded-xl p-6 shadow space-y-3">
  <div>
    <h2 className="font-semibold">
      HSN Code {showHsnCode ? "(Apparels)" : ""}
    </h2>
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
  />

  {!showHsnCode ? (
    <p className="text-xs text-gray-500">
      (Note: This is typically used for apparels. If your category naming is different,
      update the apparel detection keywords.)
    </p>
  ) : (
    <p className="text-xs text-gray-500">
      *Only digits allowed.
    </p>
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

        {/* ✅ HSN CODE (Apparels only) */}
      {showHsnCode && (
  <div className="bg-white p-6">
    <div>
      <h2 className="font-semibold">HSN Code (Apparels)</h2>
      <p className="text-sm text-gray-500">
        Default HSN: <span className="font-medium">62105000</span>
      </p>
    </div>

    {/* ✅ display only (non-editable) */}
    <div className="mt-3 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-800">
      {form.hsnCode || "62105000"}
    </div>

    <p className="mt-2 text-xs text-gray-500">
      *This is shown only when category is Apparel/Apparels/Clothing/Garments.
    </p>
  </div>
)}


        {/* ✅ IMAGES (FIXED) */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Product Images</h2>

          <ProductImagesEditor
            value={form.images} // ✅ correct prop
            folder="miray/products" // ✅ cloudinary folder
            onChange={(urls) => {
              // ✅ thumbnail always first
              setForm((p) => ({
                ...p,
                images: urls,
                thumbnail: urls?.[0] || "",
              }));
            }}
          />
        </div>

        {/* CONTENT */}
        <ProductContentEditor
          editable
          value={{
            shortDescription: form.shortDescription,
            description: form.description,
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
            onChange={(next) =>
              setForm((p) => ({ ...p, crossSellProducts: next }))
            }
          />
        </div>

        {/* COLLECTIONS (OPTIONAL) */}
        <div className="bg-white rounded-xl p-6 shadow space-y-4">
          <h2 className="font-semibold">Collections (Optional)</h2>
          <p className="text-sm text-gray-500">
            Assign this product to one or more collections
          </p>

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
