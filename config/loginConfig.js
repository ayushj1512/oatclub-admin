// src/config/loginConfig.js

export const DOMAIN_PERMISSIONS = {
  designing: "manageDesigning",
  design_lab: "manageDesignLab",
  production: "manageProduction",
  vendors: "manageVendors",
  dispatching: "manageDispatching",
  accounts: "manageAccounts",
  products: "manageProducts",
  barcode: "manageBarcode",
  orders: "manageOrders",
  refunds: "manageRefunds",
  otp: "manageOTP",
  fast2sms: "manageFast2SMS",
  shiprocket: "manageOrders",
  delhivery: "manageOrders",
  ndr: "manageOrders",
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
  superadmin: ["*"],
  admin: ALL_PERMISSIONS,

  customer_care: [
    "manageSupport",
    "manageOrders",
    "manageReviews",
    "manageRefunds",
    "manageFast2SMS",
    "manageOTP",
  ],

  staff: [
    "manageOrders",
    "manageInventory",
    "manageFabrics",
    "manageReviews",
    "manageBarcode",
  ],

  viewer: ["viewReports"],

  influencer: [
    "manageMedia",
    "manageReels",
    "manageInfluencerProgram",
    "manageAffiliate",
  ],

  affiliate: [
    "manageAffiliate",
    "viewReports",
  ],

  warehouse: [
    "manageProduction",
    "manageOrders",
    "manageBarcode",
  ],
};

export const hasPermission = (
  permissions = [],
  permission,
) =>
  Boolean(
    permission &&
    (permissions.includes("*") ||
      permissions.includes(permission)),
  );
