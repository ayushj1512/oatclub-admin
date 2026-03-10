"use client";

import React, { useMemo, useState } from "react";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const safe = (v) => String(v ?? "").trim();

export default function PackedTrackingSyncPanel({
  orders = [],
  selectedIds = {},
  disabled = false,
  onAfterSync,
}) {
  const syncTracking = useShiprocketStore((s) => s.syncTracking);

  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    done: 0,
    success: 0,
    failed: 0,
  });
  const [lastResult, setLastResult] = useState(null);

  const selectedOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.filter((o) => selectedIds?.[String(o?._id)]);
  }, [orders, selectedIds]);

  const runSync = async (list, mode = "selected") => {
    const rows = Array.isArray(list) ? list.filter(Boolean) : [];

    if (!rows.length) {
      alert(
        mode === "selected"
          ? "Please select at least one order."
          : "No visible orders found."
      );
      return;
    }

    const confirmMsg =
      mode === "selected"
        ? `Sync tracking for ${rows.length} selected order(s)?`
        : `Sync tracking for all ${rows.length} visible order(s)?`;

    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    setSyncing(true);
    setLastResult(null);
    setProgress({
      total: rows.length,
      done: 0,
      success: 0,
      failed: 0,
    });

    const failedOrders = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < rows.length; i += 1) {
        const order = rows[i];
        const orderId = safe(order?._id);
        const orderNumber = safe(order?.orderNumber);

        try {
          if (!orderId && !orderNumber) {
            throw new Error("Missing order id/order number");
          }

          // ✅ existing store method
          // backend should save courier/AWB/tracking fields in order
          await syncTracking(orderId ? { orderId } : { orderNumber });

          successCount += 1;
        } catch (err) {
          failedCount += 1;
          failedOrders.push({
            orderId,
            orderNumber,
            message: err?.message || "Tracking sync failed",
          });
        }

        setProgress({
          total: rows.length,
          done: i + 1,
          success: successCount,
          failed: failedCount,
        });

        // small gap so API pe load kam rahe
        if (i < rows.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      const summary = {
        mode,
        total: rows.length,
        success: successCount,
        failed: failedCount,
        failedOrders,
      };

      setLastResult(summary);

      if (typeof onAfterSync === "function") {
        await onAfterSync(summary);
      }

      if (failedCount > 0) {
        alert(
          `${successCount} tracking sync ho gaye.\n${failedCount} fail hue.`
        );
      } else {
        alert(`All ${successCount} order tracking synced successfully.`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const Btn = ({ children, onClick, variant = "ghost", isDisabled = false }) => {
    const base =
      "rounded-xl px-3 py-2 text-xs font-extrabold transition active:scale-[0.99]";
    const styles = {
      ghost: isDisabled
        ? "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-500"
        : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
      primary: isDisabled
        ? "cursor-not-allowed bg-blue-300 text-white"
        : "bg-blue-600 text-white hover:bg-blue-700",
      success: isDisabled
        ? "cursor-not-allowed bg-emerald-300 text-white"
        : "bg-emerald-600 text-white hover:bg-emerald-700",
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={`${base} ${styles[variant]}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-extrabold text-zinc-900">
            Tracking Sync
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Shiprocket se courier + AWB fetch karke order me sync karega.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Btn
            variant="primary"
            isDisabled={disabled || syncing || selectedOrders.length === 0}
            onClick={() => runSync(selectedOrders, "selected")}
          >
            {syncing
              ? "Syncing..."
              : `Sync Selected Tracking (${selectedOrders.length})`}
          </Btn>

          <Btn
            variant="success"
            isDisabled={disabled || syncing || orders.length === 0}
            onClick={() => runSync(orders, "all")}
          >
            {syncing ? "Syncing..." : `Sync All Visible Tracking (${orders.length})`}
          </Btn>
        </div>
      </div>

      {(syncing || progress.total > 0) && (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-700">
            <span className="rounded-full bg-white px-2 py-1 border border-zinc-200">
              Total: {progress.total}
            </span>
            <span className="rounded-full bg-white px-2 py-1 border border-zinc-200">
              Done: {progress.done}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 border border-emerald-200 text-emerald-700">
              Success: {progress.success}
            </span>
            <span className="rounded-full bg-red-50 px-2 py-1 border border-red-200 text-red-700">
              Failed: {progress.failed}
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${
                  progress.total > 0
                    ? Math.min(100, (progress.done / progress.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {lastResult?.failed > 0 ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="text-sm font-bold text-red-800">
            Failed Orders ({lastResult.failed})
          </div>

          <div className="mt-2 max-h-44 overflow-auto space-y-2">
            {lastResult.failedOrders.map((row, idx) => (
              <div
                key={`${row.orderId || row.orderNumber || "row"}-${idx}`}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700"
              >
                <div className="font-semibold">
                  {row.orderNumber || row.orderId || "Unknown Order"}
                </div>
                <div>{row.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}