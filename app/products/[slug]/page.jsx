// app/products/[slug]/page.jsx
"use client";

import { useEffect, useMemo, useState, use } from "react";
import { Pencil, Trash2, Save, ArrowLeft, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import CategoryMultiSelect from "@/components/product/CategoryMultiSelect";
import AttributeSelector from "@/components/product/AttributeSelector";
import ProductContentEditor from "@/components/product/ProductContentEditor";
import ProductVariantsEditor from "@/components/product/ProductVariantsEditor";
import ProductImagesEditor from "@/components/product/ProductImagesEditor";
import ProductAdvancedFields from "@/components/product/ProductAdvancedFields";
import CrossSellSelector from "@/components/product/CrossSellSelector";
import CollectionMultiSelect from "@/components/product/CollectionMultiSelect";
import FabricAdd from "@/components/product/FabricAdd";
import OriginalProductLinkField from "@/components/product/OriginalProductLinkField";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");

/* ---------------- tiny helpers ---------------- */
const s = (v) => (v == null ? "" : String(v));
const n = (v, fb = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
};
const uniqLower = (arr) =>
  Array.from(new Set((arr || []).map((x) => s(x).trim().toLowerCase()).filter(Boolean)));

const safeArr = (v) => (Array.isArray(v) ? v : []);
const safeImages = (p) => safeArr(p?.images).filter(Boolean);

const isApparelCategory = (categories) =>
  safeArr(categories)
    .map((c) => s(c).trim().toLowerCase())
    .some((c) => ["apparel", "apparels", "clothing", "garments"].includes(c));

/* ---------------- duplicate -> /products/add?dupKey=... ---------------- */
function buildDupPrefill(product) {
  const imgs = safeImages(product);

  const attributes = safeArr(product?.attributes).map((a) => ({
    attribute: a?.attribute || null,
    key: s(a?.key).trim(),
    values: safeArr(a?.values),
    mode: a?.attribute ? "select" : "custom",
  }));

  // clear sku/barcode/patternNumber to avoid conflicts; remove _id
  const variants = safeArr(product?.variants).map((v) => ({
    sku: "",
    barcode: "",
    weight: n(v?.weight),
    patternNumber: "",
    attributes: safeArr(v?.attributes),
  }));

  const specificationsText = safeArr(product?.specifications)
    .filter((r) => r && (r.key || r.value))
    .map((r) => `${s(r.key).trim()}:${s(r.value).trim()}`)
    .join(" | ");

  return {
    title: `${s(product?.title).trim()} (Copy)`,
    price: s(product?.price ?? ""),
    compareAtPrice: product?.compareAtPrice ?? "",
    categories: safeArr(product?.categories),

    hsnCode: s(product?.hsnCode || "62105000"),

    shortDescription: s(product?.shortDescription),
    howToStyle: s(product?.howToStyle),
    fabricDetails: s(product?.fabricDetails),
    keyFeaturesText: safeArr(product?.keyFeatures).filter(Boolean).join(", "),
    specificationsText,

    tagsText: safeArr(product?.tags).filter(Boolean).join(", "),

    // you said you don't do color thing in variants → keep colors empty by default
    colorsText: "",

    fabrics: safeArr(product?.fabrics),

    images: imgs,
    thumbnail: imgs?.[0] || "",

    crossSellProducts: safeArr(product?.crossSellProducts).map((x) =>
      typeof x === "string" ? x : x?._id,
    ),

    attributes,
    variants,

    highlights: safeArr(product?.highlights),
    collections: safeArr(product?.collections),
    weight: n(product?.weight),
    dimensions: product?.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },

    metaTitle: s(product?.metaTitle),
    metaDescription: s(product?.metaDescription),
    keywords: safeArr(product?.keywords),

    // open as draft + inactive by default
    isDraft: true,
    isActive: false,
    isFeatured: !!product?.isFeatured,

    // your new field
    originalProductLink: s(product?.originalProductLink),
  };
}

export default function ProductDetailsPage({ params }) {
  const router = useRouter();
  const { slug } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);

  const [product, setProduct] = useState(null);
  const [collections, setCollections] = useState([]);
  const [allAttributes, setAllAttributes] = useState([]);
  const [variantsDirty, setVariantsDirty] = useState(false);

  const [form, setForm] = useState({
    title: "",
    price: 0,
    compareAtPrice: "",
    categories: [],
    isActive: true,

    shortDescription: "",
    howToStyle: "",
    fabricDetails: "",
    keyFeaturesText: "",
    specifications: [],
    tagsText: "",
    colorsText: "",

    attributes: [],
    variants: [],

    images: [],
    thumbnail: "",

    fabrics: [],
    crossSellProducts: [],
    collections: [],
    originalProductLink: "",

    highlights: [],
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0, unit: "cm" },
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    isFeatured: false,
    isDraft: false,
  });

  const showHsn = useMemo(
    () => isApparelCategory(editing ? form.categories : product?.categories),
    [editing, form.categories, product?.categories],
  );

  /* ---------------- load master data ---------------- */
  useEffect(() => {
    if (!slug) return;

    const run = async () => {
      try {
        setLoading(true);

        const [pRes, cRes, aRes] = await Promise.all([
          fetch(`${BACKEND}/api/products/details/${encodeURIComponent(slug)}`, { cache: "no-store" }),
          fetch(`${BACKEND}/api/collections`, { cache: "no-store" }),
          fetch(`${BACKEND}/api/attributes`, { cache: "no-store" }),
        ]);

        const pData = await pRes.json().catch(() => null);
        if (!pRes.ok) throw new Error(pData?.message || "Failed to load product");

        const colData = await cRes.json().catch(() => []);
        const attrData = await aRes.json().catch(() => []);

        setProduct(pData);
        setCollections(Array.isArray(colData) ? colData : []);
        setAllAttributes(Array.isArray(attrData) ? attrData : []);
        setVariantsDirty(false);

        const imgs = safeImages(pData);
        const thumb = pData?.thumbnail && imgs.includes(pData.thumbnail) ? pData.thumbnail : imgs[0] || "";

        setForm({
          title: s(pData?.title),
          price: n(pData?.price),
          compareAtPrice: pData?.compareAtPrice ?? "",
          categories: safeArr(pData?.categories),
          isActive: !!pData?.isActive,

          shortDescription: s(pData?.shortDescription),
          howToStyle: s(pData?.howToStyle),
          fabricDetails: s(pData?.fabricDetails),
          keyFeaturesText: safeArr(pData?.keyFeatures).filter(Boolean).join(", "),
          specifications: safeArr(pData?.specifications),
          tagsText: safeArr(pData?.tags).join(", "),
          colorsText: safeArr(pData?.colors).join(", "),

          attributes: safeArr(pData?.attributes).map((a) => ({
            attribute: a?.attribute || null,
            key: a?.key || "",
            values: safeArr(a?.values),
            mode: a?.attribute ? "select" : "custom",
          })),

          variants: safeArr(pData?.variants).map((v) => ({
            _id: v?._id,
            sku: s(v?.sku),
            barcode: s(v?.barcode),
            weight: n(v?.weight),
            patternNumber: s(v?.patternNumber).trim(),
            attributes: safeArr(v?.attributes),
          })),

          images: imgs,
          thumbnail: thumb,

          fabrics: safeArr(pData?.fabrics),
          crossSellProducts: safeArr(pData?.crossSellProducts).map((x) => (typeof x === "string" ? x : x?._id)),
          collections: safeArr(pData?.collections),
          originalProductLink: s(pData?.originalProductLink),

          highlights: safeArr(pData?.highlights),
          weight: n(pData?.weight),
          dimensions: pData?.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },
          metaTitle: s(pData?.metaTitle),
          metaDescription: s(pData?.metaDescription),
          keywords: safeArr(pData?.keywords),
          isFeatured: !!pData?.isFeatured,
          isDraft: !!pData?.isDraft,
        });
      } catch (e) {
        console.error("❌ load error:", e);
        setProduct(null);
        alert(e?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [slug]);

  /* ---------------- handlers ---------------- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const reload = async () => {
    setEditing(false);
    router.refresh?.();
    window.location.reload();
  };

  const duplicateToAdd = () => {
    if (!product?._id) return;
    try {
      setDupLoading(true);

      const payload = buildDupPrefill(product);
      const key = `dup_prefill_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, JSON.stringify(payload));

      const url = `/products/add?dupKey=${encodeURIComponent(key)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("duplicateToAdd error:", e);
      alert(e?.message || "Failed to duplicate");
    } finally {
      setDupLoading(false);
    }
  };

  /* ---------------- save ---------------- */
  const saveProduct = async () => {
    if (!product?._id) return;

    try {
      setSaving(true);

      const cleanedAttributes = safeArr(form.attributes)
        .filter((a) => s(a?.key).trim() && safeArr(a?.values).length)
        .map((a) => ({
          attribute: a.attribute || null,
          key: s(a.key).trim(),
          values: safeArr(a.values),
        }));

      const cleanedVariants = safeArr(form.variants).map((v) => ({
        _id: v?._id,
        sku: s(v?.sku).trim(),
        barcode: s(v?.barcode).trim(),
        weight: n(v?.weight),
        attributes: safeArr(v?.attributes),
        patternNumber: s(v?.patternNumber).trim(),
      }));

      const cleanedFabrics = safeArr(form.fabrics)
        .map((f) => ({
          fabricName: s(f?.fabricName).trim(),
          fabricCode: s(f?.fabricCode).trim(),
          role: s(f?.role || "main").trim().toLowerCase(),
          color: s(f?.color).trim(),
        }))
        .filter((f) => !!f.fabricName);

      const payload = {
        title: s(form.title).trim(),
        price: n(form.price),
        compareAtPrice: form.compareAtPrice === "" ? null : n(form.compareAtPrice),

        categories: safeArr(form.categories).filter(Boolean),
        isActive: !!form.isActive,

        shortDescription: s(form.shortDescription).trim(),
        howToStyle: s(form.howToStyle).trim(),
        fabricDetails: s(form.fabricDetails).trim(),
        keyFeatures: s(form.keyFeaturesText)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        specifications: safeArr(form.specifications)
          .map((r) => ({ key: s(r?.key).trim(), value: s(r?.value).trim() }))
          .filter((r) => r.key),

        images: safeArr(form.images).filter(Boolean),
        thumbnail: safeArr(form.images)[0] || "",

        tags: uniqLower(s(form.tagsText).split(",")),
        colors: uniqLower(s(form.colorsText).split(",")),

        fabrics: cleanedFabrics,
        attributes: cleanedAttributes,
        ...(variantsDirty ? { variants: cleanedVariants } : {}),

        crossSellProducts: safeArr(form.crossSellProducts).filter(Boolean),
        collections: safeArr(form.collections),

        originalProductLink: s(form.originalProductLink).trim(),

        highlights: safeArr(form.highlights),
        weight: n(form.weight),
        dimensions: form.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },
        metaTitle: s(form.metaTitle),
        metaDescription: s(form.metaDescription),
        keywords: safeArr(form.keywords),
        isFeatured: !!form.isFeatured,
        isDraft: !!form.isDraft,
      };

      const res = await fetch(`${BACKEND}/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Update failed");

      alert("Product updated ✅");
      setEditing(false);
      setVariantsDirty(false);

      const updated = data?.product || data;
      setProduct(updated);

      const imgs = safeImages(updated);
      setForm((p) => ({
        ...p,
        images: imgs,
        thumbnail: imgs[0] || "",
        fabrics: safeArr(updated?.fabrics),
        originalProductLink: s(updated?.originalProductLink),
      }));
    } catch (e) {
      console.error("❌ save error:", e);
      alert(e?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- delete ---------------- */
  const deleteProduct = async () => {
    if (!product?._id) return;
    if (!confirm("Delete this product?")) return;

    try {
      const res = await fetch(`${BACKEND}/api/products/${product._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      alert("Product deleted");
      router.push("/products");
    } catch (e) {
      alert(e?.message || "Failed to delete product");
    }
  };

  if (loading) return <p className="p-10">Loading…</p>;
  if (!product) return <p className="p-10">Product not found</p>;

  return (
    <section className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="w-full space-y-8">
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={20} /> Back to Products
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              {editing ? "Edit Product" : "Product Details"}
            </h1>
            <p className="text-sm text-gray-600 truncate">{product?.title || "—"}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!editing ? (
              <>
                <button
                  onClick={duplicateToAdd}
                  disabled={dupLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                  title="Open Add Product in new tab with prefilled data"
                >
                  {dupLoading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                  {dupLoading ? "Duplicating…" : "Duplicate"}
                </button>

                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={reload}
                  className="px-3 py-1.5 text-sm border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={saveProduct}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}

            <button
              onClick={deleteProduct}
              className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              title="Delete product"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Product Images</h2>

          <ProductImagesEditor
            value={form.images}
            folder="miray/products"
            onChange={(urls) => setForm((p) => ({ ...p, images: urls, thumbnail: urls?.[0] || "" }))}
          />
        </div>

        {/* Original product link */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <OriginalProductLinkField
            value={editing ? form.originalProductLink : s(product?.originalProductLink)}
            onChange={(next) => setForm((p) => ({ ...p, originalProductLink: next }))}
          />
          {!editing && !s(product?.originalProductLink) ? (
            <p className="text-sm text-gray-500">No original link set.</p>
          ) : null}
        </div>

        {/* Pricing */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg md:text-xl font-semibold">Pricing</h2>
            {!editing ? (
              <div className="text-xs text-gray-500">
                productCode: <span className="font-mono">{product?.productCode || "-"}</span>
              </div>
            ) : null}
          </div>

          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none"
                placeholder="Price"
              />
              <input
                name="compareAtPrice"
                value={form.compareAtPrice}
                onChange={handleChange}
                className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none"
                placeholder="Compare at price"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-base">
                <b>Price:</b> ₹{product.price}
              </p>
              {product.compareAtPrice != null ? (
                <p className="text-sm text-gray-600">
                  <b>Original:</b> ₹{product.compareAtPrice}
                </p>
              ) : null}

              <p className="text-sm text-gray-700">
                <b>Stock:</b> {product.stock ?? 0} • <b>In stock:</b> {String(!!product.isInStock)}
              </p>

              {showHsn ? (
                <p className="text-sm text-gray-700">
                  <b>HSN Code:</b> {product?.hsnCode || "—"}
                </p>
              ) : null}
            </div>
          )}

          {editing ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" checked={!!form.isActive} onChange={handleChange} />
              Active (visible)
            </label>
          ) : null}
        </div>

        {/* Categories */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Categories</h2>
          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {safeArr(product.categories).length ? (
                product.categories.map((c) => (
                  <span key={c} className="px-3 py-1 bg-gray-200 rounded-full text-xs">
                    {c}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-600">No categories assigned</p>
              )}
            </div>
          ) : (
            <CategoryMultiSelect value={form.categories} onChange={(next) => setForm((p) => ({ ...p, categories: next }))} />
          )}
        </div>

        {/* Content */}
        <ProductContentEditor
          editable={editing}
          value={{
            shortDescription: form.shortDescription,
            howToStyle: form.howToStyle,
            fabricDetails: form.fabricDetails,
            keyFeaturesText: form.keyFeaturesText,
            specifications: form.specifications,
            tagsText: form.tagsText,
          }}
          onChange={(next) =>
            setForm((p) => ({
              ...p,
              shortDescription: next.shortDescription ?? "",
              howToStyle: next.howToStyle ?? "",
              fabricDetails: next.fabricDetails ?? "",
              keyFeaturesText: next.keyFeaturesText ?? "",
              specifications: Array.isArray(next.specifications) ? next.specifications : [],
              tagsText: next.tagsText ?? "",
            }))
          }
        />

        {/* Colors */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Colors</h2>

          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {safeArr(product?.colors).length ? (
                product.colors.map((c) => (
                  <span key={c} className="px-3 py-1 bg-gray-200 rounded-full text-xs">
                    {c}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-600">No colors set</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                name="colorsText"
                value={form.colorsText}
                onChange={handleChange}
                placeholder="Comma-separated colors e.g. red, black, navy"
                className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none"
              />
              <p className="text-xs text-gray-500">Stored at product level for filtering.</p>
            </div>
          )}
        </div>

        {/* Fabrics */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Fabrics</h2>
            <p className="text-sm text-gray-500">Fabric name is required per row.</p>
          </div>

          <FabricAdd
            value={editing ? form.fabrics : safeArr(product?.fabrics)}
            editable={editing}
            onChange={(next) => setForm((p) => ({ ...p, fabrics: next }))}
          />
        </div>

        {/* Attributes */}
        <AttributeSelector
          value={editing ? form.attributes : product.attributes}
          onChange={(next) => setForm((p) => ({ ...p, attributes: next }))}
          allAttributes={allAttributes}
          editable={editing}
        />

        {/* Collections */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Collections (Optional)</h2>

          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {safeArr(product.collections).length ? (
                product.collections.map((c) => (
                  <span
                    key={typeof c === "string" ? c : c?._id}
                    className="px-3 py-1 bg-gray-200 rounded-full text-xs"
                  >
                    {typeof c === "string" ? c : c?.name || "Collection"}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-600">No collections assigned</p>
              )}
            </div>
          ) : (
            <CollectionMultiSelect
              collections={collections}
              value={form.collections}
              onChange={(next) => setForm((p) => ({ ...p, collections: next }))}
            />
          )}
        </div>

        {/* Advanced */}
        <ProductAdvancedFields
          editable={editing}
          value={{
            highlights: form.highlights,
            collections: form.collections,
            weight: form.weight,
            dimensions: form.dimensions,
            metaTitle: form.metaTitle,
            metaDescription: form.metaDescription,
            keywords: form.keywords,
            isActive: form.isActive,
            isFeatured: form.isFeatured,
            isDraft: form.isDraft,
          }}
          onChange={(next) => setForm((p) => ({ ...p, ...next }))}
        />

        {/* Variants */}
        <ProductVariantsEditor
          value={editing ? form.variants : product.variants}
          editable={editing}
          onChange={(next) => {
            setVariantsDirty(true);
            setForm((p) => ({ ...p, variants: next }));
          }}
        />

        {/* Cross sell */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Cross-sell Products</h2>

          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {safeArr(product.crossSellProducts).length ? (
                product.crossSellProducts.map((p) => (
                  <span key={p._id} className="px-3 py-1 bg-gray-200 rounded-full text-xs">
                    {p.title}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-600">No cross-sell products</p>
              )}
            </div>
          ) : (
            <CrossSellSelector
              value={form.crossSellProducts}
              onChange={(next) => setForm((p) => ({ ...p, crossSellProducts: next }))}
            />
          )}
        </div>
      </div>
    </section>
  );
}