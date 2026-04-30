"use client";

import { useEffect, useMemo } from "react";
import { BarChart3, Clock3, Sparkles } from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";

export default function Fast2SMSAnalyticsPage() {
  const { messages, fetchMessages } =
    useWhatsappConfirmationMessageStore();

  useEffect(() => {
    fetchMessages(1, 50); // light fetch for preview stats
  }, []);

  const stats = useMemo(() => {
    return messages.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.sent += item.status === "sent" ? 1 : 0;
        acc.delivered += item.status === "delivered" ? 1 : 0;
        acc.read += item.status === "read" ? 1 : 0;
        acc.failed += item.status === "failed" ? 1 : 0;
        return acc;
      },
      { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
    );
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Fast2SMS
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Message performance insights (coming soon)
        </p>
      </div>

      {/* STATS PREVIEW */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Total", stats.total],
          ["Sent", stats.sent],
          ["Delivered", stats.delivered],
          ["Read", stats.read],
          ["Failed", stats.failed],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-950">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* COMING SOON */}
      <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 rounded-2xl bg-gray-100 p-4 text-gray-700">
          <BarChart3 size={28} />
        </div>

        <h2 className="text-xl font-semibold text-gray-950">
          Advanced Analytics Coming Soon
        </h2>

        <p className="mt-2 max-w-md text-sm text-gray-500">
          Delivery rates, read rates, template performance and customer
          engagement insights will be available here.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            "Delivery %",
            "Read %",
            "Failure reasons",
            "Template performance",
            "Timeline trends",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
          <Clock3 size={14} />
          Work in progress
        </div>

        <div className="mt-4 flex items-center gap-1 text-xs text-gray-500">
          <Sparkles size={14} />
          Will integrate with real-time webhook data
        </div>
      </div>
    </div>
  );
}