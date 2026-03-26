"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  BadgeIndianRupee,
  ShoppingBag,
  Layers3,
  RefreshCcw,
  Filter,
  RotateCcw,
  Download,
  BarChart3,
  Package,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const STATUS_OPTIONS = [
  "processing",
  "packed",
  "picked",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
  "returned",
  "refunded",
  "rto",
  "exchange_requested",
  "exchanged",
  "return_requested",
  "pickup_initiated",
];

const PRESETS = [
  { label: "Overall", value: "overall" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Custom", value: "custom" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatStatus = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const toDateInput = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPresetDates = (preset) => {
  const now = new Date();

  if (preset === "this_month") {
    return {
      from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toDateInput(now),
    };
  }

  if (preset === "last_month") {
    return {
      from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  return { from: "", to: "" };
};

const getStatusTone = (status = "") => {
  const value = String(status).toLowerCase();

  const map = {
    processing: "border-amber-200 bg-amber-50 text-amber-700",
    packed: "border-indigo-200 bg-indigo-50 text-indigo-700",
    picked: "border-sky-200 bg-sky-50 text-sky-700",
    shipped: "border-blue-200 bg-blue-50 text-blue-700",
    out_for_delivery: "border-cyan-200 bg-cyan-50 text-cyan-700",
    delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
    failed: "border-red-200 bg-red-50 text-red-700",
    returned: "border-orange-200 bg-orange-50 text-orange-700",
    refunded: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    rto: "border-red-200 bg-red-50 text-red-700",
    exchange_requested: "border-violet-200 bg-violet-50 text-violet-700",
    exchanged: "border-purple-200 bg-purple-50 text-purple-700",
    return_requested: "border-yellow-200 bg-yellow-50 text-yellow-700",
    pickup_initiated: "border-teal-200 bg-teal-50 text-teal-700",
  };

  return map[value] || "border-zinc-200 bg-zinc-50 text-zinc-700";
};

const downloadCsv = (rows, fileName = "revenue-by-status.csv") => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

function Card({ icon: Icon, title, value, sub, tone = "blue" }) {
  const tones = {
    blue: {
      wrap: "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white",
      icon: "bg-blue-100 text-blue-700",
      sub: "text-blue-600",
    },
    emerald: {
      wrap: "border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white",
      icon: "bg-emerald-100 text-emerald-700",
      sub: "text-emerald-600",
    },
    violet: {
      wrap: "border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white",
      icon: "bg-violet-100 text-violet-700",
      sub: "text-violet-600",
    },
  };

  const style = tones[tone] || tones.blue;

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${style.wrap}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-500">{title}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            {value}
          </div>
        </div>
        <div className={`rounded-2xl p-2.5 ${style.icon}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-xs font-medium ${style.sub}`}>{sub}</div>
    </div>
  );
}

export default function RevenueByStatusPage() {
  const [preset, setPreset] = useState("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statuses, setStatuses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    overall: {
      totalOrders: 0,
      totalFinalPayable: 0,
      avgFinalPayable: 0,
    },
    breakdown: [],
    filters: {},
  });

  useEffect(() => {
    const next = getPresetDates(preset);
    if (preset === "overall") {
      setFrom("");
      setTo("");
      return;
    }
    if (preset !== "custom") {
      setFrom(next.from);
      setTo(next.to);
    }
  }, [preset]);

  const fetchReport = async ({
    selectedPreset = preset,
    selectedFrom = from,
    selectedTo = to,
    selectedStatuses = statuses,
  } = {}) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (selectedPreset !== "overall") {
        if (selectedFrom) params.set("from", selectedFrom);
        if (selectedTo) params.set("to", selectedTo);
      }

      if (selectedStatuses.length) {
        params.set("fulfillmentStatus", selectedStatuses.join(","));
      }

      const res = await fetch(
        `${BASE_URL}/api/orders/reports/final-payable-by-status?${params.toString()}`
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json?.message || "Failed to fetch report");

      setData({
        overall: json?.overall || {
          totalOrders: 0,
          totalFinalPayable: 0,
          avgFinalPayable: 0,
        },
        breakdown: Array.isArray(json?.breakdown) ? json.breakdown : [],
        filters: json?.filters || {},
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
      setData({
        overall: {
          totalOrders: 0,
          totalFinalPayable: 0,
          avgFinalPayable: 0,
        },
        breakdown: [],
        filters: {},
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const next = getPresetDates("this_month");
    setFrom(next.from);
    setTo(next.to);
    fetchReport({
      selectedPreset: "this_month",
      selectedFrom: next.from,
      selectedTo: next.to,
      selectedStatuses: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = (status) => {
    setStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status]
    );
  };

  const appliedLabel = useMemo(() => {
    if (preset === "overall") return "Overall";
    if (preset === "this_month") return "This Month";
    if (preset === "last_month") return "Last Month";
    if (from || to) return `${from || "Start"} → ${to || "End"}`;
    return "Custom";
  }, [preset, from, to]);

  const handleExport = () => {
    const rows = [
      ["Revenue By Status Report"],
      ["Range", appliedLabel],
      ["From", from || "Overall"],
      ["To", to || "Overall"],
      ["Statuses", statuses.length ? statuses.map(formatStatus).join(", ") : "All"],
      [],
      ["Overall Summary"],
      ["Total Orders", data?.overall?.totalOrders || 0],
      ["Total Final Payable", Number(data?.overall?.totalFinalPayable || 0).toFixed(2)],
      ["Average Final Payable", Number(data?.overall?.avgFinalPayable || 0).toFixed(2)],
      [],
      ["Status", "Orders", "Total Final Payable", "Avg Final Payable"],
      ...data.breakdown.map((item) => [
        formatStatus(item.fulfillmentStatus),
        item.totalOrders || 0,
        Number(item.totalFinalPayable || 0).toFixed(2),
        Number(item.avgFinalPayable || 0).toFixed(2),
      ]),
    ];

    const suffix =
      preset === "overall"
        ? "overall"
        : `${from || "start"}_${to || "end"}`.replaceAll("/", "-");

    downloadCsv(rows, `revenue-by-status-${suffix}.csv`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <div className="space-y-6 p-4 md:p-6">
        <div className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <BarChart3 size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  Revenue by Status
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Final payable amount grouped by fulfillment status
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                disabled={loading || !data?.breakdown?.length}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} />
                CSV Download
              </button>

              <button
                onClick={() => fetchReport()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
              <Filter size={16} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900">Filters</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <CalendarDays size={14} />
                Range
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setPreset(item.value)}
                    className={`rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${
                      preset === item.value
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <CalendarDays size={14} />
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setPreset("custom");
                  setFrom(e.target.value);
                }}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <CalendarDays size={14} />
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setPreset("custom");
                  setTo(e.target.value);
                }}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Filter size={14} />
              Fulfillment Status
            </label>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => {
                const active = statuses.includes(status);
                const tone = getStatusTone(status);

                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? tone
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    {formatStatus(status)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => fetchReport()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Filter size={16} />
              Apply Filters
            </button>

            <button
              onClick={() => {
                setPreset("overall");
                setFrom("");
                setTo("");
                setStatuses([]);
                fetchReport({
                  selectedPreset: "overall",
                  selectedFrom: "",
                  selectedTo: "",
                  selectedStatuses: [],
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            icon={BadgeIndianRupee}
            title="Total Final Payable"
            value={formatCurrency(data?.overall?.totalFinalPayable)}
            sub={appliedLabel}
            tone="blue"
          />
          <Card
            icon={ShoppingBag}
            title="Total Orders"
            value={formatNumber(data?.overall?.totalOrders)}
            sub="Matched orders"
            tone="emerald"
          />
          <Card
            icon={Layers3}
            title="Average Final Payable"
            value={formatCurrency(data?.overall?.avgFinalPayable)}
            sub="Per order"
            tone="violet"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-2.5 text-blue-700">
                <Package size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Status Breakdown</h2>
                <p className="text-xs text-zinc-500">
                  Final payable grouped by fulfillment status
                </p>
              </div>
            </div>

            <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {formatNumber(data?.breakdown?.length || 0)} status rows
            </div>
          </div>

          {error ? (
            <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
            </div>
          ) : loading ? (
            <div className="p-8 text-sm font-medium text-zinc-500">Loading report...</div>
          ) : !data?.breakdown?.length ? (
            <div className="p-8 text-sm font-medium text-zinc-500">No data found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Orders</th>
                    <th className="px-4 py-3 font-semibold">Total Final Payable</th>
                    <th className="px-4 py-3 font-semibold">Avg Final Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((item, index) => {
                    const tone = getStatusTone(item.fulfillmentStatus);

                    return (
                      <tr
                        key={item.fulfillmentStatus}
                        className={`border-t border-zinc-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-zinc-50/40"
                        } hover:bg-blue-50/40`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
                          >
                            {formatStatus(item.fulfillmentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-700">
                          {formatNumber(item.totalOrders)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          {formatCurrency(item.totalFinalPayable)}
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-700">
                          {formatCurrency(item.avgFinalPayable)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}