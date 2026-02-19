"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useCustomerTicketStore } from "@/store/customerTicketStore";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const safe = (v) => String(v ?? "").trim();
const upper = (v) => safe(v).toUpperCase();

const statusClass = (st) => {
  if (st === "OPEN") return "bg-blue-50 text-blue-700 border-blue-200";
  if (st === "IN_PROGRESS") return "bg-amber-50 text-amber-700 border-amber-200";
  if (st === "RESOLVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (st === "CLOSED") return "bg-gray-100 text-gray-700 border-gray-300";
  return "bg-white text-gray-800 border-gray-200";
};

export default function StatusDropdown({ ticketId, value, adminNotes = "" }) {
  const updateTicketStatus = useCustomerTicketStore((s) => s.updateTicketStatus);

  const initial = useMemo(() => {
    const v = upper(value);
    return STATUSES.includes(v) ? v : "OPEN";
  }, [value]);

  const [status, setStatus] = useState(initial);
  const [saving, setSaving] = useState(false);

  const lastStable = useRef(initial);

  useEffect(() => {
    setStatus(initial);
    lastStable.current = initial;
  }, [initial]);

  const onChange = async (e) => {
    const next = upper(e.target.value);
    const id = safe(ticketId);
    if (!id) return;

    // optimistic
    setStatus(next);
    setSaving(true);

    try {
      await updateTicketStatus({
        ticketId: id,
        status: next,
        adminNotes: safe(adminNotes),
      });
      lastStable.current = next;
      toast.success("Status updated");
    } catch (err) {
      // rollback if store throws
      setStatus(lastStable.current || initial);
      toast.error(err?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const disabled = !safe(ticketId) || saving;

  return (
    <select
      value={status}
      onChange={onChange}
      disabled={disabled}
      className={`h-9 rounded-xl border px-3 text-xs font-semibold outline-none transition disabled:opacity-60 ${saving ? "cursor-wait" : ""
        } ${statusClass(status)}`}
      title={saving ? "Updating…" : "Change status"}
    >
      {STATUSES.map((st) => (
        <option key={st} value={st} className="text-gray-900 bg-white">
          {st.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
