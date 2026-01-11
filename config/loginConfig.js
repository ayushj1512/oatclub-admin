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
  support: "manageSupport",
  sales: "manageSales",

  analytics: "viewAnalytics",
  reports: "viewReports",

  tickets: "manageTickets",
  coupons: "manageCoupons",
  wordpress: "manageWordpressOrders",

  // ✅ NEW: warehouse domain (ONLY production access)
  warehouse: "manageProduction",
};

// ✅ Default permissions by role (if admin.permissions empty)
export const ROLE_DEFAULT_PERMS = {
  superadmin: ["*"],

  admin: [
    "manageOrders",
    "manageProducts",
    "manageCustomers",
    "manageSupport",
    "viewAnalytics",
    "viewReports",
  ],

  customer_care: ["manageSupport"],

  staff: ["manageOrders", "manageInventory"],
  viewer: ["viewReports", "viewAnalytics"],
  influencer: ["manageMedia", "manageReels"],

  // ✅ NEW: warehouse role (ONLY production allowed)
  warehouse: ["manageProduction"],
};

// ✅ permission checker
export const hasPermission = (permissions = [], perm) => {
  if (!perm) return true;
  if (permissions.includes("*")) return true;
  return permissions.includes(perm);
};
