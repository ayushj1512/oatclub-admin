"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import ProductsNeedingCategoryFix from "../../../components/category/ProductsNeedingCategoryFix";
// ✅ UPDATED STORE PATHS
import { useCategoryStore } from "@/store/categorystore";
import { useAdminProductStore } from "@/store/adminProductStore";

/**
 * ✅ CATEGORY ANALYTICS PAGE
 * -------------------------------------------------
 * Changes requested:
 * ✅ category slug matching (products sahi aayenge)
 * ✅ "Download Excel" option added
 * ✅ Delete functionality removed (UI + handler + store usage)
 *
 * Excel export:
 * - Sheet 1: Categories Summary
 * - Sheet 2: Category → Products mapping
 *
 * Note: Install dependency if not present:
 *   npm i xlsx
 * or
 *   yarn add xlsx
 */

export default function CategoryAnalyticsPage() {
  /* ============================
   * STORES
   * ============================ */
  const {
    categories,
    fetchCategories,
    createCategory,
    loading: catLoading,
    error: catError,
    successMessage,
    clearStatus,
  } = useCategoryStore();

  const {
    products,
    fetchProducts,
    loading: prodLoading,
    saving,
    updateCategoriesInline,
  } = useAdminProductStore();

  /* ============================
   * UI STATE
   * ============================ */
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Create category modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");

  /* ============================
   * FETCH DATA ON LOAD
   * ============================ */
  useEffect(() => {
    fetchCategories();
    fetchProducts({ limit: 5000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================
   * TOASTS
   * ============================ */
  useEffect(() => {
    if (catError) toast.error(catError);
    if (successMessage) toast.success(successMessage);
    return () => clearStatus();
  }, [catError, successMessage, clearStatus]);

  /* ======================================================
   * ✅ Lookups for category matching (id, slug, name)
   * ====================================================== */
  const categoryLookups = useMemo(() => {
    const idSet = new Set();
    const nameToId = {};
    const slugToId = {};

    (categories || []).forEach((c) => {
      if (!c || !c._id) return;

      const id = String(c._id);
      idSet.add(id);

      if (c.name) nameToId[String(c.name).trim().toLowerCase()] = id;
      if (c.slug) slugToId[String(c.slug).trim().toLowerCase()] = id;
    });

    return { idSet, nameToId, slugToId };
  }, [categories]);

  /* ======================================================
   * ✅ Normalize any category reference to categoryId
   * Supports:
   * - string: "featured" (slug) OR "Featured" (name) OR "65.."(id)
   * - object: { _id } OR { id } OR { slug } OR { name }
   * ====================================================== */
  const normalizeCategoryId = useCallback(
    (cat) => {
      const { idSet, nameToId, slugToId } = categoryLookups;

      if (!cat) return null;

      // object case
      if (typeof cat === "object") {
        const objId = cat._id || cat.id;
        if (objId) return String(objId);

        const objSlug = cat.slug;
        if (objSlug) {
          const key = String(objSlug).trim().toLowerCase();
          return slugToId[key] || null;
        }

        const objName = cat.name;
        if (objName) {
          const key = String(objName).trim().toLowerCase();
          return nameToId[key] || null;
        }

        return null;
      }

      // string case
      if (typeof cat === "string") {
        const raw = cat.trim();
        if (!raw) return null;

        // already id?
        if (idSet.has(raw)) return raw;

        const key = raw.toLowerCase();

        // ✅ Prefer slug match
        if (slugToId[key]) return slugToId[key];

        // fallback: name match
        if (nameToId[key]) return nameToId[key];

        // last fallback
        return raw;
      }

      return null;
    },
    [categoryLookups]
  );

  /* ======================================================
   * ✅ categoryId -> products map (slug matching included)
   * ====================================================== */
  const categoryToProducts = useMemo(() => {
    const map = {};

    (products || []).forEach((p) => {
      (p?.categories || []).forEach((cat) => {
        const id = normalizeCategoryId(cat);
        if (!id) return;

        if (!map[id]) map[id] = [];
        map[id].push(p);
      });
    });

    return map;
  }, [products, normalizeCategoryId]);

  /* ============================
   * FILTER CATEGORIES BY SEARCH
   * ============================ */
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories || [];
    return (categories || []).filter((c) =>
      String(c?.name || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  /* ============================
   * ACTIVE CATEGORY PRODUCTS
   * ============================ */
  const activeProducts = useMemo(() => {
    if (!activeCategoryId) return [];
    return categoryToProducts[activeCategoryId] || [];
  }, [activeCategoryId, categoryToProducts]);

  /* ============================
   * SELECTED PRODUCT
   * ============================ */
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return (products || []).find((p) => p._id === selectedProductId) || null;
  }, [selectedProductId, products]);

  /* ============================
   * DROPDOWN OPTIONS
   * ============================ */
  const categoryOptions = useMemo(() => {
    return (categories || []).map((c) => ({ value: c._id, label: c.name }));
  }, [categories]);

  /* ============================
   * HELPERS
   * ============================ */
  const getCount = (catId) => categoryToProducts[catId]?.length || 0;

  const productThumb = (p) => {
    return (
      p?.thumbnail ||
      p?.images?.[0] ||
      "https://placehold.co/200x200/png?text=No+Image"
    );
  };

  const getProductCategoryIds = (p) => {
    return (p?.categories || [])
      .map((c) => normalizeCategoryId(c))
      .filter(Boolean);
  };

  const getProductStatus = (p) => {
    if (p?.isDraft) return "Draft";
    if (p?.isActive) return "Published";
    return "Unpublished";
  };

  /* ============================
   * ADD CATEGORY TO PRODUCT
   * ============================ */
  const addCategory = async (catId) => {
    if (!selectedProduct) return toast.error("Select a product first");

    const current = getProductCategoryIds(selectedProduct);
    if (current.includes(catId)) return toast.error("Already added");

    try {
      await updateCategoriesInline(selectedProduct._id, [...current, catId]);
      toast.success("Category added ✅");
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  /* ============================
   * REMOVE CATEGORY FROM PRODUCT
   * ============================ */
  const removeCategory = async (catId) => {
    if (!selectedProduct) return toast.error("Select a product first");

    const current = getProductCategoryIds(selectedProduct);
    const next = current.filter((x) => x !== catId);

    if (!next.length) return toast.error("At least 1 category required");

    try {
      await updateCategoriesInline(selectedProduct._id, next);
      toast.success("Category removed ✅");
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  /* ============================
   * CREATE CATEGORY
   * ============================ */
  const handleCreate = async () => {
    if (!newName.trim()) return toast.error("Enter category name");

    try {
      await createCategory({ name: newName.trim(), parent: newParent || null });
      setNewName("");
      setNewParent("");
      setShowCreate(false);
      fetchCategories();
    } catch (e) {
      toast.error(e?.message || "Create failed");
    }
  };

  /* ============================
   * ✅ DOWNLOAD EXCEL
   * ============================ */
  const handleDownloadExcel = async () => {
    try {
      if (!categories?.length && !products?.length) {
        return toast.error("No data to export");
      }

      // Dynamic import so it doesn't run on server / keeps bundle lighter
      const XLSX = await import("xlsx");

      // Sheet 1: Category Summary
      const summaryRows = (categories || []).map((c) => {
        const id = String(c?._id || "");
        return {
          CategoryId: id,
          CategoryName: c?.name || "",
          CategorySlug: c?.slug || "",
          ParentId: c?.parent?._id || c?.parent || "",
          ProductCount: getCount(id),
        };
      });

      // Sheet 2: Category → Products mapping
      const mappingRows = [];
      (categories || []).forEach((c) => {
        const catId = String(c?._id || "");
        const catProducts = categoryToProducts[catId] || [];

        if (!catProducts.length) {
          // still add a row so empty categories show up
          mappingRows.push({
            CategoryId: catId,
            CategoryName: c?.name || "",
            CategorySlug: c?.slug || "",
            ProductId: "",
            ProductName: "",
            ProductSlug: "",
            Price: "",
            Status: "",
          });
          return;
        }

        catProducts.forEach((p) => {
          mappingRows.push({
            CategoryId: catId,
            CategoryName: c?.name || "",
            CategorySlug: c?.slug || "",
            ProductId: p?._id || "",
            ProductName: p?.title || p?.name || "",
            ProductSlug: p?.slug || "",
            Price: p?.price ?? "",
            Status: getProductStatus(p),
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(summaryRows);
      const ws2 = XLSX.utils.json_to_sheet(mappingRows);

      XLSX.utils.book_append_sheet(wb, ws1, "Categories Summary");
      XLSX.utils.book_append_sheet(wb, ws2, "Category Products");

      const fileArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([fileArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const fname = `category-analytics_${now.getFullYear()}-${pad(
        now.getMonth() + 1
      )}-${pad(now.getDate())}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Excel downloaded ✅");
    } catch (e) {
      // Most common: xlsx not installed
      toast.error(
        e?.message?.includes("Cannot find module")
          ? "Please install: npm i xlsx"
          : e?.message || "Failed to export"
      );
    }
  };

  const loading = catLoading || prodLoading;

  const activeCategoryName = useMemo(() => {
    if (!activeCategoryId) return "";
    return categories?.find((c) => c._id === activeCategoryId)?.name || "";
  }, [activeCategoryId, categories]);

  /* ============================
   * UI COMPONENTS
   * ============================ */
  const Panel = ({ title, subtitle, right, children }) => (
    <div className="rounded-3xl bg-white shadow-sm border border-black/5 overflow-hidden">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-semibold truncate">{title}</div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
   <div className="p-6 space-y-6">
  {/* HEADER */}
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Category Analytics</h1>
      <p className="text-sm text-muted-foreground">
        Pick a category → see products → edit product categories quickly.
      </p>
    </div>

    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <input
        className="w-full sm:w-72 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-black/10"
        placeholder="Search category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <button
        className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm shadow-sm hover:bg-black/5 active:scale-[0.99]"
        onClick={handleDownloadExcel}
        disabled={loading}
        title="Download Excel (Categories + Category Products)"
      >
        Download Excel
      </button>

      <button
        className="rounded-2xl bg-black text-white px-4 py-2 text-sm shadow hover:opacity-90 active:scale-[0.99]"
        onClick={() => setShowCreate(true)}
      >
        + New Category
      </button>
    </div>
  </div>

  {/* STATS */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="rounded-3xl bg-white shadow-sm border border-black/5 p-4">
      <div className="text-xs text-muted-foreground">Total Categories</div>
      <div className="text-2xl font-semibold">{categories?.length || 0}</div>
    </div>
    <div className="rounded-3xl bg-white shadow-sm border border-black/5 p-4">
      <div className="text-xs text-muted-foreground">Total Products</div>
      <div className="text-2xl font-semibold">{products?.length || 0}</div>
    </div>
    <div className="rounded-3xl bg-white shadow-sm border border-black/5 p-4">
      <div className="text-xs text-muted-foreground">Selected Category</div>
      <div className="text-base font-semibold truncate">{activeCategoryName || "—"}</div>
      <div className="text-xs text-muted-foreground">
        {activeCategoryId ? `${activeProducts.length} products` : "Pick a category"}
      </div>
    </div>
  </div>

  {loading && (
    <div className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 text-sm">
      Loading...
    </div>
  )}

  {/* ✅ 3-COLUMN SECTION */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* LEFT: CATEGORY LIST */}
    <Panel title="Categories" subtitle={`${filteredCategories.length} total`}>
      <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
        {filteredCategories.map((c) => {
          const isActive = activeCategoryId === c._id;

          return (
            <div
              key={c._id}
              className={`rounded-2xl p-3 flex items-center justify-between gap-3 transition ${
                isActive ? "bg-black text-white" : "hover:bg-black/5"
              }`}
            >
              {/* SELECT */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryId(c._id);
                  setSelectedProductId(null);
                }}
                className="flex-1 text-left min-w-0"
              >
                <div
                  className={`font-medium truncate ${
                    isActive ? "text-white" : "text-black"
                  }`}
                >
                  {c.name}
                </div>
                <div
                  className={`text-xs ${
                    isActive ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {getCount(c._id)} products
                </div>
              </button>

              {/* ✅ DELETE REMOVED */}
            </div>
          );
        })}

        {!filteredCategories.length && (
          <div className="text-sm text-muted-foreground">No categories found.</div>
        )}
      </div>
    </Panel>

    {/* MIDDLE: PRODUCTS IN CATEGORY */}
    <Panel
      title="Products"
      subtitle={
        activeCategoryId
          ? `${activeProducts.length} in ${activeCategoryName}`
          : "Select a category"
      }
    >
      {!activeCategoryId ? (
        <div className="text-sm text-muted-foreground">
          Select a category to view products.
        </div>
      ) : (
        <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
          {activeProducts.map((p) => {
            const isSelected = selectedProductId === p._id;
            const thumb = productThumb(p);

            return (
              <div
                key={p._id}
                className={`rounded-2xl p-3 flex gap-3 items-center transition ${
                  isSelected ? "bg-black/5" : "hover:bg-black/5"
                }`}
              >
                {/* IMAGE */}
                <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-black/5 shrink-0">
                  <Image
                    src={thumb}
                    alt={p.title || p.name || "Product"}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>

                {/* SELECT PRODUCT */}
                <button
                  type="button"
                  onClick={() => setSelectedProductId(p._id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-medium truncate">{p.title || p.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>₹{p.price}</span>
                    <span className="text-black/20">•</span>
                    <span>{getProductStatus(p)}</span>
                  </div>
                </button>

                {/* OPEN PRODUCT */}
                <a
                  href={`/products/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1 rounded-full bg-black text-white hover:opacity-90"
                >
                  Open
                </a>
              </div>
            );
          })}

          {!activeProducts.length && (
            <div className="text-sm text-muted-foreground">
              No products in this category.
            </div>
          )}
        </div>
      )}
    </Panel>

    {/* RIGHT: EDIT PRODUCT CATEGORIES */}
    <Panel
      title="Edit Categories"
      subtitle={
        selectedProduct ? "Add/Remove categories for this product" : "Select a product"
      }
      right={saving ? <span className="text-xs text-muted-foreground">Saving...</span> : null}
    >
      {!selectedProduct ? (
        <div className="text-sm text-muted-foreground">
          Select a product to edit categories.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-black/5 p-3 flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white shrink-0">
              <Image
                src={productThumb(selectedProduct)}
                alt={selectedProduct.title || selectedProduct.name || "Product"}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">
                {selectedProduct.title || selectedProduct.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {selectedProduct._id}
              </div>
            </div>

            <a
              href={`/products/${selectedProduct.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1 rounded-full bg-black text-white hover:opacity-90"
            >
              Open
            </a>
          </div>

          {/* CURRENT */}
          <div>
            <div className="text-sm font-medium mb-2">Current Categories</div>
            <div className="flex flex-wrap gap-2">
              {getProductCategoryIds(selectedProduct)
                .map((id) => (categories || []).find((x) => x._id === id))
                .filter(Boolean)
                .map((c) => (
                  <span
                    key={c._id}
                    className="px-3 py-1 rounded-full bg-black/5 text-sm flex items-center gap-2"
                  >
                    {c.name}
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      disabled={saving}
                      onClick={() => removeCategory(c._id)}
                    >
                      remove
                    </button>
                  </span>
                ))}
            </div>
          </div>

          {/* ADD */}
          <div>
            <div className="text-sm font-medium mb-2">Add Category</div>
            <select
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              onChange={(e) => {
                const id = e.target.value;
                if (id) addCategory(id);
                e.target.value = "";
              }}
              defaultValue={""}
              disabled={saving}
            >
              <option value="" disabled>
                Select category...
              </option>
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Product must always have at least 1 category.
            </p>
          </div>
        </div>
      )}
    </Panel>
  </div>

  {/* ✅ NOW AT BOTTOM (FULL WIDTH) */}
  <div className="pt-2">
    <ProductsNeedingCategoryFix
      products={products}
      categories={categories}
      normalizeCategoryId={normalizeCategoryId}
      updateCategoriesInline={updateCategoriesInline}
      saving={saving}
    />
  </div>

  {/* CREATE CATEGORY MODAL */}
  {showCreate && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Create Category</h3>
          <button type="button" className="text-sm" onClick={() => setShowCreate(false)}>
            ✕
          </button>
        </div>

        <input
          className="rounded-2xl border border-black/10 bg-white px-3 py-2 w-full text-sm shadow-sm"
          placeholder="Category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <select
          className="rounded-2xl border border-black/10 bg-white px-3 py-2 w-full text-sm shadow-sm"
          value={newParent}
          onChange={(e) => setNewParent(e.target.value)}
        >
          <option value="">No parent</option>
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 rounded-2xl border border-black/10 hover:bg-black/5"
            onClick={() => setShowCreate(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-2xl bg-black text-white hover:opacity-90"
            onClick={handleCreate}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )}
</div>

  );
}
