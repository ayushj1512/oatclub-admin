// app/customers/analytics/reports/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  Wallet,
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

const csvCell = (value) => {
  const clean = value == null ? "" : String(value);
  return `"${clean.replaceAll('"', '""')}"`;
};

const getA = (customer) => customer?.analytics || {};

export default function CustomerReportsPage() {
  const {
    customers,
    loadingList,
    error,
    fetchAllCustomersForDashboard,
    syncAllCustomerAnalytics,
    syncingAllAnalytics,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState("full");
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

      const matchesSearch =
        !q ||
        customer?.name?.toLowerCase()?.includes(q) ||
        customer?.email?.toLowerCase()?.includes(q) ||
        customer?.phone?.toLowerCase()?.includes(q) ||
        customer?.customerId?.toLowerCase()?.includes(q);

      const matchesReport =
        reportType === "full" ||
        (reportType === "vip" && a.customerType === "vip") ||
        (reportType === "repeat" && a.customerType === "repeat") ||
        (reportType === "risky" && a.customerType === "risky") ||
        (reportType === "inactive" && a.customerType === "inactive") ||
        (reportType === "refunds" && Number(a.refundPendingOrders || 0) > 0) ||
        (reportType === "rto" && Number(a.rtoOrders || 0) > 0) ||
        (reportType === "returns" && Number(a.returnedOrders || 0) > 0) ||
        (reportType === "noOrders" && Number(a.totalOrders || 0) === 0);

      return matchesSearch && matchesReport;
    });

    filtered = [...filtered].sort((a, b) => {
      const aa = getA(a);
      const bb = getA(b);
      return Number(bb.totalSpend || 0) - Number(aa.totalSpend || 0);
    });

    const totals = filtered.reduce(
      (acc, customer) => {
        const a = getA(customer);

        acc.orders += Number(a.totalOrders || 0);
        acc.spend += Number(a.totalSpend || 0);
        acc.rto += Number(a.rtoOrders || 0);
        acc.returns += Number(a.returnedOrders || 0);
        acc.refunds += Number(a.refundPendingOrders || 0);

        return acc;
      },
      { orders: 0, spend: 0, rto: 0, returns: 0, refunds: 0 }
    );

    const pages = Math.max(1, Math.ceil(filtered.length / limit));
    const currentPage = Math.min(page, pages);
    const start = (currentPage - 1) * limit;

    return {
      filtered,
      paginated: filtered.slice(start, start + limit),
      totals,
      pages,
      currentPage,
    };
  }, [allCustomers, search, reportType, page]);

  const getRows = (type = reportType) => {
    return vm.filtered.map((customer) => {
      const a = getA(customer);

      const base = {
        customerId: customer.customerId || customer._id || "-",
        name: customer.name || "-",
        email: customer.email || "-",
        phone: customer.phone || "-",
        type: a.customerType || "new",
        totalOrders: a.totalOrders || 0,
        totalSpend: a.totalSpend || 0,
        avgOrderValue: a.avgOrderValue || 0,
        deliveredOrders: a.deliveredOrders || 0,
        cancelledOrders: a.cancelledOrders || 0,
        returnedOrders: a.returnedOrders || 0,
        rtoOrders: a.rtoOrders || 0,
        refundPendingOrders: a.refundPendingOrders || 0,
        riskScore: a.riskScore || 0,
        firstOrderAt: formatDate(a.firstOrderAt),
        lastOrderAt: formatDate(a.lastOrderAt),
        lastSync: formatDate(a.lastAnalyticsSyncAt),
      };

      if (type === "revenue") {
        return [
          base.customerId,
          base.name,
          base.email,
          base.phone,
          base.type,
          base.totalOrders,
          base.totalSpend,
          base.avgOrderValue,
          a.highestOrderValue || 0,
          a.lowestOrderValue || 0,
          a.codOrders || 0,
          a.prepaidOrders || 0,
          base.firstOrderAt,
          base.lastOrderAt,
        ];
      }

      if (type === "risk") {
        return [
          base.customerId,
          base.name,
          base.email,
          base.phone,
          base.type,
          base.riskScore,
          base.rtoOrders,
          a.rtoRate || 0,
          base.returnedOrders,
          a.returnRate || 0,
          base.cancelledOrders,
          a.cancellationRate || 0,
          base.refundPendingOrders,
          formatDate(a.lastRtoAt),
          formatDate(a.lastReturnedAt),
          formatDate(a.lastCancelledAt),
        ];
      }

      return [
        base.customerId,
        base.name,
        base.email,
        base.phone,
        base.type,
        base.totalOrders,
        base.totalSpend,
        base.avgOrderValue,
        base.deliveredOrders,
        base.cancelledOrders,
        base.returnedOrders,
        base.rtoOrders,
        a.deliveryRate || 0,
        a.returnRate || 0,
        a.rtoRate || 0,
        base.refundPendingOrders,
        base.riskScore,
        base.firstOrderAt,
        base.lastOrderAt,
        base.lastSync,
      ];
    });
  };

  const getHeaders = (type = reportType) => {
    if (type === "revenue") {
      return [
        "Customer ID",
        "Name",
        "Email",
        "Phone",
        "Customer Type",
        "Total Orders",
        "Total Spend",
        "Average Order Value",
        "Highest Order Value",
        "Lowest Order Value",
        "COD Orders",
        "Prepaid Orders",
        "First Order",
        "Last Order",
      ];
    }

    if (type === "risk") {
      return [
        "Customer ID",
        "Name",
        "Email",
        "Phone",
        "Customer Type",
        "Risk Score",
        "RTO Orders",
        "RTO Rate",
        "Returned Orders",
        "Return Rate",
        "Cancelled Orders",
        "Cancellation Rate",
        "Refund Pending Orders",
        "Last RTO",
        "Last Returned",
        "Last Cancelled",
      ];
    }

    return [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Customer Type",
      "Total Orders",
      "Total Spend",
      "Average Order Value",
      "Delivered Orders",
      "Cancelled Orders",
      "Returned Orders",
      "RTO Orders",
      "Delivery Rate",
      "Return Rate",
      "RTO Rate",
      "Refund Pending Orders",
      "Risk Score",
      "First Order",
      "Last Order",
      "Last Analytics Sync",
    ];
  };

  const downloadReport = (type = reportType) => {
    const csv = [getHeaders(type), ...getRows(type)]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `customer-${type}-report-${new Date()
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
              <FileSpreadsheet size={14} />
              Customer reports
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
              Analytics Reports
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Download customer analytics reports for revenue, risk, segments,
              refunds and full customer intelligence.
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
              onClick={() => downloadReport(reportType)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <ArrowDownToLine size={16} />
              Download Current
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
            icon={<Users size={18} />}
            label="Filtered Customers"
            value={n(vm.filtered.length)}
            sub={`Total loaded ${n(allCustomers.length)}`}
            tone="sky"
          />
          <Kpi
            icon={<Wallet size={18} />}
            label="Filtered Revenue"
            value={money(vm.totals.spend)}
            sub={`${n(vm.totals.orders)} orders`}
            tone="emerald"
          />
          <Kpi
            icon={<ShieldAlert size={18} />}
            label="Risk Signals"
            value={`${n(vm.totals.rto)} RTO`}
            sub={`${n(vm.totals.returns)} returns`}
            tone="rose"
          />
          <Kpi
            icon={<FileSpreadsheet size={18} />}
            label="Refund Pending"
            value={n(vm.totals.refunds)}
            sub="Export-ready records"
            tone="amber"
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <ReportCard
            title="Full Customer Report"
            desc="Complete customer analytics data."
            onClick={() => downloadReport("full")}
            tone="sky"
          />
          <ReportCard
            title="Revenue Report"
            desc="Spend, AOV, COD/prepaid and value metrics."
            onClick={() => downloadReport("revenue")}
            tone="emerald"
          />
          <ReportCard
            title="Risk Report"
            desc="RTO, return, cancellation and refund signals."
            onClick={() => downloadReport("risk")}
            tone="rose"
          />
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
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
              label="Report Filter"
              value={reportType}
              onChange={(value) => {
                setReportType(value);
                setPage(1);
              }}
              options={[
                ["full", "Full Report"],
                ["vip", "VIP Customers"],
                ["repeat", "Repeat Customers"],
                ["risky", "Risky Customers"],
                ["inactive", "Inactive Customers"],
                ["refunds", "Refund Pending"],
                ["rto", "RTO Customers"],
                ["returns", "Return Customers"],
                ["noOrders", "No Order Customers"],
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">
                Report Preview
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                UI pagination only. Downloads export all filtered rows.
              </p>
            </div>

            <div className="text-xs text-gray-500">
              {loadingList ? "Loading..." : `${n(vm.filtered.length)} rows`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <Th>Customer</Th>
                  <Th>Type</Th>
                  <Th>Orders</Th>
                  <Th>Spend</Th>
                  <Th>AOV</Th>
                  <Th>RTO</Th>
                  <Th>Return</Th>
                  <Th>Refund Pending</Th>
                  <Th>Risk</Th>
                  <Th>Last Order</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {vm.paginated.length ? (
                  vm.paginated.map((customer) => {
                    const a = getA(customer);

                    return (
                      <tr
                        key={customer._id}
                        className="transition hover:bg-gray-50/70"
                      >
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
                          <TypeBadge value={a.customerType || "new"} />
                        </Td>

                        <Td>{n(a.totalOrders)}</Td>
                        <Td>{money(a.totalSpend)}</Td>
                        <Td>{money(a.avgOrderValue)}</Td>
                        <Td>{pct(a.rtoRate)}</Td>
                        <Td>{pct(a.returnRate)}</Td>
                        <Td>{n(a.refundPendingOrders)}</Td>
                        <Td>
                          <RiskBadge score={a.riskScore} />
                        </Td>
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
                      No report data found.
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
    sky: "from-sky-50 to-white text-sky-700 ring-sky-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${tones[tone]}`}
    >
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

function ReportCard({ title, desc, onClick, tone }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };

  return (
    <button
      onClick={onClick}
      className="group rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}
      >
        <ArrowDownToLine size={18} />
      </div>

      <div className="mt-4 text-sm font-semibold text-gray-950">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</div>
    </button>
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

function TypeBadge({ value }) {
  const styles = {
    vip: "bg-amber-50 text-amber-700 ring-amber-100",
    repeat: "bg-violet-50 text-violet-700 ring-violet-100",
    risky: "bg-rose-50 text-rose-700 ring-rose-100",
    inactive: "bg-gray-100 text-gray-700 ring-gray-200",
    new: "bg-sky-50 text-sky-700 ring-sky-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${
        styles[value] || styles.new
      }`}
    >
      {value}
    </span>
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

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}
    >
      {s.toFixed(1)}
    </span>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 align-middle text-gray-700">{children}</td>;
}