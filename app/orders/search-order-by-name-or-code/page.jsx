"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  Download,
  PackageSearch,
  Hash,
  FileText,
  AlertCircle,
} from "lucide-react";
import { normalizeOrderNumberInput } from "@/utils/formatters";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const isDigitsOnly = (v) => /^\d+$/.test(String(v || "").trim());

const normalizeProductCode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!isDigitsOnly(raw)) return raw;
  return raw.padStart(5, "0");
};

const normalizeOrderNumber = (value) => {
  return normalizeOrderNumberInput(value);
};

const downloadCSV = (rows, filename = "product-order-search.csv") => {
  const headers = ["search_term", "order_number"];
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [row.search_term, row.order_number]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

function StatCard({ icon: Icon, label, value, tone = "zinc" }) {
  const tones = {
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function SearchOrderByNameOrCodePage() {
  const [input, setInput] = useState("");
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderNumbers, setOrderNumbers] = useState([]);

  const normalizedInput = useMemo(() => normalizeProductCode(input), [input]);

  const csvRows = useMemo(() => {
    return orderNumbers.map((orderNumber) => ({
      search_term: searched || "",
      order_number: orderNumber,
    }));
  }, [orderNumbers, searched]);

  const handleSearch = async (e) => {
    e?.preventDefault?.();

    const q = normalizeProductCode(input);

    if (!q) {
      setError("Please enter product name or product code");
      setOrderNumbers([]);
      setSearched("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(q);

      const res = await fetch(
        `${BASE_URL}/api/orders/product-order-search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to search");
      }

      const cleanOrderNumbers = Array.isArray(data?.orderNumbers)
        ? [...new Set(data.orderNumbers.map(normalizeOrderNumber).filter(Boolean))]
        : [];

      setOrderNumbers(cleanOrderNumbers);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setOrderNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput("");
    setSearched("");
    setError("");
    setOrderNumbers([]);
  };

  const handleExportCSV = () => {
    if (!csvRows.length) return;
    const safeSearch = String(searched || "search").replace(/[^\w-]+/g, "_");
    downloadCSV(csvRows, `product-order-search-${safeSearch}.csv`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50/40 to-white text-zinc-900">
      <div className="w-full px-4 py-6 md:px-8 lg:px-12 xl:px-16">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <PackageSearch size={14} />
              Product → Order Search
            </div>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Search Order Numbers by Product Name / Code
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Enter a product name or product code to fetch all related order numbers.
              Numeric product codes are auto-normalized to 5 digits.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!orderNumbers.length}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            icon={Hash}
            label="Normalized Input"
            value={normalizedInput || "—"}
            tone="violet"
          />
          <StatCard
            icon={FileText}
            label="Searched"
            value={searched || "—"}
            tone="blue"
          />
          <StatCard
            icon={PackageSearch}
            label="Orders Found"
            value={orderNumbers.length}
            tone="emerald"
          />
        </div>

        {/* Search box */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
          >
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Product Name / Product Code
              </label>

              <div className="group flex h-12 items-center gap-3 rounded-2xl border border-zinc-300 bg-white px-4 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                <Search size={18} className="text-zinc-400 group-focus-within:text-violet-600" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter product name or code"
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                />
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Normalized preview:{" "}
                <span className="font-semibold text-violet-700">
                  {normalizedInput || "—"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search size={16} />
                {loading ? "Searching..." : "Search"}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <RefreshCcw size={16} />
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        {/* Results */}
        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Results</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {searched ? (
                  <>
                    Showing order numbers for{" "}
                    <span className="font-semibold text-zinc-800">{searched}</span>
                  </>
                ) : (
                  "No search performed yet."
                )}
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600">
              <Hash size={14} />
              Total: {orderNumbers.length}
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">
              Searching order numbers...
            </div>
          ) : !orderNumbers.length ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <div className="mb-4 rounded-2xl bg-zinc-100 p-4 text-zinc-500">
                <PackageSearch size={28} />
              </div>
              <h3 className="text-base font-semibold text-zinc-800">
                No order numbers found
              </h3>
              <p className="mt-2 max-w-md text-sm text-zinc-500">
                Search by product name or code to view matching order numbers here.
              </p>
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-zinc-600">
                  Matching orders:{" "}
                  <span className="font-semibold text-zinc-900">
                    {orderNumbers.length}
                  </span>
                </p>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download size={15} />
                  Download CSV
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {orderNumbers.map((orderNumber, idx) => (
                  <div
                    key={orderNumber}
                    className="group rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="rounded-xl bg-violet-50 p-2 text-violet-700 transition group-hover:bg-violet-100">
                        <Hash size={16} />
                      </div>
                      <span className="text-xs font-medium text-zinc-400">
                        #{idx + 1}
                      </span>
                    </div>

                    <p className="break-all text-sm font-semibold tracking-wide text-zinc-900">
                      {orderNumber}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
