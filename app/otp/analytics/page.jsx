"use client";

import {
  useCallback,
  useEffect,
} from "react";

import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import toast from "react-hot-toast";

import { useOtpStore } from "@/store/otpStore";

const cards = [
  {
    key: "total",
    label: "Total OTPs",
    icon: KeyRound,
    color: "bg-zinc-950 text-white",
  },
  {
    key: "verified",
    label: "Verified",
    icon: CheckCircle2,
    color: "bg-emerald-600 text-white",
  },
  {
    key: "failed",
    label: "Failed",
    icon: ShieldAlert,
    color: "bg-red-500 text-white",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock3,
    color: "bg-amber-500 text-white",
  },
];

const statusColors = {
  pending: "bg-amber-500",
  sent: "bg-blue-500",
  verified: "bg-emerald-500",
  expired: "bg-zinc-400",
  failed: "bg-red-500",
  blocked: "bg-red-700",
  invalidated: "bg-purple-500",
};

const formatLabel = (value) =>
  String(value || "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );

const getCount = (item) =>
  Number(
    item?.count ??
    item?.total ??
    item?.value ??
    0,
  );

const getPercentage = (count, total) => {
  if (!total) return 0;

  return Math.min(
    100,
    Math.round((Number(count) / total) * 100),
  );
};

function BreakdownRow({
  label,
  count,
  total,
  color = "bg-zinc-950",
  icon: Icon,
}) {
  const percentage = getPercentage(
    count,
    total,
  );

  return (
    <div className="rounded-xl bg-zinc-50 p-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <Icon
              size={16}
              className="shrink-0 text-zinc-500"
            />
          )}

          <span className="truncate text-sm font-medium text-zinc-700">
            {label}
          </span>
        </div>

        <span className="shrink-0 font-bold text-zinc-950">
          {count}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <p className="mt-1.5 text-right text-[11px] text-zinc-400">
        {percentage}%
      </p>
    </div>
  );
}

export default function OtpAnalyticsPage() {
  const router = useRouter();

  const {
    analytics,
    loading,
    fetchAnalytics,
  } = useOtpStore();

  const loadAnalytics =
    useCallback(async () => {
      try {
        await fetchAnalytics();
      } catch (error) {
        toast.error(
          error?.message ||
          "Failed to load OTP analytics",
        );
      }
    }, [fetchAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const summary = analytics?.summary || {};

  const total = Number(summary.total || 0);

  const verificationRate = Number(
    summary.verificationRate || 0,
  );

  const averageVerificationSeconds =
    Number(
      summary.averageVerificationSeconds || 0,
    );

  const statusBreakdown =
    analytics?.statusBreakdown || [];

  const purposeBreakdown =
    analytics?.purposeBreakdown || [];

  const channelBreakdown =
    analytics?.channelBreakdown || [];

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
            onClick={loadAnalytics}
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

        <section className="rounded-[24px] border border-zinc-100 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-7">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-zinc-950">
              OTP Analytics
            </h1>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Email and WhatsApp OTP delivery
              and verification performance.
            </p>
          </div>

          {loading && !analytics ? (
            <div className="flex justify-center py-20">
              <Loader2
                size={30}
                className="animate-spin text-zinc-500"
              />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map(
                  ({
                    key,
                    label,
                    icon: Icon,
                    color,
                  }) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${color}`}
                        >
                          <Icon size={18} />
                        </span>

                        <Activity
                          size={16}
                          className="text-zinc-300"
                        />
                      </div>

                      <p className="mt-4 text-xs font-medium text-zinc-500 sm:mt-5 sm:text-sm">
                        {label}
                      </p>

                      <p className="mt-1 text-2xl font-black text-zinc-950 sm:text-3xl">
                        {Number(
                          summary[key] || 0,
                        ).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {/* Performance */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                  <p className="text-sm text-zinc-400">
                    Verification Rate
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {verificationRate}%
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min(
                          100,
                          verificationRate,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-sm text-zinc-500">
                    Average Verification Time
                  </p>

                  <p className="mt-2 text-3xl font-black text-zinc-950">
                    {averageVerificationSeconds}s
                  </p>

                  <p className="mt-2 text-xs text-zinc-400">
                    From delivery to successful
                    verification
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-white p-5 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm text-zinc-500">
                    OTPs Sent Today
                  </p>

                  <p className="mt-2 text-3xl font-black text-zinc-950">
                    {Number(
                      summary.today || 0,
                    ).toLocaleString("en-IN")}
                  </p>

                  <p className="mt-2 text-xs text-zinc-400">
                    Across Email and WhatsApp
                  </p>
                </div>
              </div>

              {/* Channel breakdown */}
              <div className="mt-5 rounded-2xl border border-zinc-100 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-zinc-950">
                      Channel Breakdown
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      OTP requests by delivery
                      channel
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail
                      size={17}
                      className="text-blue-500"
                    />
                    <MessageCircle
                      size={17}
                      className="text-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {channelBreakdown.length ? (
                    channelBreakdown.map(
                      (item) => {
                        const channel =
                          item.channel ||
                          item._id ||
                          "unknown";

                        const isWhatsapp =
                          channel === "whatsapp";

                        return (
                          <BreakdownRow
                            key={channel}
                            label={formatLabel(
                              channel,
                            )}
                            count={getCount(item)}
                            total={total}
                            color={
                              isWhatsapp
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                            }
                            icon={
                              isWhatsapp
                                ? MessageCircle
                                : Mail
                            }
                          />
                        );
                      },
                    )
                  ) : (
                    <p className="text-sm text-zinc-400 sm:col-span-2">
                      No channel data available.
                    </p>
                  )}
                </div>
              </div>

              {/* Breakdowns */}
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-100 p-4 sm:p-5">
                  <h2 className="font-bold text-zinc-950">
                    Status Breakdown
                  </h2>

                  <div className="mt-4 space-y-3">
                    {statusBreakdown.length ? (
                      statusBreakdown.map(
                        (item) => {
                          const status =
                            item.status ||
                            item._id ||
                            "unknown";

                          return (
                            <BreakdownRow
                              key={status}
                              label={formatLabel(
                                status,
                              )}
                              count={getCount(
                                item,
                              )}
                              total={total}
                              color={
                                statusColors[
                                status
                                ] ||
                                "bg-zinc-500"
                              }
                            />
                          );
                        },
                      )
                    ) : (
                      <p className="text-sm text-zinc-400">
                        No status data
                        available.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-4 sm:p-5">
                  <h2 className="font-bold text-zinc-950">
                    Purpose Breakdown
                  </h2>

                  <div className="mt-4 space-y-3">
                    {purposeBreakdown.length ? (
                      purposeBreakdown.map(
                        (item) => {
                          const purpose =
                            item.purpose ||
                            item._id ||
                            "unknown";

                          return (
                            <BreakdownRow
                              key={purpose}
                              label={formatLabel(
                                purpose,
                              )}
                              count={getCount(
                                item,
                              )}
                              total={total}
                              color="bg-zinc-950"
                            />
                          );
                        },
                      )
                    ) : (
                      <p className="text-sm text-zinc-400">
                        No purpose data
                        available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
