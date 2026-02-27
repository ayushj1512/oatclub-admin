// components/orders/OrderRowTracking.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, ExternalLink, Copy, Save, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const API =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "").trim();

const apiBase = API ? API.replace(/\/+$/, "") : "";

const s = (v) => (v == null ? "" : String(v));
const trim = (v) => s(v).trim();
const has = (v) => trim(v).length > 0;

const extractTracking = (payload) => {
  const d = payload?.data ?? payload ?? {};
  const awb =
    d?.trackingId ??
    d?.awb ??
    d?.awb_code ??
    d?.shipment?.shiprocket?.awb ??
    d?.shiprocket?.awb ??
    d?.order?.shipment?.shiprocket?.awb ??
    "";

  const courier =
    d?.courierName ??
    d?.courier ??
    d?.courier_name ??
    d?.shipment?.shiprocket?.courierName ??
    d?.shiprocket?.courierName ??
    d?.order?.shipment?.shiprocket?.courierName ??
    "";

  const url =
    d?.trackingUrl ??
    d?.tracking_url ??
    d?.trackingLink ??
    d?.shipment?.shiprocket?.trackingUrl ??
    d?.shiprocket?.trackingUrl ??
    d?.order?.shipment?.shiprocket?.trackingUrl ??
    "";

  return { awb: trim(awb), courier: trim(courier), url: trim(url), message: s(d?.message || payload?.message || "") };
};

export default function OrderRowTracking({
  orderId,
  orderNumber,
  shipment,
  trackingDetails,
  onUpdated,
  onRefresh,
}) {
  const [awb, setAwb] = useState("");
  const [courier, setCourier] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    syncTracking,
    syncLoading,
    syncError,
    syncErrorCode,
    clearSyncError,
  } = useShiprocketStore();

  // hydrate (shiprocket-first)
  useEffect(() => {
    setAwb(
      trim(shipment?.shiprocket?.awb || trackingDetails?.trackingId || shipment?.awb || "")
    );
    setCourier(
      trim(
        shipment?.shiprocket?.courierName ||
          trackingDetails?.courierName ||
          shipment?.courierName ||
          ""
      )
    );
    setUrl(
      trim(
        shipment?.shiprocket?.trackingUrl ||
          trackingDetails?.trackingUrl ||
          shipment?.trackingUrl ||
          ""
      )
    );
  }, [shipment, trackingDetails]);

  // show store errors once
  useEffect(() => {
    if (!syncError) return;
    toast.error(syncError, { duration: syncErrorCode === "SHIPROCKET_UPSTREAM_DOWN" ? 5000 : 3000 });
    clearSyncError?.();
  }, [syncError, syncErrorCode, clearSyncError]);

  const canSave = useMemo(() => Boolean(orderId) && !saving, [orderId, saving]);
  const canSync = useMemo(
    () => (Boolean(orderId) || Boolean(orderNumber)) && !syncLoading,
    [orderId, orderNumber, syncLoading]
  );

  const copy = useCallback(async (text) => {
    const t = trim(text);
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Copied ✅");
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  const open = useCallback(() => {
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackingId: trim(awb),
          awb: trim(awb), // backward compat
          courierName: trim(courier),
          trackingUrl: trim(url),
          provider: "shiprocket",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update tracking");

      const updated = data?.order || data?.data?.order || data?.data || data;
      toast.success("Saved ✅");
      onUpdated?.(updated);
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update tracking");
    } finally {
      setSaving(false);
    }
  }, [orderId, awb, courier, url, onUpdated, onRefresh]);

  const sync = useCallback(async () => {
    if (!orderId && !orderNumber) return toast.error("orderId/orderNumber missing");
    try {
      const data = orderId ? await syncTracking({ orderId }) : await syncTracking({ orderNumber });
      const t = extractTracking(data);

      if (t.awb) setAwb(t.awb);
      if (t.courier) setCourier(t.courier);
      if (t.url) setUrl(t.url);

      if (t.awb || t.courier || t.url) toast.success("Synced ✅");
      else toast(t.message || "Tracking not available yet", { icon: "ℹ️" });

      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Shiprocket sync failed");
    }
  }, [orderId, orderNumber, syncTracking, onRefresh]);

  const showUpstream = syncErrorCode === "SHIPROCKET_UPSTREAM_DOWN";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Tracking</h3>
          {orderNumber ? (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Order: <span className="font-semibold">{orderNumber}</span>
            </p>
          ) : null}
          <p className="text-[11px] text-gray-400 mt-1">Provider: Shiprocket</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sync}
            disabled={!canSync}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
            type="button"
            title="Sync carrier + AWB from Shiprocket"
          >
            {syncLoading ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Syncing
              </>
            ) : (
              <>
                <RefreshCcw size={14} /> Sync
              </>
            )}
          </button>

          <button
            onClick={open}
            disabled={!has(url)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
            type="button"
            title="Open tracking link"
          >
            <ExternalLink size={14} /> Open
          </button>
        </div>
      </div>

      {showUpstream ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Info size={14} className="mt-0.5" />
          <span className="leading-5">
            Shiprocket temporary issue (upstream). Retry after 2 minutes.
          </span>
        </div>
      ) : null}

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <Field
          label="AWB"
          value={awb}
          onChange={setAwb}
          placeholder="AWB / Tracking ID"
          onCopy={() => copy(awb)}
          canCopy={has(awb)}
        />
        <Field
          label="Carrier"
          value={courier}
          onChange={setCourier}
          placeholder="Delhivery / Bluedart / ..."
        />
        <Field
          label="Tracking URL"
          value={url}
          onChange={setUrl}
          placeholder="https://..."
          onCopy={() => copy(url)}
          canCopy={has(url)}
        />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={saveTracking}
          disabled={!canSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60"
          type="button"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Saving
            </>
          ) : (
            <>
              <Save size={14} /> Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, onCopy, canCopy }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600">{label}</label>
      <div className="mt-2 flex gap-2">
        <input
          className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {onCopy ? (
          <button
            onClick={onCopy}
            disabled={!canCopy}
            className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            type="button"
            title="Copy"
          >
            <Copy size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}