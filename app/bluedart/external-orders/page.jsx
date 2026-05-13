"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCcw,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  IndianRupee,
  Truck,
  Filter,
  X,
  Hash,
  CreditCard,
  MapPin,
  Boxes,
  ExternalLink,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "In Transit", value: "in_transit" },
  { label: "Out For Delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "RTO", value: "rto" },
];

const PAYMENT_OPTIONS = [
  { label: "All Payments", value: "" },
  { label: "COD", value: "cod" },
  { label: "Prepaid", value: "prepaid" },
];

const safe = (v) => (v == null ? "" : String(v));

const labelize = (value = "") =>
  safe(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatCurrency = (amount, currency = "INR") => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "-";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || "INR"} ${value.toLocaleString("en-IN")}`;
  }
};

const getReceiverName = (receiver = {}) => {
  const name =
    receiver?.name ||
    receiver?.full_name ||
    receiver?.fullName ||
    [receiver?.first_name, receiver?.last_name].filter(Boolean).join(" ");

  return safe(name).trim();
};

const getReceiverMeta = (receiver = {}) =>
  [
    receiver?.phone || receiver?.mobile,
    receiver?.city,
    receiver?.state,
    receiver?.pincode || receiver?.zip,
  ]
    .filter(Boolean)
    .join(" • ");

const getDetailId = (order = {}) =>
  order?.orderId || order?.id || order?.orderNumber || order?.awbNumber || "";

const getStatusTone = (status = "") => {
  const s = safe(status).toLowerCase();

  if (s.includes("deliver")) return "bg-emerald-50 text-emerald-700";
  if (s.includes("cancel") || s.includes("fail"))
    return "bg-rose-50 text-rose-700";
  if (s.includes("rto") || s.includes("return"))
    return "bg-orange-50 text-orange-700";
  if (s.includes("ship") || s.includes("transit") || s.includes("ofd"))
    return "bg-blue-50 text-blue-700";

  return "bg-neutral-100 text-neutral-700";
};

export default function BlueDartExternalOrdersPage() {
  const {
    externalOrders,
    externalResponse,
    externalOrdersLoading,
    fetchExternalOrders,
    error,
  } = useBlueDartStore();

  const [search, setSearch] = useState("");
  const [shipStatus, setShipStatus] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const requestParams = useMemo(
    () => ({
      page,
      perPage,
      limit: perPage,
      shipStatus,
      status: shipStatus,
      paymentMode,
    }),
    [page, perPage, shipStatus, paymentMode]
  );

  useEffect(() => {
    fetchExternalOrders(requestParams);
  }, [fetchExternalOrders, requestParams]);

  const filteredOrders = useMemo(() => {
    const q = safe(search).trim().toLowerCase();

    return (externalOrders || []).filter((order) => {
      const receiverName = getReceiverName(order?.receiver).toLowerCase();
      const receiverMeta = getReceiverMeta(order?.receiver).toLowerCase();

      const matchesSearch =
        !q ||
        [
          order?.id,
          order?.orderId,
          order?.orderNumber,
          order?.awbNumber,
          order?.awb,
          order?.shipmentId,
          order?.status,
          order?.shipStatus,
          order?.paymentMode,
          receiverName,
          receiverMeta,
        ]
          .map((x) => safe(x).toLowerCase())
          .some((x) => x.includes(q));

      const matchesPayment =
        !paymentMode ||
        safe(order?.paymentMode).toLowerCase() === paymentMode.toLowerCase();

      return matchesSearch && matchesPayment;
    });
  }, [externalOrders, search, paymentMode]);

  const stats = useMemo(() => {
    const rows = filteredOrders || [];

    const totalValue = rows.reduce(
      (sum, order) => sum + Number(order?.shipmentValue || 0),
      0
    );

    const codValue = rows.reduce(
      (sum, order) => sum + Number(order?.codAmount || 0),
      0
    );

    const totalItems = rows.reduce(
      (sum, order) =>
        sum + (Array.isArray(order?.items) ? order.items.length : 0),
      0
    );

    const withAwb = rows.filter((order) => order?.awbNumber || order?.awb)
      .length;

    return {
      total: rows.length,
      fetched: externalOrders?.length || 0,
      totalValue,
      codValue,
      totalItems,
      withAwb,
    };
  }, [filteredOrders, externalOrders]);

  const handleRefresh = () => {
    fetchExternalOrders(requestParams);
  };

  const clearFilters = () => {
    setSearch("");
    setShipStatus("");
    setPaymentMode("");
    setPage(1);
  };

  const hasFilters = Boolean(search || shipStatus || paymentMode);

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="relative p-5 md:p-7">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-neutral-100/80" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  <ExternalLink className="h-3.5 w-3.5" />
                  BlueDart / Eshipz
                </div>

                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                  External Orders
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                  Eshipz orders ko fetch, inspect aur verify karo. AWB, receiver,
                  shipment status aur value ek jagah visible rahega.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={externalOrdersLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${
                      externalOrdersLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={Package}
            label="Visible Orders"
            value={stats.total}
            hint={`${stats.fetched} fetched`}
          />
          <MetricCard
            icon={Truck}
            label="AWB Assigned"
            value={stats.withAwb}
            hint="Visible rows"
          />
          <MetricCard
            icon={IndianRupee}
            label="Shipment Value"
            value={formatCurrency(stats.totalValue)}
            hint="Filtered total"
          />
          <MetricCard
            icon={CreditCard}
            label="COD Amount"
            value={formatCurrency(stats.codValue)}
            hint="Filtered total"
          />
          <MetricCard
            icon={Boxes}
            label="Items"
            value={stats.totalItems}
            hint="Visible items"
          />
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.6fr]">
            <div className="flex items-center rounded-2xl bg-neutral-50 px-3 ring-1 ring-neutral-100 transition focus-within:bg-white focus-within:ring-neutral-200">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, AWB, receiver, status..."
                className="w-full bg-transparent px-3 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>

            <select
              value={shipStatus}
              onChange={(e) => {
                setShipStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 outline-none ring-1 ring-neutral-100 transition focus:bg-white focus:ring-neutral-200"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 outline-none ring-1 ring-neutral-100 transition focus:bg-white focus:ring-neutral-200"
            >
              {PAYMENT_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value) || 20);
                setPage(1);
              }}
              className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 outline-none ring-1 ring-neutral-100 transition focus:bg-white focus:ring-neutral-200"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} rows
                </option>
              ))}
            </select>
          </div>
        </section>

        {error ? (
          <section className="rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
                Orders List
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                External Eshipz order data with quick route to detail page.
              </p>
            </div>

            {externalResponse ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
                External response available
              </span>
            ) : null}
          </div>

          {externalOrdersLoading ? (
            <TableLoading />
          ) : filteredOrders?.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-neutral-50/80">
                    <tr className="text-left text-xs uppercase tracking-[0.14em] text-neutral-400">
                      <th className="px-6 py-4 font-semibold">Order</th>
                      <th className="px-6 py-4 font-semibold">Receiver</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">AWB / Shipment</th>
                      <th className="px-6 py-4 font-semibold">Payment</th>
                      <th className="px-6 py-4 font-semibold">Value</th>
                      <th className="px-6 py-4 font-semibold">Items</th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100">
                    {filteredOrders.map((order, index) => {
                      const receiverName = getReceiverName(order?.receiver);
                      const receiverMeta = getReceiverMeta(order?.receiver);
                      const detailId = getDetailId(order);

                      return (
                        <tr
                          key={`${order?.id || "order"}-${
                            order?.orderId || index
                          }`}
                          className="align-top transition hover:bg-neutral-50/60"
                        >
                          <td className="px-6 py-4">
                            <div className="min-w-[180px] space-y-1">
                              <p className="text-sm font-semibold text-neutral-950">
                                {order?.orderNumber || order?.orderId || "-"}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <Hash className="h-3.5 w-3.5" />
                                {order?.id || order?.orderId || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="min-w-[210px] space-y-1">
                              <p className="text-sm font-semibold text-neutral-900">
                                {receiverName || "-"}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <MapPin className="h-3.5 w-3.5" />
                                {receiverMeta || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex min-w-[150px] flex-col gap-2">
                              <span
                                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                                  order?.status
                                )}`}
                              >
                                {labelize(order?.status || "unknown")}
                              </span>

                              {order?.shipStatus ? (
                                <span
                                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                                    order?.shipStatus
                                  )}`}
                                >
                                  {labelize(order.shipStatus)}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="min-w-[170px] space-y-1">
                              <p className="text-sm font-semibold text-neutral-800">
                                {order?.awbNumber || order?.awb || "-"}
                              </p>
                              <p className="text-xs text-neutral-500">
                                Shipment: {order?.shipmentId || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                              {labelize(order?.paymentMode || "-")}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="min-w-[120px] space-y-1">
                              <p className="text-sm font-semibold text-neutral-900">
                                {formatCurrency(
                                  order?.shipmentValue,
                                  order?.currency || "INR"
                                )}
                              </p>
                              {Number(order?.codAmount || 0) > 0 ? (
                                <p className="text-xs text-neutral-500">
                                  COD:{" "}
                                  {formatCurrency(
                                    order?.codAmount,
                                    order?.currency || "INR"
                                  )}
                                </p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm font-medium text-neutral-700">
                            {Array.isArray(order?.items)
                              ? order.items.length
                              : 0}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {detailId ? (
                              <Link
                                href={`/bluedart/external-orders/${encodeURIComponent(
                                  detailId
                                )}`}
                                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                              >
                                <FileSearch className="h-4 w-4" />
                                View
                              </Link>
                            ) : (
                              <span className="text-sm text-neutral-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4 md:px-6">
                <p className="text-sm text-neutral-500">
                  Showing{" "}
                  <span className="font-semibold text-neutral-800">
                    {filteredOrders.length}
                  </span>{" "}
                  result(s) on page{" "}
                  <span className="font-semibold text-neutral-800">{page}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || externalOrdersLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <div className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
                    Page {page}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={
                      externalOrdersLoading || (externalOrders || []).length < perPage
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {label}
          </p>
          <p className="mt-2 truncate text-xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
        </div>

        <div className="rounded-2xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
    </div>
  );
}

function TableLoading() {
  return (
    <div className="space-y-3 px-6 py-8">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-16 animate-pulse rounded-2xl bg-neutral-100"
        />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
        <Package className="h-6 w-6 text-neutral-500" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-neutral-950">
        No external orders found
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-neutral-500">
        Eshipz se orders nahi aaye ya current filters ke according result empty
        hai.
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      ) : null}
    </div>
  );
}