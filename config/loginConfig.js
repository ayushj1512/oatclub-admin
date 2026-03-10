// src/config/loginConfig.js

// ✅ Each dashboard card needs a permission key
export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  production: "manageProduction",
  accounts: "manageAccounts",
  products: "manageProducts",

  // ✅ Footwear
  footwear: "manageFootwear",

  orders: "manageOrders",

  // ✅ Shiprocket
  shiprocket: "manageOrders",

  // ✅ Blue Dart
  bluedart: "manageOrders",

  // ✅ Reviews
  reviews: "manageReviews",

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

  // ✅ Collaboration
  collaboration: "manageCollaboration",

  // ✅ warehouse domain (ONLY production access)
  warehouse: "manageProduction",
};

// ✅ All permission keys used across the app (no "*")
export const ALL_PERMISSIONS = Array.from(
  new Set(Object.values(DOMAIN_PERMISSIONS))
);

// ✅ Default permissions by role (if admin.permissions empty)
export const ROLE_DEFAULT_PERMS = {
  superadmin: ["*"],

  // ✅ Admin gets everything EXCEPT superadmin ("*")
  // (superadmin-only actions should be role-guarded, not permission-guarded)
  admin: [...ALL_PERMISSIONS],

  customer_care: ["manageSupport", "manageOrders", "manageReviews"],

  // ✅ staff defaults
  staff: ["manageOrders", "manageInventory", "manageReviews"],

  viewer: ["viewReports", "viewAnalytics"],

  // ✅ influencer defaults
  influencer: ["manageMedia", "manageReels"],

  // ✅ warehouse role (ONLY production allowed)
  warehouse: ["manageProduction", "manageOrders"],
};

// ✅ permission checker
export const hasPermission = (permissions = [], perm) => {
  if (!perm) return false; // 🔒 IMPORTANT: if mapping missing, deny by default
  if (permissions.includes("*")) return true;
  return permissions.includes(perm);
};