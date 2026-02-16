"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const API = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).trim();

const apiBase = API ? API.replace(/\/+$/, "") : "";

/**
 * OrderTrackingCard
 * ✅ Manual edit/save tracking (PATCH /api/orders/:id/tracking)
 * ✅ Sync from Shiprocket (via zustand store)
 *    - by orderId (preferred)
 *    - fallback by orderNumber
 *
 * NOTE:
 * - Your Shiprocket booking bug was backend casting on shipment.xpressbees.
 * - This UI just calls sync endpoints; it’ll work once backend saves shiprocket ids/awb.
 */
export default function OrderTrackingCard({
  orderId,
  orderNumber,
  shipment,
  trackingDetails,
  onRefresh,
}) {
  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ store (sync)
  const { syncTracking, syncLoading, syncError, clearSyncError } =
    useShiprocketStore();

  /* ------------------------------------------------------------
     Hydrate inputs from order
  ------------------------------------------------------------ */
  useEffect(() => {
    const awb =
      shipment?.shiprocket?.awb ||
      trackingDetails?.trackingId ||
      shipment?.awb ||
      "";

    const courier =
      shipment?.shiprocket?.courierName ||
      trackingDetails?.courierName ||
      shipment?.courierName ||
      "";

    const url =
      shipment?.shiprocket?.trackingUrl ||
      trackingDetails?.trackingUrl ||
      shipment?.trackingUrl ||
      "";

    setTrackingId(String(awb || ""));
    setCourierName(String(courier || ""));
    setTrackingUrl(String(url || ""));
  }, [shipment, trackingDetails]);

  /* ------------------------------------------------------------
     Show sync errors nicely (one place)
  ------------------------------------------------------------ */
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

  /* ------------------------------------------------------------
     Save manual tracking to DB
  ------------------------------------------------------------ */
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
          // backend accepts trackingId OR awb (your controller supports both)
          trackingId: trackingId?.trim(),
          awb: trackingId?.trim(), // ✅ keep compatible with older backend
          courierName: courierName?.trim(),
          trackingUrl: trackingUrl?.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.message || "Failed to update tracking");
        return;
      }

      toast.success("Tracking updated ✅");
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update tracking");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------
     Apply sync response to UI
     (handles different backend response shapes)
  ------------------------------------------------------------ */
  const applySyncResponse = (data) => {
    const d = data?.data ?? data; // sometimes backend wraps payload in {data}
    const awb =
      d?.trackingId ??
      d?.awb ??
      d?.awb_code ??
      d?.shiprocket?.awb ??
      d?.shipment?.shiprocket?.awb ??
      "";

    const courier =
      d?.courierName ??
      d?.courier ??
      d?.courier_name ??
      d?.shiprocket?.courierName ??
      d?.shipment?.shiprocket?.courierName ??
      "";

    const url =
      d?.trackingUrl ??
      d?.tracking_url ??
      d?.trackingLink ??
      d?.shiprocket?.trackingUrl ??
      d?.shipment?.shiprocket?.trackingUrl ??
      "";

    if (awb) setTrackingId(String(awb));
    if (courier) setCourierName(String(courier));
    if (url) setTrackingUrl(String(url));
  };

  /* ------------------------------------------------------------
     Smart sync:
     - try orderId first
     - fallback orderNumber if orderId sync fails
  ------------------------------------------------------------ */
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
      // If orderId sync fails and we have orderNumber, fallback
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

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold">Tracking</h2>
          {orderNumber ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Order: <span className="font-semibold">{orderNumber}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* ✅ Smart Sync */}
          <button
            onClick={syncFromShiprocket}
            disabled={!canSync}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            title="Sync from Shiprocket (OrderId first, then OrderNumber fallback)"
          >
            {syncLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Syncing...
              </>
            ) : (
              <>
                <RefreshCcw size={16} /> Sync
              </>
            )}
          </button>

          {/* ✅ Explicit Order# Sync */}
          <button
            onClick={syncOnlyByOrderNumber}
            disabled={!canSyncByNumber}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            title="Sync using Order Number"
          >
            {syncLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
              </>
            ) : (
              <>
                <Search size={16} /> By Order#
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Tracking ID / AWB
          </label>
          <input
            className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="AWB / Tracking ID"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600">
            Courier Name
          </label>
          <input
            className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            placeholder="Delhivery / Bluedart / ..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600">
            Tracking URL
          </label>
          <input
            className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <button
        onClick={saveTracking}
        disabled={!canSave}
        className="mt-4 px-6 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 inline-flex items-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" size={16} /> Saving...
          </>
        ) : (
          "Save Tracking"
        )}
      </button>
    </div>
  );
}
