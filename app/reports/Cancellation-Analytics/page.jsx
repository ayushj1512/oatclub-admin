"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarDays,
  CreditCard,
  IndianRupee,
  PackageX,
  RefreshCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TrendingDown,
  UserRoundX,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useOrderReportsStore } from "@/store/orderReportsStore";

const formatMoney = (value = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatNumber = (value = 0) =>
  Number(value || 0).toLocaleString("en-IN");

const rangeOptions = [
  { label: "All Time", value: "" },
  { label: "This Week", value: "weekly" },
  { label: "This Month", value: "month" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 15 Days", value: "last15" },
  { label: "Last 30 Days", value: "last30" },
  { label: "Custom", value: "custom" },
];

const reasonSortOptions = [
  { label: "Highest Orders", value: "orders_desc" },
  { label: "Lowest Orders", value: "orders_asc" },
  { label: "Highest Revenue", value: "revenue_desc" },
  { label: "Lowest Revenue", value: "revenue_asc" },
  { label: "Reason A-Z", value: "reason_asc" },
];

const productSortOptions = [
  { label: "Highest Quantity", value: "qty_desc" },
  { label: "Lowest Quantity", value: "qty_asc" },
  { label: "Highest Revenue", value: "revenue_desc" },
  { label: "Lowest Revenue", value: "revenue_asc" },
  { label: "Product A-Z", value: "name_asc" },
];

const cleanLabel = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const getPercent = (value, total) => {
  const n = Number(value || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Number(((n / t) * 100).toFixed(1));
};

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            {value}
          </h3>
          {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
        </div>

        <div className="rounded-2xl bg-gray-50 p-3 text-gray-700">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ title = "No data found" }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">
      {title}
    </div>
  );
}

export default function CancellationAnalyticsPage() {
  const {
    filters,
    cancellationSummary,
    cancellationReasonBreakdown,
    cancellationByBreakdown,
    cancellationPaymentMethodBreakdown,
    cancellationDailyTrend,
    topCancelledProducts,
    cancellationLoading,
    cancellationError,
    hydrateAndFetchCancellations,
    refreshCancellations,
    setFilters,
  } = useOrderReportsStore();

  const [reasonSearch, setReasonSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [reasonSort, setReasonSort] = useState("orders_desc");
  const [productSort, setProductSort] = useState("qty_desc");

  useEffect(() => {
    hydrateAndFetchCancellations({
      range: filters.range || "last30",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryCards = [
    {
      title: "Cancelled Orders",
      value: formatNumber(cancellationSummary.totalCancelledOrders),
      sub: `${cancellationSummary.cancellationRate || 0}% cancellation rate`,
      icon: PackageX,
    },
    {
      title: "Revenue Impact",
      value: formatMoney(cancellationSummary.totalCancelledRevenue),
      sub: "Potential revenue loss",
      icon: IndianRupee,
    },
    {
      title: "Avg Cancelled Value",
      value: formatMoney(cancellationSummary.avgCancelledOrderValue),
      sub: "Average cancelled order value",
      icon: TrendingDown,
    },
    {
      title: "Refund Pending",
      value: formatNumber(cancellationSummary.refundPendingOrders),
      sub: "Cancelled prepaid refund queue",
      icon: ShieldAlert,
    },
  ];

  const paymentPieData = useMemo(() => {
    return cancellationPaymentMethodBreakdown.map((row) => ({
      name: cleanLabel(row.paymentMethod),
      value: Number(row.totalOrders || 0),
      revenue: Number(row.revenue || 0),
    }));
  }, [cancellationPaymentMethodBreakdown]);

  const cancelledByData = useMemo(() => {
    return cancellationByBreakdown.map((row) => ({
      name: cleanLabel(row.cancelledBy),
      orders: Number(row.totalOrders || 0),
      revenue: Number(row.revenue || 0),
    }));
  }, [cancellationByBreakdown]);

  const reasonRows = useMemo(() => {
    let rows = [...cancellationReasonBreakdown];

    if (reasonSearch.trim()) {
      const q = reasonSearch.trim().toLowerCase();
      rows = rows.filter((row) =>
        cleanLabel(row.reason).toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      if (reasonSort === "orders_asc") {
        return Number(a.totalOrders || 0) - Number(b.totalOrders || 0);
      }

      if (reasonSort === "revenue_desc") {
        return Number(b.revenue || 0) - Number(a.revenue || 0);
      }

      if (reasonSort === "revenue_asc") {
        return Number(a.revenue || 0) - Number(b.revenue || 0);
      }

      if (reasonSort === "reason_asc") {
        return cleanLabel(a.reason).localeCompare(cleanLabel(b.reason));
      }

      return Number(b.totalOrders || 0) - Number(a.totalOrders || 0);
    });

    return rows;
  }, [cancellationReasonBreakdown, reasonSearch, reasonSort]);

  const productRows = useMemo(() => {
    let rows = [...topCancelledProducts];

    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          String(row.productCode || "").toLowerCase().includes(q) ||
          String(row.productName || "").toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      if (productSort === "qty_asc") {
        return Number(a.cancelledQty || 0) - Number(b.cancelledQty || 0);
      }

      if (productSort === "revenue_desc") {
        return Number(b.cancelledRevenue || 0) - Number(a.cancelledRevenue || 0);
      }

      if (productSort === "revenue_asc") {
        return Number(a.cancelledRevenue || 0) - Number(b.cancelledRevenue || 0);
      }

      if (productSort === "name_asc") {
        return String(a.productName || "").localeCompare(
          String(b.productName || "")
        );
      }

      return Number(b.cancelledQty || 0) - Number(a.cancelledQty || 0);
    });

    return rows;
  }, [topCancelledProducts, productSearch, productSort]);

  const handleApplyFilters = () => {
    hydrateAndFetchCancellations({
      range: filters.range,
      from: filters.from,
      to: filters.to,
    });
  };

  const handleReset = () => {
    setFilters({
      range: "last30",
      from: "",
      to: "",
    });

    hydrateAndFetchCancellations({
      range: "last30",
      from: "",
      to: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 text-gray-950 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-gray-400">
            Reports
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Cancellation Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Track cancellation reasons, revenue impact, COD vs prepaid behaviour,
            refund queue, and products with high cancellation risk.
          </p>
        </div>

        <button
          onClick={refreshCancellations}
          disabled={cancellationLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={16}
            className={cancellationLoading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Range
            </label>
            <select
              value={filters.range || ""}
              onChange={(e) => setFilters({ range: e.target.value })}
              className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            >
              {rangeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              From
            </label>
            <div className="relative">
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={filters.from || ""}
                onChange={(e) => setFilters({ from: e.target.value })}
                className="h-11 w-full rounded-xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              To
            </label>
            <div className="relative">
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={filters.to || ""}
                onChange={(e) => setFilters({ to: e.target.value })}
                className="h-11 w-full rounded-xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyFilters}
              disabled={cancellationLoading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
            >
              <SlidersHorizontal size={16} />
              Apply
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <XCircle size={16} />
              Reset
            </button>
          </div>
        </div>
      </Card>

      {cancellationError ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">
          {cancellationError}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Daily Cancellation Trend</h2>
              <p className="text-xs text-gray-500">
                Orders and revenue impact by cancellation date.
              </p>
            </div>
          </div>

          {cancellationDailyTrend.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cancellationDailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ymd" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? [formatMoney(value), "Revenue"]
                        : [formatNumber(value), "Orders"]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    strokeWidth={2}
                    fillOpacity={0.15}
                  />
                  <Line type="monotone" dataKey="totalOrders" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Payment Method Split</h2>
          <p className="mb-4 text-xs text-gray-500">
            COD vs prepaid cancellation behaviour.
          </p>

          {paymentPieData.length ? (
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {paymentPieData.map((_, index) => (
                      <Cell key={index} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, item) => [
                      `${formatNumber(value)} orders • ${formatMoney(
                        item?.payload?.revenue
                      )}`,
                      item?.payload?.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">COD Cancelled</p>
              <p className="mt-1 text-lg font-semibold">
                {formatNumber(cancellationSummary.codCancelled)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Prepaid Cancelled</p>
              <p className="mt-1 text-lg font-semibold">
                {formatNumber(cancellationSummary.prepaidCancelled)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Cancelled By Breakdown</h2>
          <p className="mb-4 text-xs text-gray-500">
            Customer, admin, or system initiated cancellation.
          </p>

          {cancelledByData.length ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cancelledByData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? [formatMoney(value), "Revenue"]
                        : [formatNumber(value), "Orders"]
                    }
                  />
                  <Bar dataKey="orders" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Confirmation Risk Split</h2>
          <p className="mb-4 text-xs text-gray-500">
            Shows cancellations before vs after order confirmation.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-3 inline-flex rounded-xl bg-white p-3 text-gray-700 shadow-sm">
                <UserRoundX size={18} />
              </div>
              <p className="text-sm text-gray-500">Unconfirmed Cancelled</p>
              <h3 className="mt-2 text-3xl font-semibold">
                {formatNumber(cancellationSummary.unconfirmedCancelled)}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {getPercent(
                  cancellationSummary.unconfirmedCancelled,
                  cancellationSummary.totalCancelledOrders
                )}
                % of cancellations
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-3 inline-flex rounded-xl bg-white p-3 text-gray-700 shadow-sm">
                <CreditCard size={18} />
              </div>
              <p className="text-sm text-gray-500">Confirmed Cancelled</p>
              <h3 className="mt-2 text-3xl font-semibold">
                {formatNumber(cancellationSummary.confirmedCancelled)}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {getPercent(
                  cancellationSummary.confirmedCancelled,
                  cancellationSummary.totalCancelledOrders
                )}
                % of cancellations
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-950 p-4 text-white">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Insight</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-300">
                  High unconfirmed cancellations usually means COD confirmation
                  flow needs stronger WhatsApp/SMS follow-up. High confirmed
                  cancellations means product, delivery, price or support issue.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold">
                Cancellation Reasons
              </h2>
              <p className="text-xs text-gray-500">
                Detailed reason-wise order and revenue impact.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={reasonSearch}
                  onChange={(e) => setReasonSearch(e.target.value)}
                  placeholder="Search reason"
                  className="h-10 w-40 rounded-xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
                />
              </div>

              <select
                value={reasonSort}
                onChange={(e) => setReasonSort(e.target.value)}
                className="h-10 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
              >
                {reasonSortOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Share</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reasonRows.length ? (
                  reasonRows.map((row) => (
                    <tr key={row.reason} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {cleanLabel(row.reason)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatNumber(row.totalOrders)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {getPercent(
                          row.totalOrders,
                          cancellationSummary.totalCancelledOrders
                        )}
                        %
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(row.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No cancellation reasons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Reason Revenue Impact</h2>
          <p className="mb-4 text-xs text-gray-500">
            Top reasons by cancelled revenue value.
          </p>

          {reasonRows.length ? (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonRows.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey={(row) => cleanLabel(row.reason)}
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [formatMoney(value), "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Top Cancelled Products</h2>
            <p className="text-xs text-gray-500">
              Products with highest cancellation quantity and revenue impact.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product"
                className="h-10 w-44 rounded-xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
              />
            </div>

            <select
              value={productSort}
              onChange={(e) => setProductSort(e.target.value)}
              className="h-10 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
            >
              {productSortOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl ring-1 ring-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-right">Cancelled Qty</th>
                <th className="px-4 py-3 text-right">Revenue Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {productRows.length ? (
                productRows.map((row) => (
                  <tr key={row.productCode} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-xl bg-gray-100">
                          {row.productImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.productImage}
                              alt={row.productName || "Product"}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-medium text-gray-950">
                            {row.productName || "Untitled Product"}
                          </p>
                          <p className="text-xs text-gray-400">
                            High cancellation product
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.productCode || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNumber(row.cancelledQty)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatMoney(row.cancelledRevenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No cancelled products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
        <p>
          Showing data for:{" "}
          <span className="font-medium text-gray-600">
            {filters.range || "all time"}
          </span>
        </p>

        <div className="inline-flex items-center gap-1">
          <ArrowDownUp size={13} />
          Filters and sorting are applied client-side for detailed sections.
        </div>
      </div>
    </div>
  );
}