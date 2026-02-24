// components/orders/OrderRowTracking.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Search, ExternalLink, Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const API = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).trim();

const apiBase = API ? API.replace(/\/+$/, "") : "";

const safe = (v) => (v == null ? "" : String(v));

export default function OrderRowTracking({
  orderId,
  orderNumber,
  shipment,
  trackingDetails,
  onUpdated, // call parent with updated order (optional)
  onRefresh, // parent can refetch list/order (optional)
}) {
  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { syncTracking, syncLoading, syncError, clearSyncError } = useShiprocketStore();

  // hydrate from order
  useEffect(() => {
    const awb =
      shipment?.shiprocket?.awb ||
      shipment?.xpressbees?.awb ||
      trackingDetails?.trackingId ||
      shipment?.awb ||
      "";

    const courier =
      shipment?.shiprocket?.courierName ||
      shipment?.xpressbees?.courierName ||
      trackingDetails?.courierName ||
      shipment?.courierName ||
      "";

    const url =
      shipment?.shiprocket?.trackingUrl ||
      shipment?.xpressbees?.trackingUrl ||
      trackingDetails?.trackingUrl ||
      shipment?.trackingUrl ||
      "";

    setTrackingId(String(awb || ""));
    setCourierName(String(courier || ""));
    setTrackingUrl(String(url || ""));
  }, [shipment, trackingDetails]);

  useEffect(() => {
    if (!syncError) return;
    toast.error(syncError);
    clearSyncError?.();
  }, [syncError, clearSyncError]);

  const canSave = useMemo(() => Boolean(orderId) && !saving, [orderId, saving]);
  const canSync = useMemo(
    () => (Boolean(orderId) || Boolean(orderNumber)) && !syncLoading,
    [orderId, orderNumber, syncLoading]
  );
  const canSyncByNumber = useMemo(
    () => Boolean(orderNumber) && !syncLoading,
    [orderNumber, syncLoading]
  );

  const copyToClipboard = async (text) => {
    const t = safe(text).trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Copied ✅");
    } catch {
      toast.error("Copy failed");
    }
  };

  // save manual tracking to DB
  const saveTracking = async () => {
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
          // keep compatible with older backend
          trackingId: trackingId?.trim(),
          awb: trackingId?.trim(),
          courierName: courierName?.trim(),
          trackingUrl: trackingUrl?.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.message || "Failed to update tracking");
        return;
      }

      const updated = data?.order || data?.data?.order || data?.data || data;
      toast.success("Tracking updated ✅");

      onUpdated?.(updated);
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update tracking");
    } finally {
      setSaving(false);
    }
  };

  const applySyncResponse = (data) => {
    const d = data?.data ?? data;

    const awb =
      d?.trackingId ??
      d?.awb ??
      d?.awb_code ??
      d?.shiprocket?.awb ??
      d?.shipment?.shiprocket?.awb ??
      d?.shipment?.xpressbees?.awb ??
      "";

    const courier =
      d?.courierName ??
      d?.courier ??
      d?.courier_name ??
      d?.shiprocket?.courierName ??
      d?.shipment?.shiprocket?.courierName ??
      d?.shipment?.xpressbees?.courierName ??
      "";

    const url =
      d?.trackingUrl ??
      d?.tracking_url ??
      d?.trackingLink ??
      d?.shiprocket?.trackingUrl ??
      d?.shipment?.shiprocket?.trackingUrl ??
      d?.shipment?.xpressbees?.trackingUrl ??
      "";

    if (awb) setTrackingId(String(awb));
    if (courier) setCourierName(String(courier));
    if (url) setTrackingUrl(String(url));
  };

  // smart sync: try orderId then fallback orderNumber
  const syncFromShiprocket = async () => {
    try {
      if (orderId) {
        const data = await syncTracking({ orderId });
        applySyncResponse(data);
        toast.success("Synced from Shiprocket ✅");
        await onRefresh?.();
        return;
      }
    } catch (e) {
      if (!orderNumber) {
        toast.error(e?.message || "Shiprocket sync failed");
        return;
      }
    }

    if (!orderNumber) return toast.error("Order number missing for sync");

    try {
      const data = await syncTracking({ orderNumber });
      applySyncResponse(data);
      toast.success("Synced from Shiprocket ✅");
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Shiprocket sync failed");
    }
  };

  const syncOnlyByOrderNumber = async () => {
    if (!orderNumber) return toast.error("Order number missing for sync");
    try {
      const data = await syncTracking({ orderNumber });
      applySyncResponse(data);
      toast.success("Synced from Shiprocket ✅");
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Shiprocket sync failed");
    }
  };

  const hasAny =
    safe(trackingId).trim() || safe(courierName).trim() || safe(trackingUrl).trim();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Tracking</h3>
          {orderNumber ? (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Order: <span className="font-semibold">{orderNumber}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={syncFromShiprocket}
            disabled={!canSync}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
            title="Sync from Shiprocket (OrderId first, then OrderNumber fallback)"
            type="button"
          >
            {syncLoading ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Syncing...
              </>
            ) : (
              <>
                <RefreshCcw size={14} /> Sync
              </>
            )}
          </button>

          <button
            onClick={syncOnlyByOrderNumber}
            disabled={!canSyncByNumber}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
            title="Sync using Order Number"
            type="button"
          >
            {syncLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <>
                <Search size={14} /> By Order#
              </>
            )}
          </button>

          {trackingUrl?.trim() ? (
            <a
              href={trackingUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90"
              type="button"
              title="Open tracking link"
            >
              <ExternalLink size={14} /> Open
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-600">Tracking ID / AWB</label>
          <div className="mt-2 flex gap-2">
            <input
              className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="AWB / Tracking ID"
            />
            <button
              onClick={() => copyToClipboard(trackingId)}
              disabled={!safe(trackingId).trim()}
              className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              title="Copy AWB"
              type="button"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-600">Courier Name</label>
          <input
            className="mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            placeholder="Delhivery / Bluedart / ..."
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-600">Tracking URL</label>
          <div className="mt-2 flex gap-2">
            <input
              className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
            />
            <button
              onClick={() => copyToClipboard(trackingUrl)}
              disabled={!safe(trackingUrl).trim()}
              className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              title="Copy URL"
              type="button"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500">
          {hasAny ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} /> Tracking fields ready
            </span>
          ) : (
            "Add AWB / courier / link to start tracking."
          )}
        </div>

        <button
          onClick={saveTracking}
          disabled={!canSave}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-60 inline-flex items-center gap-2"
          type="button"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Saving...
            </>
          ) : (
            "Save Tracking"
          )}
        </button>
      </div>
    </div>
  );
}