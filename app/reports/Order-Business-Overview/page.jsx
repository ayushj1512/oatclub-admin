// app/reports/Order-Business-Overview/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useOrderReportsStore from "@/store/orderReportsStore";

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
};

const getCurrentMonth = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export default function OrderBusinessOverviewPage() {
  const {
    rows,
    summary,
    businessOverview,
    filters,
    pagination,
    loading,
    overviewLoading,
    error,
    overviewError,
    setFilter,
    setPage,
    setLimit,
    hydrateAndFetchAll,
    fetchProductSalesReport,
  } = useOrderReportsStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");

  useEffect(() => {
    if (!filters.month) {
      hydrateAndFetchAll({ month: getCurrentMonth(), page: 1 });
    } else {
      hydrateAndFetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const isBusy = loading || overviewLoading;

  const cards = useMemo(
    () => [
      {
        label: "Total Orders Received",
        value: formatNumber(businessOverview.totalOrdersReceived),
      },
      {
        label: "Total Revenue Generated",
        value: formatCurrency(businessOverview.totalRevenueGenerated),
      },
      {
        label: "Average Order Value (AOV)",
        value: formatCurrency(businessOverview.averageOrderValue),
      },
    ],
    [businessOverview]
  );

  const handleApplyFilters = async () => {
    await hydrateAndFetchAll({
      page: 1,
      search: searchInput.trim(),
    });
  };

  const handleMonthChange = async (e) => {
    const value = e.target.value;
    setFilter("month", value);
    await hydrateAndFetchAll({
      ...filters,
      month: value,
      page: 1,
    });
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await handleApplyFilters();
  };

  const handleSortChange = async (e) => {
    const value = e.target.value;
    setFilter("sort", value);
    await fetchProductSalesReport({
      ...filters,
      sort: value,
      page: 1,
      search: searchInput.trim(),
    });
  };

  const handlePrev = async () => {
    if (!pagination.hasPrev || loading) return;
    const prev = Math.max(1, Number(filters.page || 1) - 1);
    setPage(prev);
    await fetchProductSalesReport({
      ...filters,
      page: prev,
      search: searchInput.trim(),
    });
  };

  const handleNext = async () => {
    if (!pagination.hasNext || loading) return;
    const next = Number(filters.page || 1) + 1;
    setPage(next);
    await fetchProductSalesReport({
      ...filters,
      page: next,
      search: searchInput.trim(),
    });
  };

  const handleLimitChange = async (e) => {
    const value = Number(e.target.value || 20);
    setLimit(value);
    await fetchProductSalesReport({
      ...filters,
      page: 1,
      limit: value,
      search: searchInput.trim(),
    });
  };

  return (
    <section className="w-full px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Order &amp; Business Overview
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Summary of confirmed orders, revenue, AOV, and product-wise sales.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">
                Month
              </label>
              <input
                type="month"
                value={filters.month || ""}
                onChange={handleMonthChange}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {(overviewError || error) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {overviewError || error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {isBusy ? "Loading..." : card.value}
              </h2>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Product Sales Report
              </h3>
              <p className="text-sm text-gray-500">
                Total products: {formatNumber(summary.totalProducts)} | Total qty:{" "}
                {formatNumber(summary.totalQty)} | Total orders:{" "}
                {formatNumber(summary.totalOrders)}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by code or product name"
                  className="h-10 min-w-[240px] rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  Apply
                </button>
              </form>

              <select
                value={filters.sort || "qty_desc"}
                onChange={handleSortChange}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-black"
              >
                <option value="qty_desc">Qty: High to Low</option>
                <option value="qty_asc">Qty: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="code_asc">Code: A to Z</option>
                <option value="code_desc">Code: Z to A</option>
              </select>

              <select
                value={filters.limit || 20}
                onChange={handleLimitChange}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-black"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700">Code</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Avg Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      Loading report...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No data found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.key || row.productCode} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.productCode || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex min-w-[220px] items-center gap-3">
                          {row.productImage ? (
                            <img
                              src={row.productImage}
                              alt={row.productName || "Product"}
                              className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-100" />
                          )}

                          <span className="line-clamp-2">{row.productName || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatNumber(row.qty)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatCurrency(row.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page || 1} of {pagination.totalPages || 0} | Total rows:{" "}
              {formatNumber(pagination.total || 0)}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!pagination.hasPrev || loading}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!pagination.hasNext || loading}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}