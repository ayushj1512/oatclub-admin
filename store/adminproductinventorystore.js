"use client";

import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const API = `${BASE_URL}/api/products/admin/inventory`;

/* ============================================================
   HELPERS
============================================================ */
const s = (v) => String(v ?? "").trim();

const toBool = (v, fallback = undefined) => {
  if (typeof v === "boolean") return v;
  const x = s(v).toLowerCase();
  if (!x) return fallback;
  if (["true", "1", "yes"].includes(x)) return true;
  if (["false", "0", "no"].includes(x)) return false;
  return fallback;
};

const toNonNegInt = (v, fallback = 0) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
};

const safeArr = (v) => (Array.isArray(v) ? v : []);

const buildUrl = (path = "", params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      const list = value.map((x) => s(x)).filter(Boolean);
      if (list.length) query.set(key, list.join(","));
      return;
    }

    const val = s(value);
    if (val === "") return;
    query.set(key, val);
  });

  const qs = query.toString();
  return `${API}${path}${qs ? `?${qs}` : ""}`;
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid JSON response" };
  }
};

const normalizeProduct = (p) => {
  if (!p || typeof p !== "object") return p;

  return {
    ...p,
    _id: s(p._id),
    title: s(p.title),
    productCode: s(p.productCode),
    sku: s(p.sku),
    thumbnail: s(p.thumbnail),
    images: safeArr(p.images),
    categories: safeArr(p.categories),
    variants: safeArr(p.variants).map((v) => ({
      ...v,
      _id: s(v?._id),
      sku: s(v?.sku),
      barcode: s(v?.barcode),
      size: s(v?.size),
      stock: Number(v?.stock ?? 0),
      reservedStock: Number(v?.reservedStock ?? 0),
      availableStock: Number(v?.availableStock ?? 0),
      isInStock: !!v?.isInStock,
      attributes: safeArr(v?.attributes),
    })),
    stock: Number(p.stock ?? 0),
    reservedStock: Number(p.reservedStock ?? 0),
    availableStock: Number(p.availableStock ?? 0),
    isInStock: !!p.isInStock,
    isActive: !!p.isActive,
    isDraft: !!p.isDraft,
    isBestSeller: !!p.isBestSeller,
    productType: s(p.productType),
    updatedAt: p.updatedAt || null,
    createdAt: p.createdAt || null,
  };
};

const replaceProductInList = (list = [], updatedProduct) => {
  const pid = s(updatedProduct?._id);
  if (!pid) return list;
  return safeArr(list).map((item) => (s(item?._id) === pid ? updatedProduct : item));
};

/* ============================================================
   DEFAULT FILTERS
============================================================ */
const defaultFilters = () => ({
  q: "",
  category: "",
  categories: [],
  hideFootwear: true,
  footwearKeys: ["footwear", "shoes", "sneakers", "slippers", "sandals"],
  sort: "updated_desc",
  productType: "",
  hasVariants: undefined,
  inStock: undefined,
  isActive: undefined,
  isDraft: undefined,
  isBestSeller: undefined,
  minStock: "",
  maxStock: "",
  minAvailableStock: "",
  maxAvailableStock: "",
  minReservedStock: "",
  maxReservedStock: "",
});

const filtersToParams = (filters = {}, page = 1, limit = 70) => ({
  page,
  limit,
  q: filters.q,
  category: filters.category,
  categories: filters.categories,
  hideFootwear:
    typeof filters.hideFootwear === "boolean" ? String(filters.hideFootwear) : undefined,
  footwearKeys: filters.footwearKeys,
  sort: filters.sort,
  productType: filters.productType,
  hasVariants:
    typeof filters.hasVariants === "boolean" ? String(filters.hasVariants) : undefined,
  inStock: typeof filters.inStock === "boolean" ? String(filters.inStock) : undefined,
  isActive: typeof filters.isActive === "boolean" ? String(filters.isActive) : undefined,
  isDraft: typeof filters.isDraft === "boolean" ? String(filters.isDraft) : undefined,
  isBestSeller:
    typeof filters.isBestSeller === "boolean" ? String(filters.isBestSeller) : undefined,
  minStock: filters.minStock,
  maxStock: filters.maxStock,
  minAvailableStock: filters.minAvailableStock,
  maxAvailableStock: filters.maxAvailableStock,
  minReservedStock: filters.minReservedStock,
  maxReservedStock: filters.maxReservedStock,
});

/* ============================================================
   STORE
============================================================ */
export const useAdminProductInventoryStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  products: [],
  product: null,
  categories: [],

  page: 1,
  limit: 70,
  total: 0,
  pages: 1,

  filters: defaultFilters(),
  filtersApplied: {},

  loading: false,
  loadingOne: false,
  loadingCategories: false,
  saving: false,
  error: null,

  /* =========================
     LOCAL SETTERS
  ========================= */
  setLoading: (v) => set({ loading: !!v }),
  setSaving: (v) => set({ saving: !!v }),
  setPage: (page) => set({ page: Math.max(1, Number(page) || 1) }),
  setLimit: (limit) => set({ limit: Math.min(200, Math.max(1, Number(limit) || 70)) }),

  setFilters: (patch = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...patch,
      },
    })),

  resetFilters: () =>
    set({
      filters: defaultFilters(),
      page: 1,
    }),

  clearProduct: () => set({ product: null }),

  /* =========================
     FETCH INVENTORY LIST
  ========================= */
  fetchProducts: async (override = {}) => {
    try {
      set({ loading: true, error: null });

      const state = get();

      const nextPage =
        override.page !== undefined
          ? Math.max(1, Number(override.page) || 1)
          : state.page;

      const nextLimit =
        override.limit !== undefined
          ? Math.min(200, Math.max(1, Number(override.limit) || 70))
          : state.limit;

      const nextFilters = {
        ...state.filters,
        ...(override.filters || {}),
      };

      const url = buildUrl("", filtersToParams(nextFilters, nextPage, nextLimit));

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch inventory products");

      const products = safeArr(data?.products).map(normalizeProduct);

      set({
        products,
        page: Number(data?.page || nextPage || 1),
        limit: Number(data?.limit || nextLimit || 70),
        total: Number(data?.total || 0),
        pages: Number(data?.pages || 1),
        filters: nextFilters,
        filtersApplied: data?.filtersApplied || {},
      });

      return data;
    } catch (e) {
      console.error("❌ fetchProducts error:", e);
      set({ error: e.message || "Failed to fetch inventory products" });
      toast.error(e.message || "Failed to fetch inventory products");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  /* =========================
     FETCH CATEGORIES
  ========================= */
  fetchCategories: async () => {
    try {
      set({ loadingCategories: true, error: null });

      const res = await fetch(`${API}/categories`, {
        method: "GET",
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch categories");

      set({
        categories: safeArr(data?.categories),
      });

      return safeArr(data?.categories);
    } catch (e) {
      console.error("❌ fetchCategories error:", e);
      set({ error: e.message || "Failed to fetch categories" });
      toast.error(e.message || "Failed to fetch categories");
      return [];
    } finally {
      set({ loadingCategories: false });
    }
  },

  /* =========================
     FETCH SINGLE PRODUCT
  ========================= */
  fetchProductById: async (id) => {
    try {
      const pid = s(id);
      if (!pid) {
        toast.error("Product id is required");
        return null;
      }

      set({ loadingOne: true, error: null });

      const res = await fetch(`${API}/${encodeURIComponent(pid)}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch product inventory");

      const product = normalizeProduct(data?.product || null);

      set({ product });
      return product;
    } catch (e) {
      console.error("❌ fetchProductById error:", e);
      set({ error: e.message || "Failed to fetch product inventory" });
      toast.error(e.message || "Failed to fetch product inventory");
      return null;
    } finally {
      set({ loadingOne: false });
    }
  },

  /* =========================
     APPLY SEARCH / FILTERS
  ========================= */
  applyFiltersAndFetch: async (patch = {}) => {
    const nextFilters = {
      ...get().filters,
      ...patch,
    };

    set({
      filters: nextFilters,
      page: 1,
    });

    return await get().fetchProducts({
      page: 1,
      filters: nextFilters,
    });
  },

  clearFiltersAndFetch: async () => {
    const nextFilters = defaultFilters();

    set({
      filters: nextFilters,
      page: 1,
    });

    return await get().fetchProducts({
      page: 1,
      filters: nextFilters,
    });
  },

  goToPage: async (page) => {
    const nextPage = Math.max(1, Number(page) || 1);
    set({ page: nextPage });
    return await get().fetchProducts({ page: nextPage });
  },

  nextPage: async () => {
    const { page, pages } = get();
    if (page >= pages) return null;
    return await get().goToPage(page + 1);
  },

  prevPage: async () => {
    const { page } = get();
    if (page <= 1) return null;
    return await get().goToPage(page - 1);
  },

  refresh: async () => {
    const { page, filters } = get();
    return await get().fetchProducts({ page, filters });
  },

  /* =========================
     UPDATE SIMPLE STOCK
  ========================= */
  updateSimpleStock: async (id, stock) => {
    try {
      const pid = s(id);
      if (!pid) {
        toast.error("Product id is required");
        return null;
      }

      const nextStock = toNonNegInt(stock, -1);
      if (nextStock < 0) {
        toast.error("Stock must be a non-negative integer");
        return null;
      }

      set({ saving: true, error: null });

      const res = await fetch(`${API}/${encodeURIComponent(pid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stock: nextStock }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update stock");

      const updatedProduct = normalizeProduct(data?.product || null);

      set((state) => ({
        product:
          s(state.product?._id) === s(updatedProduct?._id) ? updatedProduct : state.product,
        products: updatedProduct
          ? replaceProductInList(state.products, updatedProduct)
          : state.products,
      }));

      toast.success(data?.message || "Stock updated ✅");
      return data;
    } catch (e) {
      console.error("❌ updateSimpleStock error:", e);
      set({ error: e.message || "Failed to update stock" });
      toast.error(e.message || "Failed to update stock");
      return null;
    } finally {
      set({ saving: false });
    }
  },

  /* =========================
     UPDATE VARIANT STOCK BY SIZE
  ========================= */
  updateVariantStockBySize: async (id, size, stock) => {
    try {
      const pid = s(id);
      const normalizedSize = s(size);
      const nextStock = toNonNegInt(stock, -1);

      if (!pid) {
        toast.error("Product id is required");
        return null;
      }
      if (!normalizedSize) {
        toast.error("Size is required");
        return null;
      }
      if (nextStock < 0) {
        toast.error("Stock must be a non-negative integer");
        return null;
      }

      set({ saving: true, error: null });

      const res = await fetch(`${API}/${encodeURIComponent(pid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          size: normalizedSize,
          stock: nextStock,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update variant stock");

      const updatedProduct = normalizeProduct(data?.product || null);

      set((state) => ({
        product:
          s(state.product?._id) === s(updatedProduct?._id) ? updatedProduct : state.product,
        products: updatedProduct
          ? replaceProductInList(state.products, updatedProduct)
          : state.products,
      }));

      toast.success(data?.message || `Variant stock updated ✅ (${normalizedSize})`);
      return data;
    } catch (e) {
      console.error("❌ updateVariantStockBySize error:", e);
      set({ error: e.message || "Failed to update variant stock" });
      toast.error(e.message || "Failed to update variant stock");
      return null;
    } finally {
      set({ saving: false });
    }
  },

  /* =========================
     UPDATE VARIANT STOCK BY VARIANT ID
  ========================= */
  updateVariantStockByVariantId: async (id, variantId, stock) => {
    try {
      const pid = s(id);
      const vid = s(variantId);
      const nextStock = toNonNegInt(stock, -1);

      if (!pid) {
        toast.error("Product id is required");
        return null;
      }
      if (!vid) {
        toast.error("Variant id is required");
        return null;
      }
      if (nextStock < 0) {
        toast.error("Stock must be a non-negative integer");
        return null;
      }

      set({ saving: true, error: null });

      const res = await fetch(`${API}/${encodeURIComponent(pid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          variantId: vid,
          stock: nextStock,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update variant stock");

      const updatedProduct = normalizeProduct(data?.product || null);

      set((state) => ({
        product:
          s(state.product?._id) === s(updatedProduct?._id) ? updatedProduct : state.product,
        products: updatedProduct
          ? replaceProductInList(state.products, updatedProduct)
          : state.products,
      }));

      toast.success(data?.message || "Variant stock updated ✅");
      return data;
    } catch (e) {
      console.error("❌ updateVariantStockByVariantId error:", e);
      set({ error: e.message || "Failed to update variant stock" });
      toast.error(e.message || "Failed to update variant stock");
      return null;
    } finally {
      set({ saving: false });
    }
  },

  /* =========================
     SMART INVENTORY UPDATE
  ========================= */
  updateInventory: async ({ id, stock, size, variantId } = {}) => {
    if (variantId) {
      return await get().updateVariantStockByVariantId(id, variantId, stock);
    }
    if (size) {
      return await get().updateVariantStockBySize(id, size, stock);
    }
    return await get().updateSimpleStock(id, stock);
  },
}));