"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Package2,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useFabricStore } from "@/store/fabricStore";

const cn = (...classes) => classes.filter(Boolean).join(" ");

function Card({ children, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone = "violet", subtext }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{value}</h3>
          {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
        </div>

        <div
          className={cn(
            "rounded-2xl border p-3",
            tones[tone] || tones.violet
          )}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function QuickAction({ title, desc, href, icon: Icon, tone = "violet" }) {
  const router = useRouter();

  const tones = {
    violet: "from-violet-500 to-violet-600",
    sky: "from-sky-500 to-sky-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              "inline-flex rounded-2xl bg-gradient-to-br p-3 text-white shadow-sm",
              tones[tone] || tones.violet
            )}
          >
            <Icon size={18} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{desc}</p>
        </div>

        <ArrowRight
          size={18}
          className="mt-1 text-slate-400 transition group-hover:translate-x-1"
        />
      </div>
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Scissors size={22} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        No fabrics found
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Add your first fabric to start managing fabric records.
      </p>
    </Card>
  );
}

export default function FabricsDashboardPage() {
  const router = useRouter();

  const {
    fabrics,
    fabricStats,
    loading,
    error,
    filters,
    pagination,
    fetchFabrics,
    fetchFabricStats,
    setFilters,
  } = useFabricStore();

  const [search, setSearch] = useState(filters?.q || "");

  const loadData = async (extra = {}) => {
    try {
      await Promise.all([fetchFabricStats(), fetchFabrics(extra)]);
    } catch (err) {
      toast.error(err?.message || "Failed to load fabrics");
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = fabricStats?.totalCount ?? fabricStats?.total ?? pagination?.total ?? 0;
    const active = fabricStats?.activeCount ?? fabricStats?.active ?? 0;
    const inactive = fabricStats?.inactiveCount ?? fabricStats?.inactive ?? 0;
    const discontinued =
      fabricStats?.discontinuedCount ?? fabricStats?.discontinued ?? 0;
    const inUse = fabricStats?.inUseCount ?? fabricStats?.in_use ?? 0;

    return { total, active, inactive, discontinued, inUse };
  }, [fabricStats, pagination]);

  const recentFabrics = useMemo(() => {
    return Array.isArray(fabrics) ? fabrics.slice(0, 6) : [];
  }, [fabrics]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const next = { ...filters, q: search.trim(), page: 1 };
    setFilters(next);
    await loadData(next);
  };

  const clearSearch = async () => {
    setSearch("");
    const next = { ...filters, q: "", page: 1 };
    setFilters(next);
    await loadData(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 px-4 py-5 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
            <Scissors size={14} />
            Fabric Inventory Dashboard
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Fabrics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage fabric records, movement status, mappings and activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(filters)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => router.push("/inventory/add-fabric")}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            <Plus size={16} />
            Add Fabric
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Fabrics"
          value={stats.total}
          icon={Boxes}
          tone="violet"
          subtext="All fabric records"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={CheckCircle2}
          tone="emerald"
          subtext="Currently usable"
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={Clock3}
          tone="amber"
          subtext="Temporarily paused"
        />
        <StatCard
          title="Discontinued"
          value={stats.discontinued}
          icon={XCircle}
          tone="rose"
          subtext="No longer in use"
        />
        <StatCard
          title="In Use"
          value={stats.inUse}
          icon={TrendingUp}
          tone="sky"
          subtext="Active movement"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <QuickAction
          title="Add Fabric"
          desc="Create a new fabric record"
          href="/inventory/add-fabric"
          icon={Plus}
          tone="violet"
        />
        <QuickAction
          title="Fabric List"
          desc="Open full fabrics listing page"
          href="/inventory/fabrics"
          icon={Package2}
          tone="sky"
        />
        <QuickAction
          title="Inventory Dashboard"
          desc="Go back to inventory home"
          href="/inventory"
          icon={Boxes}
          tone="emerald"
        />
      </div>

      <Card className="mt-6 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Fabrics</h2>
            <p className="text-sm text-slate-500">
              Quick view of latest fabric records
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/inventory/fabrics")}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-4 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by fabric name, code, category..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : loading && recentFabrics.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 animate-pulse"
              >
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="mt-3 h-6 w-36 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-24 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : recentFabrics.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentFabrics.map((fabric) => {
              const code = fabric?.code || "—";
              const name = fabric?.name || "Untitled Fabric";
              const category = fabric?.category || "—";
              const status = fabric?.status || "inactive";
              const movement = fabric?.movementStatus || "idle";
              const count =
                fabric?.associatedProductsCount ||
                fabric?.associatedProductCodes?.length ||
                0;

              return (
                <div
                  key={fabric?._id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {code}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{category}</p>
                    </div>

                    <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                      <Scissors size={18} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      tone={
                        status === "active"
                          ? "emerald"
                          : status === "inactive"
                          ? "amber"
                          : "rose"
                      }
                    >
                      {status}
                    </Badge>
                    <Badge tone="sky">{movement}</Badge>
                    <Badge tone="violet">{count} mapped</Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{fabric?.unit || "—"}</span>
                    <span>₹{fabric?.price || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span>
            Showing {recentFabrics.length} of {pagination?.total || stats.total || 0}
          </span>
          {pagination?.totalPages > 1 ? (
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}