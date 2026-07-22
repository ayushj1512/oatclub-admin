"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  KeyRound,
  ListFilter,
  MailCheck,
} from "lucide-react";

const modules = [
  {
    title: "Test OTP",
    description: "Send and verify an OTP using any email address.",
    route: "/otp/test",
    icon: MailCheck,
  },
  {
    title: "OTP Logs",
    description: "Search, filter and inspect OTP delivery logs.",
    route: "/otp/logs",
    icon: ListFilter,
  },
  {
    title: "OTP Analytics",
    description: "Monitor verification rate, failures and usage.",
    route: "/otp/analytics",
    icon: BarChart3,
  },
];

export default function OtpDashboardPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[28px] bg-zinc-950 p-6 text-white sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
              <KeyRound size={22} />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                OATCLUB Security
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight">
                OTP & Verification
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-300">
            Send test OTPs, verify delivery and monitor customer verification
            activity from one workspace.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <Activity size={14} />
            OTP service active
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {modules.map(({ title, description, route, icon: Icon }) => (
            <button
              key={route}
              type="button"
              onClick={() => router.push(route)}
              className="group rounded-3xl border border-zinc-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-zinc-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Icon size={19} />
                </span>

                <ArrowRight
                  size={18}
                  className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-black"
                />
              </div>

              <h2 className="mt-5 text-lg font-bold text-zinc-950">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}