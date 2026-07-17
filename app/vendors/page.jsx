"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Factory,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";

import useAdminVendorStore from "@/store/adminVendorStore";

const PAGE_LIMIT = 20;

const MODULE_LABELS = {
  sampling: "Sampling",
  pattern: "Pattern",
  production: "Production",
  cuttingList: "Cutting List",
};

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (value) => {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAssignedProductCount = (vendor) =>
  Number(
    vendor?.assignedProductCount ??
      vendor?.productsCount ??
      vendor?.assignedProducts?.length ??
      0
  );

const getEnabledModules = (vendor) =>
  Object.entries(vendor?.modules || {})
    .filter(([, enabled]) => enabled === true)
    .map(([module]) => module);

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({ label, value, icon: Icon, loading }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
            {label}
          </p>

          {loading ? (
            <Loader2 className="mt-3 h-6 w-6 animate-spin text-zinc-400" />
          ) : (
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
              {value}
            </p>
          )}
        </div>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]",
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700",
      ].join(" ")}
    >
      {isActive ? "Active" : "Disabled"}
    </span>
  );
}

function ModuleBadges({ vendor }) {
  const modules = getEnabledModules(vendor);

  if (!modules.length) {
    return (
      <span className="text-xs font-medium text-zinc-400">
        No access
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {modules.slice(0, 2).map((module) => (
        <span
          key={module}
          className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600"
        >
          {MODULE_LABELS[module] || module}
        </span>
      ))}

      {modules.length > 2 && (
        <span className="rounded-full bg-zinc-950 px-2 py-1 text-[10px] font-semibold text-white">
          +{modules.length - 2}
        </span>
      )}
    </div>
  );
}

function VendorRow({ vendor, onOpen }) {
  const assignedCount = getAssignedProductCount(vendor);

  return (
    <button
      type="button"
      onClick={() => onOpen(vendor._id)}
      className="group grid w-full gap-4 border-b border-zinc-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-zinc-50 md:grid-cols-[minmax(0,1.4fr)_minmax(160px,1fr)_110px_120px_36px] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-zinc-950">
            {vendor?.name || "Unnamed Vendor"}
          </p>

          <StatusBadge isActive={vendor?.isActive} />
        </div>

        <p className="mt-1 truncate text-xs text-zinc-500">
          @{vendor?.username || "unknown"}
          {vendor?.phone ? ` · ${vendor.phone}` : ""}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400 md:hidden">
          Modules
        </p>

        <ModuleBadges vendor={vendor} />
      </div>

      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400 md:hidden">
          Products
        </p>

        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Boxes size={14} className="text-zinc-400 md:hidden" />
          {assignedCount}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400 md:hidden">
          Last login
        </p>

        <p className="text-xs font-medium text-zinc-500">
          {formatDate(vendor?.lastLoginAt)}
        </p>
      </div>

      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-zinc-950 group-hover:text-white">
        <ArrowRight size={15} />
      </span>
    </button>
  );
}

function EmptyState({ hasFilters, onCreate, onReset }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
        <Factory size={23} />
      </span>

      <h2 className="mt-4 text-lg font-bold text-zinc-950">
        No vendors found
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
        {hasFilters
          ? "No vendor matches the current search filters."
          : "Create your first vendor account and assign product access."}
      </p>

      <button
        type="button"
        onClick={hasFilters ? onReset : onCreate}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        {hasFilters ? (
          <>
            <X size={16} />
            Clear filters
          </>
        ) : (
          <>
            <Plus size={16} />
            Create vendor
          </>
        )}
      </button>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function VendorsPage() {
  const router = useRouter();

  const {
    vendors,
    vendorPagination,
    loadingVendors,
    error,
    fetchVendors,
    clearMessages,
  } = useAdminVendorStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const loadVendors = useCallback(
    async ({
      page = 1,
      currentSearch = search,
      currentStatus = status,
    } = {}) => {
      clearMessages();

      return fetchVendors({
        page,
        limit: vendorPagination.limit || PAGE_LIMIT,
        search: currentSearch.trim(),
        isActive:
          currentStatus === "all"
            ? ""
            : currentStatus === "active",
      });
    },
    [
      clearMessages,
      fetchVendors,
      search,
      status,
      vendorPagination.limit,
    ]
  );

  useEffect(() => {
    fetchVendors({
      page: 1,
      limit: PAGE_LIMIT,
    });
  }, [fetchVendors]);

  const stats = useMemo(() => {
    const active = vendors.filter(
      (vendor) => vendor?.isActive === true
    ).length;

    const disabled = vendors.filter(
      (vendor) => vendor?.isActive === false
    ).length;

    const withProducts = vendors.filter(
      (vendor) => getAssignedProductCount(vendor) > 0
    ).length;

    return {
      total: vendorPagination.total || vendors.length,
      active,
      disabled,
      withProducts,
    };
  }, [vendors, vendorPagination.total]);

  const hasFilters =
    search.trim().length > 0 || status !== "all";

  const handleSearch = async (event) => {
    event.preventDefault();

    await loadVendors({
      page: 1,
    });
  };

  const handleStatusChange = async (event) => {
    const nextStatus = event.target.value;

    setStatus(nextStatus);

    await loadVendors({
      page: 1,
      currentStatus: nextStatus,
    });
  };

  const resetFilters = async () => {
    setSearch("");
    setStatus("all");

    clearMessages();

    await fetchVendors({
      page: 1,
      limit: PAGE_LIMIT,
    });
  };

  const refreshCurrentPage = async () => {
    await loadVendors({
      page: vendorPagination.page || 1,
    });
  };

  const openVendor = (vendorId) => {
    if (!vendorId) return;

    router.push(`/vendors/${vendorId}`);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  <Factory size={19} />
                </span>

                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                  Vendor Management
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Vendors
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Manage vendor accounts, module permissions and assigned
                OATCLUB products.
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={refreshCurrentPage}
                disabled={loadingVendors}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingVendors ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => router.push("/vendors/create")}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:flex-none"
              >
                <Plus size={17} />
                Create vendor
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Statistics */}
        <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Total vendors"
            value={stats.total}
            icon={Users}
            loading={loadingVendors && !vendors.length}
          />

          <StatCard
            label="Active on page"
            value={stats.active}
            icon={UserCheck}
            loading={loadingVendors && !vendors.length}
          />

          <StatCard
            label="Disabled on page"
            value={stats.disabled}
            icon={UserX}
            loading={loadingVendors && !vendors.length}
          />

          <StatCard
            label="With products"
            value={stats.withProducts}
            icon={ShieldCheck}
            loading={loadingVendors && !vendors.length}
          />
        </section>

        {/* Vendor List */}
        <section className="relative mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {loadingVendors && vendors.length > 0 && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-zinc-100">
              <div className="h-full w-1/3 animate-pulse bg-zinc-950" />
            </div>
          )}

          {/* Filters */}
          <div className="border-b border-zinc-100 p-4 sm:p-5">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 lg:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, username or phone"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-950"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <select
                value={status}
                onChange={handleStatusChange}
                disabled={loadingVendors}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-950 disabled:opacity-60 lg:w-44"
              >
                <option value="all">All vendors</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>

              <button
                type="submit"
                disabled={loadingVendors}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingVendors ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Search
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loadingVendors}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <X size={15} />
                  Reset
                </button>
              )}
            </form>
          </div>

          {/* Content */}
          {loadingVendors && !vendors.length ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />

              <p className="text-sm font-medium text-zinc-500">
                Loading vendors...
              </p>
            </div>
          ) : vendors.length ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(160px,1fr)_110px_120px_36px] gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 md:grid">
                <span>Vendor</span>
                <span>Modules</span>
                <span>Products</span>
                <span>Last login</span>
                <span />
              </div>

              <div>
                {vendors.map((vendor) => (
                  <VendorRow
                    key={vendor._id}
                    vendor={vendor}
                    onOpen={openVendor}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              hasFilters={hasFilters}
              onCreate={() => router.push("/vendors/create")}
              onReset={resetFilters}
            />
          )}

          {/* Pagination */}
          {vendorPagination.pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-4">
              <button
                type="button"
                disabled={
                  loadingVendors ||
                  !vendorPagination.hasPrevPage
                }
                onClick={() =>
                  loadVendors({
                    page: vendorPagination.page - 1,
                  })
                }
                className="h-10 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                Previous
              </button>

              <div className="text-center">
                <p className="text-xs font-semibold text-zinc-600">
                  Page {vendorPagination.page} of{" "}
                  {vendorPagination.pages}
                </p>

                <p className="mt-0.5 hidden text-[10px] text-zinc-400 sm:block">
                  {vendorPagination.total} total vendors
                </p>
              </div>

              <button
                type="button"
                disabled={
                  loadingVendors ||
                  !vendorPagination.hasNextPage
                }
                onClick={() =>
                  loadVendors({
                    page: vendorPagination.page + 1,
                  })
                }
                className="h-10 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}