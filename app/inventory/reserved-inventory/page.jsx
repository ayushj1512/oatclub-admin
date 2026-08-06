"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useInventoryReservationStore } from "@/store/inventoryReservationStore";

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */

const safe = (value, fallback = "") =>
  value == null ? fallback : String(value);

const qty = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (value) => {
  const text = safe(value);

  if (!text) return "—";
  if (text.length <= 14) return text;

  return `${text.slice(0, 6)}...${text.slice(-5)}`;
};

const EMPTY_FILTERS = {
  orderNumber: "",
  productCode: "",
  productTitle: "",
  status: "",
  refType: "",
  refId: "",
  productId: "",
  variantId: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reserved", label: "Reserved" },
  { value: "released", label: "Released" },
  { value: "consumed", label: "Consumed" },
  { value: "expired", label: "Expired" },
];

const REF_TYPE_OPTIONS = [
  { value: "", label: "All reference types" },
  { value: "order", label: "Order" },
  { value: "production", label: "Production" },
  { value: "manual", label: "Manual" },
];

const PAGE_LIMIT_OPTIONS = [20, 50, 100, 200];

/* ---------------------------------------------------
   Shared UI
--------------------------------------------------- */

function Field({ label, children, className = "" }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[11px] font-semibold text-gray-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  const value = safe(status, "unknown").toLowerCase();

  const classes = {
    pending: "border-blue-200 bg-blue-50 text-blue-700",
    reserved: "border-amber-200 bg-amber-50 text-amber-700",
    consumed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    released: "border-gray-200 bg-gray-100 text-gray-700",
    expired: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize",
        classes[value] ||
        "border-gray-200 bg-gray-100 text-gray-700",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-xl font-black leading-none text-gray-950">
          {value}
        </div>

        {helper ? (
          <div className="max-w-[120px] truncate text-right text-[10px] text-gray-500">
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   Page
--------------------------------------------------- */

export default function ReservedInventoryPage() {
  const {
    loading,
    actionLoading,
    error,
    clearError,

    reservations,
    total,
    filters,

    setFilters,
    resetFilters,
    fetchReservations,

    releaseReservation,
    consumeReservation,
    expireReservation,
    expireDueReservations,

    moveReservationToPending,
    deleteReservation,
    transferReservation,
  } = useInventoryReservationStore();

  const [form, setForm] = useState({
    ...EMPTY_FILTERS,
    ...(filters || {}),
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [showAdvancedFilters, setShowAdvancedFilters] =
    useState(false);

  const [reasonById, setReasonById] = useState({});
  const [transferById, setTransferById] = useState({});

  const [selectedIds, setSelectedIds] = useState(
    () => new Set()
  );

  const [bulkReason, setBulkReason] = useState("");

  const [actionMenu, setActionMenu] = useState({
    id: "",
    top: 0,
    right: 0,
  });

  /* ---------------------------------------------------
     Fetching
  --------------------------------------------------- */

  const buildRequestFilters = ({
    filterValues = form,
    nextPage = page,
    nextLimit = limit,
  } = {}) => ({
    orderNumber: safe(filterValues.orderNumber).trim(),
    productCode: safe(filterValues.productCode).trim(),
    productTitle: safe(filterValues.productTitle).trim(),
    status: safe(filterValues.status).trim(),
    refType: safe(filterValues.refType).trim(),
    refId: safe(filterValues.refId).trim(),
    productId: safe(filterValues.productId).trim(),
    variantId: safe(filterValues.variantId).trim(),
    page: nextPage,
    limit: nextLimit,
  });

  const loadReservations = async ({
    filterValues = form,
    nextPage = page,
    nextLimit = limit,
  } = {}) => {
    clearError?.();

    const requestFilters = buildRequestFilters({
      filterValues,
      nextPage,
      nextLimit,
    });

    await fetchReservations(requestFilters);
  };

  useEffect(() => {
    loadReservations({
      filterValues: {
        ...EMPTY_FILTERS,
        ...(filters || {}),
      },
      nextPage: 1,
      nextLimit: limit,
    }).catch(() => { });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------
     Derived data
  --------------------------------------------------- */

  const list = useMemo(() => {
    const rows = Array.isArray(reservations)
      ? reservations
      : [];

    return [...rows].sort((a, b) => {
      const statusA = safe(a?.status);
      const statusB = safe(b?.status);

      if (
        statusA === "reserved" &&
        statusB !== "reserved"
      ) {
        return -1;
      }

      if (
        statusB === "reserved" &&
        statusA !== "reserved"
      ) {
        return 1;
      }

      return (
        new Date(b?.createdAt || 0).getTime() -
        new Date(a?.createdAt || 0).getTime()
      );
    });
  }, [reservations]);

  const statusCounts = useMemo(() => {
    const result = {
      pending: 0,
      reserved: 0,
      consumed: 0,
      released: 0,
      expired: 0,
      reservedQty: 0,
    };

    for (const row of list) {
      const status = safe(row?.status);

      if (
        Object.prototype.hasOwnProperty.call(
          result,
          status
        )
      ) {
        result[status] += 1;
      }

      if (status === "reserved") {
        result.reservedQty += qty(row?.qty);
      }
    }

    return result;
  }, [list]);

  const reservedIds = useMemo(() => {
    const ids = new Set();

    for (const row of list) {
      if (safe(row?.status) === "reserved") {
        ids.add(safe(row?._id));
      }
    }

    return ids;
  }, [list]);

  const selectedReservedIds = useMemo(
    () =>
      Array.from(selectedIds).filter((reservationId) =>
        reservedIds.has(reservationId)
      ),
    [selectedIds, reservedIds]
  );

  const selectedCount = selectedReservedIds.length;

  const allReservedSelected =
    reservedIds.size > 0 &&
    selectedCount === reservedIds.size;

  const totalPages = Math.max(
    1,
    Math.ceil(Number(total || 0) / limit)
  );

  const rangeStart =
    Number(total || 0) === 0
      ? 0
      : (page - 1) * limit + 1;

  const rangeEnd = Math.min(
    page * limit,
    Number(total || 0)
  );

  /* ---------------------------------------------------
     Menu
  --------------------------------------------------- */

  const closeActionMenu = () => {
    setActionMenu({
      id: "",
      top: 0,
      right: 0,
    });
  };

  const toggleActionMenu = (event, id) => {
    event.stopPropagation();

    if (actionMenu.id === id) {
      closeActionMenu();
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth = 290;
    const menuHeight = 410;
    const viewportPadding = 10;

    const availableBelow =
      window.innerHeight - rect.bottom;

    const top =
      availableBelow >= menuHeight
        ? rect.bottom + 6
        : Math.max(
          viewportPadding,
          rect.top - menuHeight - 6
        );

    let right = Math.max(
      viewportPadding,
      window.innerWidth - rect.right
    );

    if (
      window.innerWidth -
      right -
      menuWidth <
      viewportPadding
    ) {
      right = viewportPadding;
    }

    setActionMenu({
      id,
      top,
      right,
    });
  };

  useEffect(() => {
    if (!actionMenu.id) return undefined;

    const closeMenu = () => {
      closeActionMenu();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeActionMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener(
      "scroll",
      closeMenu,
      true
    );
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener(
        "scroll",
        closeMenu,
        true
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [actionMenu.id]);

  /* ---------------------------------------------------
     Selection cleanup
  --------------------------------------------------- */

  useEffect(() => {
    setSelectedIds((previous) => {
      if (!previous.size) return previous;

      const next = new Set();

      previous.forEach((reservationId) => {
        if (reservedIds.has(reservationId)) {
          next.add(reservationId);
        }
      });

      return next;
    });
  }, [reservedIds]);

  /* ---------------------------------------------------
     Filters
  --------------------------------------------------- */

  const applyFilters = async () => {
    const nextFilters = {
      orderNumber: safe(form.orderNumber).trim(),
      productCode: safe(form.productCode).trim(),
      productTitle: safe(form.productTitle).trim(),
      status: safe(form.status).trim(),
      refType: safe(form.refType).trim(),
      refId: safe(form.refId).trim(),
      productId: safe(form.productId).trim(),
      variantId: safe(form.variantId).trim(),
    };

    closeActionMenu();
    setPage(1);
    setFilters(nextFilters);

    await loadReservations({
      filterValues: nextFilters,
      nextPage: 1,
      nextLimit: limit,
    });
  };

  const clearFilters = async () => {
    clearError?.();
    resetFilters();
    closeActionMenu();

    setForm(EMPTY_FILTERS);
    setPage(1);

    await loadReservations({
      filterValues: EMPTY_FILTERS,
      nextPage: 1,
      nextLimit: limit,
    });
  };

  const handleFilterKeyDown = (event) => {
    if (event.key === "Enter") {
      applyFilters().catch(() => { });
    }
  };

  const handleLimitChange = async (event) => {
    const nextLimit =
      Number(event.target.value) || 50;

    closeActionMenu();
    setLimit(nextLimit);
    setPage(1);
    setSelectedIds(new Set());

    await loadReservations({
      nextPage: 1,
      nextLimit,
    });
  };

  const changePage = async (nextPage) => {
    const safePage = Math.min(
      Math.max(1, nextPage),
      totalPages
    );

    if (safePage === page) return;

    closeActionMenu();
    setPage(safePage);
    setSelectedIds(new Set());

    await loadReservations({
      nextPage: safePage,
      nextLimit: limit,
    });
  };

  /* ---------------------------------------------------
     Single actions
  --------------------------------------------------- */

  const doAction = async (type, reservation) => {
    const id = safe(reservation?._id);

    if (!id) return;

    clearError?.();

    const reason = safe(reasonById[id]).trim();

    try {
      if (type === "release") {
        const approved = window.confirm(
          "Release this reservation?\n\nReserved stock will become available again."
        );

        if (!approved) return;

        await releaseReservation(
          id,
          reason ||
          "Released manually from reserved inventory"
        );
      }

      if (type === "consume") {
        const approved = window.confirm(
          "Consume this reservation?\n\nPhysical inventory and reserved inventory will both be reduced."
        );

        if (!approved) return;

        await consumeReservation(
          id,
          reason ||
          "Consumed manually from reserved inventory"
        );
      }

      if (type === "expire") {
        const approved = window.confirm(
          "Expire this reservation?\n\nReserved stock will be released."
        );

        if (!approved) return;

        await expireReservation(
          id,
          reason ||
          "Expired manually from reserved inventory"
        );
      }

      if (type === "pending") {
        const approved = window.confirm(
          "Move this reservation back to pending?\n\nIts reserved stock will be released and offered to another eligible pending reservation."
        );

        if (!approved) return;

        await moveReservationToPending(
          id,
          reason ||
          "Moved back to pending by admin"
        );
      }

      if (type === "delete") {
        const approved = window.confirm(
          "Permanently delete this reservation?\n\nThis action cannot be undone."
        );

        if (!approved) return;

        await deleteReservation(
          id,
          reason ||
          "Deleted legacy or incorrect reservation"
        );
      }

      setReasonById((previous) => ({
        ...previous,
        [id]: "",
      }));

      closeActionMenu();
      await loadReservations();
    } catch {
      // Zustand store handles the displayed error.
    }
  };

  const doTransfer = async (reservation) => {
    const id = safe(reservation?._id);

    if (!id) return;

    const transferState =
      transferById[id] || {};

    const targetOrderNumber = safe(
      transferState.targetOrderNumber
    ).trim();

    const transferQty = safe(
      transferState.qty
    ).trim();

    const reason = safe(
      reasonById[id]
    ).trim();

    if (!targetOrderNumber) {
      window.alert(
        "Please enter the target order number."
      );
      return;
    }

    const approved = window.confirm(
      `Transfer this reservation to order ${targetOrderNumber}?\n\n` +
      `${transferQty
        ? `Quantity: ${transferQty}`
        : "Quantity: Maximum required quantity"
      }\n\n` +
      "Reserved stock will remain unchanged."
    );

    if (!approved) return;

    clearError?.();

    try {
      const summary =
        await transferReservation({
          id,
          targetOrderNumber,
          qty: transferQty,
          reason:
            reason ||
            `Transferred to order ${targetOrderNumber}`,
        });

      setTransferById((previous) => ({
        ...previous,
        [id]: {
          targetOrderNumber: "",
          qty: "",
        },
      }));

      setReasonById((previous) => ({
        ...previous,
        [id]: "",
      }));

      closeActionMenu();

      window.alert(
        `Reservation transferred successfully.\n\n` +
        `Transferred quantity: ${summary?.transferredQty || 0
        }\n` +
        `Target remaining: ${summary?.targetRemainingQtyAfter || 0
        }`
      );

      await loadReservations();
    } catch {
      // Zustand store handles the displayed error.
    }
  };

  const onExpireDue = async () => {
    const approved = window.confirm(
      "Expire all reservations whose expiry date has passed?"
    );

    if (!approved) return;

    clearError?.();
    closeActionMenu();

    try {
      await expireDueReservations();
      await loadReservations();
    } catch {
      // Zustand store handles the displayed error.
    }
  };

  /* ---------------------------------------------------
     Bulk selection
  --------------------------------------------------- */

  const toggleOne = (id) => {
    if (!id || !reservedIds.has(id)) return;

    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleAllReserved = () => {
    setSelectedIds(() => {
      if (allReservedSelected) {
        return new Set();
      }

      return new Set(reservedIds);
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  /* ---------------------------------------------------
     Bulk actions
  --------------------------------------------------- */

  const runBulk = async (type) => {
    const ids = [...selectedReservedIds];

    if (!ids.length) return;

    const actionNames = {
      release: "release",
      consume: "consume",
      expire: "expire",
    };

    const approved = window.confirm(
      `Are you sure you want to ${actionNames[type]} ${ids.length} selected reservation(s)?`
    );

    if (!approved) return;

    clearError?.();
    closeActionMenu();

    const reason =
      safe(bulkReason).trim() ||
      `Bulk ${actionNames[type]} from reserved inventory`;

    try {
      for (const id of ids) {
        if (type === "release") {
          await releaseReservation(id, reason);
        }

        if (type === "consume") {
          await consumeReservation(id, reason);
        }

        if (type === "expire") {
          await expireReservation(id, reason);
        }
      }

      clearSelection();
      setBulkReason("");

      await loadReservations();
    } catch {
      // Zustand store handles the displayed error.
    }
  };

  /* ---------------------------------------------------
     Render
  --------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-gray-950">
      <div className="mx-auto w-full max-w-[1800px] space-y-3 p-3 md:p-4">
        {/* Header */}
        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              Reserved Inventory
            </h1>

            <p className="mt-0.5 text-xs text-gray-500">
              Manage reservations, transfers and inventory
              allocation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadReservations().catch(() => { })
              }
              disabled={loading || actionLoading}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={onExpireDue}
              disabled={loading || actionLoading}
              className="h-9 rounded-lg bg-gray-950 px-3 text-xs font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Expire Due
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard
            label="Total Records"
            value={Number(total || 0)}
            helper="Matching filters"
          />

          <SummaryCard
            label="Reserved"
            value={statusCounts.reserved}
            helper={`Qty: ${statusCounts.reservedQty}`}
          />

          <SummaryCard
            label="Pending"
            value={statusCounts.pending}
            helper="Waiting for stock"
          />

          <SummaryCard
            label="Consumed"
            value={statusCounts.consumed}
            helper="Finalized"
          />

          <SummaryCard
            label="Released"
            value={statusCounts.released}
            helper="Removed"
          />

          <SummaryCard
            label="Expired"
            value={statusCounts.expired}
            helper="Expired holds"
          />
        </section>

        {/* Error */}
        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-red-800">
                  Reservation action failed
                </div>

                <div className="mt-0.5 text-xs text-red-700">
                  {error}
                </div>
              </div>

              <button
                type="button"
                onClick={() => clearError?.()}
                className="shrink-0 text-[11px] font-bold text-red-700 underline"
              >
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        {/* Filters */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2.5">
            <div>
              <h2 className="text-sm font-bold">
                Search and Filters
              </h2>

              <p className="text-[10px] text-gray-500">
                Search by order, product or reservation
                details.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowAdvancedFilters(
                  (value) => !value
                )
              }
              className="h-8 rounded-lg border border-gray-300 bg-white px-3 text-[11px] font-semibold hover:bg-gray-50"
            >
              {showAdvancedFilters
                ? "Hide Advanced"
                : "Advanced"}
            </button>
          </div>

          <div
            className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-6"
            onKeyDown={handleFilterKeyDown}
          >
            <Field label="Order Number">
              <input
                value={form.orderNumber}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    orderNumber: event.target.value,
                  }))
                }
                placeholder="000187"
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
              />
            </Field>

            <Field label="Product Code">
              <input
                value={form.productCode}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    productCode: event.target.value,
                  }))
                }
                placeholder="00197"
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
              />
            </Field>

            <Field
              label="Product Title"
              className="xl:col-span-2"
            >
              <input
                value={form.productTitle}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    productTitle: event.target.value,
                  }))
                }
                placeholder="Search product name"
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
              />
            </Field>

            <Field label="Reservation Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    status: event.target.value,
                  }))
                }
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reference Type">
              <select
                value={form.refType}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    refType: event.target.value,
                  }))
                }
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
              >
                {REF_TYPE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {showAdvancedFilters ? (
              <>
                <Field
                  label="Reference ID"
                  className="xl:col-span-2"
                >
                  <input
                    value={form.refId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        refId: event.target.value,
                      }))
                    }
                    placeholder="Reference ID"
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
                  />
                </Field>

                <Field
                  label="Product ID"
                  className="xl:col-span-2"
                >
                  <input
                    value={form.productId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        productId: event.target.value,
                      }))
                    }
                    placeholder="MongoDB product ID"
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
                  />
                </Field>

                <Field
                  label="Variant ID"
                  className="xl:col-span-2"
                >
                  <input
                    value={form.variantId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        variantId: event.target.value,
                      }))
                    }
                    placeholder="MongoDB variant ID"
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
                  />
                </Field>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-end">
            <button
              type="button"
              onClick={() =>
                applyFilters().catch(() => { })
              }
              disabled={loading || actionLoading}
              className="h-9 rounded-lg bg-gray-950 px-4 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              Apply Filters
            </button>

            <button
              type="button"
              onClick={() =>
                clearFilters().catch(() => { })
              }
              disabled={loading || actionLoading}
              className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Clear Filters
            </button>

            <div className="sm:ml-auto">
              <Field label="Rows Per Page">
                <select
                  value={limit}
                  onChange={(event) =>
                    handleLimitChange(event).catch(
                      () => { }
                    )
                  }
                  disabled={loading || actionLoading}
                  className="h-9 min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none"
                >
                  {PAGE_LIMIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} rows
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </section>

        {/* Bulk actions */}
        <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAllReserved}
                disabled={
                  loading ||
                  actionLoading ||
                  reservedIds.size === 0
                }
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                {allReservedSelected
                  ? "Unselect Reserved"
                  : "Select Reserved"}
              </button>

              <button
                type="button"
                onClick={clearSelection}
                disabled={
                  loading ||
                  actionLoading ||
                  selectedCount === 0
                }
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>

              <div className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
                Selected{" "}
                <strong>{selectedCount}</strong> of{" "}
                <strong>{reservedIds.size}</strong>
              </div>
            </div>

            <div className="flex-1" />

            <Field
              label="Bulk Action Reason"
              className="w-full xl:max-w-[300px]"
            >
              <input
                value={bulkReason}
                onChange={(event) =>
                  setBulkReason(event.target.value)
                }
                placeholder="Reason for selected rows"
                disabled={actionLoading}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-950"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runBulk("release")}
                disabled={
                  selectedCount === 0 ||
                  loading ||
                  actionLoading
                }
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Release
              </button>

              <button
                type="button"
                onClick={() => runBulk("consume")}
                disabled={
                  selectedCount === 0 ||
                  loading ||
                  actionLoading
                }
                className="h-9 rounded-lg bg-gray-950 px-3 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                Consume
              </button>

              <button
                type="button"
                onClick={() => runBulk("expire")}
                disabled={
                  selectedCount === 0 ||
                  loading ||
                  actionLoading
                }
                className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Expire
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">
                Inventory Reservations
              </h2>

              <p className="text-[10px] text-gray-500">
                Showing {rangeStart}–{rangeEnd} of{" "}
                {Number(total || 0)}
              </p>
            </div>

            <div className="text-[10px] text-gray-500">
              {actionLoading
                ? "Processing..."
                : loading
                  ? "Loading..."
                  : `Page ${page} of ${totalPages}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-gray-100 text-left text-[10px] uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="w-[46px] px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allReservedSelected}
                      onChange={toggleAllReserved}
                      disabled={
                        loading ||
                        actionLoading ||
                        reservedIds.size === 0
                      }
                      className="h-4 w-4 accent-black"
                      aria-label="Select all reserved rows"
                    />
                  </th>

                  <th className="px-3 py-2.5">
                    Status
                  </th>

                  <th className="px-3 py-2.5">
                    Order
                  </th>

                  <th className="px-3 py-2.5">
                    Product
                  </th>

                  <th className="px-3 py-2.5">
                    Variant
                  </th>

                  <th className="px-3 py-2.5 text-center">
                    Qty
                  </th>

                  <th className="px-3 py-2.5">
                    Reference
                  </th>

                  <th className="px-3 py-2.5">
                    Timeline
                  </th>

                  <th className="px-3 py-2.5">
                    Notes
                  </th>

                  <th className="w-[70px] px-3 py-2.5 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {!list.length ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-16 text-center"
                    >
                      <div className="text-sm font-bold text-gray-700">
                        {loading
                          ? "Loading reservations..."
                          : "No reservations found"}
                      </div>

                      {!loading ? (
                        <div className="mt-1 text-xs text-gray-500">
                          Change filters or refresh the page.
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  list.map((reservation) => {
                    const id = safe(reservation?._id);

                    const status = safe(
                      reservation?.status,
                      "unknown"
                    );

                    const isReserved =
                      status === "reserved";

                    const isConsumed =
                      status === "consumed";

                    const title =
                      safe(
                        reservation?.productTitle
                      ) || "Untitled Product";

                    const code =
                      safe(
                        reservation?.productCode
                      ) || "—";

                    const image = safe(
                      reservation?.productImage
                    );

                    const orderNumber =
                      safe(
                        reservation?.orderNumber
                      ) || "—";

                    const selected =
                      selectedIds.has(id) &&
                      reservedIds.has(id);

                    const size =
                      safe(
                        reservation?.selectedSize
                      ) || "—";

                    const color =
                      safe(
                        reservation?.selectedColor
                      ) || "—";

                    return (
                      <tr
                        key={id}
                        className={[
                          "align-middle transition hover:bg-gray-50",
                          selected
                            ? "bg-amber-50/50"
                            : "",
                        ].join(" ")}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleOne(id)
                            }
                            disabled={
                              !isReserved ||
                              loading ||
                              actionLoading
                            }
                            className="h-4 w-4 accent-black disabled:opacity-40"
                            aria-label={`Select reservation ${id}`}
                          />
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <StatusBadge
                            status={status}
                          />

                          <div
                            className="mt-1 text-[9px] text-gray-400"
                            title={id}
                          >
                            {shortId(id)}
                          </div>
                        </td>

                        {/* Order */}
                        <td className="px-3 py-2.5">
                          <div className="font-black text-gray-950">
                            {orderNumber}
                          </div>

                          <div className="mt-0.5 text-[10px] capitalize text-gray-500">
                            {safe(
                              reservation?.refType
                            ) || "—"}
                          </div>
                        </td>

                        {/* Product */}
                        <td className="px-3 py-2.5">
                          <div className="flex min-w-[240px] items-center gap-2">
                            <div className="h-12 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-center text-[8px] font-semibold text-gray-400">
                                  No
                                  <br />
                                  Image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div
                                className="max-w-[210px] truncate text-xs font-bold"
                                title={title}
                              >
                                {title}
                              </div>

                              <div className="mt-0.5 text-[10px] font-semibold text-gray-600">
                                {code}
                              </div>

                              <div
                                className="mt-0.5 text-[9px] text-gray-400"
                                title={safe(
                                  reservation?.productId
                                )}
                              >
                                {shortId(
                                  reservation?.productId
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Variant */}
                        <td className="px-3 py-2.5">
                          <div className="min-w-[145px] text-[10px] leading-4">
                            <div>
                              <span className="text-gray-500">
                                Size:
                              </span>{" "}
                              <strong>{size}</strong>

                              <span className="mx-1 text-gray-300">
                                •
                              </span>

                              <span className="text-gray-500">
                                Color:
                              </span>{" "}
                              <strong>{color}</strong>
                            </div>

                            <div
                              className="max-w-[150px] truncate text-gray-500"
                              title={safe(
                                reservation?.variantSku
                              )}
                            >
                              SKU:{" "}
                              {safe(
                                reservation?.variantSku
                              ) || "—"}
                            </div>

                            <div
                              className="text-[9px] text-gray-400"
                              title={safe(
                                reservation?.variantId
                              )}
                            >
                              {shortId(
                                reservation?.variantId
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex min-w-8 justify-center rounded-lg bg-gray-950 px-2 py-1 text-xs font-black text-white">
                            {qty(reservation?.qty)}
                          </span>
                        </td>

                        {/* Reference */}
                        <td className="px-3 py-2.5">
                          <div className="min-w-[140px]">
                            <div className="text-[10px] font-bold capitalize">
                              {safe(
                                reservation?.refType
                              ) || "—"}
                            </div>

                            <div
                              className="mt-0.5 text-[9px] text-gray-500"
                              title={safe(
                                reservation?.refId
                              )}
                            >
                              {shortId(
                                reservation?.refId
                              )}
                            </div>

                            <div
                              className="mt-0.5 max-w-[180px] truncate text-[9px] text-gray-400"
                              title={safe(
                                reservation?.reservationKey
                              )}
                            >
                              {safe(
                                reservation?.reservationKey
                              ) || "No reservation key"}
                            </div>
                          </div>
                        </td>

                        {/* Timeline */}
                        <td className="px-3 py-2.5">
                          <div className="min-w-[150px] space-y-0.5 text-[9px] leading-4">
                            <div>
                              <span className="font-semibold text-gray-500">
                                Created:
                              </span>{" "}
                              {formatDateTime(
                                reservation?.createdAt
                              )}
                            </div>

                            {reservation?.expiresAt ? (
                              <div>
                                <span className="font-semibold text-red-500">
                                  Expires:
                                </span>{" "}
                                {formatDateTime(
                                  reservation?.expiresAt
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-2.5">
                          <div
                            className="max-w-[190px] truncate text-[10px] text-gray-500"
                            title={
                              safe(
                                reservation?.notes
                              ) || "No notes"
                            }
                          >
                            {safe(
                              reservation?.notes
                            ) || "No notes"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-center">
                          <div
                            className="inline-flex"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              onClick={(event) =>
                                toggleActionMenu(
                                  event,
                                  id
                                )
                              }
                              disabled={actionLoading}
                              className={[
                                "flex h-8 w-8 items-center justify-center rounded-lg border text-lg font-black transition",
                                actionMenu.id === id
                                  ? "border-gray-950 bg-gray-950 text-white"
                                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100",
                                actionLoading
                                  ? "cursor-not-allowed opacity-50"
                                  : "",
                              ].join(" ")}
                              aria-label={`Manage reservation ${id}`}
                              title="Reservation actions"
                            >
                              ⋮
                            </button>

                            {actionMenu.id === id ? (
                              <div
                                style={{
                                  top: actionMenu.top,
                                  right:
                                    actionMenu.right,
                                }}
                                className="fixed z-[100] w-[290px] overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-2xl"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                {/* Dropdown header */}
                                <div className="border-b border-gray-100 px-3 py-2.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate text-xs font-black text-gray-950">
                                        Order{" "}
                                        {orderNumber}
                                      </div>

                                      <div className="mt-0.5 truncate text-[10px] text-gray-500">
                                        {code} • {size} •
                                        Qty{" "}
                                        {qty(
                                          reservation?.qty
                                        )}
                                      </div>
                                    </div>

                                    <StatusBadge
                                      status={status}
                                    />
                                  </div>
                                </div>

                                <div className="max-h-[410px] space-y-3 overflow-y-auto p-3">
                                  {/* Reason */}
                                  <label className="block space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                      Action Reason
                                    </span>

                                    <input
                                      value={safe(
                                        reasonById[id]
                                      )}
                                      onChange={(
                                        event
                                      ) =>
                                        setReasonById(
                                          (
                                            previous
                                          ) => ({
                                            ...previous,
                                            [id]:
                                              event
                                                .target
                                                .value,
                                          })
                                        )
                                      }
                                      placeholder="Optional action reason"
                                      disabled={
                                        actionLoading
                                      }
                                      className="h-8 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-xs outline-none focus:border-gray-950"
                                    />
                                  </label>

                                  {/* Transfer */}
                                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                                    <div className="mb-2 text-[11px] font-black text-blue-950">
                                      Transfer
                                      Reservation
                                    </div>

                                    <div className="grid grid-cols-[1fr_72px] gap-2">
                                      <label className="space-y-1">
                                        <span className="block text-[10px] font-semibold text-blue-800">
                                          Target Order
                                        </span>

                                        <input
                                          value={
                                            transferById[
                                              id
                                            ]
                                              ?.targetOrderNumber ||
                                            ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            setTransferById(
                                              (
                                                previous
                                              ) => ({
                                                ...previous,
                                                [id]:
                                                {
                                                  ...(
                                                    previous[
                                                    id
                                                    ] ||
                                                    {}
                                                  ),
                                                  targetOrderNumber:
                                                    event
                                                      .target
                                                      .value,
                                                },
                                              })
                                            )
                                          }
                                          placeholder="000121"
                                          disabled={
                                            !isReserved ||
                                            actionLoading
                                          }
                                          className="h-8 w-full rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-blue-600"
                                        />
                                      </label>

                                      <label className="space-y-1">
                                        <span className="block text-[10px] font-semibold text-blue-800">
                                          Qty
                                        </span>

                                        <input
                                          type="number"
                                          min="1"
                                          max={qty(
                                            reservation?.qty
                                          )}
                                          value={
                                            transferById[
                                              id
                                            ]?.qty || ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            setTransferById(
                                              (
                                                previous
                                              ) => ({
                                                ...previous,
                                                [id]:
                                                {
                                                  ...(
                                                    previous[
                                                    id
                                                    ] ||
                                                    {}
                                                  ),
                                                  qty:
                                                    event
                                                      .target
                                                      .value,
                                                },
                                              })
                                            )
                                          }
                                          placeholder="All"
                                          disabled={
                                            !isReserved ||
                                            actionLoading
                                          }
                                          className="h-8 w-full rounded-lg border border-blue-200 bg-white px-2 text-xs outline-none focus:border-blue-600"
                                        />
                                      </label>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        doTransfer(
                                          reservation
                                        )
                                      }
                                      disabled={
                                        !isReserved ||
                                        actionLoading ||
                                        !safe(
                                          transferById[
                                            id
                                          ]
                                            ?.targetOrderNumber
                                        ).trim()
                                      }
                                      className="mt-2 h-8 w-full rounded-lg bg-blue-600 px-3 text-[11px] font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Transfer to
                                      Order
                                    </button>

                                    <div className="mt-1 text-[9px] leading-4 text-blue-700">
                                      Leave quantity
                                      blank to transfer
                                      the maximum
                                      required.
                                    </div>
                                  </div>

                                  {/* Status actions */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        doAction(
                                          "pending",
                                          reservation
                                        )
                                      }
                                      disabled={
                                        !isReserved ||
                                        actionLoading
                                      }
                                      className="h-8 rounded-lg bg-blue-600 px-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                                    >
                                      Move Pending
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        doAction(
                                          "consume",
                                          reservation
                                        )
                                      }
                                      disabled={
                                        !isReserved ||
                                        actionLoading
                                      }
                                      className="h-8 rounded-lg bg-gray-950 px-2 text-[11px] font-bold text-white hover:bg-black disabled:opacity-40"
                                    >
                                      Consume
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        doAction(
                                          "release",
                                          reservation
                                        )
                                      }
                                      disabled={
                                        !isReserved ||
                                        actionLoading
                                      }
                                      className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                                    >
                                      Release
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        doAction(
                                          "expire",
                                          reservation
                                        )
                                      }
                                      disabled={
                                        !isReserved ||
                                        actionLoading
                                      }
                                      className="h-8 rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-40"
                                    >
                                      Expire
                                    </button>
                                  </div>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      doAction(
                                        "delete",
                                        reservation
                                      )
                                    }
                                    disabled={
                                      isConsumed ||
                                      actionLoading
                                    }
                                    title={
                                      isConsumed
                                        ? "Consumed reservations cannot be deleted directly"
                                        : "Permanently delete reservation"
                                    }
                                    className="h-8 w-full rounded-lg bg-red-600 px-3 text-[11px] font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Delete Reservation
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] text-gray-500">
              Showing{" "}
              <strong className="text-gray-900">
                {rangeStart}–{rangeEnd}
              </strong>{" "}
              of{" "}
              <strong className="text-gray-900">
                {Number(total || 0)}
              </strong>{" "}
              records
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  changePage(1).catch(() => { })
                }
                disabled={
                  page <= 1 ||
                  loading ||
                  actionLoading
                }
                className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-[10px] font-bold hover:bg-gray-50 disabled:opacity-40"
              >
                First
              </button>

              <button
                type="button"
                onClick={() =>
                  changePage(page - 1).catch(
                    () => { }
                  )
                }
                disabled={
                  page <= 1 ||
                  loading ||
                  actionLoading
                }
                className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-[10px] font-bold hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>

              <div className="flex h-8 min-w-[90px] items-center justify-center rounded-lg bg-gray-100 px-2.5 text-[10px] font-bold">
                {page} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() =>
                  changePage(page + 1).catch(
                    () => { }
                  )
                }
                disabled={
                  page >= totalPages ||
                  loading ||
                  actionLoading
                }
                className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-[10px] font-bold hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>

              <button
                type="button"
                onClick={() =>
                  changePage(totalPages).catch(
                    () => { }
                  )
                }
                disabled={
                  page >= totalPages ||
                  loading ||
                  actionLoading
                }
                className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-[10px] font-bold hover:bg-gray-50 disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
