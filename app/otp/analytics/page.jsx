"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

import { useOtpStore } from "@/store/otpStore";

const cards = [
  {
    key: "total",
    label: "Total OTPs",
    icon: KeyRound,
  },
  {
    key: "verified",
    label: "Verified",
    icon: CheckCircle2,
  },
  {
    key: "failed",
    label: "Failed",
    icon: ShieldAlert,
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock3,
  },
];

export default function OtpAnalyticsPage() {
  const router = useRouter();

  const {
    analytics,
    loading,
    fetchAnalytics,
  } = useOtpStore();

  useEffect(() => {
    fetchAnalytics().catch((error) => {
      toast.error(error?.message || "Failed to load OTP analytics");
    });
  }, [fetchAnalytics]);

  const summary = analytics?.summary || {};

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => router.push("/otp")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-black"
        >
          <ArrowLeft size={17} />
          Back to OTP
        </button>

        <section className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h1 className="text-2xl font-black text-zinc-950">
              OTP Analytics
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              OTP delivery and verification performance.
            </p>
          </div>

          {loading && !analytics ? (
            <div className="flex justify-center py-20">
              <Loader2 size={30} className="animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map(({ key, label, icon: Icon }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                        <Icon size={18} />
                      </span>

                      <Activity size={17} className="text-zinc-400" />
                    </div>

                    <p className="mt-5 text-sm font-medium text-zinc-500">
                      {label}
                    </p>

                    <p className="mt-1 text-3xl font-black text-zinc-950">
                      {summary[key] || 0}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                  <p className="text-sm text-zinc-400">
                    Verification Rate
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {summary.verificationRate || 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-5">
                  <p className="text-sm text-zinc-500">
                    Average Verification Time
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {summary.averageVerificationSeconds || 0}s
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-5">
                  <p className="text-sm text-zinc-500">
                    OTPs Sent Today
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {summary.today || 0}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-100 p-5">
                  <h2 className="font-bold text-zinc-950">
                    Status Breakdown
                  </h2>

                  <div className="mt-4 space-y-3">
                    {(analytics?.statusBreakdown || []).map((item) => (
                      <div
                        key={item.status}
                        className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
                      >
                        <span className="text-sm font-medium capitalize">
                          {item.status}
                        </span>

                        <span className="font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-5">
                  <h2 className="font-bold text-zinc-950">
                    Purpose Breakdown
                  </h2>

                  <div className="mt-4 space-y-3">
                    {(analytics?.purposeBreakdown || []).map((item) => (
                      <div
                        key={item.purpose}
                        className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
                      >
                        <span className="text-sm font-medium capitalize">
                          {String(item.purpose).replaceAll("_", " ")}
                        </span>

                        <span className="font-bold">{item.count}</span>
                      </div>
                    ))}
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