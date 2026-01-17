"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;

/* ----------------------------------------------------
   ADMIN CUSTOMER STORE
---------------------------------------------------- */
export const useCustomerStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  customers: [],
  total: 0,
  page: 1,
  pages: 1,
addresses: [],
addressesTotal: 0,
loadingAddresses: false,
  customer: null,

  loadingList: false,
  loadingSingle: false,
  saving: false,

  error: "",

  /* ---------------- HELPERS ---------------- */
  setError: (msg = "") => set({ error: msg }),
clearAddresses: () => set({ addresses: [], addressesTotal: 0 }),

  /* ----------------------------------------------------
     FETCH ALL CUSTOMERS (ADMIN LIST)
     GET /api/customers
     Supports:
     - search
     - country
     - ageGroup
     - isActive
     - page / limit
  ---------------------------------------------------- */
  fetchCustomers: async (params = {}) => {
    if (!API) return;

    set({ loadingList: true, error: "" });

    try {
      const url = new URL(`${API}/api/customers`);

      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      });

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Failed to load customers");

      set({
        customers: data.items || [],
        total: data.total || 0,
        page: data.page || 1,
        pages: data.pages || 1,
      });
    } catch (err) {
      console.error("❌ fetchCustomers:", err);
      set({ error: err.message || "Failed to load customers" });
    } finally {
      set({ loadingList: false });
    }
  },

  /* ----------------------------------------------------
     FETCH SINGLE CUSTOMER (DETAIL PAGE)
     GET /api/customers/:id
  ---------------------------------------------------- */
  fetchCustomerById: async (id) => {
    if (!API || !id) return;

    set({ loadingSingle: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Customer not found");

      set({ customer: data });
    } catch (err) {
      console.error("❌ fetchCustomerById:", err);
      set({ error: err.message || "Failed to load customer" });
    } finally {
      set({ loadingSingle: false });
    }
  },

  /* ----------------------------------------------------
     UPDATE CUSTOMER PROFILE / PREFERENCES
     PUT /api/customers/:id
  ---------------------------------------------------- */
  updateCustomer: async (id, payload) => {
    if (!API || !id) return;

    set({ saving: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");

      set({ customer: data.customer });
      return { success: true };
    } catch (err) {
      console.error("❌ updateCustomer:", err);
      set({ error: err.message || "Failed to update customer" });
      return { success: false, error: err.message };
    } finally {
      set({ saving: false });
    }
  },

  /* ----------------------------------------------------
     UPDATE CUSTOMER ANALYTICS (ADMIN / SYSTEM)
     PATCH /api/customers/:id/analytics
  ---------------------------------------------------- */
  updateAnalytics: async (id, analyticsPayload) => {
    if (!API || !id) return;

    set({ saving: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}/analytics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyticsPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Analytics update failed");

      set({ customer: data.customer });
      return { success: true };
    } catch (err) {
      console.error("❌ updateAnalytics:", err);
      set({ error: err.message || "Failed to update analytics" });
      return { success: false, error: err.message };
    } finally {
      set({ saving: false });
    }
  },

  /* ----------------------------------------------------
     DELETE CUSTOMER (ADMIN)
     DELETE /api/customers/:id
  ---------------------------------------------------- */
  deleteCustomer: async (id) => {
    if (!API || !id) return;

    set({ saving: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      // remove from list
      set((state) => ({
        customers: state.customers.filter((c) => c._id !== id),
        customer: null,
      }));

      return { success: true };
    } catch (err) {
      console.error("❌ deleteCustomer:", err);
      set({ error: err.message || "Failed to delete customer" });
      return { success: false, error: err.message };
    } finally {
      set({ saving: false });
    }
  },

  /* ----------------------------------------------------
   FETCH ALL ADDRESSES (ADMIN)
   GET /api/addresses
---------------------------------------------------- */
fetchAllAddresses: async () => {
  if (!API) return;

  set({ loadingAddresses: true, error: "" });

  try {
    const res = await fetch(`${API}/api/addresses`, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to load addresses");
    }

    set({
      addresses: Array.isArray(data?.data) ? data.data : [],
      addressesTotal: data?.count ?? (Array.isArray(data?.data) ? data.data.length : 0),
    });
  } catch (err) {
    console.error("❌ fetchAllAddresses:", err);
    set({ error: err.message || "Failed to load addresses" });
  } finally {
    set({ loadingAddresses: false });
  }
},


  /* ----------------------------------------------------
     RESET SINGLE CUSTOMER (on unmount)
  ---------------------------------------------------- */
  clearCustomer: () => set({ customer: null }),
}));
