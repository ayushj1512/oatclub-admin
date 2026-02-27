"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, RefreshCcw, Save, ExternalLink, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const API =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "").trim();

const apiBase = API ? API.replace(/\/+$/, "") : "";

const s = (v) => (v == null ? "" : String(v));
const trim = (v) => s(v).trim();
const isNonEmpty = (v) => trim(v).length > 0;

const extractTracking = (payload) => {
  const d = payload?.data ?? payload ?? {};

  const awb =
    d?.trackingId ??
    d?.awb ??
    d?.awb_code ??
    d?.shipment?.shiprocket?.awb ??
    d?.shiprocket?.awb ??
    "";

  const courier =
    d?.courierName ??
    d?.courier ??
    d?.courier_name ??
    d?.shipment?.shiprocket?.courierName ??
    d?.shiprocket?.courierName ??
    "";

  const url =
    d?.trackingUrl ??
    d?.tracking_url ??
    d?.trackingLink ??
    d?.shipment?.shiprocket?.trackingUrl ??
    d?.shiprocket?.trackingUrl ??
    "";

  return { awb: trim(awb), courier: trim(courier), url: trim(url) };
};

/**
 * OrderTrackingCard
 * ✅ Manual save: PATCH /api/orders/:id/tracking
 * ✅ Shiprocket sync: GET /api/orders/:id/tracking/sync OR /api/orders/tracking/sync?orderNumber=...
 * ✅ Better UX for SHIPROCKET_UPSTREAM_DOWN (temporary)
 */
export default function OrderTrackingCard({
  orderId,
  orderNumber,
  shipment,
  trackingDetails,
  onRefresh,
}) {
  const [awb, setAwb] = useState("");
  const [courier, setCourier] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const {
    syncTracking,
    syncLoading,
    syncError,
    syncErrorCode,
    clearSyncError,
  } = useShiprocketStore();

  // hydrate from order
  useEffect(() => {
    const nextAwb =
      shipment?.shiprocket?.awb ||
      trackingDetails?.trackingId ||
      shipment?.awb ||
      "";

    const nextCourier =
      shipment?.shiprocket?.courierName ||
      trackingDetails?.courierName ||
      shipment?.courierName ||
      "";

    const nextUrl =
      shipment?.shiprocket?.trackingUrl ||
      trackingDetails?.trackingUrl ||
      shipment?.trackingUrl ||
      "";

    setAwb(trim(nextAwb));
    setCourier(trim(nextCourier));
    setUrl(trim(nextUrl));
  }, [shipment, trackingDetails]);

  // store errors (single place)
  useEffect(() => {
    if (!syncError) return;

    if (syncErrorCode === "SHIPROCKET_UPSTREAM_DOWN") {
      toast.error(syncError, { duration: 5000 });
    } else {
      toast.error(syncError);
    }

    clearSyncError?.();
  }, [syncError, syncErrorCode, clearSyncError]);

  const canSave = useMemo(
    () => Boolean(orderId) && !saving,
    [orderId, saving]
  );

  const canSync = useMemo(
    () => (Boolean(orderId) || Boolean(orderNumber)) && !syncLoading,
    [orderId, orderNumber, syncLoading]
  );

  const openTracking = useCallback(() => {
    const link = trim(url);
    if (!link) return toast.error("Tracking URL missing");
    window.open(link, "_blank", "noopener,noreferrer");
  }, [url]);

  const saveTracking = useCallback(async () => {
    if (!orderId) return;

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/orders/${orderId}/tracking`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          trackingId: trim(awb),
          awb: trim(awb), // backward compatible
          courierName: trim(courier),
          trackingUrl: trim(url),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update tracking");

      toast.success("Tracking saved ✅");
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update tracking");
    } finally {
      setSaving(false);
    }
  }, [orderId, awb, courier, url, onRefresh]);

  const syncFromShiprocket = useCallback(async () => {
    if (!orderId && !orderNumber) return toast.error("orderId/orderNumber missing");

    try {
      const data = orderId
        ? await syncTracking({ orderId })
        : await syncTracking({ orderNumber });

      const t = extractTracking(data);

      // if backend says "not available yet", still refresh and inform
      const msg = String(data?.message || "");
      const looksEmpty = !isNonEmpty(t.awb) && !isNonEmpty(t.courier) && !isNonEmpty(t.url);

      if (!looksEmpty) {
        if (t.awb) setAwb(t.awb);
        if (t.courier) setCourier(t.courier);
        if (t.url) setUrl(t.url);
        toast.success("Synced from Shiprocket ✅");
      } else if (msg) {
        toast(msg, { icon: "ℹ️" });
      } else {
        toast("Tracking not available yet (AWB not generated)", { icon: "ℹ️" });
      }

      setLastSyncAt(Date.now());
      await onRefresh?.();
    } catch (e) {
      // store already sets a nicer message, but keep fallback here
      toast.error(e?.message || "Shiprocket sync failed");
    }
  }, [orderId, orderNumber, syncTracking, onRefresh]);

  return (
    <div className="bg-white/90 backdrop-blur border border-gray-100 rounded-2xl shadow-sm p-5">
      <Header
        orderNumber={orderNumber}
        onSync={syncFromShiprocket}
        onOpen={openTracking}
        canSync={canSync}
        canOpen={isNonEmpty(url)}
        syncLoading={syncLoading}
      />

      {syncErrorCode === "SHIPROCKET_UPSTREAM_DOWN" ? (
        <Notice text="Shiprocket is temporarily down (upstream issue). Retry after 2 minutes." />
      ) : null}

      {lastSyncAt ? (
        <p className="mt-3 text-[11px] text-gray-500">
          Last sync: {new Date(lastSyncAt).toLocaleString()}
        </p>
      ) : null}

      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <Field label="AWB / Tracking ID" value={awb} onChange={setAwb} placeholder="AWB / Tracking ID" />
        <Field label="Carrier / Courier" value={courier} onChange={setCourier} placeholder="Delhivery / Bluedart / ..." />
        <Field label="Tracking URL" value={url} onChange={setUrl} placeholder="https://..." />
      </div>

      <button
        onClick={saveTracking}
        disabled={!canSave}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" size={16} /> Saving
          </>
        ) : (
          <>
            <Save size={16} /> Save
          </>
        )}
      </button>
    </div>
  );
}

function Header({ orderNumber, onSync, onOpen, canSync, canOpen, syncLoading }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">Tracking</h2>
        {orderNumber ? (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Order: <span className="font-semibold">{orderNumber}</span>
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSync}
          disabled={!canSync}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          title="Sync carrier + AWB from Shiprocket"
        >
          {syncLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Syncing
            </>
          ) : (
            <>
              <RefreshCcw size={16} /> Sync
            </>
          )}
        </button>

        <button
          onClick={onOpen}
          disabled={!canOpen}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          title="Open tracking"
        >
          <ExternalLink size={16} /> Open
        </button>
      </div>
    </div>
  );
}

function Notice({ text }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <Info size={14} className="mt-0.5" />
      <span className="leading-5">{text}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        className="mt-2 w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}