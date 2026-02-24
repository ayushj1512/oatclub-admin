// src/app/production/packed/page.jsx
// ✅ Updated OrderPrintPanel import path: components\orders\OrderPrintPanel.jsx
// ✅ PackedOrderRow import path: components\production\PackedOrderRow.jsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";

import PackedOrderRow from "@/components/production/PackedOrderRow";

// ✅ FIXED PATH (as per you)
import OrderPrintPanel from "@/components/orders/OrderPrintPanel";

export default function PackedOrdersPage() {
  const { orders, loading, error, fetchAllOrders, updateOrderStatus } =
    useOrderStore();

  const [q, setQ] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [onlyShipmentOrders, setOnlyShipmentOrders] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // per-order edit state
  const [edit, setEdit] = useState({}); // { [id]: { courier:"", awb:"", saving:false } }

  // ✅ print open state per order
  const [printOpen, setPrintOpen] = useState({}); // { [id]: true/false }

  useEffect(() => {
    const run = async () => {
      const filters = {
        fulfillmentStatus: "packed",
        ...(onlyConfirmed ? { isConfirmed: "true" } : {}),
        ...(onlyShipmentOrders ? { orderType: "shipment" } : {}),
      };
      await fetchAllOrders(filters);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyConfirmed, onlyShipmentOrders, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const safe = (v) => String(v ?? "").trim();

  // ✅ Shiprocket ONLY
  const getShiprocketAwb = (o) => safe(o?.shipment?.shiprocket?.awb);
  const getShiprocketCourier = (o) => safe(o?.shipment?.shiprocket?.courierName);

  const beginEdit = (o) => {
    const id = o?._id;
    if (!id) return;
    setEdit((prev) => ({
      ...prev,
      [id]: prev[id] || {
        courier: getShiprocketCourier(o) || "",
        awb: getShiprocketAwb(o) || "",
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
      const cp = { ...prev };
      delete cp[id];
      return cp;
    });
  };

  const saveShiprocket = async (o) => {
    const id = o?._id;
    if (!id) return;

    const courier = safe(edit?.[id]?.courier);
    const awb = safe(edit?.[id]?.awb);

    if (!courier || !awb) {
      alert("Courier and AWB both required.");
      return;
    }

    setEdit((p) => ({ ...p, [id]: { ...(p[id] || {}), saving: true } }));
    try {
      await updateOrderStatus(id, {
        shipment: {
          provider: "shiprocket",
          shiprocket: {
            courierName: courier,
            awb,
          },
        },
        trackingDetails: {
          courierName: courier,
          trackingId: awb,
        },
      });
      refresh();
    } finally {
      setEdit((p) => ({ ...p, [id]: { ...(p[id] || {}), saving: false } }));
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
    refresh();
  };

  const togglePrint = (id) => {
    if (!id) return;
    setPrintOpen((p) => ({ ...p, [id]: !p[id] }));
  };

  const closePrint = (id) => {
    if (!id) return;
    setPrintOpen((p) => {
      const cp = { ...p };
      delete cp[id];
      return cp;
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

  const Chip = ({ children, tone = "neutral" }) => {
    const base =
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";
    const map = {
      neutral: "border-zinc-200 bg-zinc-100 text-zinc-900",
      accent: "border-blue-200 bg-blue-50 text-blue-900",
      ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
      warn: "border-amber-200 bg-amber-50 text-amber-800",
    };
    return (
      <span className={`${base} ${map[tone] || map.neutral}`}>{children}</span>
    );
  };

  const SmallBtn = ({ children, onClick, disabled, variant = "ghost" }) => {
    const base =
      "rounded-xl px-3 py-2 text-xs font-extrabold transition active:scale-[0.99]";
    const styles = {
      ghost: disabled
        ? "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-500"
        : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
      primary: disabled
        ? "cursor-not-allowed bg-blue-300 text-white"
        : "bg-blue-600 text-white hover:bg-blue-700",
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
  };

  return (
    <div className="min-h-screen bg-white p-4 text-zinc-950">
      {/* Top */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">Packed</h1>
            <Chip tone="accent">Shiprocket</Chip>
            {loading ? <Chip tone="warn">Loading</Chip> : <Chip tone="ok">Ready</Chip>}
            <Chip tone="neutral">{filtered.length}</Chip>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Order # • Items • Payment • Courier/AWB • Status • Print
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className={[
            "rounded-xl border px-4 py-2 text-sm font-bold transition",
            loading
              ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-500"
              : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
          ].join(" ")}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Controls */}
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
      </div>

      {/* MOBILE: Cards */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {loading && filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Loading…
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            No packed orders.
          </div>
        ) : null}

        {filtered.map((o) => {
          const id = o?._id;
          const open = !!printOpen?.[id];
          const courier = getShiprocketCourier(o);
          const awb = getShiprocketAwb(o);

          return (
            <div key={id} className="space-y-2">
              <PackedOrderRow
                variant="mobile"
                order={o}
                loading={loading}
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
                  disabled={loading}
                  onClick={() => togglePrint(id)}
                  variant={open ? "primary" : "ghost"}
                >
                  {open ? "Hide Print" : "Print / Invoice"}
                </SmallBtn>
              </div>

              {open ? (
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

                  <OrderPrintPanel
                    order={o}
                    courierName={courier}
                    trackingId={awb}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* DESKTOP: Table + expandable print panel row */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:block">
        <div className="w-full overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-50">
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                <Th>Order</Th>
                <Th>Items</Th>
                <Th>Payment</Th>
                <Th>Shiprocket Courier / AWB</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {loading && filtered.length === 0 ? (
                <tr>
                  <Td colSpan={6}>
                    <div className="p-5 text-sm text-zinc-500">Loading…</div>
                  </Td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <Td colSpan={6}>
                    <div className="p-5 text-sm text-zinc-500">
                      No packed orders.
                    </div>
                  </Td>
                </tr>
              ) : null}

              {filtered.map((o) => {
                const id = o?._id;
                const open = !!printOpen?.[id];
                const courier = getShiprocketCourier(o);
                const awb = getShiprocketAwb(o);

                return (
                  <React.Fragment key={id}>
                    <PackedOrderRow
                      variant="desktop"
                      order={o}
                      loading={loading}
                      edit={edit}
                      onBeginEdit={beginEdit}
                      onSetField={setField}
                      onCancelEdit={cancelEdit}
                      onSaveShiprocket={saveShiprocket}
                      onMarkPicked={markPicked}
                      onMarkShipped={markShipped}
                    />

                    <tr className="bg-white">
                      <Td colSpan={6} className="pt-0">
                        <div className="flex justify-end px-4 pb-3">
                          <SmallBtn
                            disabled={loading}
                            onClick={() => togglePrint(id)}
                            variant={open ? "primary" : "ghost"}
                          >
                            {open ? "Hide Print" : "Print / Invoice"}
                          </SmallBtn>
                        </div>

                        {open ? (
                          <div className="px-4 pb-4">
                            <OrderPrintPanel
                              order={o}
                              courierName={courier}
                              trackingId={awb}
                            />
                          </div>
                        ) : null}
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

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 whitespace-nowrap border-b border-zinc-200 ${className}`}
    >
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