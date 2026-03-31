"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
} from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

/* ---------------------------------------------
   UI helpers
--------------------------------------------- */
const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-[24px] border border-neutral-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({ label, value, sub }) => (
  <Card className="p-5">
    <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
      {label}
    </div>
    <div className="mt-2 text-2xl font-semibold text-black">{value}</div>
    {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
  </Card>
);

/* ---------------------------------------------
   helpers
--------------------------------------------- */
const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));

const formatDateISO = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const getOrderRevenue = (order) =>
  toNumber(
    order?.finalPayable ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.amount ??
      0
  );

const buildCSV = (orders = []) => {
  const headers = [
    "Order Number",
    "Created At",
    "Customer Name",
    "Phone",
    "Email",
    "City",
    "State",
    "Pincode",
    "Billing State",
    "Billing Pincode",
    "Payment Method",
    "Payment Status",
    "Fulfillment Status",
    "Confirmed",
    "Final Payable",
  ];

  const rows = (orders || []).map((o) => {
    const shipping = o?.shippingAddressSnapshot || {};
    const billing = o?.billingAddressSnapshot || {};

    return [
      safe(o?.orderNumber),
      formatDateISO(o?.createdAt || o?.orderDate),
      safe(shipping?.fullName),
      safe(shipping?.phone),
      safe(shipping?.email),
      safe(shipping?.city),
      safe(shipping?.state),
      safe(shipping?.pincode),
      safe(billing?.state),
      safe(billing?.pincode),
      safe(o?.paymentMethod),
      safe(o?.paymentStatus),
      safe(o?.fulfillmentStatus),
      o?.isConfirmed ? "Yes" : "No",
      getOrderRevenue(o),
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
};

const downloadCSV = (orders = []) => {
  const csv = buildCSV(orders);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-by-location-${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ---------------------------------------------
   page
--------------------------------------------- */
export default function GetOrderByLocationPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const error = useOrderStore((s) => s.error);
const ordersMeta = useOrderStore((s) => s.ordersMeta);
  const searchOrdersByLocation = useOrderStore((s) => s.searchOrdersByLocation);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  const [pageSize] = useState(100);

  const [stateInput, setStateInput] = useState("");
  const [pincodeInput, setPincodeInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [stateFilter, setStateFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [isConfirmed, setIsConfirmed] = useState("");

  const [page, setPage] = useState(1);

  const backendFilters = useMemo(() => {
    const f = {
      page,
      limit: pageSize,
    };

    if (stateFilter) f.state = stateFilter;
    if (pincodeFilter) f.pincode = pincodeFilter;
    if (search) f.search = search;
    if (paymentMethod) f.paymentMethod = paymentMethod;
    if (fulfillmentStatus) f.fulfillmentStatus = fulfillmentStatus;
    if (isConfirmed !== "") f.isConfirmed = isConfirmed;

    return f;
  }, [
    page,
    pageSize,
    stateFilter,
    pincodeFilter,
    search,
    paymentMethod,
    fulfillmentStatus,
    isConfirmed,
  ]);

  const loadOrders = useCallback(async () => {
    try {
      await searchOrdersByLocation(backendFilters);
    } catch (e) {
      console.log("Orders By Location Fetch Error:", e);
    }
  }, [searchOrdersByLocation, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const applyFilters = useCallback(() => {
    setPage(1);
    setStateFilter(stateInput.trim());
    setPincodeFilter(pincodeInput.trim());
    setSearch(searchInput.trim());
  }, [stateInput, pincodeInput, searchInput]);

  const clearFilters = useCallback(() => {
    setPage(1);
    setStateInput("");
    setPincodeInput("");
    setSearchInput("");

    setStateFilter("");
    setPincodeFilter("");
    setSearch("");

    setPaymentMethod("");
    setFulfillmentStatus("");
    setIsConfirmed("");
  }, []);

  const refreshPage = useCallback(async () => {
    try {
      await searchOrdersByLocation({
        ...backendFilters,
        page,
        limit: pageSize,
      });
    } catch (e) {
      console.log("Refresh Orders By Location Error:", e);
    }
  }, [searchOrdersByLocation, backendFilters, page, pageSize]);

  const filteredOrders = useMemo(() => {
    let data = Array.isArray(orders) ? [...orders] : [];

    if (stateFilter) {
      const q = lower(stateFilter);
      data = data.filter((o) => {
        const shippingState = lower(o?.shippingAddressSnapshot?.state);
        const billingState = lower(o?.billingAddressSnapshot?.state);
        return shippingState === q || billingState === q;
      });
    }

    if (pincodeFilter) {
      const q = safe(pincodeFilter).trim();
      data = data.filter((o) => {
        const shippingPin = safe(o?.shippingAddressSnapshot?.pincode).trim();
        const billingPin = safe(o?.billingAddressSnapshot?.pincode).trim();
        return shippingPin === q || billingPin === q;
      });
    }

    if (search) {
      const q = lower(search);
      data = data.filter((o) => {
        const shipping = o?.shippingAddressSnapshot || {};
        const billing = o?.billingAddressSnapshot || {};

        return (
          lower(o?.orderNumber).includes(q) ||
          lower(shipping?.fullName).includes(q) ||
          lower(shipping?.phone).includes(q) ||
          lower(shipping?.email).includes(q) ||
          lower(shipping?.city).includes(q) ||
          lower(shipping?.state).includes(q) ||
          lower(shipping?.pincode).includes(q) ||
          lower(billing?.state).includes(q) ||
          lower(billing?.pincode).includes(q) ||
          lower(o?.paymentMethod).includes(q) ||
          lower(o?.paymentStatus).includes(q) ||
          lower(o?.fulfillmentStatus).includes(q)
        );
      });
    }

    return data;
  }, [orders, stateFilter, pincodeFilter, search]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + getOrderRevenue(order),
      0
    );

    const confirmedCount = filteredOrders.filter((o) => o?.isConfirmed).length;

    return {
      totalOrders,
      totalRevenue,
      confirmedCount,
    };
  }, [filteredOrders]);

  const metaPage = Number(ordersMeta?.page || page || 1);
  const totalCount = Number(ordersMeta?.totalCount || filteredOrders.length || 0);
  const hasMore =
    typeof ordersMeta?.hasMore === "boolean"
      ? ordersMeta.hasMore
      : filteredOrders.length >= pageSize;

  const onPrev = useCallback(() => {
    if (metaPage <= 1) return;
    setPage((p) => Math.max(1, p - 1));
  }, [metaPage]);

  const onNext = useCallback(() => {
    if (!hasMore) return;
    setPage((p) => p + 1);
  }, [hasMore]);

  return (
    <main className="min-h-screen bg-[#f5f5f5] px-4 py-4 sm:px-6 sm:py-6">
      <div className="space-y-5">
        {/* header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-white via-neutral-50 to-neutral-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
                  <MapPin className="h-3.5 w-3.5" />
                  Location Search
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                  Orders by State & Pincode
                </h1>

                <p className="mt-2 text-sm text-neutral-600">
                  Filter orders using state, pincode, payment mode, status and
                  quick search.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={refreshPage}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                <button
                  onClick={() => downloadCSV(filteredOrders)}
                  disabled={!filteredOrders.length}
                  className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* stats */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Matching Orders"
            value={stats.totalOrders}
            sub="Current filtered records"
          />
          <StatCard
            label="Matching Revenue"
            value={formatINR(stats.totalRevenue)}
            sub="Based on visible order set"
          />
          <StatCard
            label="Confirmed Orders"
            value={stats.confirmedCount}
            sub={`Backend total: ${totalCount}`}
          />
        </section>

        {/* filters */}
        <Card className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                State
              </label>
              <input
                type="text"
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                placeholder="Enter state"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-black outline-none transition focus:border-black focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Pincode
              </label>
              <input
                type="text"
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value)}
                placeholder="Enter pincode"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-black outline-none transition focus:border-black focus:bg-white"
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Quick Search
              </label>
              <div className="flex h-12 items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 transition focus-within:border-black focus-within:bg-white">
                <Search className="h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Order no, name, phone, email..."
                  className="w-full bg-transparent text-sm text-black outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Payment
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPage(1);
                  setPaymentMethod(e.target.value);
                }}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-black outline-none transition focus:border-black focus:bg-white"
              >
                <option value="">All</option>
                <option value="cod">COD</option>
                <option value="razorpay">Razorpay</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Fulfillment
              </label>
              <select
                value={fulfillmentStatus}
                onChange={(e) => {
                  setPage(1);
                  setFulfillmentStatus(e.target.value);
                }}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-black outline-none transition focus:border-black focus:bg-white"
              >
                <option value="">All</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="picked">Picked</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="pickup_initiated">Pickup Initiated</option>
                <option value="return_requested">Return Requested</option>
                <option value="exchange_requested">Exchange Requested</option>
                <option value="returned">Returned</option>
                <option value="refunded">Refunded</option>
                <option value="exchanged">Exchanged</option>
                <option value="cancelled">Cancelled</option>
                <option value="rto">RTO</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Confirmed
              </label>
              <select
                value={isConfirmed}
                onChange={(e) => {
                  setPage(1);
                  setIsConfirmed(e.target.value);
                }}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-black outline-none transition focus:border-black focus:bg-white"
              >
                <option value="">All</option>
                <option value="true">Confirmed</option>
                <option value="false">Not Confirmed</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search Orders
            </button>

            <button
              onClick={clearFilters}
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </Card>

        {/* error */}
        {error ? (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {safe(error)}
          </Card>
        ) : null}

        {/* loading */}
        {loading ? (
          <Card className="p-10">
            <div className="flex items-center justify-center gap-3 text-neutral-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading orders...</span>
            </div>
          </Card>
        ) : null}

        {/* list */}
        {!loading && !filteredOrders.length ? (
          <Card className="p-10">
            <div className="text-center text-sm text-neutral-500">
              No orders found for the selected location filters.
            </div>
          </Card>
        ) : null}

        {!loading && filteredOrders.length ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderRow
                key={order?._id || order?.orderNumber}
                order={order}
                onUpdated={(updated) => syncOrderInList?.(updated)}
              />
            ))}
          </div>
        ) : null}

        {/* pagination */}
        {!loading && filteredOrders.length ? (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-neutral-600">
                Page <span className="font-semibold text-black">{metaPage}</span>
                {totalCount ? (
                  <>
                    {" "}
                    · Total <span className="font-semibold text-black">{totalCount}</span>
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onPrev}
                  disabled={metaPage <= 1 || loading}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                <button
                  onClick={onNext}
                  disabled={!hasMore || loading}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}