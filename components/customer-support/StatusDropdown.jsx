"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomerTicketStore } from "@/store/customerTicketStore";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const safe = (v) => String(v ?? "").trim();
const upper = (v) => safe(v).toUpperCase();

const statusClass = (status) => {
  if (status === "OPEN") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "IN_PROGRESS") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "RESOLVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "CLOSED") return "bg-gray-100 text-gray-700 border-gray-300";
  return "bg-white text-gray-800 border-gray-200";
};

export default function StatusDropdown({ ticketId, value, adminNotes = "" }) {
  const updateTicketStatus = useCustomerTicketStore((s) => s.updateTicketStatus);
  const loading = useCustomerTicketStore((s) => s.loading);

  const initial = useMemo(() => (STATUSES.includes(upper(value)) ? upper(value) : "OPEN"), [value]);
  const [status, setStatus] = useState(initial);

  useEffect(() => { setStatus(initial); }, [initial]);

  const onChange = async (e) => {
    const next = upper(e.target.value);
    setStatus(next);
    await updateTicketStatus({ ticketId: safe(ticketId), status: next, adminNotes: safe(adminNotes) });
  };

  return (
    <select
      value={status}
      onChange={onChange}
      disabled={!safe(ticketId) || loading}
      className={`h-9 rounded-xl border px-3 text-xs font-semibold outline-none transition disabled:opacity-60 ${statusClass(status)}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="text-gray-900 bg-white">
          {s.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
