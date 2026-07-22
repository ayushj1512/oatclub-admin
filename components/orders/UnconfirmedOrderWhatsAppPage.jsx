"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";

const PAGE_SIZE = 20;

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatIST = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
};

const getCustomerName = (order = {}) =>
  String(
    order?.customerId?.name ||
      order?.customer?.name ||
      order?.shippingAddressSnapshot?.fullName ||
      order?.shippingAddressSnapshot?.name ||
      "Customer"
  ).trim();

const getRawPhone = (order = {}) =>
  String(
    order?.customerId?.phone ||
      order?.customer?.phone ||
      order?.shippingAddressSnapshot?.phone ||
      order?.billingAddressSnapshot?.phone ||
      ""
  ).trim();

const normalizeWhatsAppPhone = (value) => {
  let phone = String(value || "").replace(/\D/g, "");

  phone = phone.replace(/^0+/, "");

  if (phone.length === 10) {
    phone = `91${phone}`;
  }

  return phone.startsWith("91") && phone.length === 12 ? phone : "";
};

const getOrderNumber = (order = {}) =>
  String(order?.orderNumber || order?._id || "-").trim();

const getOrderTotal = (order = {}) =>
  Number(
    order?.pricing?.grandTotal ??
      order?.grandTotal ??
      order?.finalPayable ??
      order?.totalAmount ??
      order?.total ??
      0
  );

const getItems = (order = {}) =>
  Array.isArray(order?.items) ? order.items : [];

const getTotalQuantity = (order = {}) =>
  getItems(order).reduce(
    (total, item) => total + Math.max(1, Number(item?.quantity || 1)),
    0
  );

const getItemTitle = (item = {}) =>
  String(
    item?.productSnapshot?.title ||
      item?.productId?.title ||
      item?.title ||
      "Product"
  ).trim();

const getItemSize = (item = {}) =>
  item?.selectedSize ||
  item?.variant?.size ||
  item?.variant?.attributes?.find(
    (attribute) =>
      String(attribute?.key || "").trim().toLowerCase() === "size"
  )?.value ||
  "";

const getItemSummary = (order = {}) => {
  const items = getItems(order);

  if (!items.length) {
    return "Your selected OATCLUB items";
  }

  const visibleItems = items.slice(0, 3).map((item) => {
    const title = getItemTitle(item);
    const size = getItemSize(item);
    const quantity = Math.max(1, Number(item?.quantity || 1));

    return `${title}${size ? ` (${size})` : ""}${
      quantity > 1 ? ` × ${quantity}` : ""
    }`;
  });

  const remaining = items.length - visibleItems.length;

  return remaining > 0
    ? `${visibleItems.join(", ")} and ${remaining} more item${
        remaining > 1 ? "s" : ""
      }`
    : visibleItems.join(", ");
};

const createWhatsAppMessage = (order = {}) => {
  const customerName = getCustomerName(order);
  const orderNumber = getOrderNumber(order);
  const itemSummary = getItemSummary(order);
  const orderTotal = getOrderTotal(order);

  return `Hi ${customerName},

Greetings from OATCLUB!

Thank you for placing your order with us.

We'd like to confirm your order before we begin processing it.

*Order Summary*
Order: *${orderNumber}*
Items: ${itemSummary}
Total: *${formatCurrency(orderTotal)}*

As each order is carefully curated and quality-checked specifically for you, our dispatch timeline is up to *7 days*.

As a growing brand, we're committed to ensuring every order meets our quality standards before it leaves our warehouse. We truly appreciate your patience and support.

Kindly reply with:

*YES* - Confirm my order
*NO* - Cancel my order

Once we receive your confirmation, we'll begin preparing your order.

Thank you for choosing OATCLUB.

*Team OATCLUB*
Own All Trends`;
};

const createWhatsAppLink = (order = {}) => {
  const phone = normalizeWhatsAppPhone(getRawPhone(order));

  if (!phone) return "";

  return `https://wa.me/${phone}?text=${encodeURIComponent(
    createWhatsAppMessage(order)
  )}`;
};

const getPaymentLabel = (order = {}) => {
  const method = String(order?.paymentMethod || "").toLowerCase();

  if (method === "cod") return "COD";
  if (method === "razorpay") return "Online";
  if (method === "wallet") return "Wallet";
  if (method === "exchange") return "Exchange";

  return method || "-";
};

const getThumbnail = (order = {}) => {
  const firstItem = getItems(order)[0];

  return (
    firstItem?.productSnapshot?.thumbnail ||
    firstItem?.productSnapshot?.images?.[0] ||
    firstItem?.productId?.thumbnail ||
    firstItem?.productId?.images?.[0] ||
    ""
  );
};

const StatCard = ({ icon: Icon, label, value, helper }) => (
  <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          {label}
        </p>

        <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
          {value}
        </p>

        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      </div>

      <div className="rounded-xl bg-black p-2.5 text-white">
        <Icon size={18} />
      </div>
    </div>
  </div>
);

export default function UnconfirmedOrderWhatsAppPage({
  title = "Unconfirmed Orders",
  description = "Review pending orders and open a personalised WhatsApp confirmation message in one click.",
  badge = "OATCLUB Order Desk",
  orderDetailsBasePath = "/orders",
}) {
  const {
    orders,
    ordersMeta,
    loading,
    error,
    fetchNotConfirmedOrders,
    clearOrders,
  } = useOrderStore();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openingOrderId, setOpeningOrderId] = useState("");
  const [showMobileOnly, setShowMobileOnly] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      await fetchNotConfirmedOrders({
        page: 1,
        limit: 200,
        sort: "-createdAt",
      });
    } catch (fetchError) {
      toast.error(
        fetchError?.message || "Unable to fetch unconfirmed orders"
      );
    }
  }, [fetchNotConfirmedOrders]);

  useEffect(() => {
    loadOrders();

    return () => clearOrders();
  }, [loadOrders, clearOrders]);

  const unconfirmedOrders = useMemo(
    () =>
      (Array.isArray(orders) ? orders : []).filter(
        (order) =>
          order?.isConfirmed !== true &&
          String(order?.fulfillmentStatus || "").toLowerCase() !== "cancelled"
      ),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return unconfirmedOrders.filter((order) => {
      const phone = getRawPhone(order);
      const hasPhone = Boolean(normalizeWhatsAppPhone(phone));

      if (showMobileOnly && !hasPhone) return false;
      if (!query) return true;

      const searchableText = [
        getOrderNumber(order),
        getCustomerName(order),
        phone,
        order?.customerId?.email,
        order?.customer?.email,
        order?.shippingAddressSnapshot?.city,
        order?.shippingAddressSnapshot?.state,
        ...getItems(order).map(getItemTitle),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [unconfirmedOrders, search, showMobileOnly]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE)
  );

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  const validPhoneCount = useMemo(
    () =>
      unconfirmedOrders.filter((order) =>
        Boolean(normalizeWhatsAppPhone(getRawPhone(order)))
      ).length,
    [unconfirmedOrders]
  );

  const totalPendingValue = useMemo(
    () =>
      unconfirmedOrders.reduce(
        (total, order) => total + getOrderTotal(order),
        0
      ),
    [unconfirmedOrders]
  );

  useEffect(() => {
    setPage(1);
  }, [search, showMobileOnly]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleOpenWhatsApp = (order) => {
    const whatsappLink = createWhatsAppLink(order);

    if (!whatsappLink) {
      toast.error("Valid customer phone number is unavailable");
      return;
    }

    setOpeningOrderId(String(order?._id || ""));

    window.open(whatsappLink, "_blank", "noopener,noreferrer");

    toast.success(`WhatsApp opened for ${getOrderNumber(order)}`);

    window.setTimeout(() => {
      setOpeningOrderId("");
    }, 700);
  };

  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="overflow-hidden rounded-[28px] bg-black text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/10" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  <MessageCircle size={14} />
                  {badge}
                </div>

                <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                  {title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={loadOrders}
                disabled={loading}
                className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh Orders
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Clock3}
            label="Pending Confirmation"
            value={unconfirmedOrders.length}
            helper="Active unconfirmed orders"
          />

          <StatCard
            icon={Smartphone}
            label="WhatsApp Ready"
            value={validPhoneCount}
            helper="Orders with valid phone"
          />

          <StatCard
            icon={ShoppingBag}
            label="Pending Value"
            value={formatCurrency(totalPendingValue)}
            helper="Combined order value"
          />

          <StatCard
            icon={Package}
            label="Fetched Orders"
            value={
              Number(ordersMeta?.totalCount) ||
              Number(ordersMeta?.total) ||
              unconfirmedOrders.length
            }
            helper="Latest API result"
          />
        </section>

        <section className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-950">
                  Confirmation Queue
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {filteredOrders.length} order
                  {filteredOrders.length === 1 ? "" : "s"} visible
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative block w-full sm:w-80">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search order, customer, phone..."
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-black"
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => setShowMobileOnly((current) => !current)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    showMobileOnly
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Smartphone size={16} />
                  WhatsApp Ready
                </button>
              </div>
            </div>
          </div>

          {loading && !orders.length ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
              <Loader2 size={30} className="animate-spin" />
              <p className="text-sm font-semibold">Loading confirmation queue</p>
            </div>
          ) : error && !orders.length ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <CircleAlert size={30} className="text-red-500" />
              <p className="mt-3 font-semibold">Unable to load orders</p>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          ) : !filteredOrders.length ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <MessageCircle size={30} />
              <p className="mt-3 font-semibold">No pending orders found</p>
              <p className="mt-1 text-sm text-gray-500">
                No orders match the selected filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1180px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#fafafa]">
                      {[
                        "Order",
                        "Customer",
                        "Items",
                        "Payment",
                        "Total",
                        "Ordered At",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 ${
                            heading === "Action" ? "text-right" : "text-left"
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedOrders.map((order) => {
                      const orderId = String(order?._id || "");
                      const detailsUrl = `${orderDetailsBasePath}/${orderId}`;
                      const phone = getRawPhone(order);
                      const hasValidPhone = Boolean(
                        normalizeWhatsAppPhone(phone)
                      );
                      const thumbnail = getThumbnail(order);
                      const isOpening = openingOrderId === orderId;

                      return (
                        <tr
                          key={orderId || getOrderNumber(order)}
                          className="transition hover:bg-[#fafafa]"
                        >
                          <td className="px-5 py-5">
                            <Link
                              href={detailsUrl}
                              className="inline-flex items-center gap-1.5 font-semibold text-gray-950"
                            >
                              {getOrderNumber(order)}
                              <ArrowUpRight size={14} />
                            </Link>

                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                              <Clock3 size={12} />
                              Awaiting confirmation
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                                <UserRound size={17} />
                              </div>

                              <div>
                                <p className="text-sm font-semibold">
                                  {getCustomerName(order)}
                                </p>

                                <p
                                  className={`mt-0.5 text-xs ${
                                    hasValidPhone
                                      ? "text-gray-500"
                                      : "text-red-500"
                                  }`}
                                >
                                  {phone || "Phone unavailable"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-10 overflow-hidden rounded-lg bg-gray-100">
                                {thumbnail ? (
                                  <img
                                    src={thumbnail}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Package size={16} />
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="max-w-56 truncate text-sm font-medium">
                                  {getItemTitle(getItems(order)[0])}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-500">
                                  {getTotalQuantity(order)} units ·{" "}
                                  {getItems(order).length} products
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">
                              {getPaymentLabel(order)}
                            </span>
                          </td>

                          <td className="px-5 py-5 text-sm font-semibold">
                            {formatCurrency(getOrderTotal(order))}
                          </td>

                          <td className="px-5 py-5 text-xs text-gray-500">
                            {formatIST(order?.createdAt)}
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={detailsUrl}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200"
                              >
                                <ExternalLink size={16} />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(order)}
                                disabled={!hasValidPhone || isOpening}
                                className="inline-flex h-10 min-w-40 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                              >
                                {isOpening ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <MessageCircle size={16} />
                                )}

                                {hasValidPhone ? "Send Message" : "No Phone"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 lg:hidden">
                {paginatedOrders.map((order) => {
                  const orderId = String(order?._id || "");
                  const detailsUrl = `${orderDetailsBasePath}/${orderId}`;
                  const phone = getRawPhone(order);
                  const hasValidPhone = Boolean(
                    normalizeWhatsAppPhone(phone)
                  );
                  const isOpening = openingOrderId === orderId;

                  return (
                    <article key={orderId} className="p-4">
                      <div className="flex justify-between gap-3">
                        <div>
                          <Link
                            href={detailsUrl}
                            className="font-semibold text-gray-950"
                          >
                            {getOrderNumber(order)}
                          </Link>

                          <p className="mt-1 text-sm text-gray-600">
                            {getCustomerName(order)}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {phone || "Phone unavailable"}
                          </p>
                        </div>

                        <p className="font-semibold">
                          {formatCurrency(getOrderTotal(order))}
                        </p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={detailsUrl}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200"
                        >
                          <ExternalLink size={17} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(order)}
                          disabled={!hasValidPhone || isOpening}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500"
                        >
                          {isOpening ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MessageCircle size={17} />
                          )}

                          {hasValidPhone
                            ? "Send Confirmation"
                            : "Phone Unavailable"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 sm:px-6">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredOrders.length)} of{" "}
                  {filteredOrders.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1)
                      )
                    }
                    disabled={page === totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}