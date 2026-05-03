// app/customers/analytics/segments/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Crown,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  IndianRupee,
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

export default function CustomerSegmentsPage() {
  const {
    customers,
    loadingList,
    error,
    fetchAllCustomersForDashboard,
    syncAllCustomerAnalytics,
    syncingAllAnalytics,
  } = useCustomerStore();

  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
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
      const type = a.customerType || "new";

      const matchSegment = segment === "all" || type === segment;

      const matchSearch =
        !q ||
        customer?.name?.toLowerCase()?.includes(q) ||
        customer?.email?.toLowerCase()?.includes(q) ||
        customer?.phone?.toLowerCase()?.includes(q) ||
        customer?.customerId?.toLowerCase()?.includes(q);

      return matchSegment && matchSearch;
    });

    filtered = [...filtered].sort((a, b) => {
      const aa = getA(a);
      const bb = getA(b);

      const map = {
        totalSpend: [aa.totalSpend, bb.totalSpend],
        totalOrders: [aa.totalOrders, bb.totalOrders],
        riskScore: [aa.riskScore, bb.riskScore],
        rtoRate: [aa.rtoRate, bb.rtoRate],
        returnRate: [aa.returnRate, bb.returnRate],
        lastOrderAt: [
          aa.lastOrderAt ? new Date(aa.lastOrderAt).getTime() : 0,
          bb.lastOrderAt ? new Date(bb.lastOrderAt).getTime() : 0,
        ],
      };

      const [av, bv] = map[sortBy] || map.totalSpend;
      return Number(bv || 0) - Number(av || 0);
    });

    const segments = {
      all: allCustomers.length,
      new: allCustomers.filter((c) => getA(c).customerType === "new").length,
      repeat: allCustomers.filter((c) => getA(c).customerType === "repeat").length,
      vip: allCustomers.filter((c) => getA(c).customerType === "vip").length,
      risky: allCustomers.filter((c) => getA(c).customerType === "risky").length,
      inactive: allCustomers.filter((c) => getA(c).customerType === "inactive").length,
    };

    const totalSpend = filtered.reduce(
      (sum, c) => sum + Number(getA(c).totalSpend || 0),
      0
    );

    const totalOrders = filtered.reduce(
      (sum, c) => sum + Number(getA(c).totalOrders || 0),
      0
    );

    const pages = Math.max(1, Math.ceil(filtered.length / limit));
    const currentPage = Math.min(page, pages);
    const start = (currentPage - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      filtered,
      paginated,
      segments,
      totalSpend,
      totalOrders,
      pages,
      currentPage,
    };
  }, [allCustomers, segment, search, sortBy, page]);

  const downloadExcel = () => {
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Segment",
      "Total Orders",
      "Total Spend",
      "AOV",
      "Delivered Orders",
      "Cancelled Orders",
      "Returned Orders",
      "RTO Orders",
      "Delivery Rate",
      "Cancellation Rate",
      "Return Rate",
      "RTO Rate",
      "Risk Score",
      "COD Orders",
      "Prepaid Orders",
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
        a.deliveredOrders || 0,
        a.cancelledOrders || 0,
        a.returnedOrders || 0,
        a.rtoOrders || 0,
        a.deliveryRate || 0,
        a.cancellationRate || 0,
        a.returnRate || 0,
        a.rtoRate || 0,
        a.riskScore || 0,
        a.codOrders || 0,
        a.prepaidOrders || 0,
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
    link.download = `customer-segments-${segment}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSync = async () => {
    const result = await syncAllCustomerAnalytics?.();
    if (result?.success) {
      await fetchAllCustomersForDashboard?.({ limit: 200 });
    }
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
              <Sparkles size={14} />
              Customer segmentation
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">
              Customer Segments
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Filter VIP, repeat, risky, inactive and new customers. Export full
              filtered data anytime.
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
            icon={<Users size={18} />}
            label="Filtered Customers"
            value={n(vm.filtered.length)}
            sub={`All customers ${n(allCustomers.length)}`}
            tone="sky"
          />
          <Kpi
            icon={<IndianRupeeIcon />}
            label="Segment Spend"
            value={money(vm.totalSpend)}
            sub={`Orders ${n(vm.totalOrders)}`}
            tone="emerald"
          />
          <Kpi
            icon={<Crown size={18} />}
            label="VIP Customers"
            value={n(vm.segments.vip)}
            sub={`Repeat ${n(vm.segments.repeat)}`}
            tone="violet"
          />
          <Kpi
            icon={<ShieldAlert size={18} />}
            label="Risky Customers"
            value={n(vm.segments.risky)}
            sub={`Inactive ${n(vm.segments.inactive)}`}
            tone="rose"
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
              label="Segment"
              value={segment}
              onChange={(value) => {
                setSegment(value);
                setPage(1);
              }}
              options={[
                ["all", "All"],
                ["new", "New"],
                ["repeat", "Repeat"],
                ["vip", "VIP"],
                ["risky", "Risky"],
                ["inactive", "Inactive"],
              ]}
            />

            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                ["totalSpend", "Total Spend"],
                ["totalOrders", "Total Orders"],
                ["riskScore", "Risk Score"],
                ["rtoRate", "RTO Rate"],
                ["returnRate", "Return Rate"],
                ["lastOrderAt", "Last Order"],
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(vm.segments).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setSegment(key);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                  segment === key
                    ? "bg-gray-950 text-white"
                    : "bg-gray-50 text-gray-600 ring-1 ring-gray-100 hover:bg-gray-100"
                }`}
              >
                {key} · {n(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">
                Segment Customers
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
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <Th>Customer</Th>
                  <Th>Segment</Th>
                  <Th>Orders</Th>
                  <Th>Spend</Th>
                  <Th>AOV</Th>
                  <Th>Delivered</Th>
                  <Th>RTO</Th>
                  <Th>Return</Th>
                  <Th>Risk</Th>
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
                          <Link
                            href={`/customers/${customer._id}`}
                            className="block"
                          >
                            <div className="font-medium text-gray-950">
                              {customer.name || "Unnamed Customer"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.phone || customer.email || "-"}
                            </div>
                          </Link>
                        </Td>

                        <Td>
                          <SegmentBadge value={a.customerType || "new"} />
                        </Td>

                        <Td>{n(a.totalOrders)}</Td>
                        <Td>{money(a.totalSpend)}</Td>
                        <Td>{money(a.avgOrderValue)}</Td>
                        <Td>{n(a.deliveredOrders)}</Td>
                        <Td>{pct(a.rtoRate)}</Td>
                        <Td>{pct(a.returnRate)}</Td>
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
                      No customers found.
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

function IndianRupeeIcon() {
  return <IndianRupee className="h-[18px] w-[18px]" />;
}

function Kpi({ icon, label, value, sub, tone }) {
  const tones = {
    sky: "from-sky-50 to-white text-sky-700 ring-sky-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    violet: "from-violet-50 to-white text-violet-700 ring-violet-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
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

function SegmentBadge({ value }) {
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
        : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
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