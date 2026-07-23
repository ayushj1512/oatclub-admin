"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  FileClock,
} from "lucide-react";
import * as XLSX from "xlsx";
import useFabricLogStore from "@/store/fabricLogStore";

const actionOptions = [
  "created",
  "updated",
  "status_changed",
  "movement_changed",
  "product_codes_added",
  "product_codes_removed",
  "activated",
  "deactivated",
  "stock_added",
  "stock_subtracted",
  "stock_adjusted",
  "negative_stock_blocked",
];

const typeOptions = ["add", "subtract", "adjust", "info"];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function FabricLogsPage() {
  const {
    fabricLogs,
    fabricLogsLoading,
    fabricLogsError,
    pagination,
    filters,
    setFabricLogFilters,
    resetFabricLogFilters,
    fetchFabricLogs,
  } = useFabricLogStore();

  const [searchText, setSearchText] = useState(filters.q || "");

  useEffect(() => {
    fetchFabricLogs({ page: 1, limit: 30 });
  }, []);

  const handleSearch = () => {
    fetchFabricLogs({ q: searchText, page: 1 });
  };

  const handleFilter = (key, value) => {
    const next = { [key]: value };
    setFabricLogFilters(next);
    fetchFabricLogs({ ...next, page: 1 });
  };

  const handleReset = () => {
    setSearchText("");
    resetFabricLogFilters();
    fetchFabricLogs({
      q: "",
      action: "",
      type: "",
      startDate: "",
      endDate: "",
      page: 1,
      limit: 30,
    });
  };

  const handleExportExcel = () => {
    const rows = fabricLogs.map((log) => ({
      Date: formatDate(log.logDate),
      Code: log.fabricCode,
      Fabric: log.fabricName,
      Unit: log.unit,
      Action: log.action,
      Type: log.type,
      Quantity: log.quantity,
      "Previous Stock": log.previousStock,
      "New Stock": log.newStock,
      Description: log.description,
      Note: log.note,
      Message: log.message,
      By: log.createdBy,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Fabric Logs");
    XLSX.writeFile(wb, `fabric-logs-${Date.now()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <Link
              href="/fabrics"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-950"
            >
              <ArrowLeft size={16} />
              Back to fabrics
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Fabric Logs
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Track all fabric stock changes, status changes and system actions.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        {fabricLogsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {fabricLogsError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
              <Search size={16} className="text-neutral-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search fabric code, name, note..."
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <select
              value={filters.action || ""}
              onChange={(e) => handleFilter("action", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All Actions</option>
              {actionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={filters.type || ""}
              onChange={(e) => handleFilter("type", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All Types</option>
              {typeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => handleFilter("startDate", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            />

            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => handleFilter("endDate", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="h-11 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white"
              >
                Search
              </button>

              <button
                onClick={handleReset}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-100"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 p-4">
            <div>
              <h2 className="text-sm font-semibold">Activity Timeline</h2>
              <p className="text-xs text-neutral-500">
                {pagination.total} logs found
              </p>
            </div>

            <FileClock size={18} className="text-neutral-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Fabric</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Previous</th>
                  <th className="px-4 py-3">New</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {fabricLogsLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      Loading fabric logs...
                    </td>
                  </tr>
                ) : fabricLogs.length ? (
                  fabricLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-500">
                        {formatDate(log.logDate)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold">{log.fabricName}</p>
                        <p className="text-xs text-neutral-500">{log.fabricCode}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">
                          {log.type}
                        </span>
                      </td>

                      <td className="px-4 py-3">{log.quantity || 0}</td>
                      <td className="px-4 py-3">{log.previousStock || 0}</td>
                      <td className="px-4 py-3 font-semibold">{log.newStock || 0}</td>

                      <td className="max-w-[260px] px-4 py-3 text-neutral-500">
                        <p className="line-clamp-2">
                          {log.note || log.description || log.message || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-neutral-500">
                        {log.createdBy || "system"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      No fabric logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm md:flex-row">
            <p className="text-neutral-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1 || fabricLogsLoading}
                onClick={() => fetchFabricLogs({ page: pagination.page - 1 })}
                className="rounded-xl border border-neutral-200 px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                disabled={pagination.page >= pagination.totalPages || fabricLogsLoading}
                onClick={() => fetchFabricLogs({ page: pagination.page + 1 })}
                className="rounded-xl border border-neutral-200 px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
