// src/config/loginConfig.js

export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  design_lab: "manageDesignLab",
  production: "manageProduction",
  accounts: "manageAccounts",
  products: "manageProducts",
  barcode: "manageBarcode", // ✅ NEW MODULE
  orders: "manageOrders",

  refunds: "manageRefunds",
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
  warehouse: "manageProduction",
};

export const ALL_PERMISSIONS = Array.from(
  new Set(Object.values(DOMAIN_PERMISSIONS))
);

export const ROLE_DEFAULT_PERMS = {
  /* Full Access */
  superadmin: ["*"],

  admin: [...ALL_PERMISSIONS],

  /* Customer Care */
  customer_care: [
    "manageSupport",
    "manageOrders",
    "manageReviews",
    "manageRefunds",
    "manageFast2SMS",
  ],

  /* Warehouse Staff */
  staff: [
    "manageOrders",
    "manageInventory",
    "manageFabrics",
    "manageReviews",
    "manageBarcode", // ✅ Added
  ],

  /* Read Only */
  viewer: ["viewReports"],

  /* Influencer */
  influencer: [
    "manageMedia",
    "manageReels",
    "manageInfluencerProgram",
  ],

  /* Warehouse */
  warehouse: [
    "manageProduction",
    "manageOrders",
    "manageBarcode", // ✅ Added
  ],
};

export const hasPermission = (permissions = [], permission) => {
  if (!permission) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
};