"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings2,
} from "lucide-react";
import toast from "react-hot-toast";

import useFabricStore from "@/store/fabricStore";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export default function FabricLowStockPage() {
  const {
    lowStockFabrics,
    loading,
    formLoading,
    fetchLowStockFabrics,
    updateFabricLowStockThreshold,
    refreshFabricLowStock,
    refreshAllFabricsLowStock,
    updateAllFabricLowStockThresholds,
  } = useFabricStore();

  const [search, setSearch] = useState("");
  const [globalThreshold, setGlobalThreshold] = useState(20);
  const [thresholds, setThresholds] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [globalAction, setGlobalAction] = useState("");

  useEffect(() => {
    fetchLowStockFabrics();
  }, [fetchLowStockFabrics]);

  useEffect(() => {
    const nextThresholds = {};

    lowStockFabrics.forEach((fabric) => {
      nextThresholds[fabric._id] = safeNumber(
        fabric.lowStockThreshold,
        20
      );
    });

    setThresholds(nextThresholds);
  }, [lowStockFabrics]);

  const filteredFabrics = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return lowStockFabrics;

    return lowStockFabrics.filter((fabric) => {
      return [
        fabric.name,
        fabric.code,
        fabric.category,
        fabric.unit,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [lowStockFabrics, search]);

  const handleThresholdChange = (id, value) => {
    setThresholds((current) => ({
      ...current,
      [id]: value,
    }));
  };

  const handleSaveThreshold = async (fabric) => {
    const threshold = Number(thresholds[fabric._id]);

    if (!Number.isFinite(threshold) || threshold < 0) {
      toast.error("Enter a valid threshold.");
      return;
    }

    try {
      setSavingId(fabric._id);

      const response = await updateFabricLowStockThreshold(
        fabric._id,
        threshold
      );

      if (!response?.success) {
        toast.error(
          response?.message || "Failed to update threshold."
        );
        return;
      }

      toast.success(
        `${fabric.code} threshold updated to ${threshold}`
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleRefreshFabric = async (fabric) => {
    try {
      setRefreshingId(fabric._id);

      const response = await refreshFabricLowStock(fabric._id);

      if (!response?.success) {
        toast.error(
          response?.message || "Failed to refresh fabric."
        );
        return;
      }

      toast.success(`${fabric.code} low-stock status refreshed`);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleRefreshAll = async () => {
    try {
      setGlobalAction("refresh");

      const response = await refreshAllFabricsLowStock();

      if (!response?.success) {
        toast.error(
          response?.message || "Failed to refresh fabrics."
        );
        return;
      }

      toast.success("All low-stock statuses refreshed");
    } finally {
      setGlobalAction("");
    }
  };

  const handleUpdateAllThresholds = async () => {
    const threshold = Number(globalThreshold);

    if (!Number.isFinite(threshold) || threshold < 0) {
      toast.error("Enter a valid global threshold.");
      return;
    }

    const confirmed = window.confirm(
      `Set the low-stock threshold to ${threshold} for every fabric?`
    );

    if (!confirmed) return;

    try {
      setGlobalAction("threshold");

      const response =
        await updateAllFabricLowStockThresholds(threshold);

      if (!response?.success) {
        toast.error(
          response?.message ||
            "Failed to update global threshold."
        );
        return;
      }

      toast.success(
        `Threshold updated to ${threshold} for all fabrics`
      );
    } finally {
      setGlobalAction("");
    }
  };

  const pageLoading = loading && !lowStockFabrics.length;

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                <AlertTriangle size={15} />
                Inventory Alert
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                Low Stock Fabrics
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                Review fabrics that have reached or fallen below
                their configured stock threshold.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={
                formLoading || globalAction === "refresh"
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={cx(
                  globalAction === "refresh" && "animate-spin"
                )}
              />

              {globalAction === "refresh"
                ? "Refreshing..."
                : "Refresh All"}
            </button>
          </div>
        </section>

        {/* Controls */}
        <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by fabric name, code or category..."
              className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] pl-10 pr-4 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black/30 focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Settings2
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={globalThreshold}
                onChange={(event) =>
                  setGlobalThreshold(event.target.value)
                }
                placeholder="Global threshold"
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] pl-9 pr-3 text-sm outline-none transition focus:border-black/30 focus:bg-white sm:w-44"
              />
            </div>

            <button
              type="button"
              onClick={handleUpdateAllThresholds}
              disabled={
                formLoading || globalAction === "threshold"
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black bg-white px-4 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {globalAction === "threshold" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}

              Update All
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Low Stock"
            value={lowStockFabrics.length}
          />

          <SummaryCard
            label="Visible Results"
            value={filteredFabrics.length}
          />

          <SummaryCard
            label="Default Threshold"
            value={globalThreshold || 0}
            className="col-span-2 sm:col-span-1"
          />
        </section>

        {/* Content */}
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {pageLoading ? (
            <LoadingState />
          ) : filteredFabrics.length === 0 ? (
            <EmptyState hasSearch={Boolean(search.trim())} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[950px] border-collapse">
                  <thead>
                    <tr className="border-b border-black/10 bg-[#fafafa] text-left">
                      <TableHeading>Fabric</TableHeading>
                      <TableHeading>Category</TableHeading>
                      <TableHeading>Current Stock</TableHeading>
                      <TableHeading>Threshold</TableHeading>
                      <TableHeading>Status</TableHeading>
                      <TableHeading align="right">
                        Actions
                      </TableHeading>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredFabrics.map((fabric) => (
                      <FabricTableRow
                        key={fabric._id}
                        fabric={fabric}
                        threshold={thresholds[fabric._id]}
                        onThresholdChange={
                          handleThresholdChange
                        }
                        onSave={handleSaveThreshold}
                        onRefresh={handleRefreshFabric}
                        saving={
                          savingId === fabric._id
                        }
                        refreshing={
                          refreshingId === fabric._id
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-black/10 lg:hidden">
                {filteredFabrics.map((fabric) => (
                  <FabricMobileCard
                    key={fabric._id}
                    fabric={fabric}
                    threshold={thresholds[fabric._id]}
                    onThresholdChange={handleThresholdChange}
                    onSave={handleSaveThreshold}
                    onRefresh={handleRefreshFabric}
                    saving={savingId === fabric._id}
                    refreshing={refreshingId === fabric._id}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-black/10 bg-white p-4 shadow-sm",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-black/45">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
        {value}
      </p>
    </div>
  );
}

function TableHeading({ children, align = "left" }) {
  return (
    <th
      className={cx(
        "px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-black/45",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

function FabricTableRow({
  fabric,
  threshold,
  onThresholdChange,
  onSave,
  onRefresh,
  saving,
  refreshing,
}) {
  const currentStock = safeNumber(fabric.currentStock);
  const lowStockThreshold = safeNumber(
    fabric.lowStockThreshold,
    20
  );

  return (
    <tr className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015]">
      <td className="px-5 py-4">
        <FabricIdentity fabric={fabric} />
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-medium text-black">
          {fabric.category || "—"}
        </p>

        <p className="mt-1 text-xs uppercase text-black/40">
          {fabric.unit || "—"}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-red-600">
          {currentStock} {fabric.unit || ""}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold ?? lowStockThreshold}
            onChange={(event) =>
              onThresholdChange(
                fabric._id,
                event.target.value
              )
            }
            className="h-9 w-24 rounded-lg border border-black/10 bg-[#fafafa] px-3 text-sm outline-none focus:border-black/30"
          />

          <span className="text-xs text-black/40">
            {fabric.unit}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <LowStockBadge />
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <ActionButton
            onClick={() => onRefresh(fabric)}
            loading={refreshing}
            icon={RefreshCw}
            label="Refresh"
          />

          <ActionButton
            onClick={() => onSave(fabric)}
            loading={saving}
            icon={Save}
            label="Save"
            primary
          />
        </div>
      </td>
    </tr>
  );
}

function FabricMobileCard({
  fabric,
  threshold,
  onThresholdChange,
  onSave,
  onRefresh,
  saving,
  refreshing,
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <FabricIdentity fabric={fabric} />
        <LowStockBadge />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoBox
          label="Current Stock"
          value={`${safeNumber(fabric.currentStock)} ${
            fabric.unit || ""
          }`}
          danger
        />

        <InfoBox
          label="Category"
          value={fabric.category || "—"}
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-black/45">
          Low-stock threshold
        </label>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={
              threshold ??
              safeNumber(fabric.lowStockThreshold, 20)
            }
            onChange={(event) =>
              onThresholdChange(
                fabric._id,
                event.target.value
              )
            }
            className="h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none focus:border-black/30"
          />

          <span className="text-xs text-black/45">
            {fabric.unit}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton
          onClick={() => onRefresh(fabric)}
          loading={refreshing}
          icon={RefreshCw}
          label="Refresh"
          full
        />

        <ActionButton
          onClick={() => onSave(fabric)}
          loading={saving}
          icon={Save}
          label="Save"
          primary
          full
        />
      </div>
    </article>
  );
}

function FabricIdentity({ fabric }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#f2f2f2]">
        {fabric.imageLink ? (
          <img
            src={fabric.imageLink}
            alt={fabric.name || "Fabric"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-black/35">
            FAB
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">
          {fabric.name || "Unnamed Fabric"}
        </p>

        <p className="mt-1 text-xs font-medium text-black/45">
          {fabric.code || "—"}
        </p>
      </div>
    </div>
  );
}

function LowStockBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      <AlertTriangle size={12} />
      Low stock
    </span>
  );
}

function ActionButton({
  onClick,
  loading,
  icon: Icon,
  label,
  primary = false,
  full = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        full && "h-11 w-full rounded-xl",
        primary
          ? "bg-black text-white hover:bg-black/80"
          : "border border-black/10 bg-white text-black hover:bg-black/5"
      )}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Icon size={14} />
      )}

      {loading ? "Please wait" : label}
    </button>
  );
}

function InfoBox({ label, value, danger = false }) {
  return (
    <div className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-black/40">
        {label}
      </p>

      <p
        className={cx(
          "mt-1.5 truncate text-sm font-semibold",
          danger ? "text-red-600" : "text-black"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[340px] items-center justify-center">
      <div className="text-center">
        <Loader2
          size={28}
          className="mx-auto animate-spin text-black"
        />

        <p className="mt-3 text-sm text-black/50">
          Loading low-stock fabrics...
        </p>
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="flex min-h-[340px] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
          <Check size={24} />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-black">
          {hasSearch
            ? "No matching fabrics"
            : "No low-stock fabrics"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-black/50">
          {hasSearch
            ? "Try searching with another fabric name, code or category."
            : "All active fabrics currently have sufficient stock."}
        </p>
      </div>
    </div>
  );
}