"use client";

import { create } from "zustand";
import { toast } from "react-hot-toast";
import { useCustomerStore } from "@/store/customerStore";
import { useOrderStore } from "@/store/orderStore";
import { useCustomerTicketStore } from "@/store/customerTicketStore";
import { useAdminProductStore } from "@/store/adminProductStore"; // ✅ ADD THIS

/** ✅ Safe id extractor (prevents [object Object]) */
const getId = (x) => {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "object")
    return String(x._id || x.id || x.customerId || x.userId || x.productId || "");
  return "";
};

/** ✅ MIRAY-000031 normalizer */
const normalizeOrderNumber = (raw, prefix = "MIRAY", pad = 6) => {
  if (raw === null || raw === undefined) return "";
  if (Array.isArray(raw)) raw = raw?.[0]?.orderNumber ?? raw?.[0]?.number ?? "";
  if (typeof raw === "object") raw = raw?.orderNumber ?? raw?.number ?? "";

  const s = String(raw).trim();
  if (!s) return "";

  const digits = (s.match(/\d+/g) || []).join("");
  if (!digits) return s.toUpperCase();

  const num = String(parseInt(digits, 10));
  const padded = num.padStart(pad, "0");
  return `${String(prefix).toUpperCase()}-${padded}`;
};

const cleanStr = (v) => String(v || "").trim();
const lower = (v) => cleanStr(v).toLowerCase();

/**
 * ✅ FIX for "first time empty, second time filled" (zustand async timing)
 * Wait until condition met or timeout.
 */
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

export const useCustomerSupportLookupStore = create((set, get) => ({
  /* ============================================================
    STATE
  ============================================================ */
  query: {
    phone: "",
    email: "",
    name: "",
    orderNumber: "",
    ticketStatus: "",
  },

  matchedCustomers: [],
  selectedCustomerId: null,

  // ✅ NEW: product details for currently selected order
  orderProducts: [],
  orderProductsById: {}, // { [productId]: product }

  loading: false,
  error: "",

  /* ============================================================
    HELPERS
  ============================================================ */
  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
  setLoading: (v) => set({ loading: v }),
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
    INTERNAL: Hydrate CUSTOMER PROFILE + ✅ AUTO LOAD ORDERS/TICKETS
  ============================================================ */
  _hydrateCustomerProfileOnly: async (customerLikeOrId) => {
  const customerId = getId(customerLikeOrId);
  if (!customerId) throw new Error("Invalid customerId");

  const customerStore = useCustomerStore.getState();
  const orderStore = useOrderStore.getState();
  const ticketStore = useCustomerTicketStore.getState();

  // ✅ fetch customer detail
  await customerStore.fetchCustomerById(customerId);

  const loadedCustomer = useCustomerStore.getState().customer;
  const mongoId = loadedCustomer?._id || loadedCustomer?.id || "";

  if (!mongoId) {
    throw new Error("Customer loaded but Mongo _id missing (cannot load orders)");
  }

  set({ selectedCustomerId: customerId });

  // ✅ AUTO: fetch orders strictly by mongoId
  if (orderStore.fetchOrdersByCustomer) {
    await orderStore.fetchOrdersByCustomer(mongoId);
  }

  // ✅ AUTO: fetch tickets
  const email = String(loadedCustomer?.email || "").trim();
  if (email && ticketStore.fetchTicketsByEmail) {
    await ticketStore.fetchTicketsByEmail({
      email,
      status: get().query.ticketStatus || undefined,
      page: 1,
      limit: 10,
    });
  }

  return customerId;
},


  /* ============================================================
    ✅ Extract product IDs from an order and fetch product details
  ============================================================ */
  loadProductsForOrder: async (orderLike) => {
    try {
      const orderId = getId(orderLike?._id || orderLike?.id || orderLike);
      const orderStore = useOrderStore.getState();

      // ensure we have a full order object (if only id was passed)
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
        ...new Set(
          items
            .map((it) => getId(it?.product || it?.productId || it?.variant?.product))
            .filter(Boolean)
        ),
      ];

      if (!productIds.length) {
        set({ orderProducts: [], orderProductsById: {} });
        toast("No products found on this order");
        return [];
      }

      const productStore = useAdminProductStore.getState();
      const products = await productStore.fetchProductsByIds(productIds);

      const byId = {};
      (products || []).forEach((p) => {
        const id = getId(p);
        if (id) byId[id] = p;
      });

      set({ orderProducts: products || [], orderProductsById: byId });
      toast.success("Loaded product details ✅");
      return products || [];
    } catch (e) {
      console.error("❌ loadProductsForOrder:", e);
      toast.error(e?.message || "Failed to load products");
      return [];
    }
  },

  /* ============================================================
    RUN SUPPORT SEARCH (✅ FIXED first time issue + auto orders)
  ============================================================ */
  runSearch: async () => {
    const q = get().query;

    // ✅ normalize query values once
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

    // clear downstream stores
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
        const ordNo = normalizeOrderNumber(ordRaw, "MIRAY", 6);

        // keep query normalized so UI also shows correct format
        set((s) => ({ query: { ...s.query, email: _email, orderNumber: ordNo } }));

        const ord = await orderStore.fetchOrderByNumber(ordNo);
        if (!ord) throw new Error("Order not found");

        // ✅ keep selected order visible (order screen)
        if (ord?._id && orderStore.fetchOrderById) {
          await orderStore.fetchOrderById(ord._id);
        }

        const customerId =
          getId(ord?.customer) ||
          getId(ord?.user) ||
          getId(ord?.customerId) ||
          getId(ord?.userId);

        if (!customerId) throw new Error("Order found but customerId not present on order");

        // ✅ this will also auto-load orders + tickets
        await get()._hydrateCustomerProfileOnly(customerId);

        // ✅ OPTIONAL auto products for order search
        // await get().loadProductsForOrder(ord);

        toast.success("Fetched order + customer ✅ (orders & tickets auto loaded)");
        return;
      }

      // 2) CUSTOMER SEARCH PATH
      const searchValue = _email || _phone || _name;

      // keep email lowercased in UI
      set((s) => ({ query: { ...s.query, email: _email } }));

      // IMPORTANT:
      // Some fetchCustomers return nothing and update store async
      // So we wait for store to populate instead of reading immediately.
      const beforeLen = (useCustomerStore.getState().customers || []).length;

      await customerStore.fetchCustomers({ search: searchValue, limit: 20, page: 1 });

      // ✅ wait until customers array changes OR has length > 0
      await waitFor(() => {
        const cur = useCustomerStore.getState().customers || [];
        return cur.length !== beforeLen && cur.length > 0;
      });

      const list = useCustomerStore.getState().customers || [];
      if (!list.length) throw new Error("No customer found for given input");

      if (list.length === 1) {
        // ✅ this will auto-load orders + tickets
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
    SELECT CUSTOMER (multi-match) ✅ NOW auto loads orders/tickets
  ============================================================ */
  selectCustomer: async (customer) => {
    set({ loading: true, error: "" });
    try {
      set({ matchedCustomers: [] });

      // clear downstream for new selection
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
    SELECT ORDER (load order screen)
    ✅ Now also loads full order if needed
  ============================================================ */
  selectOrder: async (order) => {
    if (!order) return;
    try {
      const orderStore = useOrderStore.getState();

      let fullOrder = order;
      if (order?._id && orderStore.fetchOrderById) {
        fullOrder = await orderStore.fetchOrderById(order._id);
      } else {
        toast("Order selected");
      }

      // ✅ OPTIONAL: load product details when selecting an order
      // await get().loadProductsForOrder(fullOrder);
    } catch (e) {
      console.error("❌ selectOrder:", e);
      toast.error(e?.message || "Failed to load order");
    }
  },

  /* ============================================================
    SELECT TICKET (load ticket detail)
  ============================================================ */
  selectTicket: async (ticketId) => {
    if (!ticketId) return;
    try {
      await useCustomerTicketStore.getState().fetchTicketById(ticketId);
    } catch (e) {
      toast.error(e?.message || "Failed to load ticket");
    }
  },
}));
