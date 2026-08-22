"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";

import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";

const LIMIT = 100;

export default function ExchangeOrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);
  const loading = useOrderStore((s) => s.loading);
  const error = useOrderStore((s) => s.error);
  const fetchExchangeOrders = useOrderStore((s) => s.fetchExchangeOrders);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filters = useMemo(() => {
    const f = { page, limit: LIMIT };

    if (search) f.customerName = search;
    if (status) f.fulfillmentStatus = status;

    return f;
  }, [page, search, status]);

  const loadOrders = useCallback(async () => {
    await fetchExchangeOrders(filters);
  }, [fetchExchangeOrders, filters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const totalCount =
    Number(ordersMeta?.totalCount) ||
    Number(ordersMeta?.total) ||
    orders.length;

  const totalPages =
    Number(ordersMeta?.totalPages) ||
    Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <section className="min-h-screen w-full bg-[#f7f7f8] p-5 lg:p-6">
      <div className="w-full space-y-4">

        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <ArrowLeftRight size={20} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  Exchange Orders
                </h1>

                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">
                  {totalCount}
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Replacement orders created from approved exchanges.
              </p>
            </div>
          </div>

          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* FILTERS */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex h-11 flex-1 items-center gap-3 rounded-xl bg-zinc-50 px-4">
              <Search size={17} className="shrink-0 text-zinc-400" />

              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="Search order number or customer"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="h-11 rounded-xl bg-zinc-50 px-4 text-sm font-medium outline-none lg:w-52"
            >
              <option value="">All Status</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="picked">Picked</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={applySearch}
              className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Search
            </button>

            <button
              onClick={clearFilters}
              className="h-11 rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-200"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ORDERS */}
        <div className="w-full overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-zinc-950">
                Exchange Replacements
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Showing {orders.length} orders
              </p>
            </div>

            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
              Exchange Orders
            </span>
          </div>

          {loading && !orders.length ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              Loading exchange orders...
            </div>
          ) : error ? (
            <div className="m-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
            </div>
          ) : !orders.length ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <ArrowLeftRight size={20} />
              </div>

              <p className="mt-4 font-semibold text-zinc-900">
                No exchange orders found
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Exchange replacement orders will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="w-full px-4 py-2 transition hover:bg-zinc-50/70"
                >
                  <OrderRow
                    order={order}
                    onOrderUpdated={syncOrderInList}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-zinc-500">
              Page{" "}
              <strong className="text-zinc-900">{page}</strong>
              {" / "}
              <strong className="text-zinc-900">{totalPages}</strong>
            </p>

            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-10 items-center gap-1 rounded-xl bg-zinc-100 px-4 text-sm font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <button
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                className="inline-flex h-10 items-center gap-1 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
