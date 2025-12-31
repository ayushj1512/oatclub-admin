"use client";

import { useEffect, useMemo, useState, use } from "react";
import { Pencil, Trash2, Save, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import CategoryMultiSelect from "@/components/product/CategoryMultiSelect";
import AttributeSelector from "@/components/product/AttributeSelector";
import ProductContentEditor from "@/components/product/ProductContentEditor";
import ProductVariantsEditor from "@/components/product/ProductVariantsEditor";
import ProductImagesEditor from "@/components/product/ProductImagesEditor";
import ProductAdvancedFields from "@/components/product/ProductAdvancedFields";
import CrossSellSelector from "@/components/product/CrossSellSelector";
import ProductFabricAssignment from "@/components/product/ProductFabricAssignment";
import CollectionMultiSelect from "@/components/product/CollectionMultiSelect";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

/* ---------------- helpers (safe) ---------------- */
const toStr = (v) => (v == null ? "" : String(v));
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const safeImages = (p) =>
  Array.isArray(p?.images) ? p.images.filter(Boolean) : [];

export default function ProductDetailsPage({ params }) {
  const router = useRouter();

  // ✅ Next 15/16: params is a Promise in client components
  const { slug } = use(params);

  const [collections, setCollections] = useState([]);
  const [product, setProduct] = useState(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [allAttributes, setAllAttributes] = useState([]);

  // form state (keep only editable fields cleanly)
  const [form, setForm] = useState({
    title: "",
    price: 0,
    compareAtPrice: "",
    categories: [],
    stock: 0,
    isInStock: true,
    isActive: true,

    crossSellProducts: [],
    fabrics: [],

    shortDescription: "",
    description: "",
    tagsText: "",

    attributes: [],
    variants: [],

    images: [],
    thumbnail: "",

    /* 🔥 ADVANCED FIELDS */
    highlights: [],
    collections: [],
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0, unit: "cm" },
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    isFeatured: false,
    isDraft: false,
  });

  /* ---------------- LOAD PRODUCT ---------------- */
  const loadProduct = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${BACKEND}/api/products/details/${encodeURIComponent(slug)}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load product");

      setProduct(data);

      /* ---------------- IMAGES ---------------- */
      const imgs = safeImages(data);

      // ✅ thumbnail always derived from images[0] for UI
      const thumbFromApi =
        data?.thumbnail && imgs.includes(data.thumbnail)
          ? data.thumbnail
          : imgs[0] || "";

      /* ---------------- FORM HYDRATION ---------------- */
      setForm({
        /* BASIC */
        title: toStr(data?.title),
        price: toNum(data?.price),
        compareAtPrice: data?.compareAtPrice ?? "",

        /* CATEGORIES */
        categories: Array.isArray(data?.categories) ? data.categories : [],

        /* INVENTORY */
        stock: toNum(data?.stock),
        isInStock: Boolean(data?.isInStock ?? true),
        isActive: Boolean(data?.isActive ?? true),

        /* FABRICS */
        fabrics: Array.isArray(data?.fabrics) ? data.fabrics : [],

        /* CONTENT */
        shortDescription: toStr(data?.shortDescription),
        description: toStr(data?.description),
        tagsText: Array.isArray(data?.tags) ? data.tags.join(", ") : "",

        /* ATTRIBUTES */
        attributes: Array.isArray(data?.attributes)
          ? data.attributes.map((a) => ({
              attribute: a.attribute || null,
              key: a.key || "",
              values: Array.isArray(a.values) ? a.values : [],
              mode: a.attribute ? "select" : "custom",
            }))
          : [],

        /* VARIANTS */
        variants: Array.isArray(data?.variants)
          ? data.variants.map((v) => ({
              _id: v?._id,
              sku: v?.sku || "",
              price: toNum(v?.price),
              stock: toNum(v?.stock),
              isInStock: Boolean(v?.isInStock ?? true),
              attributes: Array.isArray(v?.attributes) ? v.attributes : [],
              weight: toNum(v?.weight),
              barcode: v?.barcode || "",
              compareAtPrice: v?.compareAtPrice ?? "",
            }))
          : [],

        /* MEDIA */
        images: imgs,
        thumbnail: thumbFromApi,

        /* CROSS SELL */
        crossSellProducts: Array.isArray(data?.crossSellProducts)
          ? data.crossSellProducts.map((p) =>
              typeof p === "string" ? p : p?._id
            )
          : [],

        /* ADVANCED */
        highlights: Array.isArray(data?.highlights) ? data.highlights : [],
        collections: Array.isArray(data?.collections) ? data.collections : [],
        weight: toNum(data?.weight),

        dimensions: data?.dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },

        metaTitle: toStr(data?.metaTitle),
        metaDescription: toStr(data?.metaDescription),

        keywords: Array.isArray(data?.keywords) ? data.keywords : [],

        isFeatured: Boolean(data?.isFeatured ?? false),
        isDraft: Boolean(data?.isDraft ?? false),
      });
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      setProduct(null);
      alert(err?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- LOAD MASTER DATA ---------------- */
  const fetchAllCollections = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/collections`, {
        cache: "no-store",
      });
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch collections", e);
      setCollections([]);
    }
  };

  const fetchAllAttributes = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/attributes`, {
        cache: "no-store",
      });
      const data = await res.json();
      setAllAttributes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch attributes", e);
      setAllAttributes([]);
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetchAllCollections();
    fetchAllAttributes();
    loadProduct();
  }, [slug]);

  /* ---------------- HANDLERS ---------------- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  /* ---------------- SAVE PRODUCT ---------------- */
  const saveProduct = async () => {
    if (!product?._id) return;

    try {
      setSaving(true);

      /* ================= CLEAN ATTRIBUTES ================= */
      const cleanedAttributes = (form.attributes || [])
        .filter((a) => a.key && Array.isArray(a.values) && a.values.length > 0)
        .map((a) => ({
          attribute: a.attribute || null,
          key: a.key,
          values: a.values,
        }));

      /* ================= CLEAN VARIANTS ================= */
      const cleanedVariants = Array.isArray(form.variants)
        ? form.variants.map((v) => ({
            _id: v?._id,
            sku: v?.sku || "",
            price: toNum(v?.price),
            compareAtPrice:
              v?.compareAtPrice === "" ? null : toNum(v?.compareAtPrice),
            stock: toNum(v?.stock),
            isInStock: Boolean(v?.isInStock ?? true),
            weight: toNum(v?.weight),
            barcode: v?.barcode || "",
            attributes: Array.isArray(v?.attributes) ? v.attributes : [],
          }))
        : [];

      /* ================= BUILD PAYLOAD ================= */
      const payload = {
        /* BASIC */
        title: form.title,
        price: toNum(form.price),
        compareAtPrice:
          form.compareAtPrice === "" ? null : toNum(form.compareAtPrice),

        /* CATEGORIES */
        categories: Array.isArray(form.categories)
          ? form.categories.filter(Boolean)
          : [],

        /* INVENTORY */
        stock: toNum(form.stock),
        isInStock: Boolean(form.isInStock),
        isActive: Boolean(form.isActive),

        /* CONTENT */
        shortDescription: form.shortDescription || "",
        description: form.description || "",

        fabrics: Array.isArray(form.fabrics) ? form.fabrics : [],

        /* ✅ MEDIA */
        images: Array.isArray(form.images) ? form.images.filter(Boolean) : [],
        thumbnail: form.images?.[0] || "", // ✅ always sync

        /* TAGS */
        tags: toStr(form.tagsText)
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),

        /* ATTRIBUTES + VARIANTS */
        attributes: cleanedAttributes,
        variants: cleanedVariants,

        /* CROSS SELL */
        crossSellProducts: Array.isArray(form.crossSellProducts)
          ? form.crossSellProducts.filter(Boolean)
          : [],

        /* ADVANCED */
        highlights: Array.isArray(form.highlights) ? form.highlights : [],
        collections: Array.isArray(form.collections) ? form.collections : [],

        /* SHIPPING */
        weight: toNum(form.weight),
        dimensions: form.dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },

        /* SEO */
        metaTitle: form.metaTitle || "",
        metaDescription: form.metaDescription || "",
        keywords: Array.isArray(form.keywords) ? form.keywords : [],

        /* PUBLISHING */
        isFeatured: Boolean(form.isFeatured),
        isDraft: Boolean(form.isDraft),
      };

      const res = await fetch(`${BACKEND}/api/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Update failed");

      alert("Product updated successfully ✅");
      setEditing(false);
      await loadProduct();
    } catch (e) {
      console.error("❌ Save error:", e);
      alert(e?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- DELETE PRODUCT ---------------- */
  const deleteProduct = async () => {
    if (!product?._id) return;
    if (!confirm("Delete this product?")) return;

    try {
      const res = await fetch(`${BACKEND}/api/products/${product._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      alert("Product deleted!");
      router.push("/products");
    } catch (e) {
      alert(e?.message || "Failed to delete product");
    }
  };

  const titleNode = useMemo(() => {
    if (!editing) return <span>{product?.title}</span>;
    return (
      <input
        name="title"
        value={form.title}
        onChange={handleChange}
        className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none"
      />
    );
  }, [editing, form.title, product?.title]);

  /* ---------------- UI ---------------- */
  if (loading) return <p className="p-10">Loading...</p>;
  if (!product) return <p className="p-10">Product not found</p>;

  return (
    <section className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <div className="w-full px-4 md:px-8 lg:px-10 space-y-8 md:space-y-10">
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={20} /> Back to Products
        </button>

        {/* HEADER + ACTIONS */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              {editing ? "Edit Product" : "Product Details"}
            </h1>

            <p className="text-sm text-gray-600 truncate max-w-[60vw]">
              {product?.title || "—"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Pencil size={14} />
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    setEditing(false);
                    await loadProduct();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg text-gray-700 hover:bg-gray-50"
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

        {/* ✅ IMAGES (FIXED TO UNIVERSAL MEDIA SYSTEM) */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Product Images</h2>

          <ProductImagesEditor
            value={form.images}
            folder="miray/products"
            onChange={(urls) =>
              setForm((p) => ({
                ...p,
                images: urls,
                thumbnail: urls?.[0] || "",
              }))
            }
          />
        </div>

        {/* PRICING */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg md:text-xl font-semibold">Pricing</h2>

            {!editing ? (
              <div className="text-xs text-gray-500">
                productCode:{" "}
                <span className="font-mono">
                  {product?.productCode || "-"}
                </span>
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
              <input
                name="stock"
                value={form.stock}
                onChange={handleChange}
                className="w-full rounded-xl bg-gray-100 px-3 py-2 outline-none"
                placeholder="Stock (simple products)"
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
                <b>Stock:</b> {product.stock ?? 0} • <b>In stock:</b>{" "}
                {String(!!product.isInStock)}
              </p>
            </div>
          )}

          {editing ? (
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isInStock"
                  checked={!!form.isInStock}
                  onChange={handleChange}
                />
                In Stock
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={!!form.isActive}
                  onChange={handleChange}
                />
                Active (visible)
              </label>
            </div>
          ) : null}
        </div>

        {/* CATEGORIES */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Categories</h2>

          {!editing && (
            <div className="flex flex-wrap gap-2">
              {Array.isArray(product.categories) && product.categories.length ? (
                product.categories.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 bg-gray-200 rounded-full text-xs"
                  >
                    {c}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-600">No categories assigned</p>
              )}
            </div>
          )}

          {editing && (
            <CategoryMultiSelect
              value={form.categories}
              onChange={(next) => setForm((p) => ({ ...p, categories: next }))}
            />
          )}
        </div>

        {/* CONTENT + TAGS */}
        <ProductContentEditor
          editable={editing}
          value={{
            shortDescription: editing
              ? form.shortDescription
              : product.shortDescription,
            description: editing ? form.description : product.description,
            tagsText: editing
              ? form.tagsText
              : Array.isArray(product.tags)
              ? product.tags.join(", ")
              : "",
          }}
          onChange={(next) =>
            setForm((p) => ({
              ...p,
              shortDescription: next.shortDescription,
              description: next.description,
              tagsText: next.tagsText,
            }))
          }
        />

        {/* FABRICS */}
        <ProductFabricAssignment
          value={editing ? form.fabrics : product.fabrics}
          editable={editing}
          onChange={(next) => setForm((p) => ({ ...p, fabrics: next }))}
        />

        {/* ATTRIBUTES */}
        <AttributeSelector
          value={editing ? form.attributes : product.attributes}
          onChange={(next) => setForm((p) => ({ ...p, attributes: next }))}
          allAttributes={allAttributes}
          editable={editing}
        />

        {/* COLLECTIONS */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">
            Collections (Optional)
          </h2>

          {!editing && (
            <div className="flex flex-wrap gap-2">
              {Array.isArray(product.collections) &&
              product.collections.length ? (
                product.collections.map((c) => (
                  <span
                    key={typeof c === "string" ? c : c?._id}
                    className="px-3 py-1 bg-gray-200 rounded-full text-xs"
                  >
                    {typeof c === "string" ? c : c?.name || "Collection"}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-600">
                  No collections assigned
                </p>
              )}
            </div>
          )}

          {editing && (
            <CollectionMultiSelect
              collections={collections}
              value={form.collections}
              onChange={(next) =>
                setForm((p) => ({ ...p, collections: next }))
              }
            />
          )}
        </div>

        {/* ADVANCED */}
        <ProductAdvancedFields
          editable={editing}
          value={{
            highlights: editing ? form.highlights : product.highlights,
            collections: editing ? form.collections : product.collections,
            weight: editing ? form.weight : product.weight,
            dimensions: editing ? form.dimensions : product.dimensions,
            metaTitle: editing ? form.metaTitle : product.metaTitle,
            metaDescription: editing
              ? form.metaDescription
              : product.metaDescription,
            keywords: editing ? form.keywords : product.keywords,
            isActive: editing ? form.isActive : product.isActive,
            isFeatured: editing ? form.isFeatured : product.isFeatured,
            isDraft: editing ? form.isDraft : product.isDraft,
          }}
          onChange={(next) => setForm((p) => ({ ...p, ...next }))}
        />

        {/* VARIANTS */}
        <ProductVariantsEditor
          value={editing ? form.variants : product.variants}
          editable={editing}
          onChange={(next) => setForm((p) => ({ ...p, variants: next }))}
        />

        {/* CROSS SELL */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">
            Cross-sell Products
          </h2>

          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {Array.isArray(product.crossSellProducts) &&
              product.crossSellProducts.length ? (
                product.crossSellProducts.map((p) => (
                  <span
                    key={p._id}
                    className="px-3 py-1 bg-gray-200 rounded-full text-xs"
                  >
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
              onChange={(next) =>
                setForm((p) => ({ ...p, crossSellProducts: next }))
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
