"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL || "";

/* -------------------------------------------------------
   Address Store (Zustand)
------------------------------------------------------- */
export const useAddressStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  addresses: [],
  activeAddress: null,
allAddresses: [],
loadingAll: false,
errorAll: "",
  loading: false,
  error: "",

  /* ---------------- HELPERS ---------------- */
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
clearAllAddresses: () => set({ allAddresses: [], loadingAll: false, errorAll: "" }),

  clearError: () => set({ error: "" }),
  clearAddresses: () =>
    set({
      addresses: [],
      activeAddress: null,
      loading: false,
      error: "",
    }),

  /* -------------------------------------------------------
     FETCH ADDRESSES (by Firebase UID) – Preferred
     GET /api/addresses/firebase/:firebaseUID
  ------------------------------------------------------- */
  fetchAddressesByFirebaseUID: async (firebaseUID) => {
    if (!firebaseUID) return;

    set({ loading: true, error: "" });

    try {
      const res = await fetch(
        `${API}/api/addresses/firebase/${firebaseUID}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to fetch addresses");
      }

      set({
        addresses: Array.isArray(data?.data) ? data.data : [],
      });
    } catch (err) {
      console.error("❌ fetchAddressesByFirebaseUID:", err);
      set({ error: err.message || "Failed to load addresses" });
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------
     FETCH ADDRESSES (by Customer ID)
     GET /api/addresses/customer/:customerId
  ------------------------------------------------------- */
  fetchAddressesByCustomerId: async (customerId) => {
    if (!customerId) return;

    set({ loading: true, error: "" });

    try {
      const res = await fetch(
        `${API}/api/addresses/customer/${customerId}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to fetch addresses");
      }

      set({
        addresses: Array.isArray(data?.data) ? data.data : [],
      });
    } catch (err) {
      console.error("❌ fetchAddressesByCustomerId:", err);
      set({ error: err.message || "Failed to load addresses" });
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------
     FETCH SINGLE ADDRESS
     GET /api/addresses/single/:id
  ------------------------------------------------------- */
  fetchAddressById: async (addressId) => {
    if (!addressId) return;

    set({ loading: true, error: "" });

    try {
      const res = await fetch(
        `${API}/api/addresses/single/${addressId}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to fetch address");
      }

      set({ activeAddress: data.data || null });
    } catch (err) {
      console.error("❌ fetchAddressById:", err);
      set({ error: err.message || "Failed to load address" });
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------
     CREATE ADDRESS
     POST /api/addresses
  ------------------------------------------------------- */
  createAddress: async (payload) => {
    set({ loading: true, error: "" });

    try {
      const res = await fetch(`${API}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to create address");
      }

      // Re-fetch list to maintain correct default flags ordering
      if (payload.firebaseUID) {
        await get().fetchAddressesByFirebaseUID(payload.firebaseUID);
      }

      return data.data;
    } catch (err) {
      console.error("❌ createAddress:", err);
      set({ error: err.message || "Failed to create address" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------
     UPDATE ADDRESS
     PUT /api/addresses/:id
  ------------------------------------------------------- */
  updateAddress: async (addressId, payload) => {
    if (!addressId) return;

    set({ loading: true, error: "" });

    try {
      const res = await fetch(`${API}/api/addresses/${addressId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update address");
      }

      if (payload.firebaseUID) {
        await get().fetchAddressesByFirebaseUID(payload.firebaseUID);
      }

      return data.data;
    } catch (err) {
      console.error("❌ updateAddress:", err);
      set({ error: err.message || "Failed to update address" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------------------------------
     DELETE ADDRESS
     DELETE /api/addresses/:id
  ------------------------------------------------------- */
  deleteAddress: async (addressId, { customerId, firebaseUID } = {}) => {
  if (!addressId) return;

  set({ loading: true, error: "" });

  try {
    const res = await fetch(`${API}/api/addresses/${addressId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to delete address");
    }

    // ✅ refresh from both sources
    await get().fetchAddressesBoth({ customerId, firebaseUID });
  } catch (err) {
    console.error("❌ deleteAddress:", err);
    set({ error: err.message || "Failed to delete address" });
    throw err;
  } finally {
    set({ loading: false });
  }
},

/* -------------------------------------------------------
   FETCH ALL ADDRESSES (ADMIN / INTERNAL)
   GET /api/addresses
------------------------------------------------------- */
fetchAllAddresses: async () => {
  if (!API) return;

  set({ loadingAll: true, errorAll: "" });

  try {
    const res = await fetch(`${API}/api/addresses`, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to load all addresses");
    }

    set({
      allAddresses: Array.isArray(data?.data) ? data.data : [],
    });
  } catch (err) {
    console.error("❌ fetchAllAddresses:", err);
    set({ errorAll: err.message || "Failed to load all addresses" });
  } finally {
    set({ loadingAll: false });
  }
},




  /* -------------------------------------------------------
   FETCH ADDRESSES (BOTH: customerId + firebaseUID)
   - Fetch from both endpoints (if provided)
   - Merge + de-duplicate by _id
------------------------------------------------------- */
fetchAddressesBoth: async ({ customerId, firebaseUID }) => {
  const cid = String(customerId ?? "").trim();
  const uid = String(firebaseUID ?? "").trim();

  if (!cid && !uid) return;

  set({ loading: true, error: "" });

  try {
    const requests = [];

    if (cid) {
      requests.push(
        fetch(`${API}/api/addresses/customer/${cid}`, { cache: "no-store" })
          .then(async (r) => {
            const j = await r.json();
            if (!r.ok || j?.success === false) throw new Error(j?.message || "CustomerId fetch failed");
            return Array.isArray(j?.data) ? j.data : [];
          })
      );
    }

    if (uid) {
      requests.push(
        fetch(`${API}/api/addresses/firebase/${uid}`, { cache: "no-store" })
          .then(async (r) => {
            const j = await r.json();
            if (!r.ok || j?.success === false) throw new Error(j?.message || "FirebaseUID fetch failed");
            return Array.isArray(j?.data) ? j.data : [];
          })
      );
    }

    const results = await Promise.all(requests);
    const merged = results.flat();

    // ✅ de-duplicate by _id
    const map = new Map();
    for (const a of merged) {
      if (a?._id) map.set(a._id, a);
    }

    // ✅ optional: sort defaults first
    const finalList = Array.from(map.values()).sort((a, b) => {
      const aScore = (a.isDefaultShipping ? 2 : 0) + (a.isDefaultBilling ? 1 : 0);
      const bScore = (b.isDefaultShipping ? 2 : 0) + (b.isDefaultBilling ? 1 : 0);
      return bScore - aScore;
    });

    set({ addresses: finalList });
  } catch (err) {
    console.error("❌ fetchAddressesBoth:", err);
    set({ error: err.message || "Failed to load addresses" });
  } finally {
    set({ loading: false });
  }
},

}));
