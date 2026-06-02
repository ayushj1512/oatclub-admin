"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  IndianRupee,
  Loader2,
  Search,
  Truck,
} from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}
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

const monthStartYMD_IST = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  return `${y}-${m}-01`;
};

const istStartISO = (ymd) => (ymd ? `${ymd}T00:00:00.000${IST_OFFSET}` : "");
const istEndISO = (ymd) => (ymd ? `${ymd}T23:59:59.999${IST_OFFSET}` : "");

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

const formatDateLabel = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatINR = (value) => {
  const n = toNumber(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const normalizeOrderNumber = (value = "") => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (digits) return `MIRAY-${digits.padStart(6, "0")}`;

  return raw.replace(/\s+/g, "");
};

const normalizeSearchTerm = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();
  const digits = raw.replace(/\D/g, "");

  if (upper.startsWith("MIRAY") || /^\d+$/.test(raw) || digits.length) {
    return normalizeOrderNumber(raw);
  }

  return raw;
};

const getOrderRevenue = (order) =>
  toNumber(
    order?.finalPayable ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.amount ??
      0
  );

const getOrderDate = (order) => {
  const raw =
    order?.deliveredAt ||
    order?.shipment?.deliveredAt ||
    order?.statusTimestamps?.deliveredAt ||
    order?.updatedAt ||
    order?.createdAt ||
    order?.orderDate;

  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const normalizeDateStart = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeDateEnd = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function DeliveredOrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);

  const fetchAllOrders = useOrderStore((s) => s.fetchAllOrders);
  const fetchNextOrdersPage = useOrderStore((s) => s.fetchNextOrdersPage);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [monthInput, setMonthInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [quickDate, setQuickDate] = useState("");

  const [pageSize] = useState(500);
  const [loadingMore, setLoadingMore] = useState(false);

  const applyFilters = useCallback(() => {
    setSearch(normalizeSearchTerm(searchInput));
    setSelectedMonth(monthInput);
    setFromDate(fromDateInput);
    setToDate(toDateInput);
  }, [searchInput, monthInput, fromDateInput, toDateInput]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setMonthInput("");
    setSelectedMonth("");
    setFromDateInput("");
    setToDateInput("");
    setFromDate("");
    setToDate("");
    setQuickDate("");
  }, []);

  useEffect(() => {
    if (quickDate === "today") {
      const t = todayYMD_IST();
      setMonthInput("");
      setSelectedMonth("");
      setFromDateInput(t);
      setToDateInput(t);
      setFromDate(t);
      setToDate(t);
      return;
    }

    if (quickDate === "yesterday") {
      const y = yesterdayYMD_IST();
      setMonthInput("");
      setSelectedMonth("");
      setFromDateInput(y);
      setToDateInput(y);
      setFromDate(y);
      setToDate(y);
      return;
    }

    if (quickDate === "this_month") {
      const start = monthStartYMD_IST();
      const end = todayYMD_IST();
      setMonthInput("");
      setSelectedMonth("");
      setFromDateInput(start);
      setToDateInput(end);
      setFromDate(start);
      setToDate(end);
      return;
    }

    if (!quickDate) return;
  }, [quickDate]);

  const backendFilters = useMemo(() => {
    const f = {
      fulfillmentStatus: "delivered",
      page: 1,
      limit: pageSize,
    };

    if (search) f.customerName = search;

    if (fromDate) {
      f.startDate = fromDate;
      f.startAt = istStartISO(fromDate);
      f.tz = IST_TZ;
    }

    if (toDate) {
      f.endDate = toDate;
      f.endAt = istEndISO(toDate);
      f.tz = IST_TZ;
    }

    return f;
  }, [search, fromDate, toDate, pageSize]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrders(backendFilters);
    } catch (e) {
      console.log("Delivered Orders Fetch Error:", e);
    }
  }, [fetchAllOrders, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    let data = Array.isArray(orders) ? [...orders] : [];

    data = data.filter(
      (o) => String(o?.fulfillmentStatus || "").toLowerCase() === "delivered"
    );

    const q = String(search || "").trim().toLowerCase();
    if (q) {
      data = data.filter((o) => {
        const orderNumber = String(o?.orderNumber || "").toLowerCase();
        const normalizedOrderNumber = normalizeOrderNumber(
          o?.orderNumber || ""
        ).toLowerCase();

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
          normalizedOrderNumber.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q)
        );
      });
    }

    if (selectedMonth) {
      data = data.filter((o) => {
        const dt = getOrderDate(o);
        if (!dt) return false;
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === selectedMonth;
      });
    }

    const from = normalizeDateStart(fromDate);
    const to = normalizeDateEnd(toDate);

    if (from || to) {
      data = data.filter((o) => {
        const dt = getOrderDate(o);
        if (!dt) return false;
        if (from && dt < from) return false;
        if (to && dt > to) return false;
        return true;
      });
    }

    return data;
  }, [orders, search, selectedMonth, fromDate, toDate]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const getNum = (o) => {
        const m = String(o?.orderNumber || "").match(/(\d+)$/);
        return m ? Number(m[1]) : 0;
      };

      const an = getNum(a);
      const bn = getNum(b);
      if (bn !== an) return bn - an;

      const ad = getOrderDate(a)?.getTime() || 0;
      const bd = getOrderDate(b)?.getTime() || 0;
      return bd - ad;
    });
  }, [filteredOrders]);

  const totalRevenue = useMemo(() => {
    return sortedOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
  }, [sortedOrders]);

  const confirmedCount = useMemo(() => {
    return sortedOrders.filter((o) => o?.isConfirmed === true).length;
  }, [sortedOrders]);

  const prepaidCount = useMemo(() => {
    return sortedOrders.filter(
      (o) => String(o?.paymentMethod || "").toLowerCase() === "razorpay"
    ).length;
  }, [sortedOrders]);

  const buildCsvRows = (ordersArr) => {
    const rows = [];

    for (const order of ordersArr || []) {
      const orderId = safe(order?._id || order?.id);
      const orderNumber = safe(order?.orderNumber);
      const orderDate = formatDateISO(
        order?.deliveredAt ||
          order?.shipment?.deliveredAt ||
          order?.statusTimestamps?.deliveredAt ||
          order?.updatedAt ||
          order?.createdAt ||
          order?.orderDate
      );

      const customerName = safe(
        order?.customerId?.name || order?.shippingAddressSnapshot?.fullName
      );
      const customerEmail = safe(
        order?.customerId?.email || order?.shippingAddressSnapshot?.email
      );
      const customerPhone = safe(
        order?.customerId?.phone || order?.shippingAddressSnapshot?.phone
      );

      const subtotal = money(order?.subtotal);
      const discount = money(order?.discount);
      const shippingFee = money(order?.shippingFee);
      const tax = money(order?.tax);
      const totalAmount = money(order?.totalAmount);
      const finalPayable = money(order?.finalPayable);

      const fulfillmentStatus = safe(order?.fulfillmentStatus);
      const isConfirmed = order?.isConfirmed === true ? "YES" : "NO";

      const payMethod = safe(order?.paymentMethod);
      const payStatus = safe(order?.paymentStatus);

      const items = Array.isArray(order?.items) ? order.items : [];

      if (!items.length) {
        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          paymentMethod: payMethod,
          paymentStatus: payStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: "",
          itemTitle: "",
          itemProductCode: "",
          itemSku: "",
          itemSize: "",
          itemQuantity: "",
          itemPrice: "",
        });
        continue;
      }

      items.forEach((item, idx) => {
        const snap = item?.productSnapshot || {};
        const itemProductCode = safe(snap?.productCode || "");
        const attrs = Array.isArray(item?.variant?.attributes)
          ? item.variant.attributes
          : [];

        const attrSize =
          attrs.find((a) => String(a?.key || "").toLowerCase() === "size")?.value ||
          attrs.find((a) => String(a?.key || "").toLowerCase() === "sizes")?.value ||
          "";

        const itemSku = safe(item?.variant?.sku || snap?.sku || "");
        const itemSize = safe(item?.selectedSize || attrSize || "");

        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          paymentMethod: payMethod,
          paymentStatus: payStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: idx + 1,
          itemTitle: safe(snap?.title),
          itemProductCode,
          itemSku,
          itemSize,
          itemQuantity: money(item?.quantity),
          itemPrice: money(item?.price),
        });
      });
    }

    return rows;
  };

  const exportToCSV = () => {
    if (!sortedOrders.length) {
      alert("No delivered orders to export.");
      return;
    }

    const rows = buildCsvRows(sortedOrders);

    const headers = [
      "Order DB Id",
      "Order #",
      "Delivered/Order Date (ISO)",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Is Confirmed",
      "Fulfillment Status",
      "Payment Method",
      "Payment Status",
      "Subtotal",
      "Discount",
      "Shipping Fee",
      "Tax",
      "Total Amount",
      "Final Payable",
      "Item #",
      "Item Title",
      "Product Code",
      "Item SKU",
      "Item Size",
      "Item Quantity",
      "Item Price",
    ];

    const csvLines = [
      headers.map(escapeCSV).join(","),
      ...rows.map((r) =>
        [
          r.orderId,
          r.orderNumber,
          r.orderDate,
          r.customerName,
          r.customerEmail,
          r.customerPhone,
          r.isConfirmed,
          r.fulfillmentStatus,
          r.paymentMethod,
          r.paymentStatus,
          r.subtotal,
          r.discount,
          r.shippingFee,
          r.tax,
          r.totalAmount,
          r.finalPayable,
          r.itemIndex,
          r.itemTitle,
          r.itemProductCode,
          r.itemSku,
          r.itemSize,
          r.itemQuantity,
          r.itemPrice,
        ]
          .map(escapeCSV)
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    link.href = url;
    link.setAttribute("download", `delivered-orders-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasMore = !!ordersMeta?.hasMore;

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      await fetchNextOrdersPage({ ...backendFilters, page: undefined });
    } catch (e) {
      console.log("Load more error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const quickDateChips = [
    { key: "", label: "Custom" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_month", label: "This Month" },
  ];

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Delivered Orders
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Search and manage only <b>delivered</b> orders.
            </p>
          </div>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivered Orders</p>
                <p className="text-xl font-bold text-gray-900">{sortedOrders.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivered Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatINR(totalRevenue)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Confirmed Delivered</p>
                <p className="text-xl font-bold text-gray-900">{confirmedCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Search size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Prepaid Delivered</p>
                <p className="text-xl font-bold text-gray-900">{prepaidCount}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search OATCLUB-000123 / name / email / phone..."
                className="outline-none w-full bg-transparent text-sm placeholder:text-gray-400"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>

            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <CalendarDays size={18} className="text-gray-400 shrink-0" />
              <input
                type="month"
                className="outline-none w-full bg-transparent text-sm text-gray-700"
                value={monthInput}
                onChange={(e) => {
                  setQuickDate("");
                  setMonthInput(e.target.value);
                }}
              />
            </div>

            <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <span className="text-xs font-semibold text-gray-500 shrink-0">From</span>
              <input
                type="date"
                className="outline-none w-full bg-transparent text-sm text-gray-700"
                value={fromDateInput}
                onChange={(e) => {
                  setQuickDate("");
                  setMonthInput("");
                  setFromDateInput(e.target.value);
                }}
              />
            </div>

            <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <span className="text-xs font-semibold text-gray-500 shrink-0">To</span>
              <input
                type="date"
                className="outline-none w-full bg-transparent text-sm text-gray-700"
                value={toDateInput}
                onChange={(e) => {
                  setQuickDate("");
                  setMonthInput("");
                  setToDateInput(e.target.value);
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition"
              >
                <Search size={18} />
                Apply
              </button>

              <button
                onClick={clearFilters}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickDateChips.map((chip) => {
              const active = quickDate === chip.key;

              return (
                <button
                  key={chip.key || "custom"}
                  onClick={() => setQuickDate(chip.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-black text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </Card>

        {(search || selectedMonth || fromDate || toDate) && (
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-gray-700">Active Filters:</span>

              {search ? (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                  Search: {search}
                </span>
              ) : null}

              {selectedMonth ? (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                  Month: {selectedMonth}
                </span>
              ) : null}

              {fromDate ? (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                  From: {fromDate}
                </span>
              ) : null}

              {toDate ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  To: {toDate}
                </span>
              ) : null}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {ordersMeta?.page
                ? `Page ${ordersMeta.page} • Loaded ${orders.length} orders • Visible ${sortedOrders.length} rows`
                : `Loaded ${orders.length} orders • Visible ${sortedOrders.length} rows`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadOrders}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition"
              >
                Refresh
              </button>

              <button
                disabled={!ordersMeta?.hasMore || loadingMore}
                onClick={loadMore}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  !ordersMeta?.hasMore || loadingMore
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading...
                  </span>
                ) : ordersMeta?.hasMore ? (
                  "Load More"
                ) : (
                  "No More"
                )}
              </button>
            </div>
          </div>
        </Card>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="py-4 px-5 text-left font-semibold">Order</th>
                  <th className="py-4 px-5 text-left font-semibold">Customer</th>
                  <th className="py-4 px-5 text-left font-semibold">Payment</th>
                  <th className="py-4 px-5 text-left font-semibold">Status</th>
                  <th className="py-4 px-5 text-left font-semibold">Amount</th>
                  <th className="py-4 px-5 text-left font-semibold">Date</th>
                  <th className="py-4 px-5 text-left font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {sortedOrders.length ? (
                  sortedOrders.map((order, idx) => {
                    const rowKey =
                      order?._id || order?.id || order?.orderNumber || `order-${idx}`;

                    return (
                      <OrderRow
                        key={String(rowKey)}
                        order={order}
                        onUpdated={(updatedOrder) => {
                          if (updatedOrder?._id) syncOrderInList(updatedOrder);
                        }}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      {loading ? "Loading delivered orders..." : "No delivered orders found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {sortedOrders.length > 0 && (
          <div className="text-xs text-gray-500 px-1">
            Latest visible delivered date:{" "}
            <span className="font-medium text-gray-700">
              {formatDateLabel(getOrderDate(sortedOrders[0])) || "-"}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-gray-700" />
            <span className="text-sm font-semibold text-gray-800">Loading...</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}