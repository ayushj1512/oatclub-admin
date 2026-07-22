"use client";

import {
  CheckCircle2,
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

  if (value === "admin") {
    return {
      label: "Admin",
      icon: ShieldCheck,
      cls: "bg-blue-50 text-blue-700 ring-blue-100",
    };
  }

  if (value === "customer") {
    return {
      label: "Customer",
      icon: UserCheck,
      cls: "bg-green-50 text-green-700 ring-green-100",
    };
  }

  if (value === "auto") {
    return {
      label: "Auto",
      icon: Zap,
      cls: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  return {
    label: "-",
    icon: Clock3,
    cls: "bg-gray-50 text-gray-600 ring-gray-100",
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

  if (phone.startsWith("91") && phone.length === 12) {
    return phone;
  }

  return "";
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
    const quantity = Number(item?.quantity || 1);

    return `${title}${size ? ` (${size})` : ""}${quantity > 1 ? ` × ${quantity}` : ""
      }`;
  });

  const remainingCount = items.length - visibleItems.length;

  return remainingCount > 0
    ? `${visibleItems.join(", ")} and ${remainingCount} more item${remainingCount > 1 ? "s" : ""
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

As each order is carefully curated and quality-checked specifically for you, our dispatch timeline is up to *7 days*.

As a growing brand, we're committed to ensuring every order meets our quality standards before it leaves our warehouse. We truly appreciate your patience and support.

Kindly reply with:

YES - Confirm my order
NO - Cancel my order

Once we receive your confirmation, we'll begin preparing your order.

Thank you for choosing OATCLUB.

*Team OATCLUB*
Own All Trends`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function OrderConfirmationDetails({ order }) {
  const isConfirmed = order?.isConfirmed === true;
  const meta = getConfirmedByMeta(order?.confirmedBy);
  const Icon = meta.icon;

  const whatsappLink = createWhatsAppLink(order);
  const hasValidPhone = Boolean(whatsappLink);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <CheckCircle2 size={18} />
            Confirmation Details
          </h2>

          <p className="mt-0.5 text-xs text-gray-500">
            Order confirmation source and timestamp.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${isConfirmed
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
            }`}
        >
          {isConfirmed ? "Confirmed" : "Not Confirmed"}
        </span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Status</p>

          <p className="mt-1 font-semibold text-gray-900">
            {isConfirmed ? "Confirmed" : "Pending"}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Confirmed By</p>

          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.cls}`}
          >
            <Icon size={13} />
            {isConfirmed ? meta.label : "-"}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Confirmed At</p>

          <p className="mt-1 font-semibold text-gray-900">
            {isConfirmed ? formatIST(order?.confirmedAt) : "-"}
          </p>
        </div>
      </div>

      {!isConfirmed && (
        <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Ask customer to confirm
              </p>

              <p className="mt-0.5 text-xs leading-5 text-gray-600">
                Opens WhatsApp with a polite OATCLUB confirmation message and a
                short order summary.
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