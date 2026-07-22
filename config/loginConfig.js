// src/config/loginConfig.js

export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  design_lab: "manageDesignLab",
  production: "manageProduction",
  vendors: "manageVendors",

  accounts: "manageAccounts",
  products: "manageProducts",
  barcode: "manageBarcode",
  orders: "manageOrders",

  refunds: "manageRefunds",
  otp: "manageOTP",
  fast2sms: "manageFast2SMS",
  shiprocket: "manageOrders",

  reviews: "manageReviews",
  rma: "manageRMA",
  media: "manageMedia",
  email: "manageEmail",
  reels: "manageReels",
  blogs: "manageBlogs",

  inventory: "manageInventory",
  fabrics: "manageFabrics",

  marketing: "manageMarketing",
  customers: "manageCustomers",
  support: "manageSupport",

  reports: "viewReports",
  tickets: "manageTickets",
  coupons: "manageCoupons",

  collaboration: "manageInfluencerProgram",
  affiliate: "manageAffiliate",

  warehouse: "manageProduction",
};

export const ALL_PERMISSIONS = [
  ...new Set(Object.values(DOMAIN_PERMISSIONS)),
];

export const ROLE_DEFAULT_PERMS = {
  // Full access
  superadmin: ["*"],

  admin: [...ALL_PERMISSIONS],

  // Customer care
  customer_care: [
    "manageSupport",
    "manageOrders",
    "manageReviews",
    "manageRefunds",
    "manageFast2SMS",
    "manageOTP",
  ],

  // Operations staff
  staff: [
    "manageOrders",
    "manageInventory",
    "manageFabrics",
    "manageReviews",
    "manageBarcode",
  ],

  // Read only
  viewer: ["viewReports"],

  // Influencer team
  influencer: [
    "manageMedia",
    "manageReels",
    "manageInfluencerProgram",
    "manageAffiliate",
  ],

  // Affiliate team
  affiliate: ["manageAffiliate", "viewReports"],

  // Warehouse
  warehouse: [
    "manageProduction",
    "manageOrders",
    "manageBarcode",
  ],
};

export const hasPermission = (permissions = [], permission) => {
  if (!permission) return false;
  if (permissions.includes("*")) return true;

  return permissions.includes(permission);
};