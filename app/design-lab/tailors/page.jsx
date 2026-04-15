"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  ArrowUpDown,
  UserCog,
  Mail,
  Phone,
  Star,
  Sparkles,
} from "lucide-react";
import useTailorStore from "@/store/useTailorStore";

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "sample_tailor", label: "Sample Tailor" },
  { value: "pattern_master", label: "Pattern Master" },
  { value: "cutting_master", label: "Cutting Master" },
  { value: "stitching_tailor", label: "Stitching Tailor" },
  { value: "finishing_tailor", label: "Finishing Tailor" },
  { value: "alteration_tailor", label: "Alteration Tailor" },
  { value: "karigar", label: "Karigar" },
  { value: "embroidery_tailor", label: "Embroidery Tailor" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A → Z" },
  { value: "name_desc", label: "Name Z → A" },
  { value: "rating_desc", label: "Rating High → Low" },
  { value: "rating_asc", label: "Rating Low → High" },
  { value: "joined_desc", label: "Joined New → Old" },
  { value: "joined_asc", label: "Joined Old → New" },
];

const formatLabel = (value = "") =>
  value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRatingStars = (rating = 0) => {
  const rounded = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 }, (_, i) => i < rounded);
};

function EmptyState() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
        <UserCog className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">No tailors found</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Try changing filters or add a new tailor.
      </p>
      <Link
        href="/design-lab/tailors/new"
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        <Plus className="h-4 w-4" />
        Add Tailor
      </Link>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-zinc-200" />
          <div className="h-3 w-24 rounded bg-zinc-100" />
        </div>
        <div className="h-8 w-20 rounded-xl bg-zinc-100" />
      </div>
      <div className="mt-4 grid gap-2">
        <div className="h-3 w-40 rounded bg-zinc-100" />
        <div className="h-3 w-28 rounded bg-zinc-100" />
        <div className="h-3 w-24 rounded bg-zinc-100" />
      </div>
    </div>
  );
}

export default function TailorsPage() {
  const {
    tailors,
    filters,
    listLoading,
    fetchTailors,
    setFilters,
    resetFilters,
  } = useTailorStore();

  useEffect(() => {
    fetchTailors();
  }, [fetchTailors]);

  const stats = useMemo(() => {
    const total = tailors.length;
    const active = tailors.filter((item) => item.status === "active").length;
    const inactive = tailors.filter((item) => item.status === "inactive").length;
    const avgRating = total
      ? (
          tailors.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / total
        ).toFixed(1)
      : "0.0";

    return { total, active, inactive, avgRating };
  }, [tailors]);

  const onApply = () => fetchTailors();
  const onReset = () => {
    resetFilters();
    setTimeout(() => fetchTailors({ search: "", status: "all", type: "all", sort: "newest" }), 0);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto  space-y-4">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                Design Lab
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
                Tailors
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Manage all tailors, roles, status, ratings and profiles.
              </p>
            </div>

            <Link
              href="/design-lab/tailors/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Add Tailor
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total", value: stats.total },
              { label: "Active", value: stats.active },
              { label: "Inactive", value: stats.inactive },
              { label: "Avg Rating", value: stats.avgRating },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="mt-1 text-lg font-semibold text-zinc-950">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Search
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3">
                <Search className="h-4 w-4 text-zinc-400" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  placeholder="Search by name, email, mobile, type"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ type: e.target.value })}
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Sort
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3">
                <ArrowUpDown className="h-4 w-4 text-zinc-400" />
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters({ sort: e.target.value })}
                  className="h-11 w-full bg-transparent text-sm outline-none"
                >
                  {SORT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Search className="h-4 w-4" />
              Apply
            </button>

            <button
              onClick={() => fetchTailors()}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Reset
            </button>
          </div>
        </div>

        {listLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : tailors.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tailors.map((item) => (
              <div
                key={item._id}
                className="group rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-zinc-950">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-violet-700">
                      {formatLabel(item.type)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      item.status === "active"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"
                    }`}
                  >
                    {formatLabel(item.status)}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-zinc-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span className="truncate">{item.email || "No email"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <span>{item.mobile || "No mobile"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-zinc-400" />
                    <div className="flex items-center gap-1">
                      {getRatingStars(item.rating).map((filled, idx) => (
                        <Star
                          key={idx}
                          className={`h-3.5 w-3.5 ${
                            filled
                              ? "fill-violet-500 text-violet-500"
                              : "text-zinc-300"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs text-zinc-500">
                        {Number(item.rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500">
                    Joined: {formatDate(item.joinedAt)}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/design-lab/tailors/${item._id}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    <Eye className="h-4 w-4" />
                    View / Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}