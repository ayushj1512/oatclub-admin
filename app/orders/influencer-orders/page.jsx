// oatclub-admin/app/orders/influencer-orders/page.jsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Megaphone,
  Search,
} from "lucide-react";

import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const PAGE_SIZE = 100;

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const safe = (value) =>
  value === null || value === undefined ? "" : String(value);

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";

  return `"${String(value).replace(/"/g, '""')}"`;
};

const formatDateISO = (value) => {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));

const ymdInTimezone = (date = new Date(), timeZone = IST_TZ) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
};

const todayYMD = () => ymdInTimezone(new Date());

const yesterdayYMD = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  return ymdInTimezone(date);
};

const istStartISO = (date) =>
  date ? `${date}T00:00:00.000${IST_OFFSET}` : "";

const istEndISO = (date) =>
  date ? `${date}T23:59:59.999${IST_OFFSET}` : "";

const getOrderRevenue = (order) =>
  toNumber(
    order?.finalPayable ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.amount ??
      0,
  );

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
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
  loading,
  totalRevenue,
  onRefresh,
  onPageChange,
}) {
  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
          {" • "}
          <span className="font-semibold">{totalCount}</span> orders
          {" • "}
          Value{" "}
          <span className="font-semibold">{formatINR(totalRevenue)}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Refresh
          </button>

          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {paginationItems.map((item, index) =>
          item === "..." ? (
            <span
              key={`dots-${index}`}
              className="px-3 py-2 text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(item)}
              className={`min-w-10 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                currentPage === item
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export default function InfluencerOrdersPage() {
  const orders = useOrderStore((state) => state.orders);
  const loading = useOrderStore((state) => state.loading);
  const error = useOrderStore((state) => state.error);
  const ordersMeta = useOrderStore((state) => state.ordersMeta);

  const fetchInfluencerOrders = useOrderStore(
    (state) => state.fetchInfluencerOrders,
  );

  const fetchAllOrders = useOrderStore(
    (state) => state.fetchAllOrders,
  );

  const syncOrderInList = useOrderStore(
    (state) => state._syncOrderInList,
  );

  const clearOrders = useOrderStore(
    (state) => state.clearOrders,
  );

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [quickDate, setQuickDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (quickDate === "today") {
      const date = todayYMD();

      setStartDate(date);
      setEndDate(date);
      setCurrentPage(1);
      return;
    }

    if (quickDate === "yesterday") {
      const date = yesterdayYMD();

      setStartDate(date);
      setEndDate(date);
      setCurrentPage(1);
      return;
    }

    if (!quickDate) {
      setStartDate("");
      setEndDate("");
    }
  }, [quickDate]);

  const backendFilters = useMemo(() => {
    const filters = {
      isInfluencerOrder: true,
      page: currentPage,
      limit: PAGE_SIZE,
    };

    if (search) filters.customerName = search;

    if (startDate) {
      filters.startDate = startDate;
      filters.startAt = istStartISO(startDate);
      filters.tz = IST_TZ;
    }

    if (endDate) {
      filters.endDate = endDate;
      filters.endAt = istEndISO(endDate);
      filters.tz = IST_TZ;
    }

    if (paymentMethod) {
      filters.paymentMethod = paymentMethod;
    }

    if (paymentStatus) {
      filters.paymentStatus = paymentStatus;
    }

    if (fulfillmentStatus) {
      filters.fulfillmentStatus = fulfillmentStatus;
    }

    if (priority) {
      filters.priority = priority;
    }

    return filters;
  }, [
    currentPage,
    search,
    startDate,
    endDate,
    paymentMethod,
    paymentStatus,
    fulfillmentStatus,
    priority,
  ]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchInfluencerOrders(backendFilters);
    } catch (fetchError) {
      console.error("Influencer orders fetch failed:", fetchError);
    } finally {
      setHasLoadedOnce(true);
    }
  }, [fetchInfluencerOrders, backendFilters]);

  useEffect(() => {
    loadOrders();

    return () => {
      clearOrders();
    };
  }, [loadOrders, clearOrders]);

  const handleOrderUpdated = useCallback(
    (updatedOrder) => {
      if (!updatedOrder?._id) return;
      syncOrderInList(updatedOrder);
    },
    [syncOrderInList],
  );

  const applySearch = () => {
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setQuickDate("");
    setStartDate("");
    setEndDate("");
    setPaymentMethod("");
    setPaymentStatus("");
    setFulfillmentStatus("");
    setPriority("");
    setCurrentPage(1);
  };

  const totalCount = toNumber(ordersMeta?.totalCount);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE),
  );

  const currentMetaPage =
    toNumber(ordersMeta?.page) || currentPage;

  const totalRevenue = useMemo(
    () =>
      (Array.isArray(orders) ? orders : []).reduce(
        (sum, order) => sum + getOrderRevenue(order),
        0,
      ),
    [orders],
  );

  const sortedOrders = useMemo(() => {
    const list = Array.isArray(orders) ? [...orders] : [];

    return list.sort((a, b) => {
      const firstDate = new Date(
        a?.createdAt || a?.orderDate || 0,
      ).getTime();

      const secondDate = new Date(
        b?.createdAt || b?.orderDate || 0,
      ).getTime();

      return secondDate - firstDate;
    });
  }, [orders]);

  const buildCsvRows = (orderList = []) => {
    const rows = [];

    orderList.forEach((order) => {
      const items = Array.isArray(order?.items)
        ? order.items
        : [];

      const base = {
        orderId: safe(order?._id || order?.id),
        orderNumber: safe(order?.orderNumber),
        orderDate: formatDateISO(
          order?.createdAt || order?.orderDate,
        ),
        customerName: safe(
          order?.customerId?.name ||
            order?.shippingAddressSnapshot?.fullName,
        ),
        customerEmail: safe(
          order?.customerId?.email ||
            order?.shippingAddressSnapshot?.email,
        ),
        customerPhone: safe(
          order?.customerId?.phone ||
            order?.shippingAddressSnapshot?.phone,
        ),
        paymentMethod: safe(order?.paymentMethod),
        paymentStatus: safe(order?.paymentStatus),
        fulfillmentStatus: safe(order?.fulfillmentStatus),
        priority: safe(order?.priority),
        subtotal: toNumber(order?.subtotal),
        discount: toNumber(order?.discount),
        shippingFee: toNumber(order?.shippingFee),
        finalPayable: toNumber(order?.finalPayable),
        isInfluencerOrder:
          order?.isInfluencerOrder === true ? "YES" : "NO",
      };

      if (!items.length) {
        rows.push({
          ...base,
          itemTitle: "",
          productCode: "",
          sku: "",
          size: "",
          quantity: "",
          itemPrice: "",
        });

        return;
      }

      items.forEach((item) => {
        const snapshot = item?.productSnapshot || {};

        rows.push({
          ...base,
          itemTitle: safe(snapshot?.title),
          productCode: safe(snapshot?.productCode),
          sku: safe(item?.variant?.sku || snapshot?.sku),
          size: safe(item?.selectedSize),
          quantity: toNumber(item?.quantity),
          itemPrice: toNumber(item?.price),
        });
      });
    });

    return rows;
  };

  const exportCSV = async () => {
    if (loading || exportLoading) return;

    setExportLoading(true);

    try {
      const baseFilters = {
        ...backendFilters,
        isInfluencerOrder: true,
      };

      delete baseFilters.page;
      delete baseFilters.limit;

      let page = 1;
      let hasMore = true;
      let allOrders = [];

      while (hasMore) {
        await fetchAllOrders({
          ...baseFilters,
          page,
          limit: 200,
        });

        const state = useOrderStore.getState();
        const pageOrders = Array.isArray(state.orders)
          ? state.orders
          : [];

        const meta = state.ordersMeta || {};

        allOrders.push(...pageOrders);

        hasMore = Boolean(meta?.hasMore);
        page += 1;

        if (!pageOrders.length) {
          hasMore = false;
        }
      }

      const uniqueOrders = Array.from(
        new Map(
          allOrders.map((order) => [
            order?._id || order?.orderNumber,
            order,
          ]),
        ).values(),
      );

      if (!uniqueOrders.length) {
        alert("No influencer orders found.");
        return;
      }

      const rows = buildCsvRows(uniqueOrders);

      const headers = [
        "Order DB ID",
        "Order Number",
        "Order Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Influencer Order",
        "Payment Method",
        "Payment Status",
        "Fulfillment Status",
        "Priority",
        "Subtotal",
        "Discount",
        "Shipping Fee",
        "Final Payable",
        "Item Title",
        "Product Code",
        "SKU",
        "Size",
        "Quantity",
        "Item Price",
      ];

      const csv = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) =>
          [
            row.orderId,
            row.orderNumber,
            row.orderDate,
            row.customerName,
            row.customerEmail,
            row.customerPhone,
            row.isInfluencerOrder,
            row.paymentMethod,
            row.paymentStatus,
            row.fulfillmentStatus,
            row.priority,
            row.subtotal,
            row.discount,
            row.shippingFee,
            row.finalPayable,
            row.itemTitle,
            row.productCode,
            row.sku,
            row.size,
            row.quantity,
            row.itemPrice,
          ]
            .map(escapeCSV)
            .join(","),
        ),
      ].join("\r\n");

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

      link.href = url;
      link.download = `influencer-orders-${timestamp}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Influencer CSV export failed:", exportError);
      alert("Failed to export influencer orders.");
    } finally {
      await loadOrders().catch(() => {});
      setExportLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto space-y-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                <Megaphone size={20} />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-950">
                  Influencer Orders
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Orders excluded from normal payment reconciliation.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                {totalCount || sortedOrders.length} Orders
              </span>

              <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                Influencer
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Value: {formatINR(totalRevenue)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm md:w-80">
              <Search size={18} className="text-gray-400" />

              <input
                type="text"
                value={searchInput}
                placeholder="Order #, name, phone or email"
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySearch();
                  }
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={applySearch}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              <Search size={17} />
              Search
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={loading || exportLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportLoading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Download size={17} />
              )}

              {exportLoading ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        <Card>
          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Quick Date
              </label>

              <select
                value={quickDate}
                onChange={(event) =>
                  setQuickDate(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setCurrentPage(1);
                  setQuickDate("");
                  setStartDate(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setCurrentPage(1);
                  setQuickDate("");
                  setEndDate(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Payment Method
              </label>

              <select
                value={paymentMethod}
                onChange={(event) => {
                  setCurrentPage(1);
                  setPaymentMethod(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">All Methods</option>
                <option value="cod">Cash on Delivery</option>
                <option value="razorpay">Razorpay</option>
                <option value="wallet">Wallet</option>
                <option value="manual_prepaid">
                  Manual Prepaid
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Payment Status
              </label>

              <select
                value={paymentStatus}
                onChange={(event) => {
                  setCurrentPage(1);
                  setPaymentStatus(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refund_pending">
                  Refund Pending
                </option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Fulfillment
              </label>

              <select
                value={fulfillmentStatus}
                onChange={(event) => {
                  setCurrentPage(1);
                  setFulfillmentStatus(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">All Statuses</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="picked">Picked</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">
                  Out for Delivery
                </option>
                <option value="delivered">Delivered</option>
                <option value="rto">RTO</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Priority
              </label>

              <select
                value={priority}
                onChange={(event) => {
                  setCurrentPage(1);
                  setPriority(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <PaginationBar
              currentPage={currentMetaPage}
              totalPages={totalPages}
              totalCount={totalCount}
              loading={loading}
              totalRevenue={totalRevenue}
              onRefresh={loadOrders}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

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
                      className="py-16 text-center text-gray-500"
                    >
                      <div className="inline-flex items-center gap-2">
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Loading influencer orders...
                      </div>
                    </td>
                  </tr>
                ) : sortedOrders.length ? (
                  sortedOrders.map((order, index) => (
                    <OrderRow
                      key={String(
                        order?._id ||
                          order?.orderNumber ||
                          index,
                      )}
                      order={order}
                      onUpdated={handleOrderUpdated}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                          <Megaphone size={21} />
                        </div>

                        <h3 className="mt-4 font-semibold text-gray-950">
                          No influencer orders found
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Mark an order as influencer from its order
                          details page.
                        </p>
                      </div>
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
            loading={loading}
            totalRevenue={totalRevenue}
            onRefresh={loadOrders}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>
    </section>
  );
}