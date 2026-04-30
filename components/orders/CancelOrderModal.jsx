"use client";

import { useState } from "react";
import { X } from "lucide-react";

const CANCEL_REASONS = [
  "Customer requested cancellation",
  "Duplicate order placed",
  "Payment issue / payment not completed",
  "Out of stock / inventory unavailable",
  "Pricing or listing error",
  "Address not serviceable",
  "Customer unreachable",
  "Order flagged as suspicious / fraud",
  "Delayed fulfillment / unable to process",
  "Courier not available for this location",
  "RTO risk (high return probability)",
  "Incorrect product selected by customer",
  "Bulk / test / fake order",
  "Operational issue",
  "Other",
];

export default function CancelOrderModal({
  open,
  order,
  loading,
  onClose,
  onConfirm,
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  if (!open) return null;

  const finalReason =
    selectedReason === "Other" ? customReason : selectedReason;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Cancel order?
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {order?.orderNumber || "This order"} will be cancelled by admin.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="mt-5 max-h-[260px] overflow-y-auto pr-1">
          <p className="mb-3 text-sm font-medium text-neutral-800">
            Select reason (optional)
          </p>

          <div className="space-y-2">
            {CANCEL_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  selectedReason === reason
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="h-4 w-4 accent-black"
                />
                {reason}
              </label>
            ))}
          </div>

          {/* OTHER TEXTAREA */}
          {selectedReason === "Other" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              placeholder="Write custom reason..."
              className="mt-3 w-full resize-none rounded-2xl bg-neutral-50 px-4 py-3 text-sm outline-none ring-1 ring-neutral-100 focus:bg-white focus:ring-neutral-300"
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Skip
          </button>

          <button
            onClick={() => onConfirm(finalReason)}
            disabled={loading}
            className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Cancelling..." : "Cancel order"}
          </button>
        </div>
      </div>
    </div>
  );
}