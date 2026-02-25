"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";

const DEFAULT_SOURCES = [
  "Meta Ads",
  "Google Ads",
  "Snapchat Ads",
  "Instagram Boost",
  "Influencer",
  "Affiliate",
  "Email / SMS",
  "Creative / Shoot",
  "Agency",
  "Other",
];

const safe = (v) => (v == null ? "" : String(v));

const parseNumber = (str) => {
  if (str == null) return NaN;
  const cleaned = String(str).replace(/,/g, "").replace(/[^\d.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

const formatNumber = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "";

const getTodayYMD = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function MarketingSpendModal({ open, onClose, onSaved, apiBase }) {
  const API =
    (apiBase || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000")
      .trim()
      .replace(/\/+$/, "");

  // ✅ hooks always run in same order
  const [amountRaw, setAmountRaw] = useState("");
  const [source, setSource] = useState(DEFAULT_SOURCES[0]);
  const [customSource, setCustomSource] = useState("");
  const [date, setDate] = useState(() => getTodayYMD());
  const [notes, setNotes] = useState("");
  const [currency] = useState("INR");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finalSource = useMemo(() => {
    return source === "Other" ? safe(customSource).trim() : source;
  }, [source, customSource]);

  const parsedAmount = useMemo(() => parseNumber(amountRaw), [amountRaw]);

  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isSourceValid = finalSource && finalSource.length >= 2;
  const canSave = !saving && isAmountValid && isSourceValid;

  // Reset ONLY when modal opens
  useEffect(() => {
    if (!open) return;
    setAmountRaw("");
    setSource(DEFAULT_SOURCES[0]);
    setCustomSource("");
    setNotes("");
    setError("");
    setSaving(false);
    setDate(getTodayYMD());
  }, [open]);

  const handleAmountChange = (val) => {
    // allow digits + comma + dot
    const filtered = String(val).replace(/[^\d.,]/g, "");
    setAmountRaw(filtered);
  };

  const save = async () => {
    setError("");
    if (!isAmountValid) return setError("Enter a valid amount (> 0).");
    if (!isSourceValid) return setError("Enter a valid source.");

    const payload = {
      amount: Number(parsedAmount),
      source: finalSource,
      spentAt: date, // backend accepts spentAt or date
      notes: safe(notes).trim(),
      currency,
    };

    try {
      setSaving(true);

      const res = await fetch(`${API}/api/marketing/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.message || data?.error || `Failed to save (status ${res.status})`;
        throw new Error(msg);
      }

      onSaved?.(data?.data ?? payload);
      onClose?.();
    } catch (e) {
      setError(e?.message || "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ early return AFTER hooks
  if (!open) return null;

  const amountDisplay = formatNumber(parsedAmount) || amountRaw;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      {/* Backdrop (premium blur) */}
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add marketing spend"
        className="relative w-full max-w-[620px] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
      >
        {/* Top accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-black via-gray-400 to-indigo-500" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-black/10 bg-gray-50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-100">
                <Sparkles className="h-3.5 w-3.5" />
                Premium Log
              </span>
              <span className="text-xs text-gray-500">Budgeting ready</span>
            </div>

            <h3 className="mt-2 text-xl font-semibold tracking-tight text-black">
              Add Marketing Spend
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Enter amount + source + date to keep your spend tracking clean.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 hover:bg-white border border-transparent hover:border-black/10 transition"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Amount (₹)
              </label>
              <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                <input
                  value={amountDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 2,500"
                  className="w-full bg-transparent text-sm outline-none text-black placeholder:text-gray-400"
                />
              </div>
              {!isAmountValid && amountRaw ? (
                <p className="text-xs text-red-600">
                  Enter a valid amount greater than 0.
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Tip: add campaign spend daily for accurate month totals.
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none text-black"
                />
              </div>
              <p className="text-[11px] text-gray-500">This will be used for date-wise grouping.</p>
            </div>

            {/* Source */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-700">Source</label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-black"
                  >
                    {DEFAULT_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {source === "Other" ? (
                  <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                    <input
                      value={customSource}
                      onChange={(e) => setCustomSource(e.target.value)}
                      placeholder="Custom source (e.g. YouTube Ads)"
                      className="w-full bg-transparent text-sm outline-none text-black placeholder:text-gray-400"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-black/10 bg-gray-50 px-3 py-2">
                    <p className="text-sm text-gray-600 truncate">
                      Selected: <span className="font-medium text-black">{finalSource}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-700">
                Notes (optional)
              </label>
              <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Campaign name, invoice ref, creative, etc."
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm outline-none text-black placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-5 border-t border-black/10 bg-gray-50">
          <button
            onClick={onClose}
            className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-black hover:bg-gray-100 transition"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Spend"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}