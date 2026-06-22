import "server-only";

import { orderReceivedAdminTemplate } from "./templates/AdminOrderReceivedTemplate.js";
import { orderCancellationTemplate } from "./templates/OrderCancellationEmailTemplate.js";
import { orderConfirmationTemplate } from "./templates/OrderConfirmationTemplate.js";
import { orderDeliveredTemplate } from "./templates/OrderDeliveredTemplate.js";
import { orderShippedTemplate } from "./templates/OrderShippedTemplate.js";
import { orderTrackingTemplate } from "./templates/OrderTrackingTemplate.js";
import { rmaCreatedTemplate } from "./templates/RmaEmailTemplate.js";
import { userOnboardingTemplate } from "./templates/UserOnboardingEmailTempalte.js";

const sampleOrder = {
  _id: "6a248951ea9dabd7425a611e",
  customer: {
    name: "Ayush Juneja",
    email: "ayush.oatclub@gmail.com",
    phone: "0111111111",
  },
  customerId: {
    email: "ayush.oatclub@gmail.com",
    name: "Ayush Juneja",
    phone: "0111111111",
  },
  shippingAddressSnapshot: {
    fullName: "Ayush Juneja",
    phone: "0111111111",
    email: "ayush.oatclub@gmail.com",
    line1: "B-19, South Extension",
    line2: "Near Market Road",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110011",
    country: "India",
  },
  billingAddressSnapshot: {
    fullName: "Ayush Juneja",
    phone: "0111111111",
    email: "ayush.oatclub@gmail.com",
  },
  items: [
    {
      lineId: "be5e25e9-5d07-4b98-8ed3-fd3a7a605128",
      productSnapshot: {
        productCode: "00014",
        title: "Sienna Sculpt Halter Top",
        thumbnail:
          "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780509742/baixr0ubpwlv2eq32iar.webp",
        images: [
          "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780509742/baixr0ubpwlv2eq32iar.webp",
        ],
        sku: "TOP-00014-M",
      },
      variant: {
        sku: "TOP-00014-M",
        attributes: [{ key: "size", value: "M" }],
      },
      selectedSize: "M",
      selectedColor: "",
      quantity: 1,
      price: 799,
      subtotal: 799,
    },
  ],
  subtotal: 799,
  discount: 0,
  shippingFee: 0,
  tax: 0,
  totalAmount: 799,
  finalPayable: 799,
  currency: "INR",
  paymentMethod: "cod",
  paymentStatus: "pending",
  fulfillmentStatus: "delivered",
  shipment: {
    shippedAt: "2026-06-06T20:55:45.321Z",
    deliveredAt: "2026-06-10T11:45:00.000Z",
    shiprocket: {
      awb: "TEST123456789",
      courierName: "Shiprocket Test Courier",
      trackingUrl: "https://oatclub.in/account/orders",
    },
  },
  trackingDetails: {
    expectedDelivery: "2026-06-11T00:00:00.000Z",
    deliveredAt: "2026-06-10T11:45:00.000Z",
    trackingId: "TEST123456789",
    courierName: "Shiprocket Test Courier",
    trackingUrl: "https://oatclub.in/account/orders",
  },
  priority: "normal",
  isConfirmed: true,
  orderDate: "2026-06-06T20:55:45.261Z",
  orderNumber: "000001",
  createdAt: "2026-06-06T20:55:45.321Z",
  source: "website",
};

const sampleRma = {
  rmaNumber: "RMA-TEST-000001",
  type: "return",
  status: "requested",
  reason: "size issue",
  customerNote: "Need a better fit on the shoulder line.",
  items: [
    {
      title: "Sienna Sculpt Halter Top",
      quantity: 1,
      productCode: "00014",
      variantSku: "TOP-00014-M",
    },
  ],
};

const templateConfigs = [
  {
    slug: "user-onboarding",
    name: "User Onboarding",
    audience: "New customers",
    category: "Account",
    status: "Live",
    sourceFile: "templates/UserOnboardingEmailTempalte.js",
  },
  {
    slug: "order-confirmation",
    name: "Order Confirmation",
    audience: "Customers",
    category: "Order Flow",
    status: "Live",
    sourceFile: "templates/OrderConfirmationTemplate.js",
  },
  {
    slug: "admin-order-received",
    name: "Admin Order Received",
    audience: "Admin team",
    category: "Admin Alert",
    status: "Live",
    sourceFile: "templates/AdminOrderReceivedTemplate.js",
  },
  {
    slug: "order-shipped",
    name: "Order Shipped",
    audience: "Customers",
    category: "Order Flow",
    status: "Live",
    sourceFile: "templates/OrderShippedTemplate.js",
  },
  {
    slug: "order-tracking",
    name: "Order Tracking",
    audience: "Customers",
    category: "Order Flow",
    status: "Live",
    sourceFile: "templates/OrderTrackingTemplate.js",
  },
  {
    slug: "order-delivered",
    name: "Order Delivered",
    audience: "Customers",
    category: "Order Flow",
    status: "Live",
    sourceFile: "templates/OrderDeliveredTemplate.js",
  },
  {
    slug: "order-cancelled",
    name: "Order Cancelled",
    audience: "Customers",
    category: "Order Flow",
    status: "Live",
    sourceFile: "templates/OrderCancellationEmailTemplate.js",
  },
  {
    slug: "rma-created",
    name: "RMA Request Received",
    audience: "Customers",
    category: "Returns & Exchange",
    status: "Live",
    sourceFile: "templates/RmaEmailTemplate.js",
  },
];

function renderTemplate(config) {
  switch (config.slug) {
    case "user-onboarding":
      return userOnboardingTemplate({
        name: "Ayush Juneja",
        ctaUrl: "https://oatclub.in",
        brandName: "OATCLUB",
        supportEmail: "support@oatclub.in",
      });
    case "order-confirmation":
      return orderConfirmationTemplate({
        name: "Ayush Juneja",
        order: sampleOrder,
        ctaUrl: "https://oatclub.in/account/orders",
      });
    case "admin-order-received":
      return orderReceivedAdminTemplate({
        order: sampleOrder,
        ctaUrl: "https://admin.oatclub.in/orders/000001",
      });
    case "order-shipped":
      return orderShippedTemplate({
        name: "Ayush Juneja",
        order: sampleOrder,
        ctaUrl: "https://oatclub.in/account/orders",
      });
    case "order-tracking":
      return orderTrackingTemplate({
        name: "Ayush Juneja",
        awb: "TEST123456789",
        courierName: "Shiprocket Test Courier",
        trackingLink: "https://oatclub.in/account/orders",
        order: sampleOrder,
      });
    case "order-delivered":
      return orderDeliveredTemplate({
        name: "Ayush Juneja",
        order: sampleOrder,
        ctaUrl: "https://oatclub.in/account/orders",
      });
    case "order-cancelled":
      return orderCancellationTemplate({
        name: "Ayush Juneja",
        order: {
          ...sampleOrder,
          fulfillmentStatus: "cancelled",
        },
        ctaUrl: "https://oatclub.in/account/orders",
        reason: "Test cancellation email",
      });
    case "rma-created":
      return rmaCreatedTemplate({
        name: "Ayush Juneja",
        order: sampleOrder,
        rma: sampleRma,
        policy: { windowDays: 7 },
        ctaUrl: "https://oatclub.in/account/rma",
      });
    default:
      return { subject: config.name, text: "", html: "<div />" };
  }
}

export async function getEmailPreviewTemplates() {
  return templateConfigs.map((config) => {
    const rendered = renderTemplate(config);

    return {
      slug: config.slug,
      name: config.name,
      audience: config.audience,
      category: config.category,
      status: config.status,
      sourceFile: config.sourceFile,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      preheader: `Preview sourced from ${config.sourceFile}`,
      summary: `Preview is rendered from local admin copy: components/email/${config.sourceFile}.`,
      highlights: [config.category, config.audience, config.status, config.sourceFile],
      updatedAt: "2026-06-22T00:00:00.000Z",
    };
  });
}

export async function getEmailPreviewTemplateBySlug(slug) {
  const templates = await getEmailPreviewTemplates();
  return templates.find((item) => item.slug === slug) || null;
}
