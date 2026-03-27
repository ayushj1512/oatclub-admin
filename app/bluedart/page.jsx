"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  RefreshCcw,
  PackageCheck,
  Package,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Truck,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartBookingTable from "@/components/bluedart/BlueDartBookingTable";
import BlueDartBookingFilters from "@/components/bluedart/BlueDartBookingFilters";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const BOOKED_STATUSES = new Set([
  "created",
  "pickup_pending",
  "picked",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

const LOCAL_PAGE_SIZE = 50;

const normalizeOrderNumber = (value) => {
  const raw = safe(value).toUpperCase().trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  return `MIRAY-${digits.slice(-6).padStart(6, "0")}`;
};

const getSearchTokens = (value) => {
  const raw = safe(value).trim();
  if (!raw) return [];

  const set = new Set([lower(raw)]);
  const normalizedOrderNo = normalizeOrderNumber(raw);

  if (normalizedOrderNo) {
    set.add(lower(normalizedOrderNo));
    set.add(lower(normalizedOrderNo.replace("-", "")));
    set.add(lower(normalizedOrderNo.replace("MIRAY-", "")));
  }

  return [...set].filter(Boolean);
};

const matchesSearch = (order, query) => {
  const tokens = getSearchTokens(query);
  if (!tokens.length) return true;

  const shipping = order?.shippingAddressSnapshot || {};
  const orderNumber = safe(order?.orderNumber);
  const normalized = normalizeOrderNumber(orderNumber);

  const haystack = [
    lower(orderNumber),
    lower(normalized),
    lower(orderNumber.replace("-", "")),
    lower(normalized.replace("-", "")),
    lower(shipping?.fullName),
    lower(shipping?.phone),
    lower(shipping?.email),
    lower(shipping?.city),
    lower(shipping?.state),
    lower(shipping?.pincode),
    lower(order?.paymentMethod),
    lower(order?.fulfillmentStatus),
  ];

  return tokens.some((token) => haystack.some((value) => value.includes(token)));
};

const getShipmentPriorityScore = (shipment = {}) => {
  const status = lower(shipment?.status);
  const hasAwb = Boolean(safe(shipment?.awbNumber).trim());

  let score = 0;
  if (hasAwb) score += 100;
  if (BOOKED_STATUSES.has(status)) score += 50;
  if (status === "order_pushed") score += 25;
  if (status === "cancelled" || status === "failed") score -= 100;

  const updatedAt = new Date(shipment?.updatedAt || 0).getTime() || 0;
  const createdAt = new Date(shipment?.createdAt || 0).getTime() || 0;

  return score + updatedAt / 1e13 + createdAt / 1e13;
};

const getOrderBookingState = (shipment) => {
  if (!shipment?._id) return "not_booked";

  const status = lower(shipment?.status);
  const hasAwb = Boolean(safe(shipment?.awbNumber).trim());

  if (hasAwb || BOOKED_STATUSES.has(status)) return "booked";
  if (status === "order_pushed") return "order_pushed";

  return "not_booked";
};

export default function BlueDartPage() {
  const {
    orders,
    loading: ordersLoading,
    fetchAllOrdersAllPages,
  } = useOrderStore();

  const {
    shipments,
    listLoading: shipmentsLoading,
    fetchShipments,
  } = useBlueDartStore();

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        fetchAllOrdersAllPages({
          confirmFilter: "confirmed",
          fulfillmentStatus: ["processing", "packed"],
          limit: 200,
        }),
        fetchShipments({
          page: 1,
          limit: 2000,
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllOrdersAllPages, fetchShipments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shipmentMap = useMemo(() => {
    const map = new Map();

    for (const shipment of shipments || []) {
      const orderNumber = normalizeOrderNumber(shipment?.orderNumber);
      if (!orderNumber) continue;

      const existing = map.get(orderNumber);
      if (
        !existing ||
        getShipmentPriorityScore(shipment) >= getShipmentPriorityScore(existing)
      ) {
        map.set(orderNumber, shipment);
      }
    }

    return map;
  }, [shipments]);

  const allEligibleOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    let rows = [...allEligibleOrders];

    if (search.trim()) {
      rows = rows.filter((order) => matchesSearch(order, search));
    }

    if (paymentFilter !== "all") {
      rows = rows.filter(
        (order) => lower(order?.paymentMethod) === lower(paymentFilter)
      );
    }

    if (fulfillmentFilter !== "all") {
      rows = rows.filter(
        (order) => lower(order?.fulfillmentStatus) === lower(fulfillmentFilter)
      );
    }

    if (bookingFilter !== "all") {
      rows = rows.filter((order) => {
        const shipment = shipmentMap.get(normalizeOrderNumber(order?.orderNumber));
        return getOrderBookingState(shipment) === bookingFilter;
      });
    }

    return rows;
  }, [
    allEligibleOrders,
    search,
    paymentFilter,
    fulfillmentFilter,
    bookingFilter,
    shipmentMap,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / LOCAL_PAGE_SIZE)
  );

  useEffect(() => {
    setPage(1);
  }, [search, paymentFilter, fulfillmentFilter, bookingFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * LOCAL_PAGE_SIZE;
    return filteredOrders.slice(start, start + LOCAL_PAGE_SIZE);
  }, [filteredOrders, page]);

  const stats = useMemo(() => {
    let booked = 0;
    let pushed = 0;
    let notBooked = 0;

    for (const order of filteredOrders) {
      const shipment = shipmentMap.get(normalizeOrderNumber(order?.orderNumber));
      const state = getOrderBookingState(shipment);

      if (state === "booked") booked += 1;
      else if (state === "order_pushed") pushed += 1;
      else notBooked += 1;
    }

    return {
      totalMatchingOrders: filteredOrders.length,
      booked,
      pushed,
      notBooked,
    };
  }, [filteredOrders, shipmentMap]);

  const loading = ordersLoading || shipmentsLoading || refreshing;

  return (
    <main className="space-y-6 bg-[#f5f5f5] p-4 sm:p-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-neutral-100 p-3 text-black">
              <PackageCheck size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                BlueDart Booking
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Sirf confirmed orders dikh rahe hain. Fulfillment filter se{" "}
                <span className="font-semibold text-black">
                  all / processing / packed
                </span>{" "}
                select kar sakte ho.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2 text-black">
              <Package size={18} />
            </div>
            <p className="text-sm font-medium text-neutral-500">
              Total Matching Orders
            </p>
          </div>
          <p className="text-3xl font-bold text-black">
            {stats.totalMatchingOrders}
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2 text-black">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-sm font-medium text-neutral-500">Booked</p>
          </div>
          <p className="text-3xl font-bold text-black">{stats.booked}</p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2 text-black">
              <Truck size={18} />
            </div>
            <p className="text-sm font-medium text-neutral-500">Pushed</p>
          </div>
          <p className="text-3xl font-bold text-black">{stats.pushed}</p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2 text-black">
              <Clock3 size={18} />
            </div>
            <p className="text-sm font-medium text-neutral-500">Not Booked</p>
          </div>
          <p className="text-3xl font-bold text-black">{stats.notBooked}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order no, name, phone..."
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Payment
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black"
            >
              <option value="all">All</option>
              <option value="cod">COD</option>
              <option value="razorpay">Razorpay</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Fulfillment Status
            </label>
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black"
            >
              <option value="all">All</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Booking Status
            </label>
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black"
            >
              <option value="all">All</option>
              <option value="booked">Booked</option>
              <option value="order_pushed">Pushed</option>
              <option value="not_booked">Not Booked</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-2 shadow-sm">
        <BlueDartBookingTable
          orders={paginatedOrders}
          shipments={shipments}
          loading={loading}
        />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-600">
            Showing{" "}
            <span className="font-semibold text-black">
              {paginatedOrders.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-black">
              {filteredOrders.length}
            </span>{" "}
            results
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-semibold text-black">
              {page} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}