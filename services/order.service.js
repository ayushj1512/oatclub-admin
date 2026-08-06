const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const safeString = (value) => String(value ?? "").trim();

const normalizePhoneNumber = (value) => {
  let phone = safeString(value)
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  if (phone.length === 10) {
    phone = `91${phone}`;
  }

  return phone.startsWith("91") && phone.length === 12 ? phone : "";
};

const getCustomerPhone = (order = {}) =>
  safeString(
    order?.customerId?.phone ||
    order?.customer?.phone ||
    order?.customerPhone ||
    order?.shippingAddressSnapshot?.phone ||
    order?.billingAddressSnapshot?.phone,
  );

const normalizeItem = (item = {}) => ({
  lineId: safeString(item?.lineId),
  quantity: Math.max(1, safeNumber(item?.quantity, 1)),
});

/**
 * Automatically divides a normal order into two shipments.
 *
 * Testing orders cannot be split.
 *
 * Example:
 * A → first half
 * B → second half
 *
 * If the order has only one line item with quantity 2+,
 * quantity is divided between A and B.
 */
export const buildTwoWayOrderSplit = (order = {}) => {
  if (order?.isTestingOrder === true) {
    throw new Error("Testing orders cannot be split");
  }

  const items = Array.isArray(order?.items)
    ? order.items.map(normalizeItem).filter((item) => item.lineId)
    : [];

  if (!items.length) {
    throw new Error("Order has no items to split");
  }

  // One product line but quantity is 2 or more.
  if (items.length === 1) {
    const item = items[0];

    if (item.quantity < 2) {
      throw new Error("Order needs at least 2 items or quantity 2 to split");
    }

    const firstQuantity = Math.ceil(item.quantity / 2);
    const secondQuantity = item.quantity - firstQuantity;

    return [
      {
        suffix: "A",
        items: [
          {
            lineId: item.lineId,
            quantity: firstQuantity,
          },
        ],
      },
      {
        suffix: "B",
        items: [
          {
            lineId: item.lineId,
            quantity: secondQuantity,
          },
        ],
      },
    ];
  }

  const middleIndex = Math.ceil(items.length / 2);

  const shipmentAItems = items.slice(0, middleIndex);
  const shipmentBItems = items.slice(middleIndex);

  if (!shipmentAItems.length || !shipmentBItems.length) {
    throw new Error("Unable to divide order into two shipments");
  }

  return [
    {
      suffix: "A",
      items: shipmentAItems,
    },
    {
      suffix: "B",
      items: shipmentBItems,
    },
  ];
};

export const canSplitOrder = (order = {}) => {
  const orderType = safeString(order?.orderType || "shipment").toLowerCase();

  const fulfillmentStatus = safeString(
    order?.fulfillmentStatus || "processing",
  ).toLowerCase();

  const blockedStatuses = [
    "picked",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "rto",
    "returned",
    "refunded",
  ];

  if (order?.isTestingOrder === true) return false;
  if (orderType === "parent") return false;
  if (order?.parentOrderId) return false;
  if (order?.cancellation?.isCancelled === true) return false;
  if (blockedStatuses.includes(fulfillmentStatus)) return false;

  const items = Array.isArray(order?.items) ? order.items : [];

  const totalQuantity = items.reduce(
    (sum, item) => sum + Math.max(0, safeNumber(item?.quantity, 0)),
    0,
  );

  return totalQuantity >= 2;
};

export const canMarkAsTestingOrder = (order = {}) => {
  const orderType = safeString(order?.orderType || "shipment").toLowerCase();

  const fulfillmentStatus = safeString(
    order?.fulfillmentStatus || "processing",
  ).toLowerCase();

  const blockedStatuses = [
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "rto",
    "returned",
    "refunded",
  ];

  if (orderType === "parent") return false;
  if (order?.parentOrderId) return false;
  if (order?.cancellation?.isCancelled === true) return false;
  if (blockedStatuses.includes(fulfillmentStatus)) return false;

  return true;
};

/**
 * Common payment recovery eligibility.
 *
 * Eligible:
 * - Razorpay or manual prepaid order
 * - Payment status pending or failed
 * - No successful Razorpay payment ID
 * - Order is not cancelled
 * - Order is not a split child order
 */
export const canSendPaymentRecovery = (order = {}) => {
  const paymentMethod = safeString(order?.paymentMethod).toLowerCase();

  const paymentStatus = safeString(order?.paymentStatus).toLowerCase();

  const fulfillmentStatus = safeString(
    order?.fulfillmentStatus,
  ).toLowerCase();

  const orderType = safeString(
    order?.orderType || "shipment",
  ).toLowerCase();

  const isCancelled =
    order?.cancellation?.isCancelled === true ||
    fulfillmentStatus === "cancelled";

  const hasSuccessfulPayment = Boolean(
    safeString(
      order?.razorpay?.paymentId ||
      order?.payment?.razorpayPaymentId ||
      order?.paymentId,
    ),
  );

  const eligiblePaymentMethods = ["razorpay", "manual_prepaid"];
  const eligiblePaymentStatuses = ["pending", "failed"];

  if (isCancelled) return false;
  if (hasSuccessfulPayment) return false;
  if (order?.parentOrderId) return false;

  if (!eligiblePaymentMethods.includes(paymentMethod)) {
    return false;
  }

  if (!eligiblePaymentStatuses.includes(paymentStatus)) {
    return false;
  }

  // Original shipment or split parent can be used for recovery.
  if (!["shipment", "parent"].includes(orderType)) {
    return false;
  }

  return true;
};

/**
 * Checks whether a payment recovery email can be sent.
 */
export const canSendPaymentRecoveryEmail = (order = {}) => {
  if (!canSendPaymentRecovery(order)) {
    return false;
  }

  const email = safeString(
    order?.customerId?.email ||
    order?.customer?.email ||
    order?.customerEmail ||
    order?.shippingAddressSnapshot?.email ||
    order?.billingAddressSnapshot?.email,
  );

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Checks whether a payment recovery WhatsApp message can be sent.
 *
 * Requires:
 * - Order to be eligible for payment recovery
 * - Valid Indian WhatsApp phone number
 */
export const canSendPaymentRecoveryWhatsApp = (order = {}) => {
  if (!canSendPaymentRecovery(order)) {
    return false;
  }

  const phone = normalizePhoneNumber(getCustomerPhone(order));

  return Boolean(phone);
};
