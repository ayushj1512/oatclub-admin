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
    // ✅ optional: you may or may not want to reset product store
    try {
      useAdminProductStore.getState().resetProduct?.();
    } catch {}
  },

  /* ============================================================
    INTERNAL: Hydrate only CUSTOMER PROFILE (NO prefetch orders/tickets)
  ============================================================ */
  _hydrateCustomerProfileOnly: async (customerLike) => {
    const customerId = getId(customerLike);
    if (!customerId) throw new Error("Invalid customerId");

    const customerStore = useCustomerStore.getState();
    await customerStore.fetchCustomerById(customerId);

    set({ selectedCustomerId: customerId });
    return customerId;
  },

  /* ============================================================
    ✅ NEW: Extract product IDs from an order and fetch product details
    - Call this manually from UI (button click) OR from selectOrder/order search
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
    RUN SUPPORT SEARCH
  ============================================================ */
  runSearch: async () => {
    const { phone, email, name, orderNumber } = get().query;

    set({
      matchedCustomers: [],
      selectedCustomerId: null,
      orderProducts: [],
      orderProductsById: {},
      error: "",
    });

    const _phone = String(phone || "").trim();
    const _email = String(email || "").trim();
    const _name = String(name || "").trim();
    const ordRaw = String(orderNumber || "").trim();

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
        set((s) => ({ query: { ...s.query, orderNumber: ordNo } }));

        const ord = await orderStore.fetchOrderByNumber(ordNo);
        if (!ord) throw new Error("Order not found");

        const customerId =
          getId(ord?.customer) ||
          getId(ord?.user) ||
          getId(ord?.customerId) ||
          getId(ord?.userId);

        if (!customerId) throw new Error("Order found but customerId not present on order");

        await get()._hydrateCustomerProfileOnly(customerId);

        // keep selected order visible (order screen)
        if (ord?._id) {
          orderStore.fetchOrderById?.(ord._id).catch(() => {});
        }

        // ✅ OPTIONAL:
        // If you want products to load automatically for order searches, uncomment this:
        // await get().loadProductsForOrder(ord);

        toast.success("Fetched order + customer ✅ (products load manually unless enabled)");
        return;
      }

      // 2) CUSTOMER SEARCH PATH
      const searchValue = _email || _phone || _name;
      await customerStore.fetchCustomers({ search: searchValue, limit: 20, page: 1 });

      const list = customerStore.customers || [];
      if (!list.length) throw new Error("No customer found for given input");

      if (list.length === 1) {
        await get()._hydrateCustomerProfileOnly(list[0]);
        toast.success("Fetched customer ✅ (orders/tickets/products load manually)");
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
      await get()._hydrateCustomerProfileOnly(customer);
      toast.success("Customer loaded ✅");
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
    ✅ Now can also load product details for that order if you want
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
