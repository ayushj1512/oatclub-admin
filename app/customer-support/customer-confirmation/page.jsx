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
  XCircle,
  Package,
  Truck,
  CreditCard,
  Tag,
  User,
  MapPin,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import EditableAddressCard from "@/components/orders/EditableAddressCard";

const safe = (v) => String(v ?? "").trim();
const money = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

const Badge = ({ className = "", children }) => (
  <span
    className={`text-xs px-2 py-1 rounded-full border font-semibold ${className}`}
  >
    {children}
  </span>
);

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

const ItemRow = ({ item = {} }) => {
  const snap = item.productSnapshot || {};
  const variant = item.variant || {};
  const title = safe(snap.title) || "Product";
  const thumb = safe(variant.image || snap.thumbnail || "");
  const qty = Number(item.quantity || 0);
  const price = Number(item.price || 0);
  const subtotal = Number(item.subtotal || qty * price || 0);

  const sizeAttr =
    Array.isArray(variant.attributes) &&
    variant.attributes.find((x) => safe(x.key).toLowerCase() === "size");
  const size = safe(item.selectedSize || sizeAttr?.value || "");

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-gray-200 bg-white">
      <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title} className="w-full h-full object-cover" />
        ) : (
          <Package className="text-gray-400" size={20} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-900 truncate">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          SKU: <span className="font-medium">{safe(variant.sku || snap.sku) || "-"}</span>
          {size ? (
            <>
              {" "}
              • Size: <span className="font-medium uppercase">{size}</span>
            </>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Badge className="bg-gray-50 border-gray-200 text-gray-700">
            Qty: {qty || 1}
          </Badge>
          <Badge className="bg-blue-50 border-blue-200 text-blue-700">
            ₹ {money(price)}
          </Badge>
          <Badge className="bg-green-50 border-green-200 text-green-700">
            Line: ₹ {money(subtotal)}
          </Badge>
          {item.compareAtPrice ? (
            <Badge className="bg-gray-50 border-gray-200 text-gray-600">
              MRP: ₹ {money(item.compareAtPrice)}
            </Badge>
          ) : null}
        </div>
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

  // success msg
  const [successMsg, setSuccessMsg] = useState("");

  // per-order loading (confirm + cancel)
  const [actionLoading, setActionLoading] = useState({
    confirmId: null,
    cancelId: null,
  });

  // filters
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL"); // ALL | pending | paid | failed ...
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  /**
   * ✅ filtered orders
   * NOTE: Your sample order has fulfillmentStatus = "packed" (not "processing").
   * If backend uses "packed" for COD confirmation stage, include it too.
   */
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmt ? Number(minAmt) : null;
    const max = maxAmt ? Number(maxAmt) : null;

    const fd = fromDate ? new Date(fromDate).getTime() : null;
    const td = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

    return (orders || [])
      .filter((o) => {
        if (!o) return false;

        // ✅ COD only
        if (safe(o.paymentMethod).toLowerCase() !== "cod") return false;

        // ✅ keep only "processing" OR "packed" (because your API response shows packed)
        const fs = safe(o.fulfillmentStatus).toLowerCase();
        if (!["processing", "packed"].includes(fs)) return false;

        // ✅ confirmed orders hide
        if (o.isConfirmed === true) return false;

        // search
        if (q) {
          const orderNumber = safe(o.orderNumber).toLowerCase();
          const email = safe(o.shippingAddressSnapshot?.email).toLowerCase();
          const phone = safe(o.shippingAddressSnapshot?.phone).toLowerCase();
          if (!orderNumber.includes(q) && !email.includes(q) && !phone.includes(q))
            return false;
        }

        // payment status filter
        const ps = safe(o.paymentStatus).toLowerCase();
        if (paymentStatus !== "ALL" && ps !== paymentStatus.toLowerCase()) return false;

        // amount filter
        const amt = Number(o.finalPayable || 0);
        if (min != null && !Number.isNaN(min) && amt < min) return false;
        if (max != null && !Number.isNaN(max) && amt > max) return false;

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
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, search, paymentStatus, minAmt, maxAmt, city, state, fromDate, toDate]);

  const clearFilters = () => {
    setSearch("");
    setPaymentStatus("ALL");
    setMinAmt("");
    setMaxAmt("");
    setCity("");
    setState("");
    setFromDate("");
    setToDate("");
  };

  const handleConfirm = async (orderId) => {
    try {
      setLocalError(null);
      setSuccessMsg("");
      setActionLoading((p) => ({ ...p, confirmId: orderId }));

      if (!BACKEND_URL) throw new Error("NEXT_PUBLIC_BACKEND_URL is missing");

      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error((await res.text()) || "Confirm failed");

      setSuccessMsg("✅ Order Confirmed Successfully!");
      await fetchOrders();
    } catch (e) {
      setLocalError(e?.message || "Confirm failed");
    } finally {
      setActionLoading((p) => ({ ...p, confirmId: null }));
      setTimeout(() => setSuccessMsg(""), 2500);
    }
  };

 const handleCancel = async (orderId) => {
  try {
    setLocalError(null);
    setSuccessMsg("");

    const ok = window.confirm("Are you sure you want to cancel this order?");
    if (!ok) return;

    setActionLoading((p) => ({ ...p, cancelId: orderId }));

    if (!BACKEND_URL) throw new Error("NEXT_PUBLIC_BACKEND_URL is missing");

    const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillmentStatus: "cancelled",
        reason: "cancelled_by_admin",     // ✅ IMPORTANT
        cancelledBy: "admin",             // ✅ IMPORTANT
        adminRemarks: "cancelled_by_admin", // ✅ helps fallback logic
        customerMessage: "",              // ✅ ensure customer msg not set
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Cancel failed");

    setSuccessMsg("❌ Order Cancelled (Admin)!");
    await fetchOrders();
  } catch (e) {
    setLocalError(e?.message || "Cancel failed");
  } finally {
    setActionLoading((p) => ({ ...p, cancelId: null }));
    setTimeout(() => setSuccessMsg(""), 2500);
  }
};


  return (
   <div className="min-h-screen bg-gray-50 px-2 sm:px-6 py-3 sm:py-6">
  <div className="mx-auto max-w-6xl space-y-3 sm:space-y-5">
    {/* Header */}
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-base sm:text-2xl font-extrabold text-gray-900 leading-tight">
          COD Processing
        </h1>
        <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5">
          COD + <b>processing/packed</b> • confirmed hidden
        </p>
      </div>

      <button
        onClick={fetchOrders}
        disabled={loading}
        className="shrink-0 inline-flex justify-center items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm disabled:opacity-60"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>

    {/* SUCCESS MESSAGE */}
    <AnimatePresence>
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="p-2.5 sm:p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm"
        >
          {successMsg}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Filters (mobile-compact) */}
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-2.5 sm:p-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* search (full width on mobile) */}
        <div className="relative col-span-2 lg:col-span-2">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order/email/phone"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
          />
        </div>

        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="col-span-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none"
        >
          {paymentStatusOptions.map((x) => (
            <option key={x} value={x}>
              {x === "ALL" ? "All Payment" : x}
            </option>
          ))}
        </select>

        <input
          value={minAmt}
          onChange={(e) => setMinAmt(e.target.value)}
          placeholder="Min ₹"
          inputMode="numeric"
          className="col-span-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />
        <input
          value={maxAmt}
          onChange={(e) => setMaxAmt(e.target.value)}
          placeholder="Max ₹"
          inputMode="numeric"
          className="col-span-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />

        {/* City/State side-by-side on mobile */}
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="col-span-1 lg:col-span-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State"
          className="col-span-1 lg:col-span-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />

        {/* Dates: side-by-side on mobile */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="col-span-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="col-span-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        />

        {/* Clear: full width on mobile, right aligned on lg */}
        <button
          type="button"
          onClick={clearFilters}
          className="col-span-2 lg:col-span-2 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* counts + errors (compact) */}
      <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500">
        <div>
          Showing{" "}
          <span className="font-semibold text-gray-800">{filteredOrders.length}</span>
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
              <span className="text-sm">{error || localError}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* loading / empty */}
    {loading && <div className="text-center text-gray-500 py-10">Loading orders…</div>}

    {!loading && filteredOrders.length === 0 && (
      <div className="text-center text-gray-500 py-12 bg-white border border-gray-200 rounded-2xl shadow-sm">
        ✅ No COD processing orders found.
      </div>
    )}

    {/* Orders list */}
    <div className="space-y-2.5 sm:space-y-3">
      <AnimatePresence>
        {filteredOrders.map((order, idx) => {
          const orderId = order?._id || order?.id;
          const orderIdStr = String(orderId || "");
          const oid = orderIdStr || String(order?.orderNumber || `${idx}`);

          const isExpanded = expandedId === orderIdStr;

          const ship = order?.shippingAddressSnapshot || {};
          const bill = order?.billingAddressSnapshot || {};

          const isConfirmLoading = actionLoading.confirmId === orderIdStr;
          const isCancelLoading = actionLoading.cancelId === orderIdStr;

          const shipment = order?.shipment || {};
          const shiprocket = shipment?.shiprocket || {};
          const tracking = order?.trackingDetails || {};
          const coupon = order?.coupon || {};

          return (
            <motion.div
              key={oid}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm p-2.5 sm:p-4"
            >
              {/* top row (mobile tight) */}
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="font-bold text-gray-900 text-sm sm:text-base">
                      {safe(order.orderNumber)}
                    </div>

                    <Badge className="bg-gray-100 border-gray-200 text-gray-700">
                      {safe(order.fulfillmentStatus) || "Processing"}
                    </Badge>

                    <Badge className="bg-gray-100 border-gray-200 text-gray-700">COD</Badge>

                    <Badge className="bg-blue-50 border-blue-200 text-blue-700">
                      ₹ {money(order.finalPayable)}
                    </Badge>

                    <Badge className="bg-yellow-50 border-yellow-200 text-yellow-700">
                      Not Confirmed
                    </Badge>
                  </div>

                  <div className="text-[12px] sm:text-sm text-gray-600 mt-1 break-words">
                    {safe(ship.fullName) || "Customer"} • {safe(ship.phone) || "N/A"} •{" "}
                    {safe(ship.email) || "N/A"}
                  </div>

                  <div className="text-[11px] sm:text-xs text-gray-500 mt-1">
                    Created: <b>{fmtDate(order.createdAt)}</b> • Payment:{" "}
                    <b>{safe(order.paymentStatus) || "-"}</b>
                  </div>
                </div>

                {/* actions (mobile: 2x2 grid, compact buttons) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleConfirm(orderIdStr)}
                    disabled={loading || isConfirmLoading || isCancelLoading}
                    className="col-span-1 inline-flex justify-center items-center gap-2 px-2.5 py-2 rounded-xl bg-green-600 text-white text-xs sm:text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                  >
                    {isConfirmLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span className="hidden sm:inline">Confirm</span>
                    <span className="sm:hidden">Ok</span>
                  </button>

                  <button
                    onClick={() => handleCancel(orderIdStr)}
                    disabled={loading || isCancelLoading || isConfirmLoading}
                    className="col-span-1 inline-flex justify-center items-center gap-2 px-2.5 py-2 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                  >
                    {isCancelLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    <span className="hidden sm:inline">Cancel</span>
                    <span className="sm:hidden">No</span>
                  </button>

                  <button
                    onClick={() => setExpandedId((p) => (p === orderIdStr ? null : orderIdStr))}
                    className="col-span-1 inline-flex justify-center items-center gap-2 px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-semibold hover:bg-gray-50"
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

              {/* ✅ EXPANDED DETAILS (more compact for mobile) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2.5 sm:p-4 space-y-3">
                      {/* meta: 1 col on mobile, 3 on lg */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="rounded-xl bg-white border border-gray-200 p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <User size={16} /> Customer
                          </div>
                          <div className="mt-2 text-sm text-gray-700">
                            <div className="font-semibold">
                              {safe(order?.customerId?.name) || safe(ship.fullName) || "-"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 break-words">
                              {safe(order?.customerId?.email) || safe(ship.email) || "N/A"}
                              {" • "}
                              {safe(ship.phone) || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Order Date: <b>{fmtDate(order.orderDate)}</b>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl bg-white border border-gray-200 p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <CreditCard size={16} /> Payment
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className="bg-gray-100 border-gray-200 text-gray-700">
                              {safe(order.paymentMethod) || "-"}
                            </Badge>
                            <Badge className="bg-yellow-50 border-yellow-200 text-yellow-700">
                              {safe(order.paymentStatus) || "-"}
                            </Badge>
                            <Badge className="bg-blue-50 border-blue-200 text-blue-700">
                              ₹ {money(order.finalPayable)}
                            </Badge>
                          </div>

                          <div className="mt-3 text-xs text-gray-600 space-y-1">
                            <div>
                              Subtotal: <b>₹ {money(order.subtotal)}</b>
                            </div>
                            <div>
                              Discount: <b>₹ {money(order.discount)}</b>
                            </div>
                            <div>
                              Shipping: <b>₹ {money(order.shippingFee)}</b>
                            </div>
                            <div>
                              Tax: <b>₹ {money(order.tax)}</b>
                            </div>
                            <div className="pt-1 border-t border-gray-200">
                              Total: <b>₹ {money(order.totalAmount)}</b>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl bg-white border border-gray-200 p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <Truck size={16} /> Shipment
                          </div>
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            <div>
                              Provider: <b>{safe(shipment.provider) || "-"}</b>
                            </div>
                            <div>
                              Status: <b>{safe(shipment.status) || "-"}</b>
                            </div>
                            <div>
                              AWB:{" "}
                              <b>{safe(shiprocket.awb) || safe(tracking.trackingId) || "-"}</b>
                            </div>
                            <div>
                              Courier:{" "}
                              <b>
                                {safe(shiprocket.courierName) || safe(tracking.courierName) || "-"}
                              </b>
                            </div>
                            {safe(shiprocket.trackingUrl) ? (
                              <a
                                href={safe(shiprocket.trackingUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex mt-2 text-blue-700 font-semibold hover:underline text-sm"
                              >
                                Track →
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
  <EditableAddressCard
    orderId={orderIdStr}
    type="shipping"
    address={ship}
    onRefresh={fetchOrders}
  />

  <EditableAddressCard
    orderId={orderIdStr}
    type="billing"
    address={bill}
    onRefresh={fetchOrders}
  />
</div>


                      {/* items */}
                      <div className="rounded-xl bg-white border border-gray-200 p-2.5 sm:p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <Package size={16} /> Items
                          </div>
                          <div className="text-[11px] sm:text-xs text-gray-500">
                            <b>{Number(order?.analytics?.totalItems || order?.items?.length || 0)}</b>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {(order?.items || []).map((it, i) => (
                            <ItemRow key={safe(it.lineId) || i} item={it} />
                          ))}
                        </div>
                      </div>

                      {/* optional coupon (compact, only if exists) */}
                      {safe(coupon?.code) ? (
                        <div className="rounded-xl bg-white border border-gray-200 p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <Tag size={16} /> Coupon
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className="bg-green-50 border-green-200 text-green-700">
                              {safe(coupon.code)}
                            </Badge>
                            <Badge className="bg-blue-50 border-blue-200 text-blue-700">
                              ₹ {money(coupon.discount)}
                            </Badge>
                          </div>
                        </div>
                      ) : null}

                      {/* system (compact grid) */}
                      <div className="rounded-xl bg-white border border-gray-200 p-2.5 sm:p-3">
                        <div className="text-sm font-bold text-gray-900">System</div>
                        <div className="mt-2 text-[11px] sm:text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          <div>
                            Order ID: <b className="text-gray-800">{safe(orderIdStr) || "-"}</b>
                          </div>
                          <div>
                            Created: <b className="text-gray-800">{fmtDate(order.createdAt)}</b>
                          </div>
                          <div>
                            Updated: <b className="text-gray-800">{fmtDate(order.updatedAt)}</b>
                          </div>
                          <div>
                            Confirmed: <b className="text-gray-800">{fmtDate(order.confirmedAt)}</b>
                          </div>
                          <div>
                            Source: <b className="text-gray-800">{safe(order.source) || "-"}</b>
                          </div>
                          <div>
                            Currency: <b className="text-gray-800">{safe(order.currency) || "INR"}</b>
                          </div>
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
