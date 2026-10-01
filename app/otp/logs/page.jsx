"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import { useOtpStore } from "@/store/otpStore";

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const statusStyle = {
  pending: "bg-amber-50 text-amber-700",
  sent: "bg-blue-50 text-blue-700",
  verified: "bg-green-50 text-green-700",
  expired: "bg-zinc-100 text-zinc-600",
  failed: "bg-red-50 text-red-700",
  blocked: "bg-red-100 text-red-800",
  invalidated:
    "bg-purple-50 text-purple-700",
};

const channelStyle = {
  email: "bg-blue-50 text-blue-700",
  whatsapp:
    "bg-emerald-50 text-emerald-700",
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

const formatLabel = (value) =>
  String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[status] ||
        "bg-zinc-100 text-zinc-600"
        }`}
    >
      {status || "unknown"}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const isWhatsapp = channel === "whatsapp";
  const Icon = isWhatsapp
    ? MessageCircle
    : Mail;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${channelStyle[channel] ||
        "bg-zinc-100 text-zinc-600"
        }`}
    >
      <Icon size={13} />

      {isWhatsapp ? "WhatsApp" : "Email"}
    </span>
  );
}

function LogIdentifier({ log }) {
  return (
    <div className="min-w-0">
      <p className="break-all font-semibold text-zinc-900">
        {log.maskedIdentifier ||
          log.identifier ||
          "-"}
      </p>

      <p className="mt-1 break-all text-xs text-zinc-400">
        {log.referenceId || "-"}
      </p>
    </div>
  );
}

export default function OtpLogsPage() {
  const router = useRouter();

  const {
    logs,
    loading,
    pagination = DEFAULT_PAGINATION,
    fetchLogs,
    deleteLog,
  } = useOtpStore();

  const [deletingId, setDeletingId] =
    useState("");

  const [filters, setFilters] = useState({
    q: "",
    channel: "",
    purpose: "",
    status: "",
    sort: "-createdAt",
    page: 1,
    limit: 20,
  });

  const loadLogs = useCallback(async () => {
    try {
      const query = new URLSearchParams();

      Object.entries(filters).forEach(
        ([key, value]) => {
          if (
            value !== "" &&
            value !== null &&
            value !== undefined
          ) {
            query.set(key, String(value));
          }
        },
      );

      await fetchLogs(query.toString());
    } catch (error) {
      toast.error(
        error?.message ||
        "Failed to load OTP logs",
      );
    }
  }, [fetchLogs, filters]);

  useEffect(() => {
    const timer = window.setTimeout(
      loadLogs,
      filters.q ? 350 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [loadLogs, filters.q]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key !== "page"
        ? { page: 1 }
        : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({
      q: "",
      channel: "",
      purpose: "",
      status: "",
      sort: "-createdAt",
      page: 1,
      limit: 20,
    });
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this OTP log permanently?",
      )
    ) {
      return;
    }

    setDeletingId(id);

    try {
      await deleteLog(id);
      toast.success("OTP log deleted");
    } catch (error) {
      toast.error(
        error?.message ||
        "Failed to delete log",
      );
    } finally {
      setDeletingId("");
    }
  };

  const currentPage =
    Number(pagination.page) ||
    Number(filters.page) ||
    1;

  const totalPages = Math.max(
    1,
    Number(pagination.totalPages) || 1,
  );

  const hasPreviousPage =
    pagination.hasPreviousPage ??
    currentPage > 1;

  const hasNextPage =
    pagination.hasNextPage ??
    currentPage < totalPages;

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
        {/* Top actions */}
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <button
            type="button"
            onClick={() =>
              router.push("/otp")
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-black"
          >
            <ArrowLeft size={17} />
            Back to OTP
          </button>

          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:border-zinc-400 disabled:opacity-50 sm:px-4"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>

        <section className="rounded-[24px] border border-zinc-100 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
          {/* Heading */}
          <div>
            <h1 className="text-2xl font-black text-zinc-950">
              OTP Logs
            </h1>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Inspect Email and WhatsApp OTP
              delivery and verification activity.
            </p>
          </div>

          {/* Filters */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={filters.q}
                onChange={(event) =>
                  updateFilter(
                    "q",
                    event.target.value,
                  )
                }
                placeholder="Search email, phone, reference or IP"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-base outline-none transition focus:border-black focus:bg-white sm:text-sm"
              />
            </div>

            <select
              value={filters.channel}
              onChange={(event) =>
                updateFilter(
                  "channel",
                  event.target.value,
                )
              }
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none focus:border-black sm:text-sm"
            >
              <option value="">
                All channels
              </option>
              <option value="email">
                Email
              </option>
              <option value="whatsapp">
                WhatsApp
              </option>
            </select>

            <select
              value={filters.purpose}
              onChange={(event) =>
                updateFilter(
                  "purpose",
                  event.target.value,
                )
              }
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none focus:border-black sm:text-sm"
            >
              <option value="">
                All purposes
              </option>
              <option value="login">
                Login
              </option>
              <option value="signup">
                Signup
              </option>
              <option value="email_verification">
                Email Verification
              </option>
              <option value="password_reset">
                Password Reset
              </option>
              <option value="order_verification">
                Order Verification
              </option>
            </select>

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value,
                )
              }
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none focus:border-black sm:text-sm"
            >
              <option value="">
                All statuses
              </option>
              <option value="pending">
                Pending
              </option>
              <option value="sent">
                Sent
              </option>
              <option value="verified">
                Verified
              </option>
              <option value="expired">
                Expired
              </option>
              <option value="failed">
                Failed
              </option>
              <option value="blocked">
                Blocked
              </option>
              <option value="invalidated">
                Invalidated
              </option>
            </select>

            <select
              value={filters.sort}
              onChange={(event) =>
                updateFilter(
                  "sort",
                  event.target.value,
                )
              }
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none focus:border-black sm:text-sm"
            >
              <option value="-createdAt">
                Newest first
              </option>
              <option value="createdAt">
                Oldest first
              </option>
              <option value="-attempts">
                Most attempts
              </option>
              <option value="-resendCount">
                Most resends
              </option>
              <option value="expiresAt">
                Expiry ascending
              </option>
            </select>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-black hover:underline"
            >
              Clear filters
            </button>
          </div>

          {/* Mobile cards */}
          <div className="mt-5 space-y-3 lg:hidden">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2
                  size={28}
                  className="mx-auto animate-spin text-zinc-500"
                />
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center text-sm text-zinc-500">
                No OTP logs found.
              </div>
            ) : (
              logs.map((log) => (
                <article
                  key={log._id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <LogIdentifier log={log} />

                    <button
                      type="button"
                      aria-label="Delete OTP log"
                      onClick={() =>
                        handleDelete(log._id)
                      }
                      disabled={
                        deletingId === log._id
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId ===
                        log._id ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ChannelBadge
                      channel={log.channel}
                    />

                    <StatusBadge
                      status={log.status}
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-400">
                        Purpose
                      </dt>
                      <dd className="mt-1 font-medium text-zinc-800">
                        {formatLabel(
                          log.purpose,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-zinc-400">
                        Created
                      </dt>
                      <dd className="mt-1 text-xs font-medium leading-5 text-zinc-800">
                        {formatDate(
                          log.createdAt,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-zinc-400">
                        Attempts
                      </dt>
                      <dd className="mt-1 font-semibold text-zinc-800">
                        {log.attempts || 0}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-zinc-400">
                        Resends
                      </dt>
                      <dd className="mt-1 font-semibold text-zinc-800">
                        {log.resendCount || 0}
                      </dd>
                    </div>

                    <div className="col-span-2">
                      <dt className="text-xs text-zinc-400">
                        Verified
                      </dt>
                      <dd className="mt-1 text-xs font-medium text-zinc-800">
                        {formatDate(
                          log.verifiedAt,
                        )}
                      </dd>
                    </div>

                    {log.failureReason && (
                      <div className="col-span-2 rounded-xl bg-red-50 p-3">
                        <dt className="text-xs font-semibold text-red-600">
                          Failure reason
                        </dt>
                        <dd className="mt-1 break-words text-xs leading-5 text-red-700">
                          {log.failureReason}
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="mt-5 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-3">
                    Identifier
                  </th>
                  <th className="px-3 py-3">
                    Channel
                  </th>
                  <th className="px-3 py-3">
                    Purpose
                  </th>
                  <th className="px-3 py-3">
                    Status
                  </th>
                  <th className="px-3 py-3">
                    Attempts
                  </th>
                  <th className="px-3 py-3">
                    Resends
                  </th>
                  <th className="px-3 py-3">
                    Created
                  </th>
                  <th className="px-3 py-3">
                    Verified
                  </th>
                  <th className="px-3 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center"
                    >
                      <Loader2
                        size={28}
                        className="mx-auto animate-spin text-zinc-500"
                      />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-zinc-500"
                    >
                      No OTP logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="transition hover:bg-zinc-50"
                    >
                      <td className="px-3 py-4">
                        <LogIdentifier
                          log={log}
                        />
                      </td>

                      <td className="px-3 py-4">
                        <ChannelBadge
                          channel={
                            log.channel
                          }
                        />
                      </td>

                      <td className="px-3 py-4">
                        {formatLabel(
                          log.purpose,
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge
                          status={log.status}
                        />
                      </td>

                      <td className="px-3 py-4">
                        {log.attempts || 0}
                      </td>

                      <td className="px-3 py-4">
                        {log.resendCount || 0}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-xs">
                        {formatDate(
                          log.createdAt,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-xs">
                        {formatDate(
                          log.verifiedAt,
                        )}
                      </td>

                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          aria-label="Delete OTP log"
                          onClick={() =>
                            handleDelete(
                              log._id,
                            )
                          }
                          disabled={
                            deletingId ===
                            log._id
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId ===
                            log._id ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={16}
                            />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-sm text-zinc-500 sm:text-left">
              {pagination.total || 0} records
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={
                  loading ||
                  !hasPreviousPage
                }
                onClick={() =>
                  updateFilter(
                    "page",
                    Math.max(
                      1,
                      currentPage - 1,
                    ),
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="min-w-20 text-center text-sm font-semibold">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  loading || !hasNextPage
                }
                onClick={() =>
                  updateFilter(
                    "page",
                    currentPage + 1,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
