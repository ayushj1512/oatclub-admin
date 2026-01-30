// app/test/page.jsx
"use client";

import React, { useMemo, useState } from "react";
import ProductPicker from "@/components/common/ProductPicker";
import { useAdminProductStore } from "@/store/adminProductStore";
import toast from "react-hot-toast";

/**
 * /test/page.jsx
 * A sandbox page to review the reusable ProductPicker component.
 * - Multi select (required)
 * - Locked category select (required)
 * - Single select (required)
 */
export default function TestProductPickerPage() {
  const { products, loading, error } = useAdminProductStore();

  // Demo 1: Collection (multi required)
  const [collectionIds, setCollectionIds] = useState([]);

  // Demo 2: Tight Reviews (multi required + locked category)
  const [tightReviewIds, setTightReviewIds] = useState([]);

  // Demo 3: Featured (single required)
  const [featuredId, setFeaturedId] = useState(null);

  // Optional: build category options from products (if product.categories exists)
  // If you already have category store, replace this with real options.
  const categoryOptions = useMemo(() => {
    const set = new Map(); // value -> label
    (products || []).forEach((p) => {
      const cats = Array.isArray(p?.categories) ? p.categories : [];
      cats.forEach((c) => {
        // supports categories being strings or objects {slug/name/_id}
        if (typeof c === "string") {
          const v = c.trim();
          if (v) set.set(v, v);
        } else if (c && typeof c === "object") {
          const v = c.slug || c._id || c.id || c.value || "";
          const label = c.name || c.title || c.slug || v;
          if (v) set.set(String(v), String(label));
        }
      });
    });

    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [products]);

  const onSaveAll = () => {
    // enforce "must select" here too (parent side)
    if (!collectionIds.length) return toast.error("Collection needs at least 1 product");
    if (!tightReviewIds.length) return toast.error("Tight Reviews needs at least 1 product");
    if (!featuredId) return toast.error("Featured product is required");

    toast.success("Looks good ✅ (Review the selected ids below)");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border bg-white p-4 md:p-6">
          <h1 className="text-2xl font-semibold">Product Picker Test</h1>
          <p className="mt-1 text-sm text-gray-600">
            Use this page to review the common product selection component behavior.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm">
              <span className="text-gray-600">Loading:</span>{" "}
              <span className="font-medium">{loading ? "true" : "false"}</span>
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm">
              <span className="text-gray-600">Products in store:</span>{" "}
              <span className="font-medium">{(products || []).length}</span>
            </div>
            {error ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Error: {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onSaveAll}
              className="ml-auto rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Validate selections
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Demo 1 */}
          <section className="space-y-3">
            <ProductPicker
              title="Demo 1 — Collection (multi, required)"
              multiple
              required
              value={collectionIds}
              onChange={setCollectionIds}
              categoryOptions={categoryOptions}
            />

            <SelectionPreview label="Selected (Collection)" value={collectionIds} />
          </section>

          {/* Demo 2 */}
          <section className="space-y-3">
            <ProductPicker
              title="Demo 2 — Tight Reviews (locked category, multi, required)"
              multiple
              required
              lockedCategory="tight-reviews"
              value={tightReviewIds}
              onChange={setTightReviewIds}
              categoryOptions={categoryOptions}
            />

            <SelectionPreview label="Selected (Tight Reviews)" value={tightReviewIds} />
            <p className="text-xs text-gray-600">
              Note: lockedCategory is set to <span className="font-medium">tight-reviews</span>.
              Change the slug if your backend expects something else.
            </p>
          </section>

          {/* Demo 3 */}
          <section className="space-y-3 lg:col-span-2">
            <ProductPicker
              title="Demo 3 — Featured product (single, required)"
              multiple={false}
              required
              value={featuredId}
              onChange={setFeaturedId}
              categoryOptions={categoryOptions}
            />

            <SelectionPreview label="Selected (Featured)" value={featuredId} />
          </section>
        </div>

        <footer className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
          <p>
            If search isn’t working, your backend may not support <code className="px-1">q</code>{" "}
            param in <code className="px-1">GET /api/products</code>. Update the param name inside
            <code className="ml-1 px-1">ProductPicker</code> (the queryParams section).
          </p>
        </footer>
      </div>
    </div>
  );
}

function SelectionPreview({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-sm font-semibold">{label}</p>
      <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-800">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
