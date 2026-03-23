"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package2,
  Boxes,
  RotateCcw,
  Sparkles,
  X,
  Download,
  Loader2,
} from "lucide-react";
import { useOrderReportsStore } from "@/store/orderReportsStore";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const LIMIT_OPTIONS = [10, 20, 50, 100];

const cardBase =
  "rounded-[26px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]";

const inputBase =
  "h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

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

const csvSafe = (value) => {
  const str = String(value ?? "").replace(/"/g, '""');
  return `"${str}"`;
};

const buildCsvRows = (rows = []) => {
  const headers = [
    "Product Code",
    "Product Name",
    "Price",
    "Compare At Price",
    "Image",
  ];

  const body = rows.map((row) =>
    [
      row.productCode || "",
      row.title || row.productName || "",
      row.price ?? "",
      row.compareAtPrice ?? "",
      row.thumbnail || row.productImage || "",
    ]
      .map(csvSafe)
      .join(",")
  );

  return [headers.map(csvSafe).join(","), ...body].join("\n");
};

const downloadTextFile = (content, filename) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
};

const normalizeUnsoldResponseRows = (data) => {
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const buildUnsoldQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (String(value).trim() === "") return;
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

/* -------------------------------------------------------
   SMALL UI
------------------------------------------------------- */

function StatCard({ title, value, subtitle, icon: Icon, accent = "zinc" }) {
  const accentMap = {
    zinc: "bg-zinc-100 text-zinc-900 border-zinc-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
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

function ImageLightbox({ open, image, title, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg transition hover:bg-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <p className="line-clamp-1 text-sm font-semibold text-zinc-900">
            {title || "Product image"}
          </p>
        </div>

        <div className="relative flex min-h-[320px] items-center justify-center bg-zinc-100 p-4 md:min-h-[520px]">
          {image ? (
            <div className="relative h-[300px] w-full md:h-[500px]">
              <Image
                src={image}
                alt={title || "Product"}
                fill
                className="object-contain"
                unoptimized
                sizes="100vw"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500">
              <Package2 className="mb-2 h-8 w-8" />
              <p className="text-sm">No image available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   PAGE
------------------------------------------------------- */

export default function ProductUnSoldReportPage() {
  const {
    unsoldRows,
    unsoldSummary,
    filters,
    unsoldPagination,
    unsoldLoading,
    unsoldError,
    unsoldInitialized,
    setFilter,
    setFilters,
    resetFilters,
    fetchUnsoldProductsReport,
  } = useOrderReportsStore();

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [preview, setPreview] = useState({
    open: false,
    image: "",
    title: "",
  });

  useEffect(() => {
    fetchUnsoldProductsReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const totalUnsoldProducts = Number(unsoldSummary?.totalUnsoldProducts || 0);

  const rangeLabel = useMemo(() => {
    const total = Number(unsoldPagination.total || 0);
    const page = Number(unsoldPagination.page || 1);
    const limit = Number(unsoldPagination.limit || 20);

    if (!total) return "0 results";

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return `${fmtNum(start)}–${fmtNum(end)} of ${fmtNum(total)}`;
  }, [unsoldPagination]);

  /* ---------------- search ---------------- */

  const onSubmitSearch = (e) => {
    e.preventDefault();

    const nextSearch = searchInput.trim();

    setFilters({
      search: nextSearch,
      page: 1,
    });

    fetchUnsoldProductsReport({
      ...filters,
      search: nextSearch,
      page: 1,
    });
  };

  /* ---------------- limit ---------------- */

  const onChangeLimit = (e) => {
    const limit = Number(e.target.value || 20);

    setFilters({
      limit,
      page: 1,
    });

    fetchUnsoldProductsReport({
      ...filters,
      limit,
      page: 1,
    });
  };

  /* ---------------- reset ---------------- */

  const handleReset = () => {
    setSearchInput("");
    resetFilters();

    fetchUnsoldProductsReport({
      search: "",
      page: 1,
      limit: 20,
    });
  };

  /* ---------------- pagination ---------------- */

  const goToPage = (page) => {
    if (page < 1) return;
    if (unsoldPagination.totalPages && page > unsoldPagination.totalPages) return;

    setFilter("page", page);

    fetchUnsoldProductsReport({
      ...filters,
      page,
    });
  };

  /* ---------------- csv download (all filtered rows) ----------------
     Ye current page nahi, saare filtered unsold products ko fetch karega.
  ------------------------------------------------------------------ */

  const handleDownloadAllCsv = async () => {
    try {
      setDownloadingCsv(true);

      const total =
        Number(unsoldPagination?.total || 0) ||
        Number(unsoldSummary?.totalUnsoldProducts || 0);

      // Agar total hi nahi hai to at least first request karein
      const batchSize = total > 0 ? Math.min(Math.max(total, 1000), 10000) : 10000;

      const query = buildUnsoldQuery({
        search: filters.search || "",
        page: 1,
        limit: batchSize,
      });

      const res = await fetch(
        `${API}/api/orders/accounts/sales-report/products/unsold?${query}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch all unsold products for CSV.");
      }

      const data = await res.json();
      let allRows = normalizeUnsoldResponseRows(data);

      /* fallback:
         agar backend ne exact total se kam rows diye ho,
         to baaki pages loop karke le lo
      */
      const backendTotal =
        Number(data?.pagination?.total || 0) ||
        Number(data?.total || 0) ||
        total;

      const backendLimit =
        Number(data?.pagination?.limit || 0) || batchSize;

      const backendTotalPages =
        Number(data?.pagination?.totalPages || 0) ||
        (backendTotal && backendLimit
          ? Math.ceil(backendTotal / backendLimit)
          : 0);

      if (
        backendTotalPages > 1 &&
        allRows.length < backendTotal
      ) {
        const extraRows = [...allRows];

        for (let page = 2; page <= backendTotalPages; page += 1) {
          const nextQuery = buildUnsoldQuery({
            search: filters.search || "",
            page,
            limit: backendLimit,
          });

          const nextRes = await fetch(
            `${API}/api/orders/accounts/sales-report/products/unsold?${nextQuery}`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              cache: "no-store",
            }
          );

          if (!nextRes.ok) break;

          const nextData = await nextRes.json();
          const nextRows = normalizeUnsoldResponseRows(nextData);

          if (!nextRows.length) break;
          extraRows.push(...nextRows);
        }

        allRows = extraRows;
      }

      if (!allRows.length) {
        throw new Error("No data available for CSV download.");
      }

      const csv = buildCsvRows(allRows);

      downloadTextFile(
        csv,
        `unsold-products-all-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (error) {
      console.error("download all csv error:", error);
      alert(error?.message || "CSV download failed.");
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <section className="min-h-screen w-full bg-[#f5f5f5] px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        {/* header */}
        <div className="relative overflow-hidden rounded-[30px] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-6 shadow-[0_15px_50px_rgba(0,0,0,0.05)] md:p-7">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-zinc-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-zinc-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-700 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Products with zero sales till date
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-black md:text-4xl">
                Product UnSold Report
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-[15px]">
                View all products whose sale has not happened yet with image,
                code, name, price, and compare-at-price.
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
                  Status
                </p>
                <p className="mt-1 text-sm font-medium">Never sold</p>
              </div>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard
            title="Total UnSold Products"
            value={fmtNum(totalUnsoldProducts)}
            subtitle="Distinct products with zero sale"
            icon={Boxes}
            accent="zinc"
          />

          <StatCard
            title="Current Page Products"
            value={fmtNum(unsoldRows?.length || 0)}
            subtitle="Rows visible on this page"
            icon={Package2}
            accent="emerald"
          />
        </div>

        {/* table card */}
        <div className={`${cardBase} overflow-hidden`}>
          <div className="border-b border-zinc-200 bg-zinc-50/80 p-4 md:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <form
                  onSubmit={onSubmitSearch}
                  className="grid w-full grid-cols-1 gap-3 xl:max-w-[760px] xl:grid-cols-[minmax(260px,1fr)_140px_120px]"
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search by product code or name"
                      className={`${inputBase} pl-11`}
                    />
                  </div>

                  <select
                    value={filters.limit || 20}
                    onChange={onChangeLimit}
                    className={inputBase}
                  >
                    {LIMIT_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item} / page
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Search
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllCsv}
                    disabled={downloadingCsv || unsoldLoading || !totalUnsoldProducts}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingCsv ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {downloadingCsv ? "Downloading..." : "Download CSV"}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>

              {unsoldError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {unsoldError}
                </div>
              ) : null}
            </div>
          </div>

          {/* table */}
          <div className="overflow-x-auto bg-white">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Image
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Product Code
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Product Name
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Price
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Compare At Price
                  </th>
                  <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Preview
                  </th>
                </tr>
              </thead>

              <tbody>
                {unsoldLoading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-zinc-100">
                      <td className="px-5 py-4">
                        <div className="h-14 w-14 animate-pulse rounded-2xl bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-52 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-zinc-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="mx-auto h-9 w-20 animate-pulse rounded-xl bg-zinc-200" />
                      </td>
                    </tr>
                  ))
                ) : unsoldRows.length ? (
                  unsoldRows.map((row, index) => (
                    <tr
                      key={row._id || row.productCode || index}
                      className="border-b border-zinc-100 transition hover:bg-zinc-50"
                    >
                      <td className="px-5 py-4 align-middle">
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              open: true,
                              image: row.thumbnail || row.productImage || "",
                              title: row.title || row.productName || "Product",
                            })
                          }
                          className="relative block h-14 w-14 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
                        >
                          {row.thumbnail || row.productImage ? (
                            <Image
                              src={row.thumbnail || row.productImage}
                              alt={row.title || row.productName || "Product"}
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
                        </button>
                      </td>

                      <td className="px-5 py-4 align-middle text-sm font-medium text-zinc-700">
                        <span className="rounded-xl bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800">
                          {row.productCode || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="max-w-[360px]">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
                            {row.title || row.productName || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right align-middle text-sm font-medium text-zinc-800">
                        {fmtCurrency(row.price)}
                      </td>

                      <td className="px-5 py-4 text-right align-middle text-sm font-medium text-zinc-600">
                        {row.compareAtPrice
                          ? fmtCurrency(row.compareAtPrice)
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              open: true,
                              image: row.thumbnail || row.productImage || "",
                              title: row.title || row.productName || "Product",
                            })
                          }
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : unsoldInitialized ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="mx-auto flex max-w-lg flex-col items-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-zinc-200 bg-zinc-100">
                          <Package2 className="h-7 w-7 text-zinc-500" />
                        </div>

                        <h3 className="text-xl font-semibold text-zinc-950">
                          No unsold products found
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          Try changing the search keyword or reset the filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* footer */}
          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-600">
              <span>
                Page {fmtNum(unsoldPagination.page || 1)}
                {unsoldPagination.totalPages
                  ? ` of ${fmtNum(unsoldPagination.totalPages)}`
                  : ""}
              </span>

              <span className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700">
                Total unsold: {fmtNum(totalUnsoldProducts)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage((unsoldPagination.page || 1) - 1)}
                disabled={unsoldLoading || !unsoldPagination.hasPrev}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                type="button"
                onClick={() => goToPage((unsoldPagination.page || 1) + 1)}
                disabled={unsoldLoading || !unsoldPagination.hasNext}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageLightbox
        open={preview.open}
        image={preview.image}
        title={preview.title}
        onClose={() =>
          setPreview({
            open: false,
            image: "",
            title: "",
          })
        }
      />
    </section>
  );
}