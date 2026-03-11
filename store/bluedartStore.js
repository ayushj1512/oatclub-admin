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
  const qs = params
    ? new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {})
      ).toString()
    : "";

  return `${apiBase}${clean}${qs ? `?${qs}` : ""}`;
};

const extractErrorMessage = (data = {}) => {
  return (
    data?.message ||
    data?.error ||
    data?.errorData?.meta?.message ||
    data?.errorData?.message ||
    data?.errorData?.error ||
    "Request failed"
  );
};

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
  weight: Number(s?.package?.weight ?? s?.weight ?? 0) || 0,
  pieces: Number(s?.package?.pieces ?? s?.pieces ?? 1) || 1,
  dimensions: {
    length: Number(s?.dimensions?.length ?? s?.package?.length ?? 0) || 0,
    breadth: Number(s?.dimensions?.breadth ?? s?.package?.breadth ?? 0) || 0,
    height: Number(s?.dimensions?.height ?? s?.package?.height ?? 0) || 0,
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

const upsertShipmentInList = (list = [], shipment = null) => {
  if (!shipment?._id) return list;
  const filtered = list.filter((s) => s._id !== shipment._id);
  return [shipment, ...filtered];
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

/* ---------------- store ---------------- */

export const useBlueDartStore = create((set, get) => ({
  shipments: [],
  shipment: null,
  orderShipments: [],
  externalResponse: null,

  listLoading: false,
  shipmentLoading: false,
  creating: false,
  tracking: false,
  bulkSyncing: false,

  error: "",
  errorData: null,
  successMessage: "",

  filters: { ...defaultFilters },
  pagination: { ...defaultPagination },

  /* ---------------- setters ---------------- */

  setFilters: (patch = {}) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...patch,
      },
    }));
  },

  resetFilters: () => {
    set({
      filters: { ...defaultFilters },
    });
  },

  clearState: () => {
    set({
      shipment: null,
      orderShipments: [],
      externalResponse: null,
      error: "",
      errorData: null,
      successMessage: "",
    });
  },

  /* ---------------- list shipments ---------------- */

  fetchShipments: async (override = {}) => {
    try {
      set({
        listLoading: true,
        error: "",
        errorData: null,
        successMessage: "",
      });

      const filters = { ...get().filters, ...override };

      const data = await request("/api/bluedart/shipments", {}, filters);

      set({
        shipments: Array.isArray(data?.shipments)
          ? data.shipments.map(normalizeShipment)
          : [],
        pagination: {
          ...defaultPagination,
          ...(data?.pagination || {}),
        },
        filters,
        listLoading: false,
        successMessage: data?.message || "",
      });

      return { success: true, data };
    } catch (err) {
      set({
        listLoading: false,
        error: err.message,
        errorData: err.data || null,
      });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  /* ---------------- single shipment ---------------- */

  fetchShipmentById: async (id) => {
    try {
      set({
        shipmentLoading: true,
        error: "",
        errorData: null,
        successMessage: "",
      });

      const data = await request(`/api/bluedart/shipments/${id}`);

      set({
        shipmentLoading: false,
        shipment: normalizeShipment(data?.shipment || {}),
        successMessage: data?.message || "",
      });

      return { success: true, data };
    } catch (err) {
      set({
        shipmentLoading: false,
        error: err.message,
        errorData: err.data || null,
      });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  fetchShipmentByOrderNumber: async (orderNumber) => {
    try {
      set({
        shipmentLoading: true,
        error: "",
        errorData: null,
        successMessage: "",
      });

      const data = await request(
        `/api/bluedart/shipments/order/${encodeURIComponent(orderNumber)}`
      );

      const rows = Array.isArray(data?.shipments)
        ? data.shipments.map(normalizeShipment)
        : [];

      set({
        shipmentLoading: false,
        orderShipments: rows,
        shipment: rows[0] || null,
        successMessage: data?.message || "",
      });

      return { success: true, shipments: rows, data };
    } catch (err) {
      set({
        shipmentLoading: false,
        error: err.message,
        errorData: err.data || null,
      });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  /* ---------------- create shipment ---------------- */

  createShipmentFromOrder: async (payload) => {
    try {
      set({
        creating: true,
        error: "",
        errorData: null,
        successMessage: "",
        externalResponse: null,
      });

      const data = await request("/api/bluedart/shipments/create-from-order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdShipment = normalizeShipment(data?.shipment || {});

      set((state) => {
        const nextShipments = upsertShipmentInList(state.shipments, createdShipment);
        const nextTotal = Math.max(
          Number(state.pagination?.total || 0),
          nextShipments.length
        );

        return {
          creating: false,
          shipment: createdShipment,
          orderShipments: createdShipment?._id
            ? upsertShipmentInList(state.orderShipments, createdShipment)
            : state.orderShipments,
          externalResponse: data?.externalResponse || null,
          successMessage:
            data?.message ||
            (createdShipment?.status === "order_pushed"
              ? "BlueDart order pushed successfully"
              : "Shipment created successfully"),
          shipments: nextShipments,
          pagination: {
            ...state.pagination,
            total: nextTotal,
            totalPages: Math.max(
              1,
              Math.ceil(nextTotal / Number(state.pagination?.limit || 20))
            ),
          },
        };
      });

      toast.success(
        data?.message ||
          (createdShipment?.status === "order_pushed"
            ? "BlueDart order pushed"
            : "Shipment created")
      );

      return {
        success: true,
        shipment: createdShipment,
        externalResponse: data?.externalResponse || null,
      };
    } catch (err) {
      set({
        creating: false,
        error: err.message,
        errorData: err.data || null,
      });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  /* ---------------- track shipment ---------------- */

  trackShipment: async (id) => {
    try {
      set({
        tracking: true,
        error: "",
        errorData: null,
        successMessage: "",
      });

      const data = await request(`/api/bluedart/shipments/${id}/track`, {
        method: "POST",
      });

      const shipment = normalizeShipment(data?.shipment || {});

      set((state) => ({
        shipment,
        orderShipments: state.orderShipments.map((s) =>
          s._id === shipment._id ? shipment : s
        ),
        shipments: state.shipments.map((s) =>
          s._id === shipment._id ? shipment : s
        ),
        tracking: false,
        successMessage: data?.message || "Shipment tracked successfully",
      }));

      toast.success(data?.message || "Shipment tracked");

      return { success: true, shipment, data };
    } catch (err) {
      set({
        tracking: false,
        error: err.message,
        errorData: err.data || null,
      });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },

  /* ---------------- bulk sync ---------------- */

  bulkSyncShipments: async () => {
    try {
      set({
        bulkSyncing: true,
        error: "",
        errorData: null,
        successMessage: "",
      });

      const data = await request("/api/bluedart/shipments/bulk-sync", {
        method: "POST",
      });

      set({
        bulkSyncing: false,
        successMessage: data?.message || "Bulk sync completed",
      });

      toast.success(data?.message || "Bulk sync completed");

      await get().fetchShipments();

      return { success: true, data };
    } catch (err) {
      set({
        bulkSyncing: false,
        error: err.message,
        errorData: err.data || null,
      });
      toast.error(err.message);
      return { success: false, error: err.message, errorData: err.data || null };
    }
  },
}));