"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Download,
  Loader2,
  Search,
  X,
} from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
import { useOrderStore } from "@/store/orderStore";
import OrderAdvancedFilters from "@/components/orders/OrderAdvancedFilters";

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const NEW_ORDER_POLL_MS = 15_000;

/* ---------------------------------------------
   ✅ Small UI helpers
--------------------------------------------- */
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}
  >
    {children}
  </div>
);

function NewOrdersNotification({ orders, onView, onDismiss }) {
  if (!orders.length) return null;

  const latest = orders[0];
  const customerName =
    latest?.customerId?.name ||
    latest?.shippingAddressSnapshot?.fullName ||
    "Customer";

  return (
    <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:right-6 sm:top-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Bell size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900">
            {orders.length} New {orders.length === 1 ? "Order" : "Orders"}
          </p>
          <p className="mt-1 truncate text-sm text-gray-600">
            #{latest?.orderNumber || "New"} · {customerName} · {formatINR(getOrderRevenue(latest))}
          </p>
          {orders.length > 1 ? (
            <p className="mt-1 text-xs font-medium text-gray-400">
              +{orders.length - 1} more waiting
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Dismiss new order notification"
        >
          <X size={17} />
        </button>
      </div>

      <button
        type="button"
        onClick={onView}
        className="mt-4 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
      >
        View New Orders
      </button>
    </div>
  );
}

/* ---------------------------------------------
   ✅ IST-safe date helpers
--------------------------------------------- */
const ymdInTZ = (date = new Date(), timeZone = IST_TZ) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
};

const todayYMD_IST = () => ymdInTZ(new Date(), IST_TZ);

const yesterdayYMD_IST = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymdInTZ(d, IST_TZ);
};

const istStartISO = (ymd) => (ymd ? `${ymd}T00:00:00.000${IST_OFFSET}` : "");
const istEndISO = (ymd) => (ymd ? `${ymd}T23:59:59.999${IST_OFFSET}` : "");

const norm = (v) => String(v ?? "").trim().toLowerCase();



/* ---------------------------------------------
   ✅ CSV helpers
--------------------------------------------- */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const formatDateISO = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
};

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : "";
};

const safe = (v) => (v === null || v === undefined ? "" : v);

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getOrderRevenue = (order) => {
  // Keep this aligned with whatever "Amount" column actually shows in OrderRow
  return toNumber(
    order?.finalPayable ??
    order?.totalAmount ??
    order?.grandTotal ??
    order?.amount ??
    0
  );
};

const formatINR = (value) => {
  const n = toNumber(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

/* ---------------------------------------------
   ✅ Pagination helpers
--------------------------------------------- */
const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
};

/* ---------------------------------------------
   ✅ Shared Pagination UI
--------------------------------------------- */
function PaginationBar({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  loading,
  onRefresh,
  onPageChange,
  totalRevenue,
  validRevenue,
}) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
          {totalCount > 0 ? (
            <>
              {" "}
              • Total <span className="font-semibold">{totalCount}</span> orders
            </>
          ) : null}
          {" • "}
          Revenue{" "}
          <span className="font-semibold">
            {formatINR(totalRevenue)}
          </span>

          {" • "}
          Valid Revenue{" "}
          <span className="font-semibold text-emerald-700">
            {formatINR(validRevenue)}
          </span>

          <span className="text-gray-400">
            {" • "}
            {pageSize} per page
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98]"
                }`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Refreshing...
                </span>
              ) : (
                "Refresh"
              )}
            </button>

            <button
              disabled={!canGoPrev || loading}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${!canGoPrev || loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98]"
                }`}
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <button
              disabled={!canGoNext || loading}
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${!canGoNext || loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:opacity-90 active:scale-[0.98]"
                }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {paginationItems.map((item, idx) =>
          item === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-3 py-2 text-sm text-gray-500"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              disabled={loading}
              className={`min-w-[42px] px-3 py-2 rounded-xl text-sm font-semibold transition ${currentPage === item
                ? "bg-black text-white shadow-sm"
                : loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
            >
              {item}
            </button>
          )
        )}
      </div>
    </div>
  );
}


// ============================================================
// 9. OPTIONAL CLIENT FILTER SAFETY
// Update applyClientFiltersToOrders arguments
// ============================================================

const applyClientFiltersToOrders = ({
  orders,
  confirmFilter,
  influencerFilter,
  priority,
  search,
}) => {
  let data = Array.isArray(orders) ? [...orders] : [];

  if (confirmFilter === "confirmed") {
    data = data.filter((o) => o?.isConfirmed === true);
  }

  if (confirmFilter === "not_confirmed") {
    data = data.filter((o) => o?.isConfirmed !== true);
  }

  if (influencerFilter === "true") {
    data = data.filter((o) => o?.isInfluencerOrder === true);
  }

  if (influencerFilter === "false") {
    data = data.filter((o) => o?.isInfluencerOrder !== true);
  }

  if (priority) {
    data = data.filter(
      (o) => norm(o?.priority) === norm(priority),
    );
  }

  const q = String(search || "").trim().toLowerCase();
  if (!q) return data;

  return data.filter((o) => {
    const orderNumber = String(
      o?.orderNumber || "",
    ).toLowerCase();

    const name = String(
      o?.customerId?.name ||
      o?.shippingAddressSnapshot?.fullName ||
      "",
    ).toLowerCase();

    const email = String(
      o?.customerId?.email ||
      o?.shippingAddressSnapshot?.email ||
      "",
    ).toLowerCase();

    const phone = String(
      o?.customerId?.phone ||
      o?.shippingAddressSnapshot?.phone ||
      "",
    ).toLowerCase();

    return (
      orderNumber.includes(q) ||
      name.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );
  });
};

const INITIAL_ORDER_FILTERS = {
  quickDate: "",
  startDate: "",
  endDate: "",

  minAmount: "",
  maxAmount: "",
  minDiscount: "",
  maxDiscount: "",

  confirmFilter: "",
  isInfluencerOrder: "",

  paymentStatus: "",
  excludePaymentStatus: "",

  paymentMethod: "",
  excludePaymentMethod: "",

  fulfillmentStatus: "",
  excludeFulfillmentStatus: "",

  priority: "",
  excludePriority: "",

  productCode: "",
  excludeProductCode: "",

  sku: "",
  excludeSku: "",

  size: "",
  excludeSize: "",

  color: "",
  excludeColor: "",

  city: "",
  excludeCity: "",

  state: "",
  excludeState: "",

  pincode: "",
  excludePincode: "",

  courier: "",
  excludeCourier: "",

  hasAwb: "",
  hasTracking: "",
  hasLabel: "",

  hasCoupon: "",
  couponCode: "",
  excludeCouponCode: "",

  attributionSource: "",
  excludeAttributionSource: "",

  attributionCampaign: "",
  excludeAttributionCampaign: "",
};

/* ---------------------------------------------
   Page
--------------------------------------------- */
export default function OrdersListPage() {
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);

  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState(INITIAL_ORDER_FILTERS);
  const [loading, setLoading] = useState(false);
  const [ordersMeta, setOrdersMeta] = useState({
    page: 1,
    limit: 100,
    totalCount: 0,
    totalPages: 1,
    totalSum: null,
  });

  const [exportLoading, setExportLoading] = useState(false);
  // Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [newOrders, setNewOrders] = useState([]);
  const knownOrderIdsRef = useRef(new Set());
  const pollingRef = useRef(false);
  const baselineReadyRef = useRef(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [readyToFulfill, setReadyToFulfill] =
    useState(false);
  const pageSize = 100;

  // ✅ Update only changed order in list, avoid full page refresh feel
  const handleOrderUpdated = useCallback(
    (updatedOrder) => {
      if (!updatedOrder?._id) return;

      syncOrderInList(updatedOrder);
      setOrders((current) =>
        current.map((order) =>
          String(order?._id) === String(updatedOrder._id)
            ? { ...order, ...updatedOrder }
            : order,
        ),
      );
    },
    [syncOrderInList]
  );

  const setFilter = useCallback((key, value) => {
    setCurrentPage(1);

    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setFilters(INITIAL_ORDER_FILTERS);
    setCurrentPage(1);
    setReadyToFulfill(false);
  }, []);

  const applySearch = useCallback(() => {
    setCurrentPage(1);
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    clearFilters();
  }, [clearFilters]);


  const backendFilters = useMemo(() => {
    const payload = {
      ...filters,
      page: currentPage,
      limit: pageSize,
      includeSum: "true",
    };

    if (search) payload.search = search;

    if (filters.startDate) {
      payload.startDate = filters.startDate;
      payload.startAt = istStartISO(filters.startDate);
    }

    if (filters.endDate) {
      payload.endDate = filters.endDate;
      payload.endAt = istEndISO(filters.endDate);
    }

    delete payload.quickDate;

    return Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) =>
          value !== "" && value !== null && value !== undefined,
      ),
    );
  }, [filters, search, currentPage, pageSize]);

  const requestAdvancedOrders = useCallback(async (filters) => {
    if (!API) {
      throw new Error("NEXT_PUBLIC_API_URL is missing.");
    }

    const params = new URLSearchParams();

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) return;
      params.set(key, String(value));
    });

    const response = await fetch(
      `${API}/api/orders/advanced-filter?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload?.message ||
        payload?.error ||
        "Unable to fetch advanced filtered orders.",
      );
    }

    return {
      orders: Array.isArray(payload?.orders) ? payload.orders : [],
      meta: payload?.meta && typeof payload.meta === "object"
        ? payload.meta
        : {},
    };
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);

    try {
      const result = await requestAdvancedOrders(backendFilters);

      setOrders(result.orders);
      setOrdersMeta({
        page: toNumber(result.meta?.page) || currentPage,
        limit: toNumber(result.meta?.limit) || pageSize,
        totalCount: toNumber(result.meta?.totalCount),
        totalPages: Math.max(1, toNumber(result.meta?.totalPages) || 1),
        totalSum:
          result.meta?.totalSum === null || result.meta?.totalSum === undefined
            ? null
            : toNumber(result.meta.totalSum),
      });
    } catch (error) {
      console.error("Orders Fetch Error:", error);
      setOrders([]);
      setOrdersMeta({
        page: currentPage,
        limit: pageSize,
        totalCount: 0,
        totalPages: 1,
        totalSum: null,
      });
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [backendFilters, currentPage, requestAdvancedOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Build a clean baseline from the actual latest orders. This prevents
  // old orders from appearing as new when the page has active filters.
  useEffect(() => {
    if (!hasLoadedOnce || !API || baselineReadyRef.current) return;

    let cancelled = false;

    const initializePollingBaseline = async () => {
      try {
        const response = await fetch(`${API}/api/orders?page=1&limit=10`, {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const payload = await response.json().catch(() => ({}));
        const latestOrders = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.orders)
            ? payload.orders
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        for (const order of latestOrders) {
          if (order?._id) knownOrderIdsRef.current.add(String(order._id));
        }

        baselineReadyRef.current = true;
      } catch (error) {
        console.error("New order baseline failed:", error);
      }
    };

    initializePollingBaseline();

    return () => {
      cancelled = true;
    };
  }, [hasLoadedOnce]);

  const checkForNewOrders = useCallback(async () => {
    if (!API || !baselineReadyRef.current || pollingRef.current) return;

    pollingRef.current = true;

    try {
      const response = await fetch(`${API}/api/orders?page=1&limit=10`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = await response.json().catch(() => ({}));
      const latestOrders = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      const unseenOrders = latestOrders.filter((order) => {
        if (!order?._id) return false;
        return !knownOrderIdsRef.current.has(String(order._id));
      });

      // Mark every received order as known so the same notification never repeats.
      for (const order of latestOrders) {
        if (order?._id) knownOrderIdsRef.current.add(String(order._id));
      }

      if (unseenOrders.length) {
        setNewOrders((current) => {
          const merged = [...unseenOrders, ...current];
          const unique = new Map();

          for (const order of merged) {
            const key = String(order?._id || order?.orderNumber || "");
            if (key && !unique.has(key)) {
              unique.set(key, order);
            }
          }

          return Array.from(unique.values()).slice(0, 10);
        });

        // Auto refresh table when new order is detected
        await loadOrders();
      }
    } catch (error) {
      console.error("New order polling failed:", error);
    } finally {
      pollingRef.current = false;
    }
  }, [loadOrders]);
  useEffect(() => {
    if (!hasLoadedOnce) return;

    const intervalId = window.setInterval(
      checkForNewOrders,
      NEW_ORDER_POLL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, [hasLoadedOnce, checkForNewOrders]);

  useEffect(() => {
    const getPreviousDate = (daysBack) => {
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      return ymdInTZ(date, IST_TZ);
    };

    if (filters.quickDate === "today") {
      const today = todayYMD_IST();

      setFilters((current) => ({
        ...current,
        startDate: today,
        endDate: today,
      }));

      return;
    }

    if (filters.quickDate === "yesterday") {
      const yesterday = yesterdayYMD_IST();

      setFilters((current) => ({
        ...current,
        startDate: yesterday,
        endDate: yesterday,
      }));

      return;
    }

    if (filters.quickDate === "last_7_days") {
      setFilters((current) => ({
        ...current,
        startDate: getPreviousDate(6),
        endDate: todayYMD_IST(),
      }));

      return;
    }

    if (filters.quickDate === "last_30_days") {
      setFilters((current) => ({
        ...current,
        startDate: getPreviousDate(29),
        endDate: todayYMD_IST(),
      }));

      return;
    }

    if (filters.quickDate === "this_month") {
      const today = todayYMD_IST();
      const [year, month] = today.split("-");

      setFilters((current) => ({
        ...current,
        startDate: `${year}-${month}-01`,
        endDate: today,
      }));

      return;
    }

    setFilters((current) => {
      if (!current.startDate && !current.endDate) {
        return current;
      }

      return {
        ...current,
        startDate: "",
        endDate: "",
      };
    });
  }, [filters.quickDate]);

  const viewNewOrders = useCallback(async () => {
    setNewOrders([]);

    if (currentPage !== 1) {
      setCurrentPage(1);
    }

    await loadOrders();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentPage, loadOrders]);

  const filteredOrders = useMemo(() => {
    let data = applyClientFiltersToOrders({
      orders,
      confirmFilter: filters.confirmFilter,
      influencerFilter: filters.isInfluencerOrder,
      priority: filters.priority,
      search,
    });

    if (readyToFulfill) {
      data = data.filter(
        (order) =>
          order?.isConfirmed !== true &&
          norm(order?.paymentMethod) === "cod" &&
          norm(order?.fulfillmentStatus) === "processing" &&
          order?.fulfillmentReadiness
            ?.isFullyFulfillable === true,
      );
    }

    return data;
  }, [
    orders,
    filters.confirmFilter,
    filters.isInfluencerOrder,
    filters.priority,
    search,
    readyToFulfill,
  ]);

  const getParentOrderNumber = (order = {}) => {
    const orderNumber = String(
      order?.orderNumber || "",
    ).trim();

    // 000089-A -> 000089
    const match = orderNumber.match(
      /^(.+)-([A-Z])$/i,
    );

    return match ? match[1] : "";
  };

  const isSplitChildOrder = (order = {}) => {
    if (order?.parentOrderId) {
      return true;
    }

    return Boolean(
      getParentOrderNumber(order),
    );
  };



  const REVENUE_STATUSES = new Set([
    "processing",
    "packed",
    "picked",
    "shipped",
    "out_for_delivery",
    "delivered",
  ]);

  // All filtered orders revenue
  const revenueOrders = useMemo(
    () =>
      filteredOrders.filter(
        (order) =>
          !isSplitChildOrder(order),
      ),
    [filteredOrders],
  );

  const totalRevenue = useMemo(() => {
    return revenueOrders.reduce(
      (sum, order) =>
        sum + getOrderRevenue(order),
      0,
    );
  }, [revenueOrders]);

  const validRevenue = useMemo(() => {
    return revenueOrders.reduce(
      (sum, order) => {
        const status = String(
          order?.fulfillmentStatus || "",
        ).toLowerCase();

        if (order?.isConfirmed !== true) {
          return sum;
        }

        if (!REVENUE_STATUSES.has(status)) {
          return sum;
        }

        return sum + getOrderRevenue(order);
      },
      0,
    );
  }, [revenueOrders]);
  // ✅ stable sorted list so table work stays neat
  const groupedOrders = useMemo(() => {
    const source = Array.isArray(
      filteredOrders,
    )
      ? filteredOrders
      : [];

    const parentByOrderNumber =
      new Map();

    /*
     * First register all top-level orders.
     */
    for (const order of source) {
      if (isSplitChildOrder(order)) {
        continue;
      }

      const orderNumber = String(
        order?.orderNumber || "",
      ).trim();

      if (orderNumber) {
        parentByOrderNumber.set(
          orderNumber,
          order,
        );
      }
    }

    const childrenByParent =
      new Map();

    /*
     * Attach children using:
     * 1. parentOrderId when available
     * 2. order number fallback: 000089-A -> 000089
     */
    for (const order of source) {
      if (!isSplitChildOrder(order)) {
        continue;
      }

      let parent = null;

      if (order?.parentOrderId) {
        const parentId = String(
          order?.parentOrderId?._id ||
          order?.parentOrderId,
        );

        parent = source.find(
          (candidate) =>
            String(
              candidate?._id ||
              candidate?.id ||
              "",
            ) === parentId,
        );
      }

      if (!parent) {
        const parentOrderNumber =
          getParentOrderNumber(order);

        parent =
          parentByOrderNumber.get(
            parentOrderNumber,
          ) || null;
      }

      if (!parent) {
        continue;
      }

      const parentKey = String(
        parent?._id ||
        parent?.id ||
        parent?.orderNumber,
      );

      if (
        !childrenByParent.has(
          parentKey,
        )
      ) {
        childrenByParent.set(
          parentKey,
          [],
        );
      }

      childrenByParent
        .get(parentKey)
        .push(order);
    }

    /*
     * Only render real top-level orders.
     */
    const topLevelOrders =
      source.filter(
        (order) =>
          !isSplitChildOrder(order),
      );

    const getBaseNumber = (
      order = {},
    ) => {
      const value = String(
        order?.orderNumber || "",
      );

      const match =
        value.match(/\d+/);

      return match
        ? Number(match[0])
        : 0;
    };

    return topLevelOrders
      .map((order) => {
        const parentKey = String(
          order?._id ||
          order?.id ||
          order?.orderNumber,
        );

        const children = [
          ...(childrenByParent.get(
            parentKey,
          ) || []),
        ].sort((a, b) =>
          String(
            a?.splitSuffix ||
            a?.orderNumber ||
            "",
          ).localeCompare(
            String(
              b?.splitSuffix ||
              b?.orderNumber ||
              "",
            ),
          ),
        );

        return {
          order,
          children,
        };
      })
      .sort((a, b) => {
        const an =
          getBaseNumber(a.order);

        const bn =
          getBaseNumber(b.order);

        if (bn !== an) {
          return bn - an;
        }

        const ad = new Date(
          a.order?.createdAt ||
          a.order?.orderDate ||
          0,
        ).getTime();

        const bd = new Date(
          b.order?.createdAt ||
          b.order?.orderDate ||
          0,
        ).getTime();

        return bd - ad;
      });
  }, [filteredOrders]);

  const buildCsvRows = (ordersArr) => {
    const rows = [];

    for (const order of ordersArr || []) {
      const orderId = safe(order?._id || order?.id);
      const orderNumber = safe(order?.orderNumber);
      const orderDate = formatDateISO(order?.createdAt || order?.orderDate);

      const customerName = safe(
        order?.customerId?.name || order?.shippingAddressSnapshot?.fullName
      );
      const customerEmail = safe(
        order?.customerId?.email || order?.shippingAddressSnapshot?.email
      );
      const customerPhone = safe(
        order?.customerId?.phone || order?.shippingAddressSnapshot?.phone
      );

      const subtotal = money(order?.subtotal);
      const discount = money(order?.discount);
      const shippingFee = money(order?.shippingFee);
      const tax = money(order?.tax);
      const totalAmount = money(order?.totalAmount);
      const finalPayable = money(order?.finalPayable);

      const fulfillmentStatus = safe(order?.fulfillmentStatus);
      const isConfirmed = order?.isConfirmed === true ? "YES" : "NO";

      const items = Array.isArray(order?.items) ? order.items : [];

      if (!items.length) {
        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: "",
          itemTitle: "",
          itemProductCode: "",
          itemSku: "",
          itemSize: "",
          itemQuantity: "",
          itemPrice: "",
        });
        continue;
      }

      items.forEach((item, idx) => {
        const snap = item?.productSnapshot || {};
        const itemProductCode = safe(snap?.productCode || "");
        const attrs = Array.isArray(item?.variant?.attributes)
          ? item.variant.attributes
          : [];

        const attrSize =
          attrs.find((a) => String(a?.key || "").toLowerCase() === "size")
            ?.value ||
          attrs.find((a) => String(a?.key || "").toLowerCase() === "sizes")
            ?.value ||
          "";

        const itemSku = safe(item?.variant?.sku || snap?.sku || "");
        const itemSize = safe(item?.selectedSize || attrSize || "");

        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: idx + 1,
          itemTitle: safe(snap?.title),
          itemProductCode,
          itemSku,
          itemSize,
          itemQuantity: money(item?.quantity),
          itemPrice: money(item?.price),
        });
      });
    }

    return rows;
  };

  const exportToCSV = useCallback(async () => {
    if (exportLoading || loading) return;

    setExportLoading(true);

    try {
      const exportLimit = 500;
      const baseFilters = { ...backendFilters };
      delete baseFilters.page;
      delete baseFilters.limit;

      let page = 1;
      let totalPagesToFetch = 1;
      const allOrders = [];

      do {
        const result = await requestAdvancedOrders({
          ...baseFilters,
          page,
          limit: exportLimit,
          includeSum: "false",
        });

        allOrders.push(...result.orders);
        totalPagesToFetch = Math.max(
          1,
          toNumber(result.meta?.totalPages) || 1,
        );
        page += 1;
      } while (page <= totalPagesToFetch);

      const uniqueOrdersMap = new Map();

      for (const order of allOrders) {
        const key = order?._id || order?.id || order?.orderNumber;
        if (key && !uniqueOrdersMap.has(String(key))) {
          uniqueOrdersMap.set(String(key), order);
        }
      }

      const exportOrders = Array.from(uniqueOrdersMap.values());

      if (!exportOrders.length) {
        alert("No orders found to export for the applied filters.");
        return;
      }

      const rows = buildCsvRows(exportOrders);

      const headers = [
        "Order DB Id",
        "Order #",
        "Order Date (ISO)",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Is Confirmed",
        "Fulfillment Status",
        "Subtotal",
        "Discount",
        "Shipping Fee",
        "Tax",
        "Total Amount",
        "Final Payable",
        "Item #",
        "Item Title",
        "Product Code",
        "Item SKU",
        "Item Size",
        "Item Quantity",
        "Item Price",
      ];

      const csvLines = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) =>
          [
            row.orderId,
            row.orderNumber,
            row.orderDate,
            row.customerName,
            row.customerEmail,
            row.customerPhone,
            row.isConfirmed,
            row.fulfillmentStatus,
            row.subtotal,
            row.discount,
            row.shippingFee,
            row.tax,
            row.totalAmount,
            row.finalPayable,
            row.itemIndex,
            row.itemTitle,
            row.itemProductCode,
            row.itemSku,
            row.itemSize,
            row.itemQuantity,
            row.itemPrice,
          ]
            .map(escapeCSV)
            .join(","),
        ),
      ];

      const blob = new Blob([csvLines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

      link.href = url;
      link.setAttribute(
        "download",
        `orders-advanced-filter-${timestamp}.csv`,
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert(error?.message || "Failed to export filtered orders.");
    } finally {
      setExportLoading(false);
    }
  }, [
    exportLoading,
    loading,
    backendFilters,
    requestAdvancedOrders,
  ]);

  const totalCount = toNumber(ordersMeta?.totalCount);
  const totalPages = Math.max(
    1,
    toNumber(ordersMeta?.totalPages) ||
    Math.ceil(totalCount / pageSize),
  );
  const currentMetaPage = toNumber(ordersMeta?.page) || currentPage;



  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-10">
      <NewOrdersNotification
        orders={newOrders}
        onView={viewNewOrders}
        onDismiss={() => setNewOrders([])}
      />

      <div className="mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              All Orders
            </h1>
            <p className="text-gray-500 mt-1">
              View, filter and manage all customer orders.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                {totalCount || filteredOrders.length} Orders
              </span>

              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                Revenue: {formatINR(totalRevenue)}              </span>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                Valid Revenue: {formatINR(validRevenue)}
              </span>

              <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
                Page {currentMetaPage} of {totalPages}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 w-full md:w-80">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search order # / name / email / phone..."
                className="outline-none w-full bg-transparent text-sm placeholder:text-gray-400"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
            </div>

            <button
              onClick={applySearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition"
            >
              <Search size={18} /> Search
            </button>

            <button
              onClick={clearSearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-200 active:scale-[0.98] transition"
            >
              Clear
            </button>

            <button
              onClick={exportToCSV}
              disabled={exportLoading || loading}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-sm active:scale-[0.98] transition ${exportLoading || loading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black text-white hover:opacity-90"
                }`}
            >
              {exportLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Exporting All...
                </>
              ) : (
                <>
                  <Download size={18} /> Export CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <OrderAdvancedFilters
          filters={filters}
          setFilter={setFilter}
          onClear={clearFilters}
          currentPageSize={pageSize}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentPage(1);
              setReadyToFulfill((prev) => !prev);
            }}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${readyToFulfill
                ? "!border-emerald-600 !bg-emerald-600 !text-white"
                : "!border-gray-900 !bg-white !text-gray-900 hover:!bg-gray-50"
              }`}
          >
            🔥 Ready to Fulfill
          </button>
        </div>

        {/* Top Pagination */}
        <Card>
          <PaginationBar
            currentPage={currentMetaPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            loading={loading}
            onRefresh={loadOrders}
            onPageChange={setCurrentPage}
            totalRevenue={totalRevenue}
            validRevenue={validRevenue}
          />
        </Card>

        {/* Table */}
        {/* Table */}
        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Order</th>
                  <th className="px-5 py-4 text-left font-semibold">Customer</th>
                  <th className="px-5 py-4 text-left font-semibold">Payment Status</th>
                  <th className="px-5 py-4 text-left font-semibold">Method</th>
                  <th className="px-5 py-4 text-left font-semibold">Fulfillment</th>
                  <th className="px-5 py-4 text-left font-semibold">Amount</th>
                  <th className="px-5 py-4 text-left font-semibold">Date</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading && !hasLoadedOnce ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-gray-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Loading orders...
                      </div>
                    </td>
                  </tr>
                ) : groupedOrders.length ? (
                  groupedOrders.map(({ order, children }, idx) => {
                    const rowKey =
                      order?._id ||
                      order?.id ||
                      order?.orderNumber ||
                      `order-${idx}`;

                    return (
                      <OrderRow
                        key={String(rowKey)}
                        order={order}
                        childOrders={children}
                        onUpdated={handleOrderUpdated}
                        openActionsUp={
                          idx >= groupedOrders.length - 2
                        }
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No orders found for applied filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Pagination */}
        <Card>
          <PaginationBar
            currentPage={currentMetaPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            loading={loading}
            onRefresh={loadOrders}
            onPageChange={setCurrentPage}
            totalRevenue={totalRevenue}
          />
        </Card>
      </div>
    </section>
  );
}
