"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCheck,
  Clock3,
  MessageCircle,
  RefreshCcw,
  Send,
  Settings,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";

const cards = [
  {
    title: "WhatsApp Confirmation",
    desc: "COD order confirmation logs, replies and delivery status.",
    icon: MessageCircle,
    route: "/fast2sms/whatsapp-confirmation-message",
  },
  {
    title: "Send Test Message",
    desc: "Send a manual WhatsApp template message for testing.",
    icon: Send,
    route: "/fast2sms/whatsapp-confirmation-message/send",
  },
  {
    title: "Settings",
    desc: "Template config and webhook setup notes.",
    icon: Settings,
    route: "/fast2sms/whatsapp-confirmation-message/settings",
  },
];

const statusCards = [
  { key: "total", label: "Total Logs", icon: MessageCircle },
  { key: "sent", label: "Sent", icon: Send },
  { key: "delivered", label: "Delivered", icon: CheckCheck },
  { key: "read", label: "Read", icon: CheckCheck },
  { key: "failed", label: "Failed", icon: AlertCircle },
];

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Fast2SMSDashboardPage() {
  const router = useRouter();

  const { loading, messages, pagination, fetchMessages } =
    useWhatsappConfirmationMessageStore();

  useEffect(() => {
    fetchMessages(1, 10);
  }, []);

  const stats = useMemo(() => {
    return messages.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: pagination?.total || 0 }
    );
  }, [messages, pagination?.total]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Messaging
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
            Fast2SMS
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage WhatsApp confirmation messages, logs and delivery tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchMessages(1, 10)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {statusCards.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-400">{label}</p>
              <Icon size={16} className="text-gray-400" />
            </div>

            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {stats[key] || 0}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {cards.map(({ title, desc, icon: Icon, route }) => (
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
            <p className="mt-1 text-sm leading-5 text-gray-500">{desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
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
            onClick={() => router.push("/fast2sms/whatsapp-confirmation-message")}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            View All
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              Loading recent logs...
            </div>
          ) : messages.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              No message logs found.
            </div>
          ) : (
            messages.slice(0, 8).map((item) => (
              <button
                key={item._id}
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
                    <MessageCircle size={16} className="text-gray-400" />
                    <p className="truncate text-sm font-semibold text-gray-950">
                      {item?.orderId?.orderNumber || item?.orderId || "No Order"}
                    </p>
                  </div>

                  <p className="mt-1 truncate text-sm text-gray-500">
                    {item?.customerName || item?.customerId?.name || "Customer"} ·{" "}
                    {item?.phone || "—"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-xs text-gray-400 sm:block">
                    {formatDate(item?.sentAt || item?.createdAt)}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">
                    {item?.status === "failed" ? (
                      <AlertCircle size={13} />
                    ) : item?.status === "pending" || item?.status === "queued" ? (
                      <Clock3 size={13} />
                    ) : (
                      <CheckCheck size={13} />
                    )}
                    {item?.status || "pending"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}