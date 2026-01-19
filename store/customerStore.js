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

  // ✅ cartAdds (NEW)
  cartAdds: [],
  cartAddsTotal: 0,
  loadingCartAdds: false,

  loadingList: false,
  loadingSingle: false,
  saving: false,

  error: "",

  /* ---------------- HELPERS ---------------- */
  setError: (msg = "") => set({ error: msg }),
  clearAddresses: () => set({ addresses: [], addressesTotal: 0 }),
  clearCustomer: () => set({ customer: null, cartAdds: [], cartAddsTotal: 0 }),

  /* ----------------------------------------------------
     FETCH ALL CUSTOMERS (ADMIN LIST)
     GET /api/customers
  ---------------------------------------------------- */
  fetchCustomers: async (params = {}) => {
    if (!API) return;

    set({ loadingList: true, error: "" });

    try {
      const url = new URL(`${API}/api/customers`);

      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      });

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Failed to load customers");

      set({ customers: data.items || [], total: data.total || 0, page: data.page || 1, pages: data.pages || 1 });
    } catch (err) {
      set({ error: err?.message || "Failed to load customers" });
    } finally {
      set({ loadingList: false });
    }
  },

  /* ----------------------------------------------------
     FETCH SINGLE CUSTOMER (DETAIL PAGE)
     GET /api/customers/:id
     ✅ Also sets cartAdds from customer payload (if present)
  ---------------------------------------------------- */
  fetchCustomerById: async (id) => {
    if (!API || !id) return;

    set({ loadingSingle: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Customer not found");

      const customer = data || null;
      const cartAdds = Array.isArray(customer?.cartAdds) ? customer.cartAdds : [];

      set({ customer, cartAdds, cartAddsTotal: cartAdds.length });
    } catch (err) {
      set({ error: err?.message || "Failed to load customer" });
    } finally {
      set({ loadingSingle: false });
    }
  },

  /* ----------------------------------------------------
     ✅ FETCH CUSTOMER CART ADDS (OPTIONAL, explicit)
     GET /api/customers/:id
     (uses the same endpoint; keeps UI decoupled)
  ---------------------------------------------------- */
  fetchCustomerCartAdds: async (id) => {
    if (!API || !id) return;

    set({ loadingCartAdds: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Customer not found");

      const cartAdds = Array.isArray(data?.cartAdds) ? data.cartAdds : [];
      set({ cartAdds, cartAddsTotal: cartAdds.length });
      return cartAdds;
    } catch (err) {
      set({ error: err?.message || "Failed to load customer cartAdds" });
      return [];
    } finally {
      set({ loadingCartAdds: false });
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
      const res = await fetch(`${API}/api/customers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Update failed");

      const updated = data?.customer || null;
      const cartAdds = Array.isArray(updated?.cartAdds) ? updated.cartAdds : get().cartAdds || [];

      set({ customer: updated, cartAdds, cartAddsTotal: cartAdds.length });
      return { success: true };
    } catch (err) {
      set({ error: err?.message || "Failed to update customer" });
      return { success: false, error: err?.message };
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
      const res = await fetch(`${API}/api/customers/${id}/analytics`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(analyticsPayload) });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Analytics update failed");

      const updated = data?.customer || null;
      const cartAdds = Array.isArray(updated?.cartAdds) ? updated.cartAdds : get().cartAdds || [];

      set({ customer: updated, cartAdds, cartAddsTotal: cartAdds.length });
      return { success: true };
    } catch (err) {
      set({ error: err?.message || "Failed to update analytics" });
      return { success: false, error: err?.message };
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
      const res = await fetch(`${API}/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Delete failed");

      set((state) => ({ customers: state.customers.filter((c) => c._id !== id), customer: null, cartAdds: [], cartAddsTotal: 0 }));
      return { success: true };
    } catch (err) {
      set({ error: err?.message || "Failed to delete customer" });
      return { success: false, error: err?.message };
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

      if (!res.ok || data?.success === false) throw new Error(data?.message || "Failed to load addresses");

      const list = Array.isArray(data?.data) ? data.data : [];
      set({ addresses: list, addressesTotal: data?.count ?? list.length });
    } catch (err) {
      set({ error: err?.message || "Failed to load addresses" });
    } finally {
      set({ loadingAddresses: false });
    }
  },

  /* ----------------------------------------------------
     FETCH ALL CUSTOMERS (DASHBOARD) - fetch all pages
     GET /api/customers
  ---------------------------------------------------- */
  fetchAllCustomersForDashboard: async (params = {}) => {
    if (!API) return;

    set({ loadingList: true, error: "" });

    try {
      const url = new URL(`${API}/api/customers`);
      const firstParams = { page: 1, limit: 200, ...params };

      Object.entries(firstParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      });

      const res1 = await fetch(url.toString(), { cache: "no-store" });
      const data1 = await res1.json();
      if (!res1.ok) throw new Error(data1?.message || "Failed to load customers");

      const items1 = data1?.items || [];
      const totalPages = data1?.pages || 1;

      let all = [...items1];

      if (totalPages > 1) {
        const pageFetches = [];
        for (let p = 2; p <= totalPages; p++) {
          const u = new URL(`${API}/api/customers`);
          Object.entries({ ...firstParams, page: p }).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
          });
          pageFetches.push(fetch(u.toString(), { cache: "no-store" }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))));
        }

        const rest = await Promise.all(pageFetches);
        rest.forEach(({ ok, j }) => {
          if (ok) all.push(...(j?.items || []));
        });
      }

      set({ customers: all, total: data1?.total || all.length, page: 1, pages: totalPages });
    } catch (err) {
      set({ error: err?.message || "Failed to load customers" });
    } finally {
      set({ loadingList: false });
    }
  },
}));
