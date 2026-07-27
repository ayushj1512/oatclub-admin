"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  MessageCircle,
  UserRound,
} from "lucide-react";

export default function ConfirmationTab({
  orders = [],
  orderDetailsBasePath = "/orders",
  openingOrderId = "",
  onOpenWhatsApp,
  helpers,
}) {
  const {
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
    normalizeWhatsAppPhone,
  } = helpers;

  if (!orders.length) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <MessageCircle size={24} />
        </div>

        <p className="mt-4 font-semibold text-gray-950">
          No confirmation orders
        </p>

        <p className="mt-1 text-sm text-gray-500">
          All eligible orders are already confirmed.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
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
            {orders.map((order) => {
              const orderId = String(order?._id || "");
              const detailsUrl = `${orderDetailsBasePath}/${orderId}`;
              const phone = getRawPhone(order);
              const validPhone = Boolean(normalizeWhatsAppPhone(phone));
              const thumbnail = getThumbnail(order);
              const items = getItems(order);
              const firstItem = items[0];
              const isOpening = openingOrderId === orderId;

              return (
                <tr
                  key={orderId || getOrderNumber(order)}
                  className="transition-colors hover:bg-gray-50/70"
                >
                  <td className="px-5 py-5 align-middle">
                    <Link
                      href={detailsUrl}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-950 hover:underline"
                    >
                      {getOrderNumber(order)}
                      <ArrowUpRight size={14} />
                    </Link>

                    <div className="mt-2">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        Awaiting confirmation
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <UserRound size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-sm font-semibold text-gray-950">
                          {getCustomerName(order)}
                        </p>

                        <p
                          className={`mt-0.5 text-xs ${
                            validPhone ? "text-gray-500" : "text-red-500"
                          }`}
                        >
                          {phone || "Phone unavailable"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={getItemTitle(firstItem)}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-56 truncate text-sm font-medium text-gray-900">
                          {getItemTitle(firstItem)}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {getTotalQuantity(order)} units · {items.length}{" "}
                          products
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5 align-middle">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {getPaymentLabel(order)}
                    </span>
                  </td>

                  <td className="px-5 py-5 align-middle text-sm font-semibold text-gray-950">
                    {formatCurrency(getOrderTotal(order))}
                  </td>

                  <td className="px-5 py-5 align-middle text-xs text-gray-500">
                    {formatIST(order?.createdAt)}
                  </td>

                  <td className="px-5 py-5 align-middle">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={detailsUrl}
                        title="View order"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-black hover:text-black"
                      >
                        <ExternalLink size={16} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(order, "confirmation")}
                        disabled={!validPhone || isOpening}
                        className="inline-flex h-10 min-w-44 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        {isOpening ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <MessageCircle size={16} />
                        )}

                        Send Confirmation
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="divide-y divide-gray-100 lg:hidden">
        {orders.map((order) => {
          const orderId = String(order?._id || "");
          const detailsUrl = `${orderDetailsBasePath}/${orderId}`;
          const phone = getRawPhone(order);
          const validPhone = Boolean(normalizeWhatsAppPhone(phone));
          const thumbnail = getThumbnail(order);
          const items = getItems(order);
          const firstItem = items[0];
          const isOpening = openingOrderId === orderId;

          return (
            <article key={orderId} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={getItemTitle(firstItem)}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={detailsUrl}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-950"
                      >
                        {getOrderNumber(order)}
                        <ArrowUpRight size={13} />
                      </Link>

                      <p className="mt-1 truncate text-sm text-gray-700">
                        {getCustomerName(order)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-gray-950">
                      {formatCurrency(getOrderTotal(order))}
                    </p>
                  </div>

                  <p className="mt-2 truncate text-xs text-gray-500">
                    {getItemTitle(firstItem)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Awaiting confirmation
                    </span>

                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                      {getPaymentLabel(order)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5">
                <p
                  className={`text-xs ${
                    validPhone ? "text-gray-600" : "text-red-500"
                  }`}
                >
                  {phone || "Customer phone unavailable"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenWhatsApp(order, "confirmation")}
                disabled={!validPhone || isOpening}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                {isOpening ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MessageCircle size={17} />
                )}

                Send Confirmation
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}