// app/orders/rma/RmaClient.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";

import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown"; // ✅ use this
import { useRmaStore } from "@/store/useRmaStore";
import { useOrderStore } from "@/store/orderStore";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ----------------------------
   Tiny helpers (safe)
---------------------------- */
const toStr = (v) => (v == null ? "" : String(v));
const norm = (v) => toStr(v).trim().toLowerCase();
const parseDate = (d) => {
  const dt = d ? new Date(d) : null;
  return dt && !Number.isNaN(dt.getTime()) ? dt : null;
};
const fmtDate = (d) => (d ? d.toLocaleDateString("en-IN") : "-");
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export default function RmaClient() {
  const [expanded, setExpanded] = useState(null);

  /* ----------------------------
     Filters + Sorting
  ---------------------------- */
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState(""); // YYYY-MM-DD
  const [quickRange, setQuickRange] = useState("all"); // all | today | 7d | 30d

  // ✅ easy filters
  const [statusFilter, setStatusFilter] = useState("all"); // requested | approved | rejected | ...
  const [typeFilter, setTypeFilter] = useState("all"); // exchange | return | ...
  const [sortDir, setSortDir] = useState("desc"); // createdAt

  const { rmas, loading: rmaLoading, error: rmaError, fetchAllRmas } = useRmaStore();
  const {
    orders,
    loading: orderLoading,
    error: orderError,
    fetchAllOrders,
  } = useOrderStore();
  const {
    products,
    loading: productLoading,
    error: productError,
    fetchProducts,
  } = useAdminProductStore();

  /* ----------------------------
     Fetch data
  ---------------------------- */
  useEffect(() => {
    fetchAllRmas();
    fetchAllOrders();
    fetchProducts({ limit: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------
     Maps for fast lookup
  ---------------------------- */
  const orderMap = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => o?._id && map.set(String(o._id), o));
    return map;
  }, [orders]);

  const productMap = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => p?._id && map.set(String(p._id), p));
    return map;
  }, [products]);

  const loading = rmaLoading || orderLoading || productLoading;
  const error = rmaError || orderError || productError;

  /* ----------------------------
     Expand / Collapse row
  ---------------------------- */
  const toggleExpand = useCallback((key) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  /* ----------------------------
     Quick range start
  ---------------------------- */
  const quickFrom = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    if (quickRange === "today") return today;

    if (quickRange === "7d") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return d;
    }

    if (quickRange === "30d") {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return d;
    }

    return null;
  }, [quickRange]);

  /* ----------------------------
     Badge styles (requested/exchange updated)
---------------------------- */
  const statusBadge = (statusRaw) => {
    const st = norm(statusRaw);
    if (st === "requested") return "bg-purple-50 text-purple-700 ring-purple-100";
    if (st === "approved") return "bg-green-50 text-green-700 ring-green-100";
    if (st === "rejected") return "bg-red-50 text-red-700 ring-red-100";
    return "bg-gray-100 text-gray-700 ring-gray-200";
  };

  const typeBadge = (typeRaw) => {
    const tp = norm(typeRaw);
    if (tp === "exchange") return "bg-amber-50 text-amber-800 ring-amber-100";
    if (tp === "return") return "bg-sky-50 text-sky-700 ring-sky-100";
    return "bg-gray-100 text-gray-700 ring-gray-200";
  };

  /* ============================================================
     ✅ FILTER + SORT (createdAt)
  ============================================================ */
  const filteredRmas = useMemo(() => {
    if (!Array.isArray(rmas)) return [];

    const q = norm(search);
    const from = fromDate ? parseDate(fromDate) : null;
    const to = toDate ? endOfDay(parseDate(toDate) || new Date(toDate)) : null;

    return rmas
      .filter((rma) => {
        const linkedOrder = orderMap.get(String(rma?.orderId)) || null;

        const orderNumber = toStr(linkedOrder?.orderNumber || rma?.orderNumber);
        const rmaNumber = toStr(rma?.rmaNumber);
        const customerName = toStr(
          linkedOrder?.shippingAddressSnapshot?.fullName ||
            linkedOrder?.customerId?.name ||
            rma?.customer?.name
        );

        const createdAt = parseDate(rma?.createdAt);

        // ✅ search
        const matchesSearch =
          !q ||
          norm(orderNumber).includes(q) ||
          norm(rmaNumber).includes(q) ||
          norm(customerName).includes(q);

        // ✅ status filter (RMA status)
        const st = norm(rma?.status);
        const matchesStatus = statusFilter === "all" || st === norm(statusFilter);

        // ✅ type filter
        const tp = norm(rma?.type);
        const matchesType = typeFilter === "all" || tp === norm(typeFilter);

        // ✅ date filter
        let matchesDate = true;
        if (createdAt) {
          if (quickFrom) matchesDate = createdAt >= quickFrom;
          if (from) matchesDate = matchesDate && createdAt >= from;
          if (to) matchesDate = matchesDate && createdAt <= to;
        } else {
          if (quickFrom || from || to) matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesType && matchesDate;
      })
      .sort((a, b) => {
        const ta = parseDate(a?.createdAt)?.getTime?.() ?? 0;
        const tb = parseDate(b?.createdAt)?.getTime?.() ?? 0;
        return sortDir === "asc" ? ta - tb : tb - ta;
      });
  }, [rmas, orderMap, search, fromDate, toDate, quickFrom, statusFilter, typeFilter, sortDir]);

  /* ----------------------------
     Filter options (from data)
  ---------------------------- */
  const statusOptions = useMemo(() => {
    const set = new Set();
    (rmas || []).forEach((r) => {
      const v = norm(r?.status);
      if (v) set.add(v);
    });
    return ["all", ...Array.from(set).sort()];
  }, [rmas]);

  const typeOptions = useMemo(() => {
    const set = new Set();
    (rmas || []).forEach((r) => {
      const v = norm(r?.type);
      if (v) set.add(v);
    });
    return ["all", ...Array.from(set).sort()];
  }, [rmas]);

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setQuickRange("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortDir("desc");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">RMA Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Click any row to view full order + RMA details. You can also set order status to{" "}
            <b>Pickup Initiated</b>.
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{filteredRmas.length}</span>{" "}
          requests
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-4">
        <div className="grid lg:grid-cols-8 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-500">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order #, RMA #, Customer..."
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* From */}
          <div>
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* To */}
          <div>
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Quick */}
          <div>
            <label className="text-xs text-gray-500">Quick</label>
            <select
              value={quickRange}
              onChange={(e) => setQuickRange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Status (RMA) */}
          <div>
            <label className="text-xs text-gray-500">RMA Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-blue-200"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-gray-500">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-blue-200"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs text-gray-500">Sort</label>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="desc">Created: Newest</option>
              <option value="asc">Created: Oldest</option>
            </select>
          </div>
        </div>

        {/* Clear */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={clearFilters}
            className="text-xs rounded-lg px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          Loading RMA requests...
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          ❌ {toStr(error)}
        </div>
      )}

      {!loading && filteredRmas.length === 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-10 text-center">
          <p className="text-gray-600 font-medium">No RMA requests found</p>
          <p className="text-sm text-gray-500 mt-1">Try changing filters or search.</p>
        </div>
      )}

      {/* Table */}
      {!loading && filteredRmas.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="border-b border-gray-100">
                  <th className="p-4 text-left font-semibold w-10" />
                  <th className="p-4 text-left font-semibold">Order #</th>
                  <th className="p-4 text-left font-semibold">RMA #</th>
                  <th className="p-4 text-left font-semibold">Type</th>
                  <th className="p-4 text-left font-semibold">RMA Status</th>
                  <th className="p-4 text-left font-semibold">Customer</th>
                  <th className="p-4 text-left font-semibold">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRmas.map((rma, index) => {
                  const linkedOrder = orderMap.get(String(rma?.orderId)) || null;

                  const customerName =
                    linkedOrder?.shippingAddressSnapshot?.fullName ||
                    linkedOrder?.customerId?.name ||
                    rma?.customer?.name ||
                    "-";

                  const rowKey =
                    rma?.rmaNumber || rma?._id || `${rma?.orderId || "order"}-${index}`;
                  const isOpen = expanded === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      {/* MAIN ROW */}
                      <tr
                        onClick={() => toggleExpand(rowKey)}
                        className={`cursor-pointer transition ${
                          isOpen ? "bg-blue-50/40" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="p-4 align-middle">
                          <ChevronDown
                            size={18}
                            className={`text-gray-500 transition-transform ${
                              isOpen ? "rotate-180" : "rotate-0"
                            }`}
                          />
                        </td>

                        <td className="p-4 font-medium text-gray-900">
                          {linkedOrder?.orderNumber || rma?.orderNumber || "-"}
                        </td>

                        <td className="p-4 text-gray-700">{rma?.rmaNumber || "-"}</td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 capitalize ${typeBadge(
                              rma?.type
                            )}`}
                          >
                            {rma?.type || "-"}
                          </span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 capitalize ${statusBadge(
                              rma?.status
                            )}`}
                          >
                            {rma?.status || "-"}
                          </span>
                        </td>

                        <td className="p-4 text-gray-700">{customerName}</td>

                        <td className="p-4 text-gray-500">
                          {fmtDate(parseDate(rma?.createdAt))}
                        </td>
                      </tr>

                      {/* EXPANDED ROW */}
                      {isOpen && (
                        <tr className="bg-white">
                          <td colSpan={7} className="px-6 py-5">
                            <div className="space-y-5">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900">
                                  Order, RMA & Pickup Status
                                </p>
                                <span className="text-xs text-gray-500">
                                  Click row again to collapse
                                </span>
                              </div>

                              {/* Summary cards */}
                              <div className="grid lg:grid-cols-4 gap-4 text-xs">
                                {/* Order */}
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
                                  <p className="text-gray-500">Order</p>
                                  <p className="mt-2 text-gray-900">
                                    <b>Order #:</b> {linkedOrder?.orderNumber || "-"}
                                  </p>
                                  <p className="text-gray-700">
                                    <b>Fulfillment:</b> {linkedOrder?.fulfillmentStatus || "-"}
                                  </p>
                                  <p className="text-gray-900 mt-1">
                                    <b>Total:</b>{" "}
                                    {linkedOrder?.finalPayable != null
                                      ? `₹${linkedOrder.finalPayable}`
                                      : "-"}
                                  </p>
                                </div>

                                {/* ✅ UPDATE ORDER STATUS (Pickup Initiated available) */}
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
                                  <p className="text-gray-500">Update Order Status</p>
                                  <div className="mt-2">
                                    <OrderStatusDropdown
                                      orderId={linkedOrder?._id}
                                      currentStatus={linkedOrder?.fulfillmentStatus}
                                      onUpdated={() => {
                                        // ✅ refresh list so UI shows updated fulfillmentStatus
                                        fetchAllOrders();
                                      }}
                                    />
                                  </div>
                                  <p className="mt-2 text-[11px] text-gray-500">
                                    Set this to <b>pickup initiated</b> when reverse pickup is started.
                                  </p>
                                </div>

                                {/* Shipping */}
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
                                  <p className="text-gray-500">Shipping</p>
                                  <p className="mt-2 text-gray-900 font-medium">
                                    {linkedOrder?.shippingAddressSnapshot?.fullName || "-"}
                                  </p>
                                  <p className="text-gray-700">
                                    {linkedOrder?.shippingAddressSnapshot?.phone || "-"}
                                  </p>
                                  <p className="text-gray-700">
                                    {linkedOrder?.shippingAddressSnapshot?.line1 || "-"}
                                  </p>
                                  <p className="text-gray-700">
                                    {linkedOrder?.shippingAddressSnapshot?.city || "-"}{" "}
                                    {linkedOrder?.shippingAddressSnapshot?.state || "-"}{" "}
                                    {linkedOrder?.shippingAddressSnapshot?.pincode || "-"}
                                  </p>
                                </div>

                                {/* RMA */}
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
                                  <p className="text-gray-500">RMA</p>
                                  <p className="mt-2 text-gray-900">
                                    <b>Reason:</b> {rma?.reason || "-"}
                                  </p>
                                  <p className="text-gray-700">
                                    <b>Note:</b> {rma?.customerNote || "-"}
                                  </p>

                                  {rma?.fee?.amount > 0 && (
                                    <p className="mt-2 text-blue-700 font-medium">
                                      Exchange Fee: ₹{rma.fee.amount} ({rma.fee.status})
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Items */}
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Order items */}
                                <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
                                  <p className="text-xs font-semibold text-gray-900 mb-3">
                                    Order Items
                                  </p>

                                  {!linkedOrder?.items?.length ? (
                                    <p className="text-xs text-gray-500">
                                      No order items found.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {linkedOrder.items.map((it, idx) => {
                                        const pid = it?.productId;
                                        const prod = pid ? productMap.get(String(pid)) : null;

                                        const title =
                                          it?.productSnapshot?.title ||
                                          prod?.title ||
                                          "Item";

                                        const itemKey =
                                          it?.lineId ||
                                          it?._id ||
                                          `${rowKey}-orderItem-${idx}`;

                                        return (
                                          <div
                                            key={itemKey}
                                            className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-2"
                                          >
                                            <div>
                                              <p className="text-gray-900 font-medium">{title}</p>
                                              <p className="text-gray-500 text-xs">
                                                Qty: {it?.quantity || 1}
                                              </p>
                                            </div>
                                            <p className="text-gray-900 font-semibold">
                                              ₹{it?.subtotal ?? it?.price ?? 0}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* RMA items */}
                                <div className="rounded-xl bg-white ring-1 ring-gray-100 p-4">
                                  <p className="text-xs font-semibold text-gray-900 mb-3">
                                    RMA Items
                                  </p>

                                  {!rma?.items?.length ? (
                                    <p className="text-xs text-gray-500">
                                      No RMA items found.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {rma.items.map((it, idx) => (
                                        <div
                                          key={`${rowKey}-rmaItem-${idx}`}
                                          className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-2"
                                        >
                                          <div>
                                            <p className="text-gray-900 font-medium">
                                              {it?.title || "Item"}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                              Qty: {it?.quantity || 1}
                                            </p>
                                          </div>
                                          <p className="text-gray-600 text-xs">
                                            {it?.variantSku ? `SKU: ${it.variantSku}` : "-"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
