"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Search, Download } from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}
  >
    {children}
  </div>
);

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔍 Search (button based)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // 🔍 Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // ✅ Status + confirmation
  const [status, setStatus] = useState("");
  const [confirmFilter, setConfirmFilter] = useState("");

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, []);

  /* ------------------------------------
     ✅ LOAD ORDERS WITH FILTERS (Backend)
     ------------------------------------ */
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams();
      if (search) qs.set("customerName", search); // keeping your backend param
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (minAmount) qs.set("minAmount", minAmount);
      if (maxAmount) qs.set("maxAmount", maxAmount);
      if (paymentMethod) qs.set("paymentMethod", paymentMethod);
      if (status) qs.set("fulfillmentStatus", status);

      const url = `${API}/api/orders?${qs.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch (err) {
      console.log("Orders Fetch Error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, minAmount, maxAmount, paymentMethod, status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* ------------------------------------
     ✅ CLIENT SIDE FILTERS (Search + Confirmation)
     ------------------------------------ */
  const filteredOrders = useMemo(() => {
    let data = Array.isArray(orders) ? [...orders] : [];

    if (confirmFilter === "confirmed") data = data.filter((o) => o?.isConfirmed === true);
    if (confirmFilter === "not_confirmed")
      data = data.filter((o) => o?.isConfirmed !== true);

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
        orderNumber.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q)
      );
    });
  }, [orders, confirmFilter, search]);

  /* ------------------------------------
     ✅ CSV HELPERS
     ------------------------------------ */
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
  };

  const money = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? x : "";
  };

  const safe = (v) => (v === null || v === undefined ? "" : v);

  const buildCsvRows = (ordersArr) => {
    const rows = [];
    for (const order of ordersArr || []) {
      const orderId = safe(order?._id || order?.id);
      const orderNumber = safe(order?.orderNumber);
      const orderDate = formatDate(order?.createdAt || order?.orderDate);

      const customerName = safe(order?.customerId?.name);
      const customerEmail = safe(order?.customerId?.email);
      const customerPhone = safe(order?.customerId?.phone);

      const subtotal = money(order?.subtotal);
      const discount = money(order?.discount);
      const shippingFee = money(order?.shippingFee);
      const tax = money(order?.tax);
      const totalAmount = money(order?.totalAmount);
      const finalPayable = money(order?.finalPayable);

      const fulfillmentStatus = safe(order?.fulfillmentStatus);
      const isConfirmed = order?.isConfirmed === true ? "YES" : "NO";

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
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: "",
          itemTitle: "",
          itemQuantity: "",
          itemPrice: "",
        });
        continue;
      }

      items.forEach((item, idx) => {
        const snap = item?.productSnapshot || {};
        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: idx + 1,
          itemTitle: safe(snap?.title),
          itemQuantity: money(item?.quantity),
          itemPrice: money(item?.price),
        });
      });
    }
    return rows;
  };

  const exportToCSV = () => {
    if (!filteredOrders?.length) {
      alert("No orders to export for the current filters.");
      return;
    }

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
      "Subtotal",
      "Discount",
      "Shipping Fee",
      "Tax",
      "Total Amount",
      "Final Payable",
      "Item #",
      "Item Title",
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
          r.subtotal,
          r.discount,
          r.shippingFee,
          r.tax,
          r.totalAmount,
          r.finalPayable,
          r.itemIndex,
          r.itemTitle,
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
    link.setAttribute("download", `orders-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    const count = filteredOrders.length;
    const sum = filteredOrders.reduce((acc, o) => acc + (Number(o?.finalPayable) || 0), 0);
    return { count, sum };
  }, [filteredOrders]);

  const chips = [
    { key: "", label: "All", type: "all" },
    { key: "processing", label: "Processing", type: "status" },
    { key: "packed", label: "Packed", type: "status" },
    { key: "shipped", label: "Shipped", type: "status" },
    { key: "out_for_delivery", label: "Out for Delivery", type: "status" },
    { key: "delivered", label: "Delivered", type: "status" },
    { key: "returned", label: "Returned", type: "status" },
    { key: "cancelled", label: "Cancelled", type: "status" },
    { key: "confirmed", label: "Confirmed", type: "confirm" },
    { key: "not_confirmed", label: "Not Confirmed", type: "confirm" },
  ];

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 size={32} className="animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">All Orders</h1>
            <p className="text-gray-500 mt-1">View, filter and manage all customer orders.</p>

            <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                {totals.count} Orders
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                Total ₹{totals.sum}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
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
              <Search size={18} />
              Search
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
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <Card>
          <div className="grid md:grid-cols-4 gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">Start Date</label>
              <input
                type="date"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-black/10 transition"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">End Date</label>
              <input
                type="date"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-black/10 transition"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Min Amount</label>
              <input
                type="number"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-black/10 transition"
                placeholder="₹0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Max Amount</label>
              <input
                type="number"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-black/10 transition"
                placeholder="₹5000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Payment Method</label>
              <select
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-black/10 transition"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">All</option>
                <option value="cod">Cash on Delivery</option>
                <option value="razorpay">Razorpay</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Confirmation</label>
              <select
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-black/10 transition"
                value={confirmFilter}
                onChange={(e) => setConfirmFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="confirmed">Confirmed</option>
                <option value="not_confirmed">Not Confirmed</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {chips.map((s) => {
              const isActive =
                s.type === "status"
                  ? status === s.key
                  : s.type === "confirm"
                  ? confirmFilter === s.key
                  : status === "" && confirmFilter === "";

              const onClick = () => {
                if (s.type === "all") {
                  setStatus("");
                  setConfirmFilter("");
                  return;
                }
                if (s.type === "status") setStatus((prev) => (prev === s.key ? "" : s.key));
                if (s.type === "confirm")
                  setConfirmFilter((prev) => (prev === s.key ? "" : s.key));
              };

              return (
                <button
                  key={`${s.type}-${s.key || "all"}`}
                  onClick={onClick}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-black text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* TABLE */}
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
                  filteredOrders.map((order, idx) => {
                    const rowKey =
                      order?._id || order?.id || order?.orderNumber || `order-${idx}`;

                    return (
                      <OrderRow
                        key={String(rowKey)}
                        order={order}
                        onUpdated={(updatedOrder) => {
                          setOrders((prev) =>
                            prev.map((o) =>
                              (o?._id || o?.id) === (updatedOrder?._id || updatedOrder?.id)
                                ? updatedOrder
                                : o
                            )
                          );
                        }}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No orders found for applied filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
