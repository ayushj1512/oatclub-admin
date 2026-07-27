"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackageCheck,
  Truck,
  UserRound,
} from "lucide-react";

export default function ShippingTab({
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
    getShippingDetails,
    normalizeWhatsAppPhone,
  } = helpers;

  if (!orders.length) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <PackageCheck size={24} />
        </div>

        <p className="mt-4 font-semibold text-gray-950">
          No shipping updates available
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Orders with AWB and tracking details will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1240px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {[
                "Order",
                "Customer",
                "Items",
                "Payment",
                "Courier",
                "AWB",
                "Total",
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
              const shipping = getShippingDetails(order);
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
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Ready to notify
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
                        <p className="max-w-52 truncate text-sm font-medium text-gray-900">
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

                  <td className="px-5 py-5 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Truck size={15} />
                      </div>

                      <div>
                        <p className="max-w-40 truncate text-sm font-semibold text-gray-900">
                          {shipping?.courierName || "Courier assigned"}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatIST(order?.updatedAt || order?.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5 align-middle">
                    <p className="max-w-40 truncate font-mono text-xs font-semibold text-gray-800">
                      {shipping?.awb || "Not available"}
                    </p>

                    {shipping?.trackingUrl ? (
                      <a
                        href={shipping.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Track shipment
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </td>

                  <td className="px-5 py-5 align-middle text-sm font-semibold text-gray-950">
                    {formatCurrency(getOrderTotal(order))}
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
                        onClick={() => onOpenWhatsApp(order, "shipping")}
                        disabled={!validPhone || isOpening}
                        className="inline-flex h-10 min-w-40 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        {isOpening ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <MessageCircle size={16} />
                        )}

                        Send Shipping
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
          const shipping = getShippingDetails(order);
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Ready to notify
                    </span>

                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                      {getPaymentLabel(order)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">Courier</span>

                  <span className="max-w-48 truncate text-xs font-semibold text-gray-900">
                    {shipping?.courierName || "Courier assigned"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">AWB</span>

                  <span className="max-w-48 truncate font-mono text-xs font-semibold text-gray-900">
                    {shipping?.awb || "Not available"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">Phone</span>

                  <span
                    className={`max-w-48 truncate text-xs font-medium ${
                      validPhone ? "text-gray-900" : "text-red-500"
                    }`}
                  >
                    {phone || "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {shipping?.trackingUrl ? (
                  <a
                    href={shipping.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700"
                  >
                    <ExternalLink size={17} />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(order, "shipping")}
                  disabled={!validPhone || isOpening}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                >
                  {isOpening ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MessageCircle size={17} />
                  )}

                  Send Shipping Update
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}