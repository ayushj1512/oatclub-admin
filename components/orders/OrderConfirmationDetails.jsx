"use client";

import {
  Clock3,
  MessageCircle,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";

const formatIST = (date) => {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
};

const getConfirmedByMeta = (confirmedBy) => {
  const value = String(confirmedBy || "").toLowerCase();

  const map = {
    admin: {
      label: "Admin",
      icon: ShieldCheck,
      cls: "bg-blue-50 text-blue-700 ring-blue-100",
    },
    customer: {
      label: "Customer",
      icon: UserCheck,
      cls: "bg-green-50 text-green-700 ring-green-100",
    },
    auto: {
      label: "Auto",
      icon: Zap,
      cls: "bg-amber-50 text-amber-700 ring-amber-100",
    },
  };

  return (
    map[value] || {
      label: "-",
      icon: Clock3,
      cls: "bg-gray-50 text-gray-600 ring-gray-100",
    }
  );
};

const getConfirmationState = (order) => {
  const status = String(
    order?.confirmationStatus || order?.status || ""
  ).toLowerCase();

  const isCancelled =
    order?.isCancelled === true ||
    Boolean(order?.cancelledAt) ||
    ["cancelled", "canceled"].includes(status);

  if (isCancelled) {
    return {
      key: "cancelled",
      label: "Cancelled",
      badge: "bg-red-50 text-red-700",
      card: "bg-red-50/60",
    };
  }

  if (order?.isConfirmed === true) {
    return {
      key: "confirmed",
      label: "Confirmed",
      badge: "bg-green-50 text-green-700",
      card: "bg-green-50/60",
    };
  }

  return {
    key: "pending",
    label: "Pending",
    badge: "bg-amber-50 text-amber-700",
    card: "bg-amber-50/60",
  };
};

const getCustomerName = (order) =>
  String(
    order?.customerId?.name ||
    order?.customer?.name ||
    order?.shippingAddressSnapshot?.name ||
    "Customer"
  ).trim();

const getCustomerPhone = (order) => {
  const rawPhone =
    order?.customerId?.phone ||
    order?.customer?.phone ||
    order?.shippingAddressSnapshot?.phone ||
    order?.billingAddressSnapshot?.phone ||
    "";

  let phone = String(rawPhone).replace(/\D/g, "");

  if (phone.startsWith("0")) {
    phone = phone.replace(/^0+/, "");
  }

  if (phone.length === 10) {
    phone = `91${phone}`;
  }

  return phone.startsWith("91") && phone.length === 12 ? phone : "";
};

const getOrderItemsSummary = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];

  if (!items.length) return "Your selected OATCLUB items";

  const visibleItems = items.slice(0, 3).map((item) => {
    const title =
      item?.productSnapshot?.title ||
      item?.productId?.title ||
      item?.title ||
      "Product";

    const size = item?.selectedSize || item?.variant?.size;
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

const getOrderTotal = (order) =>
  Number(
    order?.pricing?.grandTotal ||
    order?.grandTotal ||
    order?.totalAmount ||
    order?.total ||
    0
  );

const createWhatsAppLink = (order) => {
  const phone = getCustomerPhone(order);
  if (!phone) return "";

  const customerName = getCustomerName(order);
  const orderNumber = order?.orderNumber || order?._id || "-";
  const itemSummary = getOrderItemsSummary(order);
  const orderTotal = getOrderTotal(order);

  const message = `Hi ${customerName},

Greetings from OATCLUB!

Thank you for placing your order with us.

We'd like to confirm your order before we begin processing it.

*Order Summary*
Order: *${orderNumber}*
Items: ${itemSummary}
Total: *₹${orderTotal.toLocaleString("en-IN")}*

Our dispatch timeline is up to *7 days* as every order is carefully quality-checked before dispatch.

Kindly reply with:

*YES* - Confirm my order
*NO* - Cancel my order

Once confirmed, we'll begin preparing your order.

Thank you for choosing OATCLUB.

*Team OATCLUB*
Own All Trends`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function OrderConfirmationDetails({ order }) {
  const state = getConfirmationState(order);
  const isConfirmed = state.key === "confirmed";
  const isCancelled = state.key === "cancelled";
  const isPending = state.key === "pending";

  const meta = getConfirmedByMeta(order?.confirmedBy);
  const Icon = meta.icon;

  const whatsappLink = createWhatsAppLink(order);
  const hasValidPhone = Boolean(whatsappLink);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Confirmation Details
          </h3>

          <p className="mt-0.5 text-xs text-gray-500">
            Order confirmation source and timestamp.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${state.badge}`}
        >
          {state.label}
        </span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className={`rounded-xl p-4 ${state.card}`}>
          <p className="text-xs font-medium text-gray-500">Status</p>

          <p
            className={`mt-1 font-semibold ${isConfirmed
                ? "text-green-700"
                : isCancelled
                  ? "text-red-700"
                  : "text-amber-700"
              }`}
          >
            {state.label}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Confirmed By</p>

          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isConfirmed ? meta.cls : "bg-gray-100 text-gray-500 ring-gray-200"
              }`}
          >
            <Icon size={13} />
            {isConfirmed ? meta.label : "-"}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">
            {isCancelled ? "Cancelled At" : "Confirmed At"}
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {isConfirmed
              ? formatIST(order?.confirmedAt)
              : isCancelled
                ? formatIST(order?.cancelledAt)
                : "-"}
          </p>
        </div>
      </div>

      {isPending && (
        <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Ask customer to confirm
              </p>

              <p className="mt-0.5 text-xs leading-5 text-gray-600">
                Opens WhatsApp with the order summary and confirmation request.
              </p>
            </div>

            {hasValidPhone ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <MessageCircle size={17} />
                Ask for Confirmation
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500"
              >
                <MessageCircle size={17} />
                Phone Unavailable
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
