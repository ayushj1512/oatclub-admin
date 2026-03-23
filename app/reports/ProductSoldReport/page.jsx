"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package2,
  Boxes,
  SlidersHorizontal,
  RotateCcw,
  CalendarDays,
  LayoutGrid,
  ArrowUpRight,
  ShoppingBag,
  Sparkles,
  Download,
} from "lucide-react";
import { useOrderReportsStore } from "@/store/orderReportsStore";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const REPORT_ENDPOINT = `${API}/api/orders/accounts/sales-report/products`;

const fmtNum = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const fmtCurrency = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
};

const SORT_OPTIONS = [
  { value: "qty_desc", label: "Qty: High to Low" },
  { value: "qty_asc", label: "Qty: Low to High" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "code_asc", label: "Code: A to Z" },
  { value: "code_desc", label: "Code: Z to A" },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

const cardBase =
  "rounded-[26px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]";
const inputBase =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100";

function StatCard({ title, value, subtitle, icon: Icon, accent = "zinc" }) {
  const accentMap = {
    zinc: "bg-zinc-100 text-zinc-900 border-zinc-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <div className={`${cardBase} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {value}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          ) : null}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
            accentMap[accent] || accentMap.zinc
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const safeText = (value) => String(value ?? "").trim();

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildQueryString = ({
  month = "",
  search = "",
  sort = "qty_desc",
  page = 1,
  limit = 20,
}) => {
  const params = new URLSearchParams();

  if (month) params.set("month", month);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);
  params.set("page", String(page));
  params.set("limit", String(limit));

  return params.toString();
};

const normalizePayload = (data) => {
  const rows = Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data?.data?.rows)
    ? data.data.rows
    : Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data?.data?.products)
    ? data.data.products
    : [];

  const pagination =
    data?.pagination ||
    data?.data?.pagination || {
      page: 1,
      limit: rows.length || 0,
      total: rows.length || 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

  return { rows, pagination };
};

const buildCsvContent = (items = []) => {
  const headers = [
    "Product Code",
    "Product Name",
    "Product Image",
    "Selling Price",
    "Qty Sold",
  ];

  const body = items.map((row) =>
    [
      safeText(row.productCode || "-"),
      safeText(row.productName || "-"),
      safeText(row.productImage || ""),
      Number(row.avgSellingPrice || row.sellingPrice || 0).toFixed(2),
      Number(row.totalQtySold || 0),
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.join(","), ...body].join("\n");
};

const downloadCsvFile = (content, filename) => {
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function ProductSoldReportPage() {
  const {
    rows,
    summary,
    filters,
    pagination,
    loading,
    error,
    initialized,
    setFilter,
    setFilters,
    fetchProductSalesReport,
    resetFilters,
  } = useOrderReportsStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [scope, setScope] = useState(filters.month ? "monthly" : "overall");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");

  useEffect(() => {
    fetchProductSalesReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    setScope(filters.month ? "monthly" : "overall");
  }, [filters.month]);

  const rangeLabel = useMemo(() => {
    const total = Number(pagination.total || 0);
    const page = Number(pagination.page || 1);
    const limit = Number(pagination.limit || 20);

    if (!total) return "0 results";

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `${fmtNum(start)}–${fmtNum(end)} of ${fmtNum(total)}`;
  }, [pagination]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.month) count += 1;
    if (filters.search) count += 1;
    if (filters.sort && filters.sort !== "qty_desc") count += 1;
    if (filters.limit && Number(filters.limit) !== 20) count += 1;
    return count;
  }, [filters]);

  const totalOrdersConsidered = Number(summary?.totalOrders || 0);

  const onSubmitSearch = async (e) => {
    e.preventDefault();
    const nextSearch = searchInput.trim();

    setFilters({
      search: nextSearch,
      page: 1,
    });

    fetchProductSalesReport({
      ...filters,
      search: nextSearch,
      page: 1,
    });
  };

  const onChangeScope = async (nextScope) => {
    setScope(nextScope);

    if (nextScope === "overall") {
      setFilters({
        month: "",
        page: 1,
      });

      fetchProductSalesReport({
        ...filters,
        month: "",
        page: 1,
      });
      return;
    }

    const monthValue = filters.month || new Date().toISOString().slice(0, 7);

    setFilters({
      month: monthValue,
      page: 1,
    });

    fetchProductSalesReport({
      ...filters,
      month: monthValue,
      page: 1,
    });
  };

  const onChangeMonth = async (e) => {
    const month = e.target.value;
    setScope(month ? "monthly" : "overall");
    setFilter("month", month);

    fetchProductSalesReport({
      ...filters,
      month,
      page: 1,
    });
  };

  const onChangeSort = async (e) => {
    const sort = e.target.value;
    setFilter("sort", sort);

    fetchProductSalesReport({
      ...filters,
      sort,
      page: 1,
    });
  };

  const onChangeLimit = async (e) => {
    const limit = Number(e.target.value || 20);
    setFilters({ limit, page: 1 });

    fetchProductSalesReport({
      ...filters,
      limit,
      page: 1,
    });
  };

  const handleReset = async () => {
    setSearchInput("");
    setScope("overall");
    setCsvError("");
    resetFilters();

    fetchProductSalesReport({
      month: "",
      search: "",
      sort: "qty_desc",
      page: 1,
      limit: 20,
    });
  };

  const goToPage = async (page) => {
    if (page < 1) return;
    if (pagination.totalPages && page > pagination.totalPages) return;

    setFilter("page", page);

    fetchProductSalesReport({
      ...filters,
      page,
    });
  };

  const handleDownloadOverallCsv = async () => {
    try {
      setCsvLoading(true);
      setCsvError("");

      if (!API) {
        throw new Error("NEXT_PUBLIC_API_URL is missing.");
      }

      const exportLimit = 500;
      let currentPage = 1;
      let totalPages = 1;
      let allRows = [];

      do {
        const qs = buildQueryString({
          month: filters.month || "",
          search: filters.search || "",
          sort: filters.sort || "qty_desc",
          page: currentPage,
          limit: exportLimit,
        });

        const res = await fetch(`${REPORT_ENDPOINT}?${qs}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch report data for CSV.");
        }

        const data = await res.json();
        const normalized = normalizePayload(data);

        allRows = [...allRows, ...(normalized.rows || [])];
        totalPages = Number(normalized.pagination?.totalPages || 1);
        currentPage += 1;
      } while (currentPage <= totalPages);

      if (!allRows.length) {
        throw new Error("No data found to download.");
      }

      const csv = buildCsvContent(allRows);
      const scopeLabel = filters.month ? filters.month : "overall";
      const filename = `product-sold-report-${scopeLabel}.csv`;

      downloadCsvFile(csv, filename);
    } catch (err) {
      setCsvError(err?.message || "CSV download failed.");
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <section className="min-h-screen w-full bg-[#f5f5f5] px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <div className="relative overflow-hidden rounded-[30px] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-6 shadow-[0_15px_50px_rgba(0,0,0,0.05)] md:p-7">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-100/60 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-700 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                Product-wise sales analytics
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-black md:text-4xl">
                Product Sold Report
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-[15px]">
                Track which product sold how much with image, product code,
                product name, selling price, quantity, and number of orders
                considered for this report.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Results
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {rangeLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-black px-4 py-3 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                  View
                </p>
                <p className="mt-1 text-sm font-medium">
                  {scope === "monthly"
                    ? filters.month || "Monthly"
                    : "Overall report"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Products"
            value={fmtNum(summary?.totalProducts)}
            subtitle="Distinct product codes in report"
            icon={Package2}
            accent="zinc"
          />

          <StatCard
            title="Total Qty Sold"
            value={fmtNum(summary?.totalQtySold)}
            subtitle="Units sold in selected scope"
            icon={Boxes}
            accent="emerald"
          />

          <StatCard
            title="Orders Considered"
            value={fmtNum(totalOrdersConsidered)}
            subtitle="Orders used for this calculation"
            icon={ShoppingBag}
            accent="violet"
          />
        </div>

        <div className={`${cardBase} overflow-hidden`}>
          <div className="border-b border-zinc-200 bg-zinc-50/80 p-4 md:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800">
                    <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
                    Filters
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
                    <LayoutGrid className="h-4 w-4 text-zinc-500" />
                    {activeFilterCount} active
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadOverallCsv}
                    disabled={csvLoading}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {csvLoading ? "Downloading..." : "Download CSV"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeScope("overall")}
                    className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                      scope === "overall"
                        ? "border-black bg-black text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Overall
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeScope("monthly")}
                    className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                      scope === "monthly"
                        ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Monthly
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>

              <form
                onSubmit={onSubmitSearch}
                className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1.4fr)_180px_180px_150px_140px]"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by product code or product name"
                    className={`${inputBase} pl-11`}
                  />
                </div>

                <div>
                  <select
                    value={scope}
                    onChange={(e) => onChangeScope(e.target.value)}
                    className={inputBase}
                  >
                    <option value="overall">Overall</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <input
                    type="month"
                    value={filters.month || ""}
                    onChange={onChangeMonth}
                    disabled={scope !== "monthly"}
                    className={`${inputBase} ${
                      scope !== "monthly"
                        ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                        : ""
                    }`}
                  />
                </div>

                <div>
                  <select
                    value={filters.sort || "qty_desc"}
                    onChange={onChangeSort}
                    className={inputBase}
                  >
                    {SORT_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Search
                </button>
              </form>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Scope
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    {scope === "monthly" ? "Monthly report" : "Overall report"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Month
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    {filters.month || "All months"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Sort
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                    {SORT_OPTIONS.find((s) => s.value === filters.sort)?.label ||
                      "Qty: High to Low"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Search
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                    {filters.search || "No keyword"}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Rows / Page
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-900">
                      {filters.limit || 20}
                    </p>

                    <select
                      value={filters.limit || 20}
                      onChange={onChangeLimit}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                    >
                      {LIMIT_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {csvError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {csvError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="min-w-[980px] w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Product
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Product Code
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Product Name
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Selling Price
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Qty Sold
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-zinc-100">
                      <td className="px-5 py-4">
                        <div className="h-14 w-14 animate-pulse rounded-2xl bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-44 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-zinc-200" />
                      </td>
                    </tr>
                  ))
                ) : rows.length ? (
                  rows.map((row, index) => (
                    <tr
                      key={
                        row.key ||
                        `${row.productCode}-${row.productId || "product"}-${index}`
                      }
                      className="border-b border-zinc-100 transition hover:bg-zinc-50"
                    >
                      <td className="px-5 py-4 align-middle">
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                          {row.productImage ? (
                            <Image
                              src={row.productImage}
                              alt={row.productName || "Product"}
                              fill
                              className="object-cover"
                              sizes="56px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-400">
                              <Package2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-sm font-medium text-zinc-700">
                        <span className="rounded-xl bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800">
                          {row.productCode || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="max-w-[340px]">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
                            {row.productName || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right align-middle text-sm font-medium text-zinc-700">
                        {fmtCurrency(row.avgSellingPrice || row.sellingPrice || 0)}
                      </td>

                      <td className="px-5 py-4 text-right align-middle">
                        <span className="inline-flex min-w-[64px] items-center justify-center rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                          {fmtNum(row.totalQtySold || 0)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : initialized ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-20 text-center">
                      <div className="mx-auto flex max-w-lg flex-col items-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-zinc-200 bg-zinc-100">
                          <Package2 className="h-7 w-7 text-zinc-500" />
                        </div>

                        <h3 className="text-xl font-semibold text-zinc-950">
                          No product sales found
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          Try switching between overall and monthly report,
                          changing the search keyword, or adjusting the sort
                          order.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-600">
              <span>
                Page {fmtNum(pagination.page || 1)}
                {pagination.totalPages
                  ? ` of ${fmtNum(pagination.totalPages)}`
                  : ""}
              </span>

              <span className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700">
                Orders considered: {fmtNum(totalOrdersConsidered)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage((pagination.page || 1) - 1)}
                disabled={loading || !pagination.hasPrev}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                type="button"
                onClick={() => goToPage((pagination.page || 1) + 1)}
                disabled={loading || !pagination.hasNext}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}