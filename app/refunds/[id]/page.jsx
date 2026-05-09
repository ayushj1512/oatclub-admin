"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const money = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const date = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

const nice = (v) => String(v || "—").replaceAll("_", " ");

export default function RefundDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const refundId = params?.id;

  const {
    selectedRefund,
    actionLoading,
    error,
    fetchRefundById,
    processRazorpayRefund,
    fetchRazorpayRefundStatus,
    markManualRefundProcessed,
    clearError,
  } = useOrderRefundStore();

  const [localError, setLocalError] = useState("");
  const [manualForm, setManualForm] = useState({
    utr: "",
    transactionId: "",
    paidFrom: "",
    paidTo: "",
    handledByName: "",
  });

  const refund = selectedRefund;
  const isRazorpay = refund?.paymentMethod === "razorpay";
  const isManual = refund?.refundMode === "manual";
  const isProcessed = refund?.status === "processed";
  const canProcessRazorpay =
    isRazorpay && !isProcessed && refund?.razorpay?.paymentId;

  const loadRefund = async () => {
    if (!refundId) return;
    clearError();
    setLocalError("");
    await fetchRefundById(refundId);
  };

  useEffect(() => {
    loadRefund();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundId]);

  const handleProcessRazorpay = async () => {
    if (!refundId) return;

    const data = await processRazorpayRefund(refundId, {
      speed: "normal",
      notes: {
        source: "admin_refund_details_page",
      },
    });

    if (!data) {
      setLocalError("Razorpay refund process failed.");
      return;
    }

    await fetchRefundById(refundId);
  };

  const handleSyncRazorpay = async () => {
    if (!refundId) return;

    const data = await fetchRazorpayRefundStatus(refundId);

    if (!data) {
      setLocalError(
        "Could not sync status. Razorpay refund may not be initiated yet."
      );
      return;
    }

    await fetchRefundById(refundId);
  };

  const handleManualProcessed = async () => {
    if (!refundId) return;

    const data = await markManualRefundProcessed(refundId, {
      ...manualForm,
      customerMessage: "Your refund has been processed successfully.",
    });

    if (!data) {
      setLocalError("Manual refund update failed.");
      return;
    }

    await fetchRefundById(refundId);
  };

  if (!refund && actionLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Loading refund...
        </div>
      </main>
    );
  }

  if (!refund) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-4 py-6 md:px-6">
        <button
          onClick={() => router.push("/refunds/list")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={26} />
          <h1 className="text-lg font-semibold text-gray-950">
            Refund not found
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please check if this refund exists.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-6 md:px-6">
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => router.push("/refunds/list")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to refunds
        </button>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Refund Details
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              {refund?.refundNumber || "Refund"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Order {refund?.orderNumber || "—"} · {nice(refund?.paymentMethod)}
            </p>
          </div>

          <StatusBadge status={refund?.status} />
        </div>
      </section>

      {(error || localError) && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={17} />
          {error || localError}
        </div>
      )}

      {isProcessed && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />
          Refund already processed.
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Refund Summary
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Info label="Amount" value={money(refund?.amount)} />
            <Info label="Status" value={nice(refund?.status)} />
            <Info label="Mode" value={nice(refund?.refundMode)} />
            <Info label="Method" value={nice(refund?.refundMethod)} />
            <Info label="Payment Method" value={nice(refund?.paymentMethod)} />
            <Info label="Type" value={nice(refund?.refundType)} />
            <Info label="Created" value={date(refund?.createdAt)} />
            <Info label="Processed" value={date(refund?.processedAt)} />
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Reason
            </p>
            <p className="mt-1 text-sm text-gray-700">
              {refund?.reason || "—"}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Actions
          </h2>

          {isRazorpay ? (
            <div className="space-y-3">
              <Info
                label="Razorpay Payment ID"
                value={refund?.razorpay?.paymentId || "—"}
              />
              <Info
                label="Razorpay Refund ID"
                value={refund?.razorpay?.refundId || "Not initiated"}
              />

              <button
                onClick={handleProcessRazorpay}
                disabled={actionLoading || !canProcessRazorpay}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Process Razorpay Refund
              </button>

              <button
                onClick={handleSyncRazorpay}
                disabled={actionLoading || !refund?.razorpay?.refundId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCcw size={16} />
                )}
                Sync Razorpay Status
              </button>

              {!refund?.razorpay?.paymentId && (
                <p className="rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                  Razorpay paymentId missing. Actual Razorpay refund cannot be
                  processed without paymentId.
                </p>
              )}
            </div>
          ) : isManual ? (
            <div className="space-y-3">
              <ManualInput
                label="UTR"
                value={manualForm.utr}
                onChange={(v) => setManualForm((p) => ({ ...p, utr: v }))}
              />
              <ManualInput
                label="Transaction ID"
                value={manualForm.transactionId}
                onChange={(v) =>
                  setManualForm((p) => ({ ...p, transactionId: v }))
                }
              />
              <ManualInput
                label="Paid From"
                value={manualForm.paidFrom}
                onChange={(v) => setManualForm((p) => ({ ...p, paidFrom: v }))}
              />
              <ManualInput
                label="Paid To"
                value={manualForm.paidTo}
                onChange={(v) => setManualForm((p) => ({ ...p, paidTo: v }))}
              />
              <ManualInput
                label="Handled By"
                value={manualForm.handledByName}
                onChange={(v) =>
                  setManualForm((p) => ({ ...p, handledByName: v }))
                }
              />

              <button
                onClick={handleManualProcessed}
                disabled={actionLoading || isProcessed}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Mark Manual Refund Processed
              </button>
            </div>
          ) : (
            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
              No action available for this refund.
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 text-base font-semibold text-gray-950">
          Proofs
        </h2>

        {refund?.proofs?.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {refund.proofs.map((proof, index) => (
              <a
                key={`${proof?.url}-${index}`}
                href={proof?.url}
                target="_blank"
                className="overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100"
              >
                <img
                  src={proof?.url}
                  alt="Refund proof"
                  className="h-36 w-full object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            No proof uploaded.
          </div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-950">
        {value || "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();

  const cls =
    s === "processed"
      ? "bg-emerald-50 text-emerald-700"
      : s === "failed"
      ? "bg-red-50 text-red-700"
      : s === "processing"
      ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}
    >
      {nice(status)}
    </span>
  );
}

function ManualInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
      />
    </label>
  );
}