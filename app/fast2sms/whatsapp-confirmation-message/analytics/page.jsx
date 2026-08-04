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
  ArrowLeft,
  BarChart3,
  CheckCheck,
  Clock3,
  Eye,
  MessageCircle,
  RefreshCcw,
  Send,
  TrendingUp,
  X,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";

const RANGE_OPTIONS = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "90 Days", value: "90" },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );

const formatPercentage = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0%";
  }

  return `${number.toFixed(1)}%`;
};

const getDateRange = (days) => {
  const toDate = new Date();
  const fromDate = new Date();

  fromDate.setDate(
    fromDate.getDate() - (Number(days) - 1)
  );

  const toInputDate = (date) =>
    date.toISOString().slice(0, 10);

  return {
    fromDate: toInputDate(fromDate),
    toDate: toInputDate(toDate),
  };
};

const getTemplateName = (item) =>
  item?.templateName ||
  item?.templateKey ||
  item?.name ||
  "Unknown Template";

const getTemplateCount = (item) =>
  Number(
    item?.total ||
    item?.count ||
    item?.messages ||
    item?.sent ||
    0
  );

const getDailyCount = (item) =>
  Number(
    item?.total ||
    item?.count ||
    item?.messages ||
    0
  );

const getDailyLabel = (item) => {
  const value =
    item?.date ||
    item?._id ||
    item?.day ||
    item?.label;

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

export default function Fast2SMSAnalyticsPage() {
  const router = useRouter();

  const {
    analytics,
    analyticsLoading,
    error,
    fetchAnalytics,
    clearError,
  } = useWhatsappConfirmationMessageStore();

  const [range, setRange] = useState("30");

  const loadAnalytics = useCallback(async () => {
    const dateRange = getDateRange(range);

    await fetchAnalytics(dateRange);
  }, [fetchAnalytics, range]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const stats = useMemo(
    () => ({
      total: Number(analytics?.total || 0),
      pending: Number(analytics?.pending || 0),
      sent: Number(analytics?.sent || 0),
      delivered: Number(
        analytics?.delivered || 0
      ),
      read: Number(analytics?.read || 0),
      failed: Number(analytics?.failed || 0),
      deliveryRate: Number(
        analytics?.deliveryRate || 0
      ),
      readRate: Number(analytics?.readRate || 0),
    }),
    [analytics]
  );

  const dailyData = useMemo(
    () =>
      Array.isArray(analytics?.daily)
        ? analytics.daily
        : [],
    [analytics?.daily]
  );

  const templateData = useMemo(
    () =>
      Array.isArray(analytics?.templates)
        ? analytics.templates
        : [],
    [analytics?.templates]
  );

  const maxDailyCount = useMemo(
    () =>
      Math.max(
        1,
        ...dailyData.map((item) =>
          getDailyCount(item)
        )
      ),
    [dailyData]
  );

  const maxTemplateCount = useMemo(
    () =>
      Math.max(
        1,
        ...templateData.map((item) =>
          getTemplateCount(item)
        )
      ),
    [templateData]
  );

  const summaryCards = [
    {
      label: "Total Messages",
      value: stats.total,
      icon: MessageCircle,
    },
    {
      label: "Sent",
      value: stats.sent,
      icon: Send,
    },
    {
      label: "Delivered",
      value: stats.delivered,
      icon: CheckCheck,
    },
    {
      label: "Read",
      value: stats.read,
      icon: Eye,
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: AlertCircle,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              Fast2SMS
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
              WhatsApp Analytics
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Track message volume, delivery, reads
              and template performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={range}
              onChange={(event) =>
                setRange(event.target.value)
              }
              className="h-10 rounded-xl bg-white px-3 text-sm font-medium text-gray-700 shadow-sm outline-none ring-1 ring-gray-200"
            >
              {RANGE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  Last {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={
                  analyticsLoading
                    ? "animate-spin"
                    : ""
                }
              />
              {analyticsLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
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
              className="rounded-lg p-1 transition hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {summaryCards.map(
            ({ label, value, icon: Icon }) => (
              <article
                key={label}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-gray-400">
                    {label}
                  </p>

                  <Icon
                    size={16}
                    className="text-gray-400"
                  />
                </div>

                <p className="mt-3 text-2xl font-semibold text-gray-950">
                  {analyticsLoading
                    ? "—"
                    : formatNumber(value)}
                </p>
              </article>
            )
          )}
        </section>

        <section className="mb-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Delivery Rate
                </p>

                <p className="mt-2 text-3xl font-semibold text-gray-950">
                  {analyticsLoading
                    ? "—"
                    : formatPercentage(
                      stats.deliveryRate
                    )}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <CheckCheck size={20} />
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      stats.deliveryRate
                    )
                  )}%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Delivered messages compared with total
              outbound messages.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Read Rate
                </p>

                <p className="mt-2 text-3xl font-semibold text-gray-950">
                  {analyticsLoading
                    ? "—"
                    : formatPercentage(
                      stats.readRate
                    )}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Eye size={20} />
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, stats.readRate)
                  )}%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Read messages compared with delivered
              messages.
            </p>
          </article>
        </section>

        <section className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-950">
                  Daily Message Volume
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Message activity for the selected
                  period.
                </p>
              </div>

              <BarChart3
                size={20}
                className="text-gray-400"
              />
            </div>

            {analyticsLoading ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 7 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="h-8 animate-pulse rounded-lg bg-gray-100"
                    />
                  )
                )}
              </div>
            ) : dailyData.length === 0 ? (
              <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl bg-gray-50 px-4 text-center ring-1 ring-gray-100">
                <BarChart3
                  size={28}
                  className="text-gray-300"
                />

                <p className="mt-3 text-sm font-medium text-gray-700">
                  No daily analytics found
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Daily message data will appear once
                  messages are recorded.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {dailyData.map((item, index) => {
                  const count =
                    getDailyCount(item);

                  const width =
                    (count / maxDailyCount) * 100;

                  return (
                    <div
                      key={
                        item?.date ||
                        item?._id ||
                        index
                      }
                      className="grid grid-cols-[70px_1fr_45px] items-center gap-3"
                    >
                      <p className="text-xs font-medium text-gray-500">
                        {getDailyLabel(item)}
                      </p>

                      <div className="h-7 overflow-hidden rounded-lg bg-gray-100">
                        <div
                          className="flex h-full min-w-1 items-center rounded-lg bg-gray-950 px-2 text-[10px] font-semibold text-white transition-all"
                          style={{
                            width: `${Math.max(
                              2,
                              width
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="text-right text-sm font-semibold text-gray-800">
                        {formatNumber(count)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-950">
                  Status Breakdown
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Current message status distribution.
                </p>
              </div>

              <TrendingUp
                size={20}
                className="text-gray-400"
              />
            </div>

            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Pending",
                  value: stats.pending,
                },
                {
                  label: "Sent",
                  value: stats.sent,
                },
                {
                  label: "Delivered",
                  value: stats.delivered,
                },
                {
                  label: "Read",
                  value: stats.read,
                },
                {
                  label: "Failed",
                  value: stats.failed,
                },
              ].map(({ label, value }) => {
                const percentage = stats.total
                  ? (value / stats.total) * 100
                  : 0;

                return (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-600">
                        {label}
                      </p>

                      <p className="text-sm font-semibold text-gray-900">
                        {formatNumber(value)}
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-950 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              percentage
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950">
                Template Performance
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Message volume grouped by WhatsApp
                template.
              </p>
            </div>

            <MessageCircle
              size={20}
              className="text-gray-400"
            />
          </div>

          {analyticsLoading ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-gray-100"
                  />
                )
              )}
            </div>
          ) : templateData.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-10 text-center ring-1 ring-gray-100">
              <Clock3
                size={28}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 text-sm font-medium text-gray-700">
                No template analytics found
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Template performance will appear once
                messages are sent.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {templateData.map((item, index) => {
                const count =
                  getTemplateCount(item);

                const width =
                  (count / maxTemplateCount) * 100;

                return (
                  <div
                    key={
                      item?.templateName ||
                      item?.templateKey ||
                      item?._id ||
                      index
                    }
                    className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {getTemplateName(item)}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {item?.status ||
                            item?.category ||
                            "WhatsApp template"}
                        </p>
                      </div>

                      <p className="shrink-0 text-lg font-semibold text-gray-950">
                        {formatNumber(count)}
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gray-950 transition-all"
                        style={{
                          width: `${Math.max(
                            2,
                            width
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
