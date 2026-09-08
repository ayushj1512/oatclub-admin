"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  PackageCheck,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL;

const API = `${BACKEND}/api/products`;

const inputClass =
  "h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-black";

const getIndiaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatISODate = (date) =>
  date.toISOString().slice(0, 10);

const parseISODate = (value) =>
  new Date(`${value}T00:00:00.000Z`);

const addDays = (date, days) => {
  const next = new Date(date);

  next.setUTCDate(
    next.getUTCDate() + days
  );

  return next;
};

const getQuickDateRange = (
  filter,
  todayValue
) => {
  const current =
    parseISODate(todayValue);

  const dayOfWeek =
    current.getUTCDay();

  // Week starts from Monday
  const daysFromMonday =
    dayOfWeek === 0
      ? 6
      : dayOfWeek - 1;

  const thisWeekStart = addDays(
    current,
    -daysFromMonday
  );

  switch (filter) {
    case "today":
      return {
        startDate: todayValue,
        endDate: todayValue,
      };

    case "yesterday": {
      const yesterday = formatISODate(
        addDays(current, -1)
      );

      return {
        startDate: yesterday,
        endDate: yesterday,
      };
    }

    case "this_week":
      return {
        startDate:
          formatISODate(thisWeekStart),
        endDate: todayValue,
      };

    case "last_week":
      return {
        startDate: formatISODate(
          addDays(thisWeekStart, -7)
        ),
        endDate: formatISODate(
          addDays(thisWeekStart, -1)
        ),
      };

    case "this_month":
      return {
        startDate: formatISODate(
          new Date(
            Date.UTC(
              current.getUTCFullYear(),
              current.getUTCMonth(),
              1
            )
          )
        ),
        endDate: todayValue,
      };

    case "last_month":
      return {
        startDate: formatISODate(
          new Date(
            Date.UTC(
              current.getUTCFullYear(),
              current.getUTCMonth() - 1,
              1
            )
          )
        ),
        endDate: formatISODate(
          new Date(
            Date.UTC(
              current.getUTCFullYear(),
              current.getUTCMonth(),
              0
            )
          )
        ),
      };

    default:
      return {
        startDate: todayValue,
        endDate: todayValue,
      };
  }
};

const QUICK_FILTERS = [
  {
    key: "today",
    label: "Today",
  },
  {
    key: "yesterday",
    label: "Yesterday",
  },
  {
    key: "this_week",
    label: "This Week",
  },
  {
    key: "last_week",
    label: "Last Week",
  },
  {
    key: "this_month",
    label: "This Month",
  },
  {
    key: "last_month",
    label: "Last Month",
  },
];

const formatDateTime = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatSource = (value) =>
  String(value || "manual")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  color,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div
      className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${color}`}
    >
      <Icon size={19} />
    </div>

    <p className="text-sm text-gray-500">
      {title}
    </p>

    <p className="mt-1 text-2xl font-semibold text-gray-950">
      {Number(value || 0).toLocaleString(
        "en-IN"
      )}
    </p>
  </div>
);

export default function InventoryLogsPage() {
  const today = getIndiaDate();
  const [
    activeQuickFilter,
    setActiveQuickFilter,
  ] = useState("today");

  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [startDate, setStartDate] =
    useState(today);
  const [endDate, setEndDate] =
    useState(today);

  const [logs, setLogs] = useState([]);
  const [productSummary, setProductSummary] =
    useState([]);

  const [summary, setSummary] = useState({
    totalMovements: 0,
    totalInventoryIn: 0,
    totalInventoryOut: 0,
    totalProducts: 0,
  });

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 30,
      total: 0,
      pages: 1,
    });

  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");

  const fetchReport = useCallback(
    async (requestedPage = 1) => {
      if (!BACKEND) {
        setError(
          "NEXT_PUBLIC_BACKEND_URL is missing"
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          page: String(requestedPage),
          limit: "30",
          startDate,
          endDate,
        });

        if (search.trim()) {
          query.set(
            "search",
            search.trim()
          );
        }

        if (
          type === "IN" ||
          type === "OUT"
        ) {
          query.set("type", type);
        }

        const response = await fetch(
          `${API}/admin/inventory/history/report?${query.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
            "Failed to fetch report"
          );
        }

        setLogs(
          Array.isArray(data?.logs)
            ? data.logs
            : []
        );

        setProductSummary(
          Array.isArray(
            data?.productSummary
          )
            ? data.productSummary
            : []
        );

        setSummary({
          totalMovements: Number(
            data?.summary
              ?.totalMovements || 0
          ),
          totalInventoryIn: Number(
            data?.summary
              ?.totalInventoryIn || 0
          ),
          totalInventoryOut: Number(
            data?.summary
              ?.totalInventoryOut || 0
          ),
          totalProducts: Number(
            data?.summary
              ?.totalProducts || 0
          ),
        });

        setPagination({
          page: Number(
            data?.pagination?.page || 1
          ),
          limit: Number(
            data?.pagination?.limit || 30
          ),
          total: Number(
            data?.pagination?.total || 0
          ),
          pages: Math.max(
            1,
            Number(
              data?.pagination?.pages || 1
            )
          ),
        });
      } catch (fetchError) {
        setLogs([]);
        setProductSummary([]);

        setError(
          fetchError?.message ||
          "Failed to fetch report"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      type,
      startDate,
      endDate,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchReport]);

  const applyQuickFilter = (filter) => {
    const range = getQuickDateRange(
      filter,
      today
    );

    setActiveQuickFilter(filter);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const changePage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.pages ||
      loading
    ) {
      return;
    }

    fetchReport(nextPage);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-5">
      <div className="mx-auto ">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
            className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white hover:bg-gray-100"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-950 sm:text-2xl">
              Inventory Reports
            </h1>

            <p className="text-sm text-gray-500">
              Daily inventory movement and
              product activity
            </p>
          </div>
        </div>

        {/* FILTERS */}

        <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          {/* QUICK FILTERS */}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Quick Range
            </span>

            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() =>
                  applyQuickFilter(filter.key)
                }
                className={`h-9 rounded-xl border px-3 text-xs font-medium transition ${activeQuickFilter === filter.key
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black"
                  }`}
              >
                {filter.label}
              </button>
            ))}

            {activeQuickFilter === "custom" && (
              <span className="h-9 rounded-xl border border-black bg-black px-3 py-2 text-xs font-medium text-white">
                Custom Range
              </span>
            )}
          </div>

          {/* SEARCH + MOVEMENT + DATES */}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_150px_170px_170px]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search product code, title or SKU"
                className={`${inputClass} w-full pl-10`}
              />
            </div>

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className={`${inputClass} w-full`}
            >
              <option value="ALL">
                All movements
              </option>

              <option value="IN">
                Inventory IN
              </option>

              <option value="OUT">
                Inventory OUT
              </option>
            </select>

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => {
                  setStartDate(
                    event.target.value
                  );

                  setActiveQuickFilter(
                    "custom"
                  );
                }}
                className={`${inputClass} w-full pl-9`}
              />
            </div>

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(event) => {
                  setEndDate(
                    event.target.value
                  );

                  setActiveQuickFilter(
                    "custom"
                  );
                }}
                className={`${inputClass} w-full pl-9`}
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* SUMMARY */}
        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            title="Inventory IN"
            value={summary.totalInventoryIn}
            icon={ArrowUp}
            color="bg-emerald-100 text-emerald-700"
          />

          <SummaryCard
            title="Inventory OUT"
            value={summary.totalInventoryOut}
            icon={ArrowDown}
            color="bg-red-100 text-red-700"
          />

          <SummaryCard
            title="Products Updated"
            value={summary.totalProducts}
            icon={PackageCheck}
            color="bg-blue-100 text-blue-700"
          />

          <SummaryCard
            title="Total Movements"
            value={summary.totalMovements}
            icon={History}
            color="bg-gray-100 text-gray-700"
          />
        </section>

        {/* PRODUCT-WISE GROUPED SUMMARY */}
        <section className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Boxes size={18} />

                <h2 className="font-semibold">
                  Product-wise Summary
                </h2>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Selected date range mein har product
                ka total inventory movement
              </p>
            </div>

            <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium">
              {productSummary.length} Products
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading product summary
            </div>
          ) : productSummary.length ? (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        Product
                      </th>

                      <th className="px-4 py-3 text-center font-medium">
                        Total IN
                      </th>

                      <th className="px-4 py-3 text-center font-medium">
                        Total OUT
                      </th>

                      <th className="px-4 py-3 text-center font-medium">
                        Net Change
                      </th>

                      <th className="px-4 py-3 text-center font-medium">
                        Updates
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Last Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {productSummary.map((item) => {
                      const product =
                        item?._id || {};

                      const totalIn = Number(
                        item?.totalIn || 0
                      );

                      const totalOut = Number(
                        item?.totalOut || 0
                      );

                      const netChange =
                        totalIn - totalOut;

                      return (
                        <tr
                          key={String(
                            product.productId
                          )}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  product.thumbnail ||
                                  "/placeholder.png"
                                }
                                alt=""
                                className="h-14 w-11 rounded-lg object-cover"
                              />

                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate font-medium text-gray-950">
                                  {product.title ||
                                    "Product"}
                                </p>

                                <p className="text-xs text-gray-500">
                                  #
                                  {product.productCode ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex rounded-lg bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                              +{totalIn}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex rounded-lg bg-red-100 px-2.5 py-1 font-semibold text-red-700">
                              -{totalOut}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-semibold ${netChange > 0
                                ? "text-emerald-700"
                                : netChange < 0
                                  ? "text-red-700"
                                  : "text-gray-600"
                                }`}
                            >
                              {netChange > 0
                                ? "+"
                                : ""}
                              {netChange}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center font-medium text-gray-700">
                            {Number(
                              item?.totalMovements ||
                              0
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                            {formatDateTime(
                              item?.lastUpdatedAt
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* GRAND TOTAL */}
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td className="px-4 py-4 font-semibold text-gray-950">
                        Grand Total
                        <p className="text-xs font-normal text-gray-500">
                          {productSummary.length}{" "}
                          products
                        </p>
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-emerald-700">
                        +
                        {Number(
                          summary.totalInventoryIn ||
                          0
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-red-700">
                        -
                        {Number(
                          summary.totalInventoryOut ||
                          0
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-4 text-center font-bold">
                        {Number(
                          summary.totalInventoryIn ||
                          0
                        ) -
                          Number(
                            summary.totalInventoryOut ||
                            0
                          ) >
                          0
                          ? "+"
                          : ""}

                        {(
                          Number(
                            summary.totalInventoryIn ||
                            0
                          ) -
                          Number(
                            summary.totalInventoryOut ||
                            0
                          )
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-4 text-center font-bold">
                        {Number(
                          summary.totalMovements || 0
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="divide-y divide-gray-100 md:hidden">
                {productSummary.map((item) => {
                  const product = item?._id || {};

                  const totalIn = Number(
                    item?.totalIn || 0
                  );

                  const totalOut = Number(
                    item?.totalOut || 0
                  );

                  const netChange =
                    totalIn - totalOut;

                  return (
                    <article
                      key={String(product.productId)}
                      className="p-3"
                    >
                      <div className="flex gap-3">
                        <img
                          src={
                            product.thumbnail ||
                            "/placeholder.png"
                          }
                          alt=""
                          className="h-16 w-12 rounded-lg object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {product.title ||
                              "Product"}
                          </p>

                          <p className="text-xs text-gray-500">
                            #
                            {product.productCode ||
                              "—"}
                          </p>

                          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-[10px] uppercase text-gray-400">
                                IN
                              </p>

                              <p className="text-sm font-semibold text-emerald-700">
                                +{totalIn}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase text-gray-400">
                                OUT
                              </p>

                              <p className="text-sm font-semibold text-red-700">
                                -{totalOut}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase text-gray-400">
                                Net
                              </p>

                              <p
                                className={`text-sm font-semibold ${netChange >= 0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                                  }`}
                              >
                                {netChange > 0
                                  ? "+"
                                  : ""}
                                {netChange}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase text-gray-400">
                                Updates
                              </p>

                              <p className="text-sm font-semibold">
                                {item.totalMovements ||
                                  0}
                              </p>
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-gray-400">
                            Last updated:{" "}
                            {formatDateTime(
                              item.lastUpdatedAt
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* MOBILE GRAND TOTAL */}
                <div className="bg-gray-50 p-4">
                  <p className="mb-2 font-semibold">
                    Grand Total
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-100 p-2">
                      <p className="text-xs text-emerald-700">
                        Total IN
                      </p>

                      <p className="font-bold text-emerald-800">
                        +
                        {summary.totalInventoryIn ||
                          0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-red-100 p-2">
                      <p className="text-xs text-red-700">
                        Total OUT
                      </p>

                      <p className="font-bold text-red-800">
                        -
                        {summary.totalInventoryOut ||
                          0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-200 p-2">
                      <p className="text-xs text-gray-600">
                        Net
                      </p>

                      <p className="font-bold text-gray-900">
                        {Number(
                          summary.totalInventoryIn ||
                          0
                        ) -
                          Number(
                            summary.totalInventoryOut ||
                            0
                          ) >
                          0
                          ? "+"
                          : ""}

                        {Number(
                          summary.totalInventoryIn ||
                          0
                        ) -
                          Number(
                            summary.totalInventoryOut ||
                            0
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-gray-500">
              No product activity found for the
              selected filters.
            </div>
          )}
        </section>

        {/* LOGS */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold">
              Movement Timeline
            </h2>

            <p className="text-xs text-gray-500">
              Latest movement shown first
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2
                size={19}
                className="animate-spin"
              />
              Loading inventory report
            </div>
          ) : logs.length ? (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const isIn =
                  log.type === "IN";

                const image =
                  log.thumbnail ||
                  log.images?.[0] ||
                  "/placeholder.png";

                return (
                  <article
                    key={log._id}
                    className="flex gap-3 p-4"
                  >
                    <img
                      src={image}
                      alt=""
                      className="h-16 w-12 shrink-0 rounded-lg object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-medium text-gray-950">
                            {log.title}
                          </p>

                          <p className="text-xs text-gray-500">
                            #
                            {log.productCode ||
                              "—"}

                            {log.size
                              ? ` · Size ${log.size}`
                              : ""}

                            {log.sku
                              ? ` · ${log.sku}`
                              : ""}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <div
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold ${isIn
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {isIn ? (
                              <ArrowUp
                                size={14}
                              />
                            ) : (
                              <ArrowDown
                                size={14}
                              />
                            )}

                            {log.type}{" "}
                            {log.quantityChanged}
                          </div>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatDateTime(
                              log.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>
                          Before:{" "}
                          <strong>
                            {log.stockBefore}
                          </strong>
                        </span>

                        <span>
                          After:{" "}
                          <strong>
                            {log.stockAfter}
                          </strong>
                        </span>

                        <span>
                          Source:{" "}
                          <strong>
                            {formatSource(
                              log.source
                            )}
                          </strong>
                        </span>
                      </div>

                      {log.note ? (
                        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
                          {log.note}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center p-6 text-center">
              <div>
                <History
                  size={34}
                  className="mx-auto mb-3 text-gray-400"
                />

                <p className="font-medium">
                  No inventory activity
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  No movements found for the
                  selected date or filters.
                </p>
              </div>
            </div>
          )}

          {pagination.total > 0 ? (
            <div className="flex items-center justify-between border-t border-gray-100 p-3">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of{" "}
                {pagination.pages} ·{" "}
                {pagination.total} records
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    pagination.page <= 1 ||
                    loading
                  }
                  onClick={() =>
                    changePage(
                      pagination.page - 1
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  disabled={
                    pagination.page >=
                    pagination.pages ||
                    loading
                  }
                  onClick={() =>
                    changePage(
                      pagination.page + 1
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 disabled:opacity-40"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
