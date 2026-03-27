 "use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  SlidersHorizontal,
  CalendarDays,
  FileText,
  Package2,
} from "lucide-react";
import { useFabricLogStore } from "@/store/useFabricLogStore";

const ACTION_OPTIONS = [
  { label: "All Actions", value: "" },
  { label: "Stock Added", value: "stock_added" },
  { label: "Stock Subtracted", value: "stock_subtracted" },
  { label: "Stock Adjusted", value: "stock_adjusted" },
  { label: "Negative Blocked", value: "negative_stock_blocked" },
  { label: "Created", value: "created" },
  { label: "Updated", value: "updated" },
  { label: "Deleted", value: "deleted" },
];

const TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "Add", value: "add" },
  { label: "Subtract", value: "subtract" },
  { label: "Adjust", value: "adjust" },
  { label: "Info", value: "info" },
];

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatQty = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const getTypeBadge = (type) => {
  if (type === "add") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (type === "subtract") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (type === "adjust") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-neutral-100 text-neutral-700 border-neutral-200";
};

const getActionBadge = (action) => {
  if (action === "stock_added") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (action === "stock_subtracted") {
    return "bg-red-50 text-red-700";
  }
  if (action === "stock_adjusted") {
    return "bg-amber-50 text-amber-700";
  }
  if (action === "negative_stock_blocked") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-neutral-100 text-neutral-700";
};

export default function FabricLogsPage() {
  const {
    logs,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    fetchFabricLogs,
    resetMessages,
  } = useFabricLogStore();

  const [localFilters, setLocalFilters] = useState({
    q: "",
    action: "",
    type: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchFabricLogs();
  }, [fetchFabricLogs]);

  useEffect(() => {
    setLocalFilters({
      q: filters?.q || "",
      action: filters?.action || "",
      type: filters?.type || "",
      startDate: filters?.startDate || "",
      endDate: filters?.endDate || "",
    });
  }, [filters]);

  const handleApplyFilters = async () => {
    resetMessages?.();
    setFilters({
      ...filters,
      ...localFilters,
    });

    await fetchFabricLogs({
      ...localFilters,
      page: 1,
    });
  };

  const handleResetFilters = async () => {
    const next = {
      q: "",
      action: "",
      type: "",
      startDate: "",
      endDate: "",
      sortBy: "logDate",
      sortOrder: "desc",
    };

    setLocalFilters({
      q: "",
      action: "",
      type: "",
      startDate: "",
      endDate: "",
    });

    setFilters(next);
    await fetchFabricLogs({
      ...next,
      page: 1,
    });
  };

  const handlePageChange = async (page) => {
    if (page < 1 || page > (pagination?.totalPages || 1)) return;
    await fetchFabricLogs({
      ...filters,
      page,
      limit: pagination?.limit || 20,
    });
  };

  const summary = useMemo(() => {
    const addCount = logs.filter((item) => item.type === "add").length;
    const subtractCount = logs.filter((item) => item.type === "subtract").length;
    const adjustCount = logs.filter((item) => item.type === "adjust").length;

    return {
      addCount,
      subtractCount,
      adjustCount,
      total: pagination?.total || 0,
    };
  }, [logs, pagination?.total]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="w-full p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Fabric Logs
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              All fabric stock actions, notes, balances, and history in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchFabricLogs({ ...filters, page: 1 })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-500">
              <Package2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Total Logs
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-neutral-900">
              {summary.total}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600">
              <Plus className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Added
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-emerald-700">
              {summary.addCount}
            </div>
          </div>

          <div className="rounded-3xl border border-red-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600">
              <Minus className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Subtracted
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-red-700">
              {summary.subtractCount}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Adjusted
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-amber-700">
              {summary.adjustCount}
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-900">Filters</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={localFilters.q}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, q: e.target.value }))
                  }
                  placeholder="Search by code, fabric, description, note"
                  className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Action
              </label>
              <select
                value={localFilters.action}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    action: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              >
                {ACTION_OPTIONS.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Type
              </label>
              <select
                value={localFilters.type}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Start Date
              </label>
              <input
                type="date"
                value={localFilters.startDate}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                End Date
              </label>
              <input
                type="date"
                value={localFilters.endDate}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Search className="h-4 w-4" />
              Apply Filters
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-neutral-100 text-left text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Fabric</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Previous</th>
                  <th className="px-4 py-3 font-semibold">New</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-neutral-500"
                    >
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-neutral-500"
                    >
                      No fabric logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="border-t border-neutral-200 align-top hover:bg-neutral-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                        <div className="flex items-start gap-2">
                          <CalendarDays className="mt-0.5 h-4 w-4 text-neutral-400" />
                          <span>{formatDate(log.logDate || log.createdAt)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-neutral-900">
                          {log.fabricName || "—"}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {log.fabricCode || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {String(log.action || "—").replaceAll("_", " ")}
                          </span>

                          <span
                            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${getTypeBadge(
                              log.type
                            )}`}
                          >
                            {log.type || "info"}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-medium text-neutral-900">
                        {formatQty(log.quantity)} {log.unit || ""}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                        {formatQty(log.previousStock)} {log.unit || ""}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-900">
                        {formatQty(log.newStock)} {log.unit || ""}
                      </td>

                      <td className="min-w-[260px] px-4 py-4 text-neutral-700">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          <span>{log.description || log.message || "—"}</span>
                        </div>
                      </td>

                      <td className="min-w-[220px] px-4 py-4 text-neutral-600">
                        {log.note || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                        {log.createdBy || "system"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-neutral-500">
              Showing <span className="font-semibold text-neutral-800">{logs.length}</span>{" "}
              of <span className="font-semibold text-neutral-800">{pagination?.total || 0}</span> logs
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange((pagination?.page || 1) - 1)}
                disabled={(pagination?.page || 1) <= 1}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700">
                Page {pagination?.page || 1} / {pagination?.totalPages || 1}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange((pagination?.page || 1) + 1)}
                disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1)}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}