"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  RefreshCw,
  Search,
  UserRoundCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCustomerStore } from "@/store/customerStore";

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function InfluencerCreditsPage() {
  const {
    allCreditLogs,
    allCreditLogsTotal,
    allCreditLogsPage,
    allCreditLogsPages,
    loadingAllCreditLogs,
    fetchAllCustomerCreditLogs,
  } = useCustomerStore();

  const [filters, setFilters] = useState({
    type: "influencer",
    search: "",
    influencerCode: "",
    page: 1,
    limit: 20,
    sortOrder: "desc",
  });

  const fetchInfluencers = async (next = filters) => {
    const res = await fetchAllCustomerCreditLogs(next);
    if (res?.success === false) {
      toast.error(res.error || "Failed to load influencer credits");
    }
  };

  useEffect(() => {
    fetchInfluencers(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOnPage = useMemo(() => {
    return allCreditLogs.reduce(
      (sum, item) => sum + Number(item?.log?.amount || 0),
      0
    );
  }, [allCreditLogs]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const applyFilters = () => fetchInfluencers({ ...filters, page: 1 });

  const changePage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    fetchInfluencers(next);
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
            Influencer Credits
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track influencer reward credits, creator codes and campaign wallet bonuses.
          </p>
        </div>

        <button
          onClick={() => fetchInfluencers(filters)}
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

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Users}
          label="Matched Influencer Logs"
          value={allCreditLogsTotal || 0}
        />
        <StatCard
          icon={UserRoundCheck}
          label="Influencer Amount On Page"
          value={money(totalOnPage)}
        />
      </section>

      <section className="card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            icon={Search}
            value={filters.search}
            onChange={(v) => updateFilter("search", v)}
            placeholder="Search customer, influencer, reason..."
          />

          <Input
            icon={BadgePercent}
            value={filters.influencerCode}
            onChange={(v) => updateFilter("influencerCode", v)}
            placeholder="Influencer code e.g. AYESHA500"
          />

          <button onClick={applyFilters} className="btn-primary">
            Apply Filters
          </button>
        </div>
      </section>

      <section className="table-container">
        <div className="border-b border-[var(--primary-border)] p-5">
          <h2 className="section-title">Influencer Credit History</h2>
          <p className="mt-1 text-sm text-gray-500">
            Page {allCreditLogsPage || 1} of {allCreditLogsPages || 1}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="table-head text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Influencer</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {loadingAllCreditLogs ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    Loading influencer credits...
                  </td>
                </tr>
              ) : allCreditLogs.length ? (
                allCreditLogs.map((item, idx) => {
                  const customer = item?.customer || {};
                  const log = item?.log || {};

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

                      <td className="px-5 py-4 text-gray-600">
                        {log.influencerName || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {log.influencerCode ? (
                          <span className="badge-primary">{log.influencerCode}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-emerald-700">
                        +{money(log.amount)}
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
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    No influencer credits found.
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
            {allCreditLogsTotal || 0} influencer logs
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

function Input({ icon: Icon, value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Icon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        className="input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}