"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, RefreshCcw, Save, ExternalLink, Info, Copy } from "lucide-react";
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

  return {
    awb: trim(awb),
    courier: trim(courier),
    url: trim(url),
  };
};

const copyText = async (text, label = "Copied") => {
  try {
    if (!text) return;
    await navigator.clipboard.writeText(String(text));
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
};

export default function OrderSearchTrackingCard({
  orderId,
  orderNumber,
  shipment,
  trackingDetails,
  onRefresh,
  compact = false,
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

  const canOpen = useMemo(() => isNonEmpty(url), [url]);

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
          awb: trim(awb),
          courierName: trim(courier),
          trackingUrl: trim(url),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update tracking");
      }

      toast.success("Tracking saved ✅");
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update tracking");
    } finally {
      setSaving(false);
    }
  }, [orderId, awb, courier, url, onRefresh]);

  const syncFromShiprocket = useCallback(async () => {
    if (!orderId && !orderNumber) {
      return toast.error("orderId/orderNumber missing");
    }

    try {
      const data = orderId
        ? await syncTracking({ orderId })
        : await syncTracking({ orderNumber });

      const t = extractTracking(data);
      const msg = String(data?.message || "");
      const looksEmpty =
        !isNonEmpty(t.awb) && !isNonEmpty(t.courier) && !isNonEmpty(t.url);

      if (!looksEmpty) {
        setAwb(t.awb || "");
        setCourier(t.courier || "");
        setUrl(t.url || "");
        toast.success("Synced from Shiprocket ✅");
      } else if (msg) {
        toast(msg, { icon: "ℹ️" });
      } else {
        toast("Tracking not available yet (AWB not generated)", { icon: "ℹ️" });
      }

      setLastSyncAt(Date.now());
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Shiprocket sync failed");
    }
  }, [orderId, orderNumber, syncTracking, onRefresh]);

  return (
    <div
      className={`bg-white shadow-sm ring-1 ring-zinc-200/60 ${
        compact ? "p-4" : "rounded-2xl p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">Tracking</h3>
          {orderNumber ? (
            <p className="mt-1 text-xs text-zinc-500 truncate">
              Order: <span className="font-semibold">{orderNumber}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={syncFromShiprocket}
            disabled={!canSync}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            title="Sync carrier + AWB from Shiprocket"
          >
            {syncLoading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Syncing
              </>
            ) : (
              <>
                <RefreshCcw size={14} />
                Sync
              </>
            )}
          </button>

          <button
            onClick={openTracking}
            disabled={!canOpen}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            title="Open tracking"
          >
            <ExternalLink size={14} />
            Open
          </button>
        </div>
      </div>

      {syncErrorCode === "SHIPROCKET_UPSTREAM_DOWN" ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Info size={14} className="mt-0.5" />
          <span className="leading-5">
            Shiprocket is temporarily down. Retry after 2 minutes.
          </span>
        </div>
      ) : null}

      {lastSyncAt ? (
        <p className="mt-3 text-[11px] text-zinc-500">
          Last sync: {new Date(lastSyncAt).toLocaleString()}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        <Field
          label="AWB / Tracking ID"
          value={awb}
          onChange={setAwb}
          placeholder="AWB / Tracking ID"
          right={
            isNonEmpty(awb) ? (
              <button
                onClick={() => copyText(awb, "AWB copied")}
                className="text-zinc-500 hover:text-zinc-900"
                type="button"
              >
                <Copy size={14} />
              </button>
            ) : null
          }
        />

        <Field
          label="Carrier / Courier"
          value={courier}
          onChange={setCourier}
          placeholder="Delhivery / Bluedart / Xpressbees"
        />

        <Field
          label="Tracking URL"
          value={url}
          onChange={setUrl}
          placeholder="https://..."
        />
      </div>

      <button
        onClick={saveTracking}
        disabled={!canSave}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Saving
          </>
        ) : (
          <>
            <Save size={16} />
            Save
          </>
        )}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, right = null }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <input
          className="w-full bg-transparent text-sm outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {right}
      </div>
    </div>
  );
}