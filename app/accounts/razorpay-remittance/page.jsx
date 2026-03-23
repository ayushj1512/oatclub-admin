"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  IndianRupee,
  Loader2,
  RefreshCcw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import { useRazorpayReportsStore } from "@/store/razorpayReportsStore";

const money = (v) => {
  const n = Number(v || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const dt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const csvDt = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
};

const statusTone = (status = "") => {
  const s = String(status).toLowerCase();

  if (["captured", "paid"].includes(s)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["failed"].includes(s)) {
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

const downloadCsv = (rows = []) => {
  const data = Array.isArray(rows) ? rows : [];

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

  const lines = [
    headers.join(","),
    ...data.map((row) =>
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
        csvDt(row?.createdAt),
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], {
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

const StatCard = ({ title, value, sub, icon: Icon }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
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

export default function RazorpayRemittancePage() {
  const {
    transactions,
    summary,
    receiptDetail,
    filters,
    pagination,
    loading,
    summaryLoading,
    receiptLoading,
    error,
    setFilters,
    fetchTransactions,
    fetchSummary,
    fetchByReceipt,
    clearReceiptDetail,
    applyFiltersAndFetch,
    goToPage,
    refreshAll,
  } = useRazorpayReportsStore();

  const [receiptInput, setReceiptInput] = useState("");

  useEffect(() => {
    fetchSummary();
    fetchTransactions();
  }, [fetchSummary, fetchTransactions]);

  const rows = useMemo(
    () => (Array.isArray(transactions) ? transactions : []),
    [transactions]
  );

  const page = Number(pagination?.page || filters?.page || 1);
  const limit = Number(pagination?.limit || filters?.limit || 20);
  const hasPrev = page > 1;
  const hasNext = rows.length >= limit;

  const onFilterChange = (key, value) => {
    setFilters({ [key]: value });
  };

  const onApply = () => {
    applyFiltersAndFetch({
      from: filters?.from || "",
      to: filters?.to || "",
      status: filters?.status || "",
      limit: Number(filters?.limit || 20),
    });
  };

  const onReset = () => {
    setReceiptInput("");
    clearReceiptDetail();
    applyFiltersAndFetch({
      from: "",
      to: "",
      status: "",
      page: 1,
      limit: 20,
    });
  };

  const onSearchReceipt = async (e) => {
    e.preventDefault();
    await fetchByReceipt(receiptInput);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Razorpay Remittance
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Receipt is your order number, so transaction lookup stays clean
                and easy.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadCsv(rows)}
                disabled={!rows.length || loading}
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
            sub="Failed attempts"
            icon={XCircle}
          />
          <StatCard
            title="Pending"
            value={summaryLoading ? "..." : Number(summary?.pending || 0)}
            sub="Needs follow-up"
            icon={Wallet}
          />
          <StatCard
            title="Captured Amount"
            value={summaryLoading ? "..." : money(summary?.totalAmount || 0)}
            sub="From current summary"
            icon={IndianRupee}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Filters & Receipt Search
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                type="date"
                value={filters?.from || ""}
                onChange={(e) => onFilterChange("from", e.target.value)}
                className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-gray-200"
              />

              <input
                type="date"
                value={filters?.to || ""}
                onChange={(e) => onFilterChange("to", e.target.value)}
                className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-gray-200"
              />

              <select
                value={filters?.status || ""}
                onChange={(e) => onFilterChange("status", e.target.value)}
                className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-gray-200"
              >
                <option value="">Overall Status</option>
                <option value="captured">Captured</option>
                <option value="created">Created</option>
                <option value="authorized">Authorized</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={filters?.limit || 20}
                onChange={(e) => onFilterChange("limit", Number(e.target.value))}
                className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-gray-200"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>

              <form onSubmit={onSearchReceipt} className="md:col-span-2 xl:col-span-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={receiptInput}
                      onChange={(e) => setReceiptInput(e.target.value)}
                      placeholder="Search receipt / order number"
                      className="h-11 w-full rounded-xl bg-gray-50 pl-10 pr-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    {receiptLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={onApply}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Apply Filters
              </button>

              <button
                onClick={onReset}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                Reset
              </button>
            </div>
          </div>

          {receiptDetail?.ok ? (
            <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Receipt Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    Complete Razorpay trail for this order number.
                  </p>
                </div>

                <button
                  onClick={clearReceiptDetail}
                  className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Close
                </button>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Receipt
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {receiptDetail?.order?.receipt || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Razorpay Order ID
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-gray-800">
                      {receiptDetail?.order?.id || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Amount
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {money((receiptDetail?.order?.amount || 0) / 100)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </p>
                    <p className="mt-1 capitalize text-gray-900">
                      {receiptDetail?.order?.status || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Linked Payments ({Number(receiptDetail?.count || 0)})
                </h3>

                {Array.isArray(receiptDetail?.payments) &&
                receiptDetail.payments.length ? (
                  receiptDetail.payments.map((item, idx) => (
                    <div
                      key={item?.paymentId || idx}
                      className="rounded-2xl bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-all font-semibold text-gray-900">
                            {item?.paymentId || "—"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {dt(item?.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(
                            item?.status
                          )}`}
                        >
                          {item?.status || "unknown"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Amount
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {money(item?.amount || 0)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Method
                          </p>
                          <p className="mt-1 uppercase text-gray-900">
                            {item?.method || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Email
                          </p>
                          <p className="mt-1 break-all text-gray-900">
                            {item?.email || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Contact
                          </p>
                          <p className="mt-1 text-gray-900">
                            {item?.contact || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No linked payments found.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Transactions
                </h2>
                <p className="text-sm text-gray-500">
                  Clean transaction view for Razorpay payments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-500">
                  Page <span className="font-semibold text-gray-900">{page}</span>
                </div>

                <button
                  onClick={() => downloadCsv(rows)}
                  disabled={!rows.length || loading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-gray-50">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-gray-500">
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
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          <div className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading transactions...
                          </div>
                        </td>
                      </tr>
                    ) : rows.length ? (
                      rows.map((row, idx) => (
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
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(
                                row?.status
                              )}`}
                            >
                              {row?.status || "unknown"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            <div className="max-w-[220px]">
                              <p className="truncate font-medium">
                                {row?.email || "—"}
                              </p>
                              <p className="truncate text-xs text-gray-400">
                                {row?.contact || "—"}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            {dt(row?.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-gray-500"
                        >
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
                <span className="font-semibold text-gray-900">{rows.length}</span>{" "}
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
    </div>
  );
}