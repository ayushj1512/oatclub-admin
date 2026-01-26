"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Ticket, Loader2, AlertCircle } from "lucide-react";
import { useCustomerTicketStore } from "@/store/customerTicketStore";

const safe = (v) => String(v ?? "").trim();
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

function StatusPill({ status }) {
  const s = safe(status).toUpperCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  if (s === "OPEN")
    return <span className={`${base} bg-blue-50 text-blue-700 ring-blue-200`}>OPEN</span>;
  if (s === "IN_PROGRESS")
    return <span className={`${base} bg-amber-50 text-amber-700 ring-amber-200`}>IN PROGRESS</span>;
  if (s === "RESOLVED")
    return <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-200`}>RESOLVED</span>;
  if (s === "CLOSED")
    return <span className={`${base} bg-gray-100 text-gray-700 ring-gray-200`}>CLOSED</span>;

  return <span className={`${base} bg-gray-100 text-gray-700 ring-gray-200`}>{s || "—"}</span>;
}

export default function SupportTicketSection({ customerEmail }) {
  const {
    tickets,
    total,
    loading,
    error,
    fetchTicketsByEmail,
  } = useCustomerTicketStore();

  useEffect(() => {
    if (!customerEmail) return;
    fetchTicketsByEmail({ email: customerEmail, limit: 50 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerEmail]);

  const card =
    "bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all";

  return (
    <div className={card}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Support Tickets
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Loaded by email:{" "}
            <span className="font-semibold">{customerEmail || "—"}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/customer-support/search"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 transition"
          >
            Open Search <ExternalLink className="h-4 w-4" />
          </Link>

          <button
            onClick={() =>
              fetchTicketsByEmail({ email: customerEmail, limit: 50 })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin w-4 h-4" />
          Loading tickets…
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-gray-600 text-sm">
          No support tickets found for this customer.
        </p>
      ) : (
        <div className="space-y-3">
          {/* META */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing <span className="font-semibold">{tickets.length}</span>{" "}
              tickets
            </span>
            <span>
              Total: <span className="font-semibold">{total}</span>
            </span>
          </div>

          {/* LIST */}
          {tickets.map((t) => (
            <div
              key={t.ticketId}
              className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700">
                    {t.ticketId}
                  </p>
                  <p className="font-semibold text-gray-900 line-clamp-1">
                    {safe(t.subject) || "(No subject)"}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {safe(t.issueType) || "-"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                      Created: {fmtDate(t.createdAt)}
                    </span>

                    {safe(t.orderId) && (
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                        Order: {safe(t.orderId)}
                      </span>
                    )}

                    {Array.isArray(t.attachments) && t.attachments.length > 0 && (
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                        Attachments: {t.attachments.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                  <StatusPill status={t.status} />
                  <Link
                    href={`/customer-support/${encodeURIComponent(
                      safe(t.ticketId)
                    )}`}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition"
                  >
                    View <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
