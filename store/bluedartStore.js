"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "").trim();

const apiBase = API ? API.replace(/\/+$/, "") : "";
const BASE_ROUTE = "/api/bluedart";

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

const pick = (obj = {}, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const firstArray = (...items) =>
  items.find((item) => Array.isArray(item) && item.length) || [];

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
  carrierName: "",
  carrierSlug: "",
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
  eventCode: ev?.eventCode || ev?.status || ev?.scan_status || "",
  eventName: ev?.eventName || ev?.activity || ev?.event || "",
  eventDescription:
    ev?.eventDescription || ev?.description || ev?.scan_description || "",
  eventLocation: ev?.eventLocation || ev?.location || ev?.scan_location || "",
  eventTime: ev?.eventTime || ev?.date || ev?.time || ev?.scan_time || null,
  raw: ev?.raw || ev,
});

const normalizeShipment = (s = {}) => {
  const tracking = s?.tracking || s?.rawTrackingResponse?.tracking || {};

  return {
    _id: s?._id || "",

    provider: s?.provider || "eshipz",
    partner: s?.partner || "eshipz",

    carrierName: s?.carrierName || tracking?.carrier || "BlueDart",
    carrierSlug: s?.carrierSlug || tracking?.carrierSlug || "bluedart",

    orderNumber: s?.orderNumber || "",
    orderId: s?.orderId || null,
    shipmentType: s?.shipmentType || "",

    referenceNumber: s?.referenceNumber || tracking?.referenceNumber || "",

    awbNumber: s?.awbNumber || s?.awb || tracking?.awbNumber || "",
    awb: s?.awb || s?.awbNumber || tracking?.awbNumber || "",

    shipmentIdExternal:
      s?.shipmentIdExternal || s?.shipmentId || tracking?.shipmentId || "",
    shipmentId:
      s?.shipmentId || s?.shipmentIdExternal || tracking?.shipmentId || "",

    externalOrderId: s?.externalOrderId || "",
    eshipzOrderId: s?.eshipzOrderId || s?.externalOrderId || "",

    trackingUrl:
      s?.trackingUrl ||
      s?.trackingURL ||
      s?.tracking_url ||
      s?.rawTrackingResponse?.trackingUrl ||
      "",
    labelUrl: s?.labelUrl || "",
    manifestUrl: s?.manifestUrl || "",
    invoiceUrl: s?.invoiceUrl || "",

    status: s?.status || tracking?.status || "",
    rawStatus: s?.rawStatus || tracking?.status || "",
    statusCode: s?.statusCode || "",

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

    latestTrackingRemark:
      s?.latestTrackingRemark || tracking?.description || "",
    latestTrackingLocation:
      s?.latestTrackingLocation || tracking?.location || "",

    trackingEvents: Array.isArray(s?.trackingEvents)
      ? s.trackingEvents.map(normalizeTrackingEvent)
      : Array.isArray(tracking?.events)
      ? tracking.events.map(normalizeTrackingEvent)
      : [],

    expectedDelivery: s?.expectedDelivery || tracking?.edd || null,

    bookingRequestedAt: s?.bookingRequestedAt || null,
    bookedAt: s?.bookedAt || null,
    pickupScheduledAt: s?.pickupScheduledAt || null,
    pickedUpAt: s?.pickedUpAt || null,
    shippedAt: s?.shippedAt || null,
    outForDeliveryAt: s?.outForDeliveryAt || null,
    deliveredAt: s?.deliveredAt || tracking?.deliveredAt || null,
    rtoAt: s?.rtoAt || null,
    failedAt: s?.failedAt || null,

    lastSyncedAt: s?.lastSyncedAt || null,
    lastTrackAt: s?.lastTrackAt || tracking?.statusDate || null,
    lastWebhookAt: s?.lastWebhookAt || null,

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
    rawWebhookPayload: s?.rawWebhookPayload || null,

    createdAt: s?.createdAt || null,
    updatedAt: s?.updatedAt || null,
  };
};

const normalizeExternalOrder = (input = {}) => {
  const o =
    input?.orders?.[0] ||
    input?.order?.orders?.[0] ||
    input?.data?.orders?.[0] ||
    input?.result?.orders?.[0] ||
    input;

  const receiver = o?.receiver_address || o?.receiver || null;
  const sender = o?.shipper_address || o?.sender_address || o?.sender || null;

  const parcels = Array.isArray(o?.parcels) ? o.parcels : [];
  const firstParcel = parcels?.[0] || {};

  return {
    id: o?._id || o?.id || o?.order_id || "",
    orderId: o?.order_id || o?.id || o?._id || "",
    orderNumber:
      o?.order_number || o?.orderNumber || o?.order_id || o?.entity_id || "",
    storeName: o?.store_name || "",
    awbNumber:
      o?.awb_number || o?.awb || firstParcel?.awb || o?.waybill || "",
    awb: o?.awb || o?.awb_number || firstParcel?.awb || "",
    shipmentId:
      o?.shipment_id || o?.shipmentId || o?.entity_id || o?.trip_id || "",
    status: o?.order_status || o?.status || "",
    shipStatus:
      o?.ship_status ||
      o?.shipment_status ||
      o?.fulfilment_status ||
      o?.status ||
      "",
    paymentMode:
      o?.payment_mode || o?.paymentMode || (o?.is_cod ? "cod" : "prepaid"),
    shipmentValue: Number(o?.shipment_value ?? o?.shipmentValue ?? 0) || 0,
    codAmount: Number(o?.cod_amount ?? o?.codAmount ?? 0) || 0,
    currency: o?.order_currency || o?.currency || "INR",
    receiver,
    sender,
    items: Array.isArray(o?.items) ? o.items : [],
    parcels,
    invoices: Array.isArray(o?.gst_invoices) ? o.gst_invoices : [],
    createdAt: o?.order_created_on || o?.created_at || "",
    updatedAt: o?.order_updated_on || o?.updated_at || "",
    isShipped: Boolean(o?.is_shipped),
    isCancelled: Boolean(o?.is_cancelled),
    raw: o,
  };
};

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
      Number(p?.exp_del_days ?? p?.sla_days ?? p?.predicted_days ?? 0) || 0,
    courier: p?.slug || p?.courier || p?.carrier || "bluedart",
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

export const useBlueDartStore = create((set, get) => ({
  shipments: [],
  shipment: null,
  orderShipments: [],

  externalOrders: [],
  externalOrder: null,
  eddPrediction: null,
  externalResponse: null,

  lastUpdatedOrder: null,

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
      filters: {
        ...state.filters,
        ...patch,
        page: patch.page ?? state.filters.page,
      },
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
      lastUpdatedOrder: null,
      error: "",
      errorData: null,
      successMessage: "",
    }),

  fetchShipments: async (override = {}) => {
    try {
      return await withLoader(set, "listLoading", async () => {
        const filters = { ...get().filters, ...override };
        const data = await request(`${BASE_ROUTE}/shipments`, {}, filters);

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
        const data = await request(`${BASE_ROUTE}/shipments/${id}`);
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
          `${BASE_ROUTE}/shipments/order/${encodeURIComponent(orderNumber)}`
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
        set({ externalResponse: null, lastUpdatedOrder: null });

        const data = await request(`${BASE_ROUTE}/shipments/create-from-order`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const shipment = normalizeShipment(data?.shipment || {});

        set((state) => {
          const shipments = upsertById(state.shipments, shipment);
          const total = Math.max(
            Number(state.pagination?.total || 0),
            shipments.length
          );

          return {
            shipment,
            orderShipments: shipment?._id
              ? upsertById(state.orderShipments, shipment)
              : state.orderShipments,
            shipments,
            externalResponse: data?.externalResponse || null,
            lastUpdatedOrder: data?.order || null,
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

        toast.success(data?.message || "Eshipz shipment created");

        return {
          success: true,
          shipment,
          order: data?.order || null,
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
        const data = await request(`${BASE_ROUTE}/shipments/${id}/track`, {
          method: "POST",
        });

        const shipment = normalizeShipment(
          data?.shipment || data?.updatedShipment || {}
        );

        set((state) => ({
          shipment: shipment?._id ? shipment : state.shipment,
          orderShipments: shipment?._id
            ? replaceById(state.orderShipments, shipment)
            : state.orderShipments,
          shipments: shipment?._id
            ? replaceById(state.shipments, shipment)
            : state.shipments,
          lastUpdatedOrder: data?.order || null,
          externalResponse: data?.externalResponse || data?.tracking || null,
          successMessage: data?.message || "Shipment tracked successfully",
        }));

        toast.success(data?.message || "Shipment tracked");

        return {
          success: true,
          shipment,
          tracking: data?.tracking || null,
          trackingUrl: data?.trackingUrl || shipment?.trackingUrl || "",
          order: data?.order || null,
          data,
        };
      });
    } catch (err) {
      set({ error: err.message, errorData: err.data || null });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  bulkSyncShipments: async (payload = {}) => {
    try {
      return await withLoader(set, "bulkSyncing", async () => {
        const data = await request(`${BASE_ROUTE}/shipments/bulk-sync`, {
          method: "POST",
          body: JSON.stringify(payload || {}),
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
        const data = await request(`${BASE_ROUTE}/orders-api`, {}, params);

        const rows = firstArray(
          data?.orders,
          data?.order?.orders,
          data?.externalResponse?.orders
        );

        set({
          externalOrders: rows.map(normalizeExternalOrder),
          externalResponse: data?.externalResponse || data?.order || null,
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
          `${BASE_ROUTE}/orders-api/${encodeURIComponent(salesChannelOrderId)}`
        );

        const orderSource =
          data?.order?.orders?.[0] ||
          data?.externalResponse?.orders?.[0] ||
          data?.order ||
          data?.externalResponse ||
          {};

        const externalOrder = normalizeExternalOrder(orderSource);

        set({
          externalOrder,
          externalResponse: data?.externalResponse || data?.order || null,
          successMessage: data?.message || "",
        });

        return { success: true, order: externalOrder, data };
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
        const data = await request(`${BASE_ROUTE}/edd-prediction`, {
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