// store/customerSupportLookupStore.js
"use client";

import { create } from "zustand";
import { toast } from "react-hot-toast";
import { useCustomerStore } from "@/store/customerStore";
import { useOrderStore } from "@/store/orderStore";
import { useCustomerTicketStore } from "@/store/customerTicketStore";
import { useAdminProductStore } from "@/store/adminProductStore";
import { normalizeOrderNumberInput } from "@/utils/formatters";

/* ---------------- helpers ---------------- */
const getId = (x) => {
  if (!x) return "";
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "object")
    return String(x._id || x.id || x.customerId || x.userId || x.productId || "");
  return "";
};

const cleanStr = (v) => String(v || "").trim();
const lower = (v) => cleanStr(v).toLowerCase();

/** ✅ wait until cond true or timeout */
const waitFor = async (cond, { timeoutMs = 2500, intervalMs = 50 } = {}) => {
  const started = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (cond()) return true;
    if (Date.now() - started > timeoutMs) return false;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, intervalMs));
  }
};

/* ===================================================================
   Store
=================================================================== */
export const useCustomerSupportLookupStore = create((set, get) => ({
  /* ---------- state ---------- */
  query: { phone: "", email: "", name: "", orderNumber: "", ticketStatus: "" },

  matchedCustomers: [],
  selectedCustomerId: null,

  orderProducts: [],
  orderProductsById: {},

  loading: false,
  error: "",

  /* ---------- ui helpers ---------- */
  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
  setLoading: (v) => set({ loading: !!v }),
  setError: (msg = "") => set({ error: msg }),

  clearResults: () =>
    set({
      matchedCustomers: [],
      selectedCustomerId: null,
      orderProducts: [],
      orderProductsById: {},
      error: "",
    }),

  clearAll: () => {
    set({
      query: { phone: "", email: "", name: "", orderNumber: "", ticketStatus: "" },
      matchedCustomers: [],
      selectedCustomerId: null,
      orderProducts: [],
      orderProductsById: {},
      loading: false,
      error: "",
    });

    try {
      useCustomerStore.getState().clearCustomer?.();
    } catch {}
    try {
      useOrderStore.getState().clearOrder?.();
      useOrderStore.getState().clearOrders?.();
    } catch {}
    try {
      useCustomerTicketStore.getState().resetTicket?.();
      useCustomerTicketStore.getState().resetTickets?.();
    } catch {}
    try {
      useAdminProductStore.getState().resetProduct?.();
    } catch {}
  },

  /* ============================================================
     INTERNAL: hydrate + auto load orders/tickets
  ============================================================ */
  _hydrateCustomerProfileOnly: async (customerLikeOrId) => {
    const customerId = getId(customerLikeOrId);
    if (!customerId) throw new Error("Invalid customerId");

    const customerStore = useCustomerStore.getState();
    const orderStore = useOrderStore.getState();
    const ticketStore = useCustomerTicketStore.getState();

    await customerStore.fetchCustomerById(customerId);

    const loaded = useCustomerStore.getState().customer;
    const mongoId = loaded?._id || loaded?.id || "";
    if (!mongoId) throw new Error("Customer loaded but Mongo _id missing (cannot load orders)");

    set({ selectedCustomerId: customerId });

    if (orderStore.fetchOrdersByCustomer) await orderStore.fetchOrdersByCustomer(mongoId);

    const email = cleanStr(loaded?.email);
    const st = cleanStr(get().query.ticketStatus);
    if (email && ticketStore.fetchTicketsByEmail) {
      await ticketStore.fetchTicketsByEmail({
        email,
        status: st || undefined,
        page: 1,
        limit: 10,
      });
    }

    return customerId;
  },

  /* ============================================================
     Products for selected order (optional feature)
  ============================================================ */
  loadProductsForOrder: async (orderLike) => {
    try {
      const orderId = getId(orderLike?._id || orderLike?.id || orderLike);
      const orderStore = useOrderStore.getState();

      let order = orderLike;
      if (!order?.items && !order?.orderItems) {
        if (!orderId || !orderStore.fetchOrderById) {
          toast.error("Order not loaded");
          return [];
        }
        order = await orderStore.fetchOrderById(orderId);
      }

      const items = order?.items || order?.orderItems || [];
      const productIds = [
        ...new Set(items.map((it) => getId(it?.product || it?.productId || it?.variant?.product)).filter(Boolean)),
      ];

      if (!productIds.length) {
        set({ orderProducts: [], orderProductsById: {} });
        toast("No products found on this order");
        return [];
      }

      const productStore = useAdminProductStore.getState();
      if (!productStore.fetchProductsByIds) {
        toast.error("adminProductStore.fetchProductsByIds missing");
        return [];
      }

      const products = (await productStore.fetchProductsByIds(productIds)) || [];
      const byId = {};
      products.forEach((p) => {
        const id = getId(p);
        if (id) byId[id] = p;
      });

      set({ orderProducts: products, orderProductsById: byId });
      toast.success("Loaded product details ✅");
      return products;
    } catch (e) {
      console.error("❌ loadProductsForOrder:", e);
      toast.error(e?.message || "Failed to load products");
      return [];
    }
  },

  /* ============================================================
     ✅ NEW: Refresh tickets for currently loaded customer
     (use after changing ticketStatus filter)
  ============================================================ */
  refreshTickets: async () => {
    try {
      const ticketStore = useCustomerTicketStore.getState();
      const customer = useCustomerStore.getState().customer;
      const email = cleanStr(customer?.email);
      if (!email || !ticketStore.fetchTicketsByEmail) return;

      const st = cleanStr(get().query.ticketStatus);
      await ticketStore.fetchTicketsByEmail({
        email,
        status: st || undefined,
        page: 1,
        limit: 10,
      });
    } catch (e) {
      console.error("❌ refreshTickets:", e);
      toast.error(e?.message || "Failed to refresh tickets");
    }
  },

  /* ============================================================
     ✅ NEW: Delete ticket (calls customerTicketStore)
  ============================================================ */
  deleteTicket: async (ticketId) => {
    const id = cleanStr(ticketId);
    if (!id) return toast.error("ticketId missing");

    try {
      const ticketStore = useCustomerTicketStore.getState();
      if (!ticketStore.deleteTicketById) {
        toast.error("deleteTicketById missing in customerTicketStore");
        return;
      }

      const r = await ticketStore.deleteTicketById(id);
      if (!r?.ok) throw new Error(r?.message || "Delete failed");

      toast.success("Ticket deleted ✅");
      // keep UI consistent (reload list with current status filter)
      await get().refreshTickets();
    } catch (e) {
      console.error("❌ deleteTicket:", e);
      toast.error(e?.message || "Failed to delete ticket");
    }
  },

  /* ============================================================
     RUN SUPPORT SEARCH
  ============================================================ */
  runSearch: async () => {
    const q = get().query;

    const _phone = cleanStr(q.phone);
    const _email = lower(q.email);
    const _name = cleanStr(q.name);
    const ordRaw = cleanStr(q.orderNumber);

    set({
      matchedCustomers: [],
      selectedCustomerId: null,
      orderProducts: [],
      orderProductsById: {},
      error: "",
    });

    try {
      useOrderStore.getState().clearOrder?.();
      useOrderStore.getState().clearOrders?.();
    } catch {}
    try {
      useCustomerTicketStore.getState().resetTicket?.();
      useCustomerTicketStore.getState().resetTickets?.();
    } catch {}

    if (!ordRaw && !_phone && !_email && !_name) {
      toast.error("Enter phone / email / name / order no.");
      return;
    }

    set({ loading: true, error: "" });

    try {
      const customerStore = useCustomerStore.getState();
      const orderStore = useOrderStore.getState();

      // 1) ORDER NUMBER PATH
      if (ordRaw) {
        const ordNo = normalizeOrderNumberInput(ordRaw);
        set((s) => ({ query: { ...s.query, email: _email, orderNumber: ordNo } }));

        const ord = await orderStore.fetchOrderByNumber(ordNo);
        if (!ord) throw new Error("Order not found");

        if (ord?._id && orderStore.fetchOrderById) await orderStore.fetchOrderById(ord._id);

        const customerId =
          getId(ord?.customer) || getId(ord?.user) || getId(ord?.customerId) || getId(ord?.userId);

        if (!customerId) throw new Error("Order found but customerId not present on order");

        await get()._hydrateCustomerProfileOnly(customerId);

        toast.success("Fetched order + customer ✅ (orders & tickets auto loaded)");
        return;
      }

      // 2) CUSTOMER SEARCH PATH
      const searchValue = _email || _phone || _name;
      set((s) => ({ query: { ...s.query, email: _email } }));

      await customerStore.fetchCustomers({ search: searchValue, limit: 20, page: 1 });

      // ✅ FIX: don't rely on beforeLen mismatch (can be 1->1)
      await waitFor(() => (useCustomerStore.getState().customers || []).length > 0);

      const list = useCustomerStore.getState().customers || [];
      if (!list.length) throw new Error("No customer found for given input");

      if (list.length === 1) {
        await get()._hydrateCustomerProfileOnly(list[0]);
        toast.success("Fetched customer ✅ (orders & tickets auto loaded)");
        return;
      }

      set({ matchedCustomers: list });
      toast("Multiple matches found. Select a customer.");
    } catch (e) {
      console.error("❌ customerSupportLookup runSearch:", e);
      const msg = e?.message || "Search failed";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     SELECT CUSTOMER (multi-match)
  ============================================================ */
  selectCustomer: async (customer) => {
    set({ loading: true, error: "" });
    try {
      set({ matchedCustomers: [] });

      try {
        useOrderStore.getState().clearOrders?.();
        useOrderStore.getState().clearOrder?.();
      } catch {}
      try {
        useCustomerTicketStore.getState().resetTickets?.();
        useCustomerTicketStore.getState().resetTicket?.();
      } catch {}

      await get()._hydrateCustomerProfileOnly(customer);
      toast.success("Customer loaded ✅ (orders & tickets auto loaded)");
    } catch (e) {
      console.error("❌ selectCustomer:", e);
      const msg = e?.message || "Failed to load customer";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     SELECT ORDER
  ============================================================ */
  selectOrder: async (order) => {
    if (!order) return;
    try {
      const orderStore = useOrderStore.getState();
      if (order?._id && orderStore.fetchOrderById) {
        await orderStore.fetchOrderById(order._id);
      } else {
        toast("Order selected");
      }
      // optional:
      // await get().loadProductsForOrder(order);
    } catch (e) {
      console.error("❌ selectOrder:", e);
      toast.error(e?.message || "Failed to load order");
    }
  },

  /* ============================================================
     SELECT TICKET
  ============================================================ */
  selectTicket: async (ticketId) => {
    const id = cleanStr(ticketId);
    if (!id) return;
    try {
      await useCustomerTicketStore.getState().fetchTicketById(id);
    } catch (e) {
      toast.error(e?.message || "Failed to load ticket");
    }
  },
}));
