"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCheck,
  Clock3,
  Download,
  Eye,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";
import { useOrderStore } from "@/store/orderStore";

const STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700 ring-gray-200",
  queued: "bg-slate-100 text-slate-700 ring-slate-200",
  accepted: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  sent: "bg-blue-50 text-blue-700 ring-blue-100",
  delivered:
    "bg-emerald-50 text-emerald-700 ring-emerald-100",
  read: "bg-green-50 text-green-700 ring-green-100",
  replied: "bg-purple-50 text-purple-700 ring-purple-100",
  failed: "bg-red-50 text-red-700 ring-red-100",
};

const STATUS_ICON = {
  pending: Clock3,
  queued: Clock3,
  accepted: Send,
  sent: Send,
  delivered: CheckCheck,
  read: CheckCheck,
  replied: MessageCircle,
  failed: AlertCircle,
};

const DEFAULT_ANALYTICS = {
  total: 0,
  pending: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
};

const escapeCsvValue = (value) => {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrderKey = (item) =>
  item?.orderId?._id ||
  item?.orderId?.orderNumber ||
  item?.orderId ||
  item?.orderNumber ||
  "";

const getOrderNumber = (item) =>
  item?.orderId?.orderNumber ||
  item?.orderNumber ||
  item?.orderId ||
  "—";

const getCustomerName = (item) =>
  item?.customerName ||
  item?.customerId?.name ||
  item?.customer?.name ||
  "Customer";

const getCustomerEmail = (item) =>
  item?.customerId?.email ||
  item?.customer?.email ||
  "—";

const getProviderMessageId = (item) =>
  item?.providerMessageId ||
  item?.messageId ||
  item?.fast2smsMessageId ||
  item?.metaMessageId ||
  "—";

export default function WhatsappConfirmationMessagePage() {
  const router = useRouter();

  const {
    loading,
    analyticsLoading,
    error,

    messages,
    analytics,
    filters,
    pagination,

    setFilters,
    resetFilters,
    setLimit,

    fetchMessages,
    fetchAnalytics,
    clearError,
  } = useWhatsappConfirmationMessageStore();

  const { fetchOrderConfirmationDetails } =
    useOrderStore();

  const [confirmationMap, setConfirmationMap] =
    useState({});

  const [
    confirmationLoadingMap,
    setConfirmationLoadingMap,
  ] = useState({});

  const refreshPage = useCallback(async () => {
    await Promise.allSettled([
      fetchMessages(
        pagination.page,
        pagination.limit
      ),
      fetchAnalytics({
        fromDate: filters?.fromDate || undefined,
        toDate: filters?.toDate || undefined,
      }),
    ]);
  }, [
    fetchAnalytics,
    fetchMessages,
    filters?.fromDate,
    filters?.toDate,
    pagination.limit,
    pagination.page,
  ]);

  useEffect(() => {
    Promise.allSettled([
      fetchMessages(1, pagination.limit),
      fetchAnalytics(),
    ]);
  }, [
    fetchAnalytics,
    fetchMessages,
    pagination.limit,
  ]);

  useEffect(() => {
    if (!messages?.length) return;

    const loadConfirmationDetails = async () => {
      const uniqueOrderKeys = [
        ...new Set(
          messages
            .map((item) => getOrderKey(item))
            .filter(Boolean)
        ),
      ];

      const pendingKeys = uniqueOrderKeys.filter(
        (key) =>
          !Object.prototype.hasOwnProperty.call(
            confirmationMap,
            key
          )
      );

      if (!pendingKeys.length) return;

      setConfirmationLoadingMap((previous) => {
        const next = { ...previous };

        pendingKeys.forEach((key) => {
          next[key] = true;
        });

        return next;
      });

      await Promise.allSettled(
        pendingKeys.map(async (key) => {
          try {
            const details =
              await fetchOrderConfirmationDetails(key);

            setConfirmationMap((previous) => ({
              ...previous,
              [key]: details || null,
            }));
          } catch {
            setConfirmationMap((previous) => ({
              ...previous,
              [key]: null,
            }));
          } finally {
            setConfirmationLoadingMap(
              (previous) => ({
                ...previous,
                [key]: false,
              })
            );
          }
        })
      );
    };

    loadConfirmationDetails();
  }, [
    messages,
    confirmationMap,
    fetchOrderConfirmationDetails,
  ]);

  const stats = useMemo(
    () => ({
      ...DEFAULT_ANALYTICS,
      ...(analytics || {}),
    }),
    [analytics]
  );

  const hasFilters = useMemo(
    () =>
      Object.values(filters || {}).some(
        (value) =>
          value !== "" &&
          value !== null &&
          value !== undefined
      ),
    [filters]
  );

  const goToPage = async (page) => {
    const totalPages = Number(
      pagination?.pages || 1
    );

    if (
      page < 1 ||
      page > totalPages ||
      page === pagination.page ||
      loading
    ) {
      return;
    }

    await fetchMessages(page, pagination.limit);
  };

  const handleApplyFilters = async () => {
    await Promise.allSettled([
      fetchMessages(1, pagination.limit),
      fetchAnalytics({
        fromDate: filters?.fromDate || undefined,
        toDate: filters?.toDate || undefined,
      }),
    ]);
  };

  const handleResetFilters = async () => {
    resetFilters();

    await Promise.allSettled([
      fetchMessages(1, pagination.limit),
      fetchAnalytics(),
    ]);
  };

  const handleLimitChange = async (event) => {
    const nextLimit = Number(event.target.value);

    setLimit(nextLimit);
    await fetchMessages(1, nextLimit);
  };

  const exportCsv = () => {
    if (!messages.length) return;

    const headers = [
      "Order",
      "Customer",
      "Email",
      "Phone",
      "Template",
      "Status",
      "Direction",
      "Provider Message ID",
      "Sent At",
      "Delivered At",
      "Read At",
    ];

    const rows = messages.map((item) => [
      getOrderNumber(item),
      getCustomerName(item),
      getCustomerEmail(item),
      item?.phone || "",
      item?.templateName ||
      item?.templateKey ||
      "",
      item?.status || "pending",
      item?.direction || "outgoing",
      getProviderMessageId(item),
      formatDate(
        item?.sentAt || item?.createdAt
      ),
      formatDate(item?.deliveredAt),
      formatDate(item?.readAt),
    ]);

    const csv = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `whatsapp-messages-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const openMessage = (id) => {
    if (!id) return;

    router.push(
      `/fast2sms/whatsapp-confirmation-message/${id}`
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Fast2SMS
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
              WhatsApp Confirmation Messages
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View COD and prepaid confirmation
              messages, delivery status and customer
              confirmations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshPage}
              disabled={loading || analyticsLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={
                  loading || analyticsLoading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={!messages.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/fast2sms/whatsapp-confirmation-message/send"
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black"
            >
              <Send size={16} />
              Send Message
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={clearError}
              className="shrink-0 rounded-lg p-1 transition hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Total", stats.total],
            ["Sent", stats.sent],
            ["Delivered", stats.delivered],
            ["Read", stats.read],
            ["Failed", stats.failed],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <p className="text-xs font-medium text-gray-400">
                {label}
              </p>

              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {analyticsLoading ? "—" : value || 0}
              </p>
            </article>
          ))}
        </section>

        <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={filters?.phone || ""}
                onChange={(event) =>
                  setFilters({
                    phone: event.target.value,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilters();
                  }
                }}
                placeholder="Search phone number"
                className="h-11 w-full rounded-xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
              />
            </div>

            <input
              value={filters?.orderId || ""}
              onChange={(event) =>
                setFilters({
                  orderId: event.target.value,
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleApplyFilters();
                }
              }}
              placeholder="Order ID or number"
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />

            <input
              value={filters?.customerId || ""}
              onChange={(event) =>
                setFilters({
                  customerId: event.target.value,
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleApplyFilters();
                }
              }}
              placeholder="Customer ID"
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />

            <input
              value={filters?.templateName || ""}
              onChange={(event) =>
                setFilters({
                  templateName: event.target.value,
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleApplyFilters();
                }
              }}
              placeholder="Template name"
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />

            <select
              value={filters?.status || ""}
              onChange={(event) =>
                setFilters({
                  status: event.target.value,
                })
              }
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="queued">Queued</option>
              <option value="accepted">
                Accepted
              </option>
              <option value="sent">Sent</option>
              <option value="delivered">
                Delivered
              </option>
              <option value="read">Read</option>
              <option value="replied">
                Replied
              </option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={filters?.direction || ""}
              onChange={(event) =>
                setFilters({
                  direction: event.target.value,
                })
              }
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            >
              <option value="">All Direction</option>
              <option value="outgoing">
                Outgoing
              </option>
              <option value="incoming">
                Incoming
              </option>
            </select>

            <input
              type="date"
              value={filters?.fromDate || ""}
              onChange={(event) =>
                setFilters({
                  fromDate: event.target.value,
                })
              }
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />

            <input
              type="date"
              value={filters?.toDate || ""}
              onChange={(event) =>
                setFilters({
                  toDate: event.target.value,
                })
              }
              className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">
              Apply filters to search saved WhatsApp
              message records.
            </p>

            <div className="flex gap-2">
              {hasFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={loading}
                  className="h-10 rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                >
                  Clear
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Search size={15} />
                )}
                Apply Filters
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Order
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Customer
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Phone
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Template
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Confirmed
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Confirmed By
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Confirmed At
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Sent
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Delivered
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Read
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Provider ID
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 6 }).map(
                    (_, index) => (
                      <tr key={index}>
                        <td
                          colSpan={13}
                          className="px-4 py-3"
                        >
                          <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                        </td>
                      </tr>
                    )
                  )
                ) : messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-14 text-center"
                    >
                      <MessageCircle
                        size={30}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-3 text-sm font-medium text-gray-700">
                        No WhatsApp messages found
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Change the filters or send your
                        first confirmation message.
                      </p>
                    </td>
                  </tr>
                ) : (
                  messages.map((item) => {
                    const status =
                      String(
                        item?.status || "pending"
                      ).toLowerCase();

                    const CurrentStatusIcon =
                      STATUS_ICON[status] ||
                      Clock3;

                    const orderKey =
                      getOrderKey(item);

                    const details =
                      confirmationMap[orderKey];

                    const isConfirmationLoading =
                      confirmationLoadingMap[
                      orderKey
                      ];

                    return (
                      <tr
                        key={item?._id}
                        onClick={() =>
                          openMessage(item?._id)
                        }
                        className="cursor-pointer transition hover:bg-gray-50/80"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-950">
                            {getOrderNumber(item)}
                          </div>

                          <div className="text-xs capitalize text-gray-400">
                            {item?.direction ||
                              "outgoing"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[180px] truncate font-medium text-gray-800">
                            {getCustomerName(item)}
                          </div>

                          <div className="max-w-[180px] truncate text-xs text-gray-400">
                            {getCustomerEmail(item)}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-700">
                          {item?.phone || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[220px] truncate text-gray-700">
                            {item?.templateName ||
                              item?.templateKey ||
                              "—"}
                          </div>

                          <div className="text-xs text-gray-400">
                            {item?.templateLanguage ||
                              "en"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1",
                              STATUS_STYLES[
                              status
                              ] ||
                              "bg-gray-100 text-gray-700 ring-gray-200",
                            ].join(" ")}
                          >
                            <CurrentStatusIcon
                              size={13}
                            />
                            {status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {isConfirmationLoading ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                              Loading
                            </span>
                          ) : details?.isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-100">
                              <ShieldCheck
                                size={13}
                              />
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                              <Clock3 size={13} />
                              No
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="capitalize text-gray-700">
                            {details?.confirmedBy ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {details?.confirmedAtIST ||
                            formatDate(
                              details?.confirmedAt
                            )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(
                            item?.sentAt ||
                            item?.createdAt
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(
                            item?.deliveredAt
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(
                            item?.readAt
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div
                            className="max-w-[150px] truncate font-mono text-xs text-gray-500"
                            title={getProviderMessageId(
                              item
                            )}
                          >
                            {getProviderMessageId(
                              item
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMessage(item?._id);
                            }}
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

          <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Page{" "}
                <span className="font-semibold text-gray-800">
                  {pagination?.page || 1}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-800">
                  {pagination?.pages || 1}
                </span>{" "}
                · {pagination?.total || 0} messages
              </p>

              <label className="flex items-center gap-2 text-sm text-gray-500">
                Rows
                <select
                  value={pagination?.limit || 100}
                  onChange={handleLimitChange}
                  disabled={loading}
                  className="h-9 rounded-lg bg-gray-50 px-2 text-sm text-gray-700 outline-none ring-1 ring-gray-200"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  pagination?.page <= 1 ||
                  loading
                }
                onClick={() =>
                  goToPage(
                    pagination.page - 1
                  )
                }
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  pagination?.page >=
                  (pagination?.pages || 1) ||
                  loading
                }
                onClick={() =>
                  goToPage(
                    pagination.page + 1
                  )
                }
                className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
