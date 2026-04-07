"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  Truck,
} from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const FIXED_STATUS = "out_for_delivery";

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-sm backdrop-blur ${className}`}
  >
    {children}
  </div>
);

/* ---------------------------------------------
   Date helpers
--------------------------------------------- */
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

const istStartISO = (ymd) => (ymd ? `${ymd}T00:00:00.000${IST_OFFSET}` : "");
const istEndISO = (ymd) => (ymd ? `${ymd}T23:59:59.999${IST_OFFSET}` : "");

/* ---------------------------------------------
   Utils
--------------------------------------------- */
const norm = (v) => String(v ?? "").trim().toLowerCase();
const safe = (v) => (v === null || v === undefined ? "" : v);

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : "";
};

const formatDateISO = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
};

const formatINR = (value) => {
  const n = toNumber(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const getOrderRevenue = (order) =>
  toNumber(
    order?.finalPayable ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.amount ??
      0
  );

/* ---------------------------------------------
   CSV
--------------------------------------------- */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
};

const buildCsvRows = (ordersArr = []) =>
  ordersArr.map((order) => [
    safe(order?._id || order?.id),
    safe(order?.orderNumber),
    formatDateISO(order?.createdAt || order?.orderDate),
    safe(order?.customerId?.name || order?.shippingAddressSnapshot?.fullName),
    safe(order?.customerId?.email || order?.shippingAddressSnapshot?.email),
    safe(order?.customerId?.phone || order?.shippingAddressSnapshot?.phone),
    money(order?.subtotal),
    money(order?.discount),
    money(order?.shippingFee),
    money(order?.tax),
    money(order?.totalAmount),
    money(order?.finalPayable),
    safe(order?.paymentMethod),
    safe(order?.paymentStatus),
    safe(order?.fulfillmentStatus),
    order?.isConfirmed ? "Yes" : "No",
    safe(order?.priority),
    safe(order?.shipment?.shiprocket?.awb || order?.shipment?.awb),
    safe(
      order?.shipment?.shiprocket?.courierName ||
        order?.shipment?.courierName ||
        order?.shipment?.provider
    ),
  ]);

const downloadCsv = (ordersArr = []) => {
  const headers = [
    "Order ID",
    "Order Number",
    "Order Date",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Subtotal",
    "Discount",
    "Shipping Fee",
    "Tax",
    "Total Amount",
    "Final Payable",
    "Payment Method",
    "Payment Status",
    "Fulfillment Status",
    "Confirmed",
    "Priority",
    "AWB",
    "Courier",
  ];

  const rows = buildCsvRows(ordersArr);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `out-for-delivery-orders-${todayYMD_IST()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ---------------------------------------------
   Pagination
--------------------------------------------- */
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
  const items = getPaginationItems(currentPage, totalPages);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
          {totalCount > 0 ? (
            <>
              {" "}
              • Total <span className="font-semibold">{totalCount}</span> orders
            </>
          ) : null}
          {" • "}Revenue{" "}
          <span className="font-semibold">{formatINR(totalRevenue)}</span>
          <span className="text-gray-400"> • {pageSize} per page</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              loading
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98]"
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
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              !canGoPrev || loading
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98]"
            }`}
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <button
            disabled={!canGoNext || loading}
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              !canGoNext || loading
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "bg-black text-white hover:opacity-90 active:scale-[0.98]"
            }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) =>
          item === "..." ? (
            <span key={idx} className="px-3 py-2 text-sm text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              disabled={loading}
              className={`min-w-[42px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
                currentPage === item
                  ? "bg-black text-white shadow-sm"
                  : loading
                  ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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

/* ---------------------------------------------
   Client filters
--------------------------------------------- */
const applyClientFiltersToOrders = ({
  orders,
  confirmFilter,
  priority,
  search,
}) => {
  let data = Array.isArray(orders) ? [...orders] : [];

  data = data.filter((o) => norm(o?.fulfillmentStatus) === FIXED_STATUS);

  if (confirmFilter === "confirmed") {
    data = data.filter((o) => o?.isConfirmed === true);
  }

  if (confirmFilter === "not_confirmed") {
    data = data.filter((o) => o?.isConfirmed !== true);
  }

  if (priority) {
    data = data.filter((o) => norm(o?.priority) === norm(priority));
  }

  const q = String(search || "").trim().toLowerCase();
  if (!q) return data;

  return data.filter((o) => {
    const orderNumber = String(o?.orderNumber || "").toLowerCase();
    const name = String(
      o?.customerId?.name || o?.shippingAddressSnapshot?.fullName || ""
    ).toLowerCase();
    const email = String(
      o?.customerId?.email || o?.shippingAddressSnapshot?.email || ""
    ).toLowerCase();
    const phone = String(
      o?.customerId?.phone || o?.shippingAddressSnapshot?.phone || ""
    ).toLowerCase();

    return (
      orderNumber.includes(q) ||
      name.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );
  });
};

const sortOrders = (orders = []) =>
  [...orders].sort((a, b) => {
    const getNum = (o) => {
      const m = String(o?.orderNumber || "").match(/(\d+)$/);
      return m ? Number(m[1]) : 0;
    };

    const an = getNum(a);
    const bn = getNum(b);

    if (bn !== an) return bn - an;

    const ad = new Date(a?.createdAt || a?.orderDate || 0).getTime();
    const bd = new Date(b?.createdAt || b?.orderDate || 0).getTime();
    return bd - ad;
  });

/* ---------------------------------------------
   Page
--------------------------------------------- */
export default function OutForDeliveryOrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);

  const fetchAllOrders = useOrderStore((s) => s.fetchAllOrders);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  const [exportLoading, setExportLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [confirmFilter, setConfirmFilter] = useState("");
  const [priority, setPriority] = useState("");
  const [quickDate, setQuickDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const applySearch = useCallback(() => {
    setCurrentPage(1);
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setPaymentMethod("");
    setConfirmFilter("");
    setPriority("");
    setQuickDate("");
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

    if (!quickDate) {
      setStartDate("");
      setEndDate("");
    }
  }, [quickDate]);

  const backendFilters = useMemo(() => {
    const f = {
      fulfillmentStatus: FIXED_STATUS,
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

    if (minAmount) f.minAmount = minAmount;
    if (maxAmount) f.maxAmount = maxAmount;
    if (paymentMethod) f.paymentMethod = paymentMethod;
    if (confirmFilter) f.confirmFilter = confirmFilter;
    if (priority) f.priority = priority;

    return f;
  }, [
    search,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    paymentMethod,
    confirmFilter,
    priority,
    currentPage,
  ]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrders(backendFilters);
    } catch (error) {
      console.log("Out For Delivery Orders Fetch Error:", error);
    }
  }, [fetchAllOrders, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return applyClientFiltersToOrders({
      orders,
      confirmFilter,
      priority,
      search,
    });
  }, [orders, confirmFilter, priority, search]);

  const sortedOrders = useMemo(
    () => sortOrders(filteredOrders),
    [filteredOrders]
  );

  const totalRevenue = useMemo(
    () => sortedOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0),
    [sortedOrders]
  );

 const totalCount =
  Number(
    ordersMeta?.totalCount ||
    ordersMeta?.total ||
    ordersMeta?.totalOrders ||
    0
  ) || sortedOrders.length;

const totalPages =
  Math.max(
    Number(
      ordersMeta?.totalPages ||
      ordersMeta?.pages ||
      (totalCount ? Math.ceil(totalCount / pageSize) : 1)
    ),
    1
  );

  const handleExport = async () => {
    try {
      setExportLoading(true);

      const exportFilters = {
        ...backendFilters,
        page: 1,
        limit: 5000,
      };

      await fetchAllOrders(exportFilters);

      const exportOrders = applyClientFiltersToOrders({
        orders: useOrderStore.getState().orders || [],
        confirmFilter,
        priority,
        search,
      });

      downloadCsv(sortOrders(exportOrders));
    } catch (error) {
      console.log("Out For Delivery Export Error:", error);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <section className="space-y-6 p-4 md:p-6">
      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              <Truck size={14} />
              Orders
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
              Out for Delivery
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Track all out-for-delivery orders with search, filters and export.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Total Orders</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {totalCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatINR(totalRevenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Page Size</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {pageSize}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Search
            </label>

            <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center px-4 text-gray-400">
                <Search size={18} />
              </div>

              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Search by order no, customer, email, phone"
                className="w-full border-0 bg-transparent px-2 py-3 text-sm outline-none"
              />

              <button
                onClick={applySearch}
                className="bg-black px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                Search
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Quick Date
            </label>
            <select
              value={quickDate}
              onChange={(e) => {
                setQuickDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">All</option>
              <option value="cod">COD</option>
              <option value="razorpay">Razorpay</option>
              <option value="exchange">Exchange</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setQuickDate("");
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setQuickDate("");
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Min Amount
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="0"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Max Amount
            </label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="5000"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confirmation
            </label>
            <select
              value={confirmFilter}
              onChange={(e) => {
                setConfirmFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="not_confirmed">Not Confirmed</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={clearFilters}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              exportLoading
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "bg-black text-white hover:opacity-90"
            }`}
          >
            {exportLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Export CSV
          </button>
        </div>
      </Card>

      <Card>
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          loading={loading}
          onRefresh={loadOrders}
          onPageChange={setCurrentPage}
          totalRevenue={totalRevenue}
        />
      </Card>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Order #</th>
                <th className="px-5 py-4 text-left font-semibold">Customer</th>
                <th className="px-5 py-4 text-left font-semibold">Payment</th>
                <th className="px-5 py-4 text-left font-semibold">
                  Fulfillment
                </th>
                <th className="px-5 py-4 text-left font-semibold">Amount</th>
                <th className="px-5 py-4 text-left font-semibold">Date</th>
                <th className="px-5 py-4 text-left font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sortedOrders.length ? (
                sortedOrders.map((order, idx) => {
                  const rowKey =
                    order?._id ||
                    order?.id ||
                    order?.orderNumber ||
                    `order-${idx}`;

                  return (
                    <OrderRow
                      key={String(rowKey)}
                      order={order}
                      onUpdated={(updatedOrder) => {
                        if (updatedOrder?._id) syncOrderInList(updatedOrder);
                      }}
                      onOrderUpdated={(updatedOrder) => {
                        if (updatedOrder?._id) syncOrderInList(updatedOrder);
                      }}
                      syncOrderInList={syncOrderInList}
                    />
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    {loading
                      ? "Loading out-for-delivery orders..."
                      : "No out-for-delivery orders found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sortedOrders.length > 0 && (
        <Card className="p-4">
          <div className="text-xs text-gray-500">
            Showing filtered out-for-delivery orders.
          </div>
        </Card>
      )}

      {sortedOrders.length > 0 ? (
        <Card>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            loading={loading}
            onRefresh={loadOrders}
            onPageChange={setCurrentPage}
            totalRevenue={totalRevenue}
          />
        </Card>
      ) : null}

      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-lg">
            <Loader2 size={18} className="animate-spin text-gray-700" />
            <span className="text-sm font-semibold text-gray-800">
              Loading...
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}