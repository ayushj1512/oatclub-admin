"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const PAGE_SIZE = 100;

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNum(value));

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

function SummaryCard({ title, value, icon: Icon, tone = "gray", subtext = "" }) {
  const styles = {
    gray: "bg-gray-50 text-gray-700 border-gray-100",
    red: "bg-red-50 text-red-700 border-red-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className={`rounded-2xl border p-5 ${styles[tone] || styles.gray}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold opacity-80">{title}</p>
          <h3 className="mt-2 text-2xl font-bold">{value}</h3>
          {subtext ? <p className="mt-2 text-xs opacity-75">{subtext}</p> : null}
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  totalCount,
  loading,
  onRefresh,
  onPageChange,
}) {
  const items = getPaginationItems(currentPage, totalPages);

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
          {" • "}
          <span className="text-gray-400">{PAGE_SIZE} per page</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              loading
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "border border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Refreshing...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} />
                Refresh
              </span>
            )}
          </button>

          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={loading || currentPage <= 1}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              loading || currentPage <= 1
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "border border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={loading || currentPage >= totalPages}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              loading || currentPage >= totalPages
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "bg-black text-white hover:opacity-90"
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
            <span key={`dots-${idx}`} className="px-3 py-2 text-sm text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              disabled={loading}
              className={`min-w-[42px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
                currentPage === item
                  ? "bg-black text-white"
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

export default function RefundEscalationPage() {
  const orders = useOrderRefundStore((s) => s.orders);
  const summary = useOrderRefundStore((s) => s.summary);
  const pagination = useOrderRefundStore((s) => s.pagination);
  const filters = useOrderRefundStore((s) => s.filters);
  const loading = useOrderRefundStore((s) => s.loading);
  const refreshing = useOrderRefundStore((s) => s.refreshing);
  const error = useOrderRefundStore((s) => s.error);

  const fetchRefundOrders = useOrderRefundStore((s) => s.fetchRefundOrders);
  const refreshRefundOrders = useOrderRefundStore((s) => s.refreshRefundOrders);
  const setFilters = useOrderRefundStore((s) => s.setFilters);
  const resetFilters = useOrderRefundStore((s) => s.resetFilters);
  const goToPage = useOrderRefundStore((s) => s.goToPage);
  const updateOrderInList = useOrderRefundStore((s) => s.updateOrderInList);

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const loadData = useCallback(async () => {
    await fetchRefundOrders({ limit: PAGE_SIZE });
    setHasLoadedOnce(true);
  }, [fetchRefundOrders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = useCallback(
    async (next = {}) => {
      await fetchRefundOrders({
        ...next,
        page: 1,
        limit: PAGE_SIZE,
        startDate: next.startDate ?? filters.startDate,
        endDate: next.endDate ?? filters.endDate,
      });
    },
    [fetchRefundOrders, filters.startDate, filters.endDate]
  );

  const handleSearch = useCallback(() => {
    applyFilters({ search: searchInput.trim() });
  }, [applyFilters, searchInput]);

  const handleClear = useCallback(async () => {
    resetFilters();
    setSearchInput("");
    await fetchRefundOrders({
      page: 1,
      limit: PAGE_SIZE,
      search: "",
      paymentStatus: "",
      startDate: "",
      endDate: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      onlyActionRequired: false,
    });
  }, [fetchRefundOrders, resetFilters]);

  const handleRefresh = useCallback(async () => {
    await refreshRefundOrders();
  }, [refreshRefundOrders]);

  const handleOrderUpdated = useCallback(
    (updatedOrder) => {
      if (!updatedOrder?._id && !updatedOrder?.id) return;
      updateOrderInList(updatedOrder);
    },
    [updateOrderInList]
  );

  const currentPage = Math.max(1, toNum(pagination?.page, 1));
  const totalPages = Math.max(1, toNum(pagination?.totalPages, 1));
  const totalCount = toNum(pagination?.totalCount, 0);

  const chips = useMemo(
    () => [
      { label: "All", type: "reset" },
      { label: "Action Required", type: "action" },
      { label: "Refund Pending", type: "paymentStatus", value: "refund_pending" },
      { label: "Paid", type: "paymentStatus", value: "paid" },
      { label: "Newest", type: "sortBy", value: "createdAt" },
      { label: "Highest Amount", type: "sortBy", value: "finalPayable" },
    ],
    []
  );

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto space-y-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Refund Escalation
            </h1>
            <p className="mt-1 text-gray-500">
              Identify cancelled Razorpay orders needing refund action.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
                {toNum(summary?.actionRequiredCount)} Action Required
              </span>
              <span className="rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-700">
                {toNum(summary?.refundPendingCount)} Refund Pending
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                {formatINR(summary?.totalRefundAmount)} Total Refund
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm xl:w-96">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchInput}
                placeholder="Search order / customer / email / phone / payment id..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <button
              onClick={handleSearch}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              <Search size={18} />
              Search
            </button>

            <button
              onClick={handleClear}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Refund Candidates"
            value={toNum(summary?.totalOrders)}
            icon={ShieldAlert}
            tone="gray"
            subtext="Cancelled Razorpay orders in refund flow."
          />
          <SummaryCard
            title="Action Required"
            value={toNum(summary?.actionRequiredCount)}
            icon={AlertCircle}
            tone="red"
            subtext="Paid orders where refund still needs action."
          />
          <SummaryCard
            title="Refund Pending"
            value={toNum(summary?.refundPendingCount)}
            icon={RefreshCw}
            tone="orange"
            subtext="Pending refunds that may need escalation."
          />
          <SummaryCard
            title="Refund Amount"
            value={formatINR(summary?.totalRefundAmount)}
            icon={IndianRupee}
            tone="green"
            subtext="Approx total payable across current results."
          />
        </div>

        <Card>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Payment Status
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => applyFilters({ paymentStatus: e.target.value })}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-black/10"
              >
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="refund_pending">Refund Pending</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ startDate: value, page: 1 });
                  applyFilters({ startDate: value });
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ endDate: value, page: 1 });
                  applyFilters({ endDate: value });
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => applyFilters({ sortBy: e.target.value })}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-black/10"
              >
                <option value="createdAt">Created At</option>
                <option value="finalPayable">Refund Amount</option>
                <option value="orderNumber">Order Number</option>
                <option value="paymentStatus">Payment Status</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => applyFilters({ sortOrder: e.target.value })}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-black/10"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => {
                const isActive =
                  chip.type === "reset"
                    ? !filters.paymentStatus &&
                      !filters.onlyActionRequired &&
                      filters.sortBy === "createdAt"
                    : chip.type === "action"
                    ? Boolean(filters.onlyActionRequired)
                    : chip.type === "paymentStatus"
                    ? filters.paymentStatus === chip.value
                    : filters.sortBy === chip.value;

                const handleClick = async () => {
                  if (chip.type === "reset") return handleClear();
                  if (chip.type === "action") {
                    return applyFilters({
                      onlyActionRequired: !filters.onlyActionRequired,
                    });
                  }
                  if (chip.type === "paymentStatus") {
                    return applyFilters({
                      paymentStatus:
                        filters.paymentStatus === chip.value ? "" : chip.value,
                    });
                  }
                  return applyFilters({ sortBy: chip.value });
                };

                return (
                  <button
                    key={`${chip.type}-${chip.label}`}
                    onClick={handleClick}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(filters.onlyActionRequired)}
                onChange={() =>
                  applyFilters({
                    onlyActionRequired: !filters.onlyActionRequired,
                  })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              Show only action required
            </label>
          </div>

          <div className="mt-6">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              loading={loading || refreshing}
              onRefresh={handleRefresh}
              onPageChange={goToPage}
            />
          </div>
        </Card>

        {error ? (
          <Card className="border-red-100 bg-red-50/80">
            <div className="flex items-start gap-3 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load refund orders</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Order #</th>
                  <th className="px-5 py-4 text-left font-semibold">Customer</th>
                  <th className="px-5 py-4 text-left font-semibold">Payment</th>
                  <th className="px-5 py-4 text-left font-semibold">Fulfillment</th>
                  <th className="px-5 py-4 text-left font-semibold">Amount</th>
                  <th className="px-5 py-4 text-left font-semibold">Date</th>
                  <th className="px-5 py-4 text-left font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading && !hasLoadedOnce ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-gray-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Loading refund escalation orders...
                      </div>
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map((order, idx) => {
                    const rowKey =
                      order?._id ||
                      order?.id ||
                      order?.orderNumber ||
                      `refund-order-${idx}`;

                    return (
                      <OrderRow
                        key={String(rowKey)}
                        order={order}
                        onUpdated={handleOrderUpdated}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No refund escalation orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Card>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            loading={loading || refreshing}
            onRefresh={handleRefresh}
            onPageChange={goToPage}
          />
        </Card>
      </div>
    </section>
  );
}