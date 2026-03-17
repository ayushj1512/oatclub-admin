"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCcw,
  Search,
} from "lucide-react";
import { useOrderAccountsStore } from "@/store/orderAccountsStore";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(d);
};

const getCurrentMonth = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  return year && month ? `${year}-${month}` : "";
};

function StatCard({ title, value, subtext }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      {subtext ? <p className="mt-1 text-sm text-neutral-500">{subtext}</p> : null}
    </div>
  );
}

export default function RevenuePage() {
  const {
    orders,
    allOrders,
    summary,
    meta,
    filters,
    loading,
    downloading,
    hydratingAll,
    error,
    setMonth,
    setSearch,
    setStartDate,
    setEndDate,
    setPage,
    setLimit,
    fetchRevenueReport,
    downloadRevenueReportCsv,
  } = useOrderAccountsStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");

  useEffect(() => {
    const month = filters.month || getCurrentMonth();
    fetchRevenueReport({ month }, true).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const overviewOrders = Array.isArray(allOrders) && allOrders.length ? allOrders : orders;

  const derived = useMemo(() => {
    const list = Array.isArray(overviewOrders) ? overviewOrders : [];

    let highestOrder = null;
    let lowestOrder = null;

    for (const order of list) {
      const revenue = Number(order?.revenue || 0);

      if (!highestOrder || revenue > Number(highestOrder?.revenue || 0)) {
        highestOrder = order;
      }

      if (!lowestOrder || revenue < Number(lowestOrder?.revenue || 0)) {
        lowestOrder = order;
      }
    }

    const avgOrderValue = summary.totalOrders
      ? Number(summary.netRevenue || 0) / Number(summary.totalOrders || 1)
      : 0;

    return {
      highestOrder,
      lowestOrder,
      avgOrderValue,
      overallCount: list.length,
    };
  }, [overviewOrders, summary]);

  const runFetch = async (override = {}) => {
    try {
      await fetchRevenueReport(override, true);
    } catch {}
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setSearch(searchInput);
    await runFetch({ search: searchInput, page: 1 });
  };

  const handleMonthChange = async (value) => {
    setMonth(value);
    await runFetch({ month: value, page: 1 });
  };

  const handleStartDateChange = async (value) => {
    setStartDate(value);
    await runFetch({ startDate: value, page: 1 });
  };

  const handleEndDateChange = async (value) => {
    setEndDate(value);
    await runFetch({ endDate: value, page: 1 });
  };

  const handleLimitChange = async (value) => {
    const next = Number(value || 50);
    setLimit(next);
    await runFetch({ limit: next, page: 1 });
  };

  const handlePrev = async () => {
    if (!meta.hasPrevPage) return;
    const nextPage = Math.max(1, Number(meta.page || 1) - 1);
    setPage(nextPage);
    await runFetch({ page: nextPage });
  };

  const handleNext = async () => {
    if (!meta.hasNextPage) return;
    const nextPage = Number(meta.page || 1) + 1;
    setPage(nextPage);
    await runFetch({ page: nextPage });
  };

  return (
    <section className="min-h-screen bg-neutral-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Accounts
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
            Revenue
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Revenue summary with paginated order list and overall aggregated data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runFetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          <button
            onClick={() => downloadRevenueReportCsv()}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Downloading..." : "Download CSV"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Month</label>
          <input
            type="month"
            value={filters.month || ""}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Start date
          </label>
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            End date
          </label>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Rows per page
          </label>
          <select
            value={filters.limit || 50}
            onChange={(e) => handleLimitChange(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={150}>150</option>
            <option value={250}>250</option>
          </select>
        </div>

        <form onSubmit={handleSearchSubmit}>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Search</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search order number"
                className="w-full rounded-xl border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {hydratingAll ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Overall data sync ho raha hai...
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <StatCard
          title="Total Orders"
          value={formatNumber(summary.totalOrders)}
          subtext="Overall eligible orders"
        />
        <StatCard
          title="Net Revenue"
          value={formatCurrency(summary.netRevenue)}
          subtext="Overall final payable"
        />
        <StatCard
          title="Gross Revenue"
          value={formatCurrency(summary.grossRevenue)}
          subtext="Before discounts"
        />
        <StatCard
          title="Total Discount"
          value={formatCurrency(summary.totalDiscount)}
          subtext="Overall discount"
        />
        <StatCard
          title="COD Revenue"
          value={formatCurrency(summary.codRevenue)}
          subtext="Cash on delivery"
        />
        <StatCard
          title="Prepaid Revenue"
          value={formatCurrency(summary.prepaidRevenue)}
          subtext="Online payments"
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Average Order Value"
          value={formatCurrency(derived.avgOrderValue)}
          subtext="Overall average"
        />
        <StatCard
          title="Highest Revenue Day"
          value={summary.highestRevenueDay?._id || "—"}
          subtext={
            summary.highestRevenueDay
              ? `${formatCurrency(summary.highestRevenueDay.revenue)} • ${formatNumber(
                  summary.highestRevenueDay.orders || 0
                )} orders`
              : "No data"
          }
        />
        <StatCard
          title="Lowest Revenue Day"
          value={summary.lowestRevenueDay?._id || "—"}
          subtext={
            summary.lowestRevenueDay
              ? `${formatCurrency(summary.lowestRevenueDay.revenue)} • ${formatNumber(
                  summary.lowestRevenueDay.orders || 0
                )} orders`
              : "No data"
          }
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Highest Revenue Order
          </p>
          <p className="mt-2 text-xl font-semibold text-neutral-900">
            {derived.highestOrder?.orderNumber || "—"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {derived.highestOrder
              ? `${formatCurrency(derived.highestOrder.revenue)} • ${formatDate(
                  derived.highestOrder.deliveredAt
                )}`
              : "No data"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Lowest Revenue Order
          </p>
          <p className="mt-2 text-xl font-semibold text-neutral-900">
            {derived.lowestOrder?.orderNumber || "—"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {derived.lowestOrder
              ? `${formatCurrency(derived.lowestOrder.revenue)} • ${formatDate(
                  derived.lowestOrder.deliveredAt
                )}`
              : "No data"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Order Revenue Details</h2>
            <p className="text-sm text-neutral-600">
              Page {formatNumber(meta.page)} of {formatNumber(meta.totalPages)} •{" "}
              {formatNumber(meta.totalOrders)} total orders
            </p>
          </div>

          <div className="text-sm text-neutral-500">
            Overall fetched: {formatNumber(derived.overallCount)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-neutral-100 text-neutral-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Order Number</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Payment Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Revenue</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                    Loading revenue report...
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order, index) => (
                  <tr key={`${order.orderNumber}-${index}`} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {order.orderNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {formatDate(order.deliveredAt)}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {String(order.paymentMethod || "").toUpperCase() || "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {order.fulfillmentStatus || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {formatCurrency(order.revenue)}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {formatCurrency(order.discount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-neutral-600">
            Showing {formatNumber(orders.length)} orders on this page
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!meta.hasPrevPage || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <div className="rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800">
              {formatNumber(meta.page)} / {formatNumber(meta.totalPages)}
            </div>

            <button
              onClick={handleNext}
              disabled={!meta.hasNextPage || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}