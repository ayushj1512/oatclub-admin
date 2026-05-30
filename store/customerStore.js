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
  limit: 20,

  customerAnalyticsSummary: null,
  loadingSummary: false,
  syncingAnalytics: false,
  syncingAllAnalytics: false,

  addresses: [],
  addressesTotal: 0,
  loadingAddresses: false,

  customer: null,

  cartAdds: [],
  cartAddsTotal: 0,
  loadingCartAdds: false,

  creditLogs: [],
  creditLogsTotal: 0,
  creditLogsPage: 1,
  creditLogsPages: 1,
  creditLogsLimit: 20,
  allCreditLogs: [],
  allCreditLogsTotal: 0,
  allCreditLogsPage: 1,
  allCreditLogsPages: 1,
  allCreditLogsLimit: 20,
  loadingAllCreditLogs: false,

  loadingCreditLogs: false,
  creditSaving: false,
  creditError: "",

  loadingList: false,
  loadingSingle: false,
  saving: false,

  payoutSaving: false,
  payoutError: "",

  error: "",

  /* ---------------- HELPERS ---------------- */
  setError: (msg = "") => set({ error: msg }),
  clearError: () => set({ error: "", payoutError: "", creditError: "" }),
  clearAddresses: () => set({ addresses: [], addressesTotal: 0 }),

  clearCustomer: () =>
    set({
      customer: null,
      cartAdds: [],
      cartAddsTotal: 0,
      creditLogs: [],
      creditLogsTotal: 0,
      creditLogsPage: 1,
      creditLogsPages: 1,
      payoutError: "",
      creditError: "",
      creditLogsLimit: 20,
    }),

  buildUrl: (path, params = {}) => {
    const url = new URL(`${API}${path}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  },

  updateCustomerInList: (updatedCustomer) => {
    if (!updatedCustomer?._id) return;

    set((state) => ({
      customers: state.customers.map((item) =>
        item?._id === updatedCustomer._id ? updatedCustomer : item
      ),
    }));
  },

  /* ----------------------------------------------------
     FETCH ALL CUSTOMERS
     GET /api/customers
  ---------------------------------------------------- */
  fetchCustomers: async (params = {}) => {
    if (!API) return;

    set({ loadingList: true, error: "" });

    try {
      const url = get().buildUrl("/api/customers", params);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load customers");
      }

      set({
        customers: data?.items || [],
        total: data?.total || 0,
        page: data?.page || 1,
        pages: data?.pages || 1,
        limit: data?.limit || params?.limit || 20,
      });

      return data;
    } catch (err) {
      const msg = err?.message || "Failed to load customers";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ loadingList: false });
    }
  },

  /* ----------------------------------------------------
     FETCH CUSTOMER ANALYTICS SUMMARY
     GET /api/customers/analytics/summary
  ---------------------------------------------------- */
  fetchCustomerAnalyticsSummary: async () => {
    if (!API) return;

    set({ loadingSummary: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/analytics/summary`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load customer summary");
      }

      set({ customerAnalyticsSummary: data });
      return data;
    } catch (err) {
      const msg = err?.message || "Failed to load customer summary";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ loadingSummary: false });
    }
  },

  /* ----------------------------------------------------
     SYNC SINGLE CUSTOMER ANALYTICS
     PATCH /api/customers/:id/analytics/sync
  ---------------------------------------------------- */
  syncCustomerAnalytics: async (id) => {
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ syncingAnalytics: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}/analytics/sync`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Customer analytics sync failed");
      }

      const updated = data?.customer || null;
      const cartAdds = Array.isArray(updated?.cartAdds)
        ? updated.cartAdds
        : get().cartAdds || [];

      if (updated?._id) {
        set({
          customer: updated,
          cartAdds,
          cartAddsTotal: cartAdds.length,
        });

        get().updateCustomerInList(updated);
      }

      return { success: true, customer: updated };
    } catch (err) {
      const msg = err?.message || "Customer analytics sync failed";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ syncingAnalytics: false });
    }
  },

  /* ----------------------------------------------------
     SYNC ALL CUSTOMER ANALYTICS
     PATCH /api/customers/analytics/sync-all
  ---------------------------------------------------- */
  syncAllCustomerAnalytics: async () => {
    if (!API) return { success: false, error: "Missing API URL" };

    set({ syncingAllAnalytics: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/analytics/sync-all`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Bulk analytics sync failed");
      }

      await get().fetchCustomerAnalyticsSummary();

      return { success: true, data };
    } catch (err) {
      const msg = err?.message || "Bulk analytics sync failed";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ syncingAllAnalytics: false });
    }
  },

  /* ----------------------------------------------------
     FETCH SINGLE CUSTOMER
     GET /api/customers/:id
  ---------------------------------------------------- */
  fetchCustomerById: async (id) => {
    if (!API || !id) return;

    set({ loadingSingle: true, error: "", payoutError: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Customer not found");
      }

      const customer = data || null;
      const cartAdds = Array.isArray(customer?.cartAdds) ? customer.cartAdds : [];

      set({ customer, cartAdds, cartAddsTotal: cartAdds.length });
      return customer;
    } catch (err) {
      const msg = err?.message || "Failed to load customer";
      set({ error: msg });
      return null;
    } finally {
      set({ loadingSingle: false });
    }
  },

  /* ----------------------------------------------------
     FETCH CUSTOMER CART ADDS
     GET /api/customers/:id
  ---------------------------------------------------- */
  fetchCustomerCartAdds: async (id) => {
    if (!API || !id) return [];

    set({ loadingCartAdds: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Customer not found");
      }

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
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ saving: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Update failed");
      }

      const updated = data?.customer || null;
      const cartAdds = Array.isArray(updated?.cartAdds)
        ? updated.cartAdds
        : get().cartAdds || [];

      set({ customer: updated, cartAdds, cartAddsTotal: cartAdds.length });
      get().updateCustomerInList(updated);

      return { success: true, customer: updated };
    } catch (err) {
      const msg = err?.message || "Failed to update customer";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ saving: false });
    }
  },

  /* ----------------------------------------------------
     UPDATE CUSTOMER PAYOUT DETAILS
     PATCH /api/customers/:id/payout-details
  ---------------------------------------------------- */
  updateCustomerPayoutDetails: async (id, payload) => {
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ payoutSaving: true, payoutError: "", error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}/payout-details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Payout update failed");
      }

      const updatedCustomer = data?.customer || null;

      if (updatedCustomer?._id) {
        const cartAdds = Array.isArray(updatedCustomer?.cartAdds)
          ? updatedCustomer.cartAdds
          : get().cartAdds || [];

        set({
          customer: updatedCustomer,
          cartAdds,
          cartAddsTotal: cartAdds.length,
        });

        get().updateCustomerInList(updatedCustomer);
      } else {
        const current = get().customer;

        if (current?._id) {
          const merged = {
            ...current,
            payoutDetails: data?.payoutDetails || current.payoutDetails,
          };

          set({ customer: merged });
          get().updateCustomerInList(merged);
        }
      }

      return { success: true };
    } catch (err) {
      const msg = err?.message || "Failed to update payout details";
      set({ payoutError: msg });
      return { success: false, error: msg };
    } finally {
      set({ payoutSaving: false });
    }
  },

  /* ----------------------------------------------------
   CUSTOMER CREDITS / WALLET
---------------------------------------------------- */

  fetchCustomerCreditLogs: async (id, params = {}) => {
    if (!API || !id) return [];

    set({ loadingCreditLogs: true, creditError: "" });

    try {
      const url = get().buildUrl(`/api/customers/${id}/credits/logs`, params);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load credit logs");
      }

      set({
        creditLogs: data?.items || [],
        creditLogsTotal: data?.total || 0,
        creditLogsPage: data?.page || 1,
        creditLogsPages: data?.pages || 1,
        creditLogsLimit: data?.limit || params?.limit || 20,
      });

      return data;
    } catch (err) {
      const msg = err?.message || "Failed to load credit logs";
      set({ creditError: msg });
      return { success: false, error: msg };
    } finally {
      set({ loadingCreditLogs: false });
    }
  },

  fetchAllCustomerCreditLogs: async (params = {}) => {
    if (!API) return [];

    set({ loadingAllCreditLogs: true, creditError: "" });

    try {
      const url = get().buildUrl("/api/customers/credits/logs", params);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load all credit logs");
      }

      set({
        allCreditLogs: data?.items || [],
        allCreditLogsTotal: data?.total || 0,
        allCreditLogsPage: data?.page || 1,
        allCreditLogsPages: data?.pages || 1,
        allCreditLogsLimit: data?.limit || params?.limit || 20,
      });

      return data;
    } catch (err) {
      const msg = err?.message || "Failed to load all credit logs";
      set({ creditError: msg });
      return { success: false, error: msg };
    } finally {
      set({ loadingAllCreditLogs: false });
    }
  },

  addCustomerCredit: async (id, payload) => {
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ creditSaving: true, creditError: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}/credits/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Credit add failed");
      }

      const updated = data?.customer || null;

      if (updated?._id) {
        const cartAdds = Array.isArray(updated?.cartAdds)
          ? updated.cartAdds
          : get().cartAdds || [];

        set({
          customer: updated,
          cartAdds,
          cartAddsTotal: cartAdds.length,
          creditLogs: updated?.credits?.logs || [],
          creditLogsTotal: updated?.credits?.logs?.length || 0,
          creditLogsPage: 1,
          creditLogsPages: 1,
        });

        get().updateCustomerInList(updated);
      }

      return { success: true, customer: updated, credits: data?.credits };
    } catch (err) {
      const msg = err?.message || "Failed to add customer credit";
      set({ creditError: msg });
      return { success: false, error: msg };
    } finally {
      set({ creditSaving: false });
    }
  },

  debitCustomerCredit: async (id, payload) => {
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ creditSaving: true, creditError: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}/credits/debit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Credit debit failed");
      }

      const updated = data?.customer || null;

      if (updated?._id) {
        const cartAdds = Array.isArray(updated?.cartAdds)
          ? updated.cartAdds
          : get().cartAdds || [];

        set({
          customer: updated,
          cartAdds,
          cartAddsTotal: cartAdds.length,
          creditLogs: updated?.credits?.logs || [],
          creditLogsTotal: updated?.credits?.logs?.length || 0,
        });

        get().updateCustomerInList(updated);
      }

      return { success: true, customer: updated, credits: data?.credits };
    } catch (err) {
      const msg = err?.message || "Failed to debit customer credit";
      set({ creditError: msg });
      return { success: false, error: msg };
    } finally {
      set({ creditSaving: false });
    }
  },

  /* ----------------------------------------------------
     UPDATE MANUAL CUSTOMER ANALYTICS
     PATCH /api/customers/:id/analytics
  ---------------------------------------------------- */
  updateAnalytics: async (id, analyticsPayload) => {
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ saving: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}/analytics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyticsPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Analytics update failed");
      }

      const updated = data?.customer || null;
      const cartAdds = Array.isArray(updated?.cartAdds)
        ? updated.cartAdds
        : get().cartAdds || [];

      set({ customer: updated, cartAdds, cartAddsTotal: cartAdds.length });
      get().updateCustomerInList(updated);

      return { success: true, customer: updated };
    } catch (err) {
      const msg = err?.message || "Failed to update analytics";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ saving: false });
    }
  },

  /* ----------------------------------------------------
     DELETE CUSTOMER
     DELETE /api/customers/:id
  ---------------------------------------------------- */
  deleteCustomer: async (id) => {
    if (!API || !id) return { success: false, error: "Missing customer id" };

    set({ saving: true, error: "" });

    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Delete failed");
      }

      set((state) => ({
        customers: state.customers.filter((c) => c._id !== id),
        total: Math.max(0, Number(state.total || 0) - 1),
        customer: null,
        cartAdds: [],
        cartAddsTotal: 0,
      }));

      return { success: true };
    } catch (err) {
      const msg = err?.message || "Failed to delete customer";
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ saving: false });
    }
  },

  /* ----------------------------------------------------
     FETCH ALL ADDRESSES
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

      const list = Array.isArray(data?.data) ? data.data : [];

      set({
        addresses: list,
        addressesTotal: data?.count ?? list.length,
      });

      return list;
    } catch (err) {
      const msg = err?.message || "Failed to load addresses";
      set({ error: msg });
      return [];
    } finally {
      set({ loadingAddresses: false });
    }
  },

  /* ----------------------------------------------------
     FETCH ALL CUSTOMERS FOR DASHBOARD
     GET /api/customers
  ---------------------------------------------------- */
  fetchAllCustomersForDashboard: async (params = {}) => {
    if (!API) return;

    set({ loadingList: true, error: "" });

    try {
      const firstParams = { page: 1, limit: 200, ...params };
      const url = get().buildUrl("/api/customers", firstParams);

      const res1 = await fetch(url, { cache: "no-store" });
      const data1 = await res1.json();

      if (!res1.ok) {
        throw new Error(data1?.message || "Failed to load customers");
      }

      const items1 = data1?.items || [];
      const totalPages = data1?.pages || 1;

      let all = [...items1];

      if (totalPages > 1) {
        const pageFetches = [];

        for (let p = 2; p <= totalPages; p++) {
          const pageUrl = get().buildUrl("/api/customers", {
            ...firstParams,
            page: p,
          });

          pageFetches.push(
            fetch(pageUrl, { cache: "no-store" }).then((r) =>
              r.json().then((j) => ({ ok: r.ok, data: j }))
            )
          );
        }

        const rest = await Promise.all(pageFetches);

        rest.forEach(({ ok, data }) => {
          if (ok) all.push(...(data?.items || []));
        });
      }

      set({
        customers: all,
        total: data1?.total || all.length,
        page: 1,
        pages: totalPages,
        limit: firstParams.limit,
      });

      return all;
    } catch (err) {
      const msg = err?.message || "Failed to load customers";
      set({ error: msg });
      return [];
    } finally {
      set({ loadingList: false });
    }
  },
}));