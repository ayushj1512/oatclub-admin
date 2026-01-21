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
    { label: "Homepage Layout", href: "/designing/homepage" },

    // ✅ NEW: Homepage Settings
    { label: "Homepage Settings", href: "/designing/homepage-settings" },
    { label: "Hero Banners", href: "/designing/banners" },
    { label: "Top Categories", href: "/designing/top-categories" },
    { label: "Homepage Preview", href: "/designing/preview" },

    { label: "Themes & Colors", href: "//themes" },
    { label: "Collections Editor", href: "/designing/collections" },
    { label: "Product Badges", href: "/designing/badges" },
    { label: "Topbar / Announcements", href: "/designing/topbar" },
    { label: "Footer Links", href: "/designing/footer" },
  ],

  production: [
    { label: "Production Dashboard", href: "/production" },
    { label: "Pattern Number", href: "/production/pattern-number" },
    { label: "Fabric", href: "/production/fabric" },
  ],

  accounts: [
    { label: "Accounts Dashboard", href: "/accounts" },
    { label: "Transactions", href: "/accounts/transactions" },
    { label: "Payouts", href: "/accounts/payouts" },
    { label: "Invoice Management", href: "/accounts/invoices" },
    { label: "GST Reports", href: "/accounts/gst" },
    { label: "Vendor Ledger", href: "/accounts/vendor-ledger" },
    { label: "COD Reconciliation", href: "/accounts/cod" },
    { label: "Refunds Ledger", href: "/accounts/refunds" },
  ],

  inventory: [
    { label: "Inventory Dashboard", href: "/inventory" },
    { label: "All Inventory", href: "/inventory/list" },
    { label: "Stock Alerts", href: "/inventory/alerts" },
    { label: "Variants Manager", href: "/inventory/variants" },
    { label: "Categories Manager", href: "/inventory/categories" },
    { label: "Bulk Upload", href: "/inventory/bulk-upload" },
    { label: "Purchase Invoices", href: "/inventory/purchase" },
    { label: "Stock Movement", href: "/inventory/movements" },
    { label: "Barcodes Dashboard", href: "/inventory/barcodes" },
    { label: "Generate Barcode", href: "/inventory/barcodes/generate" },
    { label: "Barcode Items (Saved)", href: "/inventory/barcodes/items" },
    { label: "Scan / Lookup", href: "/inventory/barcodes/scan" },
    { label: "Print Labels", href: "/inventory/barcodes/print" },
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
    { label: "Analytics", href: "/products/analytics" },

    { label: "Categories", href: "/products/category" },

    // ✅ NEW PAGE ADDED
    { label: "Category Analytics", href: "/products/category-analytics" },
    { label: "Bestsellers", href: "/products/bestseller" },

    { label: "Size Charts", href: "/products/size-charts" },
    { label: "Attributes", href: "/products/attributes" },
    { label: "Variants", href: "/products/variants" },
    { label: "Collections", href: "/products/collections" },
    { label: "Fabric", href: "/products/fabric" },
    { label: "Bulk Import", href: "/products/bulk-import" },
    { label: "Bulk Export", href: "/products/bulk-export" },
    { label: "Media Library", href: "/media" },
    { label: "Inventory Sync", href: "/products/inventory-sync" },
    { label: "Price Updates", href: "/products/pricing" },
    { label: "Offers & Discounts", href: "/products/offers" },
    { label: "SEO Manager", href: "/products/seo" },
    { label: "Reviews & Ratings", href: "/products/reviews" },
    { label: "Bulk Price Editor", href: "/products/bulkPriceEditor" },
  ],

  orders: [
    { label: "Orders Dashboard", href: "/orders" },
    { label: "All Orders", href: "/orders/all" },

    // Status Buckets
    { label: "Pending Orders", href: "/orders/pending" },
    { label: "Processing", href: "/orders/processing" },
    { label: "Shipped", href: "/orders/shipped" },
    { label: "Delivered", href: "/orders/delivered" },

    // Returns & Exceptions
    { label: "Returned / Cancelled", href: "/orders/returns" },
    { label: "RTO / NDR", href: "/orders/rto" },

    // ✅ UPDATED: RMA now points to /rma
    { label: "RMA Requests", href: "/rma" },
 { label: "RMA Requests", href: "/orders/report" },
    // Other Tools
    { label: "Order Tags", href: "/orders/tags" },
  ],

  // ✅ OPTIONAL: Separate RMA menu group (if you want sidebar items when on /rma)
  rma: [{ label: "RMA Requests", href: "/rma" }],

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
    { label: "Campaigns", href: "/marketing/campaigns" },
    { label: "Coupons & Discounts", href: "/marketing/coupons" },
    { label: "SEO Tools", href: "/marketing/seo" },
    { label: "Social Media", href: "/marketing/social" },
    { label: "Email Marketing", href: "/marketing/email" },
    { label: "WhatsApp Broadcasts", href: "/marketing/whatsapp" },
    { label: "Influencer / Collabs", href: "/marketing/collabs" },
  ],
  customers: [
    { label: "Customer Dashboard", href: "/customers/dashboard" },
    { label: "Customer List", href: "/customers" },
    { label: "Customer / Address", href: "/customers/address" }, // ✅ added
    { label: "Cart Adds", href: "/customers/cart-adds" }, // ✅ added
    // { label: "Abandoned Carts", href: "/customers/carts" }, // ❌ removed
    { label: "Tickets & Support", href: "/customers/support" },
    { label: "Newsletter Subscribers", href: "/customers/newsletter" },
    { label: "Wishlist", href: "/customers/wishlist" }, // ✅ added
  ],

  customer_support: [
    { label: "Support Dashboard", href: "/customer-support" },
    { label: "Search", href: "/customer-support/search" },
    {
      label: "Customer Confirmation",
      href: "/customer-support/customer-confirmation",
    },
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

  { prefix: "/inventory", key: "inventory" },
  { prefix: "/analytics", key: "analytics" },
  { prefix: "/reels", key: "reels" },
  { prefix: "/marketing", key: "marketing" },
  { prefix: "/collaboration", key: "collaboration" },

  { prefix: "/dashboard", key: "dashboard" },
  { prefix: "/designing", key: "designing" },
  { prefix: "/production", key: "production" },
  { prefix: "/accounts", key: "accounts" },
  { prefix: "/media", key: "media" },
  { prefix: "/blogs", key: "blogs" },
  { prefix: "/products", key: "products" },

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
