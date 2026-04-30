"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
} from "lucide-react";

const defaultSettings = {
  autoRefund: true,
  requireApproval: true,
  allowInstantRefund: false,
  refundSpeed: "normal",
  maxAutoRefundAmount: "5000",
  refundWindowDays: "7",
  notifyCustomer: true,
  notifyAdmin: true,
};

export default function RefundSettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const update = (key, value) => {
    setSuccess("");
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setSettings(defaultSettings);
    setSuccess("");
  };

  const saveSettings = async () => {
    setSaving(true);
    setSuccess("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccess("Refund settings saved successfully.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 text-[#111] md:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <Settings size={14} />
            Refund Controls
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Refund Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure approval rules, Razorpay refund speed and notification
            preferences.
          </p>
        </div>

        <button
          onClick={reset}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
        >
          <RefreshCcw size={16} />
          Reset
        </button>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Approval Rules</h2>
                <p className="text-sm text-gray-500">
                  Control when refunds need manual review.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SwitchRow
                title="Enable auto refund"
                desc="Allow eligible cancelled orders to create refund requests."
                checked={settings.autoRefund}
                onChange={(v) => update("autoRefund", v)}
              />

              <SwitchRow
                title="Require admin approval"
                desc="Keep refund requests in review before Razorpay processing."
                checked={settings.requireApproval}
                onChange={(v) => update("requireApproval", v)}
              />

              <SwitchRow
                title="Allow instant refund"
                desc="Use Razorpay optimum speed for eligible refunds."
                checked={settings.allowInstantRefund}
                onChange={(v) => update("allowInstantRefund", v)}
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Refund Limits</h2>
            <p className="mt-1 text-sm text-gray-500">
              Set limits for automated refund handling.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input
                label="Max auto refund amount"
                value={settings.maxAutoRefundAmount}
                onChange={(v) => update("maxAutoRefundAmount", v)}
                placeholder="5000"
              />

              <Input
                label="Refund window days"
                value={settings.refundWindowDays}
                onChange={(v) => update("refundWindowDays", v)}
                placeholder="7"
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Razorpay refund speed
                </label>
                <select
                  value={settings.refundSpeed}
                  onChange={(e) => update("refundSpeed", e.target.value)}
                  className="w-full rounded-2xl bg-[#fafafa] px-4 py-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                >
                  <option value="normal">Normal</option>
                  <option value="optimum">Optimum</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Notifications</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose who receives refund updates.
            </p>

            <div className="mt-5 space-y-4">
              <SwitchRow
                title="Notify customer"
                desc="Send updates when refund status changes."
                checked={settings.notifyCustomer}
                onChange={(v) => update("notifyCustomer", v)}
              />

              <SwitchRow
                title="Notify admin"
                desc="Alert admin team for failed or pending refunds."
                checked={settings.notifyAdmin}
                onChange={(v) => update("notifyAdmin", v)}
              />
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCcw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Settings
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Recommended Setup</h3>

          <div className="mt-4 space-y-3 text-sm text-gray-500">
            <p>
              Keep admin approval enabled while refund automation is new. This
              avoids accidental high-value refunds.
            </p>

            <p>
              Use normal Razorpay speed by default. Enable optimum only for
              urgent customer cases.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <p>
              This page is UI-ready. Connect it to backend settings API when
              your refund settings model is ready.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-[#fafafa] px-4 py-3 text-sm outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
      />
    </div>
  );
}

function SwitchRow({ title, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#fafafa] p-4">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-1 text-xs text-gray-500">{desc}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-black" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}