"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";

/**
 * Route: /production/packed
 * File: app/production/packed/page.jsx
 *
 * Tailwind UI (black/white/grey + 1 accent)
 */
export default function PackedOrdersPage() {
  const { orders, loading, error, fetchAllOrders, updateOrderStatus } =
    useOrderStore();

  // Filters / UI
  const [q, setQ] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [onlyShipmentOrders, setOnlyShipmentOrders] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sorting
  const [sortKey, setSortKey] = useState("date"); // date | total | name
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

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

  const onRefresh = () => setRefreshKey((k) => k + 1);

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "-";
    }
  };

  const getAwb = (o) =>
    o?.shipment?.shiprocket?.awb ||
    o?.shipment?.xpressbees?.awb ||
    o?.trackingDetails?.trackingId ||
    "-";

  const getCourier = (o) =>
    o?.shipment?.shiprocket?.courierName ||
    o?.shipment?.xpressbees?.courierName ||
    o?.trackingDetails?.courierName ||
    "-";

  const itemsSummary = (o) => {
    const items = Array.isArray(o?.items) ? o.items : [];
    const totalQty = items.reduce(
      (sum, it) => sum + Number(it?.quantity || 0),
      0
    );
    const firstTitle =
      items?.[0]?.productSnapshot?.title || items?.[0]?.title || "Item";
    if (items.length <= 1) return `${firstTitle} × ${totalQty || 1}`;
    return `${firstTitle} + ${items.length - 1} more (qty: ${totalQty})`;
  };

  const totals = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const payable = list.reduce((s, o) => s + Number(o?.finalPayable || 0), 0);
    return { payable };
  }, [orders]);

  const filtered = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const s = String(q || "").trim().toLowerCase();

    const out = !s
      ? list
      : list.filter((o) => {
          const orderNumber = String(o?.orderNumber || "").toLowerCase();
          const name = String(
            o?.shippingAddressSnapshot?.fullName || ""
          ).toLowerCase();
          const phone = String(
            o?.shippingAddressSnapshot?.phone || ""
          ).toLowerCase();
          const city = String(
            o?.shippingAddressSnapshot?.city || ""
          ).toLowerCase();
          const awb = String(getAwb(o)).toLowerCase();

          return (
            orderNumber.includes(s) ||
            name.includes(s) ||
            phone.includes(s) ||
            city.includes(s) ||
            awb.includes(s)
          );
        });

    const dir = sortDir === "asc" ? 1 : -1;

    const sorted = [...out].sort((a, b) => {
      if (sortKey === "date") {
        const da = new Date(a?.orderDate || a?.createdAt || 0).getTime();
        const db = new Date(b?.orderDate || b?.createdAt || 0).getTime();
        return (da - db) * dir;
      }
      if (sortKey === "total") {
        const ta = Number(a?.finalPayable || 0);
        const tb = Number(b?.finalPayable || 0);
        return (ta - tb) * dir;
      }
      if (sortKey === "name") {
        const na = String(a?.shippingAddressSnapshot?.fullName || "");
        const nb = String(b?.shippingAddressSnapshot?.fullName || "");
        return na.localeCompare(nb) * dir;
      }
      return 0;
    });

    return sorted;
  }, [orders, q, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  };

  const markPicked = async (orderId) => {
    if (!orderId) return;
    await updateOrderStatus(orderId, { fulfillmentStatus: "picked" });
    onRefresh();
  };

  const markShipped = async (orderId) => {
    if (!orderId) return;
    await updateOrderStatus(orderId, { fulfillmentStatus: "shipped" });
    onRefresh();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
    } catch {}
  };

  const Chip = ({ children, tone = "neutral" }) => {
    const base =
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide";
    const map = {
      neutral: "border-zinc-200 bg-zinc-100 text-zinc-900",
      accent: "border-blue-200 bg-blue-50 text-blue-800",
      ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
      warn: "border-amber-200 bg-amber-50 text-amber-800",
      danger: "border-red-200 bg-red-50 text-red-800",
    };
    return <span className={`${base} ${map[tone] || map.neutral}`}>{children}</span>;
  };

  const SortPill = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
      ].join(" ")}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-white p-5 text-zinc-950">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Packed Orders
            </h1>
            <Chip tone="neutral">Production</Chip>
            <Chip tone="accent">Packed</Chip>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Manage packed shipments • search, sort, copy AWB, and update status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
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
      </div>

      {/* Controls */}
      <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-center">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <span className="select-none text-zinc-400">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order #, name, phone, city, AWB"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={onlyConfirmed}
                onChange={(e) => setOnlyConfirmed(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Confirmed only
            </label>

            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={onlyShipmentOrders}
                onChange={(e) => setOnlyShipmentOrders(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Shipment orders only
            </label>
          </div>

          {/* Sort */}
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <span className="text-xs font-semibold text-zinc-500">Sort:</span>
            <SortPill
              active={sortKey === "date"}
              onClick={() => toggleSort("date")}
            >
              Date{" "}
              {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </SortPill>
            <SortPill
              active={sortKey === "total"}
              onClick={() => toggleSort("total")}
            >
              Total{" "}
              {sortKey === "total" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </SortPill>
            <SortPill
              active={sortKey === "name"}
              onClick={() => toggleSort("name")}
            >
              Name{" "}
              {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </SortPill>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold text-zinc-500">Packed</div>
            <div className="mt-0.5 text-lg font-extrabold tracking-tight">
              {filtered.length}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold text-zinc-500">Total Value</div>
            <div className="mt-0.5 text-lg font-extrabold tracking-tight">
              ₹{Number(totals.payable || 0).toFixed(0)}
            </div>
          </div>

          <div className="ml-auto">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <b>Error:</b> {error}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">
                Tip: click <b>Order #</b> or <b>AWB</b> to copy
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="neutral">Showing {filtered.length} order(s)</Chip>
            {loading ? <Chip tone="warn">Loading…</Chip> : <Chip tone="ok">Ready</Chip>}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-50">
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                <Th>Order</Th>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>City</Th>
                <Th>Items</Th>
                <Th>Payment</Th>
                <Th>Total</Th>
                <Th>Courier</Th>
                <Th>AWB</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {loading && filtered.length === 0 ? (
                <tr>
                  <Td colSpan={11}>
                    <div className="p-5 text-sm text-zinc-500">
                      Loading packed orders…
                    </div>
                  </Td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <Td colSpan={11}>
                    <div className="p-5 text-sm text-zinc-500">
                      No packed orders found.
                    </div>
                  </Td>
                </tr>
              ) : null}

              {filtered.map((o) => {
                const awb = getAwb(o);
                const courier = getCourier(o);

                const name = o?.shippingAddressSnapshot?.fullName || "-";
                const phone = o?.shippingAddressSnapshot?.phone || "-";
                const city = o?.shippingAddressSnapshot?.city || "-";

                const paymentMethod = String(o?.paymentMethod || "-").toUpperCase();
                const paymentStatus = o?.paymentStatus || "-";

                return (
                  <tr
                    key={o?._id}
                    className="bg-white hover:bg-zinc-50/60"
                  >
                    {/* Order */}
                    <Td>
                      <div className="flex min-w-[190px] flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(o?.orderNumber)}
                          title="Click to copy order number"
                          className="w-fit text-sm font-extrabold underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500"
                        >
                          {o?.orderNumber || "-"}
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                          {o?.orderType === "shipment" ? (
                            <Chip tone="neutral">Split {o?.splitSuffix || "-"}</Chip>
                          ) : (
                            <Chip tone="neutral">Parent</Chip>
                          )}
                          {o?.isConfirmed ? (
                            <Chip tone="ok">Confirmed</Chip>
                          ) : (
                            <Chip tone="warn">Unconfirmed</Chip>
                          )}
                        </div>
                      </div>
                    </Td>

                    {/* Date */}
                    <Td>
                      <div className="font-mono text-xs text-zinc-800">
                        {formatDate(o?.orderDate || o?.createdAt)}
                      </div>
                    </Td>

                    {/* Customer */}
                    <Td>
                      <div className="min-w-[200px]">
                        <div className="text-sm font-bold text-zinc-900">
                          {name}
                        </div>
                        <div className="text-xs text-zinc-500">{phone}</div>
                      </div>
                    </Td>

                    {/* City */}
                    <Td>{city}</Td>

                    {/* Items */}
                    <Td>
                      <div className="max-w-[360px] truncate text-sm text-zinc-900">
                        {itemsSummary(o)}
                      </div>
                    </Td>

                    {/* Payment */}
                    <Td>
                      <div className="flex min-w-[140px] flex-col gap-1.5">
                        <Chip tone="neutral">{paymentMethod}</Chip>
                        <div className="text-xs text-zinc-500">{paymentStatus}</div>
                      </div>
                    </Td>

                    {/* Total */}
                    <Td>
                      <div className="font-mono text-sm font-extrabold text-zinc-900">
                        ₹{Number(o?.finalPayable || 0).toFixed(0)}
                      </div>
                    </Td>

                    {/* Courier */}
                    <Td>{courier}</Td>

                    {/* AWB */}
                    <Td>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(awb)}
                        title="Click to copy AWB"
                        className="w-fit font-mono text-xs font-bold underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500"
                      >
                        {awb}
                      </button>
                    </Td>

                    {/* Status */}
                    <Td>
                      <div className="flex min-w-[160px] flex-col gap-1.5">
                        <Chip tone="accent">{o?.fulfillmentStatus || "-"}</Chip>
                        <div className="text-xs text-zinc-500">
                          shipment: {o?.shipment?.status || "-"}
                        </div>
                      </div>
                    </Td>

                    {/* Actions */}
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => markPicked(o?._id)}
                          disabled={loading}
                          className={[
                            "rounded-xl border px-3 py-2 text-sm font-extrabold transition",
                            loading
                              ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-500"
                              : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
                          ].join(" ")}
                          title="Move packed → picked"
                        >
                          Picked
                        </button>

                        <button
                          type="button"
                          onClick={() => markShipped(o?._id)}
                          disabled={loading}
                          className={[
                            "rounded-xl px-3 py-2 text-sm font-extrabold transition",
                            loading
                              ? "cursor-not-allowed bg-blue-300 text-white"
                              : "bg-blue-600 text-white hover:bg-blue-700",
                          ].join(" ")}
                          title="Move packed → shipped"
                        >
                          Shipped
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Tailwind table helpers */
function Th({ children, className = "" }) {
  return (
    <th className={`px-4 py-3 whitespace-nowrap border-b border-zinc-200 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, colSpan, className = "" }) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 align-top whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  );
}
