// app/customers/analytics/risk/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Truck,
  XCircle,
} from "lucide-react";
import { useCustomerStore } from "@/store/customerStore";

const n = (v = 0) => new Intl.NumberFormat("en-IN").format(Number(v || 0));

const money = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const pct = (v = 0) => `${Number(v || 0).toFixed(1)}%`;

const formatDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getA = (customer) => customer?.analytics || {};

const csvCell = (value) => {
  const clean = value == null ? "" : String(value);
  return `"${clean.replaceAll('"', '""')}"`;
};

export default function CustomerRiskPage() {
  const {
    customers,
    loadingList,
    error,
    fetchAllCustomersForDashboard,
    syncAllCustomerAnalytics,
    syncingAllAnalytics,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("all");
  const [sortBy, setSortBy] = useState("riskScore");
  const [page, setPage] = useState(1);

  const limit = 15;

  useEffect(() => {
    fetchAllCustomersForDashboard?.({ limit: 200 });
  }, [fetchAllCustomersForDashboard]);

  const allCustomers = Array.isArray(customers) ? customers : [];

  const vm = useMemo(() => {
    const q = search.trim().toLowerCase();

    let filtered = allCustomers.filter((customer) => {
      const a = getA(customer);
      const riskScore = Number(a.riskScore || 0);
      const rtoRate = Number(a.rtoRate || 0);
      const returnRate = Number(a.returnRate || 0);
      const cancellationRate = Number(a.cancellationRate || 0);

      const matchesSearch =
        !q ||
        customer?.name?.toLowerCase()?.includes(q) ||
        customer?.email?.toLowerCase()?.includes(q) ||
        customer?.phone?.toLowerCase()?.includes(q) ||
        customer?.customerId?.toLowerCase()?.includes(q);

      const matchesLevel =
        riskLevel === "all" ||
        (riskLevel === "high" && riskScore >= 60) ||
        (riskLevel === "medium" && riskScore >= 30 && riskScore < 60) ||
        (riskLevel === "low" && riskScore > 0 && riskScore < 30) ||
        (riskLevel === "rto" && rtoRate > 0) ||
        (riskLevel === "return" && returnRate > 0) ||
        (riskLevel === "cancel" && cancellationRate > 0);

      const hasAnyRisk =
        riskScore > 0 || rtoRate > 0 || returnRate > 0 || cancellationRate > 0;

      return matchesSearch && matchesLevel && (riskLevel === "all" ? true : hasAnyRisk);
    });

    filtered = [...filtered].sort((a, b) => {
      const aa = getA(a);
      const bb = getA(b);

      const map = {
        riskScore: [aa.riskScore, bb.riskScore],
        rtoRate: [aa.rtoRate, bb.rtoRate],
        returnRate: [aa.returnRate, bb.returnRate],
        cancellationRate: [aa.cancellationRate, bb.cancellationRate],
        totalOrders: [aa.totalOrders, bb.totalOrders],
        totalSpend: [aa.totalSpend, bb.totalSpend],
        lastOrderAt: [
          aa.lastOrderAt ? new Date(aa.lastOrderAt).getTime() : 0,
          bb.lastOrderAt ? new Date(bb.lastOrderAt).getTime() : 0,
        ],
      };

      const [av, bv] = map[sortBy] || map.riskScore;
      return Number(bv || 0) - Number(av || 0);
    });

    const totals = filtered.reduce(
      (acc, customer) => {
        const a = getA(customer);

        acc.totalOrders += Number(a.totalOrders || 0);
        acc.rtoOrders += Number(a.rtoOrders || 0);
        acc.returnedOrders += Number(a.returnedOrders || 0);
        acc.cancelledOrders += Number(a.cancelledOrders || 0);
        acc.spend += Number(a.totalSpend || 0);

        if (Number(a.riskScore || 0) >= 60) acc.high += 1;
        else if (Number(a.riskScore || 0) >= 30) acc.medium += 1;
        else if (Number(a.riskScore || 0) > 0) acc.low += 1;

        return acc;
      },
      {
        totalOrders: 0,
        rtoOrders: 0,
        returnedOrders: 0,
        cancelledOrders: 0,
        spend: 0,
        high: 0,
        medium: 0,
        low: 0,
      }
    );

    const pages = Math.max(1, Math.ceil(filtered.length / limit));
    const currentPage = Math.min(page, pages);
    const start = (currentPage - 1) * limit;

    return {
      filtered,
      paginated: filtered.slice(start, start + limit),
      pages,
      currentPage,
      totals,
      rtoRate: totals.totalOrders
        ? (totals.rtoOrders / totals.totalOrders) * 100
        : 0,
      returnRate: totals.totalOrders
        ? (totals.returnedOrders / totals.totalOrders) * 100
        : 0,
      cancellationRate: totals.totalOrders
        ? (totals.cancelledOrders / totals.totalOrders) * 100
        : 0,
    };
  }, [allCustomers, search, riskLevel, sortBy, page]);

  const downloadExcel = () => {
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Customer Type",
      "Risk Score",
      "Total Orders",
      "Total Spend",
      "RTO Orders",
      "RTO Rate",
      "Returned Orders",
      "Return Rate",
      "Cancelled Orders",
      "Cancellation Rate",
      "Failed Orders",
      "Refund Pending Orders",
      "Last Order",
      "Last RTO",
      "Last Returned",
      "Last Cancelled",
    ];

    const rows = vm.filtered.map((customer) => {
      const a = getA(customer);

      return [
        customer.customerId || customer._id || "-",
        customer.name || "-",
        customer.email || "-",
        customer.phone || "-",
        a.customerType || "new",
        a.riskScore || 0,
        a.totalOrders || 0,
        a.totalSpend || 0,
        a.rtoOrders || 0,
        a.rtoRate || 0,
        a.returnedOrders || 0,
        a.returnRate || 0,
        a.cancelledOrders || 0,
        a.cancellationRate || 0,
        a.failedOrders || 0,
        a.refundPendingOrders || 0,
        formatDate(a.lastOrderAt),
        formatDate(a.lastRtoAt),
        formatDate(a.lastReturnedAt),
        formatDate(a.lastCancelledAt),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `customer-risk-${riskLevel}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSync = async () => {
    const result = await syncAllCustomerAnalytics?.();
    if (result?.success) await fetchAllCustomersForDashboard?.({ limit: 200 });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 text-gray-950 md:px-8 md:py-7">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/customers/analytics"
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              ← Back to Analytics
            </Link>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm ring-1 ring-gray-100">
              <ShieldAlert size={14} />
              Customer risk intelligence
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
              RTO & Risk Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Track high-risk customers by RTO, returns, cancellations and refund signals.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSync}
              disabled={syncingAllAnalytics}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={syncingAllAnalytics ? "animate-spin" : ""}
              />
              Sync
            </button>

            <button
              onClick={downloadExcel}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <ArrowDownToLine size={16} />
              Download Excel
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={<ShieldAlert size={18} />}
            label="Risk Customers"
            value={n(vm.filtered.length)}
            sub={`High ${n(vm.totals.high)} • Medium ${n(vm.totals.medium)}`}
            tone="rose"
          />
          <Kpi
            icon={<Truck size={18} />}
            label="RTO Rate"
            value={pct(vm.rtoRate)}
            sub={`${n(vm.totals.rtoOrders)} RTO orders`}
            tone="red"
          />
          <Kpi
            icon={<RotateCcw size={18} />}
            label="Return Rate"
            value={pct(vm.returnRate)}
            sub={`${n(vm.totals.returnedOrders)} returned orders`}
            tone="orange"
          />
          <Kpi
            icon={<XCircle size={18} />}
            label="Cancellation Rate"
            value={pct(vm.cancellationRate)}
            sub={`${n(vm.totals.cancelledOrders)} cancelled orders`}
            tone="amber"
          />
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Search</label>
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
                <Search size={15} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Name, email, phone, customer ID..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <Select
              label="Risk Filter"
              value={riskLevel}
              onChange={(value) => {
                setRiskLevel(value);
                setPage(1);
              }}
              options={[
                ["all", "All"],
                ["high", "High Risk"],
                ["medium", "Medium Risk"],
                ["low", "Low Risk"],
                ["rto", "Has RTO"],
                ["return", "Has Returns"],
                ["cancel", "Has Cancellations"],
              ]}
            />

            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                ["riskScore", "Risk Score"],
                ["rtoRate", "RTO Rate"],
                ["returnRate", "Return Rate"],
                ["cancellationRate", "Cancellation Rate"],
                ["totalOrders", "Total Orders"],
                ["totalSpend", "Total Spend"],
                ["lastOrderAt", "Last Order"],
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">
                Risk Watchlist
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                UI pagination only. Excel exports all filtered rows.
              </p>
            </div>

            <div className="text-xs text-gray-500">
              {loadingList ? "Loading..." : `${n(vm.filtered.length)} rows`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <Th>Customer</Th>
                  <Th>Risk</Th>
                  <Th>Orders</Th>
                  <Th>Spend</Th>
                  <Th>RTO</Th>
                  <Th>Returns</Th>
                  <Th>Cancelled</Th>
                  <Th>Refund Pending</Th>
                  <Th>Last RTO</Th>
                  <Th>Last Order</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {vm.paginated.length ? (
                  vm.paginated.map((customer) => {
                    const a = getA(customer);

                    return (
                      <tr key={customer._id} className="transition hover:bg-gray-50/70">
                        <Td>
                          <Link href={`/customers/${customer._id}`} className="block">
                            <div className="font-medium text-gray-950">
                              {customer.name || "Unnamed Customer"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.phone || customer.email || "-"}
                            </div>
                          </Link>
                        </Td>

                        <Td>
                          <RiskBadge score={a.riskScore} />
                        </Td>

                        <Td>{n(a.totalOrders)}</Td>
                        <Td>{money(a.totalSpend)}</Td>
                        <Td>
                          <MetricStack count={a.rtoOrders} rate={a.rtoRate} tone="red" />
                        </Td>
                        <Td>
                          <MetricStack count={a.returnedOrders} rate={a.returnRate} tone="orange" />
                        </Td>
                        <Td>
                          <MetricStack count={a.cancelledOrders} rate={a.cancellationRate} tone="amber" />
                        </Td>
                        <Td>{n(a.refundPendingOrders)}</Td>
                        <Td>{formatDate(a.lastRtoAt)}</Td>
                        <Td>{formatDate(a.lastOrderAt)}</Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-sm text-gray-500"
                    >
                      No risk customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-gray-500">
              Page {vm.currentPage} of {vm.pages} · Showing{" "}
              {n(vm.paginated.length)} of {n(vm.filtered.length)}
            </div>

            <div className="flex gap-2">
              <button
                disabled={vm.currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl bg-gray-50 px-4 py-2 text-sm ring-1 ring-gray-100 disabled:opacity-40"
              >
                Prev
              </button>

              <button
                disabled={vm.currentPage >= vm.pages}
                onClick={() => setPage((p) => Math.min(vm.pages, p + 1))}
                className="rounded-xl bg-gray-950 px-4 py-2 text-sm text-white disabled:opacity-40"
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

function Kpi({ icon, label, value, sub, tone }) {
  const tones = {
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
    red: "from-red-50 to-white text-red-700 ring-red-100",
    orange: "from-orange-50 to-white text-orange-700 ring-orange-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${tones[tone]}`}>
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
        {value}
      </div>
      <div className="mt-2 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-gray-100 focus:ring-gray-200"
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RiskBadge({ score = 0 }) {
  const s = Number(score || 0);

  const cls =
    s >= 60
      ? "bg-red-50 text-red-700 ring-red-100"
      : s >= 30
        ? "bg-orange-50 text-orange-700 ring-orange-100"
        : s > 0
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  const label = s >= 60 ? "High" : s >= 30 ? "Medium" : s > 0 ? "Low" : "Safe";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {label} · {s.toFixed(1)}
    </span>
  );
}

function MetricStack({ count = 0, rate = 0, tone = "gray" }) {
  const tones = {
    red: "text-red-700",
    orange: "text-orange-700",
    amber: "text-amber-700",
    gray: "text-gray-700",
  };

  return (
    <div>
      <div className={`text-sm font-semibold ${tones[tone]}`}>{n(count)}</div>
      <div className="text-[11px] text-gray-400">{pct(rate)}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 align-middle text-gray-700">{children}</td>;
}