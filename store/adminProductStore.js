import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/products`;

/* ============================================================
  Helpers (admin-side payload hygiene)
  - remove variant.price fields (no longer in schema)
============================================================ */
const stripVariantPrices = (payload) => {
  if (!payload || typeof payload !== "object") return payload;

  const out = { ...payload };
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((v) => {
      if (!v || typeof v !== "object") return v;
      // remove old fields if UI still sends them
      // eslint-disable-next-line no-unused-vars
      const { price, compareAtPrice, ...rest } = v;
      return rest;
    });
  }
  return out;
};

const normalizeProductPayload = (payload) => {
  if (!payload || typeof payload !== "object") return payload;

  const out = stripVariantPrices(payload);

  if (out.patternNumber !== undefined) {
    out.patternNumber = String(out.patternNumber || "").trim();
  }

  // ✅ HSN Code hygiene: trim + digits-only (allow empty)
  if (out.hsnCode !== undefined) {
    const hsn = String(out.hsnCode ?? "").trim();
    const digitsOnly = hsn.replace(/[^\d]/g, "");
    out.hsnCode = hsn === "" ? "" : digitsOnly;
  }

  // allow fabrics + avgFabricConsumption to pass (sometimes UI may send as stringified JSON)
  if (typeof out.fabrics === "string") {
    try {
      out.fabrics = JSON.parse(out.fabrics);
    } catch {}
  }

  if (typeof out.avgFabricConsumption === "string") {
    try {
      out.avgFabricConsumption = JSON.parse(out.avgFabricConsumption);
    } catch {}
  }

  // ✅ NEW: COLORS hygiene
  if (out.colors !== undefined) {
    const list = Array.isArray(out.colors)
      ? out.colors
      : typeof out.colors === "string"
        ? out.colors.split(",")
        : [];

    out.colors = Array.from(
      new Set(
        list
          .map((c) =>
            String(c || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );
  }

  return out;
};

const normalizeFabricsPayload = (fabrics) => {
  // allow JSON string
  if (typeof fabrics === "string") {
    try {
      fabrics = JSON.parse(fabrics);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(fabrics)) return [];

  const ROLE_SET = new Set(["main", "lining", "contrast", "padding", "other"]);
  const UNIT_SET = new Set(["meter", "gram"]);
  const seen = new Set();

  const out = [];
  for (const f of fabrics) {
    const fabricCode = String(f?.fabricCode || "").trim();
    if (!fabricCode) continue;

    const roleRaw = String(f?.role || "main").trim();
    const role = ROLE_SET.has(roleRaw) ? roleRaw : "main";

    const unitRaw = String(f?.consumption?.unit || "meter").trim();
    const unit = UNIT_SET.has(unitRaw) ? unitRaw : "meter";

    let value = Number(f?.consumption?.value ?? 0);
    if (Number.isNaN(value) || value < 0) value = 0;

    const notes = String(f?.notes || "").trim();

    const key = `${fabricCode}__${role}`;
    if (seen.has(key)) continue; // de-dupe
    seen.add(key);

    out.push({
      fabricCode,
      role,
      consumption: { value, unit },
      notes,
    });
  }

  return out;
};

// ✅ numeric hygiene for stock endpoints
const toNonNegInt = (v, fallback = 0) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
};

// ✅ Variant size helpers (API is size-based now)
const normalizeSize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const getVariantSize = (variant) => {
  if (!variant) return "";
  if (variant.size) return String(variant.size);

  const attrs = Array.isArray(variant.attributes) ? variant.attributes : [];
  const hit = attrs.find(
    (a) =>
      String(a?.key || "")
        .trim()
        .toLowerCase() === "size" ||
      String(a?.key || "")
        .trim()
        .toLowerCase() === "sizes",
  );

  return hit?.value ? String(hit.value) : "";
};

export const useAdminProductStore = create((set, get) => ({
  /* ============================================================
    STATE
  ============================================================ */
  products: [],
  product: null,
  bulkSelectedIds: [],
  bulkPriceDraft: {}, // { [id]: { price?, compareAtPrice? } }
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,

  loading: false,
  saving: false,
  error: null,

  /* ============================================================
    HELPERS
  ============================================================ */
  setLoading: (v) => set({ loading: v }),
  setSaving: (v) => set({ saving: v }),
  resetProduct: () => set({ product: null }),

  toggleBulkSelect: (id) =>
    set((state) => ({
      bulkSelectedIds: state.bulkSelectedIds.includes(id)
        ? state.bulkSelectedIds.filter((x) => x !== id)
        : [...state.bulkSelectedIds, id],
    })),

  clearBulkSelection: () => set({ bulkSelectedIds: [], bulkPriceDraft: {} }),

  setBulkDraft: (id, patch) =>
    set((state) => ({
      bulkPriceDraft: {
        ...state.bulkPriceDraft,
        [id]: { ...(state.bulkPriceDraft[id] || {}), ...patch },
      },
    })),

  /* ============================================================
    FETCH ALL PRODUCTS (ADMIN GRID)
  ============================================================ */
  fetchProducts: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API}?${query}`, { credentials: "include" });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch products");

      set({
        products: data.products || [],
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0,
      });
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
    ✅ FETCH PRODUCTS BY CATEGORY (ADMIN)
  ============================================================ */
  fetchProductsByCategory: async (categorySlugOrId, params = {}) => {
    try {
      set({ loading: true, error: null });

      const category = String(categorySlugOrId || "").trim();
      if (!category) throw new Error("Category is required");

      const query = new URLSearchParams(params).toString();
      const url = `${API}/by-category/${encodeURIComponent(category)}${
        query ? `?${query}` : ""
      }`;

      const res = await fetch(url, { credentials: "include" });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch products by category");

      set({
        products: data.products || [],
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0,
      });

      return data.products || [];
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
    FETCH SINGLE PRODUCT (EDIT PAGE)
  ============================================================ */
  fetchProductById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/${id}`, { credentials: "include" });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch product");

      set({ product: data });
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
    CREATE PRODUCT
    - strips variant price fields
    - supports patternNumber/fabrics/avgFabricConsumption
  ============================================================ */
  createProduct: async (payload) => {
    try {
      set({ saving: true, error: null });

      payload = normalizeProductPayload(payload);

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Create failed");

      toast.success("Product created successfully");
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    UPDATE PRODUCT
    - strips variant price fields
    - supports patternNumber/fabrics/avgFabricConsumption
  ============================================================ */
  updateProduct: async (id, payload) => {
    try {
      set({ saving: true, error: null });

      payload = normalizeProductPayload(payload);

      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      set({ product: data.product });
      toast.success("Product updated successfully");
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    DELETE PRODUCT
  ============================================================ */
  deleteProduct: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      set({ products: get().products.filter((p) => p._id !== id) });
      toast.success("Product deleted");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    }
  },

  /* ============================================================
    BULK DELETE
  ============================================================ */
  bulkDelete: async (ids = []) => {
    try {
      if (!ids.length) return;

      const res = await fetch(`${API}/bulk/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk delete failed");

      set({ products: get().products.filter((p) => !ids.includes(p._id)) });
      toast.success("Products deleted");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    }
  },

  /* ============================================================
    BULK IMPORT
  ============================================================ */
  bulkImport: async (products = []) => {
    try {
      if (!products.length) {
        toast.error("No products to import ❌");
        return;
      }

      set({ saving: true });

      const normalized = products.map((p) => normalizeProductPayload(p));

      const res = await fetch(`${API}/bulk/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ products: normalized }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk import failed");

      toast.success(`Imported ${data.importedCount} ✅`);
      return data;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    ✅ SIMPLE PRODUCT STOCK UPDATE (NEW)
    PATCH /api/products/:id/stock   body: { stock }
  ============================================================ */
  updateProductStock: async (productId, stock) => {
    try {
      const nextStock = toNonNegInt(stock, 0);

      const res = await fetch(`${API}/${productId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stock: nextStock }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Stock update failed");

      const updatedProduct = data.product;

      // single product (edit page)
      if (get().product?._id === productId) set({ product: updatedProduct });

      // list update
      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === productId
            ? {
                ...p,
                stock: updatedProduct.stock ?? nextStock,
                isInStock: updatedProduct.isInStock ?? p.isInStock,
              }
            : p,
        ),
      }));

      toast.success("Stock updated ✅");
      return updatedProduct;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    }
  },

  /* ============================================================
    VARIANT STOCK UPDATE
    PATCH /api/products/:id/variant-stock  body:{ variantId, stock }
  ============================================================ */
  /* ============================================================
  ✅ VARIANT STOCK UPDATE (UPDATED)
  PATCH /api/products/:id/variant-stock  body:{ size, stock }
============================================================ */
  updateVariantStock: async (productId, size, stock) => {
    try {
      const nextStock = toNonNegInt(stock, 0);
      const targetSize = normalizeSize(size);

      if (!targetSize) {
        throw new Error("size is required (e.g. 'M')");
      }

      const res = await fetch(`${API}/${productId}/variant-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ size: targetSize, stock: nextStock }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Stock update failed");

      const updatedProduct = data.product;

      // ✅ update single product (edit page)
      if (get().product?._id === productId) set({ product: updatedProduct });

      // ✅ update product list (grid)
      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === productId
            ? {
                ...p,
                stock: updatedProduct.stock ?? p.stock,
                variants: updatedProduct.variants ?? p.variants,
                isInStock: updatedProduct.isInStock ?? p.isInStock,
              }
            : p,
        ),
      }));

      toast.success(`Variant stock updated ✅ (${targetSize})`);
      return updatedProduct;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    }
  },

  /* ============================================================
    ANALYTICS UPDATE
  ============================================================ */
  incrementAnalytics: async (productId, type) => {
    try {
      await fetch(`${API}/${productId}/analytics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  /* ============================================================
    TOGGLE PUBLISH (single)
  ============================================================ */
  togglePublish: async (id, publish) => {
    try {
      set({ saving: true, error: null });

      const payload = publish
        ? { isActive: true, isDraft: false }
        : { isActive: false, isDraft: false };

      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Publish update failed");

      const updated = data.product || null;

      set({
        products: get().products.map((p) =>
          p._id === id ? (updated ? updated : { ...p, ...payload }) : p,
        ),
      });

      toast.success(publish ? "Published ✅" : "Unpublished ✅");
      return updated;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    BULK PUBLISH / UNPUBLISH
  ============================================================ */
  bulkPublish: async (ids = [], publish = true) => {
    try {
      if (!ids.length) return;
      set({ saving: true });

      const payload = publish
        ? { isActive: true, isDraft: false }
        : { isActive: false, isDraft: false };

      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${API}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || `Failed for ${id}`);
        }),
      );

      set({
        products: get().products.map((p) =>
          ids.includes(p._id) ? { ...p, ...payload } : p,
        ),
      });

      toast.success(
        publish ? "Products Published ✅" : "Products Unpublished ✅",
      );
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Bulk publish failed");
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    INLINE PRICE UPDATE (grid)
  ============================================================ */
  updatePriceInline: async (id, price) => {
    try {
      set({ saving: true });

      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ price }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Price update failed");

      set({
        products: get().products.map((p) =>
          p._id === id ? { ...p, price } : p,
        ),
      });

      toast.success("Price updated ✅");
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  updateComparePriceInline: async (id, compareAtPrice) => {
    try {
      set({ saving: true });

      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ compareAtPrice }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Compare price update failed");

      set({
        products: get().products.map((p) =>
          p._id === id ? { ...p, compareAtPrice } : p,
        ),
      });

      toast.success("Compare price updated ✅");
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  updateCategoriesInline: async (id, categories) => {
    set({ saving: true });

    try {
      if (!Array.isArray(categories) || categories.length === 0) {
        toast.error("At least 1 category required");
        return;
      }

      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categories }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || "Failed to update categories");

      const updatedProduct = data?.product;

      set((state) => ({
        products: state.products.map((p) =>
          p._id === id
            ? { ...p, categories: updatedProduct?.categories || categories }
            : p,
        ),
      }));

      toast.success("Categories updated ✅");
      return updatedProduct;
    } catch (e) {
      console.error("❌ updateCategoriesInline error:", e);
      toast.error(e.message || "Failed to update categories");
    } finally {
      set({ saving: false });
    }
  },

  updateProductStatus: async (id, status) => {
    try {
      set({ saving: true });

      const payload =
        status === "published"
          ? { isDraft: false, isActive: true }
          : status === "draft"
            ? { isDraft: true, isActive: true }
            : { isActive: false };

      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Status update failed");

      set({
        products: get().products.map((p) =>
          p._id === id ? { ...p, ...payload } : p,
        ),
      });

      toast.success(`Status updated ✅ (${status})`);
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    INLINE TITLE UPDATE (grid)
  ============================================================ */
  updateTitleInline: async (id, title) => {
    try {
      set({ saving: true });

      const next = String(title || "").trim();
      if (!next) {
        toast.error("Title is required");
        return;
      }

      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: next }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Title update failed");

      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === id ? { ...p, title: next } : p,
        ),
      }));

      if (get().product?._id === id) {
        set((state) => ({
          product: state.product
            ? { ...state.product, title: next }
            : state.product,
        }));
      }

      toast.success("Title updated ✅");
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    ✅ FETCH ALL PRODUCTS (ADMIN) - robust pagination
  ============================================================ */
  fetchAllProducts: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const REQUEST_LIMIT = 250;
      let page = 1;

      const merged = [];
      const seen = new Set();

      let totalFromApi = 0;
      let pagesFromApi = 0;

      const MAX_PAGES = 2000;

      while (page <= MAX_PAGES) {
        const query = new URLSearchParams({
          ...params,
          page: String(page),
          limit: String(REQUEST_LIMIT),
        }).toString();

        const res = await fetch(`${API}?${query}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to fetch products");

        const list = Array.isArray(data.products) ? data.products : [];

        totalFromApi = Number(data.total || totalFromApi || 0);
        pagesFromApi = Number(data.pages || pagesFromApi || 0);

        if (list.length === 0) break;

        let added = 0;
        for (const p of list) {
          const id = String(p?._id || "").trim();
          if (!id || seen.has(id)) continue;
          seen.add(id);
          merged.push(p);
          added += 1;
        }

        if (added === 0) break;

        if (totalFromApi && merged.length >= totalFromApi) break;
        if (pagesFromApi && page >= pagesFromApi) break;

        page += 1;
      }

      set({
        products: merged,
        page: 1,
        total: totalFromApi || merged.length,
        pages: pagesFromApi || 1,
      });

      return merged;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  applyBulkPricingRule: ({ mode, field, value }) => {
    const { products, bulkSelectedIds, bulkPriceDraft } = get();

    if (!bulkSelectedIds.length) {
      toast.error("Select at least 1 product");
      return;
    }

    const updatedDraft = { ...bulkPriceDraft };

    bulkSelectedIds.forEach((id) => {
      const p = products.find((x) => x._id === id);
      if (!p) return;

      const base = Number(updatedDraft[id]?.[field] ?? p[field] ?? 0);
      let next = base;

      if (mode === "set") next = Number(value);
      if (mode === "inc_pct")
        next = Math.round(base * (1 + Number(value) / 100));
      if (mode === "dec_pct")
        next = Math.round(base * (1 - Number(value) / 100));
      if (mode === "inc_amt") next = base + Number(value);
      if (mode === "dec_amt") next = base - Number(value);

      if (next < 0) next = 0;

      updatedDraft[id] = {
        ...(updatedDraft[id] || {}),
        [field]: next,
      };
    });

    set({ bulkPriceDraft: updatedDraft });
    toast.success("Bulk pricing rule applied ✅");
  },

  saveBulkPricing: async () => {
    try {
      set({ saving: true });

      const { bulkPriceDraft } = get();
      const updates = Object.entries(bulkPriceDraft).map(([id, values]) => ({
        _id: id,
        ...values,
      }));

      if (!updates.length) {
        toast.error("No changes to save");
        return;
      }

      const res = await fetch(`${API}/bulk/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk pricing failed");

      await get().fetchProducts({ page: get().page, limit: get().limit });

      set({ bulkPriceDraft: {}, bulkSelectedIds: [] });
      toast.success(`Updated ${data.modifiedCount} products ✅`);
      return data;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  fetchProductsByIds: async (ids = []) => {
    try {
      ids = Array.isArray(ids)
        ? ids
        : typeof ids === "string"
          ? ids.split(",").map((x) => x.trim())
          : [];

      ids = [...new Set(ids.filter(Boolean))];
      if (!ids.length) return [];

      const res = await fetch(`${API}/by-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch products");

      return data.products || [];
    } catch (e) {
      console.error("❌ fetchProductsByIds error:", e);
      toast.error(e.message);
      return [];
    }
  },

  // ✅ FIXED: wrong url in your code (it was `${API}/api/products/bulk-status`)
  bulkStatus: async (ids = [], status) => {
    set({ saving: true });
    try {
      const res = await fetch(`${API}/bulk-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, status }), // published|draft|unpublished
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed bulk status update");

      set((state) => ({
        products: (state.products || []).map((p) => {
          if (!ids.includes(p._id)) return p;

          if (status === "published")
            return { ...p, isActive: true, isDraft: false };
          if (status === "draft")
            return { ...p, isActive: true, isDraft: true };
          return { ...p, isActive: false }; // unpublished
        }),
      }));

      toast.success("Bulk status updated ✅");
      return data;
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Bulk status failed");
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
    ✅ UPDATE PRODUCT FABRICS (dedicated route)
    PATCH /api/products/:id/fabrics
  ============================================================ */
  updateProductFabrics: async (id, fabrics) => {
    try {
      set({ saving: true, error: null });

      const normalized = normalizeFabricsPayload(fabrics);

      const res = await fetch(`${API}/${id}/fabrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fabrics: normalized }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fabrics update failed");

      if (get().product && String(get().product?._id) === String(id)) {
        set({ product: data.product });
      }

      set((state) => ({
        products: (state.products || []).map((p) =>
          String(p._id) === String(id)
            ? { ...p, fabrics: data.product?.fabrics ?? normalized }
            : p,
        ),
      }));

      toast.success("Fabrics updated ✅");
      return data.product;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  updateSamplingStatus: async (productId, isSamplingDone) => {
    try {
      set({ saving: true });

      const res = await fetch(`${API}/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isSamplingDone: !!isSamplingDone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sampling update failed");

      const updated = data.product;

      // single product
      if (get().product?._id === productId) set({ product: updated });

      // list update
      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === productId
            ? { ...p, isSamplingDone: !!updated?.isSamplingDone }
            : p,
        ),
      }));

      toast.success(
        updated.isSamplingDone ? "Sampling Done ✅" : "Sampling Undo ↩️",
      );
      return updated;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  updateProductColorsOnly: async (productId, colors) => {
    try {
      set({ saving: true, error: null });

      const list = Array.isArray(colors)
        ? colors
        : typeof colors === "string"
          ? colors.split(",")
          : [];

      const normalized = Array.from(
        new Set(
          list
            .map((c) =>
              String(c || "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean),
        ),
      );

      const res = await fetch(`${API}/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ colors: normalized }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Colors update failed");

      const updated = data.product;

      // edit page
      if (get().product?._id === productId) set({ product: updated });

      // grid list
      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === productId
            ? { ...p, colors: updated.colors ?? normalized }
            : p,
        ),
      }));

      toast.success("Colors updated ✅");
      return updated;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },
}));
