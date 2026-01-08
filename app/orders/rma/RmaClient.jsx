"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRmaStore } from "@/store/useRmaStore";
import { useOrderStore } from "@/store/orderStore";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function RmaClient() {
  const [expanded, setExpanded] = useState(null);

  // ✅ Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState(""); // YYYY-MM-DD
  const [quickRange, setQuickRange] = useState("all"); // all | today | 7d | 30d

  const { rmas, loading: rmaLoading, error: rmaError, fetchAllRmas } =
    useRmaStore();

  const { orders, loading: orderLoading, error: orderError, fetchAllOrders } =
    useOrderStore();

  const {
    products,
    loading: productLoading,
    error: productError,
    fetchProducts,
  } = useAdminProductStore();

  /* ============================================================
     FETCH DATA
  ============================================================ */
  useEffect(() => {
    fetchAllRmas();
    fetchAllOrders();
    fetchProducts({ limit: 500 });
  }, []);

  /* ============================================================
     MAP: orderId -> order
  ============================================================ */
  const orderMap = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => {
      if (o?._id) map.set(String(o._id), o);
    });
    return map;
  }, [orders]);

  /* ============================================================
     MAP: productId -> product
  ============================================================ */
  const productMap = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      if (p?._id) map.set(String(p._id), p);
    });
    return map;
  }, [products]);

  const loading = rmaLoading || orderLoading || productLoading;
  const error = rmaError || orderError || productError;

  const toggleExpand = (rmaNumber) => {
    setExpanded((prev) => (prev === rmaNumber ? null : rmaNumber));
  };

  /* ============================================================
     ✅ FILTERED RMAs (Search + Date Range + Quick Range)
  ============================================================ */
  const filteredRmas = useMemo(() => {
    if (!Array.isArray(rmas)) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let quickFrom = null;
    if (quickRange === "today") {
      quickFrom = startOfToday;
    } else if (quickRange === "7d") {
      quickFrom = new Date(now);
      quickFrom.setDate(now.getDate() - 7);
    } else if (quickRange === "30d") {
      quickFrom = new Date(now);
      quickFrom.setDate(now.getDate() - 30);
    }

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return rmas.filter((rma) => {
      const orderId = rma?.orderId;
      const linkedOrder = orderMap.get(String(orderId)) || null;

      const orderNumber = linkedOrder?.orderNumber || rma?.orderNumber || "";
      const rmaNumber = rma?.rmaNumber || "";
      const customerName =
        linkedOrder?.shippingAddressSnapshot?.fullName ||
        linkedOrder?.customerId?.name ||
        rma?.customer?.name ||
        "";

      const createdAt = rma?.createdAt ? new Date(rma.createdAt) : null;

      // ✅ Search filter
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(orderNumber).toLowerCase().includes(q) ||
        String(rmaNumber).toLowerCase().includes(q) ||
        String(customerName).toLowerCase().includes(q);

      // ✅ Date filter
      let matchesDate = true;
      if (createdAt) {
        if (quickFrom) matchesDate = createdAt >= quickFrom;
        if (from) matchesDate = matchesDate && createdAt >= from;
        if (to) {
          const endOfDay = new Date(to);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && createdAt <= endOfDay;
        }
      } else {
        // If no createdAt, keep it unless user applied date filters
        if (from || to || quickFrom) matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });
  }, [rmas, orderMap, search, fromDate, toDate, quickRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">RMA Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Click any row to view full order + RMA details.
          </p>
        </div>

        {/* Count */}
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {filteredRmas?.length || 0}
          </span>{" "}
          requests
        </div>
      </div>

      {/* ✅ Filters */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-4">
        <div className="grid md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
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

          {/* Quick Range */}
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
        </div>

        {/* Clear */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              setSearch("");
              setFromDate("");
              setToDate("");
              setQuickRange("all");
            }}
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
          ❌ {error}
        </div>
      )}

      {!loading && (!Array.isArray(filteredRmas) || filteredRmas.length === 0) && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-10 text-center">
          <p className="text-gray-600 font-medium">No RMA requests found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try changing filters or search.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && Array.isArray(filteredRmas) && filteredRmas.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="border-b border-gray-100">
                  <th className="p-4 text-left font-semibold">Order #</th>
                  <th className="p-4 text-left font-semibold">RMA #</th>
                  <th className="p-4 text-left font-semibold">Type</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Customer</th>
                  <th className="p-4 text-left font-semibold">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRmas.map((rma, index) => {
                  const orderId = rma?.orderId;
                  const linkedOrder = orderMap.get(String(orderId)) || null;

                  const customerName =
                    linkedOrder?.shippingAddressSnapshot?.fullName ||
                    linkedOrder?.customerId?.name ||
                    rma?.customer?.name ||
                    "-";

                  const isOpen = expanded === rma?.rmaNumber;

                  const fragKey =
                    rma?.rmaNumber || rma?._id || `${orderId || "order"}-${index}`;

                  const status = String(rma?.status || "-").toLowerCase();

                  const statusStyles =
                    status === "requested"
                      ? "bg-blue-50 text-blue-700 ring-blue-100"
                      : status === "approved"
                      ? "bg-green-50 text-green-700 ring-green-100"
                      : status === "rejected"
                      ? "bg-red-50 text-red-700 ring-red-100"
                      : "bg-gray-100 text-gray-700 ring-gray-200";

                  return (
                    <React.Fragment key={fragKey}>
                      {/* MAIN ROW */}
                      <tr
                        onClick={() => toggleExpand(rma?.rmaNumber)}
                        className={`cursor-pointer transition ${
                          isOpen ? "bg-blue-50/40" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="p-4 font-medium text-gray-900">
                          {linkedOrder?.orderNumber || rma?.orderNumber || "-"}
                        </td>

                        <td className="p-4 text-gray-700">{rma?.rmaNumber || "-"}</td>

                        <td className="p-4 capitalize text-gray-700">{rma?.type || "-"}</td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyles}`}
                          >
                            {rma?.status || "-"}
                          </span>
                        </td>

                        <td className="p-4 text-gray-700">{customerName}</td>

                        <td className="p-4 text-gray-500">
                          {rma?.createdAt
                            ? new Date(rma.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>

                      {/* EXPANDED ROW */}
                      {isOpen && (
                        <tr className="bg-white">
                          <td colSpan={6} className="px-6 py-5">
                            <div className="space-y-5">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900">
                                  Order & RMA Details
                                </p>
                                <span className="text-xs text-gray-500">
                                  Click row again to collapse
                                </span>
                              </div>

                              {/* Summary cards */}
                              <div className="grid md:grid-cols-3 gap-4 text-xs">
                                {/* Order */}
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4">
                                  <p className="text-gray-500">Order</p>
                                  <p className="mt-2 text-gray-900">
                                    <b>Order #:</b> {linkedOrder?.orderNumber || "-"}
                                  </p>
                                  <p className="text-gray-700">
                                    <b>Status:</b> {linkedOrder?.fulfillmentStatus || "-"}
                                  </p>
                                  <p className="text-gray-900 mt-1">
                                    <b>Total:</b>{" "}
                                    {linkedOrder?.finalPayable
                                      ? `₹${linkedOrder.finalPayable}`
                                      : "-"}
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

                              {/* Items (two columns) */}
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
                                          `${fragKey}-item-${idx}`;

                                        return (
                                          <div
                                            key={itemKey}
                                            className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-2"
                                          >
                                            <div>
                                              <p className="text-gray-900 font-medium">
                                                {title}
                                              </p>
                                              <p className="text-gray-500 text-xs">
                                                Qty: {it?.quantity || 1}
                                              </p>
                                            </div>
                                            <p className="text-gray-900 font-semibold">
                                              ₹{it?.subtotal || it?.price || 0}
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
                                          key={`${fragKey}-rmaItem-${idx}`}
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
