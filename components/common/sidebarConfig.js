// components/common/sidebarConfig.js
// ------------------------------
// SIDEBAR MENUS
// ------------------------------

export const sidebarMenus = {
  dashboard: [
    { label: "Welcome", href: "/dashboard" },
    { label: "Analytics Overview", href: "/dashboard/analytics" },
    { label: "Sales Snapshot", href: "/dashboard/sales" },
    { label: "Quick Actions", href: "/dashboard/actions" },
  ],

  analytics: [
    { label: "Analytics Home", href: "/analytics" },
    { label: "Overview", href: "/analytics/overview" },
    { label: "Sales Analytics", href: "/analytics/sales" },
    { label: "Orders Funnel", href: "/analytics/funnel" },
    { label: "Traffic / UTM", href: "/analytics/traffic" },
    { label: "Marketing Performance", href: "/analytics/marketing" },
    { label: "Products Performance", href: "/analytics/products" },
    { label: "Customer Insights", href: "/analytics/customers" },
    { label: "Abandoned Carts", href: "/analytics/abandoned-carts" },
    { label: "Reports Export", href: "/analytics/reports" },
  ],

  designing: [
  { label: "Design Home", href: "/designing" },
  { label: "Banners Manager", href: "/designing/banners" },
  { label: "Top Categories", href: "/designing/top-categories" },
  { label: "Collections Editor", href: "/designing/collection" },
  { label: "Marquee Manager", href: "/designing/marquee" },
],

  production: [
    { label: "Production Dashboard", href: "/production" },
    { label: "Packed Orders", href: "/production/packed" },

    { label: "Sampling", href: "/production/sampling" },
    { label: "Stock Update", href: "/production/stock-update" },
    { label: "Pattern Number", href: "/production/pattern-number" },
    { label: "Fabric", href: "/production/fabric" },

    { label: "Product Detail", href: "/production/product-detail" },
    { label: "Missing Patterns", href: "/production/missing-patterns" },

    // ✅ NEW
    { label: "Barcode Generator", href: "/production/barcode" },
  ],

  // ✅ NEW: REVIEWS SIDEBAR GROUP
  reviews: [
    { label: "Reviews Dashboard", href: "/reviews" },
    { label: "Manage Reviews", href: "/reviews/manage" },
    { label: "Add Review", href: "/reviews/add" },
  ],

  accounts: [
    { label: "Accounts Dashboard", href: "/accounts" },
    { label: "Sales", href: "/accounts/sales" },
  ],

  inventory: [
    { label: "Inventory Dashboard", href: "/inventory" },
    { label: "Stock Update", href: "/inventory/stock-update" },
    { label: "Reserved Inventory", href: "/inventory/reserved-inventory" }, // ✅ new
  ],

  media: [
    { label: "Media Library", href: "/media" },
    { label: "Upload Media", href: "/media/upload" },
    { label: "Folders", href: "/media/folders" },
  ],

  reels: [
    { label: "Reels Dashboard", href: "/reels" },
    { label: "Add Reels", href: "/reels/add" },
    { label: "Manage Reels", href: "/reels/manage" },
  ],

  blogs: [
    { label: "Blogs Dashboard", href: "/blogs" },
    { label: "All Blogs", href: "/blogs/all" },
    { label: "Create Blog", href: "/blogs/create" },
    { label: "Categories", href: "/blogs/categories" },
    { label: "Drafts", href: "/blogs/drafts" },
    { label: "SEO (Blogs)", href: "/blogs/seo" },
    { label: "Comments / Moderation", href: "/blogs/comments" },
  ],

  products: [
  { label: "Product Dashboard", href: "/products" },
  { label: "Add New Product", href: "/products/add" },
  { label: "Manage Products", href: "/products/manage" },

  // ✅ NEW: Product Search (by Product Code)
  { label: "Search Product", href: "/products/search" },

  { label: "Analytics", href: "/products/analytics" },

  // Categories
  { label: "Categories", href: "/products/category" },
  { label: "Category Analytics", href: "/products/category-analytics" },

  // Bestseller
  { label: "Bestsellers", href: "/products/bestseller" },

  // ✅ NEW: Coming Soon
  { label: "Coming Soon", href: "/products/comingsoon" },

  // Attributes / Variants
  { label: "Size Charts", href: "/products/size-charts" },
  { label: "Attributes", href: "/products/attributes" },
  { label: "Variants", href: "/products/variants" },
  { label: "Collections", href: "/products/collections" },
  { label: "Fabric", href: "/products/fabric" },

  // ✅ NEW: Product Colors
  { label: "Product Colors", href: "/products/colors" },

  // ✅ NEW: Bulk Name Editor
  { label: "Name Edit", href: "/products/name-edit" },

  // Bulk Operations
  { label: "Bulk Import", href: "/products/bulk-import" },
  { label: "Bulk Export", href: "/products/bulk-export" },
  { label: "Bulk Price Editor", href: "/products/bulkPriceEditor" },

  // Inventory & Pricing
  { label: "Inventory Sync", href: "/products/inventory-sync" },
  { label: "Price Updates", href: "/products/pricing" },

  // Marketing
  { label: "Offers & Discounts", href: "/products/offers" },
  { label: "SEO Manager", href: "/products/seo" },
  { label: "Reviews & Ratings", href: "/products/reviews" },

  // Media
  { label: "Media Library", href: "/media" },
],

  orders: [
  { label: "Orders Dashboard", href: "/orders" },
  { label: "All Orders", href: "/orders/all" },
  { label: "Order Search", href: "/orders/search" }, // ✅ NEW
  { label: "Order Analytics", href: "/orders/report" },

  // Status Buckets
  { label: "Pending Orders", href: "/orders/pending" },
  { label: "Processing", href: "/orders/processing" },
  { label: "Shipped", href: "/orders/shipped" },
  { label: "Delivered", href: "/orders/delivered" },

  // Returns & Exceptions
  { label: "Returned / Cancelled", href: "/orders/returns" },
  { label: "RTO / NDR", href: "/orders/rto" },
  { label: "Order Remark", href: "/orders/remark" },

  // ✅ RMA
  { label: "RMA Requests", href: "/rma" },

  // Other Tools
  { label: "Order Tags", href: "/orders/tags" },
],

  // ✅ OPTIONAL: Separate RMA menu group (if you want sidebar items when on /rma)
  rma: [
    { label: "RMA Requests", href: "/rma" },
    { label: "Create RMA", href: "/rma/create-rma" }, // ✅ NEW PATH
  ],

  coupons: [
    { label: "Coupons Dashboard", href: "/coupons" },
    { label: "Create Coupon", href: "/coupons/create" },
    { label: "Manage Coupons", href: "/coupons/manage" },
    { label: "Coupon Usage Reports", href: "/coupons/reports" },
    { label: "Auto Discounts", href: "/coupons/auto" },
  ],

  operations: [
    { label: "Ops Dashboard", href: "/operations" },
    { label: "Order Processing", href: "/operations/order-processing" },
    { label: "Shipments", href: "/operations/shipments" },
    { label: "Returns & RTO", href: "/operations/returns" },
    { label: "Packing Manager", href: "/operations/packing" },
    { label: "Courier Partners", href: "/operations/couriers" },
    { label: "Manifest / Dispatch", href: "/operations/manifest" },
    { label: "NDR Follow-ups", href: "/operations/ndr" },
  ],

  marketing: [
    { label: "Marketing Dashboard", href: "/marketing" },
    { label: "Email Marketing", href: "/marketing/email" },
    { label: "Marketing Spend", href: "/marketing/marketingSpend" },
    { label: "ROAS Report", href: "/marketing/ROAS" }, // ✅ Added
  ],

 customers: [
  { label: "Customer Dashboard", href: "/customers/dashboard" },
  { label: "Customer List", href: "/customers" },
  { label: "Banking / Refund Details", href: "/customers/bankingDetails" },
  { label: "Customer / Address", href: "/customers/address" },
  { label: "Cart Adds", href: "/customers/cart-adds" },
  { label: "Abandoned Carts", href: "/customers/abandoned-carts" },
  { label: "Wishlist", href: "/customers/wishlist" },
  { label: "Tickets & Support", href: "/customers/support" },
  { label: "Newsletter Subscribers", href: "/customers/newsletter" },
  { label: "Analytics", href: "/customers/analytics" },
],

  customer_support: [
    { label: "Support Dashboard", href: "/customer-support" },
    { label: "Search", href: "/customer-support/search" },

    { label: "Customer Confirmation", href: "/customer-support/customer-confirmation" },
    { label: "Order Remark", href: "/customer-support/remark" },

    // ✅ NEW
    { label: "All Orders", href: "/customer-support/all-orders" },

    { label: "All Tickets", href: "/customer-support/all" },
    { label: "Open Tickets", href: "/customer-support/open" },
    { label: "In Progress", href: "/customer-support/in-progress" },
    { label: "Resolved", href: "/customer-support/resolved" },
    { label: "Closed", href: "/customer-support/closed" },

    { label: "SLA / Reports", href: "/customer-support/reports" },
  ],

  sales: [
    { label: "Sales Dashboard", href: "/sales" },
    { label: "Orders", href: "/sales/orders" },
    { label: "Revenue Reports", href: "/sales/reports" },
    { label: "Returns Summary", href: "/sales/returns" },
    { label: "COD vs Prepaid", href: "/sales/payment-type" },
    { label: "Top Products", href: "/sales/top-products" },
    { label: "Top Categories", href: "/sales/top-categories" },
  ],

  shiprocket: [
    { label: "Shiprocket Dashboard", href: "/shiprocket" },
    { label: "Authentication API", href: "/shiprocket/authentication-api" },
    { label: "Not Deliverables", href: "/shiprocket/not-deliverables" }, // ✅ NEW
  ],

  // ✅ NEW: REPORTS SIDEBAR GROUP
 reports: [
  { label: "Reports Home", href: "/reports" }, // app/reports/page.jsx
  { label: "ROAS", href: "/reports/ROAS" },    // app/reports/ROAS/page.jsx
  { label: "Orders", href: "/reports/Orders" }, // ✅ app/reports/Orders/page.jsx
],

  account_user: [
    { label: "Profile", href: "/account/profile" },
    { label: "Change Password", href: "/account/password" },
    { label: "Logout", href: "/logout" },
  ],

  superadmin: [
    { label: "Vault", href: "/superadmin" },
    { label: "Manage Users", href: "/superadmin/manage" },
    { label: "Add User", href: "/superadmin/add" },
    { label: "Activity", href: "/superadmin/activity" },
    { label: "Meta XML Sync", href: "/superadmin/xml-sync" },
  ],

  collaboration: [
    { label: "Collaboration Dashboard", href: "/collaboration" },
    { label: "Add Collaboration", href: "/collaboration/add" },
  ],

  wordpress: [{ label: "WP Orders", href: "/wordpress/orders" }],
};

// ------------------------------
// ROUTE → SIDEBAR CATEGORY MAP
// ------------------------------
// ✅ Keep the most-specific prefixes earlier (future-safe)

export const routeSidebarMap = [
  { prefix: "/superadmin", key: "superadmin" },

  { prefix: "/customer-support", key: "customer_support" },

  // ✅ NEW: reports should be above other broad prefixes
  { prefix: "/reports", key: "reports" },

  { prefix: "/inventory", key: "inventory" },
  { prefix: "/analytics", key: "analytics" },
  { prefix: "/reels", key: "reels" },
  { prefix: "/marketing", key: "marketing" },
  { prefix: "/collaboration", key: "collaboration" },
  { prefix: "/shiprocket", key: "shiprocket" },

  { prefix: "/dashboard", key: "dashboard" },
  { prefix: "/designing", key: "designing" },
  { prefix: "/production", key: "production" },
  { prefix: "/accounts", key: "accounts" },
  { prefix: "/media", key: "media" },
  { prefix: "/blogs", key: "blogs" },
  { prefix: "/products", key: "products" },
  { prefix: "/reviews", key: "reviews" },
  { prefix: "/wordpress", key: "wordpress" },

  // ✅ NEW: /rma route should show sidebar as RMA (or orders if you prefer)
  { prefix: "/rma", key: "rma" },

  { prefix: "/orders", key: "orders" },
  { prefix: "/coupons", key: "coupons" },
  { prefix: "/operations", key: "operations" },
  { prefix: "/it", key: "it_systems" },
  { prefix: "/customers", key: "customers" },
  { prefix: "/sales", key: "sales" },
  { prefix: "/account", key: "account_user" },
];