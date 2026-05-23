"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
} from "lucide-react";

import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}
  >
    {children}
  </div>
);

const ymdInTZ = (date = new Date(), timeZone = IST_TZ) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";

  return `${y}-${m}-${d}`;
};

const todayYMD_IST = () => ymdInTZ(new Date(), IST_TZ);

const yesterdayYMD_IST = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymdInTZ(d, IST_TZ);
};

const istStartISO = (ymd) =>
  ymd ? `${ymd}T00:00:00.000${IST_OFFSET}` : "";

const istEndISO = (ymd) =>
  ymd ? `${ymd}T23:59:59.999${IST_OFFSET}` : "";

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

const getOrderRevenue = (order) =>
  toNumber(
    order?.finalPayable ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.amount ??
      0
  );

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
};

function PaginationBar({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  loading,
  onRefresh,
  onPageChange,
  totalRevenue,
}) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
          {" • "}
          Total <span className="font-semibold">{totalCount}</span> orders
          {" • "}
          Revenue{" "}
          <span className="font-semibold">
            {formatINR(totalRevenue)}
          </span>
          <span className="text-gray-400">
            {" "}
            • {pageSize} per page
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Refreshing...
              </span>
            ) : (
              "Refresh"
            )}
          </button>

          <button
            disabled={!canGoPrev || loading}
            onClick={() =>
              onPageChange(Math.max(currentPage - 1, 1))
            }
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              !canGoPrev || loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <button
            disabled={!canGoNext || loading}
            onClick={() =>
              onPageChange(Math.min(currentPage + 1, totalPages))
            }
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              !canGoNext || loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:opacity-90"
            }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {getPaginationItems(currentPage, totalPages).map((item, idx) =>
          item === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-3 py-2 text-sm text-gray-500"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              disabled={loading}
              className={`min-w-[42px] px-3 py-2 rounded-xl text-sm font-semibold transition ${
                currentPage === item
                  ? "bg-black text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function ConfirmedOrdersPage({
  mode = "confirmed",
}) {
  const isUnconfirmed = mode === "unconfirmed";

  const pageTitle = isUnconfirmed
    ? "Unconfirmed Orders"
    : "Confirmed Orders";

  const pageDesc = isUnconfirmed
    ? "Track orders still waiting for confirmation."
    : "View and manage confirmed orders.";

  const confirmFilterValue = isUnconfirmed
    ? "not_confirmed"
    : "confirmed";

  const exportName = isUnconfirmed
    ? "unconfirmed-orders"
    : "confirmed-orders";

  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);

  const fetchAllOrders = useOrderStore(
    (s) => s.fetchAllOrders
  );

  const syncOrderInList = useOrderStore(
    (s) => s._syncOrderInList
  );

  const [hasLoadedOnce, setHasLoadedOnce] =
    useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [quickDate, setQuickDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 100;

  const applySearch = useCallback(() => {
    setCurrentPage(1);
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setQuickDate("");
    setStartDate("");
    setEndDate("");
    setPaymentMethod("");
    setStatus("");
    setPriority("");
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    if (quickDate === "today") {
      const t = todayYMD_IST();
      setStartDate(t);
      setEndDate(t);
      return;
    }

    if (quickDate === "yesterday") {
      const y = yesterdayYMD_IST();
      setStartDate(y);
      setEndDate(y);
      return;
    }

    setStartDate("");
    setEndDate("");
  }, [quickDate]);

  const backendFilters = useMemo(() => {
    const f = {
      confirmFilter: confirmFilterValue,
      page: currentPage,
      limit: pageSize,
    };

    if (search) f.customerName = search;

    if (startDate) {
      f.startDate = startDate;
      f.startAt = istStartISO(startDate);
      f.tz = IST_TZ;
    }

    if (endDate) {
      f.endDate = endDate;
      f.endAt = istEndISO(endDate);
      f.tz = IST_TZ;
    }

    if (paymentMethod) {
      f.paymentMethod = paymentMethod;
    }

    if (status) {
      f.fulfillmentStatus = status;
    }

    if (priority) {
      f.priority = priority;
    }

    return f;
  }, [
    search,
    startDate,
    endDate,
    paymentMethod,
    status,
    priority,
    currentPage,
    confirmFilterValue,
  ]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrders(backendFilters);
    } finally {
      setHasLoadedOnce(true);
    }
  }, [fetchAllOrders, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sortedOrders = useMemo(() => {
    return [...(orders || [])].sort((a, b) => {
      const ad = new Date(
        a?.createdAt || a?.orderDate || 0
      ).getTime();

      const bd = new Date(
        b?.createdAt || b?.orderDate || 0
      ).getTime();

      return bd - ad;
    });
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return sortedOrders.reduce((sum, order) => {
      return sum + getOrderRevenue(order);
    }, 0);
  }, [sortedOrders]);

  const totalCount = toNumber(ordersMeta?.totalCount);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize)
  );

  const currentMetaPage =
    toNumber(ordersMeta?.page) || currentPage;

  const chips = [
    { key: "", label: "All Status" },
    { key: "processing", label: "Processing" },
    { key: "packed", label: "Packed" },
    { key: "picked", label: "Picked" },
    { key: "shipped", label: "Shipped" },
    {
      key: "out_for_delivery",
      label: "Out for Delivery",
    },
    { key: "delivered", label: "Delivered" },
    { key: "rto", label: "RTO" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-10">
      <div className="mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {pageTitle}
            </h1>

            <p className="text-gray-500 mt-1">
              {pageDesc}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`px-3 py-1 rounded-full font-semibold ${
                  isUnconfirmed
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {totalCount || sortedOrders.length}{" "}
                {isUnconfirmed
                  ? "Unconfirmed"
                  : "Confirmed"}
              </span>

              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                Revenue: {formatINR(totalRevenue)}
              </span>

              <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
                Page {currentMetaPage} of {totalPages}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 w-full md:w-80">
              <Search
                size={18}
                className="text-gray-400"
              />

              <input
                type="text"
                placeholder="Search order / customer..."
                className="outline-none w-full bg-transparent text-sm"
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && applySearch()
                }
              />
            </div>

            <button
              onClick={applySearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-semibold shadow-sm hover:bg-gray-50"
            >
              <Search size={18} />
              Search
            </button>

            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-sm font-semibold shadow-sm hover:bg-gray-200"
            >
              Clear
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        <Card>
          <div className="grid md:grid-cols-4 gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Quick Date
              </label>

              <select
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none"
                value={quickDate}
                onChange={(e) => {
                  setCurrentPage(1);
                  setQuickDate(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="today">Today</option>
                <option value="yesterday">
                  Yesterday
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Start Date
              </label>

              <input
                type="date"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none"
                value={startDate}
                onChange={(e) => {
                  setCurrentPage(1);
                  setQuickDate("");
                  setStartDate(e.target.value);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                End Date
              </label>

              <input
                type="date"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none"
                value={endDate}
                onChange={(e) => {
                  setCurrentPage(1);
                  setQuickDate("");
                  setEndDate(e.target.value);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Payment Method
              </label>

              <select
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none"
                value={paymentMethod}
                onChange={(e) => {
                  setCurrentPage(1);
                  setPaymentMethod(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="cod">COD</option>
                <option value="razorpay">
                  Razorpay
                </option>
                <option value="exchange">
                  Exchange
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Priority
              </label>

              <select
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none"
                value={priority}
                onChange={(e) => {
                  setCurrentPage(1);
                  setPriority(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="normal">
                  Normal
                </option>
                <option value="medium">
                  Medium
                </option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Confirmation
              </label>

              <input
                value={
                  isUnconfirmed
                    ? "Not confirmed only"
                    : "Confirmed only"
                }
                disabled
                className={`w-full mt-2 px-3 py-2.5 rounded-xl border outline-none font-semibold cursor-not-allowed ${
                  isUnconfirmed
                    ? "bg-amber-50 border-amber-100 text-amber-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                }`}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key || "all"}
                onClick={() => {
                  setCurrentPage(1);

                  setStatus((prev) =>
                    prev === chip.key ? "" : chip.key
                  );
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                  status === chip.key
                    ? "bg-black text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <PaginationBar
              currentPage={currentMetaPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              loading={loading}
              onRefresh={loadOrders}
              onPageChange={setCurrentPage}
              totalRevenue={totalRevenue}
            />
          </div>
        </Card>

        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    Order
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Payment Status
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Method
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Fulfillment
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Date
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading && !hasLoadedOnce ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-14 text-center text-gray-500"
                    >
                      <div className="inline-flex items-center gap-2">
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Loading{" "}
                        {isUnconfirmed
                          ? "unconfirmed"
                          : "confirmed"}{" "}
                        orders...
                      </div>
                    </td>
                  </tr>
                ) : sortedOrders.length ? (
                  sortedOrders.map((order, idx) => (
                    <OrderRow
                      key={String(
                        order?._id ||
                          order?.orderNumber ||
                          idx
                      )}
                      order={order}
                      onUpdated={syncOrderInList}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-gray-500"
                    >
                      No{" "}
                      {isUnconfirmed
                        ? "unconfirmed"
                        : "confirmed"}{" "}
                      orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Card>
          <PaginationBar
            currentPage={currentMetaPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            loading={loading}
            onRefresh={loadOrders}
            onPageChange={setCurrentPage}
            totalRevenue={totalRevenue}
          />
        </Card>
      </div>
    </section>
  );
}