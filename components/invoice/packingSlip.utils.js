export function buildPackingSlipData(order) {
  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    orderDate: new Date(order.orderDate).toLocaleDateString(),

    shipping: order.shippingAddressSnapshot,

    items: (order.items || []).map((it, idx) => ({
      sr: idx + 1,
      name: it.productSnapshot?.title,
      sku: it.variant?.sku || it.productSnapshot?.sku || "-",
      qty: it.quantity,
    })),
  };
}
