import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/collections`;

/**
 * 🔥 IMPORTANT UPDATE (Collection Model changed)
 * products is now:
 *  [
 *    { product: "<productId>", productCode: "ABC123" }
 *  ]
 *
 * So everywhere we were sending productIds[] we must send products[] objects.
 */

// Normalize for safety (supports old payloads too)
const normalizeProductsPayload = (products) => {
  if (!Array.isArray(products)) return [];

  return products
    .map((p) => {
      // old style: "productId"
      if (typeof p === "string") {
        return { product: p, productCode: "" };
      }

      // old style: { _id, productCode? } coming from product objects in UI
      if (p && typeof p === "object" && p._id && !p.product) {
        return { product: p._id, productCode: p.productCode || "" };
      }

      // new style: { product, productCode }
      if (p && typeof p === "object" && p.product) {
        return { product: p.product, productCode: p.productCode || "" };
      }

      return null;
    })
    .filter(Boolean);
};

// Helps you build products array from product objects list
const buildProductsFromProductObjects = (productList = []) =>
  normalizeProductsPayload(
    productList.map((p) => ({
      product: p?._id,
      productCode: p?.productCode || p?.code || p?.sku || "",
    }))
  );

export const useAdminCollectionStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  collections: [],
  collection: null,

  loading: false,
  saving: false,
  error: null,

  /* ============================================================
     HELPERS
  ============================================================ */
  setLoading: (v) => set({ loading: v }),
  setSaving: (v) => set({ saving: v }),
  resetCollection: () => set({ collection: null }),

  /* ============================================================
     FETCH ALL COLLECTIONS
  ============================================================ */
  fetchCollections: async () => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(API, { credentials: "include" });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message || "Failed to fetch collections");

      set({ collections: Array.isArray(data) ? data : [] });
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     FETCH SINGLE COLLECTION (ID OR SLUG)
  ============================================================ */
  fetchCollectionByIdOrSlug: async (idOrSlug) => {
    if (!idOrSlug) return;

    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/${idOrSlug}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message || "Failed to fetch collection");

      set({ collection: data });
      return data;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     CREATE COLLECTION
     ✅ ensures products are in new format
  ============================================================ */
  createCollection: async (payload) => {
    try {
      set({ saving: true, error: null });

      const safePayload = { ...payload };

      // if payload.products exists in any format -> normalize
      if (safePayload.products) {
        safePayload.products = normalizeProductsPayload(safePayload.products);

        // ⚠️ Your backend schema has productCode required.
        // If productCode is missing, backend will fail.
        const missingCode = safePayload.products.some(
          (p) => !p.productCode || !p.productCode.trim()
        );
        if (missingCode) {
          throw new Error(
            "productCode missing for one or more products. Please provide productCode for all products."
          );
        }
      }

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(safePayload),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to create collection");

      set((state) => ({
        collections: [data.collection, ...state.collections],
      }));

      toast.success("Collection created successfully");
      return data.collection;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
     UPDATE COLLECTION
     ✅ ensures products are in new format
  ============================================================ */
  updateCollection: async (id, payload) => {
  try {
    set({ saving: true, error: null });

    const safePayload = { ...payload };

    /**
     * ✅ Products handling (NEW collection model)
     * - If products key is NOT sent => don't touch products in DB
     * - If products is null/undefined => treat as "don't update products"
     * - If products is [] => allow clearing products (IMPORTANT)
     * - If products has items => normalize + validate productCode for each item
     */
    if (Object.prototype.hasOwnProperty.call(safePayload, "products")) {
      // don't update products if null/undefined
      if (safePayload.products == null) {
        delete safePayload.products;
      } else {
        const normalized = normalizeProductsPayload(safePayload.products);

        // ✅ Allow clearing: products: []
        // Only validate productCode when there are items
        if (normalized.length > 0) {
          const missingCodeItem = normalized.find(
            (p) => !p?.productCode || !String(p.productCode).trim()
          );
          if (missingCodeItem) {
            throw new Error(
              `productCode missing for product: ${String(
                missingCodeItem.product || ""
              )}. Please provide productCode for all products.`
            );
          }
        }

        // ✅ keep products even if [] (so DB can be cleared)
        safePayload.products = normalized;
      }
    }

    const res = await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(safePayload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update collection");

    set((state) => ({
      collection: data.collection,
      collections: state.collections.map((c) =>
        String(c._id) === String(id) ? data.collection : c
      ),
    }));

    toast.success("Collection updated successfully");
    return data.collection;
  } catch (e) {
    console.error(e);
    toast.error(e.message);
    throw e;
  } finally {
    set({ saving: false });
  }
},



  /* ============================================================
     DELETE COLLECTION
  ============================================================ */
  deleteCollection: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete collection");

      set((state) => ({
        collections: state.collections.filter((c) => c._id !== id),
      }));

      toast.success("Collection deleted");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    }
  },

  /* ================= GET SINGLE (kept) ================= */
  fetchCollectionById: async (idOrSlug) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/${idOrSlug}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch collection");

      set({ collection: data });
      return data;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     UPDATE COLLECTION PRODUCTS
     ✅ NEW FORMAT REQUIRED:
       products = [{ product, productCode }]
     ✅ Backward-compatible:
       if you pass productIds (string[]) it will try, BUT will fail
       unless productCode is present due to schema required.
  ============================================================ */
  updateCollectionProducts: async (id, products = []) => {
    try {
      set({ saving: true, error: null });

      const normalized = normalizeProductsPayload(products);

      const missingCode = normalized.some(
        (p) => !p.productCode || !p.productCode.trim()
      );
      if (missingCode) {
        throw new Error(
          "productCode missing for one or more products. Please send products as [{ product, productCode }]."
        );
      }

      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ products: normalized }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to update products");

      set((state) => ({
        collection: data.collection,
        collections: state.collections.map((c) =>
          c._id === id ? data.collection : c
        ),
      }));

      toast.success("Collection products updated");
      return data.collection;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      set({ error: e.message });
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
     ✅ SYNC COLLECTION ↔ PRODUCT.COLLECTIONS (bulk)
     (unchanged - because it's product API based, not collection.products shape)
  ============================================================ */
  syncCollectionOnProducts: async ({
    collectionId,
    addIds = [],
    removeIds = [],
  }) => {
    try {
      set({ saving: true, error: null });

      if (!collectionId) {
        throw new Error("collectionId is required");
      }

      const PRODUCT_API = `${BASE_URL}/api/products`;

      const res = await fetch(`${PRODUCT_API}/bulk/collections/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          collectionId,
          addIds,
          removeIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to sync collection on products");
      }

      toast.success("Products synced with collection ✅");
      return data;
    } catch (e) {
      console.error("❌ syncCollectionOnProducts error:", e);
      toast.error(e.message);
      set({ error: e.message });
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
     ✅ UTILITY EXPORTS (optional use in UI)
     - buildProductsFromProductObjects: pass products list (with _id, productCode/sku)
  ============================================================ */
  buildProductsFromProductObjects,
}));
