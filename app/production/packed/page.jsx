// src/app/production/packed/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";

import PackedOrderRow from "@/components/production/PackedOrderRow";
import OrderPrintPanel from "@/components/orders/OrderPrintPanel";
import PackedTrackingSyncPanel from "@/components/production/PackedTrackingSyncPanel";
import PackedBulkInvoicePrint from "@/components/production/PackedBulkInvoicePrint";

const safe = (v) => String(v ?? "").trim();

function Chip({ children, tone = "neutral" }) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";
  const map = {
    neutral: "border-zinc-200 bg-zinc-100 text-zinc-900",
    accent: "border-blue-200 bg-blue-50 text-blue-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return <span className={`${base} ${map[tone] || map.neutral}`}>{children}</span>;
}

function SmallBtn({ children, onClick, disabled, variant = "ghost" }) {
  const base =
    "rounded-xl px-3 py-2 text-xs font-extrabold transition active:scale-[0.99]";
  const styles = {
    ghost: disabled
      ? "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-500"
      : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
    primary: disabled
      ? "cursor-not-allowed bg-blue-300 text-white"
      : "bg-blue-600 text-white hover:bg-blue-700",
    success: disabled
      ? "cursor-not-allowed bg-emerald-300 text-white"
      : "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: disabled
      ? "cursor-not-allowed bg-zinc-300 text-white"
      : "bg-zinc-900 text-white hover:bg-black",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`border-b border-zinc-200 px-4 py-3 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, colSpan, className = "", ...rest }) {
  return (
    <td
      {...rest}
      colSpan={colSpan}
      className={`px-4 py-3 align-top whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  );
}

export default function PackedOrdersPage() {
  const { orders, loading, error, fetchAllOrders, updateOrderStatus } =
    useOrderStore();

  const [q, setQ] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [onlyShipmentOrders, setOnlyShipmentOrders] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [edit, setEdit] = useState({});
  const [printOpen, setPrintOpen] = useState({});
  const [selectedIds, setSelectedIds] = useState({});
  const [bulkShipping, setBulkShipping] = useState(false);

  useEffect(() => {
    const run = async () => {
      await fetchAllOrders({
        fulfillmentStatus: "packed",
        ...(onlyConfirmed ? { isConfirmed: "true" } : {}),
        ...(onlyShipmentOrders ? { orderType: "shipment" } : {}),
      });
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyConfirmed, onlyShipmentOrders, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const getShiprocketAwb = (o) => safe(o?.shipment?.shiprocket?.awb);
  const getShiprocketCourier = (o) => safe(o?.shipment?.shiprocket?.courierName);

  const beginEdit = (order) => {
    const id = order?._id;
    if (!id) return;

    setEdit((prev) => ({
      ...prev,
      [id]: prev[id] || {
        courier: getShiprocketCourier(order),
        awb: getShiprocketAwb(order),
        saving: false,
      },
    }));
  };

  const setField = (id, key, value) => {
    setEdit((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
  };

  const cancelEdit = (id) => {
    setEdit((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveShiprocket = async (order) => {
    const id = order?._id;
    if (!id) return;

    const courier = safe(edit?.[id]?.courier);
    const awb = safe(edit?.[id]?.awb);

    if (!courier || !awb) {
      alert("Courier and AWB both required.");
      return;
    }

    setEdit((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), saving: true },
    }));

    try {
      await updateOrderStatus(id, {
        shipment: {
          provider: "shiprocket",
          shiprocket: { courierName: courier, awb },
        },
        trackingDetails: {
          courierName: courier,
          trackingId: awb,
        },
      });
      refresh();
    } finally {
      setEdit((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), saving: false },
      }));
    }
  };

  const markPicked = async (id) => {
    if (!id) return;
    await updateOrderStatus(id, { fulfillmentStatus: "picked" });
    refresh();
  };

  const markShipped = async (id) => {
    if (!id) return;
    await updateOrderStatus(id, { fulfillmentStatus: "shipped" });

    setSelectedIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    refresh();
  };

  const togglePrint = (id) => {
    if (!id) return;
    setPrintOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closePrint = (id) => {
    setPrintOpen((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const filtered = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const s = safe(q).toLowerCase();

    if (!s) return list;

    return list.filter((o) => {
      const orderNumber = safe(o?.orderNumber).toLowerCase();
      const awb = getShiprocketAwb(o).toLowerCase();
      const name = safe(o?.shippingAddressSnapshot?.fullName).toLowerCase();
      const phone = safe(o?.shippingAddressSnapshot?.phone).toLowerCase();
      const city = safe(o?.shippingAddressSnapshot?.city).toLowerCase();

      return (
        orderNumber.includes(s) ||
        awb.includes(s) ||
        name.includes(s) ||
        phone.includes(s) ||
        city.includes(s)
      );
    });
  }, [orders, q]);

  const visibleOrderIds = useMemo(
    () => filtered.map((o) => String(o?._id)).filter(Boolean),
    [filtered]
  );

  const selectedCount = useMemo(
    () => visibleOrderIds.filter((id) => !!selectedIds[id]).length,
    [visibleOrderIds, selectedIds]
  );

  const allVisibleSelected = useMemo(
    () => visibleOrderIds.length > 0 && visibleOrderIds.every((id) => !!selectedIds[id]),
    [visibleOrderIds, selectedIds]
  );

  const toggleSelectOne = (id) => {
    if (!id) return;
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = { ...prev };

      if (allVisibleSelected) {
        visibleOrderIds.forEach((id) => delete next[id]);
      } else {
        visibleOrderIds.forEach((id) => {
          next[id] = true;
        });
      }

      return next;
    });
  };

  const clearSelection = () => setSelectedIds({});

  const markSelectedAsShipped = async () => {
    const ids = visibleOrderIds.filter((id) => !!selectedIds[id]);

    if (!ids.length) {
      alert("Please select at least one order.");
      return;
    }

    if (!window.confirm(`Mark ${ids.length} selected packed order(s) as shipped?`)) {
      return;
    }

    setBulkShipping(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => updateOrderStatus(id, { fulfillmentStatus: "shipped" }))
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      alert(
        failedCount > 0
          ? `${successCount} order(s) marked shipped.\n${failedCount} failed. Please refresh and retry.`
          : `${successCount} selected order(s) marked as shipped.`
      );

      clearSelection();
      refresh();
    } finally {
      setBulkShipping(false);
    }
  };

  const markAllFilteredAsShipped = async () => {
    if (!filtered.length) {
      alert("No packed orders found.");
      return;
    }

    if (!window.confirm(`Mark all ${filtered.length} filtered packed order(s) as shipped?`)) {
      return;
    }

    setBulkShipping(true);
    try {
      const results = await Promise.allSettled(
        filtered.map((o) =>
          updateOrderStatus(o?._id, { fulfillmentStatus: "shipped" })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      alert(
        failedCount > 0
          ? `${successCount} order(s) marked shipped.\n${failedCount} failed. Please refresh and retry.`
          : `${successCount} order(s) marked as shipped.`
      );

      clearSelection();
      refresh();
    } finally {
      setBulkShipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 text-zinc-950">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">Packed</h1>
            <Chip tone="accent">Shiprocket</Chip>
            {loading ? <Chip tone="warn">Loading</Chip> : <Chip tone="ok">Ready</Chip>}
            <Chip tone="neutral">{filtered.length}</Chip>
            <Chip tone="accent">Selected {selectedCount}</Chip>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Order # • Items • Payment • Courier/AWB • Status • Print
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading || bulkShipping}
          className={[
            "rounded-xl border px-4 py-2 text-sm font-bold transition",
            loading || bulkShipping
              ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-500"
              : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
          ].join(" ")}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <span className="select-none text-zinc-400">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order # / AWB / name / phone / city"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={onlyConfirmed}
                onChange={(e) => setOnlyConfirmed(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Confirmed
            </label>

            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={onlyShipmentOrders}
                onChange={(e) => setOnlyShipmentOrders(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Shipment only
            </label>
          </div>

          <div className="flex items-center justify-start gap-2 lg:justify-end">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                <b>Error:</b> {error}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500">
                Tip: click <b>Order #</b> / <b>AWB</b> to copy
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
          <SmallBtn
            onClick={toggleSelectAllVisible}
            disabled={loading || bulkShipping || filtered.length === 0}
          >
            {allVisibleSelected ? "Unselect All Visible" : "Select All Visible"}
          </SmallBtn>

          <SmallBtn
            onClick={clearSelection}
            disabled={loading || bulkShipping || selectedCount === 0}
          >
            Clear Selection
          </SmallBtn>

          <SmallBtn
            onClick={markSelectedAsShipped}
            disabled={loading || bulkShipping || selectedCount === 0}
            variant="success"
          >
            {bulkShipping ? "Updating…" : `Mark Selected as Shipped (${selectedCount})`}
          </SmallBtn>

          <SmallBtn
            onClick={markAllFilteredAsShipped}
            disabled={loading || bulkShipping || filtered.length === 0}
            variant="danger"
          >
            {bulkShipping ? "Updating…" : `Mark All Filtered as Shipped (${filtered.length})`}
          </SmallBtn>
        </div>
      </div>

      <div className="mb-3">
        <PackedBulkInvoicePrint
          orders={filtered}
          selectedIds={selectedIds}
          disabled={loading || bulkShipping}
        />
      </div>

      <div className="mb-3">
        <PackedTrackingSyncPanel
          orders={filtered}
          selectedIds={selectedIds}
          disabled={loading || bulkShipping}
          onAfterSync={async () => {
            refresh();
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            No packed orders.
          </div>
        )}

        {filtered.map((o) => {
          const id = o?._id;
          const open = !!printOpen?.[id];
          const courier = getShiprocketCourier(o);
          const awb = getShiprocketAwb(o);
          const checked = !!selectedIds[String(id)];

          return (
            <div key={id} className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelectOne(String(id))}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Select
                </label>

                <div className="text-xs text-zinc-500">{safe(o?.orderNumber) || "Order"}</div>
              </div>

              <PackedOrderRow
                variant="mobile"
                order={o}
                loading={loading || bulkShipping}
                edit={edit}
                onBeginEdit={beginEdit}
                onSetField={setField}
                onCancelEdit={cancelEdit}
                onSaveShiprocket={saveShiprocket}
                onMarkPicked={markPicked}
                onMarkShipped={markShipped}
              />

              <div className="flex justify-end">
                <SmallBtn
                  disabled={loading || bulkShipping}
                  onClick={() => togglePrint(id)}
                  variant={open ? "primary" : "ghost"}
                >
                  {open ? "Hide Print" : "Print / Invoice"}
                </SmallBtn>
              </div>

              {open && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-extrabold text-zinc-900">
                      Invoice / Packing Slip
                    </div>
                    <button
                      type="button"
                      onClick={() => closePrint(id)}
                      className="text-xs font-bold text-zinc-600 hover:underline"
                    >
                      Close
                    </button>
                  </div>

                  <OrderPrintPanel order={o} courierName={courier} trackingId={awb} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:block">
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-50">
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                <Th className="w-[56px]">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 accent-blue-600"
                    disabled={loading || bulkShipping || filtered.length === 0}
                  />
                </Th>
                <Th>Order</Th>
                <Th>Items</Th>
                <Th>Payment</Th>
                <Th>Shiprocket Courier / AWB</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {loading && filtered.length === 0 && (
                <tr>
                  <Td colSpan={7}>
                    <div className="p-5 text-sm text-zinc-500">Loading…</div>
                  </Td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <Td colSpan={7}>
                    <div className="p-5 text-sm text-zinc-500">No packed orders.</div>
                  </Td>
                </tr>
              )}

              {filtered.map((o) => {
                const id = o?._id;
                const open = !!printOpen?.[id];
                const courier = getShiprocketCourier(o);
                const awb = getShiprocketAwb(o);
                const checked = !!selectedIds[String(id)];

                return (
                  <React.Fragment key={id}>
                    <tr className="bg-white">
                      <Td className="w-[56px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOne(String(id))}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </Td>

                      <PackedOrderRow
                        variant="desktop"
                        order={o}
                        loading={loading || bulkShipping}
                        edit={edit}
                        onBeginEdit={beginEdit}
                        onSetField={setField}
                        onCancelEdit={cancelEdit}
                        onSaveShiprocket={saveShiprocket}
                        onMarkPicked={markPicked}
                        onMarkShipped={markShipped}
                      />
                    </tr>

                    <tr className="bg-white">
                      <Td colSpan={7} className="pt-0">
                        <div className="flex justify-end px-4 pb-3">
                          <SmallBtn
                            disabled={loading || bulkShipping}
                            onClick={() => togglePrint(id)}
                            variant={open ? "primary" : "ghost"}
                          >
                            {open ? "Hide Print" : "Print / Invoice"}
                          </SmallBtn>
                        </div>

                        {open && (
                          <div className="px-4 pb-4">
                            <OrderPrintPanel
                              order={o}
                              courierName={courier}
                              trackingId={awb}
                            />
                          </div>
                        )}
                      </Td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}