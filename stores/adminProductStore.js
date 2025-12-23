import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/products`;

export const useAdminProductStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  products: [],
  product: null,

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

  /* ============================================================
     FETCH ALL PRODUCTS (ADMIN GRID)
  ============================================================ */
  fetchProducts: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API}?${query}`, {
        credentials: "include",
      });

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
     FETCH SINGLE PRODUCT (EDIT PAGE)
  ============================================================ */
  fetchProductById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/${id}`, {
        credentials: "include",
      });

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
     (supports crossSellProducts[])
  ============================================================ */
  createProduct: async (payload) => {
    try {
      set({ saving: true, error: null });

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
     (crossSellProducts safe)
  ============================================================ */
  updateProduct: async (id, payload) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
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

      set({
        products: get().products.filter((p) => p._id !== id),
      });

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

      set({
        products: get().products.filter((p) => !ids.includes(p._id)),
      });

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
      set({ saving: true });

      const res = await fetch(`${API}/bulk/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ products }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk import failed");

      toast.success(`Imported ${data.importedCount} products`);
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
     VARIANT STOCK UPDATE
  ============================================================ */
  updateVariantStock: async (productId, variantId, stock) => {
    try {
      const res = await fetch(`${API}/${productId}/variant-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variantId, stock }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Stock update failed");

      set({ product: data.product });
      toast.success("Variant stock updated");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
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
}));
