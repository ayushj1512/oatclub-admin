"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  Loader2,
  RefreshCcw,
  Search,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react";
import { useRazorpayReportsStore } from "@/store/razorpayReportsStore";

const STATUS_OPTIONS = [
  "captured",
  "paid",
  "created",
  "authorized",
  "failed",
  "refunded",
  "pending",
];

const money = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const getStatusClass = (status) => {
  const s = normalizeStatus(status);
  if (["captured", "paid"].includes(s)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (s === "failed") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-amber-50 text-amber-700";
};

const csvEscape = (value) => {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsv = (rows = []) => {
  const headers = [
    "Receipt",
    "Payment ID",
    "Razorpay Order ID",
    "Amount",
    "Currency",
    "Method",
    "Status",
    "Email",
    "Contact",
    "Fee",
    "Tax",
    "Created At",
  ];

  const lines = rows.map((row) =>
    [
      row?.receipt || "",
      row?.paymentId || "",
      row?.orderId || "",
      Number(row?.amount || 0),
      row?.currency || "INR",
      row?.method || "",
      row?.status || "",
      row?.email || "",
      row?.contact || "",
      Number(row?.fee || 0),
      Number(row?.tax || 0),
      row?.createdAt ? new Date(row.createdAt).toISOString() : "",
    ]
      .map(csvEscape)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
};

const downloadCsv = (rows = []) => {
  const blob = new Blob([buildCsv(rows)], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `razorpay-transactions-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function StatCard({ title, value, sub, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>
          {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
        </div>
        <div className="rounded-xl bg-gray-100 p-2 text-gray-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function RazorpayTransactionPage() {
  const {
    transactions,
    summary,
    filters,
    pagination,
    loading,
    summaryLoading,
    error,
    setFilters,
    fetchTransactions,
    fetchSummary,
    applyFiltersAndFetch,
    goToPage,
    refreshAll,
  } = useRazorpayReportsStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSummary();
    fetchTransactions();
  }, [fetchSummary, fetchTransactions]);

  const rows = useMemo(
    () => (Array.isArray(transactions) ? transactions : []),
    [transactions]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row?.receipt,
        row?.paymentId,
        row?.orderId,
        row?.status,
        row?.email,
        row?.contact,
        row?.method,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const page = Number(pagination?.page || filters?.page || 1);
  const limit = Number(pagination?.limit || filters?.limit || 20);
  const hasPrev = page > 1;
  const hasNext = rows.length >= limit;

  const onFilterChange = (key, value) => setFilters({ [key]: value });

  const onApply = () => {
    applyFiltersAndFetch({
      from: filters?.from || "",
      to: filters?.to || "",
      status: filters?.status || "",
      page: 1,
      limit: Number(filters?.limit || 20),
    });
  };

  const onReset = () => {
    setSearch("");
    applyFiltersAndFetch({
      from: "",
      to: "",
      status: "",
      page: 1,
      limit: 20,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Razorpay Transactions
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Clean and simple transaction tracking page.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadCsv(filteredRows)}
                disabled={!filteredRows.length || loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>

              <button
                onClick={() => refreshAll()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
              >
                {loading || summaryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Captured"
            value={summaryLoading ? "..." : Number(summary?.success || 0)}
            sub="Successful payments"
            icon={CheckCircle2}
          />
          <StatCard
            title="Failed"
            value={summaryLoading ? "..." : Number(summary?.failed || 0)}
            sub="Failed payments"
            icon={XCircle}
          />
          <StatCard
            title="Pending"
            value={summaryLoading ? "..." : Number(summary?.pending || 0)}
            sub="Pending transactions"
            icon={Wallet}
          />
          <StatCard
            title="Total Amount"
            value={summaryLoading ? "..." : money(summary?.totalAmount || 0)}
            sub="Captured total"
            icon={IndianRupee}
          />
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="date"
              value={filters?.from || ""}
              onChange={(e) => onFilterChange("from", e.target.value)}
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gray-200"
            />

            <input
              type="date"
              value={filters?.to || ""}
              onChange={(e) => onFilterChange("to", e.target.value)}
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gray-200"
            />

            <select
              value={filters?.status || ""}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gray-200"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={filters?.limit || 20}
              onChange={(e) => onFilterChange("limit", Number(e.target.value))}
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gray-200"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt / payment / email"
                className="h-11 w-full rounded-xl bg-gray-50 pl-10 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onApply}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying
                </span>
              ) : (
                "Apply Filters"
              )}
            </button>

            <button
              onClick={onReset}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
              <p className="text-sm text-gray-500">
                Razorpay payment transaction list.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-900">{page}</span>
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-gray-50">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold">Receipt</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading transactions...
                        </div>
                      </td>
                    </tr>
                  ) : filteredRows.length ? (
                    filteredRows.map((row, idx) => (
                      <tr
                        key={row?.paymentId || `${row?.orderId}-${idx}`}
                        className="border-b border-gray-50 last:border-b-0"
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {row?.receipt || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[220px]">
                            <p className="truncate font-mono text-xs text-gray-800">
                              {row?.paymentId || "—"}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {row?.orderId || "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {money(row?.amount || 0)}
                        </td>

                        <td className="px-4 py-3 uppercase text-gray-700">
                          {row?.method || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
                              row?.status
                            )}`}
                          >
                            {row?.status || "unknown"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          <div className="max-w-[220px]">
                            <p className="truncate font-medium">{row?.email || "—"}</p>
                            <p className="truncate text-xs text-gray-400">
                              {row?.contact || "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(row?.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredRows.length}
              </span>{" "}
              rows
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={!hasPrev || loading}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={!hasNext || loading}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
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