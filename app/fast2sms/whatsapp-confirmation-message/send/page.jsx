"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

import useWhatsappConfirmationMessageStore from "@/store/whatsappConfirmationMessageStore";

const DEFAULT_TEMPLATE =
  process.env.NEXT_PUBLIC_FAST2SMS_ORDER_CONFIRM_TEMPLATE_NAME ||
  "order_confirmation_action";

const DEFAULT_LANGUAGE =
  process.env.NEXT_PUBLIC_FAST2SMS_ORDER_CONFIRM_TEMPLATE_LANGUAGE || "en";

export default function SendWhatsappConfirmationMessagePage() {
  const router = useRouter();

  const { sending, error, sendMessage, clearError } =
    useWhatsappConfirmationMessageStore();

  const [form, setForm] = useState({
    phone: "",
    customerName: "",
    orderNumber: "",
    templateName: DEFAULT_TEMPLATE,
    templateLanguage: DEFAULT_LANGUAGE,
    actionLink: "",
    notes: "Manual test from admin panel",
  });

  const [bodyVariables, setBodyVariables] = useState(["", "", ""]);

  const previewMessage = useMemo(() => {
    const name = form.customerName || "Customer";
    const order = form.orderNumber || "ORDER-NUMBER";
    const link = form.actionLink || "CONFIRMATION-LINK";

    return `Hi ${name}, your OATCLUB order ${order} has been placed successfully. Confirm or cancel here: ${link}`;
  }, [form.customerName, form.orderNumber, form.actionLink]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateVariable = (index, value) => {
    setBodyVariables((prev) =>
      prev.map((item, idx) => (idx === index ? value : item))
    );
  };

  const addVariable = () => {
    setBodyVariables((prev) => [...prev, ""]);
  };

  const removeVariable = (index) => {
    setBodyVariables((prev) => prev.filter((_, idx) => idx !== index));
  };

  const autofillVariables = () => {
    setBodyVariables([
      form.customerName || "",
      form.orderNumber || "",
      form.actionLink || "",
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalBodyVariables = bodyVariables
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    const payload = {
      phone: form.phone,
      customerName: form.customerName,
      templateName: form.templateName,
      templateLanguage: form.templateLanguage,
      headerVariables: form.orderNumber ? [form.orderNumber] : [],
      bodyVariables: finalBodyVariables,
      variables: finalBodyVariables,
      messageBody: previewMessage,
      notes: form.notes,
    };

    const res = await sendMessage(payload);

    if (res?.data?._id) {
      router.push(`/fast2sms/whatsapp-confirmation-message/${res.data._id}`);
    } else {
      router.push("/fast2sms/whatsapp-confirmation-message");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/fast2sms/whatsapp-confirmation-message")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft size={16} />
            Back to logs
          </button>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Fast2SMS
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
            Send Test Message
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Send a manual WhatsApp confirmation template for testing.
          </p>
        </div>

        <button
          type="button"
          onClick={autofillVariables}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          <MessageCircle size={16} />
          Auto Fill Variables
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Recipient Details
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Phone Number
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  required
                  placeholder="9876543210"
                  className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Customer Name
                </label>
                <input
                  value={form.customerName}
                  onChange={(e) => updateForm("customerName", e.target.value)}
                  placeholder="Ayush"
                  className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Order Number
                </label>
                <input
                  value={form.orderNumber}
                  onChange={(e) => updateForm("orderNumber", e.target.value)}
                  placeholder="OATCLUB-004312"
                  className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Action Link
                </label>
                <input
                  value={form.actionLink}
                  onChange={(e) => updateForm("actionLink", e.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Template Details
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Template Name
                </label>
                <input
                  value={form.templateName}
                  onChange={(e) => updateForm("templateName", e.target.value)}
                  required
                  className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Language
                </label>
                <input
                  value={form.templateLanguage}
                  onChange={(e) =>
                    updateForm("templateLanguage", e.target.value)
                  }
                  required
                  className="h-11 w-full rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                />
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500">
                  Body Variables
                </label>

                <button
                  type="button"
                  onClick={addVariable}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  <Plus size={13} />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {bodyVariables.map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={value}
                      onChange={(e) => updateVariable(index, e.target.value)}
                      placeholder={`Variable ${index + 1}`}
                      className="h-11 flex-1 rounded-xl bg-gray-50 px-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                    />

                    {bodyVariables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariable(index)}
                        className="h-11 rounded-xl bg-red-50 px-3 text-red-600 ring-1 ring-red-100 transition hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-2 text-xs text-gray-400">
                Current template usually expects: customer name, order number,
                action link.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl bg-gray-50 px-3 py-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="sticky top-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Message Preview
            </h2>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <MessageCircle size={14} />
                WhatsApp Template
              </div>

              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                {previewMessage}
              </p>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm ring-1 ring-gray-100">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium text-gray-900">
                  {form.phone || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Template</span>
                <span className="max-w-[180px] truncate font-medium text-gray-900">
                  {form.templateName || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Language</span>
                <span className="font-medium text-gray-900">
                  {form.templateLanguage || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Variables</span>
                <span className="font-medium text-gray-900">
                  {bodyVariables.filter(Boolean).length}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Test Message
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              This will create a message log and send through Fast2SMS.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}