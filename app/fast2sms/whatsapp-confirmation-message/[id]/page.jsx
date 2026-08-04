"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";
import { useOrderStore } from "@/store/orderStore";

const STATUS_STYLES = {
  pending:
    "bg-gray-100 text-gray-700 ring-gray-200",
  queued:
    "bg-slate-100 text-slate-700 ring-slate-200",
  accepted:
    "bg-indigo-50 text-indigo-700 ring-indigo-100",
  sent:
    "bg-blue-50 text-blue-700 ring-blue-100",
  delivered:
    "bg-emerald-50 text-emerald-700 ring-emerald-100",
  read:
    "bg-green-50 text-green-700 ring-green-100",
  replied:
    "bg-purple-50 text-purple-700 ring-purple-100",
  failed:
    "bg-red-50 text-red-700 ring-red-100",
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
  item?.orderNumber ||
  item?.orderId ||
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
  item?.fast2smsMessageId ||
  item?.messageId ||
  item?.metaMessageId ||
  "—";

const getProviderRequestId = (item) =>
  item?.providerRequestId ||
  item?.fast2smsRequestId ||
  item?.requestId ||
  "—";

function CopyableValue({
  value,
  fallback = "—",
}) {
  const [copied, setCopied] = useState(false);

  const displayValue =
    value === undefined ||
      value === null ||
      value === ""
      ? fallback
      : String(value);

  const copyValue = async () => {
    if (!value || value === "—") return;

    try {
      await navigator.clipboard.writeText(
        String(value)
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex max-w-[70%] items-start justify-end gap-2">
      <p className="break-all text-right text-sm font-medium text-gray-900">
        {displayValue}
      </p>

      {value && value !== "—" ? (
        <button
          type="button"
          onClick={copyValue}
          className="mt-0.5 shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Copy value"
        >
          {copied ? (
            <Check
              size={13}
              className="text-green-600"
            />
          ) : (
            <Copy size={13} />
          )}
        </button>
      ) : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyable = false,
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <p className="shrink-0 text-sm text-gray-500">
        {label}
      </p>

      {copyable ? (
        <CopyableValue value={value} />
      ) : (
        <p className="max-w-[70%] break-words text-right text-sm font-medium text-gray-900">
          {value === undefined ||
            value === null ||
            value === ""
            ? "—"
            : value}
        </p>
      )}
    </div>
  );
}

function PrettyJson({
  data,
  title,
}) {
  const [copied, setCopied] = useState(false);

  if (
    data === undefined ||
    data === null ||
    data === ""
  ) {
    return (
      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">
        No data available.
      </div>
    );
  }

  const jsonText =
    typeof data === "string"
      ? data
      : JSON.stringify(data, null, 2);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-gray-950 ring-1 ring-black/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs font-medium text-gray-400">
          {title}
        </p>

        <button
          type="button"
          onClick={copyJson}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/15"
        >
          {copied ? (
            <Check size={13} />
          ) : (
            <Copy size={13} />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed text-gray-100">
        {jsonText}
      </pre>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  active,
  danger,
  isLast,
}) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={[
            "mt-1 h-3 w-3 rounded-full ring-4",
            danger && active
              ? "bg-red-500 ring-red-50"
              : active
                ? "bg-gray-950 ring-gray-100"
                : "bg-gray-300 ring-gray-50",
          ].join(" ")}
        />

        {!isLast ? (
          <div className="h-full min-h-10 w-px bg-gray-100" />
        ) : null}
      </div>

      <div className={isLast ? "" : "pb-5"}>
        <p
          className={[
            "text-sm font-semibold",
            danger && active
              ? "text-red-700"
              : active
                ? "text-gray-950"
                : "text-gray-500",
          ].join(" ")}
        >
          {label}
        </p>

        <p className="mt-1 text-xs text-gray-500">
          {formatDate(value)}
        </p>
      </div>
    </div>
  );
}

export default function WhatsappConfirmationMessageDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const id = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const {
    loading,
    error,
    selectedMessage,
    fetchMessageById,
    clearError,
    clearSelectedMessage,
  } =
    useWhatsappConfirmationMessageStore();

  const {
    confirmationDetails,
    confirmationDetailsLoading,
    fetchOrderConfirmationDetails,
  } = useOrderStore();

  const item = selectedMessage;

  const orderKey = useMemo(
    () => getOrderKey(item),
    [item]
  );

  const refreshDetails = useCallback(async () => {
    if (!id) return;

    const results = [
      fetchMessageById(id),
    ];

    if (orderKey) {
      results.push(
        fetchOrderConfirmationDetails(orderKey)
      );
    }

    await Promise.allSettled(results);
  }, [
    fetchMessageById,
    fetchOrderConfirmationDetails,
    id,
    orderKey,
  ]);

  useEffect(() => {
    if (id) {
      fetchMessageById(id);
    }

    return () => {
      clearSelectedMessage();
    };
  }, [
    id,
    fetchMessageById,
    clearSelectedMessage,
  ]);

  useEffect(() => {
    if (orderKey) {
      fetchOrderConfirmationDetails(orderKey);
    }
  }, [
    orderKey,
    fetchOrderConfirmationDetails,
  ]);

  const normalizedStatus = String(
    item?.status || "pending"
  ).toLowerCase();

  const StatusIcon =
    STATUS_ICON[normalizedStatus] || Clock3;

  const orderNumber = useMemo(
    () => getOrderNumber(item),
    [item]
  );

  const timeline = useMemo(
    () => [
      {
        label: "Created",
        value: item?.createdAt,
        active: Boolean(item?.createdAt),
      },
      {
        label: "Queued",
        value: item?.queuedAt,
        active: Boolean(item?.queuedAt),
      },
      {
        label: "Accepted",
        value: item?.acceptedAt,
        active: Boolean(item?.acceptedAt),
      },
      {
        label: "Sent",
        value: item?.sentAt,
        active: Boolean(item?.sentAt),
      },
      {
        label: "Delivered",
        value: item?.deliveredAt,
        active: Boolean(item?.deliveredAt),
      },
      {
        label: "Read",
        value: item?.readAt,
        active: Boolean(item?.readAt),
      },
      {
        label: "Replied",
        value: item?.repliedAt,
        active: Boolean(item?.repliedAt),
      },
      {
        label: "Failed",
        value: item?.failedAt,
        active: Boolean(item?.failedAt),
        danger: true,
      },
    ],
    [item]
  );

  const refreshing =
    loading || confirmationDetailsLoading;

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/fast2sms/whatsapp-confirmation-message"
                )
              }
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
            >
              <ArrowLeft size={16} />
              Back to messages
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Fast2SMS Message
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
              Message Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review provider status, order
              confirmation, variables and webhook
              payloads.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshDetails}
            disabled={refreshing || !id}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
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

        {loading && !item ? (
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
              <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
            </div>
          </div>
        ) : !item ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
            <MessageCircle
              size={30}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm font-semibold text-gray-800">
              Message not found
            </p>

            <p className="mt-1 text-sm text-gray-500">
              The message may have been deleted or
              the ID is invalid.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/fast2sms/whatsapp-confirmation-message"
                )
              }
              className="mt-5 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
            >
              Return to Messages
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Order
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-gray-950">
                      {orderNumber}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {getCustomerName(item)} ·{" "}
                      {item?.phone || "—"}
                    </p>
                  </div>

                  <span
                    className={[
                      "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1",
                      STATUS_STYLES[
                      normalizedStatus
                      ] ||
                      "bg-gray-100 text-gray-700 ring-gray-200",
                    ].join(" ")}
                  >
                    <StatusIcon size={14} />
                    {normalizedStatus}
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
              </section>

              <section
                className={[
                  "rounded-2xl p-5 shadow-sm ring-1",
                  confirmationDetails?.isConfirmed
                    ? "bg-green-50 ring-green-100"
                    : "bg-amber-50 ring-amber-100",
                ].join(" ")}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={[
                        "rounded-xl p-2",
                        confirmationDetails?.isConfirmed
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      <ShieldCheck size={18} />
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-gray-950">
                        Order Confirmation
                      </h3>

                      <p
                        className={[
                          "mt-0.5 text-xs font-medium",
                          confirmationDetails?.isConfirmed
                            ? "text-green-700"
                            : "text-amber-700",
                        ].join(" ")}
                      >
                        {confirmationDetailsLoading
                          ? "Checking confirmation status"
                          : confirmationDetails?.isConfirmed
                            ? "Order confirmed successfully"
                            : "Order confirmation pending"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={[
                      "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                      confirmationDetails?.isConfirmed
                        ? "bg-green-600 text-white"
                        : "bg-amber-500 text-white",
                    ].join(" ")}
                  >
                    {confirmationDetails?.isConfirmed
                      ? "Confirmed"
                      : "Pending"}
                  </span>
                </div>

                {confirmationDetailsLoading ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/70 p-4 text-sm text-gray-600 ring-1 ring-white/80">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Fetching confirmation details...
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white/75 px-4 ring-1 ring-white/80">
                    <InfoRow
                      label="Confirmed"
                      value={
                        confirmationDetails?.isConfirmed
                          ? "Yes"
                          : "No"
                      }
                    />

                    <InfoRow
                      label="Confirmed By"
                      value={
                        confirmationDetails?.confirmedBy
                      }
                    />

                    <InfoRow
                      label="Confirmed At"
                      value={
                        confirmationDetails?.confirmedAtIST ||
                        formatDate(
                          confirmationDetails?.confirmedAt
                        )
                      }
                    />

                    <InfoRow
                      label="Payment Method"
                      value={
                        confirmationDetails?.paymentMethod
                      }
                    />

                    <InfoRow
                      label="Fulfillment Status"
                      value={
                        confirmationDetails?.fulfillmentStatus
                      }
                    />

                    <InfoRow
                      label="Cancelled"
                      value={
                        confirmationDetails?.isCancelled
                          ? "Yes"
                          : "No"
                      }
                    />
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Message Information
                </h3>

                <div className="mt-3">
                  <InfoRow
                    label="Database ID"
                    value={item?._id}
                    copyable
                  />

                  <InfoRow
                    label="Template Name"
                    value={
                      item?.templateName ||
                      item?.templateKey
                    }
                  />

                  <InfoRow
                    label="Template Language"
                    value={
                      item?.templateLanguage || "en"
                    }
                  />

                  <InfoRow
                    label="Message Type"
                    value={item?.messageType}
                  />

                  <InfoRow
                    label="Direction"
                    value={item?.direction}
                  />

                  <InfoRow
                    label="Provider Request ID"
                    value={getProviderRequestId(item)}
                    copyable
                  />

                  <InfoRow
                    label="Provider Message ID"
                    value={getProviderMessageId(item)}
                    copyable
                  />

                  <InfoRow
                    label="Failure Reason"
                    value={
                      item?.failureReason ||
                      item?.errorMessage
                    }
                  />

                  <InfoRow
                    label="Notes"
                    value={item?.notes}
                  />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Template Variables
                </h3>

                {Array.isArray(item?.variables) &&
                  item.variables.length ? (
                  <div className="mt-4 space-y-2">
                    {item.variables.map(
                      (value, index) => (
                        <div
                          key={`${index}-${String(
                            value
                          )}`}
                          className="flex items-start gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-950 text-xs font-semibold text-white">
                            {index + 1}
                          </span>

                          <p className="break-all text-sm text-gray-700">
                            {String(value)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    No template variables found.
                  </p>
                )}
              </section>

              {item?.customerReplyText ? (
                <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <h3 className="text-base font-semibold text-gray-950">
                    Customer Reply
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-purple-50 p-4 text-sm leading-6 text-purple-800 ring-1 ring-purple-100">
                    {item.customerReplyText}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    Received{" "}
                    {formatDate(item?.repliedAt)}
                  </p>
                </section>
              ) : null}
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Status Timeline
                </h3>

                <div className="mt-5">
                  {timeline.map(
                    (step, index) => (
                      <TimelineItem
                        key={step.label}
                        {...step}
                        isLast={
                          index ===
                          timeline.length - 1
                        }
                      />
                    )
                  )}
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Customer
                </h3>

                <div className="mt-3">
                  <InfoRow
                    label="Name"
                    value={getCustomerName(item)}
                  />

                  <InfoRow
                    label="Phone"
                    value={item?.phone}
                    copyable
                  />

                  <InfoRow
                    label="Email"
                    value={getCustomerEmail(item)}
                    copyable
                  />

                  <InfoRow
                    label="Customer Code"
                    value={
                      item?.customerId
                        ?.customerCode ||
                      item?.customer?.customerCode
                    }
                  />

                  <InfoRow
                    label="Customer ID"
                    value={
                      item?.customerId?._id ||
                      item?.customerId
                    }
                    copyable
                  />

                  <InfoRow
                    label="Order ID"
                    value={
                      item?.orderId?._id ||
                      item?.orderId
                    }
                    copyable
                  />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Raw Send Response
                </h3>

                <div className="mt-4">
                  <PrettyJson
                    title="Fast2SMS API response"
                    data={
                      item?.rawSendResponse ||
                      item?.providerResponse
                    }
                  />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-semibold text-gray-950">
                  Raw Webhook Payload
                </h3>

                <div className="mt-4">
                  <PrettyJson
                    title="Latest webhook payload"
                    data={
                      item?.rawWebhookPayload ||
                      item?.webhookPayload
                    }
                  />
                </div>
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
