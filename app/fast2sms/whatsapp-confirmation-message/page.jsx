"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCcw,
  Search,
  MessageCircle,
  Eye,
  Send,
  CheckCheck,
  AlertCircle,
  Clock3,
  X,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";

const STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700",
  queued: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  read: "bg-green-50 text-green-700",
  replied: "bg-purple-50 text-purple-700",
  failed: "bg-red-50 text-red-700",
};

const STATUS_ICON = {
  pending: Clock3,
  queued: Clock3,
  sent: Send,
  delivered: CheckCheck,
  read: CheckCheck,
  replied: MessageCircle,
  failed: AlertCircle,
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrderNumber = (item) =>
  item?.orderId?.orderNumber || item?.orderId || "—";

export default function WhatsappConfirmationMessagePage() {
  const router = useRouter();

  const {
    loading,
    error,
    messages,
    filters,
    pagination,
    setFilters,
    resetFilters,
    fetchMessages,
    clearError,
  } = useWhatsappConfirmationMessageStore();

  useEffect(() => {
    fetchMessages(1);
  }, []);

  const stats = useMemo(() => {
    return messages.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0 }
    );
  }, [messages]);

  const hasFilters = useMemo(
    () => Object.values(filters || {}).some(Boolean),
    [filters]
  );

  const goToPage = (page) => {
    if (page < 1 || page > pagination.pages || page === pagination.page) return;
    fetchMessages(page, pagination.limit);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Fast2SMS
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
            WhatsApp Confirmation Messages
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View COD confirmation message logs, delivery status and replies.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fetchMessages(pagination.page)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/fast2sms/whatsapp-confirmation-message/send")
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black"
          >
            <Send size={16} />
            Send Test
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Total", stats.total || 0],
          ["Sent", stats.sent || 0],
          ["Delivered", stats.delivered || 0],
          ["Read", stats.read || 0],
          ["Failed", stats.failed || 0],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <p className="text-xs font-medium text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={filters.phone}
              onChange={(e) => setFilters({ phone: e.target.value })}
              placeholder="Search phone number"
              className="h-11 w-full rounded-xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filters.direction}
            onChange={(e) => setFilters({ direction: e.target.value })}
            className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
          >
            <option value="">All Direction</option>
            <option value="outgoing">Outgoing</option>
            <option value="incoming">Incoming</option>
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fetchMessages(1)}
              className="h-11 flex-1 rounded-xl bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-black"
            >
              Apply
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  setTimeout(() => fetchMessages(1), 0);
                }}
                className="h-11 rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Sent At</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Loading message logs...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No WhatsApp confirmation messages found.
                  </td>
                </tr>
              ) : (
                messages.map((item) => {
                  const StatusIcon = STATUS_ICON[item.status] || Clock3;

                  return (
                    <tr key={item._id} className="transition hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-950">
                          {getOrderNumber(item)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item?.direction || "outgoing"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="max-w-[180px] truncate font-medium text-gray-800">
                          {item?.customerName ||
                            item?.customerId?.name ||
                            "Customer"}
                        </div>
                        <div className="max-w-[180px] truncate text-xs text-gray-400">
                          {item?.customerId?.email || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-700">
                        {item?.phone || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="max-w-[220px] truncate text-gray-700">
                          {item?.templateName || "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item?.templateLanguage || "en"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                            STATUS_STYLES[item.status] ||
                              "bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          <StatusIcon size={13} />
                          {item.status || "pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(item?.sentAt || item?.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/fast2sms/whatsapp-confirmation-message/${item._id}`
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page <span className="font-semibold text-gray-800">{pagination.page}</span>{" "}
            of <span className="font-semibold text-gray-800">{pagination.pages || 1}</span>{" "}
            · {pagination.total || 0} logs
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => goToPage(pagination.page - 1)}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => goToPage(pagination.page + 1)}
              className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}   