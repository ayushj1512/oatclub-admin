"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { useOtpStore } from "@/store/otpStore";

const formatDate = (date) => {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
};

const statusStyle = {
  pending: "bg-amber-50 text-amber-700",
  sent: "bg-blue-50 text-blue-700",
  verified: "bg-green-50 text-green-700",
  expired: "bg-zinc-100 text-zinc-600",
  failed: "bg-red-50 text-red-700",
  blocked: "bg-red-100 text-red-800",
  invalidated: "bg-purple-50 text-purple-700",
};

export default function OtpLogsPage() {
  const router = useRouter();

  const {
    logs,
    loading,
    pagination,
    fetchLogs,
    deleteLog,
  } = useOtpStore();

  const [filters, setFilters] = useState({
    q: "",
    purpose: "",
    status: "",
    sort: "-createdAt",
    page: 1,
    limit: 20,
  });

  const loadLogs = useCallback(async () => {
    try {
      const query = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "") {
          query.set(key, String(value));
        }
      });

      await fetchLogs(query.toString());
    } catch (error) {
      toast.error(error?.message || "Failed to load OTP logs");
    }
  }, [fetchLogs, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this OTP log?")) return;

    try {
      await deleteLog(id);
      toast.success("OTP log deleted");
    } catch (error) {
      toast.error(error?.message || "Failed to delete log");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/otp")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-black"
          >
            <ArrowLeft size={17} />
            Back to OTP
          </button>

          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <section className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-zinc-950">
              OTP Logs
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Search and inspect OTP delivery and verification activity.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={filters.q}
                onChange={(event) =>
                  updateFilter("q", event.target.value)
                }
                placeholder="Search email, reference or IP"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-black"
              />
            </div>

            <select
              value={filters.purpose}
              onChange={(event) =>
                updateFilter("purpose", event.target.value)
              }
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">All purposes</option>
              <option value="login">Login</option>
              <option value="signup">Signup</option>
              <option value="email_verification">Email Verification</option>
              <option value="password_reset">Password Reset</option>
              <option value="order_verification">Order Verification</option>
            </select>

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter("status", event.target.value)
              }
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="verified">Verified</option>
              <option value="expired">Expired</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
              <option value="invalidated">Invalidated</option>
            </select>
          </div>

          <div className="mt-3 flex justify-end">
            <select
              value={filters.sort}
              onChange={(event) =>
                updateFilter("sort", event.target.value)
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
            >
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="-attempts">Most attempts</option>
              <option value="-resendCount">Most resends</option>
              <option value="expiresAt">Expiry ascending</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Purpose</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3">Resends</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Verified</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Loader2
                        size={28}
                        className="mx-auto animate-spin text-zinc-500"
                      />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center text-zinc-500"
                    >
                      No OTP logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-zinc-900">
                          {log.identifier}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {log.referenceId}
                        </p>
                      </td>

                      <td className="px-3 py-4 capitalize">
                        {String(log.purpose || "-").replaceAll("_", " ")}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyle[log.status] ||
                            "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td className="px-3 py-4">{log.attempts || 0}</td>
                      <td className="px-3 py-4">{log.resendCount || 0}</td>
                      <td className="px-3 py-4">{formatDate(log.createdAt)}</td>
                      <td className="px-3 py-4">{formatDate(log.verifiedAt)}</td>

                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(log._id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
            <p className="text-sm text-zinc-500">
              {pagination.total || 0} records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() =>
                  updateFilter("page", Math.max(1, filters.page - 1))
                }
                className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="text-sm font-semibold">
                {pagination.page || 1} / {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() =>
                  updateFilter("page", filters.page + 1)
                }
                className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40"
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