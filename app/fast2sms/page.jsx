"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCheck,
  Clock3,
  FileText,
  MessageCircle,
  RefreshCcw,
  Send,
  Settings,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";

const navigationCards = [
  {
    title: "WhatsApp Messages",
    description:
      "View order confirmation messages, delivery statuses and provider logs.",
    icon: MessageCircle,
    route: "/fast2sms/whatsapp-confirmation-message",
  },
  {
    title: "Send Message",
    description:
      "Send an approved WhatsApp template manually for testing or support.",
    icon: Send,
    route: "/fast2sms/whatsapp-confirmation-message/send",
  },
  {
    title: "Analytics",
    description:
      "Review message volume, delivery rate, read rate and failures.",
    icon: FileText,
    route: "/fast2sms/whatsapp-confirmation-message/analytics",
  },
  {
    title: "Settings",
    description:
      "Review Fast2SMS configuration, templates and webhook information.",
    icon: Settings,
    route: "/fast2sms/whatsapp-confirmation-message/settings",
  },
];

const statusCards = [
  {
    key: "total",
    label: "Total Messages",
    icon: MessageCircle,
  },
  {
    key: "sent",
    label: "Sent",
    icon: Send,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: CheckCheck,
  },
  {
    key: "read",
    label: "Read",
    icon: CheckCheck,
  },
  {
    key: "failed",
    label: "Failed",
    icon: AlertCircle,
  },
];

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

const getStatusClasses = (status = "") => {
  const normalizedStatus = String(status).toLowerCase();

  if (normalizedStatus === "failed") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "queued"
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (normalizedStatus === "read") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (normalizedStatus === "delivered") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (normalizedStatus === "sent") {
    return "bg-gray-100 text-gray-700 ring-gray-200";
  }

  return "bg-gray-100 text-gray-600 ring-gray-200";
};

const StatusIcon = ({ status }) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "failed") {
    return <AlertCircle size={13} />;
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "queued"
  ) {
    return <Clock3 size={13} />;
  }

  return <CheckCheck size={13} />;
};

export default function Fast2SMSDashboardPage() {
  const router = useRouter();

  const {
    loading,
    analyticsLoading,
    templatesLoading,

    messages,
    analytics,
    templates,
    error,

    fetchMessages,
    fetchAnalytics,
    fetchTemplates,
    clearError,
  } = useWhatsappConfirmationMessageStore();

  const refreshDashboard = useCallback(async () => {
    clearError();

    await Promise.allSettled([
      fetchMessages(1, 10),
      fetchAnalytics(),
      fetchTemplates(),
    ]);
  }, [
    clearError,
    fetchAnalytics,
    fetchMessages,
    fetchTemplates,
  ]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const refreshing =
    loading || analyticsLoading || templatesLoading;

  const approvedTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          String(template?.status || "").toUpperCase() ===
          "APPROVED"
      ).length,
    [templates]
  );

  const stats = useMemo(
    () => ({
      total: Number(analytics?.total || 0),
      sent: Number(analytics?.sent || 0),
      delivered: Number(analytics?.delivered || 0),
      read: Number(analytics?.read || 0),
      failed: Number(analytics?.failed || 0),
    }),
    [analytics]
  );

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Communication
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
              Fast2SMS WhatsApp
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage WhatsApp order confirmations, message logs,
              templates and delivery tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error ? (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={clearError}
              className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {statusCards.map(({ key, label, icon: Icon }) => (
            <article
              key={key}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-gray-400">
                  {label}
                </p>

                <Icon size={16} className="text-gray-400" />
              </div>

              <p className="mt-3 text-2xl font-semibold text-gray-950">
                {analyticsLoading ? "—" : stats[key]}
              </p>
            </article>
          ))}

          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-400">
                Approved Templates
              </p>

              <FileText size={16} className="text-gray-400" />
            </div>

            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {templatesLoading ? "—" : approvedTemplates}
            </p>
          </article>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {navigationCards.map(
            ({
              title,
              description,
              icon: Icon,
              route,
            }) => (
              <button
                key={title}
                type="button"
                onClick={() => router.push(route)}
                className="group rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-gray-950 p-3 text-white shadow-sm">
                    <Icon size={20} />
                  </div>

                  <ArrowRight
                    size={18}
                    className="mt-1 text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-900"
                  />
                </div>

                <h2 className="mt-4 text-base font-semibold text-gray-950">
                  {title}
                </h2>

                <p className="mt-1 text-sm leading-5 text-gray-500">
                  {description}
                </p>
              </button>
            )
          )}
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950">
                Recent Message Logs
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest WhatsApp confirmation activity.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/fast2sms/whatsapp-confirmation-message"
                )
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              View All
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                Loading recent messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <MessageCircle
                  size={28}
                  className="mx-auto text-gray-300"
                />

                <p className="mt-3 text-sm font-medium text-gray-700">
                  No message logs found
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Sent WhatsApp messages will appear here.
                </p>
              </div>
            ) : (
              messages.slice(0, 10).map((item) => {
                const orderNumber =
                  item?.orderId?.orderNumber ||
                  item?.orderNumber ||
                  item?.orderId ||
                  "No Order";

                const customerName =
                  item?.customerName ||
                  item?.customerId?.name ||
                  "Customer";

                const status = item?.status || "pending";

                return (
                  <button
                    key={item?._id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/fast2sms/whatsapp-confirmation-message/${item._id}`
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MessageCircle
                          size={16}
                          className="shrink-0 text-gray-400"
                        />

                        <p className="truncate text-sm font-semibold text-gray-950">
                          {String(orderNumber).startsWith("#")
                            ? orderNumber
                            : `#${orderNumber}`}
                        </p>
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {customerName} · {item?.phone || "—"}
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-400">
                        {item?.templateName ||
                          item?.templateKey ||
                          "WhatsApp template"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-gray-400 sm:block">
                        {formatDate(
                          item?.sentAt || item?.createdAt
                        )}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${getStatusClasses(
                          status
                        )}`}
                      >
                        <StatusIcon status={status} />
                        {status}
                      </span>

                      <ArrowRight
                        size={15}
                        className="hidden text-gray-300 sm:block"
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
