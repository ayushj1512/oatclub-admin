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
  RadioTower,
  CheckCheck,
  Square,
  SquareCheckBig,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartBookingTable from "@/components/bluedart/BlueDartBookingTable";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const BOOKED_STATUSES = new Set([
  "booked",
  "pickup_pending",
  "pickup_scheduled",
  "picked",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

const PUSHED_STATUSES = new Set([
  "draft",
  "created",
  "order_pushed",
  "processing",
  "pending",
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

const hasShipmentIdentity = (shipment = {}) =>
  Boolean(
    safe(shipment?.awbNumber).trim() ||
    safe(shipment?.awb).trim() ||
    safe(shipment?.shipmentId).trim() ||
    safe(shipment?.shipmentIdExternal).trim() ||
    safe(shipment?.externalOrderId).trim() ||
    safe(shipment?.eshipzOrderId).trim() ||
    safe(shipment?.labelUrl).trim() ||
    safe(shipment?.trackingUrl).trim() ||
    safe(shipment?.eshipz?.awb).trim() ||
    safe(shipment?.eshipz?.shipmentId).trim() ||
    safe(shipment?.eshipz?.orderId).trim() ||
    safe(shipment?.eshipz?.labelUrl).trim() ||
    safe(shipment?.eshipz?.trackingUrl).trim()
  );

const getOrderBookingState = (shipment) => {
  if (!shipment?._id) return "not_booked";

  const status = lower(shipment?.status);
  const rawStatus = lower(shipment?.rawStatus);
  const statusCode = safe(shipment?.statusCode).trim();
  const metaCode = safe(shipment?.rawCreateResponse?.meta?.code).trim();

  const isError =
    rawStatus === "error" ||
    status === "failed" ||
    statusCode === "400" ||
    statusCode === "422" ||
    statusCode === "500" ||
    metaCode === "400" ||
    metaCode === "422" ||
    metaCode === "500";

  if (isError) return "not_booked";

  if (hasShipmentIdentity(shipment)) return "booked";

  if (PUSHED_STATUSES.has(status)) return "order_pushed";

  return "not_booked";
};

const getShipmentPriorityScore = (shipment = {}) => {
  const status = lower(shipment?.status);
  const hasIdentity = hasShipmentIdentity(shipment);

  let score = 0;

  if (hasIdentity) score += 100;
  if (BOOKED_STATUSES.has(status)) score += 50;
  if (PUSHED_STATUSES.has(status)) score += 25;
  if (status === "cancelled" || status === "failed" || status === "rto") {
    score -= 100;
  }

  const updatedAt = new Date(shipment?.updatedAt || 0).getTime() || 0;
  const createdAt = new Date(shipment?.createdAt || 0).getTime() || 0;

  return score + updatedAt / 1e13 + createdAt / 1e13;
};
const StatCard = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="rounded-2xl bg-neutral-100 p-2.5 text-black">
        <Icon size={18} />
      </div>

      {hint ? (
        <span className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-500 ring-1 ring-neutral-100">
          {hint}
        </span>
      ) : null}
    </div>

    <p className="text-sm font-medium text-neutral-500">{label}</p>
    <p className="mt-2 text-3xl font-bold tracking-tight text-black">{value}</p>
  </div>
);

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
    createShipmentFromOrder,
  } = useBlueDartStore();

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("packed");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkBookingLoading, setBulkBookingLoading] = useState(false);

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
          carrierName: carrierFilter === "all" ? "" : carrierFilter,
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllOrdersAllPages, fetchShipments, carrierFilter]);

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

  const carrierOptions = useMemo(() => {
    const set = new Set();

    for (const shipment of shipments || []) {
      const carrier = safe(shipment?.carrierName || shipment?.courierName);
      if (carrier) set.add(carrier);
    }

    if (!set.size) set.add("BlueDart");

    return [...set];
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

    if (carrierFilter !== "all") {
      rows = rows.filter((order) => {
        const shipment = shipmentMap.get(
          normalizeOrderNumber(order?.orderNumber)
        );
        const carrier = safe(shipment?.carrierName || shipment?.courierName);
        return lower(carrier) === lower(carrierFilter);
      });
    }

    if (bookingFilter !== "all") {
      rows = rows.filter((order) => {
        const shipment = shipmentMap.get(
          normalizeOrderNumber(order?.orderNumber)
        );
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
    carrierFilter,
    shipmentMap,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / LOCAL_PAGE_SIZE)
  );

  useEffect(() => {
    setPage(1);
  }, [search, paymentFilter, fulfillmentFilter, bookingFilter, carrierFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * LOCAL_PAGE_SIZE;
    return filteredOrders.slice(start, start + LOCAL_PAGE_SIZE);
  }, [filteredOrders, page]);

  const selectableOrders = useMemo(() => {
    return filteredOrders.filter((order) => {
      const shipment = shipmentMap.get(normalizeOrderNumber(order?.orderNumber));
      return getOrderBookingState(shipment) === "not_booked";
    });
  }, [filteredOrders, shipmentMap]);

  const paginatedSelectableOrders = useMemo(() => {
    return paginatedOrders.filter((order) => {
      const shipment = shipmentMap.get(normalizeOrderNumber(order?.orderNumber));
      return getOrderBookingState(shipment) === "not_booked";
    });
  }, [paginatedOrders, shipmentMap]);

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
      localShipments: Array.isArray(shipments) ? shipments.length : 0,
    };
  }, [filteredOrders, shipmentMap, shipments]);

  const selectedSet = useMemo(() => new Set(selectedOrders), [selectedOrders]);

  const isSelected = useCallback(
    (orderNumber) => selectedSet.has(normalizeOrderNumber(orderNumber)),
    [selectedSet]
  );

  const toggleSelectOrder = useCallback((orderNumber) => {
    const normalized = normalizeOrderNumber(orderNumber);
    if (!normalized) return;

    setSelectedOrders((prev) =>
      prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized]
    );
  }, []);

  const handleSelectAllPage = () => {
    const pageOrderNumbers = paginatedSelectableOrders
      .map((order) => normalizeOrderNumber(order?.orderNumber))
      .filter(Boolean);

    if (!pageOrderNumbers.length) return;

    const allSelected = pageOrderNumbers.every((id) =>
      selectedOrders.includes(id)
    );

    if (allSelected) {
      setSelectedOrders((prev) =>
        prev.filter((id) => !pageOrderNumbers.includes(id))
      );
    } else {
      setSelectedOrders((prev) => [...new Set([...prev, ...pageOrderNumbers])]);
    }
  };

  const handleSelectAllOrders = () => {
    const allOrderNumbers = selectableOrders
      .map((order) => normalizeOrderNumber(order?.orderNumber))
      .filter(Boolean);

    if (!allOrderNumbers.length) return;

    const allSelected = allOrderNumbers.every((id) =>
      selectedOrders.includes(id)
    );

    setSelectedOrders(allSelected ? [] : allOrderNumbers);
  };

  const handleBulkBooking = async (type = "selected") => {
    try {
      setBulkBookingLoading(true);

      const ordersToBook =
        type === "all"
          ? selectableOrders
          : filteredOrders.filter((order) =>
            selectedOrders.includes(normalizeOrderNumber(order?.orderNumber))
          );

      if (!ordersToBook.length) {
        alert("No orders selected for booking.");
        return;
      }

      for (const order of ordersToBook) {
        try {
          await createShipmentFromOrder({
            orderId: order?._id,
            orderNumber: order?.orderNumber,

          });
        } catch (err) {
          console.error("Bulk booking failed for:", order?.orderNumber, err);
        }
      }

      await loadData();
      setSelectedOrders([]);

      alert(`${ordersToBook.length} order(s) booking triggered.`);
    } catch (error) {
      console.error(error);
      alert("Bulk booking failed.");
    } finally {
      setBulkBookingLoading(false);
    }
  };

  const loading = ordersLoading || shipmentsLoading || refreshing;
  const actionLoading = loading || bulkBookingLoading;

  const selectedOnPageCount = paginatedSelectableOrders.filter((order) =>
    selectedOrders.includes(normalizeOrderNumber(order?.orderNumber))
  ).length;

  return (
    <main className="min-h-screen space-y-6 bg-[#f6f6f6] p-4 sm:p-6">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-3xl bg-black p-3 text-white shadow-sm">
              <PackageCheck size={22} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-black">
                  Eshipz / BlueDart Booking
                </h1>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  Provider: eshipz
                </span>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  Carrier: BlueDart
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                Confirmed orders yahan se Eshipz partner ke through book honge.
                BlueDart sirf carrier/courier hai, backend order model me
                provider <span className="font-semibold text-black">eshipz</span>{" "}
                save hoga.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={actionLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Package}
          label="Matching Orders"
          value={stats.totalMatchingOrders}
          hint="confirmed"
        />
        <StatCard icon={CheckCircle2} label="Booked" value={stats.booked} />
        <StatCard icon={Truck} label="Pushed" value={stats.pushed} />
        <StatCard icon={Clock3} label="Not Booked" value={stats.notBooked} />
      
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order no, name, phone..."
              className="w-full rounded-2xl bg-neutral-50 px-4 py-2.5 text-sm outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Payment
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-2.5 text-sm outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
            >
              <option value="all">All</option>
              <option value="cod">COD</option>
              <option value="razorpay">Razorpay</option>
              <option value="exchange">Exchange</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Fulfillment
            </label>
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-2.5 text-sm outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
            >
              <option value="all">All</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Booking
            </label>
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-2.5 text-sm outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
            >
              <option value="all">All</option>
              <option value="booked">Booked</option>
              <option value="order_pushed">Pushed</option>
              <option value="not_booked">Not Booked</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Carrier
            </label>
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-2.5 text-sm outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
            >
              <option value="all">All</option>
              {carrierOptions.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-black">
              Bulk Booking Controls
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {selectedOrders.length} selected • {selectableOrders.length} not
              booked orders available.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllPage}
              disabled={!paginatedSelectableOrders.length || actionLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedOnPageCount === paginatedSelectableOrders.length &&
                paginatedSelectableOrders.length ? (
                <SquareCheckBig size={16} />
              ) : (
                <Square size={16} />
              )}
              Select Page
            </button>

            <button
              type="button"
              onClick={handleSelectAllOrders}
              disabled={!selectableOrders.length || actionLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SquareCheckBig size={16} />
              Select All
            </button>

            <button
              type="button"
              onClick={() => handleBulkBooking("selected")}
              disabled={!selectedOrders.length || actionLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck size={16} />
              {bulkBookingLoading ? "Booking..." : "Book Selected"} (
              {selectedOrders.length})
            </button>

            <button
              type="button"
              onClick={() => handleBulkBooking("all")}
              disabled={!selectableOrders.length || actionLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackageCheck size={16} />
              Book All ({selectableOrders.length})
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-white p-2 shadow-sm ring-1 ring-neutral-100">
        <BlueDartBookingTable
          orders={paginatedOrders}
          shipments={shipments}
          loading={actionLoading}
          selectedOrders={selectedOrders}
          onToggleSelect={toggleSelectOrder}
          isSelected={isSelected}
          getOrderBookingState={getOrderBookingState}
          normalizeOrderNumber={normalizeOrderNumber}
        />
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-neutral-100">
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
              disabled={page <= 1 || actionLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <div className="rounded-2xl bg-neutral-50 px-4 py-2 text-sm font-semibold text-black ring-1 ring-neutral-100">
              {page} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || actionLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
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