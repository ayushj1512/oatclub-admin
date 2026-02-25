"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Trash2, RefreshCcw, Sparkles, CalendarDays, Download } from "lucide-react";
import toast from "react-hot-toast";

import { useAdminMarketingSpendStore } from "@/store/adminMarketingSpendStore";
import MarketingSpendModal from "@/components/marketing/MarketingSpendModal";

const API = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000")
  .trim()
  .replace(/\/+$/, "");

const SOURCES = [
  "", // All
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
const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

const toYMD = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const prettyDate = (ymd) => {
  const dt = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const startOfMonthYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const addDaysYMD = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toYMD(d);
};

const escapeCsv = (value) => {
  const s = safe(value);
  // wrap in quotes if it contains comma, quote, or newline
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function MarketingSpendPage() {
  const {
    spends,
    summary,
    loading,
    error,
    fetchSpends,
    createSpend,
    deleteSpend,
    fetchSummary,
  } = useAdminMarketingSpendStore();

  const [open, setOpen] = useState(false);

  // filters
  const [source, setSource] = useState("");
  const [from, setFrom] = useState(() => startOfMonthYMD());
  const [to, setTo] = useState(() => toYMD(new Date()));

  const currentMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // YYYY-MM
  }, []);

  const load = async () => {
    await fetchSpends({
      page: 1,
      limit: 500, // table ke liye thoda zyada safe
      ...(source ? { source } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });

    await fetchSummary(currentMonth);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeTotal = useMemo(() => {
    return (spends || []).reduce((acc, s) => acc + (Number(s?.amount) || 0), 0);
  }, [spends]);

  // table rows (sorted desc by spentAt)
  const rows = useMemo(() => {
    const arr = Array.isArray(spends) ? [...spends] : [];
    arr.sort((a, b) => {
      const ta = new Date(a?.spentAt || a?.createdAt).getTime() || 0;
      const tb = new Date(b?.spentAt || b?.createdAt).getTime() || 0;
      return tb - ta;
    });
    return arr;
  }, [spends]);

  const onAddSpend = async (payloadFromModal) => {
    // If modal returns created document
    if (payloadFromModal?._id) {
      toast.success("Spend added");
      load();
      return;
    }

    // If modal returns payload only
    const r = await createSpend(payloadFromModal);
    if (r?.success) {
      toast.success("Spend added");
      load();
    } else {
      toast.error("Failed to add spend");
    }
  };

  const onDelete = async (id) => {
    if (!id) return;
    const ok = await deleteSpend(id);
    if (ok?.success) {
      toast.success("Deleted");
      // refresh summary
      fetchSummary(currentMonth);
    } else {
      toast.error("Delete failed");
    }
  };

  const setQuickRange = (type) => {
    if (type === "today") {
      const t = toYMD(new Date());
      setFrom(t);
      setTo(t);
      return;
    }
    if (type === "7d") {
      setFrom(addDaysYMD(-6));
      setTo(toYMD(new Date()));
      return;
    }
    if (type === "month") {
      setFrom(startOfMonthYMD());
      setTo(toYMD(new Date()));
      return;
    }
  };

  const exportCsv = () => {
    const data = rows || [];
    if (!data.length) {
      toast.error("No data to export");
      return;
    }

    const header = ["Date", "Source", "Amount", "Currency", "Notes", "Id"];
    const lines = [header.join(",")];

    data.forEach((s) => {
      const ymd = toYMD(s?.spentAt || s?.createdAt);
      lines.push(
        [
          escapeCsv(ymd),
          escapeCsv(s?.source || ""),
          escapeCsv(Number(s?.amount) || 0),
          escapeCsv(s?.currency || "INR"),
          escapeCsv(s?.notes || ""),
          escapeCsv(s?._id || ""),
        ].join(",")
      );
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const name = `marketing_spend_${from || "from"}_to_${to || "to"}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.success("CSV exported");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header + Filters container */}
      <div className="rounded-3xl border border-black/10 bg-white overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
        <div className="h-1 w-full bg-gradient-to-r from-black via-gray-400 to-indigo-500" />

        {/* Header */}
        <div className="px-5 py-5 md:px-6 md:py-6 bg-gray-50 border-b border-black/10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium Spend Tracker
                </span>
                <span className="text-xs text-gray-500">
                  Table view + CSV export
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                Marketing Spend
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Date-wise spend, source summary, and export for budgeting.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-black hover:bg-gray-100 transition"
                title="Export current filtered rows"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>

              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-black hover:bg-gray-100 transition"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>

              <button
                onClick={() => setOpen(true)}
                className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/90 transition"
              >
                + Add Spend
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-5 md:px-6 bg-white">
          <div className="flex flex-col gap-3">
            {/* Quick range chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                <CalendarDays className="w-4 h-4" /> Quick range:
              </span>

              <button
                onClick={() => setQuickRange("today")}
                className="rounded-full border border-black/10 bg-gray-50 px-3 py-1.5 text-xs hover:bg-gray-100"
              >
                Today
              </button>
              <button
                onClick={() => setQuickRange("7d")}
                className="rounded-full border border-black/10 bg-gray-50 px-3 py-1.5 text-xs hover:bg-gray-100"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setQuickRange("month")}
                className="rounded-full border border-black/10 bg-gray-50 px-3 py-1.5 text-xs hover:bg-gray-100"
              >
                This Month
              </button>

              <div className="ml-auto text-xs text-gray-500">
                Range total:{" "}
                <span className="font-semibold text-black">
                  ₹{money(rangeTotal)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Source
                </label>
                <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-black"
                  >
                    <option value="">All Sources</option>
                    {SOURCES.filter((s) => s).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">From</label>
                <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">To</label>
                <div className="rounded-2xl border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-black"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={load}
                  className="w-full rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/90 transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-black/10 bg-white p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">This month ({currentMonth})</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-black">
              ₹{money(summary?.grandTotal || 0)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Source-wise breakdown.
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-gray-50 px-4 py-3">
            <div className="text-xs text-gray-500">Filtered rows</div>
            <div className="font-semibold text-black">{rows.length}</div>
          </div>
        </div>

        {Array.isArray(summary?.bySource) && summary.bySource.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.bySource.slice(0, 12).map((r) => (
              <div
                key={r.source}
                className="rounded-2xl border border-black/10 bg-gray-50 px-4 py-3"
              >
                <div className="text-xs text-gray-500">{r.source}</div>
                <div className="mt-1 font-semibold text-black">
                  ₹{money(r.total)}
                </div>
                <div className="text-xs text-gray-500">{r.count} entries</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No summary yet.</p>
        )}
      </div>

      {/* Errors */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {safe(error)}
        </div>
      ) : null}

      {/* TABLE */}
      <div className="rounded-3xl border border-black/10 bg-white overflow-hidden shadow-[0_14px_40px_rgba(0,0,0,0.05)]">
  <div className="px-5 py-4 bg-gray-50 border-b border-black/10 flex items-center justify-between">
    <div>
      <div className="font-semibold text-black">Spend Table</div>
      <div className="text-xs text-gray-500">
        {from} → {to} {source ? `• ${source}` : "• All sources"}
      </div>
    </div>

    <div className="text-right">
      <div className="text-xs text-gray-500">Filtered total</div>
      <div className="font-semibold text-black">₹{money(rangeTotal)}</div>
    </div>
  </div>

  {loading ? (
    <div className="p-5 text-sm text-gray-500">Loading...</div>
  ) : rows.length === 0 ? (
    <div className="p-5 text-sm text-gray-500">
      No spends found for selected filters.
    </div>
  ) : (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b border-black/10">
          <tr className="text-left text-xs text-gray-500">
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Source</th>
            <th className="px-5 py-3 font-medium text-right">Amount</th>
            <th className="px-5 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-black/5">
          {rows.map((s) => {
            const ymd = toYMD(s?.spentAt || s?.createdAt);
            return (
              <tr key={s._id} className="hover:bg-gray-50/70 transition">
                <td className="px-5 py-3">
                  <div className="font-medium text-black">
                    {prettyDate(ymd)}
                  </div>
                  <div className="text-xs text-gray-500">{ymd}</div>
                </td>

                <td className="px-5 py-3">
                  <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-gray-700">
                    {safe(s.source)}
                  </span>
                </td>

                <td className="px-5 py-3 text-right">
                  <div className="font-semibold text-black whitespace-nowrap">
                    ₹{money(s.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {safe(s.currency || "INR")}
                  </div>
                </td>

                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => onDelete(s._id)}
                    className="inline-flex items-center justify-center p-2.5 rounded-2xl border border-black/10 bg-white hover:bg-red-50 hover:border-red-200 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</div>

      {/* Modal */}
      <MarketingSpendModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={onAddSpend}
        apiBase={API}
      />
    </div>
  );
}