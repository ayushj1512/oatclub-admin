import { SELLER, GST_HELPERS } from "./invoice.constants";

export function buildInvoiceDataFromWC(order) {
  if (!order) return null;

  /* ===============================
   PAYMENT
=============================== */
const payment = {
  method: order.payment_method || "",
  title: order.payment_method_title || "",
};

/* ===============================
   INVOICE NUMBER (WC META)
=============================== */
const invoiceMeta = order.meta_data?.find(
  (m) => m.key === "wpifw_invoice_no"
);

const invoiceNumber = invoiceMeta?.value
  ? `MF-INV-${String(invoiceMeta.value).padStart(4, "0")}`
  : "";



  /* ===============================
     BILLING
  =============================== */
  const billing = {
    fullName: `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim(),
    line1: order.billing?.address_1 || "",
    line2: order.billing?.address_2 || "",
    city: order.billing?.city || "",
    state: order.billing?.state || "",
    pincode: order.billing?.postcode || "",
    phone: order.billing?.phone || "",
    email: order.billing?.email || "",
  };

  /* ===============================
     SHIPPING
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
     ITEMS
  =============================== */
  const items = (order.line_items || []).map((it, idx) => {
    const priceIncl = Number(it.total || 0);
    const gstRate = 5; // 👈 currently fixed, later dynamic

    return {
      sr: idx + 1,
      name: it.name,
      qty: it.quantity,
      priceIncl: priceIncl.toFixed(2),
      gstRate,
      total: priceIncl.toFixed(2),
    };
  });

  /* ===============================
     TAX BREAKUP
  =============================== */
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  (order.tax_lines || []).forEach((t) => {
    if (t.label?.toLowerCase().includes("cgst")) {
      cgst += Number(t.tax_total || 0);
    } else if (t.label?.toLowerCase().includes("sgst")) {
      sgst += Number(t.tax_total || 0);
    } else if (t.label?.toLowerCase().includes("igst")) {
      igst += Number(t.tax_total || 0);
    }
  });

  const grandTotal = Number(order.total || 0);
  const totalTax = Number(order.total_tax || 0);
  const taxable = (grandTotal - totalTax).toFixed(2);

  /* ===============================
     FINAL SHAPE (IMPORTANT)
  =============================== */
 return {
  seller: SELLER,

  orderNumber: order.number || order.id,
  orderDate: order.date_created,

  billing,
  shipping,
  invoiceNumber, // ✅ ADD THIS

  items,

  totals: {
    taxable,
    cgst: cgst.toFixed(2),
    sgst: sgst.toFixed(2),
    igst: igst.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  },

  payment, // ✅ ADD THIS

  courier: {
    name: "",
    awb: "",
  },
};

}
