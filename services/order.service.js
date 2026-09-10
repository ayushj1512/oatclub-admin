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

  return phone.startsWith("91") && phone.length === 12
    ? phone
    : "";
};

const getCustomerPhone = (order = {}) =>
  safeString(
    order?.customerId?.phone ||
    order?.customer?.phone ||
    order?.customerPhone ||
    order?.shippingAddressSnapshot?.phone ||
    order?.billingAddressSnapshot?.phone,
  );

/* ============================================================
   ORDER SPLIT
============================================================ */

export const canSplitOrder = (order = {}) => {
  const orderType = safeString(
    order?.orderType || "shipment",
  ).toLowerCase();

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

  const items = Array.isArray(order?.items)
    ? order.items
    : [];

  const totalQuantity = items.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        safeNumber(item?.quantity, 0),
      ),
    0,
  );

  return totalQuantity >= 2;
};

/* ============================================================
   CLONE ORDER
============================================================ */

export const canCloneOrder = () => true;

/* ============================================================
   ENSURE INVENTORY RESERVATION

   Button can be shown when:
   - Order is confirmed
   - Order is processing or packed
   - Order is not a split parent
   - Order is not cancelled/testing
============================================================ */
export const canEnsureInventoryReservation = (
  order = {},
) => {
  const orderType = safeString(
    order?.orderType || "shipment",
  ).toLowerCase();

  const fulfillmentStatus = safeString(
    order?.fulfillmentStatus || "processing",
  ).toLowerCase();

  const isConfirmed =
    order?.isConfirmed === true ||
    Boolean(order?.confirmedAt);

  const isCancelled =
    order?.cancellation?.isCancelled === true ||
    ["cancelled", "canceled"].includes(
      fulfillmentStatus,
    );

  const blockedStatuses = [
    "picked",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "canceled",
    "rto",
    "returned",
    "refunded",
    "failed",
  ];

  if (!order?._id) return false;
  if (!safeString(order?.orderNumber)) return false;

  if (!isConfirmed) return false;
  if (isCancelled) return false;

  // Logical split parent must not hold inventory.
  if (orderType === "parent") return false;

  // Testing orders must not reserve inventory.
  if (order?.isTestingOrder === true) return false;

  if (
    blockedStatuses.includes(
      fulfillmentStatus,
    )
  ) {
    return false;
  }

  return ["processing", "packed"].includes(
    fulfillmentStatus,
  );
};

/* ============================================================
   TESTING ORDER
============================================================ */

export const canMarkAsTestingOrder = (order = {}) => {
  const orderType = safeString(
    order?.orderType || "shipment",
  ).toLowerCase();

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

/* ============================================================
   PAYMENT RECOVERY
============================================================ */

export const canSendPaymentRecovery = (order = {}) => {
  const paymentMethod = safeString(
    order?.paymentMethod,
  ).toLowerCase();

  const paymentStatus = safeString(
    order?.paymentStatus,
  ).toLowerCase();

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

  const eligiblePaymentMethods = [
    "razorpay",
    "manual_prepaid",
  ];

  const eligiblePaymentStatuses = [
    "pending",
    "failed",
  ];

  if (isCancelled) return false;
  if (hasSuccessfulPayment) return false;

  // Split child should never trigger recovery.
  if (order?.parentOrderId) return false;

  if (
    !eligiblePaymentMethods.includes(
      paymentMethod,
    )
  ) {
    return false;
  }

  if (
    !eligiblePaymentStatuses.includes(
      paymentStatus,
    )
  ) {
    return false;
  }

  // Original order or split parent only.
  return ["shipment", "parent"].includes(orderType);
};


/* ============================================================
   PAYMENT RECOVERY EMAIL
============================================================ */

export const canSendPaymentRecoveryEmail = (
  order = {},
) => {
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

/* ============================================================
   PAYMENT RECOVERY WHATSAPP
============================================================ */

export const canSendPaymentRecoveryWhatsApp = (
  order = {},
) => {
  if (!canSendPaymentRecovery(order)) {
    return false;
  }

  const phone = normalizePhoneNumber(
    getCustomerPhone(order),
  );

  return Boolean(phone);
};

/* ============================================================
   PREPAID CONFIRMATION
============================================================ */

export const canSendPrepaidConfirmation = (order = {}) => {
  const method = safeString(
    order?.paymentMethod,
  ).toLowerCase();

  const status = safeString(
    order?.paymentStatus,
  ).toLowerCase();

  const fulfillment = safeString(
    order?.fulfillmentStatus,
  ).toLowerCase();

  if (
    order?.cancellation?.isCancelled === true ||
    fulfillment === "cancelled" ||
    order?.parentOrderId
  ) {
    return false;
  }

  return (
    method === "cod" ||
    (method === "razorpay" && status === "paid") ||
    (method === "partial_cod" &&
      status === "partially_paid")
  );
};

/* ============================================================
   PREPAID CONFIRMATION EMAIL
============================================================ */

export const canSendPrepaidConfirmationEmail = (
  order = {},
) => {
  if (!canSendPrepaidConfirmation(order)) {
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

/* ============================================================
   PREPAID CONFIRMATION WHATSAPP
============================================================ */

export const canSendPrepaidConfirmationWhatsApp = (
  order = {},
) => {
  if (!canSendPrepaidConfirmation(order)) {
    return false;
  }

  const phone = normalizePhoneNumber(
    getCustomerPhone(order),
  );

  return Boolean(phone);
};
