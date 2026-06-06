"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Loader2,
  RefreshCcw,
  Search,
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
  const n = Number(value);
  const safeNum = Number.isFinite(n) ? n : 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safeNum);
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const normalizeOrderNumber = (value = "") => String(value ?? "").trim().replace(/\s+/g, "");

const normalizeSearchTerm = (value = "") => String(value || "").trim();

const getOrderDate = (order) => {
  const latestRma =
    Array.isArray(order?.rmas) && order.rmas.length
      ? order.rmas[order.rmas.length - 1]
      : null;

  const raw =
    latestRma?.updatedAt ||
    latestRma?.createdAt ||
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

export default function RefundedOrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);

  const fetchAllOrders = useOrderStore((s) => s.fetchAllOrders);
  const fetchNextOrdersPage = useOrderStore((s) => s.fetchNextOrdersPage);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quickDate, setQuickDate] = useState("");

  const [pageSize] = useState(500);
  const [loadingMore, setLoadingMore] = useState(false);

  const applySearch = useCallback(() => {
    setSearch(normalizeSearchTerm(searchInput));
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setQuickDate("");
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

    if (quickDate === "this_month") {
      setStartDate(monthStartYMD_IST());
      setEndDate(todayYMD_IST());
      return;
    }

    if (!quickDate) {
      setStartDate("");
      setEndDate("");
    }
  }, [quickDate]);

  const backendFilters = useMemo(() => {
    const f = {
      fulfillmentStatus: "refunded",
      page: 1,
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

    return f;
  }, [search, startDate, endDate, pageSize]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrders(backendFilters);
    } catch (e) {
      console.log("Refunded Orders Fetch Error:", e);
    }
  }, [fetchAllOrders, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    let data = Array.isArray(orders) ? [...orders] : [];

    data = data.filter(
      (o) => String(o?.fulfillmentStatus || "").toLowerCase() === "refunded"
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

        const adminRemarks = String(o?.adminRemarks || "").toLowerCase();
        const customerSupportRemark = String(
          o?.customerSupportRemark || ""
        ).toLowerCase();
        const customerMessage = String(o?.customerMessage || "").toLowerCase();

        const paymentMethod = String(o?.paymentMethod || "").toLowerCase();
        const paymentStatus = String(o?.paymentStatus || "").toLowerCase();

        const latestRma =
          Array.isArray(o?.rmas) && o.rmas.length
            ? o.rmas[o.rmas.length - 1]
            : null;

        const rmaNumber = String(latestRma?.rmaNumber || "").toLowerCase();
        const refundMode = String(latestRma?.refund?.mode || "").toLowerCase();
        const refundStatus = String(
          latestRma?.refund?.status || ""
        ).toLowerCase();
        const refundRef = String(
          latestRma?.refund?.referenceId || ""
        ).toLowerCase();

        return (
          orderNumber.includes(q) ||
          normalizedOrderNumber.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          adminRemarks.includes(q) ||
          customerSupportRemark.includes(q) ||
          customerMessage.includes(q) ||
          paymentMethod.includes(q) ||
          paymentStatus.includes(q) ||
          rmaNumber.includes(q) ||
          refundMode.includes(q) ||
          refundStatus.includes(q) ||
          refundRef.includes(q)
        );
      });
    }

    const from = normalizeDateStart(startDate);
    const to = normalizeDateEnd(endDate);

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
  }, [orders, search, startDate, endDate]);

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
    return sortedOrders.reduce(
      (acc, o) => acc + (Number(o?.finalPayable) || 0),
      0
    );
  }, [sortedOrders]);

  const confirmedCount = useMemo(() => {
    return sortedOrders.filter((o) => o?.isConfirmed === true).length;
  }, [sortedOrders]);

  const withRefundInfoCount = useMemo(() => {
    return sortedOrders.filter((o) => {
      const latestRma =
        Array.isArray(o?.rmas) && o.rmas.length
          ? o.rmas[o.rmas.length - 1]
          : null;

      return !!(
        latestRma?.refund?.amount ||
        latestRma?.refund?.mode ||
        latestRma?.refund?.status ||
        latestRma?.refund?.referenceId
      );
    }).length;
  }, [sortedOrders]);

  const buildCsvRows = (ordersArr) => {
    const rows = [];

    for (const order of ordersArr || []) {
      const orderId = safe(order?._id || order?.id);
      const orderNumber = safe(order?.orderNumber);
      const orderDate = formatDateISO(order?.createdAt || order?.orderDate);

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

      const rmas = Array.isArray(order?.rmas) ? order.rmas : [];
      const latestRma = rmas.length ? rmas[rmas.length - 1] : null;

      const rmaNumber = safe(latestRma?.rmaNumber || "");
      const rmaStatus = safe(latestRma?.status || "");
      const rmaType = safe(latestRma?.type || "");

      const refundAmount = money(latestRma?.refund?.amount);
      const refundMode = safe(latestRma?.refund?.mode || "");
      const refundStatus = safe(latestRma?.refund?.status || "");
      const refundRef = safe(latestRma?.refund?.referenceId || "");

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
          rmaNumber,
          rmaType,
          rmaStatus,
          refundAmount,
          refundMode,
          refundStatus,
          refundRef,
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
          attrs.find((a) => String(a?.key || "").toLowerCase() === "size")
            ?.value ||
          attrs.find((a) => String(a?.key || "").toLowerCase() === "sizes")
            ?.value ||
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
          rmaNumber,
          rmaType,
          rmaStatus,
          refundAmount,
          refundMode,
          refundStatus,
          refundRef,
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
      alert("No refunded orders to export.");
      return;
    }

    const rows = buildCsvRows(sortedOrders);

    const headers = [
      "Order DB Id",
      "Order #",
      "Order Date (ISO)",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Is Confirmed",
      "Fulfillment Status",
      "Payment Method",
      "Payment Status",
      "RMA #",
      "RMA Type",
      "RMA Status",
      "Refund Amount",
      "Refund Mode",
      "Refund Status",
      "Refund Reference",
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
          r.rmaNumber,
          r.rmaType,
          r.rmaStatus,
          r.refundAmount,
          r.refundMode,
          r.refundStatus,
          r.refundRef,
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
    link.setAttribute("download", `refunded-orders-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const quickDateChips = [
    { key: "", label: "All Dates" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_month", label: "This Month" },
  ];

  const totals = useMemo(() => {
    const metaCount = Number(ordersMeta?.totalCount);
    const count =
      Number.isFinite(metaCount) && metaCount >= 0
        ? metaCount
        : sortedOrders.length;

    return { count };
  }, [ordersMeta, sortedOrders]);

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

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Refunded Orders
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Search and manage <b>refunded</b> orders.
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
            <p className="text-xs text-gray-500">Refunded Orders</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {totals.count}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-gray-500">Final Payable Total</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatINR(totalRevenue)}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-gray-500">Confirmed Orders</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {confirmedCount}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-gray-500">With Refund Info</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {withRefundInfoCount}
            </p>
          </Card>
        </div>

        <Card>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-5 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search order/name/email/phone/refund ref..."
                className="outline-none w-full bg-transparent text-sm placeholder:text-gray-400"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
            </div>

            <div className="xl:col-span-2 flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
              <CalendarDays size={18} className="text-gray-400" />
              <input
                type="date"
                className="outline-none w-full bg-transparent text-sm"
                value={startDate}
                onChange={(e) => {
                  setQuickDate("");
                  setStartDate(e.target.value);
                }}
              />
            </div>

            <div className="xl:col-span-2 flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
              <CalendarDays size={18} className="text-gray-400" />
              <input
                type="date"
                className="outline-none w-full bg-transparent text-sm"
                value={endDate}
                onChange={(e) => {
                  setQuickDate("");
                  setEndDate(e.target.value);
                }}
              />
            </div>

            <button
              onClick={applySearch}
              className="xl:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90 transition"
            >
              <Search size={18} />
              Search
            </button>

            <button
              onClick={clearSearch}
              className="xl:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-semibold shadow-sm hover:bg-gray-50 transition"
            >
              <RefreshCcw size={18} />
              Clear
            </button>

            <div className="xl:col-span-12 flex flex-wrap gap-2">
              {quickDateChips.map((chip) => {
                const active = quickDate === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setQuickDate(chip.key)}
                    className={`px-3 py-2 rounded-full text-xs font-semibold transition ${
                      active
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {ordersMeta?.page
                ? `Page ${ordersMeta.page} • Showing ${orders.length} orders`
                : `Showing ${orders.length} orders`}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadOrders}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>

              <button
                disabled={!hasMore || loadingMore}
                onClick={loadMore}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  !hasMore || loadingMore
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading...
                  </span>
                ) : hasMore ? (
                  "Load More"
                ) : (
                  "No More"
                )}
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Card>
              <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
                <Loader2 className="animate-spin" size={18} />
                Loading refunded orders...
              </div>
            </Card>
          ) : sortedOrders.length ? (
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
            <Card>
              <div className="py-10 text-center text-gray-500">
                No refunded orders found.
              </div>
            </Card>
          )}
        </div>
      </div>

      {loading ? (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center gap-3">
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

