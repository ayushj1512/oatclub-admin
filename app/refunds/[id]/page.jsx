"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileImage,
  RefreshCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const nice = (v) => String(v || "—").replaceAll("_", " ");

const date = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const statusClass = (status) => {
  const map = {
    processed: "bg-emerald-50 text-emerald-700",
    processing: "bg-blue-50 text-blue-700",
    approved: "bg-purple-50 text-purple-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
    manual_required: "bg-amber-50 text-amber-700",
    created: "bg-gray-50 text-gray-700",
  };

  return map[status] || "bg-gray-50 text-gray-600";
};

const Info = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-gray-950">
      {value || "—"}
    </p>
  </div>
);

export default function RefundDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const fetchRefund = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axios.get(`${API}/api/admin/refunds/${id}`, {
        withCredentials: true,
      });

      setRefund(data?.refund || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch refund");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRefund();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patchAction = async (path, label) => {
    try {
      setActionLoading(label);
      await axios.patch(
        `${API}/api/admin/refunds/${id}/${path}`,
        {},
        { withCredentials: true }
      );
      await fetchRefund();
    } catch (err) {
      alert(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const processRazorpayRefund = async () => {
    try {
      setActionLoading("process");
      await axios.post(
        `${API}/api/razorpay/admin/refunds/${id}/process`,
        { speed: "normal" },
        { withCredentials: true }
      );
      await fetchRefund();
    } catch (err) {
      alert(err?.response?.data?.message || "Razorpay refund failed");
    } finally {
      setActionLoading("");
    }
  };

  const syncRazorpayStatus = async () => {
    try {
      setActionLoading("sync");
      await axios.get(`${API}/api/razorpay/admin/refunds/${id}/status`, {
        withCredentials: true,
      });
      await fetchRefund();
    } catch (err) {
      alert(err?.response?.data?.message || "Status sync failed");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading refund...
        </div>
      </main>
    );
  }

  if (error || !refund) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-3xl bg-white p-8 text-center text-red-600 shadow-sm ring-1 ring-gray-100">
          {error || "Refund not found"}
        </div>
      </main>
    );
  }

  const isRazorpay =
    refund.paymentMethod === "razorpay" &&
    refund.refundMethod === "razorpay_source";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => router.push("/refunds/list")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-950"
        >
          <ArrowLeft size={16} />
          Back to refunds
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Refund Details
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              {refund.refundNumber || "Refund"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Linked order: {refund.orderNumber || "—"}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusClass(
              refund.status
            )}`}
          >
            {nice(refund.status)}
          </span>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Info label="Amount" value={money(refund.amount)} />
        <Info label="Payment Method" value={nice(refund.paymentMethod)} />
        <Info label="Refund Mode" value={nice(refund.refundMode)} />
        <Info label="Refund Method" value={nice(refund.refundMethod)} />
      </section>

      <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Refund information
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Info label="Refund Type" value={nice(refund.refundType)} />
            <Info label="Created At" value={date(refund.createdAt)} />
            <Info label="Approved At" value={date(refund.approvedAt)} />
            <Info label="Processed At" value={date(refund.processedAt)} />
            <Info label="Reason" value={refund.reason} />
            <Info label="Admin Note" value={refund.adminNote} />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Actions
          </h2>

          <div className="space-y-2">
            {refund.status === "created" && (
              <button
                onClick={() => patchAction("approve", "approve")}
                disabled={!!actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                Approve Refund
              </button>
            )}

            {isRazorpay && ["created", "approved"].includes(refund.status) && (
              <button
                onClick={processRazorpayRefund}
                disabled={!!actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                <CreditCard size={16} />
                Process Razorpay Refund
              </button>
            )}

            {isRazorpay && refund?.razorpay?.refundId && (
              <button
                onClick={syncRazorpayStatus}
                disabled={!!actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-800 disabled:opacity-60"
              >
                <RefreshCcw size={16} />
                Sync Razorpay Status
              </button>
            )}

            {refund.status !== "processed" && refund.refundMode === "manual" && (
              <button
                onClick={() => router.push(`/refunds/${id}/process`)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
              >
                <Banknote size={16} />
                Mark Manual Paid
              </button>
            )}

            {!["processed", "failed", "cancelled"].includes(refund.status) && (
              <>
                <button
                  onClick={() => patchAction("failed", "failed")}
                  disabled={!!actionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 disabled:opacity-60"
                >
                  <ShieldAlert size={16} />
                  Mark Failed
                </button>

                <button
                  onClick={() => patchAction("cancel", "cancel")}
                  disabled={!!actionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-60"
                >
                  <XCircle size={16} />
                  Cancel Refund
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Razorpay details
          </h2>

          <div className="grid grid-cols-1 gap-3">
            <Info label="Payment ID" value={refund?.razorpay?.paymentId} />
            <Info label="Refund ID" value={refund?.razorpay?.refundId} />
            <Info label="Speed" value={refund?.razorpay?.speed} />
            <Info label="Receipt" value={refund?.razorpay?.receipt} />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Manual refund details
          </h2>

          <div className="grid grid-cols-1 gap-3">
            <Info label="UTR" value={refund?.manualRefund?.utr} />
            <Info
              label="Transaction ID"
              value={refund?.manualRefund?.transactionId}
            />
            <Info label="Paid From" value={refund?.manualRefund?.paidFrom} />
            <Info label="Paid To" value={refund?.manualRefund?.paidTo} />
            <Info label="Paid At" value={date(refund?.manualRefund?.paidAt)} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-950">
            Proofs / Screenshots
          </h2>

          <button
            onClick={() => router.push(`/refunds/${id}/process`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-3 py-2 text-xs font-medium text-white"
          >
            <FileImage size={14} />
            Add Proof
          </button>
        </div>

        {!refund.proofs?.length ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            No proof uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {refund.proofs.map((proof, index) => (
              <a
                key={`${proof.url}-${index}`}
                href={proof.url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100"
              >
                <img
                  src={proof.url}
                  alt={proof.note || "Refund proof"}
                  className="h-40 w-full object-cover"
                />
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-900">
                    {nice(proof.type)}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {proof.note || "View proof"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-center text-xs font-medium text-gray-400">
        Powered by Razorpay
      </p>
    </main>
  );
}