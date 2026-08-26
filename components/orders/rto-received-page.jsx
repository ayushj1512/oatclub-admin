"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageCheck,
  Search,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";

const LIMIT = 50;

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const cleanStatus = (value) =>
  String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function RtoReceivedPage({
  title = "RTO Received",
}) {
  const orders = useOrderStore((state) => state.orders);
  const ordersMeta = useOrderStore((state) => state.ordersMeta);

  const fetchAllOrders = useOrderStore(
    (state) => state.fetchAllOrders,
  );

  const updateRtoReceivedStatus = useOrderStore(
    (state) => state.updateRtoReceivedStatus,
  );

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [fetching, setFetching] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  /* ============================================================
     SEARCH DEBOUNCE
  ============================================================ */

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(String(searchInput || "").trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ============================================================
     BACKEND FETCH
  ============================================================ */

  const fetchOrders = useCallback(async () => {
    try {
      setFetching(true);

      const filters = {
        page,
        limit: LIMIT,
      };

      if (search) {
        filters.customerName = search;
      }

      if (filter === "received") {
        filters.isRtoReceived = true;
      }

      if (filter === "pending") {
        filters.isRtoReceived = false;
      }

      await fetchAllOrders(filters);
    } catch (error) {
      console.error(
        "Failed to fetch RTO received orders:",
        error,
      );
    } finally {
      setFetching(false);
    }
  }, [
    fetchAllOrders,
    filter,
    page,
    search,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ============================================================
     FILTER
  ============================================================ */

  const handleFilterChange = (value) => {
    if (value === filter) return;

    setFilter(value);
    setPage(1);
  };

  /* ============================================================
     RTO RECEIVED UPDATE
  ============================================================ */

  const handleToggle = async (order) => {
    if (!order?._id || updatingId) return;

    const nextValue =
      order?.isRtoReceived !== true;

    try {
      setUpdatingId(order._id);

      await updateRtoReceivedStatus(
        order._id,
        nextValue,
      );

      await fetchOrders();
    } catch (error) {
      console.error(
        "RTO received update failed:",
        error,
      );

      alert(
        error?.message ||
        "Failed to update RTO received status",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ============================================================
     PAGINATION
  ============================================================ */

  const currentPage = Number(
    ordersMeta?.page || page || 1,
  );

  const totalCount = Number(
    ordersMeta?.totalCount ??
    ordersMeta?.total ??
    orders?.length ??
    0,
  );

  const totalPages = Math.max(
    1,
    Number(ordersMeta?.totalPages || 1),
  );

  const hasPrevious =
    currentPage > 1;

  const hasNext =
    ordersMeta?.hasMore != null
      ? Boolean(ordersMeta.hasMore)
      : currentPage < totalPages;

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="w-full px-4 py-4 md:px-5">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Returns Operations
            </p>

            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-950">
                {title}
              </h1>

              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
                {totalCount} orders
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Mark any order as physically received at warehouse.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

            {/* ==================================================
                BACKEND FILTERS
            ================================================== */}

            <div className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() =>
                  handleFilterChange("all")
                }
                className={`h-7 rounded-md px-3 text-[11px] font-semibold transition ${filter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() =>
                  handleFilterChange("pending")
                }
                className={`h-7 rounded-md px-3 text-[11px] font-semibold transition ${filter === "pending"
                    ? "bg-orange-500 text-white"
                    : "bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-700"
                  }`}
              >
                Pending
              </button>

              <button
                type="button"
                onClick={() =>
                  handleFilterChange("received")
                }
                className={`h-7 rounded-md px-3 text-[11px] font-semibold transition ${filter === "received"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
              >
                Received
              </button>
            </div>

            {/* ==================================================
                BACKEND SEARCH
            ================================================== */}

            <div className="relative w-full sm:w-[340px]">
              {fetching ? (
                <Loader2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
              ) : (
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              )}

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Order, customer, phone, AWB..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[11px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>
        </div>

        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1120px] table-fixed border-collapse">

              <colgroup>
                <col style={{ width: "115px" }} />
                <col style={{ width: "205px" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "145px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "190px" }} />
              </colgroup>

              {/* ==================================================
                  TABLE HEADER
              ================================================== */}

              <thead>
                <tr className="h-10 border-b border-slate-200 bg-slate-50">
                  <th className="px-3 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Order
                  </th>

                  <th className="px-3 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-3 text-center text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Items
                  </th>

                  <th className="px-3 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>

                  <th className="px-3 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Fulfillment
                  </th>

                  <th className="px-3 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    RTO Date
                  </th>

                  <th className="px-3 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Received At
                  </th>

                  <th className="px-3 text-right text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              {/* ==================================================
                  TABLE BODY
              ================================================== */}

              <tbody>
                {(orders || []).map((order) => {
                  const received =
                    order?.isRtoReceived === true;

                  const updating =
                    updatingId === order?._id;

                  const customerName =
                    order?.customerId?.name ||
                    order
                      ?.shippingAddressSnapshot
                      ?.fullName ||
                    "-";

                  const phone =
                    order?.customerId?.phone ||
                    order
                      ?.shippingAddressSnapshot
                      ?.phone ||
                    "-";

                  const itemCount = (
                    order?.items || []
                  ).reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item?.quantity || 0,
                      ),
                    0,
                  );

                  const awb =
                    order?.shipment?.awb ||
                    order?.shipment
                      ?.shiprocket?.awb ||
                    "";

                  const rtoAt =
                    order
                      ?.fulfillmentDates
                      ?.rtoAt ||
                    order?.shipment?.rtoAt ||
                    null;

                  return (
                    <tr
                      key={order?._id}
                      className={`h-[50px] border-b border-slate-100 transition last:border-b-0 ${received
                          ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                          : "bg-white hover:bg-slate-50"
                        }`}
                    >

                      {/* ORDER */}

                      <td className="px-3 py-1.5">
                        <p className="truncate text-[11px] font-bold text-slate-950">
                          #{order?.orderNumber || "-"}
                        </p>

                        <p className="mt-0.5 truncate text-[9px] text-slate-400">
                          {awb || "No AWB"}
                        </p>
                      </td>

                      {/* CUSTOMER */}

                      <td className="px-3 py-1.5">
                        <p className="truncate text-[11px] font-semibold text-slate-900">
                          {customerName}
                        </p>

                        <p className="mt-0.5 truncate text-[9px] text-slate-400">
                          {phone}
                        </p>
                      </td>

                      {/* ITEMS */}

                      <td className="px-3 py-1.5 text-center text-[11px] font-semibold text-slate-700">
                        {itemCount}
                      </td>

                      {/* AMOUNT */}

                      <td className="px-3 py-1.5 text-[11px] font-bold text-slate-900">
                        {money(
                          order?.finalPayable ??
                          order?.totalAmount,
                        )}
                      </td>

                      {/* FULFILLMENT */}

                      <td className="px-3 py-1.5">
                        <span className="inline-flex max-w-full truncate rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-700">
                          {cleanStatus(
                            order?.fulfillmentStatus,
                          )}
                        </span>
                      </td>

                      {/* RTO DATE */}

                      <td className="px-3 py-1.5 text-[10px] text-slate-500">
                        {formatDateTime(rtoAt)}
                      </td>

                      {/* RECEIVED AT */}

                      <td className="px-3 py-1.5">
                        {received ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />

                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-semibold text-slate-800">
                                {formatDateTime(
                                  order?.rtoReceivedAt,
                                )}
                              </p>

                              <p className="text-[9px] font-medium text-emerald-600">
                                Warehouse received
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-md bg-orange-50 px-2 py-1 text-[9px] font-semibold text-orange-700">
                            Awaiting receipt
                          </span>
                        )}
                      </td>

                      {/* ==================================================
                          ACTION
                      ================================================== */}

                      <td className="px-3 py-1.5">
                        <div className="flex justify-end">

                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleToggle(order)
                            }
                            className={`inline-flex h-8 min-w-[136px] items-center justify-center gap-1.5 rounded-lg border px-3 text-[10px] font-bold shadow-sm transition ${received
                                ? "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                : "border-orange-500 bg-orange-500 text-white hover:border-orange-600 hover:bg-orange-600"
                              } ${updating
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                              }`}
                          >
                            {updating ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Updating
                              </>
                            ) : received ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Received
                              </>
                            ) : (
                              <>
                                <PackageCheck className="h-3.5 w-3.5" />
                                Mark Received
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ==================================================
                LOADING
            ================================================== */}

            {fetching &&
              (!orders ||
                orders.length === 0) && (
                <div className="flex h-44 items-center justify-center bg-white">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading orders...
                  </div>
                </div>
              )}

            {/* ==================================================
                EMPTY
            ================================================== */}

            {!fetching &&
              (!orders ||
                orders.length === 0) && (
                <div className="flex h-44 flex-col items-center justify-center bg-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <PackageCheck className="h-5 w-5 text-slate-400" />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    No orders found
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Try another search or filter.
                  </p>
                </div>
              )}
          </div>

          {/* ====================================================
              FOOTER / PAGINATION
          ==================================================== */}

          <div className="flex min-h-11 flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-[10px] text-slate-500">
              Showing{" "}
              <strong className="font-bold text-slate-800">
                {orders?.length || 0}
              </strong>{" "}
              of{" "}
              <strong className="font-bold text-slate-800">
                {totalCount}
              </strong>{" "}
              orders
            </p>

            <div className="flex items-center gap-2">

              {/* PREVIOUS */}

              <button
                type="button"
                disabled={
                  !hasPrevious ||
                  fetching
                }
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                  )
                }
                className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </button>

              {/* PAGE */}

              <span className="min-w-[80px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-semibold text-slate-600">
                {currentPage} / {totalPages}
              </span>

              {/* NEXT */}

              <button
                type="button"
                disabled={
                  !hasNext ||
                  fetching
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1,
                  )
                }
                className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
