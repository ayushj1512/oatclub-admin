"use client";

import { useState } from "react";
import {
  ArrowLeft,
  IndianRupee,
  Loader2,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import useRazorpayRefundStore from "@/store/razorpayRefundStore";

const initialForm = {
  orderId: "",
  orderNumber: "",
  paymentId: "",
  amount: "",
  reason: "",
  note: "",
};

export default function ManualRefundPage() {
  const router = useRouter();

  const { createRefund, actionLoading, error, clearError } =
    useRazorpayRefundStore();

  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");

  const updateField = (key, value) => {
    clearError();
    setSuccess("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setSuccess("");
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      orderId: form.orderId.trim() || undefined,
      orderNumber: form.orderNumber.trim() || undefined,
      paymentId: form.paymentId.trim() || undefined,
      amount: Number(form.amount),
      reason: form.reason.trim(),
      note: form.note.trim(),
      source: "manual",
      refundType: "manual",
    };

    if (!payload.orderId && !payload.orderNumber) return;
    if (!payload.amount || payload.amount <= 0) return;
    if (!payload.reason) return;

    try {
      await createRefund(payload);
      setSuccess("Manual refund request created successfully.");
      setForm(initialForm);
    } catch (_) {}
  };

  const canSubmit =
    (form.orderId.trim() || form.orderNumber.trim()) &&
    Number(form.amount) > 0 &&
    form.reason.trim();

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-2xl font-semibold tracking-tight">
            Manual Refund
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a manual refund request for admin review or Razorpay
            processing.
          </p>
        </div>

        <button
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
              <ReceiptText size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Refund Details</h2>
              <p className="text-sm text-gray-500">
                Add order and payment information carefully.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Order ID"
              value={form.orderId}
              onChange={(v) => updateField("orderId", v)}
              placeholder="MongoDB order id"
            />

            <Input
              label="Order Number"
              value={form.orderNumber}
              onChange={(v) => updateField("orderNumber", v)}
              placeholder="MIRAY-004312"
            />

            <Input
              label="Razorpay Payment ID"
              value={form.paymentId}
              onChange={(v) => updateField("paymentId", v)}
              placeholder="pay_xxxxxxxxx"
            />

            <Input
              label="Refund Amount"
              type="number"
              value={form.amount}
              onChange={(v) => updateField("amount", v)}
              placeholder="999"
              icon={<IndianRupee size={15} />}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Refund Reason"
              value={form.reason}
              onChange={(v) => updateField("reason", v)}
              placeholder="Customer cancelled before shipping"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Internal Note
            </label>
            <textarea
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              rows={4}
              placeholder="Add admin note..."
              className="w-full resize-none rounded-2xl bg-[#fafafa] px-4 py-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={!canSubmit || actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading && <Loader2 size={16} className="animate-spin" />}
              Create Refund
            </button>
          </div>
        </form>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Important</h3>

          <div className="mt-4 space-y-3 text-sm text-gray-500">
            <p>
              Use this page when a refund has to be created manually by the
              admin team.
            </p>

            <p>
              Order ID or Order Number is required. Amount and reason are also
              mandatory.
            </p>

            <p>
              This only creates the refund request. Razorpay processing can be
              handled separately using the refund process action.
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-[#fafafa] p-4 text-xs text-gray-500">
            Recommended flow: create refund request → verify order/payment →
            process Razorpay refund.
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-gray-100 transition focus-within:bg-white focus-within:ring-gray-300">
        {icon && <span className="text-gray-400">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}