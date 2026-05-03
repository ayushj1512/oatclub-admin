// app/customers/analytics/revenue/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Crown,
  IndianRupee,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
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

export default function CustomerRevenuePage() {
  const {
    customers,
    loadingList,
    error,
    fetchAllCustomersForDashboard,
    syncAllCustomerAnalytics,
    syncingAllAnalytics,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [revenueFilter, setRevenueFilter] = useState("all");
  const [sortBy, setSortBy] = useState("totalSpend");
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
      const spend = Number(a.totalSpend || 0);
      const orders = Number(a.totalOrders || 0);
      const aov = Number(a.avgOrderValue || 0);

      const matchesSearch =
        !q ||
        customer?.name?.toLowerCase()?.includes(q) ||
        customer?.email?.toLowerCase()?.includes(q) ||
        customer?.phone?.toLowerCase()?.includes(q) ||
        customer?.customerId?.toLowerCase()?.includes(q);

      const matchesRevenue =
        revenueFilter === "all" ||
        (revenueFilter === "vip" && a.customerType === "vip") ||
        (revenueFilter === "highSpend" && spend >= 10000) ||
        (revenueFilter === "midSpend" && spend >= 3000 && spend < 10000) ||
        (revenueFilter === "lowSpend" && spend > 0 && spend < 3000) ||
        (revenueFilter === "repeat" && orders >= 2) ||
        (revenueFilter === "highAov" && aov >= 2000) ||
        (revenueFilter === "noSpend" && spend <= 0);

      return matchesSearch && matchesRevenue;
    });

    filtered = [...filtered].sort((a, b) => {
      const aa = getA(a);
      const bb = getA(b);

      const map = {
        totalSpend: [aa.totalSpend, bb.totalSpend],
        totalOrders: [aa.totalOrders, bb.totalOrders],
        avgOrderValue: [aa.avgOrderValue, bb.avgOrderValue],
        highestOrderValue: [aa.highestOrderValue, bb.highestOrderValue],
        lastOrderAt: [
          aa.lastOrderAt ? new Date(aa.lastOrderAt).getTime() : 0,
          bb.lastOrderAt ? new Date(bb.lastOrderAt).getTime() : 0,
        ],
      };

      const [av, bv] = map[sortBy] || map.totalSpend;
      return Number(bv || 0) - Number(av || 0);
    });

    const totals = filtered.reduce(
      (acc, customer) => {
        const a = getA(customer);

        acc.spend += Number(a.totalSpend || 0);
        acc.orders += Number(a.totalOrders || 0);
        acc.vip += a.customerType === "vip" ? 1 : 0;
        acc.repeat += Number(a.totalOrders || 0) >= 2 ? 1 : 0;
        acc.highSpend += Number(a.totalSpend || 0) >= 10000 ? 1 : 0;

        return acc;
      },
      { spend: 0, orders: 0, vip: 0, repeat: 0, highSpend: 0 }
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
      aov: totals.orders ? totals.spend / totals.orders : 0,
      revenuePerCustomer: filtered.length ? totals.spend / filtered.length : 0,
    };
  }, [allCustomers, search, revenueFilter, sortBy, page]);

  const downloadExcel = () => {
    const headers = [
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
      "Delivered Orders",
      "COD Orders",
      "Prepaid Orders",
      "Paid Orders",
      "Refund Pending Orders",
      "First Order",
      "Last Order",
      "Last Analytics Sync",
    ];

    const rows = vm.filtered.map((customer) => {
      const a = getA(customer);

      return [
        customer.customerId || customer._id || "-",
        customer.name || "-",
        customer.email || "-",
        customer.phone || "-",
        a.customerType || "new",
        a.totalOrders || 0,
        a.totalSpend || 0,
        a.avgOrderValue || 0,
        a.highestOrderValue || 0,
        a.lowestOrderValue || 0,
        a.deliveredOrders || 0,
        a.codOrders || 0,
        a.prepaidOrders || 0,
        a.paidOrders || 0,
        a.refundPendingOrders || 0,
        formatDate(a.firstOrderAt),
        formatDate(a.lastOrderAt),
        formatDate(a.lastAnalyticsSyncAt),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `customer-revenue-${revenueFilter}-${new Date()
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
              <IndianRupee size={14} />
              Customer revenue intelligence
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
              Revenue Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Analyze high-value customers, AOV, lifetime spend, repeat buyers
              and revenue concentration.
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
            icon={<Wallet size={18} />}
            label="Filtered Revenue"
            value={money(vm.totals.spend)}
            sub={`${n(vm.totals.orders)} orders`}
            tone="emerald"
          />
          <Kpi
            icon={<TrendingUp size={18} />}
            label="Average Order Value"
            value={money(vm.aov)}
            sub={`${money(vm.revenuePerCustomer)} per customer`}
            tone="sky"
          />
          <Kpi
            icon={<Crown size={18} />}
            label="VIP Customers"
            value={n(vm.totals.vip)}
            sub={`High spend ${n(vm.totals.highSpend)}`}
            tone="amber"
          />
          <Kpi
            icon={<ShoppingBag size={18} />}
            label="Repeat Buyers"
            value={n(vm.totals.repeat)}
            sub={`${n(vm.filtered.length)} filtered customers`}
            tone="violet"
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
              label="Revenue Filter"
              value={revenueFilter}
              onChange={(value) => {
                setRevenueFilter(value);
                setPage(1);
              }}
              options={[
                ["all", "All"],
                ["vip", "VIP"],
                ["highSpend", "High Spend ₹10k+"],
                ["midSpend", "Mid Spend ₹3k-10k"],
                ["lowSpend", "Low Spend"],
                ["repeat", "Repeat Buyers"],
                ["highAov", "High AOV ₹2k+"],
                ["noSpend", "No Spend"],
              ]}
            />

            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                ["totalSpend", "Total Spend"],
                ["totalOrders", "Total Orders"],
                ["avgOrderValue", "AOV"],
                ["highestOrderValue", "Highest Order"],
                ["lastOrderAt", "Last Order"],
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">
                Revenue Customers
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
                  <Th>Type</Th>
                  <Th>Orders</Th>
                  <Th>Total Spend</Th>
                  <Th>AOV</Th>
                  <Th>Highest</Th>
                  <Th>Paid</Th>
                  <Th>COD</Th>
                  <Th>Prepaid</Th>
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
                        <Td>
                          <span className="font-semibold text-emerald-700">
                            {money(a.totalSpend)}
                          </span>
                        </Td>
                        <Td>{money(a.avgOrderValue)}</Td>
                        <Td>{money(a.highestOrderValue)}</Td>
                        <Td>{n(a.paidOrders)}</Td>
                        <Td>{n(a.codOrders)}</Td>
                        <Td>{n(a.prepaidOrders)}</Td>
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
                      No revenue customers found.
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
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    sky: "from-sky-50 to-white text-sky-700 ring-sky-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
    violet: "from-violet-50 to-white text-violet-700 ring-violet-100",
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

function Th({ children }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 align-middle text-gray-700">{children}</td>;
}