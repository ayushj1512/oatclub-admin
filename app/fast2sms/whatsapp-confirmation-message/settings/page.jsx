"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Settings,
  ShieldCheck,
  Webhook,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TEMPLATE_NAME =
  process.env.NEXT_PUBLIC_FAST2SMS_ORDER_CONFIRM_TEMPLATE_NAME ||
  "order_confirmation_action";

const TEMPLATE_LANGUAGE =
  process.env.NEXT_PUBLIC_FAST2SMS_ORDER_CONFIRM_TEMPLATE_LANGUAGE || "en";

const WEBHOOK_URL = `${API}/api/whatsapp-confirmation-message/webhook`;

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    console.log("Clipboard copy failed");
  }
};

const InfoCard = ({ icon: Icon, title, desc }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-gray-950 p-3 text-white">
        <Icon size={18} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-gray-500">{desc}</p>
      </div>
    </div>
  </div>
);

const CopyRow = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <button
        type="button"
        onClick={() => copyText(value)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
      >
        <Copy size={13} />
        Copy
      </button>
    </div>

    <p className="break-all font-mono text-sm text-gray-800">{value}</p>
  </div>
);

export default function WhatsappConfirmationSettingsPage() {
  const router = useRouter();

  const templatePreview = useMemo(
    () => ({
      header: "{{1}}",
      body: "Hi {{1}}, your Miray order {{2}} has been placed successfully. Confirm or cancel here: {{3}}",
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/fast2sms")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft size={16} />
            Back to Fast2SMS
          </button>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Fast2SMS
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
            WhatsApp Confirmation Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Template, webhook and environment reference for confirmation
            messages.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/fast2sms/whatsapp-confirmation-message")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black"
        >
          <MessageCircle size={16} />
          View Logs
        </button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <InfoCard
          icon={ShieldCheck}
          title="Auto COD Confirmation"
          desc="Triggered only for COD orders that are not confirmed yet."
        />
        <InfoCard
          icon={Webhook}
          title="Webhook Tracking"
          desc="Fast2SMS status updates are stored against each message log."
        />
        <InfoCard
          icon={Settings}
          title="Template Based"
          desc="Uses header and body variables for reusable WhatsApp templates."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Template Config
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              These values are read from your frontend environment variables.
            </p>

            <div className="mt-5 space-y-3">
              <CopyRow label="Template Name" value={TEMPLATE_NAME} />
              <CopyRow label="Template Language" value={TEMPLATE_LANGUAGE} />
              <CopyRow label="Webhook URL" value={WEBHOOK_URL} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Template Variables
            </h2>

            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Section</th>
                    <th className="px-4 py-3 font-semibold">Variable</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Header
                    </td>
                    <td className="px-4 py-3 text-gray-600">{"{{1}}"}</td>
                    <td className="px-4 py-3 text-gray-600">Order Number</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Body</td>
                    <td className="px-4 py-3 text-gray-600">{"{{1}}"}</td>
                    <td className="px-4 py-3 text-gray-600">Customer Name</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Body</td>
                    <td className="px-4 py-3 text-gray-600">{"{{2}}"}</td>
                    <td className="px-4 py-3 text-gray-600">Order Number</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Body</td>
                    <td className="px-4 py-3 text-gray-600">{"{{3}}"}</td>
                    <td className="px-4 py-3 text-gray-600">Action Link</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Required Backend ENV
            </h2>

            <div className="mt-4 rounded-2xl bg-gray-950 p-4 font-mono text-xs leading-6 text-gray-100">
              <p>FAST2SMS_API_KEY=your_api_key</p>
              <p>FAST2SMS_PHONE_NUMBER_ID=your_phone_number_id</p>
              <p>
                FAST2SMS_ORDER_CONFIRM_TEMPLATE_NAME={TEMPLATE_NAME}
              </p>
              <p>
                FAST2SMS_ORDER_CONFIRM_TEMPLATE_LANGUAGE={TEMPLATE_LANGUAGE}
              </p>
              <p>NEXT_PUBLIC_ORDER_ACTION_BASE_URL=https://yourdomain.com</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Message Preview
            </h2>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Header
              </p>
              <p className="font-mono text-sm text-gray-800">
                {templatePreview.header}
              </p>

              <div className="my-4 h-px bg-gray-100" />

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Body
              </p>
              <p className="text-sm leading-6 text-gray-800">
                {templatePreview.body}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-base font-semibold text-gray-950">
              Current Flow
            </h2>

            <div className="mt-4 space-y-3">
              {[
                "COD order is created.",
                "Order is not confirmed yet.",
                "WhatsApp confirmation template is sent.",
                "Customer confirms or cancels from action link.",
                "Webhook updates sent / delivered / read / replied status.",
              ].map((item, index) => (
                <div key={item} className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-950 text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  Safe Automation
                </h3>
                <p className="mt-1 text-sm leading-5 text-emerald-800">
                  This setup only sends confirmation messages for COD orders
                  that are still unconfirmed, so confirmed or prepaid orders are
                  ignored.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              window.open("https://www.fast2sms.com", "_blank", "noopener,noreferrer")
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
          >
            Open Fast2SMS
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}