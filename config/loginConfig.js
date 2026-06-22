// src/config/loginConfig.js

export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  design_lab: "manageDesignLab",
  production: "manageProduction",
  accounts: "manageAccounts",
  products: "manageProducts",
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
  superadmin: ["*"],

  admin: [...ALL_PERMISSIONS],

  customer_care: [
    "manageSupport",
    "manageOrders",
    "manageReviews",
    "manageRefunds",
    "manageFast2SMS",
  ],

  staff: [
    "manageOrders",
    "manageInventory",
    "manageFabrics",
    "manageReviews",
  ],

  viewer: ["viewReports"],

  influencer: ["manageMedia", "manageReels", "manageInfluencerProgram"],

  warehouse: ["manageProduction", "manageOrders"],
};

export const hasPermission = (permissions = [], perm) => {
  if (!perm) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(perm);
};
