// app/orders/exchange_requested/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

/* ---------------------------------------------
   ✅ Small UI helpers
--------------------------------------------- */
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}
  >
    {children}
  </div>
);

/* ---------------------------------------------
   ✅ CSV helpers
--------------------------------------------- */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const formatDateISO = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
};

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : "";
};

const safe = (v) => (v === null || v === undefined ? "" : v);

/* ---------------------------------------------
   Page: Exchange Requested
   - ✅ Only Searchbar (no filters)
   - ✅ Backend: fulfillmentStatus=exchange_requested + customerName=search
--------------------------------------------- */
export default function ExchangeRequestedOrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);

  const fetchAllOrders = useOrderStore((s) => s.fetchAllOrders);
  const fetchNextOrdersPage = useOrderStore((s) => s.fetchNextOrdersPage);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  // Search (button based)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // pagination
  const [pageSize] = useState(500);
  const [loadingMore, setLoadingMore] = useState(false);

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, []);

  /* ---------------------------------------------
     ✅ Backend filters
  --------------------------------------------- */
  const backendFilters = useMemo(() => {
    const f = {
      fulfillmentStatus: "exchange_requested",
      page: 1,
      limit: pageSize,
    };
    if (search) f.customerName = search;
    return f;
  }, [search, pageSize]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrders(backendFilters);
    } catch (e) {
      console.log("Exchange Requested Orders Fetch Error:", e);
    }
  }, [fetchAllOrders, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* ---------------------------------------------
     ✅ Client-side search fallback
  --------------------------------------------- */
  const filteredOrders = useMemo(() => {
    let data = Array.isArray(orders) ? [...orders] : [];

    // Safety: keep only exchange_requested
    data = data.filter(
      (o) =>
        String(o?.fulfillmentStatus || "").toLowerCase() === "exchange_requested"
    );

    const q = search.trim().toLowerCase();
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
  }, [orders, search]);

  /* ---------------------------------------------
     ✅ CSV export
     - includes latest RMA + exchangeRequest info
  --------------------------------------------- */
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

      // Latest RMA (exchange details)
      const rmas = Array.isArray(order?.rmas) ? order.rmas : [];
      const latestRma = rmas.length ? rmas[rmas.length - 1] : null;

      const rmaNumber = safe(latestRma?.rmaNumber || "");
      const rmaStatus = safe(latestRma?.status || "");
      const rmaReason = safe(latestRma?.reason || "");
      const rmaType = safe(latestRma?.type || "exchange");

      const exchangeProductId = safe(latestRma?.exchangeRequest?.productId || "");
      const exchangeVariantId = safe(latestRma?.exchangeRequest?.variantId || "");
      const exchangeVariantSku = safe(latestRma?.exchangeRequest?.variantSku || "");
      const exchangeNote = safe(latestRma?.exchangeRequest?.note || "");

      const reverseAwb = safe(latestRma?.reverseShipment?.awb || "");
      const reverseCourier = safe(latestRma?.reverseShipment?.courierName || "");
      const reverseTrackingUrl = safe(latestRma?.reverseShipment?.trackingUrl || "");

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
          rmaReason,
          exchangeProductId,
          exchangeVariantId,
          exchangeVariantSku,
          exchangeNote,
          reverseAwb,
          reverseCourier,
          reverseTrackingUrl,
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
          rmaNumber,
          rmaType,
          rmaStatus,
          rmaReason,
          exchangeProductId,
          exchangeVariantId,
          exchangeVariantSku,
          exchangeNote,
          reverseAwb,
          reverseCourier,
          reverseTrackingUrl,
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
    if (!filteredOrders?.length)
      return alert("No exchange requested orders to export.");

    const rows = buildCsvRows(filteredOrders);

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
      "RMA Reason",
      "Exchange ProductId",
      "Exchange VariantId",
      "Exchange VariantSku",
      "Exchange Note",
      "Reverse AWB",
      "Reverse Courier",
      "Reverse Tracking URL",
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
          r.rmaReason,
          r.exchangeProductId,
          r.exchangeVariantId,
          r.exchangeVariantSku,
          r.exchangeNote,
          r.reverseAwb,
          r.reverseCourier,
          r.reverseTrackingUrl,
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
    link.setAttribute("download", `exchange-requested-orders-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    const metaCount = Number(ordersMeta?.totalCount);
    const metaSum = Number(ordersMeta?.totalSum);

    const count =
      Number.isFinite(metaCount) && metaCount >= 0 ? metaCount : filteredOrders.length;

    const sum =
      Number.isFinite(metaSum) && metaSum >= 0
        ? metaSum
        : filteredOrders.reduce((acc, o) => acc + (Number(o?.finalPayable) || 0), 0);

    return { count, sum };
  }, [ordersMeta, filteredOrders]);

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
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-10">
      <div className="mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Exchange Requested
            </h1>
            <p className="text-gray-500 mt-1">
              Search and manage <b>exchange requested</b> orders.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                {totals.count} Orders
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                Total ₹{totals.sum}
              </span>
              <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-800 font-semibold">
                Status: exchange_requested
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 w-full md:w-80">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search order # / name / email / phone..."
                className="outline-none w-full bg-transparent text-sm placeholder:text-gray-400"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
            </div>

            <button
              onClick={applySearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition"
            >
              <Search size={18} /> Search
            </button>

            <button
              onClick={clearSearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-200 active:scale-[0.98] transition"
            >
              Clear
            </button>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition"
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

        {/* Load More / Refresh */}
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
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition"
              >
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
                    <Loader2 size={16} className="animate-spin" /> Loading...
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

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="py-4 px-5 text-left font-semibold">Order #</th>
                  <th className="py-4 px-5 text-left font-semibold">Customer</th>
                  <th className="py-4 px-5 text-left font-semibold">Payment</th>
                  <th className="py-4 px-5 text-left font-semibold">Fulfillment</th>
                  <th className="py-4 px-5 text-left font-semibold">Amount</th>
                  <th className="py-4 px-5 text-left font-semibold">Date</th>
                  <th className="py-4 px-5 text-left font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length ? (
                  [...filteredOrders]
                    .sort((a, b) => {
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
                    })
                    .map((order, idx) => {
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
                      No exchange requested orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Global loading overlay */}
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