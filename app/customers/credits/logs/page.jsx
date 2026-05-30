"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCustomerStore } from "@/store/customerStore";

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const typeOptions = [
  "",
  "refund",
  "promotion",
  "influencer",
  "goodwill",
  "cashback",
  "referral_bonus",
  "manual_credit",
  "manual_debit",
  "order_usage",
  "order_adjustment",
  "expired",
  "other",
];

export default function CustomerCreditLogsPage() {
  const {
    allCreditLogs,
    allCreditLogsTotal,
    allCreditLogsPage,
    allCreditLogsPages,
    loadingAllCreditLogs,
    fetchAllCustomerCreditLogs,
  } = useCustomerStore();

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    transactionType: "",
    from: "",
    to: "",
    page: 1,
    limit: 20,
    sortOrder: "desc",
  });

  const fetchLogs = async (next = filters) => {
    const res = await fetchAllCustomerCreditLogs(next);
    if (res?.success === false) {
      toast.error(res.error || "Failed to load credit logs");
    }
  };

  useEffect(() => {
    fetchLogs(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageTotals = useMemo(() => {
    return allCreditLogs.reduce(
      (acc, item) => {
        const log = item?.log || {};
        const amount = Number(log.amount || 0);

        if (log.transactionType === "credit") acc.credit += amount;
        if (log.transactionType === "debit") acc.debit += amount;

        return acc;
      },
      { credit: 0, debit: 0 }
    );
  }, [allCreditLogs]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const applyFilters = () => fetchLogs({ ...filters, page: 1 });

  const resetFilters = () => {
    const next = {
      search: "",
      type: "",
      transactionType: "",
      from: "",
      to: "",
      page: 1,
      limit: 20,
      sortOrder: "desc",
    };

    setFilters(next);
    fetchLogs(next);
  };

  const changePage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    fetchLogs(next);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            href="/customers/credits"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
          >
            <ArrowLeft size={16} />
            Back to Credits
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
            Credit Logs
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Complete wallet transaction history with backend filters.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(filters)}
          disabled={loadingAllCreditLogs}
          className="btn-secondary"
        >
          <RefreshCw
            size={16}
            className={loadingAllCreditLogs ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={WalletCards} label="Matched Logs" value={allCreditLogsTotal || 0} />
        <StatCard icon={ArrowRight} label="Page Credits" value={money(pageTotals.credit)} />
        <StatCard icon={ArrowLeft} label="Page Debits" value={money(pageTotals.debit)} />
      </section>

      <section className="card mb-6 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.7fr_auto_auto]">
          <Input
            icon={Search}
            value={filters.search}
            onChange={(v) => updateFilter("search", v)}
            placeholder="Search customer, order, reason..."
          />

          <select
            className="input"
            value={filters.type}
            onChange={(e) => updateFilter("type", e.target.value)}
          >
            {typeOptions.map((type) => (
              <option key={type || "all"} value={type}>
                {type || "All Types"}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={filters.transactionType}
            onChange={(e) => updateFilter("transactionType", e.target.value)}
          >
            <option value="">All Transactions</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>

          <Input
            icon={Calendar}
            type="date"
            value={filters.from}
            onChange={(v) => updateFilter("from", v)}
          />

          <Input
            icon={Calendar}
            type="date"
            value={filters.to}
            onChange={(v) => updateFilter("to", v)}
          />

          <button onClick={applyFilters} className="btn-primary">
            <Filter size={16} />
            Apply
          </button>

          <button onClick={resetFilters} className="btn-secondary">
            Reset
          </button>
        </div>
      </section>

      <section className="table-container">
        <div className="border-b border-[var(--primary-border)] p-5">
          <h2 className="section-title">Transactions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Page {allCreditLogsPage || 1} of {allCreditLogsPages || 1}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="table-head text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Transaction</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {loadingAllCreditLogs ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    Loading credit logs...
                  </td>
                </tr>
              ) : allCreditLogs.length ? (
                allCreditLogs.map((item, idx) => {
                  const customer = item?.customer || {};
                  const log = item?.log || {};
                  const isCredit = log.transactionType === "credit";

                  return (
                    <tr
                      key={`${log.creditId || idx}-${customer._id}`}
                      className="table-row border-t border-gray-100"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-950">
                          {customer.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {customer.email || customer.phone || customer.customerId}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={isCredit ? "badge-success" : "badge-danger"}>
                          {log.transactionType || "-"} · {log.type || "-"}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-4 font-semibold ${
                          isCredit ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {money(log.amount)}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {log.orderNumber || "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {log.influencerCode ||
                          log.couponCode ||
                          log.promotionName ||
                          log.influencerName ||
                          "-"}
                      </td>

                      <td className="max-w-[300px] px-5 py-4 text-gray-600">
                        <div className="truncate">{log.reason || "-"}</div>
                        <div className="truncate text-xs text-gray-400">
                          {log.notes || ""}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-500">
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString("en-IN")
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    No credit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--primary-border)] p-4">
          <button
            className="btn-secondary"
            disabled={allCreditLogsPage <= 1}
            onClick={() => changePage(allCreditLogsPage - 1)}
          >
            <ArrowLeft size={16} />
            Prev
          </button>

          <span className="text-sm text-gray-500">
            {allCreditLogsTotal || 0} logs
          </span>

          <button
            className="btn-secondary"
            disabled={allCreditLogsPage >= allCreditLogsPages}
            onClick={() => changePage(allCreditLogsPage + 1)}
          >
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card p-5">
      <div className="mb-3 w-fit rounded-2xl bg-[var(--primary-light)] p-3 text-[var(--primary)]">
        <Icon size={20} />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <h2 className="mt-1 text-2xl font-semibold text-gray-950">{value}</h2>
    </div>
  );
}

function Input({ icon: Icon, value, onChange, placeholder = "", type = "text" }) {
  return (
    <div className="relative">
      <Icon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type={type}
        className="input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}