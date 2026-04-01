"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCcw,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

import { useInfluencerProgramStore } from "@/store/influencerProgramStore";

const inputClass =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-black";

const selectClass =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-black";

const safe = (v) => (v == null || v === "" ? "-" : String(v));

const formatNumber = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "0";
};

const statusOptions = [
  { label: "All Status", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Interested", value: "interested" },
  { label: "Active", value: "active" },
  { label: "Rejected", value: "rejected" },
  { label: "Inactive", value: "inactive" },
];

const collaborationOptions = [
  { label: "All Types", value: "" },
  { label: "Barter", value: "barter" },
  { label: "Paid", value: "paid" },
  { label: "Affiliate", value: "affiliate" },
  { label: "Gifting", value: "gifting" },
];

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Reach High-Low", value: "reach_desc" },
  { label: "Reach Low-High", value: "reach_asc" },
  { label: "Code Asc", value: "code_asc" },
  { label: "Code Desc", value: "code_desc" },
];

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

export default function AllInfluencerCollaborationPage() {
  const router = useRouter();

  const {
    influencers,
    loading,
    page,
    limit,
    total,
    totalPages,
    filters,
    setFilters,
    setPage,
    setLimit,
    resetFilters,
    fetchInfluencers,
  } = useInfluencerProgramStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");

  useEffect(() => {
    fetchInfluencers();
  }, [page, limit, filters.status, filters.collaborationType, filters.sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilters]);

  useEffect(() => {
    fetchInfluencers();
  }, [filters.search]);

  const stats = useMemo(() => {
    const totalReach = influencers.reduce(
      (sum, item) => sum + Number(item?.totalReach || 0),
      0
    );

    return {
      totalItems: total || 0,
      pageItems: influencers.length,
      totalReach,
    };
  }, [influencers, total]);

  const handleRowClick = (row) => {
    if (!row?.code) return;
    router.push(`/infleuncer-collaboration/${row.code}`);
  };

  const handleReset = () => {
    setSearchInput("");
    resetFilters();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Influencer Collaboration
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              View and manage all influencer collaboration records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/infleuncer-collaboration/add"
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Influencer
            </Link>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total Records" value={formatNumber(stats.totalItems)} />
          <StatCard label="Current Page Rows" value={formatNumber(stats.pageItems)} />
          <StatCard label="Current Page Reach" value={formatNumber(stats.totalReach)} />
        </div>

        <div className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-2xl bg-neutral-100 p-2">
              <Search className="h-4 w-4 text-neutral-700" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by code, name, mobile"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                className={selectClass}
              >
                {statusOptions.map((item) => (
                  <option key={item.value || "all-status"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Collaboration Type
              </label>
              <select
                value={filters.collaborationType}
                onChange={(e) =>
                  setFilters({ collaborationType: e.target.value })
                }
                className={selectClass}
              >
                {collaborationOptions.map((item) => (
                  <option key={item.value || "all-type"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Sort
              </label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value })}
                className={selectClass}
              >
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchInfluencers()}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-neutral-100 p-2">
                <Users className="h-4 w-4 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Influencer Table
                </h2>
                <p className="text-sm text-neutral-500">
                  Click any row to open influencer detail page
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <ArrowUpDown className="h-4 w-4" />
              {formatNumber(total)} total
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Code
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Name
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Mobile
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    City
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    State
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Niche
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Type
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    Status
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                    Total Reach
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-neutral-500"
                    >
                      Loading influencers...
                    </td>
                  </tr>
                ) : influencers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-neutral-500"
                    >
                      No influencers found
                    </td>
                  </tr>
                ) : (
                  influencers.map((row) => (
                    <tr
                      key={row._id}
                      onClick={() => handleRowClick(row)}
                      className="cursor-pointer transition hover:bg-neutral-50"
                    >
                      <td className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
                        {safe(row.code)}
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        <div className="font-medium">{safe(row.fullName)}</div>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {safe(row.email)}
                        </div>
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        {safe(row.mobile)}
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        {safe(row.city)}
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        {safe(row.state)}
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        {safe(row.niche)}
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-800">
                          {safe(row.collaborationType)}
                        </span>
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        <span className="inline-flex rounded-full bg-black px-3 py-1 text-xs font-semibold capitalize text-white">
                          {safe(row.status)}
                        </span>
                      </td>

                      <td className="border-b border-neutral-200 px-4 py-3 text-right text-sm font-semibold text-neutral-900">
                        {formatNumber(row.totalReach)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-neutral-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-neutral-500">
              Page <span className="font-semibold text-neutral-900">{page}</span> of{" "}
              <span className="font-semibold text-neutral-900">{totalPages}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}