"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

import useFabricStore from "@/store/fabricStore";

export default function FabricThresholdSetter({
  fabric,
  compact = false,
}) {
  const {
    formLoading,
    updateFabricLowStockThreshold,
  } = useFabricStore();

  const [threshold, setThreshold] = useState(
    Number(fabric?.lowStockThreshold ?? 20)
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setThreshold(
      Number(fabric?.lowStockThreshold ?? 20)
    );
  }, [fabric?._id, fabric?.lowStockThreshold]);

  const handleSave = async () => {
    const value = Number(threshold);

    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid threshold value.");
      return;
    }

    try {
      setSaving(true);

      const response =
        await updateFabricLowStockThreshold(
          fabric._id,
          value
        );

      if (!response?.success) {
        toast.error(
          response?.message ||
            "Failed to update threshold."
        );
        return;
      }

      toast.success("Low-stock threshold updated.");
    } finally {
      setSaving(false);
    }
  };

  if (!fabric?._id) return null;

  const isLoading = saving || formLoading;

  const currentStock = Number(
    fabric.currentStock || 0
  );

  const isLowStock =
    fabric.isLowStock ??
    currentStock <= Number(threshold || 0);

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-neutral-200 bg-neutral-50 p-3"
          : "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={16}
              className={
                isLowStock
                  ? "text-red-500"
                  : "text-neutral-400"
              }
            />

            <h3 className="text-sm font-semibold text-neutral-950">
              Low Stock Threshold
            </h3>
          </div>

          <p className="mt-1 text-xs text-neutral-500">
            Alert when stock reaches this quantity.
          </p>
        </div>

        <span
          className={
            isLowStock
              ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
              : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          }
        >
          {isLowStock ? "Low Stock" : "Healthy"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Current Stock
          </p>

          <p className="mt-1 text-lg font-semibold text-neutral-950">
            {currentStock} {fabric.unit}
          </p>
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Current Threshold
          </p>

          <p className="mt-1 text-lg font-semibold text-neutral-950">
            {fabric.lowStockThreshold ?? 20}{" "}
            {fabric.unit}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(event) =>
              setThreshold(event.target.value)
            }
            placeholder="Enter threshold"
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 pr-16 text-sm outline-none transition focus:border-neutral-400"
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
            {fabric.unit}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Save size={16} />
          )}

          Save
        </button>
      </div>
    </div>
  );
}