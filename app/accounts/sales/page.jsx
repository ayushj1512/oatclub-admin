"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";

const TAX_RATE = 0.05;
const money2 = (n) => (Number(n || 0)).toFixed(2);

const getDeliveredAt = (order) =>
  order?.shipment?.deliveredAt ||
  order?.trackingDetails?.deliveredAt ||
  order?.updatedAt ||
  order?.orderDate ||
  null;

const toMonthKey = (dateLike) => {
  const d = dateLike ? new Date(dateLike) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const getPaymentMode = (order) =>
  String(order?.paymentMethod || "").toLowerCase() === "cod" ? "COD" : "PREPAID";

// Paid -> Razorpay, COD -> Shiprocket
const getPaymentMethodLabel = (order) =>
  String(order?.paymentMethod || "").toLowerCase() === "cod" ? "Shiprocket" : "Razorpay";

/**
 * Pro-rata discount allocation across items by net line base (incl tax).
 * (We still need this to compute per-line net + tax breakup.)
 */
const allocateDiscountProRata = (lineTotals, orderDiscount) => {
  const disc = Math.max(0, Number(orderDiscount || 0));
  const total = lineTotals.reduce((s, g) => s + Number(g || 0), 0);
  if (disc <= 0 || total <= 0) return lineTotals.map(() => 0);

  const raw = lineTotals.map((g) => (disc * Number(g || 0)) / total);
  const rounded = raw.map((x) => Math.round(x * 100) / 100);

  const target = Math.round(disc * 100) / 100;
  const sum = rounded.reduce((s, x) => s + x, 0);
  const diff = Math.round((target - sum) * 100) / 100;

  if (diff !== 0) {
    for (let i = lineTotals.length - 1; i >= 0; i--) {
      if (Number(lineTotals[i] || 0) > 0) {
        rounded[i] = Math.round((rounded[i] + diff) * 100) / 100;
        break;
      }
    }
  }
  return rounded;
};

const downloadCSV = (rows, filename = "sales-report.csv") => {
  const headers = [
    "OrderId",
    "Delivered month",
    "Customer name",
    "Customer state",
    "Payment mode",
    "Payment method",
    "Courier name",
    "Product type",
    "HSN code",
    "Product size",
    "Qty",
    "Selling price (unit, incl tax)",
    "Allocated discount",
    "Net line (incl tax)",
    "Taxable value (excl tax)",
    "Tax amount (5%)",
    "Tax rate",
    "Order total amount",
    "Order discount",
    "Coupon code",
  ];

  const escape = (val) => {
    const s = String(val ?? "");
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.orderId,
        r.deliveredMonth,
        r.customerName,
        r.customerState,
        r.paymentMode,
        r.paymentMethod,
        r.courierName,
        r.productType,
        r.hsnCode,
        r.productSize,
        r.qty,
        r.sellingPrice,
        r.allocatedDiscount,
        r.netLine,
        r.taxableValue,
        r.taxAmount,
        r.taxRate,
        r.orderTotalAmount,
        r.orderDiscount,
        r.couponCode,
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function SalesReportPage() {
  const { orders, loading, error, fetchAllOrders } = useOrderStore();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllOrders().catch(() => {});
  }, [fetchAllOrders]);

  const deliveredOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.filter((o) => {
      const f = String(o?.fulfillmentStatus || "");
      const s = String(o?.shipment?.status || "");
      return f === "delivered" || s === "delivered";
    });
  }, [orders]);

  const rows = useMemo(() => {
    const out = [];
    const q = search.trim().toLowerCase();

    for (const order of deliveredOrders) {
      const deliveredMonth = toMonthKey(getDeliveredAt(order));
      if (month && deliveredMonth !== month) continue;

      const orderId = order?.orderNumber || order?._id || "";
      const customerName = order?.shippingAddressSnapshot?.fullName || "";
      const customerState = order?.shippingAddressSnapshot?.state || "";

      const paymentMode = getPaymentMode(order);
      const paymentMethod = getPaymentMethodLabel(order);

      const courierName = "Shiprocket";
      const couponCode = order?.coupon?.code || "";

      const orderTotalAmount = Number(order?.totalAmount ?? 0);
      const orderDiscountRaw = Number(order?.discount ?? 0);

      const items = Array.isArray(order?.items) ? order.items : [];
      const lineTotals = items.map((it) => {
        const qty = Math.max(0, Number(it?.quantity || 0) || 0);
        const unitInclTax = Math.max(0, Number(it?.price || 0) || 0);
        return unitInclTax * qty;
      });

      const total = lineTotals.reduce((s, g) => s + g, 0);
      const orderDiscount = Math.min(Math.max(0, orderDiscountRaw), total);
      const alloc = allocateDiscountProRata(lineTotals, orderDiscount);

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const qty = Math.max(0, Number(it?.quantity || 0) || 0);
        if (qty <= 0) continue;

        const unitInclTax = Math.max(0, Number(it?.price || 0) || 0);
        const lineTotal = Math.max(0, lineTotals[idx] || 0);

        const allocatedDiscount = Math.min(lineTotal, Math.max(0, Number(alloc[idx] || 0)));
        const netLine = Math.max(0, lineTotal - allocatedDiscount);

        const taxableValue = netLine / (1 + TAX_RATE);
        const taxAmount = netLine - taxableValue;

        out.push({
          orderId,
          deliveredMonth,
          customerName,
          customerState,
          paymentMode,
          paymentMethod,
          courierName,

          productType: "Apparel",
          hsnCode: it?.productSnapshot?.hsnCode || "",
          productSize: it?.selectedSize || "",
          qty,

          sellingPrice: money2(unitInclTax),
          allocatedDiscount: money2(allocatedDiscount),
          netLine: money2(netLine),

          taxableValue: money2(taxableValue),
          taxAmount: money2(taxAmount),
          taxRate: "5%",

          orderTotalAmount: money2(orderTotalAmount),
          orderDiscount: money2(orderDiscountRaw),
          couponCode,
        });
      }
    }

    if (!q) return out;
    return out.filter((r) =>
      [
        r.orderId,
        r.customerName,
        r.customerState,
        r.paymentMode,
        r.paymentMethod,
        r.courierName,
        r.productType,
        r.hsnCode,
        r.productSize,
        r.couponCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [deliveredOrders, month, search]);

  const totals = useMemo(() => {
    const disc = rows.reduce((s, r) => s + Number(r.allocatedDiscount || 0), 0);
    const net = rows.reduce((s, r) => s + Number(r.netLine || 0), 0);
    const taxable = rows.reduce((s, r) => s + Number(r.taxableValue || 0), 0);
    const tax = rows.reduce((s, r) => s + Number(r.taxAmount || 0), 0);

    const orderMap = new Map();
    for (const r of rows) {
      if (!orderMap.has(r.orderId)) {
        orderMap.set(r.orderId, {
          orderTotalAmount: Number(r.orderTotalAmount || 0),
          orderDiscount: Number(r.orderDiscount || 0),
        });
      }
    }

    let sumOrderTotal = 0;
    let sumOrderDiscount = 0;
    for (const v of orderMap.values()) {
      sumOrderTotal += v.orderTotalAmount;
      sumOrderDiscount += v.orderDiscount;
    }

    return {
      rows: rows.length,
      orders: orderMap.size,
      disc: money2(disc),
      net: money2(net),
      taxable: money2(taxable),
      tax: money2(tax),
      sumOrderTotal: money2(sumOrderTotal),
      sumOrderDiscount: money2(sumOrderDiscount),
    };
  }, [rows]);

  const onDownload = () => downloadCSV(rows, `sales-report-${month || "all"}.csv`);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales Report</h1>
            <p className="text-sm text-neutral-600">
              Delivered only • Prices inclusive GST • Discount allocated pro-rata • Tax rate 5%
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-700">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (order/customer/HSN/coupon/payment-method/size...)"
              className="w-full sm:w-96 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />

            <button
              onClick={onDownload}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:opacity-80"
              style={{ boxShadow: "0 0 0 2px rgba(0,0,0,0.08)" }}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Summary (gross + final removed) */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">Rows</div>
            <div className="text-lg font-semibold">{totals.rows}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">Orders</div>
            <div className="text-lg font-semibold">{totals.orders}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">Allocated Discount</div>
            <div className="text-lg font-semibold">₹ {totals.disc}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">Net (incl)</div>
            <div className="text-lg font-semibold">₹ {totals.net}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">Taxable (excl)</div>
            <div className="text-lg font-semibold">₹ {totals.taxable}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">Tax (5%)</div>
            <div className="text-lg font-semibold">₹ {totals.tax}</div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="overflow-auto">
            <table className="min-w-[2250px] w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-black text-white">
                <tr className="text-left text-xs uppercase tracking-wide">
                  <th className="px-3 py-3">OrderId</th>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">State</th>

                  <th className="px-3 py-3">Pay</th>
                  <th className="px-3 py-3">Payment Method</th>
                  <th className="px-3 py-3">Courier</th>

                  <th className="px-3 py-3">Product Type</th>
                  <th className="px-3 py-3">HSN</th>
                  <th className="px-3 py-3">Size</th>
                  <th className="px-3 py-3">Qty</th>

                  <th className="px-3 py-3">Unit (incl)</th>
                  <th className="px-3 py-3">Disc</th>
                  <th className="px-3 py-3">Net (incl)</th>

                  <th className="px-3 py-3">Taxable</th>
                  <th className="px-3 py-3">Tax</th>
                  <th className="px-3 py-3">Rate</th>

                  <th className="px-3 py-3">Order total</th>
                  <th className="px-3 py-3">Order disc</th>
                  <th className="px-3 py-3">Coupon</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {loading && (
                  <tr>
                    <td className="px-3 py-4 text-neutral-600" colSpan={21}>
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td className="px-3 py-4 text-red-600" colSpan={21}>
                      {String(error)}
                    </td>
                  </tr>
                )}

                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-neutral-600" colSpan={21}>
                      No delivered orders found for selected month.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  rows.map((r, idx) => (
                    <tr
                      key={`${r.orderId}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                    >
                      <td className="px-3 py-3">
                        <span
                          className="rounded-md px-2 py-1 text-xs font-semibold"
                          style={{ background: "rgba(0,0,0,0.06)" }}
                        >
                          {r.orderId}
                        </span>
                      </td>
                      <td className="px-3 py-3">{r.deliveredMonth}</td>
                      <td className="px-3 py-3">{r.customerName}</td>
                      <td className="px-3 py-3">{r.customerState}</td>

                      <td className="px-3 py-3">{r.paymentMode}</td>
                      <td className="px-3 py-3">{r.paymentMethod}</td>
                      <td className="px-3 py-3">{r.courierName}</td>

                      <td className="px-3 py-3">{r.productType}</td>
                      <td className="px-3 py-3">{r.hsnCode}</td>
                      <td className="px-3 py-3">{r.productSize}</td>
                      <td className="px-3 py-3">{r.qty}</td>

                      <td className="px-3 py-3">₹ {r.sellingPrice}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium">
                          ₹ {r.allocatedDiscount}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium">₹ {r.netLine}</td>

                      <td className="px-3 py-3">₹ {r.taxableValue}</td>
                      <td className="px-3 py-3">₹ {r.taxAmount}</td>
                      <td className="px-3 py-3">{r.taxRate}</td>

                      <td className="px-3 py-3">₹ {r.orderTotalAmount}</td>
                      <td className="px-3 py-3">₹ {r.orderDiscount}</td>
                      <td className="px-3 py-3">{r.couponCode}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-neutral-600">
              Showing <span className="font-semibold text-black">{totals.rows}</span> rows from{" "}
              <span className="font-semibold text-black">{totals.orders}</span> delivered orders
            </div>
            <div className="text-xs text-neutral-600">
              Month filter uses delivered date (shipment/tracking). Discount is allocated across items (pro-rata).
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Notes: Discount uses <b>order.discount</b>. Item tax breakup computed on <b>net (after allocated discount)</b>{" "}
          because prices are tax-inclusive.
        </div>
      </div>
    </div>
  );
}
