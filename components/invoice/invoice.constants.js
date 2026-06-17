/**
 * ============================================================
 * INVOICE CONSTANTS
 * ============================================================
 * Central place for seller / GST / invoice settings
 * ============================================================
 */

/* ------------------------------------------------------------
   SELLER (BUSINESS DETAILS)
------------------------------------------------------------ */
export const SELLER = {
  name: "OATCLUB",
  brand: "OATCLUB",

  // Assets
logo: "http://res.cloudinary.com/dpsvrt4sd/image/upload/v1781123546/odb5ckquouajjzfbxin0.webp",  signature: "",

  // Address & Contact
  address: "REGISTERED BUSINESS ADDRESS AS PER GST",
  city: "New Delhi",
  state: "Delhi",
  country: "India",
  pincode: "",

  phone: "(+91) 7217649990",
  email: "hey@oatclub.in",
  website: "https://www.oatclub.in/",

  // TAX IDENTIFIERS
  gstin: "07BAGPN9548F1ZC",
  pan: "BAGPN9548F",

  // Tax & Currency
  defaultGst: 5,
  currency: "INR",
};

/* ------------------------------------------------------------
   INVOICE SETTINGS
------------------------------------------------------------ */
export const INVOICE_SETTINGS = {
  pricesIncludeGst: true,

  showSku: true,
  showHsn: false,
  showDiscount: true,
  showShipping: true,

  footerNote:
    "This is a computer generated invoice and does not require a physical signature.",

  terms: [
    "Goods once sold will not be taken back or exchanged.",
    "All disputes are subject to Delhi jurisdiction only.",
  ],
};

/* ------------------------------------------------------------
   PACKING SLIP SETTINGS
------------------------------------------------------------ */
export const PACKING_SLIP_SETTINGS = {
  showSku: true,
  showBarcode: false,
  showPrice: false,
};

/* ------------------------------------------------------------
   FORMATTERS
------------------------------------------------------------ */
export const FORMATTERS = {
  currency: (amount = 0) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0)),

  date: (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN");
  },
};

/* ------------------------------------------------------------
   GST HELPERS
------------------------------------------------------------ */
export const GST_HELPERS = {
  getTaxableFromInclusive(price, gstRate) {
    if (!price || !gstRate) return Number(price || 0);
    return +((price * 100) / (100 + gstRate)).toFixed(2);
  },

  getGstFromInclusive(price, gstRate) {
    if (!price || !gstRate) return 0;
    const taxable = (price * 100) / (100 + gstRate);
    return +(price - taxable).toFixed(2);
  },
};

/* ------------------------------------------------------------
   DOCUMENT TYPES
------------------------------------------------------------ */
export const DOCUMENT_TYPES = {
  INVOICE: "invoice",
  PACKING_SLIP: "packing",
};

/* ------------------------------------------------------------
   PAYMENT LABELS
------------------------------------------------------------ */
export const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  razorpay: "Online Payment",
  prepaid: "Prepaid",
};

/* ------------------------------------------------------------
   DEFAULT EXPORT
------------------------------------------------------------ */
export default {
  SELLER,
  INVOICE_SETTINGS,
  PACKING_SLIP_SETTINGS,
  FORMATTERS,
  GST_HELPERS,
  DOCUMENT_TYPES,
  PAYMENT_LABELS,
};