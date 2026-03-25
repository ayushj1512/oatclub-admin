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
  { label: "Production Jobs", href: "/production/production-job" },
  { label: "Packed Orders", href: "/production/packed" },
  { label: "Sampling", href: "/production/sampling" },
  { label: "Stock Update", href: "/production/stock-update" },
  { label: "Pattern Number", href: "/production/pattern-number" },
  { label: "Fabric", href: "/production/fabric" },
  { label: "Product Detail", href: "/production/product-detail" },
  { label: "Missing Patterns", href: "/production/missing-patterns" },
  { label: "Barcode Generator", href: "/production/barcode" },
],

  reviews: [
    { label: "Reviews Dashboard", href: "/reviews" },
    { label: "Manage Reviews", href: "/reviews/manage" },
    { label: "Add Review", href: "/reviews/add" },
  ],

accounts: [
  { label: "Accounts Dashboard", href: "/accounts" },
  { label: "Remittance", href: "/accounts/remittance" },

  // Core
  { label: "Sales", href: "/accounts/sales" },
  { label: "Revenue", href: "/accounts/revenue" },

  // Payments & Remittance
  { label: "Razorpay transaction", href: "/accounts/razorpay-transaction" },
  { label: "Razorpay Remittance", href: "/accounts/razorpay-remittance" },
],

  inventory: [
  { label: "Inventory Dashboard", href: "/inventory" },
  // Core Actions
  { label: "Modify Inventory", href: "/inventory/modify-inventory" },
  { label: "Stock Update", href: "/inventory/stock-update" },
  // Inventory Views
  { label: "In-Stock Inventory", href: "/inventory/in-stock-inventory" },
  { label: "Reserved Inventory", href: "/inventory/reserved-inventory" },
  { label: "On Demand Inventory", href: "/inventory/on-demand-inventory" },
  { label: "Zero Inventory", href: "/inventory/zero-inventory" },
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
  { label: "Drafts", href: "/blogs/drafts" },
  { label: "Categories", href: "/blogs/categories" },
  { label: "Analytics", href: "/blogs/analytics" },
],

  products: [
    { label: "Product Dashboard", href: "/products" },
    { label: "Add New Product", href: "/products/add" },
    { label: "Manage Products", href: "/products/manage" },
    { label: "Search Product", href: "/products/search" },
    { label: "Analytics", href: "/products/analytics" },
    { label: "Categories", href: "/products/category" },
    { label: "Category Analytics", href: "/products/category-analytics" },
    { label: "Bestsellers", href: "/products/bestseller" },
    { label: "Coming Soon", href: "/products/comingsoon" },
    { label: "Size Charts", href: "/products/size-charts" },
    { label: "Attributes", href: "/products/attributes" },
    { label: "Variants", href: "/products/variants" },
    { label: "Collections", href: "/products/collections" },
    { label: "Fabric", href: "/products/fabric" },
    { label: "Product Colors", href: "/products/colors" },
    { label: "Name Edit", href: "/products/name-edit" },
    { label: "Bulk Import", href: "/products/bulk-import" },
    { label: "Bulk Export", href: "/products/bulk-export" },
    { label: "Bulk Price Editor", href: "/products/bulkPriceEditor" },
    { label: "Inventory Sync", href: "/products/inventory-sync" },
    { label: "Price Updates", href: "/products/pricing" },
    { label: "Offers & Discounts", href: "/products/offers" },
    { label: "SEO Manager", href: "/products/seo" },
    { label: "Reviews & Ratings", href: "/products/reviews" },
    { label: "Media Library", href: "/media" },
  ],

 orders: [
  { label: "Orders Dashboard", href: "/orders" },
  { label: "All Orders", href: "/orders/all" },
  { label: "Order Search", href: "/orders/search" },
  { label: "Order Analytics", href: "/orders/report" },

  { label: "Processing", href: "/orders/processing" },
  { label: "Packed", href: "/orders/packed" },
  { label: "Shipped", href: "/orders/shipped" },
  { label: "Delivered", href: "/orders/delivered" },
  { label: "Failed", href: "/orders/failed" },
  { label: "Cancelled", href: "/orders/cancelled" },
  { label: "Refunded", href: "/orders/refunded" },

  { label: "Returns", href: "/orders/returns" },
  { label: "Returned", href: "/orders/returned" },
  { label: "Return Requested", href: "/orders/return_requested" },
  { label: "Exchanged", href: "/orders/exchanged" },
  { label: "Exchange Requested", href: "/orders/exchange_requested" },

  { label: "Pickup Initiated", href: "/orders/pickup_initiated" },
  { label: "RTO / NDR", href: "/orders/rto" },

  { label: "Order Remark", href: "/orders/remark" },
  { label: "Invoice", href: "/orders/invoices" },
  { label: "RMA Requests", href: "/orders/rma" },
],

  rma: [
    { label: "RMA Requests", href: "/rma" },
    { label: "Create RMA", href: "/rma/create-rma" },
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
    { label: "ROAS Report", href: "/marketing/ROAS" },
  ],

  customers: [
    { label: "Customer Dashboard", href: "/customers/dashboard" },
    { label: "Customer List", href: "/customers" },
      { label: "Customer Search", href: "/customers/search" },
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
    { label: "Not Deliverables", href: "/shiprocket/not-deliverables" },
  ],

  // ✅ NEW: Blue Dart sidebar group (abhi sirf ek page)
bluedart: [
  { label: "BlueDart Dashboard", href: "/bluedart" },

  { label: "Create Shipment", href: "/bluedart/create" },
  { label: "All Shipments", href: "/bluedart/shipments" },

  { label: "External Orders", href: "/bluedart/external-orders" },

  { label: "EDD Prediction", href: "/bluedart/edd" },

  { label: "Analytics", href: "/bluedart/analytics" },
],

  reports: [
  { label: "Reports Home", href: "/reports" },

  // Business Overview
  {
    label: "Order & Business Overview",
    href: "/reports/Order-Business-Overview",
  },

  // Sales & Performance
  { label: "Product Sales", href: "/reports/ProductSoldReport" },
  { label: "Product UnSold", href: "/reports/ProductUnSoldReport" },
  { label: "Orders Report", href: "/reports/Orders" },
  { label: "ROAS", href: "/reports/ROAS" },

  // Operations
  {
    label: "Operations Status",
    href: "/reports/Operations-Order-Status",
  },
  { label: "RTO Report", href: "/reports/RTO" },
  { label: "Cancellation Report", href: "/reports/Cancellation" },
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

  { prefix: "/reports", key: "reports" },

  { prefix: "/inventory", key: "inventory" },
  { prefix: "/analytics", key: "analytics" },
  { prefix: "/reels", key: "reels" },
  { prefix: "/marketing", key: "marketing" },
  { prefix: "/collaboration", key: "collaboration" },
  { prefix: "/shiprocket", key: "shiprocket" },

  // ✅ NEW: Blue Dart route map
  { prefix: "/bluedart", key: "bluedart" },

  { prefix: "/dashboard", key: "dashboard" },
  { prefix: "/designing", key: "designing" },
  { prefix: "/production", key: "production" },
  { prefix: "/accounts", key: "accounts" },
  { prefix: "/media", key: "media" },
  { prefix: "/blogs", key: "blogs" },
  { prefix: "/products", key: "products" },
  { prefix: "/reviews", key: "reviews" },
  { prefix: "/wordpress", key: "wordpress" },

  { prefix: "/rma", key: "rma" },

  { prefix: "/orders", key: "orders" },
  { prefix: "/coupons", key: "coupons" },
  { prefix: "/operations", key: "operations" },
  { prefix: "/it", key: "it_systems" },
  { prefix: "/customers", key: "customers" },
  { prefix: "/sales", key: "sales" },
  { prefix: "/account", key: "account_user" },
];