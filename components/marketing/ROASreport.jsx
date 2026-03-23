"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  TrendingUp,
  Download,
  PlusCircle,
  Loader2,
  Filter,
  CalendarDays,
  BadgeIndianRupee,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { useOrderReportsStore } from "@/store/orderReportsStore";
import MarketingSpendModal from "@/components/marketing/MarketingSpendModal";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v) =>
  `₹ ${num(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const ratio = (v) => `${num(v).toFixed(2)}x`;

const prettyDate = (ymd) => {
  if (!ymd) return "—";
  const dt = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const todayYMD = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const shiftDays = (ymd, days) => {
  if (!ymd) return "";
  const dt = new Date(`${ymd}T00:00:00`);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const d = `${dt.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const monthStart = (ymd) => {
  if (!ymd) return "";
  const dt = new Date(`${ymd}T00:00:00`);
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}-01`;
};

const getPresetRange = (key) => {
  const today = todayYMD();

  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: shiftDays(today, -1), to: shiftDays(today, -1) };
    case "last7":
      return { from: shiftDays(today, -6), to: today };
    case "last30":
      return { from: shiftDays(today, -29), to: today };
    case "thisMonth":
      return { from: monthStart(today), to: today };
    default:
      return { from: "", to: "" };
  }
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const AccentCard = ({ icon: Icon, title, value, sub, tone = "blue" }) => {
  const tones = {
    blue: "from-blue-500 to-cyan-500 text-blue-700 bg-blue-50 border-blue-100",
    violet:
      "from-violet-500 to-fuchsia-500 text-violet-700 bg-violet-50 border-violet-100",
    emerald:
      "from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50 border-emerald-100",
    amber:
      "from-amber-500 to-orange-500 text-amber-700 bg-amber-50 border-amber-100",
    rose: "from-rose-500 to-pink-500 text-rose-700 bg-rose-50 border-rose-100",
    indigo:
      "from-indigo-500 to-blue-500 text-indigo-700 bg-indigo-50 border-indigo-100",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        tones[tone]?.split(" ").slice(3).join(" ")
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {title}
          </div>
          <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
          {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
        </div>

        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
            tones[tone]?.split(" ").slice(0, 2).join(" ")
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const ChipButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-xl px-3 py-2 text-xs font-medium transition",
      active
        ? "bg-black text-white"
        : "border border-black/10 bg-white text-gray-700 hover:bg-gray-50"
    )}
  >
    {children}
  </button>
);

export default function ROASreport() {
  const {
    roasSummary,
    roasRows,
    spendRows,
    sources,
    filters,
    roasLoading,
    roasError,
    hydrateAndFetchROAS,
  } = useOrderReportsStore();

  const [from, setFrom] = useState(filters?.from || "");
  const [to, setTo] = useState(filters?.to || "");
  const [source, setSource] = useState(filters?.source || "");
  const [preset, setPreset] = useState(
    filters?.from || filters?.to ? "custom" : "all"
  );
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(
    async (override = {}) => {
      await hydrateAndFetchROAS({
        from: override.from ?? from,
        to: override.to ?? to,
        source: override.source ?? source,
      });
    },
    [from, to, source, hydrateAndFetchROAS]
  );

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => (Array.isArray(roasRows) ? roasRows : []), [roasRows]);
  const spendList = useMemo(
    () => (Array.isArray(spendRows) ? spendRows : []),
    [spendRows]
  );
  const sourceOptions = useMemo(
    () => ["", ...(Array.isArray(sources) ? sources.filter(Boolean) : [])],
    [sources]
  );

  const totalSpendEntries = useMemo(
    () => spendList.reduce((sum, item) => sum + num(item?.entries), 0),
    [spendList]
  );

  const selectedRangeText = useMemo(() => {
    if (!from && !to) return "All Time";
    return `${from ? prettyDate(from) : "Start"} → ${to ? prettyDate(to) : "End"}`;
  }, [from, to]);

  const handlePreset = async (value) => {
    setPreset(value);
    const range = getPresetRange(value);
    setFrom(range.from);
    setTo(range.to);
    await load({ from: range.from, to: range.to, source });
  };

  const applyFilters = async () => {
    setPreset("custom");
    await load({ from, to, source });
  };

  const clearFilters = async () => {
    setPreset("all");
    setFrom("");
    setTo("");
    setSource("");
    await load({ from: "", to: "", source: "" });
  };

  const downloadExcel = async () => {
    try {
      setDownloading(true);

      const wb = new ExcelJS.Workbook();
      wb.creator = "ChatGPT";
      wb.created = new Date();

      const summarySheet = wb.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "From", key: "from", width: 14 },
        { header: "To", key: "to", width: 14 },
        { header: "Source", key: "source", width: 18 },
        { header: "Spend Total", key: "spendTotal", width: 16 },
        { header: "Revenue All", key: "revenueAll", width: 16 },
        { header: "Revenue Valid", key: "revenueValid", width: 16 },
        { header: "Orders All", key: "ordersAll", width: 14 },
        { header: "Orders Valid", key: "ordersValid", width: 14 },
        { header: "AOV All", key: "aovAll", width: 14 },
        { header: "AOV Valid", key: "aovValid", width: 14 },
        { header: "ROAS All", key: "roasAll", width: 14 },
        { header: "ROAS Valid", key: "roasValid", width: 14 },
      ];

      summarySheet.addRow({
        from: from || "ALL",
        to: to || "ALL",
        source: source || "All",
        spendTotal: num(roasSummary?.spendTotal),
        revenueAll: num(roasSummary?.revenueAll),
        revenueValid: num(roasSummary?.revenueValid),
        ordersAll: num(roasSummary?.ordersAll),
        ordersValid: num(roasSummary?.ordersValid),
        aovAll: num(roasSummary?.aovAll),
        aovValid: num(roasSummary?.aovValid),
        roasAll: num(roasSummary?.roasAll),
        roasValid: num(roasSummary?.roasValid),
      });
      summarySheet.getRow(1).font = { bold: true };

      const daySheet = wb.addWorksheet("Day Wise");
      daySheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Entries", key: "entries", width: 12 },
        { header: "Revenue All", key: "revenueAll", width: 16 },
        { header: "Revenue Valid", key: "revenueValid", width: 16 },
        { header: "Orders All", key: "ordersAll", width: 14 },
        { header: "Orders Valid", key: "ordersValid", width: 14 },
        { header: "AOV All", key: "aovAll", width: 14 },
        { header: "AOV Valid", key: "aovValid", width: 14 },
        { header: "ROAS All", key: "roasAll", width: 14 },
        { header: "ROAS Valid", key: "roasValid", width: 14 },
      ];

      rows.forEach((row) =>
        daySheet.addRow({
          date: row.ymd,
          spend: num(row.spend),
          entries: num(row.entries),
          revenueAll: num(row.revenueAll),
          revenueValid: num(row.revenueValid),
          ordersAll: num(row.ordersAll),
          ordersValid: num(row.ordersValid),
          aovAll: num(row.aovAll),
          aovValid: num(row.aovValid),
          roasAll: num(row.roasAll),
          roasValid: num(row.roasValid),
        })
      );
      daySheet.getRow(1).font = { bold: true };

      const spendSheet = wb.addWorksheet("Spend Day Wise");
      spendSheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Spend", key: "spend", width: 14 },
        { header: "Entries", key: "entries", width: 12 },
      ];

      spendList.forEach((row) =>
        spendSheet.addRow({
          date: row.ymd,
          spend: num(row.spend),
          entries: num(row.entries),
        })
      );
      spendSheet.getRow(1).font = { bold: true };

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `roas-report-${from || "all"}-${to || "all"}.xlsx`
      );
    } catch (error) {
      alert(error?.message || "Failed to export excel");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-black">ROAS Report</h2>
                <p className="text-xs text-gray-500">
                  {selectedRangeText}
                  {source ? ` • ${source}` : " • All Sources"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowSpendModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white"
              >
                <PlusCircle className="h-4 w-4" />
                Add Spend
              </button>

              <button
                type="button"
                onClick={downloadExcel}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
              </button>

              <button
                type="button"
                onClick={() => load()}
                disabled={roasLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
              >
                {roasLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-black">Filters</div>
              <div className="text-xs text-gray-500">
                Quick range + custom dates + source filter
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <ChipButton active={preset === "all"} onClick={() => handlePreset("all")}>
              All Time
            </ChipButton>
            <ChipButton active={preset === "today"} onClick={() => handlePreset("today")}>
              Today
            </ChipButton>
            <ChipButton
              active={preset === "yesterday"}
              onClick={() => handlePreset("yesterday")}
            >
              Yesterday
            </ChipButton>
            <ChipButton active={preset === "last7"} onClick={() => handlePreset("last7")}>
              Last 7 Days
            </ChipButton>
            <ChipButton active={preset === "last30"} onClick={() => handlePreset("last30")}>
              Last 30 Days
            </ChipButton>
            <ChipButton
              active={preset === "thisMonth"}
              onClick={() => handlePreset("thisMonth")}
            >
              This Month
            </ChipButton>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                From
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPreset("custom");
                    setFrom(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-300"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                To
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPreset("custom");
                    setTo(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-300"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300"
              >
                {sourceOptions.map((item) => (
                  <option key={item || "all"} value={item}>
                    {item || "All Sources"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                disabled={roasLoading}
                className="flex-1 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {roasLoading ? "Applying..." : "Apply"}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black"
              >
                Clear
              </button>
            </div>
          </div>

          {roasError ? (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {roasError}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AccentCard
            icon={BadgeIndianRupee}
            title="Marketing Spend"
            value={money(roasSummary?.spendTotal)}
            sub={`${totalSpendEntries.toLocaleString("en-IN")} entries`}
            tone="amber"
          />
          <AccentCard
            icon={TrendingUp}
            title="Revenue (All Status)"
            value={money(roasSummary?.revenueAll)}
            sub={`ROAS: ${ratio(roasSummary?.roasAll)}`}
            tone="blue"
          />
          <AccentCard
            icon={TrendingUp}
            title="Revenue (Excl. Failed/Cancelled)"
            value={money(roasSummary?.revenueValid)}
            sub={`ROAS: ${ratio(roasSummary?.roasValid)}`}
            tone="emerald"
          />
        
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-black">Day-wise Report</h3>
              <p className="text-xs text-gray-500">
                Compact view with spend, revenue, orders, AOV and ROAS
              </p>
            </div>

            <div className="text-xs text-gray-500">
              Rows: <span className="font-medium text-black">{rows.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Spend</th>
                  <th className="px-4 py-3">Entries</th>
                  <th className="px-4 py-3">Revenue All</th>
                  <th className="px-4 py-3">Revenue Valid</th>
                  <th className="px-4 py-3">Orders All</th>
                  <th className="px-4 py-3">Orders Valid</th>
                  <th className="px-4 py-3">AOV All</th>
                  <th className="px-4 py-3">AOV Valid</th>
                  <th className="px-4 py-3">ROAS All</th>
                  <th className="px-4 py-3">ROAS Valid</th>
                </tr>
              </thead>

              <tbody>
                {roasLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((row) => (
                    <tr
                      key={row.ymd}
                      className="border-t border-black/5 transition hover:bg-gray-50/70"
                    >
                      <td className="px-4 py-3 font-medium text-black">
                        {prettyDate(row.ymd)}
                      </td>
                      <td className="px-4 py-3 text-amber-700 font-medium">
                        {money(row.spend)}
                      </td>
                      <td className="px-4 py-3">{num(row.entries)}</td>
                      <td className="px-4 py-3 text-blue-700 font-medium">
                        {money(row.revenueAll)}
                      </td>
                      <td className="px-4 py-3 text-emerald-700 font-medium">
                        {money(row.revenueValid)}
                      </td>
                      <td className="px-4 py-3">{num(row.ordersAll)}</td>
                      <td className="px-4 py-3">{num(row.ordersValid)}</td>
                      <td className="px-4 py-3 text-violet-700 font-medium">
                        {money(row.aovAll)}
                      </td>
                      <td className="px-4 py-3 text-rose-700 font-medium">
                        {money(row.aovValid)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {ratio(row.roasAll)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {ratio(row.roasValid)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MarketingSpendModal
        open={showSpendModal}
        onClose={() => setShowSpendModal(false)}
        onSaved={() => {
          setShowSpendModal(false);
          load();
        }}
      />
    </>
  );
}