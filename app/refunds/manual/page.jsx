"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  IndianRupee,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useOrderRefundStore } from "@/store/orderRefundStore";

const initialForm = {
  orderId: "",
  amount: "",
  reason: "Manual refund requested",
  refundMethod: "upi",
  upiId: "",
  accountHolderName: "",
  bankName: "",
  accountNumberLast4: "",
  ifsc: "",
  adminNote: "",
  customerMessage: "Your refund request has been created.",
};

const refundMethods = [
  { label: "UPI", value: "upi" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Cash", value: "cash" },
  { label: "Store Credit", value: "store_credit" },
  { label: "Other", value: "other" },
];

export default function ManualRefundPage() {
  const router = useRouter();

  const {
    actionLoading,
    error,
    clearError,
    createManualRefundFromOrder,
  } = useOrderRefundStore();

  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");

  const updateField = (key, value) => {
    clearError?.();
    setSuccess("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    clearError?.();
    setSuccess("");
    setForm(initialForm);
  };

  const canSubmit =
    form.orderId.trim() &&
    Number(form.amount || 0) > 0 &&
    form.reason.trim() &&
    form.refundMethod;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const res = await createManualRefundFromOrder(form.orderId.trim(), {
      amount: Number(form.amount),
      reason: form.reason.trim(),
      refundMethod: form.refundMethod,
      adminNote: form.adminNote.trim(),
      customerMessage: form.customerMessage.trim(),
      customerRefundDetails: {
        upiId: form.upiId.trim(),
        accountHolderName: form.accountHolderName.trim(),
        bankName: form.bankName.trim(),
        accountNumberLast4: form.accountNumberLast4.trim(),
        ifsc: form.ifsc.trim(),
      },
    });

    if (res?.success) {
      setSuccess("Manual refund created successfully.");
      setForm(initialForm);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      {/* Header */}
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Manual Refunds
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Create Manual Refund
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Use this for COD, UPI, bank transfer, cash or store credit refunds.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
              <Banknote size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Refund Details</h2>
              <p className="text-sm text-gray-500">
                Add order, amount and customer refund details.
              </p>
            </div>
          </div>

          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <ShieldAlert size={16} />
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Order ID"
              value={form.orderId}
              onChange={(v) => updateField("orderId", v)}
              placeholder="MongoDB order id"
            />

            <Input
              label="Refund Amount"
              type="number"
              value={form.amount}
              onChange={(v) => updateField("amount", v)}
              placeholder="999"
              icon={<IndianRupee size={15} />}
            />

            <Select
              label="Refund Method"
              value={form.refundMethod}
              onChange={(v) => updateField("refundMethod", v)}
              options={refundMethods}
            />

            <Input
              label="UPI ID"
              value={form.upiId}
              onChange={(v) => updateField("upiId", v)}
              placeholder="customer@upi"
            />

            <Input
              label="Account Holder"
              value={form.accountHolderName}
              onChange={(v) => updateField("accountHolderName", v)}
              placeholder="Customer name"
            />

            <Input
              label="Bank Name"
              value={form.bankName}
              onChange={(v) => updateField("bankName", v)}
              placeholder="HDFC / ICICI / SBI"
            />

            <Input
              label="Account Last 4 Digits"
              value={form.accountNumberLast4}
              onChange={(v) => updateField("accountNumberLast4", v)}
              placeholder="1234"
            />

            <Input
              label="IFSC"
              value={form.ifsc}
              onChange={(v) => updateField("ifsc", v)}
              placeholder="HDFC0000000"
            />
          </div>

          <div className="mt-4">
            <Input
              label="Refund Reason"
              value={form.reason}
              onChange={(v) => updateField("reason", v)}
              placeholder="Return approved / COD refund"
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Customer Message"
              value={form.customerMessage}
              onChange={(v) => updateField("customerMessage", v)}
              placeholder="Message visible to customer"
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Admin Note"
              value={form.adminNote}
              onChange={(v) => updateField("adminNote", v)}
              placeholder="Internal note..."
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
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Create Manual Refund
            </button>
          </div>
        </form>

        {/* Help */}
        <aside className="rounded-3xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Manual refund flow</h3>

          <div className="mt-4 space-y-3 text-sm leading-6 text-gray-500">
            <p>Use this page for COD or offline refunds after return approval.</p>
            <p>
              This creates a refund record with status{" "}
              <span className="font-medium text-gray-900">manual_required</span>.
            </p>
            <p>
              After payment is done, open the refund detail page and mark it as
              processed with UTR/proof.
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-[#fafafa] p-4 text-xs leading-5 text-gray-500">
            Recommended: collect customer UPI/bank details first, create refund,
            then attach proof after payment.
          </div>
        </aside>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", icon = null }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-2xl bg-[#fafafa] px-4 py-3 ring-1 ring-gray-100 transition focus-within:bg-white focus-within:ring-gray-300">
        {icon ? <span className="text-gray-400">{icon}</span> : null}
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

function Select({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[46px] w-full rounded-2xl bg-[#fafafa] px-4 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl bg-[#fafafa] px-4 py-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
      />
    </div>
  );
}