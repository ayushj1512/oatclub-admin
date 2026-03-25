// app/accounts/razorpay-remittance/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRazorpayReportsStore } from "@/store/razorpayReportsStore";

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

const getDefaults = () => {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    receipt: "",
    settlementId: "",
    method: "",
    type: "",
  };
};

const normalizeFilters = (filters = {}) => {
  const d = getDefaults();
  return {
    year: Number(filters?.year || d.year),
    month: Number(filters?.month || d.month),
    receipt: String(filters?.receipt || ""),
    settlementId: String(filters?.settlementId || ""),
    method: String(filters?.method || ""),
    type: String(filters?.type || ""),
  };
};

const sameFilters = (a, b) =>
  String(a?.year ?? "") === String(b?.year ?? "") &&
  String(a?.month ?? "") === String(b?.month ?? "") &&
  String(a?.receipt ?? "") === String(b?.receipt ?? "") &&
  String(a?.settlementId ?? "") === String(b?.settlementId ?? "") &&
  String(a?.method ?? "") === String(b?.method ?? "") &&
  String(a?.type ?? "") === String(b?.type ?? "");

function Card({ title, value, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50/70 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    amber: "border-amber-200 bg-amber-50/70 text-amber-950",
    violet: "border-violet-200 bg-violet-50/70 text-violet-950",
    rose: "border-rose-200 bg-rose-50/70 text-rose-950",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {title}
      </p>
      <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      <input
        {...props}
        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      <select
        {...props}
        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function RazorpayRemittancePage() {
  const {
    remittance,
    remittanceSummary,
    remittanceFilters,
    remittanceLoading,
    error,
    setRemittanceFilters,
    fetchRemittanceReport,
    clearError,
  } = useRazorpayReportsStore();

  const storeFilters = useMemo(
    () => normalizeFilters(remittanceFilters),
    [
      remittanceFilters?.year,
      remittanceFilters?.month,
      remittanceFilters?.receipt,
      remittanceFilters?.settlementId,
      remittanceFilters?.method,
      remittanceFilters?.type,
    ]
  );

  const [localFilters, setLocalFilters] = useState(storeFilters);

  useEffect(() => {
    const defaults = normalizeFilters(remittanceFilters);
    fetchRemittanceReport(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalFilters((prev) => (sameFilters(prev, storeFilters) ? prev : storeFilters));
  }, [storeFilters]);

  const rows = useMemo(() => (Array.isArray(remittance) ? remittance : []), [remittance]);

  const onChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = (yearValue, monthValue, extra = {}) => ({
    year: Number(yearValue || getDefaults().year),
    month: Number(monthValue || getDefaults().month),
    receipt: String(extra.receipt ?? localFilters.receipt ?? "").trim(),
    settlementId: String(extra.settlementId ?? localFilters.settlementId ?? "").trim(),
    method: String(extra.method ?? localFilters.method ?? "").trim(),
    type: String(extra.type ?? localFilters.type ?? "").trim(),
  });

  const applyFilters = async () => {
    clearError();
    const next = buildPayload(localFilters.year, localFilters.month);
    setRemittanceFilters(next);
    setLocalFilters(next);
    await fetchRemittanceReport(next);
  };

  const applyQuickMonth = async (monthValue) => {
    clearError();
    const next = buildPayload(localFilters.year, monthValue);
    setRemittanceFilters(next);
    setLocalFilters(next);
    await fetchRemittanceReport(next);
  };

  const resetFilters = async () => {
    clearError();
    const d = getDefaults();
    const next = {
      year: d.year,
      month: d.month,
      receipt: "",
      settlementId: "",
      method: "",
      type: "",
    };
    setRemittanceFilters(next);
    setLocalFilters(next);
    await fetchRemittanceReport(next);
  };

  const downloadCSV = () => {
    const headers = [
      "Sr No",
      "Settlement ID",
      "Order Receipt",
      "Order ID",
      "Payment ID",
      "Refund ID",
      "Method",
      "Type",
      "Description",
      "Amount",
      "Fee",
      "Tax",
      "Net",
      "Debit",
      "Credit",
      "Settled At",
    ];

    const escapeCSV = (value) => {
      const v = String(value ?? "");
      return `"${v.replace(/"/g, '""')}"`;
    };

    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.srNo,
          r.settlementId,
          r.orderReceipt,
          r.orderId,
          r.paymentId,
          r.refundId,
          r.method,
          r.type,
          r.description,
          r.amount,
          r.fee,
          r.tax,
          r.net,
          r.debit,
          r.credit,
          r.settledAtLabel,
        ]
          .map(escapeCSV)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `razorpay-remittance-${localFilters.year}-${String(
      localFilters.month
    ).padStart(2, "0")}.csv`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 md:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Razorpay Remittance
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Settlement recon report mapped with receipt / order number.
        </p>
      </div>

      <div className="mb-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {MONTHS.map((m) => (
            <Chip
              key={m.value}
              active={Number(localFilters.month) === Number(m.value)}
              onClick={() => applyQuickMonth(m.value)}
            >
              {m.label}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            label="Year"
            type="number"
            min="2020"
            value={localFilters.year}
            onChange={(e) => onChange("year", e.target.value)}
          />

          <Select
            label="Month"
            value={localFilters.month}
            onChange={(e) => onChange("month", e.target.value)}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          <Input
            label="Receipt / Order No."
            placeholder="MIRAY-000123"
            value={localFilters.receipt}
            onChange={(e) => onChange("receipt", e.target.value)}
          />

          <Input
            label="Settlement ID"
            placeholder="setl_xxx"
            value={localFilters.settlementId}
            onChange={(e) => onChange("settlementId", e.target.value)}
          />

          <Select
            label="Method"
            value={localFilters.method}
            onChange={(e) => onChange("method", e.target.value)}
          >
            <option value="">All</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="netbanking">Netbanking</option>
            <option value="wallet">Wallet</option>
            <option value="emi">EMI</option>
            <option value="paylater">Pay Later</option>
          </Select>

          <Select
            label="Type"
            value={localFilters.type}
            onChange={(e) => onChange("type", e.target.value)}
          >
            <option value="">All</option>
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
            <option value="transfer">Transfer</option>
            <option value="adjustment">Adjustment</option>
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={applyFilters}
            disabled={remittanceLoading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {remittanceLoading ? "Loading..." : "Apply Filters"}
          </button>

          <button
            onClick={resetFilters}
            disabled={remittanceLoading}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>

          <button
            onClick={downloadCSV}
            disabled={!rows.length}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Rows" value={remittanceSummary.totalRows || 0} tone="blue" />
        <Card
          title="Total Amount"
          value={money(remittanceSummary.totalAmount)}
          tone="violet"
        />
        <Card
          title="Total Fee"
          value={money(remittanceSummary.totalFee)}
          tone="amber"
        />
        <Card
          title="Total Tax"
          value={money(remittanceSummary.totalTax)}
          tone="rose"
        />
        <Card
          title="Net Received"
          value={money(remittanceSummary.totalNet)}
          tone="emerald"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">Remittance Rows</p>
          <p className="mt-1 text-xs text-zinc-500">
            Showing{" "}
            {MONTHS.find((m) => m.value === Number(localFilters.month))?.label || ""}{" "}
            {localFilters.year}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1450px] w-full text-sm">
            <thead className="bg-zinc-100/80 text-zinc-700">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">#</th>
                <th className="px-3 py-3 text-left font-semibold">Settlement ID</th>
                <th className="px-3 py-3 text-left font-semibold">Order Receipt</th>
                <th className="px-3 py-3 text-left font-semibold">Order ID</th>
                <th className="px-3 py-3 text-left font-semibold">Payment ID</th>
                <th className="px-3 py-3 text-left font-semibold">Refund ID</th>
                <th className="px-3 py-3 text-left font-semibold">Method</th>
                <th className="px-3 py-3 text-left font-semibold">Type</th>
                <th className="px-3 py-3 text-left font-semibold">Description</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
                <th className="px-3 py-3 text-right font-semibold">Fee</th>
                <th className="px-3 py-3 text-right font-semibold">Tax</th>
                <th className="px-3 py-3 text-right font-semibold">Net</th>
                <th className="px-3 py-3 text-right font-semibold">Debit</th>
                <th className="px-3 py-3 text-right font-semibold">Credit</th>
                <th className="px-3 py-3 text-left font-semibold">Settled At</th>
              </tr>
            </thead>

            <tbody>
              {remittanceLoading ? (
                <tr>
                  <td colSpan={16} className="px-3 py-12 text-center text-sm text-zinc-500">
                    Loading remittance report...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr
                    key={`${row.settlementId}-${row.paymentId}-${row.srNo}`}
                    className="border-t border-zinc-100 hover:bg-blue-50/30"
                  >
                    <td className="px-3 py-3 text-zinc-600">{row.srNo}</td>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      {row.settlementId || "—"}
                    </td>
                    <td className="px-3 py-3 font-medium text-blue-700">
                      {row.orderReceipt || "—"}
                    </td>
                    <td className="px-3 py-3 text-zinc-600">{row.orderId || "—"}</td>
                    <td className="px-3 py-3 text-zinc-600">{row.paymentId || "—"}</td>
                    <td className="px-3 py-3 text-zinc-600">{row.refundId || "—"}</td>
                    <td className="px-3 py-3 capitalize text-zinc-700">{row.method || "—"}</td>
                    <td className="px-3 py-3 capitalize text-zinc-700">{row.type || "—"}</td>
                    <td className="max-w-[260px] px-3 py-3 text-zinc-600">
                      <div className="line-clamp-2">{row.description || "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-zinc-900">
                      {money(row.amount)}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-700">{money(row.fee)}</td>
                    <td className="px-3 py-3 text-right text-rose-700">{money(row.tax)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                      {money(row.net)}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-700">{money(row.debit)}</td>
                    <td className="px-3 py-3 text-right text-zinc-700">{money(row.credit)}</td>
                    <td className="px-3 py-3 text-zinc-600">{row.settledAtLabel || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="px-3 py-12 text-center text-sm text-zinc-500">
                    No remittance data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}