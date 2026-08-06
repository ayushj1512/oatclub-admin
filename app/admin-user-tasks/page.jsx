"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowDownAZ,
  ArrowUpAZ,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  ListFilter,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import useAdminUserTaskStore from "@/store/adminUserTaskStore";
import { useAdminUsersVerifyStore } from "@/store/adminUsersStore";

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "rework", label: "Rework" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const SCOPE_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "assigned-to-me", label: "Assigned To Me" },
  { value: "created-by-me", label: "Created By Me" },
  { value: "open", label: "Open Tasks" },
  { value: "submitted", label: "Submitted" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Created date" },
  { value: "updatedAt", label: "Last updated" },
  { value: "deadline", label: "Deadline" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "heading", label: "Task heading" },
];

const LIMIT_OPTIONS = [10, 20, 30, 50, 100];

const STATUS_STYLES = {
  assigned: {
    label: "Assigned",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  submitted: {
    label: "Submitted",
    className: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  rework: {
    label: "Rework",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  closed: {
    label: "Closed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

const PRIORITY_STYLES = {
  low: {
    label: "Low",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  medium: {
    label: "Medium",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  high: {
    label: "High",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  urgent: {
    label: "Urgent",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

/* ============================================================
   HELPERS
============================================================ */

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getUserName = (user) => {
  if (!user) return "Unknown user";

  return (
    user.fullName ||
    user.username ||
    user.email ||
    "Unknown user"
  );
};

const getAdminFilterName = (adminUsers = [], adminId) => {
  const admin = adminUsers.find(
    (item) => String(item?._id) === String(adminId),
  );

  return admin ? getUserName(admin) : "Selected user";
};

const getInitials = (user) => {
  const name = getUserName(user);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const formatDate = (value, options = {}) => {
  if (!value) return "No deadline";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDeadlineMeta = (task) => {
  if (!task?.deadline) {
    return {
      label: "No deadline",
      className: "text-gray-500",
      iconClassName: "text-gray-400",
    };
  }

  if (task.isOverdue) {
    return {
      label: `Overdue · ${formatDate(task.deadline)}`,
      className: "font-semibold text-red-600",
      iconClassName: "text-red-500",
    };
  }

  const deadline = new Date(task.deadline);
  const now = new Date();
  const difference = deadline.getTime() - now.getTime();
  const days = Math.ceil(difference / 86_400_000);

  if (
    days >= 0 &&
    days <= 2 &&
    !["closed", "cancelled"].includes(task.status)
  ) {
    return {
      label:
        days === 0
          ? "Due today"
          : days === 1
            ? "Due tomorrow"
            : `Due in ${days} days`,
      className: "font-semibold text-amber-700",
      iconClassName: "text-amber-500",
    };
  }

  return {
    label: formatDate(task.deadline),
    className: "text-gray-700",
    iconClassName: "text-gray-400",
  };
};

const buildPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 1) return [1];

  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function StatusBadge({ status }) {
  const config =
    STATUS_STYLES[status] || STATUS_STYLES.assigned;

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold",
        config.className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", config.dot)}
      />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const config =
    PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold",
        config.className,
      )}
    >
      {priority === "urgent" && (
        <Zap className="mr-1 h-3 w-3" />
      )}

      {config.label}
    </span>
  );
}

function UserCell({ user, compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100",
          compact ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        {user?.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.profileImage}
            alt={getUserName(user)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-gray-600">
            {getInitials(user)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-gray-900">
          {getUserName(user)}
        </p>

        {!compact && (
          <p className="truncate text-[10px] text-gray-500">
            {user?.role || user?.email || "Admin user"}
          </p>
        )}
      </div>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  children,
  className = "",
  ariaLabel,
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none transition hover:border-gray-300 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10"
      >
        {children}
      </select>

      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  description,
  active,
  onClick,
  tone = "neutral",
  loading,
}) {
  const toneClasses = {
    neutral: "bg-gray-950 text-white",
    blue: "bg-blue-600 text-white",
    amber: "bg-amber-500 text-white",
    violet: "bg-violet-600 text-white",
    red: "bg-red-600 text-white",
    green: "bg-emerald-600 text-white",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group min-w-0 rounded-xl border bg-white p-3.5 text-left shadow-sm transition",
        active
          ? "border-gray-950 ring-2 ring-gray-950/10"
          : "border-gray-200 hover:border-gray-300 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
            {label}
          </p>

          {loading ? (
            <div className="mt-2 h-7 w-14 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="mt-1 text-2xl font-black tracking-tight text-gray-950">
              {Number(value || 0).toLocaleString("en-IN")}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
            toneClasses[tone] || toneClasses.neutral,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-2 truncate text-[11px] text-gray-500">
        {description}
      </p>
    </button>
  );
}

function TaskSkeletonRow() {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </td>

      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
      </td>

      <td className="px-4 py-3">
        <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
      </td>

      <td className="px-4 py-3">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
      </td>

      <td className="px-4 py-3">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
      </td>

      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </td>

      <td className="px-4 py-3">
        <div className="ml-auto h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
      </td>
    </tr>
  );
}

function MobileTaskSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div className="mt-4 flex gap-2">
        <div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
        <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

/* ============================================================
   ACTION MENU
============================================================ */

function TaskActionMenu({
  task,
  onView,
  onArchive,
  actionLoading,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeMenu = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950"
        aria-label={`Actions for ${task.heading}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onView(task);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
          >
            <Eye className="h-3.5 w-3.5" />
            View task
          </button>

          <div className="my-1 h-px bg-gray-100" />

          <button
            type="button"
            disabled={actionLoading}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onArchive(task);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {task.isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}

            {task.isArchived ? "Restore task" : "Archive task"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ filtered, onReset, onCreate }) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        {filtered ? (
          <ListFilter className="h-6 w-6 text-gray-500" />
        ) : (
          <BriefcaseBusiness className="h-6 w-6 text-gray-500" />
        )}
      </div>

      <h3 className="mt-4 text-base font-black text-gray-950">
        {filtered ? "No matching tasks found" : "No tasks created yet"}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
        {filtered
          ? "Change or clear the selected filters to see more tasks."
          : "Create your first internal task and assign it to an admin user."}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {filtered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3.5 text-xs font-bold text-white transition hover:bg-black"
        >
          <Plus className="h-3.5 w-3.5" />
          Create task
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function AdminUserTasksPage() {
  const router = useRouter();

  const {
    tasks,
    summary,
    filters,
    total,
    page,
    limit,
    totalPages,
    loading,
    summaryLoading,
    actionLoading,
    error,
    actionError,

    setFilters,
    resetFilters,
    fetchTasks,
    fetchSummary,
    setPage,
    setLimit,
    archiveTask,
    clearError,
  } = useAdminUserTaskStore();

  const {
    users: adminUsers,
    loading: adminUsersLoading,
    fetchUsers,
    clearError: clearAdminUsersError,
  } = useAdminUsersVerifyStore();

  const [searchInput, setSearchInput] = useState(
    filters.search || "",
  );

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  const initialLoadRef = useRef(false);
  const searchTimerRef = useRef(null);

  /* ============================================================
     INITIAL FETCH
  ============================================================ */

  useEffect(() => {
    if (initialLoadRef.current) return;

    initialLoadRef.current = true;

    Promise.allSettled([
      fetchTasks(),
      fetchSummary(),
      fetchUsers({
        limit: 100,
        isActive: true,
      }),
    ]);
  }, [
    fetchTasks,
    fetchSummary,
    fetchUsers,
  ]);

  /* ============================================================
     SEARCH DEBOUNCE
  ============================================================ */

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      const normalizedSearch = searchInput.trim();

      if (normalizedSearch === (filters.search || "")) return;

      setFilters({
        search: normalizedSearch,
        page: 1,
      });

      fetchTasks({
        search: normalizedSearch,
        page: 1,
      }).catch(() => { });
    }, 450);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [
    searchInput,
    filters.search,
    setFilters,
    fetchTasks,
  ]);

  /* ============================================================
     DERIVED VALUES
  ============================================================ */

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search) count += 1;
    if (filters.status) count += 1;
    if (filters.priority) count += 1;
    if (filters.assignedTo) count += 1;
    if (filters.assignedBy) count += 1;
    if (filters.scope && filters.scope !== "all") count += 1;
    if (filters.deadlineFrom) count += 1;
    if (filters.deadlineTo) count += 1;
    if (filters.overdue) count += 1;
    if (filters.isArchived) count += 1;

    return count;
  }, [filters]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(page, totalPages),
    [page, totalPages],
  );

  const showingFrom =
    total === 0 ? 0 : (page - 1) * limit + 1;

  const showingTo = Math.min(page * limit, total);

  const openTaskCount =
    Number(summary?.status?.assigned || 0) +
    Number(summary?.status?.in_progress || 0) +
    Number(summary?.status?.submitted || 0) +
    Number(summary?.status?.rework || 0);

  /* ============================================================
     FILTER ACTIONS
  ============================================================ */

  const applyFilter = useCallback(
    (key, value) => {
      setFilters({
        [key]: value,
        page: 1,
      });

      fetchTasks({
        [key]: value,
        page: 1,
      }).catch(() => { });
    },
    [fetchTasks, setFilters],
  );

  const applyScope = useCallback(
    (scope) => {
      setFilters({
        scope,
        status: "",
        overdue: false,
        page: 1,
      });

      fetchTasks({
        scope,
        status: "",
        overdue: false,
        page: 1,
      }).catch(() => { });
    },
    [fetchTasks, setFilters],
  );

  const resetAllFilters = useCallback(() => {
    setSearchInput("");
    resetFilters();

    fetchTasks({
      search: "",
      status: "",
      priority: "",
      assignedTo: "",
      assignedBy: "",
      scope: "all",
      deadlineFrom: "",
      deadlineTo: "",
      overdue: false,
      isArchived: false,
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    }).catch(() => { });
  }, [fetchTasks, resetFilters]);
  const refreshPage = useCallback(() => {
    clearError();
    clearAdminUsersError();

    Promise.allSettled([
      fetchTasks(),
      fetchSummary(),
      fetchUsers({
        limit: 100,
        isActive: true,
      }),
    ]);
  }, [
    clearError,
    clearAdminUsersError,
    fetchTasks,
    fetchSummary,
    fetchUsers,
  ]);

  const handleArchive = useCallback(
    async (task) => {
      try {
        await archiveTask(task._id, !task.isArchived);
      } catch {
        // Error is already stored inside Zustand.
      }
    },
    [archiveTask],
  );

  const changeSortOrder = useCallback(() => {
    const nextOrder =
      filters.sortOrder === "asc" ? "desc" : "asc";

    applyFilter("sortOrder", nextOrder);
  }, [applyFilter, filters.sortOrder]);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-950">
      <div className="w-full space-y-4 p-3 sm:p-4 lg:p-5">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-white">
                  <BriefcaseBusiness className="h-4 w-4" />
                </div>

                <div>
                  <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                    Admin User Tasks
                  </h1>

                  <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                    Assign, monitor, submit and review internal
                    work across the admin team.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshPage}
                disabled={loading || summaryLoading}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  className={cn(
                    "h-3.5 w-3.5",
                    (loading || summaryLoading) &&
                    "animate-spin",
                  )}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/admin-user-tasks/create")
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-black"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Task
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================
            ERRORS
        ====================================================== */}

        {(error || actionError) && (
          <section className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

              <div className="min-w-0">
                <p className="text-xs font-black text-red-800">
                  Unable to complete request
                </p>

                <p className="mt-0.5 break-words text-xs text-red-700">
                  {actionError || error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearError}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        {/* ======================================================
            SUMMARY CARDS
        ====================================================== */}

        <section className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard
            label="Open Tasks"
            value={openTaskCount}
            description="All active workflow stages"
            icon={CircleDashed}
            tone="neutral"
            loading={summaryLoading}
            active={filters.scope === "open"}
            onClick={() => applyScope("open")}
          />

          <SummaryCard
            label="Assigned To Me"
            value={summary?.assignedToMeCount}
            description="Your pending work"
            icon={UserCheck}
            tone="blue"
            loading={summaryLoading}
            active={filters.scope === "assigned-to-me"}
            onClick={() => applyScope("assigned-to-me")}
          />

          <SummaryCard
            label="Created By Me"
            value={summary?.createdByMeCount}
            description="Tasks you are managing"
            icon={UserRound}
            tone="violet"
            loading={summaryLoading}
            active={filters.scope === "created-by-me"}
            onClick={() => applyScope("created-by-me")}
          />

          <SummaryCard
            label="For Review"
            value={summary?.submittedForReviewCount}
            description="Submitted to you"
            icon={FileCheck2}
            tone="amber"
            loading={summaryLoading}
            active={filters.scope === "submitted"}
            onClick={() => applyScope("submitted")}
          />

          <SummaryCard
            label="Overdue"
            value={summary?.overdueCount}
            description="Deadline has passed"
            icon={CalendarClock}
            tone="red"
            loading={summaryLoading}
            active={Boolean(filters.overdue)}
            onClick={() => {
              const nextValue = !filters.overdue;

              setFilters({
                overdue: nextValue,
                scope: "all",
                page: 1,
              });

              fetchTasks({
                overdue: nextValue,
                scope: "all",
                page: 1,
              }).catch(() => { });
            }}
          />

          <SummaryCard
            label="Closed"
            value={summary?.status?.closed}
            description="Successfully completed"
            icon={CheckCircle2}
            tone="green"
            loading={summaryLoading}
            active={filters.scope === "closed"}
            onClick={() => applyScope("closed")}
          />
        </section>

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <section className="sticky top-0 z-20 rounded-2xl border border-gray-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search task number, heading, brief or tag..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-10 text-xs font-medium text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-950/10"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <SelectField
                  value={filters.scope || "all"}
                  onChange={(event) =>
                    applyScope(event.target.value)
                  }
                  className="w-40"
                  ariaLabel="Filter task scope"
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  value={filters.status || ""}
                  onChange={(event) =>
                    applyFilter("status", event.target.value)
                  }
                  className="w-36"
                  ariaLabel="Filter task status"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  value={filters.priority || ""}
                  onChange={(event) =>
                    applyFilter(
                      "priority",
                      event.target.value,
                    )
                  }
                  className="w-36"
                  ariaLabel="Filter task priority"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <button
                  type="button"
                  onClick={() =>
                    setMobileFiltersOpen((current) => !current)
                  }
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition",
                    mobileFiltersOpen
                      ? "border-gray-950 bg-gray-950 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  More
                  {activeFilterCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]",
                        mobileFiltersOpen
                          ? "bg-white text-gray-950"
                          : "bg-gray-950 text-white",
                      )}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen((current) => !current)
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 lg:hidden"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters

                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-950 px-1 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {mobileFiltersOpen && (
              <div className="grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                <SelectField
                  value={filters.scope || "all"}
                  onChange={(event) =>
                    applyScope(event.target.value)
                  }
                  className="lg:hidden"
                  ariaLabel="Filter task scope"
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  value={filters.status || ""}
                  onChange={(event) =>
                    applyFilter("status", event.target.value)
                  }
                  className="lg:hidden"
                  ariaLabel="Filter task status"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  value={filters.priority || ""}
                  onChange={(event) =>
                    applyFilter(
                      "priority",
                      event.target.value,
                    )
                  }
                  className="lg:hidden"
                  ariaLabel="Filter task priority"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Assigned To
                  </label>

                  <SelectField
                    value={filters.assignedTo || ""}
                    onChange={(event) =>
                      applyFilter("assignedTo", event.target.value)
                    }
                    ariaLabel="Filter assigned user"
                  >
                    <option value="">
                      {adminUsersLoading
                        ? "Loading users..."
                        : "All assignees"}
                    </option>

                    {adminUsers.map((admin) => (
                      <option key={admin._id} value={admin._id}>
                        {getUserName(admin)}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Created By
                  </label>

                  <SelectField
                    value={filters.assignedBy || ""}
                    onChange={(event) =>
                      applyFilter("assignedBy", event.target.value)
                    }
                    ariaLabel="Filter task creator"
                  >
                    <option value="">
                      {adminUsersLoading
                        ? "Loading users..."
                        : "All creators"}
                    </option>

                    {adminUsers.map((admin) => (
                      <option key={admin._id} value={admin._id}>
                        {getUserName(admin)}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Deadline From
                  </label>

                  <input
                    type="date"
                    value={filters.deadlineFrom || ""}
                    onChange={(event) =>
                      applyFilter(
                        "deadlineFrom",
                        event.target.value,
                      )
                    }
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Deadline To
                  </label>

                  <input
                    type="date"
                    value={filters.deadlineTo || ""}
                    onChange={(event) =>
                      applyFilter(
                        "deadlineTo",
                        event.target.value,
                      )
                    }
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Sort By
                  </label>

                  <div className="flex gap-1.5">
                    <SelectField
                      value={filters.sortBy || "createdAt"}
                      onChange={(event) =>
                        applyFilter(
                          "sortBy",
                          event.target.value,
                        )
                      }
                      className="min-w-0 flex-1"
                      ariaLabel="Sort tasks"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </SelectField>

                    <button
                      type="button"
                      onClick={changeSortOrder}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                      aria-label="Change sort order"
                    >
                      {filters.sortOrder === "asc" ? (
                        <ArrowUpAZ className="h-4 w-4" />
                      ) : (
                        <ArrowDownAZ className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Visibility
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      applyFilter(
                        "isArchived",
                        !filters.isArchived,
                      )
                    }
                    className={cn(
                      "flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition",
                      filters.isArchived
                        ? "border-gray-950 bg-gray-950 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                    )}
                  >
                    {filters.isArchived ? (
                      <Archive className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}

                    {filters.isArchived
                      ? "Archived Tasks"
                      : "Active Tasks"}
                  </button>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    disabled={activeFilterCount === 0}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset filters
                  </button>
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2.5">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Active
                </span>

                {filters.scope &&
                  filters.scope !== "all" && (
                    <FilterChip
                      label={
                        SCOPE_OPTIONS.find(
                          (item) =>
                            item.value === filters.scope,
                        )?.label || filters.scope
                      }
                      onRemove={() => applyScope("all")}
                    />
                  )}

                {filters.status && (
                  <FilterChip
                    label={
                      STATUS_STYLES[filters.status]?.label ||
                      filters.status
                    }
                    onRemove={() =>
                      applyFilter("status", "")
                    }
                  />
                )}

                {filters.priority && (
                  <FilterChip
                    label={`Priority: ${PRIORITY_STYLES[filters.priority]?.label ||
                      filters.priority
                      }`}
                    onRemove={() =>
                      applyFilter("priority", "")
                    }
                  />
                )}

                {filters.assignedTo && (
                  <FilterChip
                    label={`Assigned To: ${getAdminFilterName(
                      adminUsers,
                      filters.assignedTo,
                    )}`}
                    onRemove={() =>
                      applyFilter("assignedTo", "")
                    }
                  />
                )}

                {filters.assignedBy && (
                  <FilterChip
                    label={`Created By: ${getAdminFilterName(
                      adminUsers,
                      filters.assignedBy,
                    )}`}
                    onRemove={() =>
                      applyFilter("assignedBy", "")
                    }
                  />
                )}

                {filters.overdue && (
                  <FilterChip
                    label="Overdue"
                    onRemove={() =>
                      applyFilter("overdue", false)
                    }
                  />
                )}

                {filters.isArchived && (
                  <FilterChip
                    label="Archived"
                    onRemove={() =>
                      applyFilter("isArchived", false)
                    }
                  />
                )}

                {filters.deadlineFrom && (
                  <FilterChip
                    label={`From ${formatDate(
                      filters.deadlineFrom,
                    )}`}
                    onRemove={() =>
                      applyFilter("deadlineFrom", "")
                    }
                  />
                )}

                {filters.deadlineTo && (
                  <FilterChip
                    label={`To ${formatDate(
                      filters.deadlineTo,
                    )}`}
                    onRemove={() =>
                      applyFilter("deadlineTo", "")
                    }
                  />
                )}

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="ml-1 text-[11px] font-bold text-gray-500 underline-offset-2 hover:text-gray-950 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            TASK LIST
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-950">
                {filters.isArchived
                  ? "Archived Tasks"
                  : "Task Directory"}
              </h2>

              <p className="mt-0.5 text-[11px] text-gray-500">
                {loading
                  ? "Loading tasks..."
                  : `${total.toLocaleString(
                    "en-IN",
                  )} task${total === 1 ? "" : "s"} found`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {loading && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Updating
                </div>
              )}

              <SelectField
                value={String(limit)}
                onChange={(event) =>
                  setLimit(Number(event.target.value)).catch(
                    () => { },
                  )
                }
                className="w-24"
                ariaLabel="Tasks per page"
              >
                {LIMIT_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {/* Desktop Table */}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <TableHead className="w-[145px]">
                    Task Number
                  </TableHead>

                  <TableHead className="min-w-[300px]">
                    Task
                  </TableHead>

                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Deadline</TableHead>

                  <TableHead className="w-[65px] text-right">
                    Action
                  </TableHead>
                </tr>
              </thead>

              <tbody>
                {loading && tasks.length === 0 ? (
                  Array.from({ length: 7 }).map((_, index) => (
                    <TaskSkeletonRow key={index} />
                  ))
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        filtered={activeFilterCount > 0}
                        onReset={resetAllFilters}
                        onCreate={() =>
                          router.push(
                            "/admin-user-tasks/create",
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const deadlineMeta =
                      getDeadlineMeta(task);

                    return (
                      <tr
                        key={task._id}
                        onClick={() =>
                          router.push(
                            `/admin-user-tasks/${task._id}`,
                          )
                        }
                        className="group cursor-pointer border-b border-gray-100 transition last:border-0 hover:bg-gray-50/80"
                      >
                        <td className="px-4 py-3 align-middle">
                          <p className="whitespace-nowrap font-mono text-[11px] font-bold text-gray-700">
                            {task.taskNumber || "—"}
                          </p>

                          <p className="mt-1 whitespace-nowrap text-[10px] text-gray-400">
                            {formatDateTime(task.createdAt)}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="max-w-[420px]">
                            <div className="flex items-start gap-2">
                              {task.isOverdue && (
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                              )}

                              <div className="min-w-0">
                                <p className="line-clamp-1 text-xs font-black text-gray-950 group-hover:underline group-hover:underline-offset-2">
                                  {task.heading}
                                </p>

                                <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">
                                  {task.brief}
                                </p>
                              </div>
                            </div>

                            {!!task.tags?.length && (
                              <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
                                {task.tags
                                  .slice(0, 3)
                                  .map((tag) => (
                                    <span
                                      key={tag}
                                      className="max-w-24 truncate rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500"
                                    >
                                      #{tag}
                                    </span>
                                  ))}

                                {task.tags.length > 3 && (
                                  <span className="text-[9px] font-bold text-gray-400">
                                    +{task.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <StatusBadge status={task.status} />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <PriorityBadge
                            priority={task.priority}
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <UserCell
                            user={task.assignedTo}
                            compact
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <UserCell
                            user={task.assignedBy}
                            compact
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <Clock3
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                deadlineMeta.iconClassName,
                              )}
                            />

                            <div>
                              <p
                                className={cn(
                                  "whitespace-nowrap text-[11px]",
                                  deadlineMeta.className,
                                )}
                              >
                                {deadlineMeta.label}
                              </p>

                              {task.deadline &&
                                !task.isOverdue && (
                                  <p className="mt-0.5 text-[9px] text-gray-400">
                                    {formatDateTime(
                                      task.deadline,
                                    )}
                                  </p>
                                )}
                            </div>
                          </div>
                        </td>

                        <td
                          className="px-4 py-3 text-right align-middle"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <TaskActionMenu
                            task={task}
                            actionLoading={actionLoading}
                            onView={(selectedTask) =>
                              router.push(
                                `/admin-user-tasks/${selectedTask._id}`,
                              )
                            }
                            onArchive={handleArchive}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards */}

          <div className="space-y-2.5 bg-gray-50/50 p-3 lg:hidden">
            {loading && tasks.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <MobileTaskSkeleton key={index} />
              ))
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white">
                <EmptyState
                  filtered={activeFilterCount > 0}
                  onReset={resetAllFilters}
                  onCreate={() =>
                    router.push("/admin-user-tasks/create")
                  }
                />
              </div>
            ) : (
              tasks.map((task) => {
                const deadlineMeta = getDeadlineMeta(task);

                return (
                  <article
                    key={task._id}
                    onClick={() =>
                      router.push(
                        `/admin-user-tasks/${task._id}`,
                      )
                    }
                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition active:scale-[0.995]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-gray-500">
                            {task.taskNumber || "—"}
                          </span>

                          {task.isOverdue && (
                            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Overdue
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1.5 line-clamp-2 text-sm font-black leading-5 text-gray-950">
                          {task.heading}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">
                          {task.brief}
                        </p>
                      </div>

                      <div
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <TaskActionMenu
                          task={task}
                          actionLoading={actionLoading}
                          onView={(selectedTask) =>
                            router.push(
                              `/admin-user-tasks/${selectedTask._id}`,
                            )
                          }
                          onArchive={handleArchive}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <StatusBadge status={task.status} />

                      <PriorityBadge
                        priority={task.priority}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">
                          Assigned To
                        </p>

                        <UserCell
                          user={task.assignedTo}
                          compact
                        />
                      </div>

                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">
                          Created By
                        </p>

                        <UserCell
                          user={task.assignedBy}
                          compact
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Clock3
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            deadlineMeta.iconClassName,
                          )}
                        />

                        <span
                          className={cn(
                            "truncate text-[10px]",
                            deadlineMeta.className,
                          )}
                        >
                          {deadlineMeta.label}
                        </span>
                      </div>

                      <span className="shrink-0 text-[9px] text-gray-400">
                        Updated{" "}
                        {formatDate(task.updatedAt, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* ====================================================
              PAGINATION
          ==================================================== */}

          {total > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-gray-500">
                Showing{" "}
                <span className="font-bold text-gray-800">
                  {showingFrom}
                </span>{" "}
                to{" "}
                <span className="font-bold text-gray-800">
                  {showingTo}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-800">
                  {total.toLocaleString("en-IN")}
                </span>{" "}
                tasks
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    setPage(page - 1).catch(() => { })
                  }
                  className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    Previous
                  </span>
                </button>

                {pageNumbers.map((pageNumber, index) => {
                  const previousPage = pageNumbers[index - 1];
                  const showEllipsis =
                    previousPage &&
                    pageNumber - previousPage > 1;

                  return (
                    <div
                      key={pageNumber}
                      className="flex items-center gap-1"
                    >
                      {showEllipsis && (
                        <span className="flex h-8 w-6 items-center justify-center text-xs text-gray-400">
                          …
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          setPage(pageNumber).catch(() => { })
                        }
                        className={cn(
                          "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[11px] font-black transition",
                          pageNumber === page
                            ? "border-gray-950 bg-gray-950 text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                        )}
                      >
                        {pageNumber}
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  disabled={
                    page >= totalPages ||
                    totalPages === 0 ||
                    loading
                  }
                  onClick={() =>
                    setPage(page + 1).catch(() => { })
                  }
                  className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   LOCAL COMPONENTS
============================================================ */

function TableHead({ children, className = "" }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.08em] text-gray-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 pl-2.5 pr-1.5 text-[10px] font-bold text-gray-600">
      <span className="max-w-44 truncate">{label}</span>

      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
