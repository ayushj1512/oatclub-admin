const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeItem = (item = {}) => ({
  lineId: String(item?.lineId || "").trim(),
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

  // One product line but quantity is 2 or more
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
  const orderType = String(order?.orderType || "shipment").toLowerCase();

  const fulfillmentStatus = String(
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
  const orderType = String(order?.orderType || "shipment").toLowerCase();

  const fulfillmentStatus = String(
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
 * Checks whether a payment recovery email can be sent.
 *
 * Eligible:
 * - Razorpay or manual prepaid order
 * - Payment status pending or failed
 * - No successful Razorpay payment ID
 * - Order is not cancelled
 * - Order is not a split child order
 */
export const canSendPaymentRecoveryEmail = (order = {}) => {
  const paymentMethod = String(order?.paymentMethod || "")
    .trim()
    .toLowerCase();

  const paymentStatus = String(order?.paymentStatus || "")
    .trim()
    .toLowerCase();

  const fulfillmentStatus = String(order?.fulfillmentStatus || "")
    .trim()
    .toLowerCase();

  const orderType = String(order?.orderType || "shipment")
    .trim()
    .toLowerCase();

  const isCancelled =
    order?.cancellation?.isCancelled === true ||
    fulfillmentStatus === "cancelled";

  const hasSuccessfulPayment = Boolean(
    String(order?.razorpay?.paymentId || "").trim(),
  );

  const eligiblePaymentMethods = ["razorpay", "manual_prepaid"];
  const eligiblePaymentStatuses = ["pending", "failed"];

  if (isCancelled) return false;
  if (hasSuccessfulPayment) return false;

  if (!eligiblePaymentMethods.includes(paymentMethod)) {
    return false;
  }

  if (!eligiblePaymentStatuses.includes(paymentStatus)) {
    return false;
  }

  // Avoid sending from split child orders.
  if (order?.parentOrderId) return false;

  // Parent order can be used as the original payment order.
  if (!["shipment", "parent"].includes(orderType)) {
    return false;
  }

  return true;
};
