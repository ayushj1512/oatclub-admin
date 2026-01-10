"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const safe = (v) => String(v ?? "").trim();
const money = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

const getISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const Address = ({ a = {} }) => {
  const line1 = safe(a.line1);
  const line2 = safe(a.line2);
  const city = safe(a.city);
  const state = safe(a.state);
  const pincode = safe(a.pincode);
  const country = safe(a.country || "India");

  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      <div className="font-semibold text-gray-900">{safe(a.fullName) || "-"}</div>
      <div className="text-xs text-gray-500 mt-1">
        {safe(a.phone) ? `${a.phone}` : "N/A"} • {safe(a.email) || "N/A"}
      </div>

      <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
        <div>{[line1, line2].filter(Boolean).join(", ") || "-"}</div>
        <div>
          {[city, state].filter(Boolean).join(", ")}
          {pincode ? ` - ${pincode}` : ""}
        </div>
        <div>{country}</div>
      </div>
    </div>
  );
};

export default function CustomerConfirmationPage() {
  const { orders, loading, error, fetchAllOrders } = useOrderStore();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // expanded order
  const [expandedId, setExpandedId] = useState(null);

  // local error
  const [localError, setLocalError] = useState(null);

  // per-order loading
  const [actionLoading, setActionLoading] = useState({ confirmId: null, packedId: null });

  // filters
  const [search, setSearch] = useState("");
  const [confirmFilter, setConfirmFilter] = useState("ALL"); // ALL | CONFIRMED | NOT_CONFIRMED
  const [paymentStatus, setPaymentStatus] = useState("ALL"); // ALL | pending | paid | failed ...
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // fetch
  const fetchOrders = useCallback(async () => {
    try {
      setLocalError(null);
      await fetchAllOrders();
    } catch (e) {
      setLocalError(e?.message || "Failed to fetch orders");
    }
  }, [fetchAllOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // options for dropdown from data
  const paymentStatusOptions = useMemo(() => {
    const set = new Set();
    (orders || []).forEach((o) => {
      if (!o) return;
      set.add(safe(o.paymentStatus).toLowerCase() || "pending");
    });
    return ["ALL", ...Array.from(set).filter(Boolean)];
  }, [orders]);

  // filtered orders
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmt ? Number(minAmt) : null;
    const max = maxAmt ? Number(maxAmt) : null;

    const fd = fromDate ? new Date(fromDate).getTime() : null;
    const td = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

    return (orders || [])
      .filter((o) => {
        // ✅ COD + processing only
        if (safe(o.fulfillmentStatus).toLowerCase() !== "processing") return false;
        if (safe(o.paymentMethod).toLowerCase() !== "cod") return false;

        // search
        if (q) {
          const orderNumber = safe(o.orderNumber).toLowerCase();
          const email = safe(o.shippingAddressSnapshot?.email).toLowerCase();
          const phone = safe(o.shippingAddressSnapshot?.phone).toLowerCase();
          if (!orderNumber.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
        }

        // confirmed filter
        if (confirmFilter === "CONFIRMED" && o.isConfirmed !== true) return false;
        if (confirmFilter === "NOT_CONFIRMED" && o.isConfirmed === true) return false;

        // payment status filter
        const ps = safe(o.paymentStatus).toLowerCase();
        if (paymentStatus !== "ALL" && ps !== paymentStatus.toLowerCase()) return false;

        // amount filter
        const amt = Number(o.finalPayable || 0);
        if (min != null && amt < min) return false;
        if (max != null && amt > max) return false;

        // city/state filters
        const sc = safe(o.shippingAddressSnapshot?.city).toLowerCase();
        const ss = safe(o.shippingAddressSnapshot?.state).toLowerCase();
        if (city && !sc.includes(city.toLowerCase())) return false;
        if (state && !ss.includes(state.toLowerCase())) return false;

        // date range (createdAt)
        const ct = o.createdAt ? new Date(o.createdAt).getTime() : null;
        if (fd != null && ct != null && ct < fd) return false;
        if (td != null && ct != null && ct > td) return false;

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // latest first
  }, [orders, search, confirmFilter, paymentStatus, minAmt, maxAmt, city, state, fromDate, toDate]);

  const clearFilters = () => {
    setSearch("");
    setConfirmFilter("ALL");
    setPaymentStatus("ALL");
    setMinAmt("");
    setMaxAmt("");
    setCity("");
    setState("");
    setFromDate("");
    setToDate("");
  };

  // confirm
  const handleConfirm = async (orderId) => {
    try {
      setLocalError(null);
      setActionLoading((p) => ({ ...p, confirmId: orderId }));

      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error((await res.text()) || "Confirm failed");
      await fetchOrders();
    } catch (e) {
      setLocalError(e?.message || "Confirm failed");
    } finally {
      setActionLoading((p) => ({ ...p, confirmId: null }));
    }
  };

  // packed
  const handlePacked = async (orderId) => {
    try {
      setLocalError(null);
      setActionLoading((p) => ({ ...p, packedId: orderId }));

      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: "packed" }),
      });

      if (!res.ok) throw new Error((await res.text()) || "Packed update failed");
      await fetchOrders();
    } catch (e) {
      setLocalError(e?.message || "Packed update failed");
    } finally {
      setActionLoading((p) => ({ ...p, packedId: null }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-6">
      <div className="mx-auto  space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              COD Processing Orders
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Only COD + fulfillmentStatus = <b>processing</b>
            </p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Filters (minimal) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* search */}
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order/email/phone"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* confirmation */}
            <select
              value={confirmFilter}
              onChange={(e) => setConfirmFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none"
            >
              <option value="ALL">All Confirm</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="NOT_CONFIRMED">Not Confirmed</option>
            </select>

            {/* payment status */}
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none"
            >
              {paymentStatusOptions.map((x) => (
                <option key={x} value={x}>
                  {x === "ALL" ? "All Payment" : x}
                </option>
              ))}
            </select>

            {/* amount range */}
            <input
              value={minAmt}
              onChange={(e) => setMinAmt(e.target.value)}
              placeholder="Min ₹"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
            />
            <input
              value={maxAmt}
              onChange={(e) => setMaxAmt(e.target.value)}
              placeholder="Max ₹"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
            />

            {/* city/state */}
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none md:col-span-2"
            />
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none md:col-span-2"
            />

            {/* date range */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
            />

            <button
              type="button"
              onClick={clearFilters}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 md:col-span-2"
            >
              Clear Filters
            </button>
          </div>

          {/* counts + errors */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
            <div>
              Showing{" "}
              <span className="font-semibold text-gray-800">{filteredOrders.length}</span>{" "}
              orders
            </div>

            <AnimatePresence>
              {(error || localError) && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-start gap-2 text-red-700"
                >
                  <AlertTriangle size={16} className="mt-0.5" />
                  <span>{error || localError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* loading / empty */}
        {loading && <div className="text-center text-gray-500 py-12">Loading orders…</div>}

        {!loading && filteredOrders.length === 0 && (
          <div className="text-center text-gray-500 py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
            ✅ No COD processing orders found.
          </div>
        )}

        {/* Orders list */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredOrders.map((order, idx) => {
              const orderId = order?._id || order?.id;
              const oid = String(orderId || `${order?.orderNumber}-${idx}`);
              const isExpanded = expandedId === orderId;

              const ship = order?.shippingAddressSnapshot || {};
              const bill = order?.billingAddressSnapshot || {};
              const isConfirmed = order?.isConfirmed === true;

              const isConfirmLoading = actionLoading.confirmId === orderId;
              const isPackedLoading = actionLoading.packedId === orderId;

              return (
                <motion.div
                  key={oid}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4"
                >
                  {/* top row */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-bold text-gray-900">{safe(order.orderNumber)}</div>

                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 font-semibold">
                          Processing
                        </span>

                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 font-semibold">
                          COD
                        </span>

                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                          ₹ {money(order.finalPayable)}
                        </span>

                        {isConfirmed ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold">
                            Confirmed
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 font-semibold">
                            Not Confirmed
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mt-1">
                        {safe(ship.fullName) || "Customer"} • {safe(ship.phone) || "N/A"} •{" "}
                        {safe(ship.email) || "N/A"}
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        Created: <b>{fmtDate(order.createdAt)}</b> • Payment:{" "}
                        <b>{safe(order.paymentStatus) || "-"}</b>
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex flex-wrap gap-2">
                      {!isConfirmed ? (
                        <button
                          onClick={() => handleConfirm(orderId)}
                          disabled={loading || isConfirmLoading}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                        >
                          {isConfirmLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          Confirm
                        </button>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold cursor-not-allowed"
                        >
                          ✅ Confirmed
                        </button>
                      )}

                      <button
                        onClick={() => handlePacked(orderId)}
                        disabled={loading || !isConfirmed || isPackedLoading}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                      >
                        {isPackedLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ArrowRight size={16} />
                        )}
                        Packed
                      </button>

                      <button
                        onClick={() => setExpandedId((p) => (p === orderId ? null : orderId))}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50"
                      >
                        {isExpanded ? (
                          <>
                            Hide <ChevronUp size={16} />
                          </>
                        ) : (
                          <>
                            View <ChevronDown size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* expanded */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Order meta */}
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="text-xs font-bold text-gray-700 uppercase">
                              Order Info
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                              <div>
                                <b>Order ID:</b> {safe(orderId)}
                              </div>
                              <div>
                                <b>Final Payable:</b> ₹ {money(order.finalPayable)}
                              </div>
                              <div>
                                <b>Subtotal:</b> ₹ {money(order.subtotal)}
                              </div>
                              <div>
                                <b>Discount:</b> ₹ {money(order.discount)}
                              </div>
                              <div>
                                <b>Total Amount:</b> ₹ {money(order.totalAmount)}
                              </div>
                              <div>
                                <b>Order Date:</b> {fmtDate(order.orderDate || order.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* shipping */}
                          <div className="rounded-xl border border-gray-200 p-4">
                            <div className="text-xs font-bold text-gray-700 uppercase">
                              Shipping Address
                            </div>
                            <div className="mt-2">
                              <Address a={ship} />
                            </div>
                          </div>

                          {/* billing */}
                          <div className="rounded-xl border border-gray-200 p-4">
                            <div className="text-xs font-bold text-gray-700 uppercase">
                              Billing Address
                            </div>
                            <div className="mt-2">
                              <Address a={bill} />
                            </div>
                          </div>
                        </div>

                        {/* products */}
                        <div className="mt-4 rounded-xl border border-gray-200 p-4">
                          <div className="text-xs font-bold text-gray-700 uppercase">
                            Products ({order.items?.length || 0})
                          </div>

                          <div className="mt-3 space-y-3">
                            {(order.items || []).map((it, i) => {
                              const snap = it?.productSnapshot || {};
                              const variant = it?.variant || {};
                              const img =
                                variant?.image ||
                                snap?.thumbnail ||
                                snap?.images?.[0] ||
                                "";

                              return (
                                <div
                                  key={`${oid}-it-${i}`}
                                  className="flex gap-3 rounded-xl bg-gray-50 border border-gray-200 p-3"
                                >
                                  {img ? (
                                    <img
                                      src={img}
                                      alt={safe(snap.title)}
                                      className="h-16 w-16 rounded-lg object-cover border bg-white"
                                    />
                                  ) : (
                                    <div className="h-16 w-16 rounded-lg bg-gray-200" />
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 truncate">
                                      {safe(snap.title) || "Product"}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      SKU: {safe(variant.sku) || safe(snap.sku) || "-"}
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                      <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                                        Qty: <b>{it.quantity}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                                        Price: ₹ <b>{money(it.price)}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                                        Size: <b>{safe(it.selectedSize) || "-"}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                                        Color: <b>{safe(it.selectedColor) || "-"}</b>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* shipment */}
                        <div className="mt-4 rounded-xl border border-gray-200 p-4">
                          <div className="text-xs font-bold text-gray-700 uppercase">
                            Shipment
                          </div>
                          <div className="mt-2 text-sm text-gray-700 space-y-1">
                            <div>
                              <b>Provider:</b> {safe(order?.shipment?.provider) || "-"}
                            </div>
                            <div>
                              <b>Status:</b> {safe(order?.shipment?.status) || "-"}
                            </div>
                            <div>
                              <b>AWB:</b> {safe(order?.shipment?.shiprocket?.awb) || "-"}
                            </div>
                            <div>
                              <b>Courier:</b>{" "}
                              {safe(order?.shipment?.shiprocket?.courierName) || "-"}
                            </div>
                            <div>
                              <b>Tracking URL:</b>{" "}
                              {safe(order?.shipment?.shiprocket?.trackingUrl) || "-"}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
