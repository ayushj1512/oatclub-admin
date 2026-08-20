"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  Truck,
  X,
  TimerReset,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useOrderStore } from "@/store/orderStore";
import ConfirmationTab from "./ConfirmationTab";
import ShippingTab from "./ShippingTab";
import ReviewTab from "./ReviewTab";

const PAGE_SIZE = 20;
const LATE_ORDER_DAYS = 7;
const getDaysSinceOrder = (order = {}) => {
  if (!order?.createdAt) return 0;

  const createdAt = new Date(order.createdAt);

  if (Number.isNaN(createdAt.getTime())) return 0;

  return Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatIST = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const getCustomerName = (order = {}) =>
  String(
    order?.customerId?.name ||
    order?.customer?.name ||
    order?.shippingAddressSnapshot?.fullName ||
    "Customer",
  ).trim();

const getRawPhone = (order = {}) =>
  String(
    order?.customerId?.phone ||
    order?.customer?.phone ||
    order?.shippingAddressSnapshot?.phone ||
    order?.billingAddressSnapshot?.phone ||
    "",
  ).trim();

const normalizeWhatsAppPhone = (value) => {
  let phone = String(value || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  if (phone.length === 10) phone = `91${phone}`;

  return phone.startsWith("91") && phone.length === 12 ? phone : "";
};

const getOrderNumber = (order = {}) =>
  String(order?.orderNumber || order?._id || "-").trim();

const getOrderTotal = (order = {}) =>
  Number(
    order?.finalPayable ??
    order?.pricing?.finalPayable ??
    order?.pricing?.grandTotal ??
    order?.grandTotal ??
    order?.totalAmount ??
    order?.total ??
    0,
  );

const getItems = (order = {}) =>
  Array.isArray(order?.items) ? order.items : [];

const getTotalQuantity = (order = {}) =>
  getItems(order).reduce(
    (sum, item) => sum + Math.max(1, Number(item?.quantity || 1)),
    0,
  );

const getItemTitle = (item = {}) =>
  String(
    item?.productSnapshot?.title ||
    item?.productId?.title ||
    item?.title ||
    "Product",
  ).trim();

const getItemSize = (item = {}) =>
  item?.selectedSize ||
  item?.variant?.size ||
  item?.variant?.attributes?.find(
    (attribute) =>
      String(attribute?.key || "")
        .trim()
        .toLowerCase() === "size",
  )?.value ||
  "";

const getThumbnail = (order = {}) => {
  const item = getItems(order)[0];

  return (
    item?.productSnapshot?.thumbnail ||
    item?.productSnapshot?.images?.[0] ||
    item?.productId?.thumbnail ||
    item?.productId?.images?.[0] ||
    ""
  );
};

const getPaymentLabel = (order = {}) => {
  const method = String(order?.paymentMethod || "").toLowerCase();

  if (method === "cod") return "COD";
  if (method === "razorpay") return "Online";
  if (method === "wallet") return "Wallet";
  if (method === "exchange") return "Exchange";

  return method || "-";
};

const getShippingDetails = (order = {}) => {
  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};

  return {
    awb:
      shipment?.awb ||
      shiprocket?.awb ||
      order?.trackingDetails?.trackingId ||
      order?.trackingDetails?.awb ||
      "",
    courierName:
      shipment?.courierName ||
      shiprocket?.courierName ||
      order?.trackingDetails?.courierName ||
      "",
    trackingUrl:
      shipment?.trackingUrl ||
      shiprocket?.trackingUrl ||
      order?.trackingDetails?.trackingUrl ||
      "",
  };
};

const getItemSummary = (order = {}) => {
  const items = getItems(order);

  if (!items.length) return "Your selected OATCLUB items";

  const visibleItems = items.slice(0, 3).map((item) => {
    const title = getItemTitle(item);
    const size = getItemSize(item);
    const quantity = Math.max(1, Number(item?.quantity || 1));

    return `${title}${size ? ` (${size})` : ""}${quantity > 1 ? ` × ${quantity}` : ""
      }`;
  });

  const remaining = items.length - visibleItems.length;

  return remaining > 0
    ? `${visibleItems.join(", ")} and ${remaining} more item${remaining > 1 ? "s" : ""
    }`
    : visibleItems.join(", ");
};


const createConfirmationMessage = (order = {}) => `Hi ${getCustomerName(order)},

Welcome to *OATCLUB*.

Before we process your order, please confirm the details below:

*Order:* #${getOrderNumber(order)}
*Product:* ${getItemSummary(order)}
*Final Payable:* ${formatCurrency(getOrderTotal(order))}

Each order is carefully quality-checked before dispatch and will be shipped within *7 business days*.

Please reply with:

*YES* – Confirm my order
*NO* – Cancel my order

Thank you for choosing *OATCLUB*.

www.oatclub.in

*Team OATCLUB*
Own All Trends`;

const createShippingMessage = (order = {}) => {
  const { trackingUrl } = getShippingDetails(order);

  return `Hi ${getCustomerName(order)},

Your *OATCLUB* order *#${getOrderNumber(order)}* has been shipped and is on its way.

*Track your order:*
${trackingUrl || "Tracking link will be updated shortly."}

Thank you for shopping with *OATCLUB*.

www.oatclub.in

*Team OATCLUB*
Own All Trends`;
};

const createWhatsAppLink = (order, type) => {
  const phone = normalizeWhatsAppPhone(getRawPhone(order));

  if (!phone) return "";

  let message = createConfirmationMessage(order);

  if (type === "shipping") {
    message = createShippingMessage(order);
  } else if (type === "late") {
    message = createLateOrderMessage(order);
  } else if (type === "review") {
    message = createReviewMessage(order);
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const createLateOrderMessage = (order = {}) => `Hi ${getCustomerName(order)},

We wanted to share a quick update regarding your *OATCLUB* order *#${getOrderNumber(order)}*.

Your products are taking a little longer than expected to get ready, and we sincerely apologise for the delay.

Please be assured that your order has been marked as *HIGH PRIORITY* and our team is working to get it ready and dispatched as soon as possible.

We truly appreciate your patience and understanding. 🤍

Thank you for choosing *OATCLUB*.

www.oatclub.in

*Team OATCLUB*
Own All Trends`;

const createReviewMessage = (order = {}) => `Hi ${getCustomerName(order)}!

Hope you're loving your *OATCLUB* order *#${getOrderNumber(order)}*.

We'd love to hear what you think!

You can simply reply here on WhatsApp with your review or upload your review from the Profile section:
https://www.oatclub.in/profile/orders

Once you share your review, we'll send you a surprise coupon for your next purchase.

Thank you for being a part of OATCLUB.

*Team OATCLUB*
Own All Trends`;

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="min-w-0 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,0.035)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400 sm:text-[10px]">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 truncate text-[11px] text-gray-500 sm:text-xs">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-800">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

export default function UnconfirmedOrderWhatsAppPage({
  title = "WhatsApp Order Desk",
  description = "Send confirmation and shipping updates through personalised WhatsApp messages.",
  badge = "OATCLUB Order Desk",
  orderDetailsBasePath = "/orders",
}) {
  const {
    orders,
    ordersMeta,
    loading,
    error,
    fetchAllOrdersAllPages,
    clearOrders,
  } = useOrderStore();

  const [activeTab, setActiveTab] = useState("confirmation");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openingOrderId, setOpeningOrderId] = useState("");
  const [showMobileOnly, setShowMobileOnly] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrdersAllPages({ limit: 200 });
    } catch (error) {
      toast.error(
        error?.message || "Unable to fetch WhatsApp orders",
      );
    }
  }, [fetchAllOrdersAllPages]);

  useEffect(() => {
    loadOrders();

    return () => {
      clearOrders();
    };
  }, [loadOrders, clearOrders]);

  const allOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders],
  );

  const confirmationOrders = useMemo(
    () =>
      allOrders.filter((order) => {
        const status = String(
          order?.fulfillmentStatus || "",
        ).toLowerCase();

        return order?.isConfirmed !== true && status !== "cancelled";
      }),
    [allOrders],
  );

  const shippingOrders = useMemo(
    () =>
      allOrders.filter((order) => {
        const status = String(
          order?.fulfillmentStatus || "",
        ).toLowerCase();

        const { awb, trackingUrl } = getShippingDetails(order);

        return (
          status !== "cancelled" &&
          Boolean(awb) &&
          Boolean(trackingUrl) &&
          [
            "packed",
            "picked",
            "shipped",
            "out_for_delivery",
          ].includes(status)
        );
      }),
    [allOrders],
  );

  const lateOrders = useMemo(
    () =>
      allOrders.filter((order) => {
        const status = String(
          order?.fulfillmentStatus || "",
        ).toLowerCase();

        return (
          status === "processing" &&
          getDaysSinceOrder(order) >= LATE_ORDER_DAYS
        );
      }),
    [allOrders],
  );

  const reviewOrders = useMemo(
    () =>
      allOrders.filter((order) => {
        const status = String(
          order?.fulfillmentStatus || "",
        ).toLowerCase();

        const deliveredAt =
          order?.fulfillmentDates?.deliveredAt ||
          order?.shipment?.deliveredAt ||
          order?.trackingDetails?.deliveredAt ||
          order?.deliveredAt ||
          order?.statusTimestamps?.deliveredAt;

        if (status !== "delivered" || !deliveredAt) {
          return false;
        }

        const time = new Date(deliveredAt).getTime();

        return (
          Number.isFinite(time) &&
          Date.now() - time >= 7 * 24 * 60 * 60 * 1000
        );
      }),
    [allOrders],
  );

  const selectedOrders =
    activeTab === "shipping"
      ? shippingOrders
      : activeTab === "late"
        ? lateOrders
        : activeTab === "review"
          ? reviewOrders
          : confirmationOrders;

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return selectedOrders.filter((order) => {
      const phone = getRawPhone(order);
      const hasValidPhone = Boolean(
        normalizeWhatsAppPhone(phone),
      );

      if (showMobileOnly && !hasValidPhone) return false;
      if (!query) return true;

      return [
        getOrderNumber(order),
        getCustomerName(order),
        phone,
        order?.customerId?.email,
        order?.shippingAddressSnapshot?.city,
        order?.shippingAddressSnapshot?.state,
        ...getItems(order).map(getItemTitle),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [selectedOrders, search, showMobileOnly]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE),
  );

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, showMobileOnly]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const validPhoneCount = selectedOrders.filter((order) =>
    Boolean(normalizeWhatsAppPhone(getRawPhone(order))),
  ).length;

  const totalQueueValue = selectedOrders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0,
  );

  const handleOpenWhatsApp = (order, type = activeTab) => {
    const whatsappLink = createWhatsAppLink(order, type);

    if (!whatsappLink) {
      toast.error("Valid customer phone number is unavailable");
      return;
    }

    const orderId = String(order?._id || "");

    setOpeningOrderId(orderId);
    window.open(whatsappLink, "_blank", "noopener,noreferrer");

    toast.success(
      type === "shipping"
        ? "Shipping message opened"
        : type === "late"
          ? "Late order update opened"
          : type === "review"
            ? "Review message opened"
            : "Confirmation message opened",
    );

    window.setTimeout(() => setOpeningOrderId(""), 700);
  };

  const commonTabProps = {
    orders: paginatedOrders,
    openingOrderId,
    orderDetailsBasePath,
    onOpenWhatsApp: handleOpenWhatsApp,
    helpers: {
      formatCurrency,
      formatIST,
      getCustomerName,
      getRawPhone,
      getOrderNumber,
      getOrderTotal,
      getItems,
      getItemTitle,
      getTotalQuantity,
      getThumbnail,
      getPaymentLabel,
      getShippingDetails,
      normalizeWhatsAppPhone,
    },
  };

  const startResult =
    filteredOrders.length > 0
      ? (page - 1) * PAGE_SIZE + 1
      : 0;

  const endResult = Math.min(
    page * PAGE_SIZE,
    filteredOrders.length,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f6f4] px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <div className="mx-auto w-full max-w-[1500px] space-y-4">
        <section className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-gray-100/80 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-gray-100/70 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 px-5 py-7 sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:px-9">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                <MessageCircle size={13} />
                {badge}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-gray-950 sm:text-4xl">
                {title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh Orders
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={
              activeTab === "shipping"
                ? Truck
                : activeTab === "late"
                  ? TimerReset
                  : activeTab === "review"
                    ? MessageCircle
                    : Clock3
            }
            label={
              activeTab === "shipping"
                ? "Shipping Ready"
                : activeTab === "late"
                  ? "Delayed Orders"
                  : activeTab === "review"
                    ? "Review Ready"
                    : "Pending Confirmation"
            }
            value={selectedOrders.length}
            helper={
              activeTab === "late"
                ? "Processing for 7+ days"
                : activeTab === "review"
                  ? "Return window closed"
                  : "Orders in selected queue"
            }
          />

          <StatCard
            icon={Smartphone}
            label="WhatsApp Ready"
            value={validPhoneCount}
            helper="Orders with valid phone"
          />

          <StatCard
            icon={ShoppingBag}
            label="Queue Value"
            value={formatCurrency(totalQueueValue)}
            helper="Combined order value"
          />

          <StatCard
            icon={Package}
            label="Fetched Orders"
            value={allOrders.length}
            helper="All order pages loaded"
          />
        </section>

        <section className="min-w-0 overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
          <div className="border-b border-gray-100 px-4 pt-4 sm:px-5">
            <div className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-[#f3f4f6] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("confirmation")}
                className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-52 ${activeTab === "confirmation"
                  ? "border border-gray-200 bg-white text-gray-950 shadow-sm"
                  : "border border-transparent text-gray-500 hover:bg-white/70 hover:text-gray-900"
                  }`}
              >
                <Clock3 size={15} />
                Confirmation

                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "confirmation"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600"
                    }`}
                >
                  {confirmationOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-52 ${activeTab === "shipping"
                  ? "border border-gray-200 bg-white text-gray-950 shadow-sm"
                  : "border border-transparent text-gray-500 hover:bg-white/70 hover:text-gray-900"
                  }`}
              >
                <Truck size={15} />
                Shipping

                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "shipping"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600"
                    }`}
                >
                  {shippingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("late")}
                className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-52 ${activeTab === "late"
                  ? "border border-gray-200 bg-white text-gray-950 shadow-sm"
                  : "border border-transparent text-gray-500 hover:bg-white/70 hover:text-gray-900"
                  }`}
              >
                <TimerReset size={15} />
                Late Orders

                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "late"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600"
                    }`}
                >
                  {lateOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("review")}
                className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-52 ${activeTab === "review"
                  ? "border border-gray-200 bg-white text-gray-950 shadow-sm"
                  : "border border-transparent text-gray-500 hover:bg-white/70 hover:text-gray-900"
                  }`}
              >
                <MessageCircle size={15} />
                Reviews

                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "review"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600"
                    }`}
                >
                  {reviewOrders.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">
                {activeTab === "shipping"
                  ? "Shipping Queue"
                  : activeTab === "late"
                    ? "Late Order Queue"
                    : activeTab === "review"
                      ? "Review Queue"
                      : "Confirmation Queue"}
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {filteredOrders.length} order
                {filteredOrders.length === 1 ? "" : "s"} visible
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <label className="relative block w-full sm:min-w-[310px]">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order, customer, phone..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-[#fafafa] pl-10 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white"
                />

                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-black"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>

              <button
                type="button"
                onClick={() =>
                  setShowMobileOnly((value) => !value)
                }
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${showMobileOnly
                  ? "border-gray-300 bg-gray-100 text-gray-950"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <Smartphone size={15} />
                WhatsApp Ready
              </button>
            </div>
          </div>

          <div className="min-w-0">
            {loading && !allOrders.length ? (
              <div className="flex min-h-[360px] items-center justify-center gap-3 text-sm font-medium text-gray-600">
                <Loader2 size={23} className="animate-spin" />
                Loading orders...
              </div>
            ) : error && !allOrders.length ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <CircleAlert
                    size={24}
                    className="text-red-500"
                  />
                </div>

                <p className="mt-3 font-semibold text-gray-950">
                  Unable to load orders
                </p>

                <p className="mt-1 max-w-md text-sm text-gray-500">
                  {error}
                </p>
              </div>
            ) : activeTab === "shipping" ? (
              <ShippingTab {...commonTabProps} />
            ) : activeTab === "review" ? (
              <ReviewTab {...commonTabProps} />
            ) : (
              <ConfirmationTab {...commonTabProps} />
            )}

            {filteredOrders.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-800">
                    {startResult}–{endResult}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-800">
                    {filteredOrders.length}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.max(1, value - 1))
                    }
                    disabled={page === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="inline-flex h-9 items-center rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-700">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) =>
                        Math.min(totalPages, value + 1),
                      )
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
