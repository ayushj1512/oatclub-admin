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
      if (!products.length) {
        toast.error("No products to import ❌");
        return;
      }

      set({ saving: true });

      const res = await fetch(`${API}/bulk/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ products }),
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


      /* ============================================================
      TOGGLE PUBLISH (single)
    ============================================================ */
 togglePublish: async (id, publish) => {
  try {
    set({ saving: true, error: null });

    // ✅ Map publish toggle to your real schema fields
    const payload = publish
      ? { isActive: true, isDraft: false }   // Published ✅
      : { isActive: false, isDraft: false }; // Unpublished ❌

    const res = await fetch(`${API}/${id}`, {
      method: "PATCH", // ✅ PATCH is semantically correct for partial update
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Publish update failed");

    const updated = data.product || null;

    // ✅ Update the product list instantly using server response (best)
    set({
      products: get().products.map((p) =>
        p._id === id ? (updated ? updated : { ...p, ...payload }) : p
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
      })
    );

    set({
      products: get().products.map((p) =>
        ids.includes(p._id) ? { ...p, ...payload } : p
      ),
    });

    toast.success(publish ? "Products Published ✅" : "Products Unpublished ✅");
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
        p._id === id ? { ...p, price } : p
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
    if (!res.ok) throw new Error(data?.message || "Failed to update categories");

    const updatedProduct = data?.product;

    set((state) => ({
      products: state.products.map((p) =>
        p._id === id
          ? { ...p, categories: updatedProduct?.categories || categories }
          : p
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
        : { isActive: false }; // unpublished

    const res = await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Status update failed");

    // ✅ update in list instantly
    set({
      products: get().products.map((p) =>
        p._id === id ? { ...p, ...payload } : p
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
    if (mode === "inc_pct") next = Math.round(base * (1 + Number(value) / 100));
    if (mode === "dec_pct") next = Math.round(base * (1 - Number(value) / 100));
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

    // ✅ Refresh grid products after bulk update
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

    const updatedProduct = data.product;

    // ✅ Update edit page product
    set({ product: updatedProduct });

    // ✅ ALSO update grid list
    set((state) => ({
      products: state.products.map((p) =>
        p._id === productId
          ? {
              ...p,
              stock: updatedProduct.stock ?? p.stock, // ✅ stock update
              variants: updatedProduct.variants ?? p.variants, // ✅ optional
            }
          : p
      ),
    }));

    toast.success("Variant stock updated ✅");
    return updatedProduct;
  } catch (e) {
    console.error(e);
    toast.error(e.message);
  }
},



  }));

  