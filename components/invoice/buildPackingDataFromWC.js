import { SELLER } from "./invoice.constants";

export function buildPackingDataFromWC(order) {
  if (!order) return null;

  /* ===============================
     ORDER META
  =============================== */
  const orderNumber = order.number || order.id;
  const orderDate = order.date_created || "";

  /* ===============================
     SHIPPING ADDRESS
  =============================== */
  const shipping = {
    fullName: `${order.shipping?.first_name || ""} ${order.shipping?.last_name || ""}`.trim(),
    line1: order.shipping?.address_1 || "",
    line2: order.shipping?.address_2 || "",
    city: order.shipping?.city || "",
    state: order.shipping?.state || "",
    pincode: order.shipping?.postcode || "",
    phone: order.shipping?.phone || "",
  };

  /* ===============================
     ITEMS (SAFE)
  =============================== */
  const items = Array.isArray(order.line_items)
    ? order.line_items.map((it, idx) => ({
        sr: idx + 1,
        name: it.name || "-",
        sku: it.sku || "-",
        qty: it.quantity || 0,
      }))
    : [];

  /* ===============================
     FINAL SHAPE (PACKING)
  =============================== */
  return {
    seller: SELLER,

    orderNumber,
    orderDate,

    shipping,
    items,

    // 🔑 courier injected later from modal
  };
}
