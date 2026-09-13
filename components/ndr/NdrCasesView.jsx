// components/ndr/NdrCasesView.jsx

"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Search,
} from "lucide-react";

const statusStyles = {
  open: "bg-amber-50 text-amber-700",
  awaiting_customer: "bg-blue-50 text-blue-700",
  action_submitted: "bg-violet-50 text-violet-700",
  resolved: "bg-emerald-50 text-emerald-700",
  escalated: "bg-red-50 text-red-700",
};

const formatStatus = (value = "") =>
  value.replaceAll("_", " ");

export default function NdrCasesView({
  title = "All NDR Cases",
  description = "Manage failed delivery cases",
  provider = "",
  cases = [],
  loading = false,
  onOpen,
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cases.filter((item) => {
      const matchesProvider =
        !provider ||
        item.provider?.toLowerCase() ===
        provider.toLowerCase();

      const matchesStatus =
        status === "all" || item.status === status;

      const matchesSearch =
        !query ||
        [
          item.orderNumber,
          item.waybill,
          item.customerName,
          item.phone,
          item.ndrReason,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );

      return (
        matchesProvider &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [cases, provider, search, status]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">
            {title}
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            {description}
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
              placeholder="Search order, AWB, customer or reason"
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
            <option value="open">Open</option>
            <option value="awaiting_customer">
              Awaiting customer
            </option>
            <option value="action_submitted">
              Action submitted
            </option>
            <option value="escalated">
              Escalated
            </option>
            <option value="resolved">
              Resolved
            </option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Courier / AWB</th>
                  <th className="px-4 py-3">NDR reason</th>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-zinc-500"
                    >
                      Loading NDR cases...
                    </td>
                  </tr>
                ) : filteredCases.length ? (
                  filteredCases.map((item) => (
                    <tr
                      key={
                        item._id ||
                        `${item.orderNumber}-${item.waybill}`
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

                      <td className="px-4 py-4">
                        <p className="capitalize text-zinc-800">
                          {item.provider || "—"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.w.waybill || "—"}
                        </p>
                      </td>

                      <td className="max-w-64 px-4 py-4 text-zinc-600">
                        {item.ndrReason || "—"}
                      </td>

                      <td className="px-4 py-4">
                        {item.attemptCount || 1}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[item.status] ||
                            "bg-zinc-100 text-zinc-600"
                            }`}
                        >
                          {formatStatus(
                            item.status || "open",
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onOpen?.(item)}
                          className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center"
                    >
                      <CheckCircle2
                        size={28}
                        className="mx-auto text-emerald-500"
                      />

                      <p className="mt-3 font-medium text-zinc-800">
                        No NDR cases found
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Failed delivery cases will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
            <span>
              {filteredCases.length} case(s)
            </span>

            <span className="flex items-center gap-1">
              {status === "escalated" ? (
                <AlertTriangle size={14} />
              ) : (
                <Clock3 size={14} />
              )}
              Live NDR queue
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
