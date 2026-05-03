// app/customers/analytics/retention/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Clock,
  RefreshCw,
  Repeat,
  Search,
  TimerOff,
  UserPlus,
  Users,
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

const daysSince = (v) => {
  if (!v) return null;
  const diff = Date.now() - new Date(v).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const csvCell = (value) => {
  const clean = value == null ? "" : String(value);
  return `"${clean.replaceAll('"', '""')}"`;
};

const getA = (customer) => customer?.analytics || {};

export default function CustomerRetentionPage() {
  const {
    customers,
    loadingList,
    error,
    fetchAllCustomersForDashboard,
    syncAllCustomerAnalytics,
    syncingAllAnalytics,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [retentionFilter, setRetentionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("lastOrderAt");
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
      const orders = Number(a.totalOrders || 0);
      const lastDays = daysSince(a.lastOrderAt);
      const joinedDays = daysSince(customer.joinedAt || customer.createdAt);

      const matchesSearch =
        !q ||
        customer?.name?.toLowerCase()?.includes(q) ||
        customer?.email?.toLowerCase()?.includes(q) ||
        customer?.phone?.toLowerCase()?.includes(q) ||
        customer?.customerId?.toLowerCase()?.includes(q);

      const matchesRetention =
        retentionFilter === "all" ||
        (retentionFilter === "newNoOrder" && orders === 0) ||
        (retentionFilter === "oneTime" && orders === 1) ||
        (retentionFilter === "repeat" && orders >= 2) ||
        (retentionFilter === "loyal" && orders >= 5) ||
        (retentionFilter === "inactive30" &&
          orders > 0 &&
          lastDays !== null &&
          lastDays >= 30) ||
        (retentionFilter === "inactive90" &&
          orders > 0 &&
          lastDays !== null &&
          lastDays >= 90) ||
        (retentionFilter === "freshSignup" &&
          joinedDays !== null &&
          joinedDays <= 30);

      return matchesSearch && matchesRetention;
    });

    filtered = [...filtered].sort((a, b) => {
      const aa = getA(a);
      const bb = getA(b);

      const map = {
        lastOrderAt: [
          aa.lastOrderAt ? new Date(aa.lastOrderAt).getTime() : 0,
          bb.lastOrderAt ? new Date(bb.lastOrderAt).getTime() : 0,
        ],
        totalOrders: [aa.totalOrders, bb.totalOrders],
        totalSpend: [aa.totalSpend, bb.totalSpend],
        avgOrderValue: [aa.avgOrderValue, bb.avgOrderValue],
        joinedAt: [
          a.joinedAt || a.createdAt ? new Date(a.joinedAt || a.createdAt).getTime() : 0,
          b.joinedAt || b.createdAt ? new Date(b.joinedAt || b.createdAt).getTime() : 0,
        ],
        inactiveDays: [
          daysSince(aa.lastOrderAt) || 0,
          daysSince(bb.lastOrderAt) || 0,
        ],
      };

      const [av, bv] = map[sortBy] || map.lastOrderAt;
      return Number(bv || 0) - Number(av || 0);
    });

    const totals = filtered.reduce(
      (acc, customer) => {
        const a = getA(customer);
        const orders = Number(a.totalOrders || 0);
        const lastDays = daysSince(a.lastOrderAt);

        acc.orders += orders;
        acc.spend += Number(a.totalSpend || 0);

        if (orders === 0) acc.newNoOrder += 1;
        if (orders === 1) acc.oneTime += 1;
        if (orders >= 2) acc.repeat += 1;
        if (orders >= 5) acc.loyal += 1;
        if (orders > 0 && lastDays !== null && lastDays >= 30) acc.inactive30 += 1;
        if (orders > 0 && lastDays !== null && lastDays >= 90) acc.inactive90 += 1;

        return acc;
      },
      {
        orders: 0,
        spend: 0,
        newNoOrder: 0,
        oneTime: 0,
        repeat: 0,
        loyal: 0,
        inactive30: 0,
        inactive90: 0,
      }
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
      repeatRate: filtered.length ? (totals.repeat / filtered.length) * 100 : 0,
      inactiveRate: filtered.length ? (totals.inactive30 / filtered.length) * 100 : 0,
      revenuePerCustomer: filtered.length ? totals.spend / filtered.length : 0,
    };
  }, [allCustomers, search, retentionFilter, sortBy, page]);

  const downloadExcel = () => {
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Retention Bucket",
      "Customer Type",
      "Total Orders",
      "Total Spend",
      "AOV",
      "First Order",
      "Last Order",
      "Days Since Last Order",
      "Joined At",
      "Days Since Joined",
      "Delivered Orders",
      "Cancelled Orders",
      "Returned Orders",
      "RTO Orders",
      "Last Analytics Sync",
    ];

    const rows = vm.filtered.map((customer) => {
      const a = getA(customer);
      const orders = Number(a.totalOrders || 0);
      const inactiveDays = daysSince(a.lastOrderAt);
      const joinedDays = daysSince(customer.joinedAt || customer.createdAt);

      const bucket =
        orders === 0
          ? "new_no_order"
          : orders === 1
            ? "one_time"
            : orders >= 5
              ? "loyal"
              : "repeat";

      return [
        customer.customerId || customer._id || "-",
        customer.name || "-",
        customer.email || "-",
        customer.phone || "-",
        bucket,
        a.customerType || "new",
        a.totalOrders || 0,
        a.totalSpend || 0,
        a.avgOrderValue || 0,
        formatDate(a.firstOrderAt),
        formatDate(a.lastOrderAt),
        inactiveDays ?? "-",
        formatDate(customer.joinedAt || customer.createdAt),
        joinedDays ?? "-",
        a.deliveredOrders || 0,
        a.cancelledOrders || 0,
        a.returnedOrders || 0,
        a.rtoOrders || 0,
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
    link.download = `customer-retention-${retentionFilter}-${new Date()
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
              <Repeat size={14} />
              Customer lifecycle intelligence
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
              Retention Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Track one-time buyers, repeat customers, loyal customers and inactive customers.
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
            icon={<Repeat size={18} />}
            label="Repeat Rate"
            value={`${vm.repeatRate.toFixed(1)}%`}
            sub={`${n(vm.totals.repeat)} repeat customers`}
            tone="violet"
          />
          <Kpi
            icon={<UserPlus size={18} />}
            label="One-Time Buyers"
            value={n(vm.totals.oneTime)}
            sub={`${n(vm.totals.newNoOrder)} with no orders`}
            tone="sky"
          />
          <Kpi
            icon={<TimerOff size={18} />}
            label="Inactive 30+ Days"
            value={n(vm.totals.inactive30)}
            sub={`${n(vm.totals.inactive90)} inactive 90+ days`}
            tone="rose"
          />
          <Kpi
            icon={<Users size={18} />}
            label="Revenue / Customer"
            value={money(vm.revenuePerCustomer)}
            sub={`Spend ${money(vm.totals.spend)}`}
            tone="emerald"
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
              label="Retention Filter"
              value={retentionFilter}
              onChange={(value) => {
                setRetentionFilter(value);
                setPage(1);
              }}
              options={[
                ["all", "All"],
                ["newNoOrder", "New / No Order"],
                ["oneTime", "One-Time Buyer"],
                ["repeat", "Repeat Buyer"],
                ["loyal", "Loyal 5+ Orders"],
                ["inactive30", "Inactive 30+ Days"],
                ["inactive90", "Inactive 90+ Days"],
                ["freshSignup", "Fresh Signup 30 Days"],
              ]}
            />

            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                ["lastOrderAt", "Last Order"],
                ["inactiveDays", "Inactive Days"],
                ["totalOrders", "Total Orders"],
                ["totalSpend", "Total Spend"],
                ["avgOrderValue", "AOV"],
                ["joinedAt", "Joined At"],
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">
                Retention Customers
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
                  <Th>Bucket</Th>
                  <Th>Orders</Th>
                  <Th>Spend</Th>
                  <Th>AOV</Th>
                  <Th>First Order</Th>
                  <Th>Last Order</Th>
                  <Th>Inactive</Th>
                  <Th>Joined</Th>
                  <Th>Type</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {vm.paginated.length ? (
                  vm.paginated.map((customer) => {
                    const a = getA(customer);
                    const orders = Number(a.totalOrders || 0);
                    const inactiveDays = daysSince(a.lastOrderAt);

                    const bucket =
                      orders === 0
                        ? "No Order"
                        : orders === 1
                          ? "One-Time"
                          : orders >= 5
                            ? "Loyal"
                            : "Repeat";

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
                          <BucketBadge value={bucket} />
                        </Td>

                        <Td>{n(a.totalOrders)}</Td>
                        <Td>{money(a.totalSpend)}</Td>
                        <Td>{money(a.avgOrderValue)}</Td>
                        <Td>{formatDate(a.firstOrderAt)}</Td>
                        <Td>{formatDate(a.lastOrderAt)}</Td>
                        <Td>
                          <InactiveBadge days={inactiveDays} />
                        </Td>
                        <Td>{formatDate(customer.joinedAt || customer.createdAt)}</Td>
                        <Td>
                          <TypeBadge value={a.customerType || "new"} />
                        </Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-sm text-gray-500"
                    >
                      No retention customers found.
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
    violet: "from-violet-50 to-white text-violet-700 ring-violet-100",
    sky: "from-sky-50 to-white text-sky-700 ring-sky-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
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

function BucketBadge({ value }) {
  const styles = {
    "No Order": "bg-gray-100 text-gray-700 ring-gray-200",
    "One-Time": "bg-sky-50 text-sky-700 ring-sky-100",
    Repeat: "bg-violet-50 text-violet-700 ring-violet-100",
    Loyal: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        styles[value] || styles["One-Time"]
      }`}
    >
      {value}
    </span>
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

function InactiveBadge({ days }) {
  if (days == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500 ring-1 ring-gray-100">
        <Clock size={12} />
        -
      </span>
    );
  }

  const cls =
    days >= 90
      ? "bg-red-50 text-red-700 ring-red-100"
      : days >= 30
        ? "bg-orange-50 text-orange-700 ring-orange-100"
        : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}
    >
      <Clock size={12} />
      {days}d
    </span>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 align-middle text-gray-700">{children}</td>;
}