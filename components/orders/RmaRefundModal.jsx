"use client";

import { Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";

const money = (v) =>
  Number(v || 0).toLocaleString("en-IN");

export default function RmaRefundModal({
  rma,
  open,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [deduct100, setDeduct100] = useState(true);

  const eligibleAmount = useMemo(
    () =>
      Number(
        rma?.refundEligibleAmount ||
        rma?.refund?.amount ||
        0
      ),
    [rma]
  );

  const deduction = deduct100
    ? Math.min(100, eligibleAmount)
    : 0;

  const refundAmount = Math.max(
    0,
    eligibleAmount - deduction
  );

  if (!open || !rma) return null;

  const handleRefund = async () => {
    try {
      setLoading(true);

      const API =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "";

      const res = await fetch(
        `${API}/api/orders/${rma.orderId}/rma/${encodeURIComponent(
          rma.rmaNumber
        )}/refund-credit`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deduction,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || "Refund failed"
        );
      }

      await onSuccess?.(data);
      onClose();

      alert(
        data?.message ||
        "Refund completed"
      );
    } catch (err) {
      alert(
        err?.message ||
        "Refund failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Process Refund
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {rma.rmaNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Eligible Amount
            </span>

            <b>₹{money(eligibleAmount)}</b>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="mb-2 text-xs font-semibold text-gray-700">
              Return Deduction
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeduct100(false)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${!deduct100
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-700"
                  }`}
              >
                No Deduction
              </button>

              <button
                type="button"
                onClick={() => setDeduct100(true)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${deduct100
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-700"
                  }`}
              >
                Deduct ₹100
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Deduction
            </span>

            <b className="text-red-600">
              - ₹{money(deduction)}
            </b>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-base">
              <span className="font-medium">
                Wallet Credit
              </span>

              <b className="text-emerald-700">
                ₹{money(refundAmount)}
              </b>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
          Customer will receive ₹{money(refundAmount)} as OATCLUB credit.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleRefund}
            disabled={
              loading ||
              refundAmount <= 0
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading && (
              <Loader2
                size={15}
                className="animate-spin"
              />
            )}

            Credit ₹{money(refundAmount)}
          </button>
        </div>
      </div>
    </div>
  );
}
