"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const norm = (value) =>
  String(value || "").trim().toLowerCase();

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function RmaRefundModal({
  rma,
  open,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [deduct100, setDeduct100] = useState(true);
  const [error, setError] = useState("");
  const [credited, setCredited] = useState(false);

  const submitting = useRef(false);

  useEffect(() => {
    if (!open) return;

    setDeduct100(true);
    setError("");
    setCredited(false);
  }, [open, rma?.orderId, rma?.rmaNumber]);

  const reverse = rma?.reverseShipment || {};

  const pickupCompleted =
    rma?.returnPickupCompleted === true ||
    Boolean(reverse.pickedAt) ||
    ["picked", "in_transit", "received"].includes(
      norm(reverse.status)
    );

  const isRefunded =
    credited ||
    rma?.isRefunded === true ||
    norm(rma?.refund?.status) === "completed";

  const refundInProgress = ["pending", "processing"].includes(
    norm(rma?.refund?.status)
  );

  const isEligible =
    norm(rma?.type) === "return" &&
    rma?.isApproved === true &&
    rma?.isFulfilled !== true &&
    (rma?.eligibleForRefund === true || pickupCompleted);

  const rawAmount = Number(
    rma?.refundEligibleAmount ??
    rma?.refund?.amount ??
    0
  );

  const eligibleAmount =
    Number.isFinite(rawAmount) && rawAmount > 0
      ? Math.round(rawAmount * 100) / 100
      : 0;

  const deduction = deduct100
    ? Math.min(100, eligibleAmount)
    : 0;

  const refundAmount =
    Math.round(
      Math.max(0, eligibleAmount - deduction) * 100
    ) / 100;

  const canRefund =
    isEligible &&
    !isRefunded &&
    !refundInProgress &&
    refundAmount > 0 &&
    Boolean(rma?.orderId && rma?.rmaNumber);

  if (!open || !rma) return null;

  const handleRefund = async () => {
    if (submitting.current || !canRefund) return;

    submitting.current = true;
    setLoading(true);
    setError("");

    let data;

    try {
      const API = (
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        ""
      ).replace(/\/+$/, "");

      const response = await fetch(
        `${API}/api/orders/${encodeURIComponent(
          rma.orderId
        )}/rma/${encodeURIComponent(
          rma.rmaNumber
        )}/refund-credit`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          // Backend calculates and validates the final credit.
          body: JSON.stringify({ deduction }),
        }
      );

      data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
          `Refund request failed (${response.status}).`
        );
      }

      if (!data) {
        throw new Error(
          "Could not read the refund response. Refresh this RMA to verify before retrying."
        );
      }

      setCredited(true);
    } catch (err) {
      setError(err?.message || "Refund failed.");
      submitting.current = false;
      setLoading(false);
      return;
    }

    // A refresh failure must not be reported as a failed credit.
    try {
      await onSuccess?.(data);
      onClose?.();

      alert(
        data?.message ||
        "Wallet credit completed. You can now mark the RMA fulfilled."
      );
    } catch {
      setError(
        "Credit request succeeded, but the row could not refresh. Reload and verify the refund status before marking fulfilled."
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const notice = isRefunded
    ? "This RMA has already been credited."
    : refundInProgress
      ? "A refund is already pending or processing."
      : !isEligible
        ? "Refund requires an approved return with pickup completed or existing refund eligibility."
        : eligibleAmount <= 0
          ? "Refund eligible amount is missing or zero. Check the backend amount calculation."
          : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rma-refund-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="rma-refund-title"
              className="text-lg font-semibold text-gray-950"
            >
              Process Credit Refund
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {rma.rmaNumber}
            </p>

            {pickupCompleted && (
              <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                ✓ Pickup completed
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label="Close refund modal"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-50"
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
              {[
                { value: false, label: "No Deduction" },
                { value: true, label: "Deduct ₹100" },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  disabled={
                    loading || isRefunded || refundInProgress
                  }
                  onClick={() => setDeduct100(value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${deduct100 === value
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Deduction</span>
            <b className="text-red-600">
              - ₹{money(deduction)}
            </b>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-base">
              <span className="font-medium">Wallet Credit</span>
              <b className="text-emerald-700">
                ₹{money(refundAmount)}
              </b>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
          Customer will receive ₹{money(refundAmount)} as
          OATCLUB wallet credit. After completion, mark the
          RMA fulfilled manually.
        </div>

        {notice && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            {notice}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isRefunded ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleRefund}
            disabled={loading || !canRefund}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <Loader2 size={15} className="animate-spin" />
            )}

            {loading
              ? "Processing..."
              : isRefunded
                ? "Credited"
                : `Credit ₹${money(refundAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
