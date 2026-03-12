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
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const safe = (v) => (v == null ? "" : String(v));

const formatCurrency = (amount, currency = "INR") => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "-";
  return `${currency} ${value.toLocaleString("en-IN")}`;
};

const labelize = (value = "") =>
  safe(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

export default function BlueDartExternalOrdersPage() {
  const {
    externalOrders,
    externalOrdersLoading,
    fetchExternalOrders,
  } = useBlueDartStore();

  const [search, setSearch] = useState("");
  const [shipStatus, setShipStatus] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    fetchExternalOrders({
      page,
      perPage,
      shipStatus,
    });
  }, [fetchExternalOrders, page, perPage, shipStatus]);

  const filteredOrders = useMemo(() => {
    const q = safe(search).trim().toLowerCase();
    if (!q) return externalOrders;

    return externalOrders.filter((order) => {
      const receiverName =
        safe(order?.receiver?.first_name) +
        " " +
        safe(order?.receiver?.last_name);

      return (
        safe(order?.id).toLowerCase().includes(q) ||
        safe(order?.orderId).toLowerCase().includes(q) ||
        safe(order?.orderNumber).toLowerCase().includes(q) ||
        safe(order?.awbNumber).toLowerCase().includes(q) ||
        safe(order?.status).toLowerCase().includes(q) ||
        safe(order?.shipStatus).toLowerCase().includes(q) ||
        receiverName.toLowerCase().includes(q)
      );
    });
  }, [externalOrders, search]);

  const handleRefresh = () => {
    fetchExternalOrders({
      page,
      perPage,
      shipStatus,
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                BlueDart / eShipz
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                External Orders
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                eShipz se pushed orders dekho, search karo, aur single order
                detail me inspect karo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={externalOrdersLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  externalOrdersLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_0.6fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Search
              </label>
              <div className="flex items-center rounded-2xl border border-neutral-200 bg-white px-3">
                <Search className="h-4 w-4 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by order id, AWB, receiver..."
                  className="w-full bg-transparent px-3 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Ship Status
              </label>
              <select
                value={shipStatus}
                onChange={(e) => {
                  setShipStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Per Page
              </label>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value) || 10);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} rows
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <TopCard
            icon={Package}
            label="Fetched Orders"
            value={String(externalOrders?.length || 0)}
          />
          <TopCard
            icon={Truck}
            label="Filtered Results"
            value={String(filteredOrders?.length || 0)}
          />
          <TopCard
            icon={IndianRupee}
            label="Visible Order Value"
            value={formatCurrency(
              filteredOrders.reduce(
                (sum, order) => sum + Number(order?.shipmentValue || 0),
                0
              )
            )}
          />
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 md:px-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Orders List
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                External eShipz orders with quick inspection.
              </p>
            </div>
          </div>

          {externalOrdersLoading ? (
            <div className="flex items-center gap-3 px-6 py-10 text-sm text-neutral-500">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Loading external orders...
            </div>
          ) : filteredOrders?.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-6 py-4 font-medium">Order</th>
                      <th className="px-6 py-4 font-medium">Receiver</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">AWB</th>
                      <th className="px-6 py-4 font-medium">Value</th>
                      <th className="px-6 py-4 font-medium">Items</th>
                      <th className="px-6 py-4 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => {
                      const receiverName = [
                        safe(order?.receiver?.first_name),
                        safe(order?.receiver?.last_name),
                      ]
                        .filter(Boolean)
                        .join(" ");

                      const receiverMeta = [
                        safe(order?.receiver?.phone),
                        safe(order?.receiver?.city),
                      ]
                        .filter(Boolean)
                        .join(" • ");

                      const detailId = order?.orderId || order?.id;

                      return (
                        <tr
                          key={`${order?.id}-${order?.orderId}`}
                          className="border-t border-neutral-100 align-top"
                        >
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-neutral-900">
                                {order?.orderNumber || order?.orderId || "-"}
                              </p>
                              <p className="text-xs text-neutral-500">
                                ID: {order?.id || order?.orderId || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-neutral-900">
                                {receiverName || "-"}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {receiverMeta || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <span className="inline-flex w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                                {labelize(order?.status || "unknown")}
                              </span>
                              {order?.shipStatus ? (
                                <span className="inline-flex w-fit rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-500">
                                  {labelize(order.shipStatus)}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-neutral-700">
                            {order?.awbNumber || "-"}
                          </td>

                          <td className="px-6 py-4 text-sm text-neutral-700">
                            {formatCurrency(
                              order?.shipmentValue,
                              order?.currency || "INR"
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-neutral-700">
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
                                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
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
                  Showing {filteredOrders.length} result(s) on page {page}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || externalOrdersLoading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <div className="rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
                    Page {page}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={externalOrdersLoading || externalOrders.length < perPage}
                    className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
                <Package className="h-5 w-5 text-neutral-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-neutral-900">
                No external orders found
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Search ya filters change karke dubara try karo.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TopCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-900 break-all">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
    </div>
  );
}