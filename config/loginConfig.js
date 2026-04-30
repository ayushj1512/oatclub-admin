// src/config/loginConfig.js

export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  design_lab: "manageDesignLab",
  production: "manageProduction",
  accounts: "manageAccounts",
  products: "manageProducts",
  footwear: "manageFootwear",
  orders: "manageOrders",

  // ✅ NEW (Refunds)
  refunds: "manageRefunds",

  shiprocket: "manageOrders",
  bluedart: "manageOrders",
  reviews: "manageReviews",
  rma: "manageRMA",
  media: "manageMedia",
  reels: "manageReels",
  blogs: "manageBlogs",
  inventory: "manageInventory",
  fabrics: "manageFabrics",
  operations: "manageOperations",
  it: "manageIT",
  marketing: "manageMarketing",
  customers: "manageCustomers",
  support: "manageSupport",
  sales: "manageSales",
  analytics: "viewAnalytics",
  reports: "viewReports",
  tickets: "manageTickets",
  coupons: "manageCoupons",
  wordpress: "manageWordpressOrders",
  collaboration: "manageInfluencerProgram",
  warehouse: "manageProduction",
};

export const ALL_PERMISSIONS = Array.from(
  new Set(Object.values(DOMAIN_PERMISSIONS))
);

export const ROLE_DEFAULT_PERMS = {
  superadmin: ["*"],

  admin: [...ALL_PERMISSIONS],

  customer_care: [
    "manageSupport",
    "manageOrders",
    "manageReviews",
    "manageRefunds", // ✅ allow refund handling
  ],

  staff: [
    "manageOrders",
    "manageInventory",
    "manageFabrics",
    "manageReviews",
    // ❌ no refunds by default (safe)
  ],

  viewer: ["viewReports", "viewAnalytics"],

  influencer: [
    "manageMedia",
    "manageReels",
    "manageInfluencerProgram",
  ],

  warehouse: ["manageProduction", "manageOrders"],
};

export const hasPermission = (permissions = [], perm) => {
  if (!perm) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(perm);
};