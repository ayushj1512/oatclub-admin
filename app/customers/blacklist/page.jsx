"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Filter,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingBag,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useCustomerStore } from "@/store/customerStore";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SORT_OPTIONS = [
  { label: "Newest customers", value: "createdAt-desc" },
  { label: "Oldest customers", value: "createdAt-asc" },
  { label: "Name A-Z", value: "name-asc" },
  { label: "Name Z-A", value: "name-desc" },
  { label: "Highest risk", value: "riskScore-desc" },
  { label: "Lowest risk", value: "riskScore-asc" },
  { label: "Most orders", value: "totalOrders-desc" },
  { label: "Least orders", value: "totalOrders-asc" },
  { label: "Highest spend", value: "totalSpend-desc" },
  { label: "Lowest spend", value: "totalSpend-asc" },
  { label: "Highest RTO rate", value: "rtoRate-desc" },
  { label: "Highest return rate", value: "returnRate-desc" },
];

const STATUS_OPTIONS = [
  { label: "All customers", value: "all" },
  { label: "Blacklisted", value: "blacklisted" },
  { label: "Not blacklisted", value: "active" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { label: "All customer types", value: "all" },
  { label: "New", value: "new" },
  { label: "Repeat", value: "repeat" },
  { label: "VIP", value: "vip" },
  { label: "Risky", value: "risky" },
  { label: "Inactive", value: "inactive" },
];

const RISK_OPTIONS = [
  { label: "All risk levels", value: "all" },
  { label: "Low risk: 0–29", value: "low" },
  { label: "Medium risk: 30–59", value: "medium" },
  { label: "High risk: 60–100", value: "high" },
];

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clean = (value) => String(value ?? "").trim();

const normalizeSearch = (value) => clean(value).toLowerCase();

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numberValue(value));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getInitials = (name, email) => {
  const source = clean(name) || clean(email) || "Customer";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getRiskDetails = (score) => {
  const riskScore = numberValue(score);

  if (riskScore >= 60) {
    return {
      label: "High",
      className: "border-red-200 bg-red-50 text-red-700",
      dotClassName: "bg-red-500",
    };
  }

  if (riskScore >= 30) {
    return {
      label: "Medium",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      dotClassName: "bg-amber-500",
    };
  }

  return {
    label: "Low",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  };
};

const getCustomerTypeClass = (type) => {
  const normalized = clean(type).toLowerCase();

  const classes = {
    new: "border-blue-200 bg-blue-50 text-blue-700",
    repeat: "border-violet-200 bg-violet-50 text-violet-700",
    vip: "border-amber-200 bg-amber-50 text-amber-700",
    risky: "border-red-200 bg-red-50 text-red-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return classes[normalized] || classes.new;
};

function StatCard({ title, value, description, icon: Icon, danger = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger ? "text-red-600" : "text-slate-950"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-600"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onReset }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Users className="h-7 w-7 text-slate-500" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        No customers found
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasFilters
          ? "No customers match your current search and filter selection."
          : "Customer records will appear here once they are available."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset filters
        </button>
      )}
    </div>
  );
}

function ConfirmationModal({
  customer,
  loading,
  onClose,
  onConfirm,
}) {
  if (!customer) return null;

  const willBlacklist = !customer.isBlacklisted;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close confirmation"
        onClick={loading ? undefined : onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            willBlacklist
              ? "bg-red-100 text-red-600"
              : "bg-emerald-100 text-emerald-600"
          }`}
        >
          {willBlacklist ? (
            <Ban className="h-6 w-6" />
          ) : (
            <UserCheck className="h-6 w-6" />
          )}
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-950">
          {willBlacklist ? "Blacklist customer?" : "Remove from blacklist?"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {willBlacklist ? (
            <>
              You are about to blacklist{" "}
              <span className="font-semibold text-slate-900">
                {customer.name || customer.email || "this customer"}
              </span>
              . Their future orders should be restricted by your storefront or
              checkout validation.
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-900">
                {customer.name || customer.email || "This customer"}
              </span>{" "}
              will be allowed to place orders again.
            </>
          )}
        </p>

        {willBlacklist && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <p className="text-xs leading-5 text-amber-800">
              This page only updates the customer blacklist status. Your
              order-creation and checkout APIs must separately reject customers
              whose <code>isBlacklisted</code> value is true.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              willBlacklist
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : willBlacklist ? (
              <Ban className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}

            {loading
              ? "Updating..."
              : willBlacklist
                ? "Blacklist customer"
                : "Allow customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerBlacklistPage() {
  const customers = useCustomerStore((state) => state.customers);
  const loadingList = useCustomerStore((state) => state.loadingList);
  const saving = useCustomerStore((state) => state.saving);
  const error = useCustomerStore((state) => state.error);

  const fetchAllCustomersForDashboard = useCustomerStore(
    (state) => state.fetchAllCustomersForDashboard,
  );

  const toggleCustomerBlacklist = useCustomerStore(
    (state) => state.toggleCustomerBlacklist,
  );

  const clearError = useCustomerStore((state) => state.clearError);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [customerType, setCustomerType] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [sortValue, setSortValue] = useState("createdAt-desc");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [updatingCustomerId, setUpdatingCustomerId] = useState("");

  const loadCustomers = async () => {
    clearError?.();

    const result = await fetchAllCustomersForDashboard({
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    if (result?.success === false) {
      toast.error(result?.error || "Failed to load customers");
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [status, customerType, riskLevel, sortValue, pageSize]);

  const stats = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];

    const blacklisted = list.filter(
      (customer) => customer?.isBlacklisted === true,
    ).length;

    const risky = list.filter(
      (customer) =>
        customer?.analytics?.customerType === "risky" ||
        numberValue(customer?.analytics?.riskScore) >= 60,
    ).length;

    const totalOrders = list.reduce(
      (sum, customer) =>
        sum + numberValue(customer?.analytics?.totalOrders),
      0,
    );

    return {
      total: list.length,
      blacklisted,
      allowed: Math.max(0, list.length - blacklisted),
      risky,
      totalOrders,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeSearch(debouncedSearch);
    const [sortBy, sortOrder] = sortValue.split("-");

    const list = (Array.isArray(customers) ? customers : []).filter(
      (customer) => {
        const analytics = customer?.analytics || {};
        const riskScore = numberValue(analytics?.riskScore);

        const searchableText = [
          customer?.name,
          customer?.email,
          customer?.phone,
          customer?.customerId,
          customer?.firebaseUID,
          customer?.referralCode,
          customer?.city,
          customer?.state,
          analytics?.customerType,
        ]
          .map(normalizeSearch)
          .join(" ");

        const matchesSearch =
          !normalizedQuery || searchableText.includes(normalizedQuery);

        const matchesStatus =
          status === "all" ||
          (status === "blacklisted" &&
            customer?.isBlacklisted === true) ||
          (status === "active" && customer?.isBlacklisted !== true);

        const matchesCustomerType =
          customerType === "all" ||
          clean(analytics?.customerType).toLowerCase() === customerType;

        const matchesRisk =
          riskLevel === "all" ||
          (riskLevel === "low" && riskScore < 30) ||
          (riskLevel === "medium" &&
            riskScore >= 30 &&
            riskScore < 60) ||
          (riskLevel === "high" && riskScore >= 60);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCustomerType &&
          matchesRisk
        );
      },
    );

    return list.sort((a, b) => {
      const aAnalytics = a?.analytics || {};
      const bAnalytics = b?.analytics || {};

      let firstValue;
      let secondValue;

      switch (sortBy) {
        case "name":
          firstValue = clean(a?.name || a?.email).toLowerCase();
          secondValue = clean(b?.name || b?.email).toLowerCase();
          break;

        case "riskScore":
          firstValue = numberValue(aAnalytics?.riskScore);
          secondValue = numberValue(bAnalytics?.riskScore);
          break;

        case "totalOrders":
          firstValue = numberValue(aAnalytics?.totalOrders);
          secondValue = numberValue(bAnalytics?.totalOrders);
          break;

        case "totalSpend":
          firstValue = numberValue(aAnalytics?.totalSpend);
          secondValue = numberValue(bAnalytics?.totalSpend);
          break;

        case "rtoRate":
          firstValue = numberValue(aAnalytics?.rtoRate);
          secondValue = numberValue(bAnalytics?.rtoRate);
          break;

        case "returnRate":
          firstValue = numberValue(aAnalytics?.returnRate);
          secondValue = numberValue(bAnalytics?.returnRate);
          break;

        case "createdAt":
        default:
          firstValue = a?.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;
          secondValue = b?.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;
          break;
      }

      if (typeof firstValue === "string") {
        return sortOrder === "asc"
          ? firstValue.localeCompare(secondValue)
          : secondValue.localeCompare(firstValue);
      }

      return sortOrder === "asc"
        ? firstValue - secondValue
        : secondValue - firstValue;
    });
  }, [
    customers,
    debouncedSearch,
    status,
    customerType,
    riskLevel,
    sortValue,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / pageSize),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safeCurrentPage, pageSize]);

  const firstVisibleItem =
    filteredCustomers.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;

  const lastVisibleItem = Math.min(
    safeCurrentPage * pageSize,
    filteredCustomers.length,
  );

  const hasFilters =
    Boolean(search) ||
    status !== "all" ||
    customerType !== "all" ||
    riskLevel !== "all" ||
    sortValue !== "createdAt-desc";

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setCustomerType("all");
    setRiskLevel("all");
    setSortValue("createdAt-desc");
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const openConfirmation = (customer) => {
    if (!customer?._id || saving) return;
    setSelectedCustomer(customer);
  };

  const handleToggleBlacklist = async () => {
    if (!selectedCustomer?._id || updatingCustomerId) return;

    const nextStatus = !selectedCustomer.isBlacklisted;

    setUpdatingCustomerId(selectedCustomer._id);

    try {
      const result = await toggleCustomerBlacklist(
        selectedCustomer._id,
        nextStatus,
      );

      if (!result?.success) {
        throw new Error(
          result?.error || "Failed to update blacklist status",
        );
      }

      toast.success(
        nextStatus
          ? "Customer blacklisted successfully"
          : "Customer removed from blacklist",
      );

      setSelectedCustomer(null);
    } catch (updateError) {
      toast.error(
        updateError?.message || "Failed to update customer",
      );
    } finally {
      setUpdatingCustomerId("");
    }
  };

  return (
    <>
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
          {/* Header */}
          <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    Customer Blacklist
                  </h1>

                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Restricted customers
                  </span>
                </div>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Review customer behaviour, identify risky accounts and
                  restrict or restore ordering access.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadCustomers}
              disabled={loadingList}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  loadingList ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </section>

          {/* Stats */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Total customers"
              value={stats.total}
              description="All customer accounts"
              icon={Users}
            />

            <StatCard
              title="Blacklisted"
              value={stats.blacklisted}
              description="Currently restricted"
              icon={Ban}
              danger
            />

            <StatCard
              title="Allowed"
              value={stats.allowed}
              description="Can place orders"
              icon={UserCheck}
            />

            <StatCard
              title="High risk"
              value={stats.risky}
              description="Risky or score 60+"
              icon={ShieldAlert}
              danger={stats.risky > 0}
            />

            <StatCard
              title="Total orders"
              value={stats.totalOrders}
              description="Across all customers"
              icon={ShoppingBag}
            />
          </section>

          {/* Search and filters */}
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone, customer ID, city..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMobileFilters((current) => !current)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 xl:hidden"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <div
                className={`grid gap-3 sm:grid-cols-2 xl:flex ${
                  showMobileFilters ? "grid" : "hidden xl:flex"
                }`}
              >
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-11 min-w-44 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-900"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={customerType}
                  onChange={(event) =>
                    setCustomerType(event.target.value)
                  }
                  className="h-11 min-w-44 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-900"
                >
                  {CUSTOMER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={riskLevel}
                  onChange={(event) =>
                    setRiskLevel(event.target.value)
                  }
                  className="h-11 min-w-44 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-900"
                >
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  {sortValue.endsWith("-asc") ? (
                    <ArrowUpAZ className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  ) : (
                    <ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  )}

                  <select
                    value={sortValue}
                    onChange={(event) =>
                      setSortValue(event.target.value)
                    }
                    className="h-11 min-w-52 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-900"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">Unable to load customers</p>
                <p className="mt-0.5 break-words text-xs">{error}</p>
              </div>

              <button
                type="button"
                onClick={clearError}
                className="rounded-lg p-1 transition hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </button>
            </section>
          )}

          {/* Customer table */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Customer records
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {filteredCustomers.length} matching customers
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                Rows
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value))
                  }
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-900"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadingList && customers.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
                <p className="mt-3 text-sm text-slate-500">
                  Loading customers...
                </p>
              </div>
            ) : paginatedCustomers.length === 0 ? (
              <EmptyState
                hasFilters={hasFilters}
                onReset={resetFilters}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-[1250px] w-full">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Customer
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Location
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Type
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Orders
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Spend
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          RTO / Return
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Risk
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Joined
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedCustomers.map((customer) => {
                        const analytics = customer?.analytics || {};
                        const risk = getRiskDetails(
                          analytics?.riskScore,
                        );

                        const isUpdating =
                          updatingCustomerId === customer?._id;

                        return (
                          <tr
                            key={customer?._id}
                            className={`transition hover:bg-slate-50/80 ${
                              customer?.isBlacklisted
                                ? "bg-red-50/30"
                                : "bg-white"
                            }`}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    customer?.isBlacklisted
                                      ? "bg-red-100 text-red-700"
                                      : "bg-slate-900 text-white"
                                  }`}
                                >
                                  {getInitials(
                                    customer?.name,
                                    customer?.email,
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="max-w-52 truncate text-sm font-semibold text-slate-900">
                                      {customer?.name ||
                                        "Unnamed customer"}
                                    </p>

                                    {customer?.customerId && (
                                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
                                        #{customer.customerId}
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-0.5 max-w-64 truncate text-xs text-slate-500">
                                    {customer?.email || "No email"}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    {customer?.phone || "No phone"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <p className="max-w-40 truncate text-sm font-medium text-slate-700">
                                {customer?.city ||
                                  customer?.state ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 max-w-40 truncate text-xs text-slate-400">
                                {[customer?.state, customer?.country]
                                  .filter(Boolean)
                                  .join(", ") || "No location"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getCustomerTypeClass(
                                  analytics?.customerType,
                                )}`}
                              >
                                {analytics?.customerType || "new"}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm font-bold text-slate-900">
                                {numberValue(analytics?.totalOrders)}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {numberValue(
                                  analytics?.deliveredOrders,
                                )}{" "}
                                delivered
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(
                                  analytics?.totalSpend,
                                )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                AOV{" "}
                                {formatCurrency(
                                  analytics?.avgOrderValue,
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <p className="text-xs text-slate-600">
                                  RTO{" "}
                                  <span className="font-semibold text-slate-900">
                                    {numberValue(
                                      analytics?.rtoRate,
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </p>

                                <p className="text-xs text-slate-600">
                                  Return{" "}
                                  <span className="font-semibold text-slate-900">
                                    {numberValue(
                                      analytics?.returnRate,
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div
                                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${risk.className}`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${risk.dotClassName}`}
                                />

                                <span className="text-xs font-semibold">
                                  {risk.label} ·{" "}
                                  {numberValue(
                                    analytics?.riskScore,
                                  ).toFixed(0)}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm text-slate-700">
                                {formatDate(
                                  customer?.joinedAt ||
                                    customer?.createdAt,
                                )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Last order{" "}
                                {formatDate(
                                  analytics?.lastOrderAt,
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              {customer?.isBlacklisted ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  <Ban className="h-3.5 w-3.5" />
                                  Blacklisted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Allowed
                                </span>
                              )}
                            </td>

                            <td className="sticky right-0 bg-inherit px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  openConfirmation(customer)
                                }
                                disabled={isUpdating || saving}
                                className={`inline-flex h-9 min-w-32 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  customer?.isBlacklisted
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                }`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : customer?.isBlacklisted ? (
                                  <UserCheck className="h-4 w-4" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}

                                {customer?.isBlacklisted
                                  ? "Allow orders"
                                  : "Blacklist"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {firstVisibleItem}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-700">
                      {lastVisibleItem}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredCustomers.length}
                    </span>{" "}
                    customers
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.max(1, page - 1),
                        )
                      }
                      disabled={safeCurrentPage <= 1}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <span className="flex h-9 min-w-24 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700">
                      {safeCurrentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1),
                        )
                      }
                      disabled={safeCurrentPage >= totalPages}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Blacklist enforcement
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Ensure order creation, guest checkout, COD confirmation and
                payment-order creation all verify that the matched customer is
                not blacklisted.
              </p>
            </div>
          </section>
        </div>
      </main>

      <ConfirmationModal
        customer={selectedCustomer}
        loading={Boolean(updatingCustomerId)}
        onClose={() => {
          if (!updatingCustomerId) {
            setSelectedCustomer(null);
          }
        }}
        onConfirm={handleToggleBlacklist}
      />
    </>
  );
}