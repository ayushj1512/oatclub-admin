import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/collections`;

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
  ============================================================ */
  createCollection: async (payload) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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
  ============================================================ */
  updateCollection: async (id, payload) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to update collection");

      set((state) => ({
        collection: data.collection,
        collections: state.collections.map((c) =>
          c._id === id ? data.collection : c
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

  /* ================= GET SINGLE (🔥 THIS FIXES YOUR ERROR) ================= */
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
     (Assign / remove products)
  ============================================================ */
  updateCollectionProducts: async (id, productIds = []) => {
    try {
      set({ saving: true });

      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ products: productIds }),
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
      throw e;
    } finally {
      set({ saving: false });
    }
  },

    /* ============================================================
     ✅ SYNC COLLECTION ↔ PRODUCT.COLLECTIONS (bulk)
     - multi-collection safe (uses backend $addToSet / $pull)
     - addIds: products that should include this collection
     - removeIds: products that should remove this collection
  ============================================================ */
  syncCollectionOnProducts: async ({ collectionId, addIds = [], removeIds = [] }) => {
    try {
      set({ saving: true, error: null });

      if (!collectionId) {
        throw new Error("collectionId is required");
      }

      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
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

      // Optional: refresh collections so UI shows correct product counts if your API returns updated counts
      // await get().fetchCollections();

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

}));
