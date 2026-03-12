"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "").trim();

const apiBase = API ? API.replace(/\/+$/, "") : "";

/* ---------------- helpers ---------------- */

const safe = (v) => (v == null ? "" : String(v));

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid JSON response" };
  }
};

const buildUrl = (path, params) => {
  const clean = path.startsWith("/") ? path : `/${path}`;

  const qs = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = String(value);
      }
      return acc;
    }, {})
  ).toString();

  return `${apiBase}${clean}${qs ? `?${qs}` : ""}`;
};

const extractErrorMessage = (data = {}) =>
  data?.message ||
  data?.error ||
  data?.errorData?.meta?.message ||
  data?.errorData?.message ||
  data?.errorData?.error ||
  "Request failed";

const request = async (path, options = {}, params = null) => {
  const res = await fetch(buildUrl(path, params), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await safeJson(res);

  if (!res.ok || data?.success === false) {
    const err = new Error(extractErrorMessage(data));
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
};

const defaultAddress = {
  fullName: "",
  phone: "",
  email: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

const defaultFilters = {
  q: "",
  status: "",
  shipmentType: "",
  page: 1,
  limit: 20,
};

const defaultPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const normalizeTrackingEvent = (ev = {}) => ({
  eventCode: ev?.eventCode || "",
  eventName: ev?.eventName || "",
  eventDescription: ev?.eventDescription || "",
  eventLocation: ev?.eventLocation || "",
  eventTime: ev?.eventTime || null,
  raw: ev?.raw || null,
});

const normalizeShipment = (s = {}) => ({
  _id: s?._id || "",
  orderNumber: s?.orderNumber || "",
  orderId: s?.orderId || null,
  referenceNumber: s?.referenceNumber || "",
  awbNumber: s?.awbNumber || "",
  shipmentIdExternal: s?.shipmentIdExternal || "",
  externalOrderId: s?.externalOrderId || "",
  labelUrl: s?.labelUrl || "",
  manifestUrl: s?.manifestUrl || "",
  invoiceUrl: s?.invoiceUrl || "",
  status: s?.status || "",
  statusCode: s?.statusCode || "",
  shipmentType: s?.shipmentType || "",
  paymentMode: s?.paymentMode || "",
  serviceType: s?.serviceType || "",
  declaredValue: Number(s?.declaredValue ?? 0) || 0,
  currency: s?.currency || "INR",
  weight: Number(s?.weight ?? 0) || 0,
  pieces: Number(s?.pieces ?? 1) || 1,
  dimensions: {
    length: Number(s?.dimensions?.length ?? 0) || 0,
    breadth: Number(s?.dimensions?.breadth ?? 0) || 0,
    height: Number(s?.dimensions?.height ?? 0) || 0,
  },
  codAmount: Number(s?.codAmount ?? 0) || 0,
  latestTrackingRemark: s?.latestTrackingRemark || "",
  latestTrackingLocation: s?.latestTrackingLocation || "",
  trackingEvents: Array.isArray(s?.trackingEvents)
    ? s.trackingEvents.map(normalizeTrackingEvent)
    : [],
  deliveredAt: s?.deliveredAt || null,
  shippedAt: s?.shippedAt || null,
  pickedUpAt: s?.pickedUpAt || null,
  bookingRequestedAt: s?.bookingRequestedAt || null,
  lastSyncedAt: s?.lastSyncedAt || null,
  syncError: s?.syncError || "",
  syncPending: Boolean(s?.syncPending),
  isCancelled: Boolean(s?.isCancelled),
  cancelledAt: s?.cancelledAt || null,
  notes: s?.notes || "",
  recipient: s?.recipient || { ...defaultAddress },
  sender: s?.sender || { ...defaultAddress },
  externalMeta: s?.externalMeta || null,
  rawCreateRequest: s?.rawCreateRequest || null,
  rawCreateResponse: s?.rawCreateResponse || null,
  rawTrackingResponse: s?.rawTrackingResponse || null,
  createdAt: s?.createdAt || null,
  updatedAt: s?.updatedAt || null,
});

const normalizeExternalOrder = (o = {}) => ({
  id: o?.id || o?.order_id || o?._id || "",
  orderId: o?.order_id || o?.id || "",
  orderNumber: o?.order_number || o?.orderNumber || "",
  awbNumber: o?.awb_number || o?.awb || "",
  status: o?.order_status || o?.status || "",
  shipStatus: o?.ship_status || "",
  paymentMode: o?.payment_mode || "",
  shipmentValue: Number(o?.shipment_value ?? 0) || 0,
  codAmount: Number(o?.cod_amount ?? 0) || 0,
  currency: o?.order_currency || "INR",
  receiver: o?.receiver_address || null,
  sender: o?.sender_address || null,
  items: Array.isArray(o?.items) ? o.items : [],
  parcels: Array.isArray(o?.parcels) ? o.parcels : [],
  raw: o,
});

const normalizeEddPrediction = (input = null) => {
  const p = Array.isArray(input) ? input[0] || {} : input || {};

  return {
    eta:
      p?.exp_del_date ||
      p?.eta ||
      p?.edd ||
      p?.predicted_sla ||
      p?.predicted_delivery_date ||
      "",
    minDays: Number(p?.min_days ?? p?.minimum_days ?? 0) || 0,
    maxDays: Number(p?.max_days ?? p?.maximum_days ?? 0) || 0,
    slaDays:
      Number(
        p?.exp_del_days ??
          p?.sla_days ??
          p?.predicted_days ??
          0
      ) || 0,
    courier: p?.slug || p?.courier || "",
    originPincode: p?.origin_pincode || "",
    destinationPincode: p?.destination_pincode || "",
    dispatchDate: p?.dispatch_date || "",
    expectedDeliveryDate: p?.exp_del_date || "",
    expectedDeliveryDays: Number(p?.exp_del_days ?? 0) || 0,
    serviceType: p?.service_type || "",
    raw: p,
  };
};

const upsertById = (list = [], item = null) => {
  if (!item?._id) return list;
  return [item, ...list.filter((x) => x._id !== item._id)];
};

const replaceById = (list = [], item = null) => {
  if (!item?._id) return list;
  return list.map((x) => (x._id === item._id ? item : x));
};

const withLoader = async (set, key, fn) => {
  try {
    set({ [key]: true, error: "", errorData: null, successMessage: "" });
    return await fn();
  } finally {
    set({ [key]: false });
  }
};

/* ---------------- store ---------------- */

export const useBlueDartStore = create((set, get) => ({
  shipments: [],
  shipment: null,
  orderShipments: [],

  externalOrders: [],
  externalOrder: null,
  eddPrediction: null,
  externalResponse: null,

  listLoading: false,
  shipmentLoading: false,
  creating: false,
  tracking: false,
  bulkSyncing: false,
  externalOrdersLoading: false,
  externalOrderLoading: false,
  eddLoading: false,

  error: "",
  errorData: null,
  successMessage: "",

  filters: { ...defaultFilters },
  pagination: { ...defaultPagination },

  setFilters: (patch = {}) =>
    set((state) => ({
      filters: { ...state.filters, ...patch },
    })),

  resetFilters: () =>
    set({
      filters: { ...defaultFilters },
      pagination: { ...defaultPagination },
    }),

  clearState: () =>
    set({
      shipment: null,
      orderShipments: [],
      externalOrders: [],
      externalOrder: null,
      eddPrediction: null,
      externalResponse: null,
      error: "",
      errorData: null,
      successMessage: "",
    }),

  fetchShipments: async (override = {}) => {
    try {
      return await withLoader(set, "listLoading", async () => {
        const filters = { ...get().filters, ...override };
        const data = await request("/api/bluedart/shipments", {}, filters);

        set({
          shipments: Array.isArray(data?.shipments)
            ? data.shipments.map(normalizeShipment)
            : [],
          pagination: { ...defaultPagination, ...(data?.pagination || {}) },
          filters,
          successMessage: data?.message || "",
        });

        return { success: true, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  fetchShipmentById: async (id) => {
    try {
      return await withLoader(set, "shipmentLoading", async () => {
        const data = await request(`/api/bluedart/shipments/${id}`);
        const shipment = normalizeShipment(data?.shipment || {});

        set({
          shipment,
          shipments: shipment?._id
            ? upsertById(get().shipments, shipment)
            : get().shipments,
          successMessage: data?.message || "",
        });

        return { success: true, shipment, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  fetchShipmentByOrderNumber: async (orderNumber) => {
    try {
      return await withLoader(set, "shipmentLoading", async () => {
        const data = await request(
          `/api/bluedart/shipments/order/${encodeURIComponent(orderNumber)}`
        );

        const rows = Array.isArray(data?.shipments)
          ? data.shipments.map(normalizeShipment)
          : [];

        set({
          orderShipments: rows,
          shipment: rows[0] || null,
          successMessage: data?.message || "",
        });

        return { success: true, shipments: rows, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  createShipmentFromOrder: async (payload) => {
    try {
      return await withLoader(set, "creating", async () => {
        set({ externalResponse: null });

        const data = await request("/api/bluedart/shipments/create-from-order", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const shipment = normalizeShipment(data?.shipment || {});

        set((state) => {
          const shipments = upsertById(state.shipments, shipment);
          const total = Math.max(Number(state.pagination?.total || 0), shipments.length);

          return {
            shipment,
            orderShipments: shipment?._id
              ? upsertById(state.orderShipments, shipment)
              : state.orderShipments,
            shipments,
            externalResponse: data?.externalResponse || null,
            successMessage: data?.message || "Shipment created successfully",
            pagination: {
              ...state.pagination,
              total,
              totalPages: Math.max(
                1,
                Math.ceil(total / Number(state.pagination?.limit || 20))
              ),
            },
          };
        });

        toast.success(data?.message || "Shipment created");
        return {
          success: true,
          shipment,
          externalResponse: data?.externalResponse || null,
          data,
        };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  trackShipment: async (id) => {
    try {
      return await withLoader(set, "tracking", async () => {
        const data = await request(`/api/bluedart/shipments/${id}/track`, {
          method: "POST",
        });

        const shipment = normalizeShipment(data?.shipment || {});

        set((state) => ({
          shipment,
          orderShipments: replaceById(state.orderShipments, shipment),
          shipments: replaceById(state.shipments, shipment),
          successMessage: data?.message || "Shipment tracked successfully",
        }));

        toast.success(data?.message || "Shipment tracked");
        return { success: true, shipment, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  bulkSyncShipments: async () => {
    try {
      return await withLoader(set, "bulkSyncing", async () => {
        const data = await request("/api/bluedart/shipments/bulk-sync", {
          method: "POST",
        });

        set({
          successMessage: data?.message || "Bulk sync completed",
        });

        toast.success(data?.message || "Bulk sync completed");
        await get().fetchShipments();

        return { success: true, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  fetchExternalOrders: async (params = {}) => {
    try {
      return await withLoader(set, "externalOrdersLoading", async () => {
        const data = await request("/api/bluedart/orders-api", {}, params);

        set({
          externalOrders: Array.isArray(data?.orders)
            ? data.orders.map(normalizeExternalOrder)
            : [],
          externalResponse: data?.externalResponse || null,
          successMessage: data?.message || "",
        });

        return { success: true, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  fetchExternalOrderById: async (salesChannelOrderId) => {
    try {
      return await withLoader(set, "externalOrderLoading", async () => {
        const data = await request(
          `/api/bluedart/orders-api/${encodeURIComponent(salesChannelOrderId)}`
        );

        set({
          externalOrder: normalizeExternalOrder(data?.order || {}),
          externalResponse: data?.externalResponse || null,
          successMessage: data?.message || "",
        });

        return { success: true, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  fetchEddPrediction: async (payload) => {
    try {
      return await withLoader(set, "eddLoading", async () => {
        const data = await request("/api/bluedart/edd-prediction", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        set({
          eddPrediction: normalizeEddPrediction(data?.prediction || null),
          externalResponse: data?.externalResponse || null,
          successMessage: data?.message || "",
        });

        return { success: true, data };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },
}));