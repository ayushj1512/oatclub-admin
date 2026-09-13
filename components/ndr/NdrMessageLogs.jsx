// components/ndr/NdrMessageLogs.jsx

"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Search,
  XCircle,
} from "lucide-react";

const statusStyles = {
  sent: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  read: "bg-violet-50 text-violet-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
};

export default function NdrMessageLogs({
  logs = [],
  loading = false,
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((item) => {
      const matchesStatus =
        status === "all" || item.status === status;

      const matchesSearch =
        !query ||
        [
          item.orderNumber,
          item.customerName,
          item.phone,
          item.channel,
          item.message,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );

      return matchesStatus && matchesSearch;
    });
  }, [logs, search, status]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">
            NDR Message Logs
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Track automated WhatsApp and SMS notifications.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search order, customer or phone"
              className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-zinc-400"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Sent at</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-zinc-500"
                    >
                      Loading message logs...
                    </td>
                  </tr>
                ) : filteredLogs.length ? (
                  filteredLogs.map((item) => (
                    <tr
                      key={
                        item._id ||
                        `${item.orderNumber}-${item.sentAt}`
                      }
                      className="hover:bg-zinc-50"
                    >
                      <td className="px-4 py-4 font-medium text-zinc-950">
                        #{item.orderNumber || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-zinc-800">
                          {item.customerName || "—"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.phone || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 capitalize text-zinc-700">
                        {item.channel || "WhatsApp"}
                      </td>

                      <td className="max-w-80 truncate px-4 py-4 text-zinc-600">
                        {item.message || "—"}
                      </td>

                      <td className="px-4 py-4 text-zinc-500">
                        {item.sentAt
                          ? new Date(
                            item.sentAt,
                          ).toLocaleString("en-IN")
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[item.status] ||
                            "bg-zinc-100 text-zinc-600"
                            }`}
                        >
                          {item.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center"
                    >
                      <CheckCircle2
                        size={28}
                        className="mx-auto text-emerald-500"
                      />

                      <p className="mt-3 font-medium text-zinc-800">
                        No message logs found
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Automated NDR messages will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
            <span>{filteredLogs.length} message(s)</span>

            <span className="flex items-center gap-1">
              {status === "failed" ? (
                <XCircle size={14} />
              ) : (
                <Clock3 size={14} />
              )}
              Communication history
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
