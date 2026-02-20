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

  // ✅ backend removed this field (avoid sending)
  delete out.longDescription;

  const toStr = (v) => String(v ?? "").trim();
  const toBool = (v) =>
    typeof v === "boolean" ? v : ["true", "1", "yes"].includes(toStr(v).toLowerCase());

  // (keep if your UI still uses it somewhere)
  if (out.patternNumber !== undefined) out.patternNumber = toStr(out.patternNumber);

  // ✅ NEW: product link (accept both keys)
  if (out.originalProductLink !== undefined) out.originalProductLink = toStr(out.originalProductLink);
  if (out.productLink !== undefined && out.originalProductLink === undefined) {
    out.originalProductLink = toStr(out.productLink);
  }
  delete out.productLink;

  // ✅ NEW: allow sending (backend may recompute from variants)
  if (out.isPatternReady !== undefined) out.isPatternReady = toBool(out.isPatternReady);

  // ✅ HSN Code hygiene: trim + digits-only (allow empty)
  if (out.hsnCode !== undefined) {
    const hsn = toStr(out.hsnCode);
    out.hsnCode = hsn === "" ? "" : hsn.replace(/[^\d]/g, "");
  }

  // allow JSON strings
  const tryJson = (v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };

  out.fabrics = tryJson(out.fabrics);
  out.avgFabricConsumption = tryJson(out.avgFabricConsumption);

  // ✅ highlights -> keyFeatures
  if (out.highlights !== undefined && out.keyFeatures === undefined) {
    out.keyFeatures = out.highlights;
  }

  // ✅ normalize keyFeatures
  if (out.keyFeatures !== undefined) {
    const raw = tryJson(out.keyFeatures);
    const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
    out.keyFeatures = Array.from(new Set(list.map((x) => toStr(x)).filter(Boolean)));
  }
  delete out.highlights;

  // ✅ optional trims (safe)
  if (out.shortDescription !== undefined) out.shortDescription = toStr(out.shortDescription);
  if (out.howToStyle !== undefined) out.howToStyle = toStr(out.howToStyle);
  if (out.fabricDetails !== undefined) out.fabricDetails = toStr(out.fabricDetails);

  // ✅ SPECIFICATIONS hygiene
  const normalizeSpecs = (v) => {
    const rows = [];
    const push = (k, val) => {
      const key = toStr(k);
      const value = toStr(val);
      if (!key) return;
      rows.push({ key, value });
    };

    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return [];
      try {
        v = JSON.parse(t);
      } catch {
        const parts = t.includes("|") ? t.split("|") : t.split(",");
        for (const p of parts) {
          const ss = String(p || "").trim();
          if (!ss) continue;
          const sep = ss.includes(":") ? ":" : ss.includes("=") ? "=" : null;
          if (!sep) continue;
          const [k, ...rest] = ss.split(sep);
          push(k, rest.join(sep));
        }
        return rows;
      }
    }

    if (Array.isArray(v)) return v.forEach((r) => r && push(r.key, r.value)), rows;
    if (v && typeof v === "object") return Object.entries(v).forEach(([k, val]) => push(k, val)), rows;

    return [];
  };

  // allow both: specifications / specs
  if (out.specifications !== undefined || out.specs !== undefined) {
    out.specifications = normalizeSpecs(out.specifications ?? out.specs);
    delete out.specs;

    if (Array.isArray(out.specifications) && out.specifications.length === 0) {
      delete out.specifications;
    }
  }

  // ✅ COLORS hygiene
  if (out.colors !== undefined) {
    const raw = tryJson(out.colors);
    const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
    out.colors = Array.from(new Set(list.map((c) => toStr(c).toLowerCase()).filter(Boolean)));
  }

  return out;
};



const normalizeFabricsPayload = (fabrics) => {
  const s = (v) => String(v ?? "").trim();
  const ROLES = new Set(["main", "lining", "contrast", "padding", "other"]);

  // allow JSON string
  if (typeof fabrics === "string") {
    try { fabrics = JSON.parse(fabrics); }
    catch { return []; }
  }

  if (!Array.isArray(fabrics)) return [];

  const seen = new Set();
  const out = [];

  for (const f of fabrics) {
    // allow string row → fabricName
    if (typeof f === "string") {
      const fabricName = s(f);
      if (!fabricName) continue;

      const key = `${fabricName.toLowerCase()}__main`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        fabricName,
        fabricCode: "",
        fabricColor: "",
        role: "main",
      });
      continue;
    }

    if (!f || typeof f !== "object") continue;

    const fabricName = s(f.fabricName);
    const fabricCode = s(f.fabricCode);
    const fabricColor = s(f.fabricColor);
    const roleRaw = s(f.role || "main").toLowerCase();
    const role = ROLES.has(roleRaw) ? roleRaw : "main";

    // backward compat: if only fabricCode came
    const finalName = fabricName || fabricCode;
    if (!finalName) continue;

    const key = `${finalName.toLowerCase()}__${role}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      fabricName: finalName,
      fabricCode: fabricCode || "",
      fabricColor: fabricColor || "",
      role,
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

  /* ============================================================
    ✅ SAMPLING STATUS
  ============================================================ */

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


     /* ============================================================
    ✅ ADD COLOUR 
  ============================================================ */
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

    /* ============================================================
    ✅ TOGGLE BEST SELLER
    PATCH /api/products/:id/best-seller
    - body empty => toggle
    - body { isBestSeller: true/false } => force set
  ============================================================ */
  toggleBestSeller: async (productId, nextValue) => {
    try {
      set({ saving: true, error: null });

      const body =
        typeof nextValue === "boolean" ? { isBestSeller: nextValue } : {};

      const res = await fetch(`${API}/${productId}/best-seller`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Best seller update failed");

      const updated = data.product;

      // ✅ edit page
      if (get().product?._id === productId) set({ product: updated });

      // ✅ grid list
      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === productId
            ? { ...p, isBestSeller: !!updated?.isBestSeller }
            : p
        ),
      }));

      toast.success(
        updated?.isBestSeller ? "Marked Best Seller ✅" : "Removed Best Seller ✅"
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

   /* =========================
    ✅ NEW: MARK PATTERN READY (manual)
    PATCH /api/products/:id/mark-pattern-ready
  ========================= */
  markPatternReady: async (productId) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/${productId}/mark-pattern-ready`, {
        method: "PATCH",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Mark pattern ready failed");

      const updated = data.product;

      if (get().product?._id === productId) set({ product: updated });

      set((state) => ({
        products: (state.products || []).map((p) =>
          p._id === productId ? { ...p, isPatternReady: !!updated?.isPatternReady } : p
        ),
      }));

      toast.success("Marked Pattern Ready ✅");
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
