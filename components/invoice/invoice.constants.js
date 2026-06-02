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
  logo: "",
  signature: "",

  // Address & Contact
  address:
    "TA-97-A, Gali No.-2, Tuglakabad Extension, New Delhi - 110019",
  city: "New Delhi",
  state: "Delhi",
  country: "India",
  pincode: "110019",

  phone: "(+91) 7303491206",
  email: "support@oatclub.com",
  website: "https://oatclub.com",

  // ✅ TAX IDENTIFIERS
  gstin: "07ACCFM1594P1ZO",
  pan: "ACCFM1594P",

  // Tax & Currency
  defaultGst: 5, // GST slab (5 / 12 / 18)
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
    return +(price * 100 / (100 + gstRate)).toFixed(2);
  },

  getGstFromInclusive(price, gstRate) {
    if (!price || !gstRate) return 0;
    const taxable = price * 100 / (100 + gstRate);
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
