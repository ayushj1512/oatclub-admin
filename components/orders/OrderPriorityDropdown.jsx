"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const PRIORITY_LABELS = { normal: "Normal", medium: "Medium", high: "High" };
const PRIORITY_BADGE = {
  normal: "bg-sky-50 text-sky-700 border border-sky-100",
  medium: "bg-amber-50 text-amber-700 border border-amber-100",
  high: "bg-rose-50 text-rose-700 border border-rose-100",
};

const norm = (v) => {
  const p = String(v ?? "").trim().toLowerCase();
  return ["normal", "medium", "high"].includes(p) ? p : "normal";
};

export default function OrderPriorityDropdown({
  orderId,
  currentPriority = "normal",
  onUpdated,
  compact = true,
  disabled = false,
}) {
  // ✅ IMPORTANT: use updateOrder (PATCH /api/orders/:id)
  const updateOrder = useOrderStore((s) => s.updateOrder);

  const [draft, setDraft] = useState(norm(currentPriority));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(norm(currentPriority));
  }, [currentPriority, saving]);

  const ui = useMemo(() => {
    const key = norm(draft);
    return { key, cls: PRIORITY_BADGE[key], label: PRIORITY_LABELS[key] };
  }, [draft]);

  const save = async (next) => {
    if (!orderId || saving || disabled) return;
    const v = norm(next);
    if (v === norm(currentPriority)) return;

    try {
      setSaving(true);
      const updated = await updateOrder(orderId, { priority: v });

      // ✅ normalize (in case backend returns {order: {...}})
      const finalOrder = updated?.order ?? updated;
      onUpdated?.(finalOrder);
    } catch (e) {
      alert(e?.message || "Priority update failed");
      setDraft(norm(currentPriority));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={[
        "inline-flex items-center rounded-full border overflow-hidden",
        compact ? "h-6" : "h-7",
        ui.cls,
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
      title="Priority"
    >
      <select
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          save(next);
        }}
        disabled={disabled || saving}
        className={[
          "bg-transparent outline-none font-semibold",
          compact ? "px-2 text-[11px]" : "px-3 text-xs",
          "appearance-none cursor-pointer",
        ].join(" ")}
      >
        <option value="normal">Priority: Normal</option>
        <option value="medium">Priority: Medium</option>
        <option value="high">Priority: High</option>
      </select>

      {saving ? (
        <span className="px-2">
          <Loader2 size={14} className="animate-spin" />
        </span>
      ) : null}
    </div>
  );
}
