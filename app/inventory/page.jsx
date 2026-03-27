"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useFabricStore } from "@/store/fabricStore";

const cx = (...a) => a.filter(Boolean).join(" ");
const s = (v) => (v == null ? "" : String(v));
const n = (v) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
};

function Chip({ children, tone = "neutral" }) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-black/5 text-black/70 ring-black/10";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1",
        toneCls
      )}
    >
      {children}
    </span>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", className = "" }) {
  const base =
    variant === "primary"
      ? "bg-black text-white hover:bg-black/90"
      : "bg-black/5 text-black hover:bg-black/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-xl px-3 py-2 text-sm transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        base,
        className
      )}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "h-10 w-full rounded-xl bg-white px-3 text-sm text-black",
        "ring-1 ring-black/10 outline-none focus:ring-black/30"
      )}
    />
  );
}

function Select({ value, onChange, options = [], placeholder = "All" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "h-10 rounded-xl bg-white px-3 text-sm text-black",
        "ring-1 ring-black/10 outline-none focus:ring-black/30"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[56px_1.2fr_120px_120px_120px_120px_120px_140px] items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="h-14 w-14 rounded-xl bg-black/5" />
      <div className="space-y-2">
        <div className="h-3 w-1/2 rounded bg-black/5" />
        <div className="h-3 w-1/3 rounded bg-black/5" />
      </div>
      <div className="h-8 rounded-xl bg-black/5" />
      <div className="h-8 rounded-xl bg-black/5" />
      <div className="h-8 rounded-xl bg-black/5" />
      <div className="h-8 rounded-xl bg-black/5" />
      <div className="h-8 rounded-xl bg-black/5" />
      <div className="h-9 rounded-xl bg-black/5" />
    </div>
  );
}

const getStatusTone = (status) => {
  if (status === "active") return "emerald";
  if (status === "inactive") return "amber";
  if (status === "discontinued") return "rose";
  return "neutral";
};

const getMovementTone = (status) => {
  if (status === "incoming") return "emerald";
  if (status === "in_use") return "amber";
  if (status === "outgoing") return "rose";
  return "neutral";
};

export default function FabricInventoryPage() {
  const {
    fabrics,
    fabricStats,
    loading,
    formLoading,
    error,
    filters,
    pagination,
    setFilters,
    clearFilters,
    fetchFabrics,
    fetchFabricStats,
    updateFabricStatus,
    updateMovementStatus,
    deleteFabric,
    activateFabric,
  } = useFabricStore();

  const [q, setQ] = useState(filters?.q || "");
  const [status, setStatus] = useState(filters?.status || "");
  const [movementStatus, setMovementStatus] = useState(
    filters?.movementStatus || ""
  );
  const [unit, setUnit] = useState(filters?.unit || "");
  const [savingKey, setSavingKey] = useState("");

  const load = async (extra = {}) => {
    try {
      await Promise.all([
        fetchFabrics(extra),
        fetchFabricStats(),
      ]);
    } catch (e) {
      toast.error(e?.message || "Failed to load fabrics");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredList = useMemo(() => {
    const arr = Array.isArray(fabrics) ? fabrics : [];
    const needle = s(q).trim().toLowerCase();

    return arr.filter((item) => {
      const hay = [
        item?.name,
        item?.code,
        item?.category,
        item?.unit,
        item?.status,
        item?.movementStatus,
        item?.notes,
        ...(Array.isArray(item?.associatedProductCodes)
          ? item.associatedProductCodes
          : []),
      ]
        .map((x) => s(x).toLowerCase())
        .join(" ");

      const matchQ = !needle || hay.includes(needle);
      const matchStatus = !status || s(item?.status) === status;
      const matchMovement =
        !movementStatus || s(item?.movementStatus) === movementStatus;
      const matchUnit = !unit || s(item?.unit) === unit;

      return matchQ && matchStatus && matchMovement && matchUnit;
    });
  }, [fabrics, q, status, movementStatus, unit]);

  const applyFilters = async (page = 1) => {
    const next = {
      ...filters,
      q: q.trim(),
      status,
      movementStatus,
      unit,
      page,
    };

    setFilters(next);
    await load(next);
  };

  const resetFilters = async () => {
    setQ("");
    setStatus("");
    setMovementStatus("");
    setUnit("");
    clearFilters();
    await load({
      q: "",
      status: "",
      movementStatus: "",
      unit: "",
      page: 1,
      limit: 20,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  };

  const handleStatusChange = async (id, nextStatus) => {
    try {
      setSavingKey(`status-${id}`);
      await updateFabricStatus(id, { status: nextStatus });
      toast.success("Status updated");
      await fetchFabricStats();
    } catch (e) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setSavingKey("");
    }
  };

  const handleMovementChange = async (id, nextMovementStatus) => {
    try {
      setSavingKey(`movement-${id}`);
      await updateMovementStatus(id, nextMovementStatus);
      toast.success("Movement updated");
      await fetchFabricStats();
    } catch (e) {
      toast.error(e?.message || "Failed to update movement");
    } finally {
      setSavingKey("");
    }
  };

  const handleDelete = async (id) => {
    try {
      setSavingKey(`delete-${id}`);
      await deleteFabric(id);
      toast.success("Fabric deleted");
      await fetchFabricStats();
    } catch (e) {
      toast.error(e?.message || "Failed to delete fabric");
    } finally {
      setSavingKey("");
    }
  };

  const handleActivate = async (id) => {
    try {
      setSavingKey(`activate-${id}`);
      await activateFabric(id);
      toast.success("Fabric activated");
      await fetchFabricStats();
    } catch (e) {
      toast.error(e?.message || "Failed to activate fabric");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      <div className="sticky top-0 z-10 bg-[#fafafa]/80 backdrop-blur">
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Fabric Inventory
              </h1>
              <p className="mt-1 text-sm text-black/60">
                Manage fabrics, status, movement, associations and activity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={resetFilters} disabled={loading}>
                Clear filters
              </Btn>
              <Btn onClick={() => load(filters)} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Btn>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <TextInput
              value={q}
              onChange={setQ}
              placeholder="Search name, code, category..."
            />

            <Select
              value={status}
              onChange={setStatus}
              placeholder="All status"
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Discontinued", value: "discontinued" },
              ]}
            />

            <Select
              value={movementStatus}
              onChange={setMovementStatus}
              placeholder="All movement"
              options={[
                { label: "Idle", value: "idle" },
                { label: "Incoming", value: "incoming" },
                { label: "In Use", value: "in_use" },
                { label: "Outgoing", value: "outgoing" },
              ]}
            />

            <Select
              value={unit}
              onChange={setUnit}
              placeholder="All units"
              options={[
                { label: "Meter", value: "meter" },
                { label: "Kg", value: "kg" },
              ]}
            />

            <Btn onClick={() => applyFilters(1)} disabled={loading}>
              Apply filters
            </Btn>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip>Total: {pagination?.total || filteredList.length || 0}</Chip>
            <Chip>Showing: {filteredList.length}</Chip>
            <Chip tone="emerald">
              Active: {n(fabricStats?.activeCount || fabricStats?.active || 0)}
            </Chip>
            <Chip tone="amber">
              Inactive:{" "}
              {n(fabricStats?.inactiveCount || fabricStats?.inactive || 0)}
            </Chip>
            <Chip tone="rose">
              Discontinued:{" "}
              {n(
                fabricStats?.discontinuedCount ||
                  fabricStats?.discontinued ||
                  0
              )}
            </Chip>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div className="text-sm font-medium">Could not load fabrics</div>
              <div className="mt-1 text-sm text-black/60">{error}</div>
              <div className="mt-3">
                <Btn onClick={() => load(filters)}>Retry</Btn>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-5 pb-10">
        <div className="space-y-2">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : filteredList.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="text-sm font-medium">No fabrics found</div>
              <div className="mt-1 text-sm text-black/60">
                Try changing search or filters.
              </div>
            </div>
          ) : (
            filteredList.map((item) => {
              const id = s(item?._id);
              const image = s(item?.imageLink);
              const statusTone = getStatusTone(item?.status);
              const movementTone = getMovementTone(item?.movementStatus);
              const associatedCount =
                n(item?.associatedProductsCount) ||
                (Array.isArray(item?.associatedProductCodes)
                  ? item.associatedProductCodes.length
                  : 0);

              return (
                <div
                  key={id}
                  className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
                >
                  <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-[56px_1.3fr_120px_120px_120px_120px_120px_140px] xl:items-center">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-black/5">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={item?.name || "fabric"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold">
                          {s(item?.name) || "Untitled Fabric"}
                        </div>
                        <Chip tone={statusTone}>{s(item?.status) || "—"}</Chip>
                        <Chip tone={movementTone}>
                          {s(item?.movementStatus) || "idle"}
                        </Chip>
                        {!item?.isActive ? <Chip tone="rose">Inactive Flag</Chip> : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/60">
                        <span>Code: {s(item?.code) || "—"}</span>
                        <span className="text-black/20">•</span>
                        <span>Category: {s(item?.category) || "—"}</span>
                        <span className="text-black/20">•</span>
                        <span>Unit: {s(item?.unit) || "—"}</span>
                        <span className="text-black/20">•</span>
                        <span>Price: ₹{n(item?.price)}</span>
                        {item?.gsm ? (
                          <>
                            <span className="text-black/20">•</span>
                            <span>GSM: {n(item?.gsm)}</span>
                          </>
                        ) : null}
                        {item?.width ? (
                          <>
                            <span className="text-black/20">•</span>
                            <span>Width: {s(item?.width)}</span>
                          </>
                        ) : null}
                      </div>

                      {item?.notes ? (
                        <div className="mt-1 truncate text-xs text-black/50">
                          Notes: {s(item?.notes)}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <Chip>Assoc: {associatedCount}</Chip>
                    </div>

                    <div>
                      <select
                        value={s(item?.status)}
                        onChange={(e) =>
                          handleStatusChange(id, e.target.value)
                        }
                        disabled={formLoading || !!savingKey}
                        className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-black/10 outline-none focus:ring-black/30"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={s(item?.movementStatus)}
                        onChange={(e) =>
                          handleMovementChange(id, e.target.value)
                        }
                        disabled={formLoading || !!savingKey}
                        className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-black/10 outline-none focus:ring-black/30"
                      >
                        <option value="idle">Idle</option>
                        <option value="incoming">Incoming</option>
                        <option value="in_use">In Use</option>
                        <option value="outgoing">Outgoing</option>
                      </select>
                    </div>

                    <div className="text-xs text-black/50">
                      Updated:{" "}
                      {item?.updatedAt
                        ? new Date(item.updatedAt).toLocaleDateString("en-IN")
                        : "—"}
                    </div>

                    <div className="text-xs text-black/50">
                      Created:{" "}
                      {item?.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </div>

                    <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                      {!item?.isActive || s(item?.status) !== "active" ? (
                        <Btn
                          variant="secondary"
                          onClick={() => handleActivate(id)}
                          disabled={savingKey === `activate-${id}`}
                        >
                          {savingKey === `activate-${id}`
                            ? "Activating..."
                            : "Activate"}
                        </Btn>
                      ) : null}

                      <Btn
                        variant="secondary"
                        onClick={() => handleDelete(id)}
                        disabled={savingKey === `delete-${id}`}
                        className="text-rose-600"
                      >
                        {savingKey === `delete-${id}` ? "Deleting..." : "Delete"}
                      </Btn>
                    </div>
                  </div>

                  {Array.isArray(item?.associatedProductCodes) &&
                  item.associatedProductCodes.length > 0 ? (
                    <div className="border-t border-black/5 bg-[#fafafa] px-3 py-3">
                      <div className="mb-2 text-xs font-medium text-black/60">
                        Associated Product Codes
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.associatedProductCodes.map((code) => (
                          <Chip key={code}>{code}</Chip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {!!pagination?.totalPages && pagination.totalPages > 1 ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Btn
              variant="secondary"
              disabled={loading || pagination.page <= 1}
              onClick={() => applyFilters(pagination.page - 1)}
            >
              Previous
            </Btn>

            <Chip>
              Page {pagination.page} / {pagination.totalPages}
            </Chip>

            <Btn
              variant="secondary"
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() => applyFilters(pagination.page + 1)}
            >
              Next
            </Btn>
          </div>
        ) : null}
      </div>
    </div>
  );
}