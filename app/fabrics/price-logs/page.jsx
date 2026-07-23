"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import useFabricStore from "@/store/fabricStore";
import useFabricPriceLogStore from "@/store/fabricPriceLogStore";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function FabricPriceLogsPage() {
  const { fabricOptions, fetchFabricOptions } = useFabricStore();

  const {
    priceLogs,
    currentPriceList,
    analytics,
    loading,
    createLoading,
    error,
    filters,
    pagination,
    setFilters,
    resetFilters,
    fetchPriceLogs,
    fetchCurrentPriceList,
    fetchAnalytics,
    createPriceLog,
  } = useFabricPriceLogStore();

  const [searchText, setSearchText] = useState(filters.search || "");
  const [form, setForm] = useState({
    fabricCode: "",
    newPrice: "",
    reason: "",
    note: "",
    createdBy: "admin",
  });

  useEffect(() => {
    fetchFabricOptions();
    fetchPriceLogs({ page: 1, limit: 30 });
    fetchCurrentPriceList({ page: 1, limit: 100 });
    fetchAnalytics();
  }, []);

  const handleSearch = () => {
    fetchPriceLogs({ search: searchText, page: 1 });
  };

  const handleFilter = (key, value) => {
    const next = { [key]: value };
    setFilters(next);
    fetchPriceLogs({ ...next, page: 1 });
  };

  const handleReset = () => {
    setSearchText("");
    resetFilters();
    fetchPriceLogs({
      search: "",
      fabricCode: "",
      fabricName: "",
      unit: "",
      fromDate: "",
      toDate: "",
      priceIncreased: "",
      priceDecreased: "",
      page: 1,
      limit: 30,
    });
  };

  const handleCreatePrice = async (e) => {
    e.preventDefault();

    const res = await createPriceLog({
      fabricCode: form.fabricCode,
      newPrice: Number(form.newPrice),
      reason: form.reason,
      note: form.note,
      createdBy: form.createdBy || "admin",
    });

    if (res.success) {
      setForm({
        fabricCode: "",
        newPrice: "",
        reason: "",
        note: "",
        createdBy: "admin",
      });

      await fetchAnalytics();
    }
  };

  const handleExportExcel = () => {
    const rows = priceLogs.map((item) => ({
      Date: formatDate(item.effectiveFrom),
      Code: item.fabricCode,
      Fabric: item.fabricName,
      Unit: item.unit,
      "Old Price": item.oldPrice,
      "New Price": item.newPrice,
      "Change Amount": item.changeAmount,
      "Change Percent": item.changePercent,
      Reason: item.reason,
      Note: item.note,
      By: item.createdBy,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Fabric Price Logs");
    XLSX.writeFile(wb, `fabric-price-logs-${Date.now()}.xlsx`);
  };

  const handleSampleImportDownload = () => {
    const rows = [
      {
        fabricCode: "F00001",
        newPrice: 120,
        reason: "New purchase rate",
        note: "Supplier updated pricing",
        createdBy: "admin",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Price Import Sample");
    XLSX.writeFile(wb, "fabric-price-import-sample.xlsx");
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
              Fabric Price Logs
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Update fabric prices and track pricing history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSampleImportDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              <Download size={16} />
              Import Sample
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <Stat title="Total Logs" value={analytics?.totalLogs || 0} />
          <Stat title="Avg New Price" value={formatMoney(analytics?.avgNewPrice)} />
          <Stat title="Increased" value={analytics?.increasedCount || 0} />
          <Stat title="Decreased" value={analytics?.decreasedCount || 0} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleCreatePrice}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Plus size={17} />
              <h2 className="text-sm font-semibold">Add Price Update</h2>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Fabric">
                <select
                  required
                  value={form.fabricCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fabricCode: e.target.value }))
                  }
                  className="input"
                >
                  <option value="">Select fabric</option>
                  {fabricOptions.map((item) => (
                    <option key={item._id} value={item.code}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="New Price">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.newPrice}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, newPrice: e.target.value }))
                  }
                  placeholder="0"
                  className="input"
                />
              </Field>

              <Field label="Reason">
                <input
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Supplier rate update"
                  className="input"
                />
              </Field>

              <Field label="Note">
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="Internal note..."
                  rows={4}
                  className="input h-auto resize-none py-3"
                />
              </Field>

              <button
                disabled={createLoading}
                className="h-11 w-full rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {createLoading ? "Saving..." : "Save Price Update"}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Current Price List</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Latest price available for each fabric.
            </p>

            <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-neutral-100">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Fabric</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">From</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {currentPriceList.length ? (
                    currentPriceList.map((item) => (
                      <tr key={item._id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.fabricName}</p>
                          <p className="text-xs text-neutral-500">{item.fabricCode}</p>
                        </td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatMoney(item.newPrice)}
                        </td>
                        <td className="px-4 py-3">
                          <Change value={item.changeAmount} percent={item.changePercent} />
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {formatDate(item.effectiveFrom)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                        No current price found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
              <Search size={16} className="text-neutral-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search fabric, code, reason..."
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <select
              value={filters.unit || ""}
              onChange={(e) => handleFilter("unit", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All Units</option>
              <option value="meter">meter</option>
              <option value="kg">kg</option>
            </select>

            <input
              type="date"
              value={filters.fromDate || ""}
              onChange={(e) => handleFilter("fromDate", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            />

            <input
              type="date"
              value={filters.toDate || ""}
              onChange={(e) => handleFilter("toDate", e.target.value)}
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
          <div className="border-b border-neutral-200 p-4">
            <h2 className="text-sm font-semibold">Price History</h2>
            <p className="text-xs text-neutral-500">
              {pagination.total} price logs found
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Fabric</th>
                  <th className="px-4 py-3">Old</th>
                  <th className="px-4 py-3">New</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      Loading price logs...
                    </td>
                  </tr>
                ) : priceLogs.length ? (
                  priceLogs.map((item) => (
                    <tr key={item._id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-500">
                        {formatDate(item.effectiveFrom)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{item.fabricName}</p>
                        <p className="text-xs text-neutral-500">{item.fabricCode}</p>
                      </td>
                      <td className="px-4 py-3">{formatMoney(item.oldPrice)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatMoney(item.newPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <Change value={item.changeAmount} percent={item.changePercent} />
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-neutral-500">
                        <p className="line-clamp-2">{item.reason || item.note || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {item.createdBy || "admin"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      No price logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm md:flex-row">
            <p className="text-neutral-500">
              Page {pagination.page} of {pagination.pages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchPriceLogs({ page: pagination.page - 1 })}
                className="rounded-xl border border-neutral-200 px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => fetchPriceLogs({ page: pagination.page + 1 })}
                className="rounded-xl border border-neutral-200 px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input {
          min-height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid #e5e5e5;
          background: #ffffff;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }

        .input:focus {
          border-color: #171717;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Change({ value, percent }) {
  const amount = Number(value || 0);
  const isUp = amount > 0;
  const isDown = amount < 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
        isUp
          ? "bg-green-50 text-green-700"
          : isDown
          ? "bg-red-50 text-red-700"
          : "bg-neutral-100 text-neutral-600"
      }`}
    >
      {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : null}
      ₹{amount.toFixed(2)} ({Number(percent || 0).toFixed(2)}%)
    </span>
  );
}
