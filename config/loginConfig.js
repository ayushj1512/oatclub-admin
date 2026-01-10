// src/config/loginConfig.js

// ✅ Each dashboard card needs a permission key
export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  production: "manageProduction",
  accounts: "manageAccounts",
  products: "manageProducts",

  orders: "manageOrders",
  rma: "manageRMA",

  media: "manageMedia",
  reels: "manageReels",
  blogs: "manageBlogs",

  inventory: "manageInventory",
  operations: "manageOperations",
  it: "manageIT",
  marketing: "manageMarketing",

  customers: "manageCustomers",
  support: "manageSupport", // ✅ Customer Support
  sales: "manageSales",

  analytics: "viewAnalytics",
  reports: "viewReports",

  tickets: "manageTickets",
  coupons: "manageCoupons",
  wordpress: "manageWordpressOrders",
};

// ✅ Default permissions by role (if admin.permissions empty)
export const ROLE_DEFAULT_PERMS = {
  superadmin: ["*"], // ✅ full access

  admin: [
    "manageOrders",
    "manageProducts",
    "manageCustomers",
    "manageSupport",
    "viewAnalytics",
    "viewReports",
  ],

  // ✅ customer care (currently only customer support)
  customer_care: ["manageSupport"],

  staff: ["manageOrders", "manageInventory"],
  viewer: ["viewReports", "viewAnalytics"],
  influencer: ["manageMedia", "manageReels"],
};

// ✅ permission checker
export const hasPermission = (permissions = [], perm) => {
  if (!perm) return true;
  if (permissions.includes("*")) return true;
  return permissions.includes(perm);
};
