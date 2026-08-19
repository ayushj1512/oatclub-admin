"use client";

import {
  ExternalLink,
  Gift,
  Loader2,
  MessageCircle,
  PackageCheck,
  Smartphone,
  Star,
} from "lucide-react";

export default function ReviewTab({
  orders = [],
  openingOrderId = "",
  orderDetailsBasePath = "/orders",
  onOpenWhatsApp = () => { },
  helpers = {},
}) {
  const {
    formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    formatIST = (v) => (v ? new Date(v).toLocaleString("en-IN") : "-"),
    getCustomerName = () => "Customer",
    getRawPhone = () => "",
    getOrderNumber = () => "-",
    getOrderTotal = () => 0,
    getItems = () => [],
    getItemTitle = () => "Product",
    getThumbnail = () => "",
    normalizeWhatsAppPhone = () => "",
  } = helpers;

  if (!orders.length) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          <Star size={24} />
        </div>

        <h3 className="mt-4 text-base font-semibold text-gray-950">
          No review requests pending
        </h3>

        <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
          Delivered orders will appear here after their return period has
          expired.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {orders.map((order) => {
        const orderId = String(order?._id || "");
        const phone = getRawPhone(order);
        const validPhone = Boolean(normalizeWhatsAppPhone(phone));
        const items = getItems(order);
        const thumbnail = getThumbnail(order);

        const deliveredAt =
          order?.fulfillmentDates?.deliveredAt ||
          order?.shipment?.deliveredAt ||
          order?.trackingDetails?.deliveredAt;

        const alreadySent = order?.reviewRequest?.sent === true;
        const isOpening = openingOrderId === orderId;

        return (
          <div
            key={orderId}
            className="px-4 py-4 transition hover:bg-gray-50/60 sm:px-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              {/* LEFT */}
              <div className="flex min-w-0 gap-3.5">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <PackageCheck size={20} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-950">
                      #{getOrderNumber(order)}
                    </p>

                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                      Return Period Over
                    </span>

                    {alreadySent ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        Review Requested
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 truncate text-sm font-medium text-gray-800">
                    {getCustomerName(order)}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{phone || "No phone"}</span>

                    <span>•</span>

                    <span>{formatCurrency(getOrderTotal(order))}</span>

                    {deliveredAt ? (
                      <>
                        <span>•</span>
                        <span>Delivered {formatIST(deliveredAt)}</span>
                      </>
                    ) : null}
                  </div>

                  {items.length ? (
                    <p className="mt-2 line-clamp-1 text-xs text-gray-500">
                      {items
                        .slice(0, 3)
                        .map((item) => getItemTitle(item))
                        .join(", ")}
                      {items.length > 3
                        ? ` +${items.length - 3} more`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[70px] xl:pl-0">
                <a
                  href={`${orderDetailsBasePath}/${orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  View
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(order, "review")}
                  disabled={!validPhone || isOpening}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-black px-4 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isOpening ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <MessageCircle size={14} />
                  )}

                  Send Review
                </button>
              </div>
            </div>

            {!validPhone ? (
              <div className="mt-3 ml-[70px] flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                <Smartphone size={12} />
                Valid WhatsApp number unavailable
              </div>
            ) : null}

            <div className="mt-3 ml-[70px] flex items-center gap-1.5 text-[11px] text-gray-400">
              <Gift size={12} />
              Surprise coupon after review submission
            </div>
          </div>
        );
      })}
    </div>
  );
}
