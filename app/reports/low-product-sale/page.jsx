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
  LayoutGrid,
  ShoppingBag,
  Sparkles,
  Download,
  TrendingDown,
  ArrowDownUp,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const REPORT_ENDPOINT = `${API}/api/orders/accounts/sales-report/products/low-selling`;

const fmtNum = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const LIMIT_OPTIONS = [10, 20, 50, 100];

const SORT_OPTIONS = [
  { value: "qty_asc", label: "Qty: Low to High" },
  { value: "qty_desc", label: "Qty: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "code_asc", label: "Code: A to Z" },
  { value: "code_desc", label: "Code: Z to A" },
];

const cardBase =
  "rounded-[26px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]";

const inputBase =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100";

function StatCard({ title, value, subtitle, icon: Icon, accent = "zinc" }) {
  const accentMap = {
    zinc: "bg-zinc-100 text-zinc-900 border-zinc-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div className={`${cardBase} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
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

const normalizePayload = (data) => {
  const rows = Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data?.data?.rows)
    ? data.data.rows
    : [];

  const summary = data?.summary || data?.data?.summary || {};
  const rawPagination = data?.pagination || data?.data?.pagination || {};

  return {
    rows,
    summary,
    pagination: {
      page: Number(rawPagination.page || 1),
      limit: Number(rawPagination.limit || rows.length || 20),
      total: Number(rawPagination.total || rows.length || 0),
      totalPages: Number(rawPagination.totalPages || 1),
      hasPrev: Boolean(rawPagination.hasPrev),
      hasNext: Boolean(rawPagination.hasNext),
    },
  };
};

const buildCsvContent = (items = []) => {
  const headers = ["Product Code", "Product Name", "Product Image", "Qty Sold"];

  const body = items.map((row) =>
    [
      safeText(row.productCode || "-"),
      safeText(row.productName || "-"),
      safeText(row.productImage || ""),
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

const sortRows = (items = [], sort = "qty_asc") => {
  const arr = [...items];

  arr.sort((a, b) => {
    const qtyA = Number(a?.totalQtySold || 0);
    const qtyB = Number(b?.totalQtySold || 0);
    const nameA = safeText(a?.productName).toLowerCase();
    const nameB = safeText(b?.productName).toLowerCase();
    const codeA = safeText(a?.productCode).toLowerCase();
    const codeB = safeText(b?.productCode).toLowerCase();

    switch (sort) {
      case "qty_desc":
        return qtyB - qtyA || nameA.localeCompare(nameB);
      case "name_asc":
        return nameA.localeCompare(nameB) || qtyA - qtyB;
      case "name_desc":
        return nameB.localeCompare(nameA) || qtyA - qtyB;
      case "code_asc":
        return codeA.localeCompare(codeB) || qtyA - qtyB;
      case "code_desc":
        return codeB.localeCompare(codeA) || qtyA - qtyB;
      case "qty_asc":
      default:
        return qtyA - qtyB || nameA.localeCompare(nameB);
    }
  });

  return arr;
};

export default function LowProductSalePage() {
  const [allRows, setAllRows] = useState([]);
  const [summary, setSummary] = useState({
    totalLowSellingProducts: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    sort: "qty_asc",
    page: 1,
    limit: 20,
  });

  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");

  const fetchAllRows = async () => {
    setLoading(true);
    setError("");

    try {
      if (!API) {
        throw new Error("NEXT_PUBLIC_API_URL is missing.");
      }

      const exportLimit = 500;
      let currentPage = 1;
      let totalPages = 1;
      let mergedRows = [];
      let firstSummary = {};

      do {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", String(exportLimit));

        const res = await fetch(`${REPORT_ENDPOINT}?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Failed to fetch low product sale report");
        }

        const normalized = normalizePayload(data);

        if (currentPage === 1) {
          firstSummary = normalized.summary || {};
        }

        mergedRows = [...mergedRows, ...(normalized.rows || [])];
        totalPages = Number(normalized.pagination?.totalPages || 1);
        currentPage += 1;
      } while (currentPage <= totalPages);

      setAllRows(mergedRows);
      setSummary({
        totalLowSellingProducts: Number(
          firstSummary?.totalLowSellingProducts || mergedRows.length || 0
        ),
      });
    } catch (err) {
      setAllRows([]);
      setSummary({ totalLowSellingProducts: 0 });
      setError(err?.message || "Failed to fetch low product sale report");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    fetchAllRows();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = safeText(filters.search).toLowerCase();

    let rows = [...allRows];

    if (keyword) {
      rows = rows.filter((row) => {
        const code = safeText(row?.productCode).toLowerCase();
        const name = safeText(row?.productName).toLowerCase();
        return code.includes(keyword) || name.includes(keyword);
      });
    }

    return sortRows(rows, filters.sort);
  }, [allRows, filters.search, filters.sort]);

  const pagination = useMemo(() => {
    const total = filteredRows.length;
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.max(1, Number(filters.limit || 20));
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    const safePage = Math.min(page, totalPages);

    return {
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    };
  }, [filteredRows.length, filters.page, filters.limit]);

  const paginatedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredRows.slice(start, end);
  }, [filteredRows, pagination]);

  useEffect(() => {
    if (Number(filters.page || 1) !== pagination.page) {
      setFilters((prev) => ({
        ...prev,
        page: pagination.page,
      }));
    }
  }, [pagination.page, filters.page]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count += 1;
    if (filters.sort && filters.sort !== "qty_asc") count += 1;
    if (Number(filters.limit) !== 20) count += 1;
    return count;
  }, [filters]);

  const rangeLabel = useMemo(() => {
    const total = Number(pagination.total || 0);
    const page = Number(pagination.page || 1);
    const limit = Number(pagination.limit || 20);

    if (!total) return "0 results";

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `${fmtNum(start)}–${fmtNum(end)} of ${fmtNum(total)}`;
  }, [pagination]);

  const totalProducts = Number(
    summary?.totalLowSellingProducts || filteredRows.length || 0
  );

  const totalQty = useMemo(() => {
    return paginatedRows.reduce(
      (sum, item) => sum + Number(item?.totalQtySold || 0),
      0
    );
  }, [paginatedRows]);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchInput.trim(),
      page: 1,
    }));
  };

  const handleSortChange = (e) => {
    const sort = e.target.value;
    setFilters((prev) => ({
      ...prev,
      sort,
      page: 1,
    }));
  };

  const handleLimitChange = (e) => {
    const limit = Number(e.target.value || 20);
    setFilters((prev) => ({
      ...prev,
      limit,
      page: 1,
    }));
  };

  const handleReset = () => {
    setSearchInput("");
    setCsvError("");
    setFilters({
      search: "",
      sort: "qty_asc",
      page: 1,
      limit: 20,
    });
  };

  const goToPage = (page) => {
    if (loading) return;
    if (page < 1) return;
    if (page > pagination.totalPages) return;

    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleDownloadCsv = async () => {
    try {
      setCsvLoading(true);
      setCsvError("");

      if (!filteredRows.length) {
        throw new Error("No data found to download.");
      }

      const csv = buildCsvContent(filteredRows);
      downloadCsvFile(csv, "low-product-sale-report.csv");
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
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-rose-100/60 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-amber-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-700 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                Low selling product analytics
              </div>

              <h1 className="text-3xl font-bold tracking-[-0.03em] text-black md:text-4xl">
                Low Product Sale Report
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-[15px]">
                Track products with lower movement using product image, code,
                name, and sold quantity.
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
                  Condition
                </p>
                <p className="mt-1 text-sm font-medium">1 to 20 qty sold</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Low Selling Products"
            value={fmtNum(filteredRows.length)}
            subtitle="Products after filters"
            icon={TrendingDown}
            accent="rose"
          />

          <StatCard
            title="Qty Sold"
            value={fmtNum(totalQty)}
            subtitle="Sold qty on current page"
            icon={Boxes}
            accent="amber"
          />

          <StatCard
            title="Rows Shown"
            value={fmtNum(paginatedRows.length)}
            subtitle="Products visible right now"
            icon={ShoppingBag}
            accent="zinc"
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
                    onClick={handleDownloadCsv}
                    disabled={csvLoading}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {csvLoading ? "Downloading..." : "Download CSV"}
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
                onSubmit={handleSearchSubmit}
                className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1.6fr)_190px_150px_140px]"
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

                <div className="relative">
                  <ArrowDownUp className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <select
                    value={filters.sort}
                    onChange={handleSortChange}
                    className={`${inputBase} pl-11`}
                  >
                    {SORT_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={filters.limit}
                    onChange={handleLimitChange}
                    className={inputBase}
                  >
                    {LIMIT_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item} / page
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Report Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    Low sale products
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Condition
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    Qty between 1 and 20
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
                    Sort
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                    {SORT_OPTIONS.find((s) => s.value === filters.sort)?.label ||
                      "Qty: Low to High"}
                  </p>
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
            <table className="min-w-[920px] w-full">
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
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-zinc-200" />
                      </td>
                    </tr>
                  ))
                ) : paginatedRows.length ? (
                  paginatedRows.map((row, index) => (
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
                        <div className="max-w-[360px]">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
                            {row.productName || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right align-middle">
                        <span className="inline-flex min-w-[64px] items-center justify-center rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700">
                          {fmtNum(row.totalQtySold || 0)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : initialized ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-20 text-center">
                      <div className="mx-auto flex max-w-lg flex-col items-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-zinc-200 bg-zinc-100">
                          <Package2 className="h-7 w-7 text-zinc-500" />
                        </div>

                        <h3 className="text-xl font-bold text-zinc-950">
                          No low selling products found
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          Try changing search, sort, or reset the report.
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
                Low selling products: {fmtNum(filteredRows.length)}
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