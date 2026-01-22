import { create } from "zustand";

// ✅ Backend base (env based; fallback to hosted)
const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim() ||
  "https://error.mirayfashions.com";

// ✅ Webhook URL (derived from same base)
const XPRESSBEES_WEBHOOK_URL = `${API_BASE}/api/webhooks/xpressbees`;

// Small helper for JSON calls
async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // if you use cookies/session; remove if not needed
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const useXpressbeesStore = create((set, get) => ({
  // ---- UI state
  loading: false,
  error: null,

  // ---- last responses (optional for admin debug)
  lastCreate: null,
  lastSync: null,
  lastTrack: null,
  lastCancel: null,
  lastManifest: null,

  // ---- getters
  webhookUrl: XPRESSBEES_WEBHOOK_URL,

  clearError: () => set({ error: null }),
  reset: () =>
    set({
      loading: false,
      error: null,
      lastCreate: null,
      lastSync: null,
      lastTrack: null,
      lastCancel: null,
      lastManifest: null,
    }),

  // ---------------------------------------------------------------------------
  // 1) Create Shipment (Manual Trigger) — NEW FLOW supported via backend
  // POST /api/shipping/xpressbees/:orderId/create?force=1
  //
  // body supports extra optional fields (backend can use if you wire it):
  // - serviceType: "SD" | "SDD" | "NDD" | "AIR" | "SFC" | "IntraSDD"
  // - pickupVendorCode: string
  //
  // keep old fields for backward compatibility:
  // - confirmIfCOD, preferXpressbeesProvider
  // ---------------------------------------------------------------------------
  createShipment: async ({
    orderId,
    force = true,
    confirmIfCOD = true,
    preferXpressbeesProvider = true,

    // ✅ NEW optional controls
    serviceType, // "SD" | "SDD" | "NDD" | "AIR" | "SFC" | "IntraSDD"
    pickupVendorCode, // override if needed
  }) => {
    if (!orderId) throw new Error("orderId required");
    set({ loading: true, error: null });

    try {
      const query = force ? "?force=1" : "";
      const body = {
        force,
        confirmIfCOD,
        preferXpressbeesProvider,
        ...(serviceType ? { serviceType } : {}),
        ...(pickupVendorCode ? { pickupVendorCode } : {}),
      };

      const data = await apiFetch(
        `/api/shipping/xpressbees/${orderId}/create${query}`,
        {
          method: "POST",
          body,
        }
      );

      set({ lastCreate: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ---------------------------------------------------------------------------
  // 2) Sync Tracking (updates order status in DB)
  // POST /api/shipping/xpressbees/:orderId/sync
  // body: { force? }
  // ---------------------------------------------------------------------------
  syncTracking: async ({ orderId, force = false }) => {
    if (!orderId) throw new Error("orderId required");
    set({ loading: true, error: null });

    try {
      const query = force ? "?force=1" : "";
      const data = await apiFetch(
        `/api/shipping/xpressbees/${orderId}/sync${query}`,
        { method: "POST", body: { force } }
      );

      set({ lastSync: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ---------------------------------------------------------------------------
  // 3) Track by AWB (debug view)
  // GET /api/shipping/xpressbees/track/:awb
  // ---------------------------------------------------------------------------
  trackByAwb: async ({ awb }) => {
    if (!awb) throw new Error("awb required");
    set({ loading: true, error: null });

    try {
      const data = await apiFetch(`/api/shipping/xpressbees/track/${awb}`, {
        method: "GET",
      });

      set({ lastTrack: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ---------------------------------------------------------------------------
  // 4) Cancel Shipment (NEW: maps to RTO notify/cancellation in backend)
  // POST /api/shipping/xpressbees/cancel/:awb
  //
  // optional: pass reason
  // ---------------------------------------------------------------------------
  cancelShipment: async ({ awb, reason }) => {
    if (!awb) throw new Error("awb required");
    set({ loading: true, error: null });

    try {
      const data = await apiFetch(`/api/shipping/xpressbees/cancel/${awb}`, {
        method: "POST",
        body: reason ? { reason } : undefined,
      });

      set({ lastCancel: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ---------------------------------------------------------------------------
  // 5) Manifest Shipments
  // ⚠️ In new flow, "forward manifest" is already done during createShipment.
  // Keep this method for bulk re-manifest / re-push use-cases if backend supports it.
  //
  // POST /api/shipping/xpressbees/manifest
  // body: { awbs: [] }
  // ---------------------------------------------------------------------------
  manifest: async ({ awbs }) => {
    if (!Array.isArray(awbs) || awbs.length === 0) {
      throw new Error("awbs[] required");
    }
    set({ loading: true, error: null });

    try {
      const data = await apiFetch(`/api/shipping/xpressbees/manifest`, {
        method: "POST",
        body: { awbs },
      });

      set({ lastManifest: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },
}));
