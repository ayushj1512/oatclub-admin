import { SELLER } from "./invoice.constants";

const round = (n) => Math.round(n * 100) / 100;

export function buildInvoiceData(order) {
  if (!order) return null;

  const billing = order.billingAddressSnapshot || {};
  const shipping = order.shippingAddressSnapshot || {};

  const sameState =
    billing.state && SELLER.state
      ? billing.state.toLowerCase() === SELLER.state.toLowerCase()
      : true;

  let totalTaxable = 0;
  let totalGST = 0;

  const items = (order.items || []).map((it, idx) => {
    const priceIncl = Number(it.price || 0);
    const qty = Number(it.quantity || 0);

    const gstRate = SELLER.defaultGst; // 5 / 12 / 18
    const taxable = round((priceIncl * 100) / (100 + gstRate));
    const gst = round(priceIncl - taxable);

    totalTaxable += taxable * qty;
    totalGST += gst * qty;

    return {
      sr: idx + 1,
      name: it.productSnapshot?.title,
      sku: it.variant?.sku || it.productSnapshot?.sku || "-",
      qty,
      priceIncl,
      taxable,
      gstRate,
      gst,
      total: priceIncl * qty,
    };
  });

  const cgst = sameState ? round(totalGST / 2) : 0;
  const sgst = sameState ? round(totalGST / 2) : 0;
  const igst = !sameState ? round(totalGST) : 0;

  return {
    orderNumber: order.orderNumber,
    orderDate: new Date(order.orderDate).toLocaleDateString(),

    seller: SELLER,

    billing,
    shipping,

    items,

    totals: {
      taxable: round(totalTaxable),
      cgst,
      sgst,
      igst,
      shipping: Number(order.shippingFee || 0),
      discount: Number(order.discount || 0),
      grandTotal: Number(order.finalPayable || 0),
    },

    paymentMethod: order.paymentMethod,
  };
}
