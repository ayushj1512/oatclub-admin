"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  Boxes,
  CalendarRange,
  Download,
  Hash,
  Package2,
  RefreshCcw,
  Search,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { useAdminProductionStore } from "@/store/adminProductionStore";

const SIZE_COLUMNS = ["XS", "S", "M", "L", "XL"];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const clean = (v) => String(v ?? "").trim();

const getRowGroupKey = (row) => {
  const code = clean(row?.productCode);
  if (code) return code;

  const sku = clean(row?.sku);
  if (sku) {
    const parts = sku.split("-").filter(Boolean);
    if (parts.length >= 2) return parts[1];
    return sku;
  }

  return clean(row?._id) || "unknown";
};

const extractJobsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.productionJobs)) return response.productionJobs;
  if (Array.isArray(response?.jobs)) return response.jobs;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.data?.productionJobs)) return response.data.productionJobs;
  if (Array.isArray(response?.data?.jobs)) return response.data.jobs;
  if (Array.isArray(response?.data?.rows)) return response.data.rows;
  return [];
};

const extractPaginationFromResponse = (response) =>
  response?.pagination ||
  response?.productionJobPagination ||
  response?.data?.pagination ||
  response?.data?.productionJobPagination ||
  {};

const dedupeRawJobs = (rows) => {
  const source = Array.isArray(rows) ? rows : [];
  const seen = new Set();

  return source.filter((row) => {
    const key = [
      clean(row?._id),
      clean(row?.reservationId),
      clean(row?.lineId),
      clean(row?.sku),
      clean(row?.productCode),
      clean(row?.orderNumber),
      clean(JSON.stringify(row?.sizes || [])),
      num(row?.totalQty),
    ].join("||");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getMergedRowsByProductCode = (rows) => {
  const source = Array.isArray(rows) ? rows : [];
  const map = new Map();

  source.forEach((row, index) => {
    const key = getRowGroupKey(row);

    if (!map.has(key)) {
      map.set(key, {
        ...row,
        __index: index,
        totalQty: num(row?.totalQty),
        ordersCount: num(row?.ordersCount),
        reservationsCount: num(row?.reservationsCount),
        orderNumbers: Array.isArray(row?.orderNumbers) ? [...row.orderNumbers] : [],
        sizes: [],
      });
    } else {
      const existing = map.get(key);

      existing.totalQty += num(row?.totalQty);
      existing.ordersCount += num(row?.ordersCount);
      existing.reservationsCount += num(row?.reservationsCount);
      existing.orderNumbers.push(...(Array.isArray(row?.orderNumbers) ? row.orderNumbers : []));

      if (!existing.productTitle && row?.productTitle) existing.productTitle = row.productTitle;
      if (!existing.productImage && row?.productImage) existing.productImage = row.productImage;
      if (!existing.productModel && row?.productModel) existing.productModel = row.productModel;
      if (!existing.productCode && row?.productCode) existing.productCode = row.productCode;
    }

    const bucket = map.get(key);
    const incomingSizes = Array.isArray(row?.sizes) ? row.sizes : [];

    incomingSizes.forEach((item) => {
      bucket.sizes.push({
        size: clean(item?.size).toUpperCase(),
        qty: num(item?.qty ?? item?.quantity ?? item?.count),
      });
    });
  });

  return Array.from(map.values()).map((row) => {
    const sizeMap = new Map();

    (Array.isArray(row?.sizes) ? row.sizes : []).forEach((item) => {
      const size = clean(item?.size).toUpperCase();
      if (!size) return;
      sizeMap.set(size, (sizeMap.get(size) || 0) + num(item?.qty));
    });

    const mergedSizes = Array.from(sizeMap.entries())
      .map(([size, qty]) => ({ size, qty }))
      .sort((a, b) => {
        const ai = SIZE_COLUMNS.indexOf(a.size);
        const bi = SIZE_COLUMNS.indexOf(b.size);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.size.localeCompare(b.size, undefined, { numeric: true });
      });

    const uniqueOrderNumbers = Array.from(
      new Set(
        (Array.isArray(row?.orderNumbers) ? row.orderNumbers : [])
          .map((v) => clean(v))
          .filter(Boolean)
      )
    );

    return {
      ...row,
      sizes: mergedSizes,
      orderNumbers: uniqueOrderNumbers,
      ordersCount: uniqueOrderNumbers.length || num(row?.ordersCount),
    };
  });
};

const makeExcelRows = (rows) =>
  rows.map((row) => {
    const sizeQtyMap = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };

    (Array.isArray(row?.sizes) ? row.sizes : []).forEach((item) => {
      const size = clean(item?.size).toUpperCase();
      if (SIZE_COLUMNS.includes(size)) sizeQtyMap[size] = num(item?.qty);
    });

    return {
      "product name": row?.productTitle || "",
      "product image": row?.productImage || "",
      "product code": row?.productCode || "",
      xs: sizeQtyMap.XS,
      s: sizeQtyMap.S,
      m: sizeQtyMap.M,
      l: sizeQtyMap.L,
      xl: sizeQtyMap.XL,
    };
  });

function StatCard({ title, value, icon: Icon, hint }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {title}
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-black">{value}</h3>
          {hint ? <p className="mt-2 text-sm text-zinc-500">{hint}</p> : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-black">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

export default function ProductionJobPage() {
  const {
    productionJobs,
    productionJobSummary,
    productionJobPagination,
    productionJobFilters,
    loadingProductionJobs,
    error,
    setProductionJobFilters,
    setProductionJobSearch,
    setProductionJobDateRange,
    resetProductionJobFilters,
    fetchProductionJobs,
    refreshProductionJobs,
  } = useAdminProductionStore();

  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [overallUniqueProductCodes, setOverallUniqueProductCodes] = useState(0);
  const [loadingOverallCount, setLoadingOverallCount] = useState(false);
  const countReqRef = useRef(0);

  useEffect(() => {
    fetchProductionJobs();
  }, [fetchProductionJobs]);

  const rawRows = Array.isArray(productionJobs) ? productionJobs : [];
  const rows = useMemo(() => getMergedRowsByProductCode(rawRows), [rawRows]);

  const countFilterKey = useMemo(
    () =>
      JSON.stringify({
        q: productionJobFilters?.q || "",
        from: productionJobFilters?.from || "",
        to: productionJobFilters?.to || "",
        sort: productionJobFilters?.sort || "qty_desc",
      }),
    [
      productionJobFilters?.q,
      productionJobFilters?.from,
      productionJobFilters?.to,
      productionJobFilters?.sort,
    ]
  );

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (productionJobFilters?.q) c++;
    if (productionJobFilters?.from) c++;
    if (productionJobFilters?.to) c++;
    if (clean(productionJobFilters?.sort) && clean(productionJobFilters?.sort) !== "qty_desc") c++;
    return c;
  }, [productionJobFilters]);

  const fetchAllJobs = async () => {
    const firstTry = await fetchProductionJobs({
      ...productionJobFilters,
      page: 1,
      limit: 100000,
      all: true,
    });

    const firstTryJobs = extractJobsFromResponse(firstTry);
    if (firstTryJobs.length) return dedupeRawJobs(firstTryJobs);

    const allJobs = [];
    let page = 1;
    let hasMore = true;
    const visitedPages = new Set();

    while (hasMore && !visitedPages.has(page)) {
      visitedPages.add(page);

      const response = await fetchProductionJobs({
        ...productionJobFilters,
        page,
        limit: 500,
        all: false,
      });

      const pageJobs = extractJobsFromResponse(response);
      const pagination = extractPaginationFromResponse(response);

      if (pageJobs.length) allJobs.push(...pageJobs);

      hasMore =
        Boolean(pagination?.hasMore) ||
        (num(pagination?.page) > 0 &&
          num(pagination?.pages) > 0 &&
          num(pagination?.page) < num(pagination?.pages));

      if (!pageJobs.length || !hasMore) break;
      page += 1;
    }

    return dedupeRawJobs(allJobs);
  };

  useEffect(() => {
    let cancelled = false;
    const reqId = ++countReqRef.current;

    const loadOverallCount = async () => {
      setLoadingOverallCount(true);

      const currentPage = Math.max(1, num(productionJobPagination?.page) || 1);
      const currentLimit = Math.max(1, num(productionJobFilters?.limit) || 50);

      try {
        const allRawJobs = await fetchAllJobs();
        const merged = getMergedRowsByProductCode(allRawJobs);

        if (!cancelled && reqId === countReqRef.current) {
          setOverallUniqueProductCodes(merged.length);
        }
      } catch (err) {
        console.error("overall product code count error:", err);
      } finally {
        try {
          await fetchProductionJobs({
            ...productionJobFilters,
            page: currentPage,
            limit: currentLimit,
            all: false,
          });
        } catch {}

        if (!cancelled && reqId === countReqRef.current) {
          setLoadingOverallCount(false);
        }
      }
    };

    loadOverallCount();

    return () => {
      cancelled = true;
    };
  }, [countFilterKey]);

  const handleDownloadExcel = async () => {
    if (downloadingExcel) return;

    setDownloadingExcel(true);
    const currentPage = Math.max(1, num(productionJobPagination?.page) || 1);
    const currentLimit = Math.max(1, num(productionJobFilters?.limit) || 50);

    try {
      const allRawJobs = await fetchAllJobs();
      const mergedAllRows = getMergedRowsByProductCode(allRawJobs);
      const excelRows = makeExcelRows(mergedAllRows);

      const ws = XLSX.utils.json_to_sheet(excelRows, {
        header: ["product name", "product image", "product code", "xs", "s", "m", "l", "xl"],
      });

      ws["!cols"] = [
        { wch: 42 },
        { wch: 28 },
        { wch: 16 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Production Jobs");
      XLSX.writeFile(wb, "production-jobs-size-format.xlsx");
    } catch (err) {
      console.error("download excel error:", err);
      alert(err?.message || "Failed to download full Excel");
    } finally {
      try {
        await fetchProductionJobs({
          ...productionJobFilters,
          page: currentPage,
          limit: currentLimit,
          all: false,
        });
      } catch {}

      setDownloadingExcel(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-black">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                <Package2 className="h-3.5 w-3.5" />
                Production Jobs
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Pending confirmed production queue
              </h1>

              <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
                Grouped by <span className="font-semibold text-black">product code</span>.
                Total unique product codes below are counted from{" "}
                <span className="font-semibold text-black">all pages</span> for current filters.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Pending reservations only</Pill>
                <Pill>Confirmed orders only</Pill>
                <Pill>Grouped by product code</Pill>
                <Pill>
                  Total unique product codes:{" "}
                  {loadingOverallCount ? "..." : overallUniqueProductCodes}
                </Pill>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => refreshProductionJobs()}
                disabled={loadingProductionJobs || downloadingExcel}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${loadingProductionJobs ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                onClick={handleDownloadExcel}
                disabled={loadingProductionJobs || downloadingExcel}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloadingExcel ? "Downloading..." : "Download Excel"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total SKUs"
            value={num(productionJobSummary?.totalSkus)}
            icon={Tag}
            hint="Backend summary"
          />
          <StatCard
            title="Unique Product Codes"
            value={loadingOverallCount ? "..." : overallUniqueProductCodes}
            icon={Hash}
            hint="All pages"
          />
          <StatCard
            title="Total Qty"
            value={num(productionJobSummary?.totalQtyToProduce)}
            icon={Boxes}
            hint="Units to produce"
          />
          <StatCard
            title="Orders Covered"
            value={num(productionJobSummary?.totalOrdersCovered)}
            icon={ShoppingBag}
            hint="Confirmed orders"
          />
          <StatCard
            title="Reservations"
            value={num(productionJobSummary?.totalReservations)}
            icon={Package2}
            hint="Pending reservation lines"
          />
        </div>

        <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Filters & search</h2>
              <p className="text-sm text-zinc-500">
                Search by product code, title, order number, size, or color.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                Active filters: {activeFilterCount}
              </span>
              <button
                onClick={() => {
                  resetProductionJobFilters();
                  setTimeout(() => {
                    fetchProductionJobs({
                      q: "",
                      from: "",
                      to: "",
                      sort: "qty_desc",
                      page: 1,
                      limit: 50,
                      all: false,
                    });
                  }, 0);
                }}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Search
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-black focus-within:bg-white">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={productionJobFilters?.q || ""}
                  onChange={(e) => setProductionJobSearch(e.target.value)}
                  placeholder="Search title / code / order / size / color"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                From
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <CalendarRange className="h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  value={productionJobFilters?.from || ""}
                  onChange={(e) =>
                    setProductionJobDateRange({
                      from: e.target.value,
                      to: productionJobFilters?.to || "",
                    })
                  }
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                To
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <CalendarRange className="h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  value={productionJobFilters?.to || ""}
                  onChange={(e) =>
                    setProductionJobDateRange({
                      from: productionJobFilters?.from || "",
                      to: e.target.value,
                    })
                  }
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Sort
              </label>
              <select
                value={productionJobFilters?.sort || "qty_desc"}
                onChange={(e) => setProductionJobFilters({ sort: e.target.value, page: 1 })}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-black focus:bg-white"
              >
                <option value="qty_desc">Qty Desc</option>
                <option value="qty_asc">Qty Asc</option>
                <option value="sku_asc">SKU Asc</option>
                <option value="sku_desc">SKU Desc</option>
                <option value="title_asc">Title Asc</option>
                <option value="title_desc">Title Desc</option>
                <option value="orders_desc">Orders Desc</option>
                <option value="orders_asc">Orders Asc</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-transparent">
                Go
              </label>
              <button
                onClick={() => fetchProductionJobs({ page: 1 })}
                disabled={loadingProductionJobs || downloadingExcel}
                className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingProductionJobs ? "..." : "Apply"}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Production job list</h2>
              <p className="text-sm text-zinc-500">
                Product-code grouped production demand from pending confirmed reservations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700">
                Current page rows: {rows.length}
              </div>
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700">
                Total unique product codes: {loadingOverallCount ? "..." : overallUniqueProductCodes}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80">
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Product</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Product Code</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Sizes</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Qty</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Order Numbers</th>
                </tr>
              </thead>

              <tbody>
                {loadingProductionJobs ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-zinc-100">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !rows.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 text-zinc-500">
                          <Package2 className="h-7 w-7" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-black">No production jobs found</h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          No matching pending reservations were found for confirmed orders with the current filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={`${row?.productCode || "row"}-${index}`}
                      className="border-b border-zinc-100 align-top transition hover:bg-zinc-50/60"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                            {row?.productImage ? (
                              <img
                                src={row.productImage}
                                alt={row?.productTitle || "Product"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                <Package2 className="h-6 w-6" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-6 text-black">
                              {row?.productTitle || "-"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
                                {row?.productModel || "Product"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="inline-flex rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-black">
                          {row?.productCode || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(row?.sizes) && row.sizes.length ? (
                            row.sizes.map((item) => (
                              <span
                                key={item.size}
                                className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700"
                              >
                                {item.size}
                                <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
                                  {num(item.qty)}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-zinc-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="inline-flex min-w-[84px] items-center justify-center rounded-2xl bg-zinc-100 px-4 py-3 text-lg font-semibold text-black">
                          {num(row?.totalQty)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(row?.orderNumbers) && row.orderNumbers.length ? (
                            row.orderNumbers.map((ord, idx) => (
                              <span
                                key={`${ord}-${idx}`}
                                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
                              >
                                {ord}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-zinc-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-zinc-500">
              Backend page{" "}
              <span className="font-semibold text-black">{num(productionJobPagination?.page)}</span>{" "}
              of{" "}
              <span className="font-semibold text-black">{num(productionJobPagination?.pages)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={
                  loadingProductionJobs ||
                  downloadingExcel ||
                  num(productionJobPagination?.page) <= 1
                }
                onClick={() =>
                  fetchProductionJobs({
                    page: Math.max(1, num(productionJobPagination?.page) - 1),
                  })
                }
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>

              <button
                disabled={
                  loadingProductionJobs ||
                  downloadingExcel ||
                  !productionJobPagination?.hasMore
                }
                onClick={() =>
                  fetchProductionJobs({
                    page: num(productionJobPagination?.page) + 1,
                  })
                }
                className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}