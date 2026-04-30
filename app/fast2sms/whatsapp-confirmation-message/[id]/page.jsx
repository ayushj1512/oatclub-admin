"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  CheckCheck,
  Clock3,
  MessageCircle,
  RefreshCcw,
  Send,
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

const PrettyJson = ({ data }) => {
  if (!data) {
    return (
      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">
        No data available.
      </div>
    );
  }

  return (
    <pre className="max-h-[420px] overflow-auto rounded-2xl bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="max-w-[65%] break-words text-right text-sm font-medium text-gray-900">
      {value || "—"}
    </p>
  </div>
);

const TimelineItem = ({ label, value, active, danger }) => (
  <div className="relative flex gap-3">
    <div className="flex flex-col items-center">
      <div
        className={[
          "mt-1 h-3 w-3 rounded-full ring-4",
          danger
            ? "bg-red-500 ring-red-50"
            : active
            ? "bg-gray-950 ring-gray-100"
            : "bg-gray-300 ring-gray-50",
        ].join(" ")}
      />
      <div className="h-full w-px bg-gray-100" />
    </div>

    <div className="pb-5">
      <p
        className={[
          "text-sm font-semibold",
          danger ? "text-red-700" : active ? "text-gray-950" : "text-gray-500",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="mt-1 text-xs text-gray-500">{formatDate(value)}</p>
    </div>
  </div>
);

export default function WhatsappConfirmationMessageDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const {
    loading,
    error,
    selectedMessage,
    fetchMessageById,
    clearError,
    clearSelectedMessage,
  } = useWhatsappConfirmationMessageStore();

  useEffect(() => {
    if (id) fetchMessageById(id);

    return () => clearSelectedMessage();
  }, [id]);

  const item = selectedMessage;

  const StatusIcon = STATUS_ICON[item?.status] || Clock3;

  const orderNumber = useMemo(() => {
    return item?.orderId?.orderNumber || item?.orderId || "—";
  }, [item]);

  const timeline = useMemo(
    () => [
      { label: "Created", value: item?.createdAt, active: !!item?.createdAt },
      { label: "Sent", value: item?.sentAt, active: !!item?.sentAt },
      {
        label: "Delivered",
        value: item?.deliveredAt,
        active: !!item?.deliveredAt,
      },
      { label: "Read", value: item?.readAt, active: !!item?.readAt },
      { label: "Replied", value: item?.repliedAt, active: !!item?.repliedAt },
      {
        label: "Failed",
        value: item?.failedAt,
        active: !!item?.failedAt,
        danger: true,
      },
    ],
    [item]
  );

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/fast2sms/whatsapp-confirmation-message")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft size={16} />
            Back to logs
          </button>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Fast2SMS Message
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
            Message Details
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track WhatsApp confirmation status, variables and webhook payload.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchMessageById(id)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            <X size={16} />
          </button>
        </div>
      )}

      {loading && !item ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading message details...
        </div>
      ) : !item ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Message not found.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Order
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">
                    {orderNumber}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {item?.customerName || item?.customerId?.name || "Customer"} ·{" "}
                    {item?.phone || "—"}
                  </p>
                </div>

                <span
                  className={[
                    "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                    STATUS_STYLES[item.status] || "bg-gray-100 text-gray-700",
                  ].join(" ")}
                >
                  <StatusIcon size={14} />
                  {item.status || "pending"}
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Message Body
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {item?.messageBody || "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-base font-semibold text-gray-950">
                Message Info
              </h3>

              <div className="mt-3">
                <InfoRow label="Template Name" value={item?.templateName} />
                <InfoRow label="Language" value={item?.templateLanguage} />
                <InfoRow label="Message Type" value={item?.messageType} />
                <InfoRow label="Direction" value={item?.direction} />
                <InfoRow label="Fast2SMS Request ID" value={item?.fast2smsRequestId} />
                <InfoRow label="Fast2SMS Message ID" value={item?.fast2smsMessageId} />
                <InfoRow label="Failure Reason" value={item?.failureReason} />
                <InfoRow label="Notes" value={item?.notes} />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-base font-semibold text-gray-950">
                Variables
              </h3>

              {item?.variables?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.variables.map((value, index) => (
                    <span
                      key={`${value}-${index}`}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700"
                    >
                      {index + 1}. {value}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No variables found.</p>
              )}
            </div>

            {item?.customerReplyText && (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Customer Reply
                </h3>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-purple-50 p-4 text-sm leading-6 text-purple-800 ring-1 ring-purple-100">
                  {item.customerReplyText}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-base font-semibold text-gray-950">
                Status Timeline
              </h3>

              <div className="mt-5">
                {timeline.map((step) => (
                  <TimelineItem key={step.label} {...step} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-base font-semibold text-gray-950">
                Customer
              </h3>

              <div className="mt-3">
                <InfoRow label="Name" value={item?.customerName || item?.customerId?.name} />
                <InfoRow label="Phone" value={item?.phone} />
                <InfoRow label="Email" value={item?.customerId?.email} />
                <InfoRow label="Customer Code" value={item?.customerId?.customerCode} />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-base font-semibold text-gray-950">
                Raw Send Response
              </h3>
              <div className="mt-4">
                <PrettyJson data={item?.rawSendResponse} />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-base font-semibold text-gray-950">
                Raw Webhook Payload
              </h3>
              <div className="mt-4">
                <PrettyJson data={item?.rawWebhookPayload} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}