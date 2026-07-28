"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Crown,
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

const isSuperAdmin = (vendor) =>
  vendor?.role === "superadmin";

const getProductCount = (vendor) => {
  if (isSuperAdmin(vendor)) {
    return "All";
  }

  return Number(
    vendor?.assignedProductCount ??
      vendor?.productsCount ??
      vendor?.assignedProducts?.length ??
      0
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {label}
          </p>

          {loading ? (
            <Loader2 className="mt-3 h-6 w-6 animate-spin text-zinc-400" />
          ) : (
            <p className="mt-2 text-3xl font-black text-zinc-950">
              {value}
            </p>
          )}
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function RoleBadge({ vendor }) {
  const superAdmin = isSuperAdmin(vendor);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
        superAdmin
          ? "bg-amber-50 text-amber-700"
          : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {superAdmin && <Crown size={10} />}

      {superAdmin ? "Super Admin" : "Vendor"}
    </span>
  );
}

function ModuleBadges({ vendor }) {
  if (isSuperAdmin(vendor)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold text-white">
        <ShieldCheck size={11} />
        All modules
      </span>
    );
  }

  const modules = Object.entries(
    vendor?.modules || {}
  )
    .filter(([, enabled]) => enabled === true)
    .map(([module]) => module);

  if (!modules.length) {
    return (
      <span className="text-xs text-zinc-400">
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
  return (
    <button
      type="button"
      onClick={() => onOpen(vendor?._id)}
      className="group grid w-full gap-4 border-b border-zinc-100 px-4 py-4 text-left transition last:border-0 hover:bg-zinc-50 md:grid-cols-[minmax(0,1.4fr)_minmax(170px,1fr)_100px_120px_36px] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-zinc-950">
            {vendor?.name || "Unnamed Vendor"}
          </p>

          <RoleBadge vendor={vendor} />

          <StatusBadge
            active={vendor?.isActive === true}
          />
        </div>

        <p className="mt-1 truncate text-xs text-zinc-500">
          @{vendor?.username || "unknown"}
          {vendor?.phone
            ? ` · ${vendor.phone}`
            : ""}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 md:hidden">
          Modules
        </p>

        <ModuleBadges vendor={vendor} />
      </div>

      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 md:hidden">
          Products
        </p>

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Boxes size={14} />
          {getProductCount(vendor)}
        </span>
      </div>

      <div>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 md:hidden">
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
  const [status, setStatus] =
    useState("all");

  const loadVendors = useCallback(
    async ({
      page = 1,
      currentSearch = search,
      currentStatus = status,
    } = {}) => {
      clearMessages();

      return fetchVendors({
        page,
        limit:
          vendorPagination.limit ||
          PAGE_LIMIT,
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
      (vendor) => vendor?.isActive !== true
    ).length;

    const superAdmins = vendors.filter(
      isSuperAdmin
    ).length;

    return {
      total:
        vendorPagination.total ||
        vendors.length,
      active,
      disabled,
      superAdmins,
    };
  }, [vendors, vendorPagination.total]);

  const hasFilters =
    search.trim() || status !== "all";

  const resetFilters = async () => {
    setSearch("");
    setStatus("all");
    clearMessages();

    await fetchVendors({
      page: 1,
      limit: PAGE_LIMIT,
    });
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <Users size={13} />
                Vendor Management
              </span>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Vendors
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Manage vendors, super admins,
                modules and product access.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loadingVendors}
                onClick={() =>
                  loadVendors({
                    page:
                      vendorPagination.page ||
                      1,
                  })
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingVendors
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/vendors/create")
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white"
              >
                <Plus size={17} />
                Create
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Total vendors"
            value={stats.total}
            icon={Users}
            loading={
              loadingVendors &&
              !vendors.length
            }
          />

          <StatCard
            label="Active"
            value={stats.active}
            icon={UserCheck}
            loading={
              loadingVendors &&
              !vendors.length
            }
          />

          <StatCard
            label="Disabled"
            value={stats.disabled}
            icon={UserX}
            loading={
              loadingVendors &&
              !vendors.length
            }
          />

          <StatCard
            label="Super admins"
            value={stats.superAdmins}
            icon={Crown}
            loading={
              loadingVendors &&
              !vendors.length
            }
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadVendors({ page: 1 });
            }}
            className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search vendor"
                className="h-11 w-full rounded-xl border border-zinc-200 pl-10 pr-4 text-sm outline-none focus:border-zinc-950"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                const value =
                  event.target.value;

                setStatus(value);

                loadVendors({
                  page: 1,
                  currentStatus: value,
                });
              }}
              className="h-11 rounded-xl border border-zinc-200 px-3 text-sm outline-none"
            >
              <option value="all">
                All status
              </option>
              <option value="active">
                Active
              </option>
              <option value="disabled">
                Disabled
              </option>
            </select>

            <button
              disabled={loadingVendors}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loadingVendors ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
              >
                <X size={15} />
                Reset
              </button>
            )}
          </form>

          {loadingVendors &&
          !vendors.length ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
            </div>
          ) : vendors.length ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(170px,1fr)_100px_120px_36px] gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-400 md:grid">
                <span>Vendor</span>
                <span>Access</span>
                <span>Products</span>
                <span>Last login</span>
                <span />
              </div>

              {vendors.map((vendor) => (
                <VendorRow
                  key={vendor._id}
                  vendor={vendor}
                  onOpen={(id) =>
                    router.push(
                      `/vendors/${id}`
                    )
                  }
                />
              ))}
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 text-zinc-300" />

              <p className="mt-3 font-bold text-zinc-950">
                No vendors found
              </p>

              <button
                type="button"
                onClick={
                  hasFilters
                    ? resetFilters
                    : () =>
                        router.push(
                          "/vendors/create"
                        )
                }
                className="mt-4 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
              >
                {hasFilters
                  ? "Clear filters"
                  : "Create vendor"}
              </button>
            </div>
          )}

          {vendorPagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 p-4">
              <button
                type="button"
                disabled={
                  loadingVendors ||
                  !vendorPagination.hasPrevPage
                }
                onClick={() =>
                  loadVendors({
                    page:
                      vendorPagination.page -
                      1,
                  })
                }
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs font-semibold text-zinc-500">
                Page {vendorPagination.page} of{" "}
                {vendorPagination.pages}
              </span>

              <button
                type="button"
                disabled={
                  loadingVendors ||
                  !vendorPagination.hasNextPage
                }
                onClick={() =>
                  loadVendors({
                    page:
                      vendorPagination.page +
                      1,
                  })
                }
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
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