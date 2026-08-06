"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Search,
  XCircle,
} from "lucide-react";

const demoLogs = [
  {
    id: 1,
    type: "Shipment Booking",
    reference: "000101",
    status: "success",
    message: "Shipment booked successfully",
    createdAt: "2026-08-05 12:40 PM",
  },
  {
    id: 2,
    type: "Tracking",
    reference: "123456789012",
    status: "success",
    message: "Tracking details fetched",
    createdAt: "2026-08-05 12:28 PM",
  },
  {
    id: 3,
    type: "Pickup",
    reference: "OATCLUB",
    status: "failed",
    message: "Pickup request rejected",
    createdAt: "2026-08-05 11:55 AM",
  },
];

export default function DelhiveryLogsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return demoLogs.filter((log) => {
      const matchesSearch =
        !query ||
        log.type.toLowerCase().includes(query) ||
        log.reference.toLowerCase().includes(query) ||
        log.message.toLowerCase().includes(query);

      const matchesStatus =
        status === "all" || log.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/delhivery")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Delhivery
        </button>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <ClipboardList size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Delhivery Logs
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Review shipment booking, tracking and pickup activity.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-4">
              <Search size={17} className="text-zinc-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search logs"
                className="w-full py-3 text-sm outline-none"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Message
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Time
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-4 text-sm font-semibold text-zinc-950">
                      {log.type}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-600">
                      {log.reference}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-600">
                      {log.message}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={log.status} />
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-500">
                      {log.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredLogs.length && (
            <div className="px-6 py-14 text-center">
              <ClipboardList
                size={28}
                className="mx-auto text-zinc-300"
              />

              <p className="mt-3 text-sm font-medium text-zinc-500">
                No logs found.
              </p>
            </div>
          )}
        </section>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo data is being shown. Connect this page to a Delhivery log API
          after backend logging is added.
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }) {
  const success = status === "success";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        success
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700",
      ].join(" ")}
    >
      {success ? (
        <CheckCircle2 size={14} />
      ) : (
        <XCircle size={14} />
      )}

      {success ? "Success" : "Failed"}
    </span>
  );
}
