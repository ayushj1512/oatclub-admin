"use client";

import { ImagePlus, MessageCircle, Phone, UserRound } from "lucide-react";

const normalizePhone = (value = "") => {
  let phone = String(value)
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  if (phone.length === 10) phone = `91${phone}`;

  return phone.startsWith("91") && phone.length === 12 ? phone : "";
};

const createLeadMessage = (customer = {}) => {
  const name = String(customer?.name || "there").trim();

  return `Hi ${name}

A little hello from *OATCLUB*

We’re so happy to have you here! We noticed you haven’t placed your first order with us yet, so we just wanted to personally welcome you.

Whenever you’re ready, take a look at our latest styles:
https://www.oatclub.in

And if you need any help with sizing, styling, or finding the perfect piece, just reply to us here — we’d genuinely love to help.

Hope to see you in OATCLUB soon!

With love,
*Team OATCLUB*
Own All Trends`;
};

const getWhatsAppLink = (customer) => {
  const phone = normalizePhone(customer?.phone);

  if (!phone) return "";

  return `https://wa.me/${phone}?text=${encodeURIComponent(
    createLeadMessage(customer),
  )}`;
};

export default function CustomerLeadsTab({
  customers = [],
  openingCustomerId = "",
  onOpenWhatsApp,
}) {
  if (!customers.length) {
    return (
      <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
          <UserRound size={22} />
        </div>

        <p className="mt-3 font-semibold text-gray-950">
          No zero-order customers
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Customers without any orders will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {customers.map((customer) => {
        const phone = normalizePhone(customer?.phone);
        const isOpening =
          String(openingCustomerId) === String(customer?._id);

        return (
          <div
            key={customer?._id}
            className="flex flex-col gap-4 px-4 py-4 transition hover:bg-gray-50/70 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                <UserRound size={18} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">
                  {customer?.name || "Customer"}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>
                    ID #{customer?.customerId || "-"}
                  </span>

                  {customer?.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={11} />
                      {customer.phone}
                    </span>
                  ) : null}

                  {customer?.city ? (
                    <span>{customer.city}</span>
                  ) : null}
                </div>

                <p className="mt-1 text-[11px] font-medium text-gray-400">
                  0 orders placed
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                title="Open WhatsApp first, then attach image manually"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700"
              >
                <ImagePlus size={14} />
                Image manually
              </button>

              <button
                type="button"
                disabled={!phone || isOpening}
                onClick={() => onOpenWhatsApp(customer)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MessageCircle size={14} />

                {isOpening ? "Opening..." : "WhatsApp"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
